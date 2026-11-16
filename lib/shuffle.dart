// Monthly rotation, ported from the web app's lib/shuffle.ts (same rules):
// 1. Song leaders take turns; last month's leaders go last.
// 2. Two backups from the backup role.
// 3. Keys, guitar, bass, drums, media shuffled from their roles.
// 4. Every active tambourine member every Sunday.
// 5. Practice Saturday 4:00 PM, service Sunday 8:30 AM.
import 'dart:math';

import 'helpers.dart';
import 'models.dart';

final _rnd = Random();

List<T> _shuffled<T>(List<T> xs) {
  final c = List<T>.of(xs);
  for (var i = c.length - 1; i > 0; i--) {
    final j = _rnd.nextInt(i + 1);
    final t = c[i];
    c[i] = c[j];
    c[j] = t;
  }
  return c;
}

List<String> sundaysInMonth(int y, int m0) {
  final out = <String>[];
  var d = DateTime(y, m0 + 1, 1);
  while (d.month == m0 + 1) {
    if (d.weekday == DateTime.sunday) out.add(dayStr(d));
    d = DateTime(d.year, d.month, d.day + 1);
  }
  return out;
}

String saturdayBefore(String sunday) {
  final s = parseDay(sunday);
  return dayStr(DateTime(s.year, s.month, s.day - 1));
}

class _Pool {
  final List<AppUser> all;
  List<AppUser> q;
  int i = 0;
  _Pool(this.all) : q = _shuffled(all);

  /// Next person from the rotation who isn't already on this Sunday, or null.
  AppUser? take(Set<String> used) {
    if (q.where((u) => !used.contains(u.id)).isEmpty) return null;
    if (i >= q.length) {
      q = _shuffled(all);
      i = 0;
    }
    final u = q[i++];
    return used.contains(u.id) ? null : u;
  }
}

/// Throws a [StateError] with a readable message when there is no song leader.
List<Schedule> generateMonthSchedule(int y, int m0, List<AppUser> users, List<Schedule> existing) {
  final sundays = sundaysInMonth(y, m0);
  final monthKey = '$y-${two(m0 + 1)}';
  final active = users.where((u) => u.active).toList();
  List<AppUser> withCap(Cap c) => active.where((u) => u.capabilities.contains(c)).toList();

  final songleaders = withCap(Cap.songleader);
  if (songleaders.isEmpty) {
    throw StateError('Add active members with the Song leader ministry first.');
  }

  final prevKey = monthKeyOf(DateTime(y, m0, 1)); // previous month
  final recent = existing.where((s) => s.month == prevKey).map((s) => s.songleaderId).toSet();
  final fresh = songleaders.where((u) => !recent.contains(u.id)).toList();
  final fallback = songleaders.where((u) => recent.contains(u.id)).toList();
  var slQueue = [..._shuffled(fresh), ..._shuffled(fallback)];
  var slIdx = 0;

  final backup = _Pool(withCap(Cap.backup));
  final keys = _Pool(withCap(Cap.keys));
  final guitar = _Pool(withCap(Cap.guitar));
  final bass = _Pool(withCap(Cap.bass));
  final drums = _Pool(withCap(Cap.drums));
  final media = _Pool(withCap(Cap.media));
  final tambs = withCap(Cap.tambourines);

  final out = <Schedule>[];
  for (final date in sundays) {
    final already = existing.where((s) => s.date == date);
    if (already.isNotEmpty) {
      out.add(already.first);
      continue;
    }
    if (slIdx >= slQueue.length) {
      slQueue = _shuffled(songleaders);
      slIdx = 0;
    }
    final sl = slQueue[slIdx++];
    final assignments = <Assignment>[
      Assignment(userId: sl.id, userName: sl.fullName, role: Cap.songleader, instrument: 'Lead Vocals', status: 'assigned'),
    ];
    final used = <String>{sl.id};

    void add(_Pool p, Cap role, String instrument) {
      final u = p.take(used);
      if (u == null) return;
      used.add(u.id);
      assignments.add(Assignment(userId: u.id, userName: u.fullName, role: role, instrument: instrument, status: 'assigned'));
    }

    final backupsFree = backup.all.where((u) => !used.contains(u.id)).length;
    for (var k = 0; k < min(2, backupsFree); k++) {
      add(backup, Cap.backup, 'Backing Vocals');
    }
    add(keys, Cap.keys, 'Keys / Piano');
    add(guitar, Cap.guitar, 'Acoustic / Electric Guitar');
    add(bass, Cap.bass, 'Bass Guitar');
    add(drums, Cap.drums, 'Drums');
    add(media, Cap.media, 'Media / Visuals');
    for (final t in tambs) {
      assignments.add(Assignment(userId: t.id, userName: t.fullName, role: Cap.tambourines, instrument: 'Tambourine', status: 'assigned'));
    }

    out.add(Schedule(
      id: 'sched-$date',
      date: date,
      practiceDate: saturdayBefore(date),
      month: monthKey,
      title: 'Sunday Worship Service - ${dLbl(date)}',
      songleaderId: sl.id,
      songleaderName: sl.fullName,
      assignments: assignments,
    ));
  }
  return out;
}
