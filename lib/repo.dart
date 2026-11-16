// Supabase access + a small offline cache.
// Every change is saved one row at a time (read the latest row, change it,
// write it back), so two phones don't overwrite each other's work.
import 'dart:async';
import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'models.dart';

const tUsers = 'worship_users';
const tSchedules = 'worship_schedules';
const tLogs = 'worship_point_logs';

class Repo {
  SupabaseClient get db => Supabase.instance.client;
  RealtimeChannel? _channel;

  // ---------- load ----------
  Future<List<AppUser>> fetchUsers() async {
    final rows = await db.from(tUsers).select().order('full_name');
    return rows.map((r) => AppUser.fromRow(r)).toList();
  }

  Future<List<Schedule>> fetchSchedules() async {
    final rows = await db.from(tSchedules).select().order('date');
    return rows.map((r) => Schedule.fromRow(r)).toList();
  }

  Future<List<PointLog>> fetchLogs() async {
    final rows = await db.from(tLogs).select().order('created_at', ascending: false).limit(300);
    return rows.map((r) => PointLog.fromRow(r)).toList();
  }

  Future<Schedule?> fetchSchedule(String id) async {
    final r = await db.from(tSchedules).select().eq('id', id).maybeSingle();
    return r == null ? null : Schedule.fromRow(r);
  }

  Future<AppUser?> fetchUser(String id) async {
    final r = await db.from(tUsers).select().eq('id', id).maybeSingle();
    return r == null ? null : AppUser.fromRow(r);
  }

  // ---------- write ----------
  Future<void> saveUser(AppUser u) => db.from(tUsers).upsert(u.toRow());
  Future<void> deleteUser(String id) => db.from(tUsers).delete().eq('id', id);
  Future<void> saveSchedule(Schedule s) => db.from(tSchedules).upsert(s.toRow());
  Future<void> saveSchedules(List<Schedule> xs) async {
    if (xs.isEmpty) return;
    await db.from(tSchedules).upsert(xs.map((s) => s.toRow()).toList());
  }

  Future<void> deleteMonth(String monthKey) => db.from(tSchedules).delete().eq('month', monthKey);
  Future<void> addLog(PointLog l) => db.from(tLogs).upsert(l.toRow());
  Future<void> addLogs(List<PointLog> xs) async {
    if (xs.isEmpty) return;
    await db.from(tLogs).upsert(xs.map((l) => l.toRow()).toList());
  }

  Future<void> resetToAdmin(AppUser admin) async {
    await db.from(tLogs).delete().neq('id', '');
    await db.from(tSchedules).delete().neq('id', '');
    await db.from(tUsers).delete().neq('id', admin.id);
    await saveUser(admin);
  }

  // ---------- live updates ----------
  void listen(void Function(String table) onChange) {
    _channel?.unsubscribe();
    var ch = db.channel('worship-live');
    for (final t in [tUsers, tSchedules, tLogs]) {
      ch = ch.onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: t,
        callback: (_) => onChange(t),
      );
    }
    _channel = ch..subscribe();
  }

  // ---------- offline cache ----------
  static const _kUsers = 'cache_users', _kSched = 'cache_schedules', _kLogs = 'cache_logs';

  Future<void> cacheAll(List<AppUser> u, List<Schedule> s, List<PointLog> l) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_kUsers, jsonEncode(u.map((x) => x.toRow()).toList()));
    await p.setString(_kSched, jsonEncode(s.map((x) => x.toRow()).toList()));
    await p.setString(_kLogs, jsonEncode(l.map((x) => x.toRow()).toList()));
  }

  Future<({List<AppUser> users, List<Schedule> schedules, List<PointLog> logs})> readCache() async {
    final p = await SharedPreferences.getInstance();
    List<Map<String, dynamic>> read(String k) {
      final raw = p.getString(k);
      if (raw == null) return const [];
      try {
        return (jsonDecode(raw) as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      } catch (_) {
        return const [];
      }
    }

    return (
      users: read(_kUsers).map(AppUser.fromRow).toList(),
      schedules: read(_kSched).map(Schedule.fromRow).toList(),
      logs: read(_kLogs).map(PointLog.fromRow).toList(),
    );
  }

  // ---------- small prefs ----------
  static Future<String?> getString(String k) async => (await SharedPreferences.getInstance()).getString(k);
  static Future<void> setString(String k, String? v) async {
    final p = await SharedPreferences.getInstance();
    if (v == null) {
      await p.remove(k);
    } else {
      await p.setString(k, v);
    }
  }
}
