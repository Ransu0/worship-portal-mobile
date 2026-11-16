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
    if (all.every((u) => used.contains(u.id))) return null;
    for (var tries = 0; tries <= all.length * 2; tries++) {
      if (i >= q.length) {
        q = _shuffled(all);
        i = 0;
      }
      final u = q[i++];
      if (!used.contains(u.id)) return u;
    }
    return null;
  }
}

/// How many people each role gets per Sunday. -1 means "everyone with that ministry".
const defaultTeamCounts = <Cap, int>{
  Cap.songleader: 1,
  Cap.backup: 2,
  Cap.keys: 1,
  Cap.guitar: 1,
  Cap.bass: 1,
  Cap.drums: 1,
  Cap.media: 1,
  Cap.tambourines: -1,
};

const _instrument = <Cap, String>{
  Cap.backup: 'Backing Vocals',
  Cap.keys: 'Keys / Piano',
  Cap.guitar: 'Acoustic / Electric Guitar',
  Cap.bass: 'Bass Guitar',
  Cap.drums: 'Drums',
  Cap.media: 'Media / Visuals',
  Cap.tambourines: 'Tambourine',
};

String instrumentFor(Cap c) => c == Cap.songleader ? 'Lead Vocals' : (_instrument[c] ?? c.name);

/// Throws a [StateError] with a readable message when there is no song leader.
List<Schedule> generateMonthSchedule(int y, int m0, List<AppUser> users, List<Schedule> existing,
    [Map<Cap, int> counts = defaultTeamCounts]) {
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

  // Fill order matches the web app: backup, keys, guitar, bass, drums, media, then tambourine.
  const order = [Cap.backup, Cap.keys, Cap.guitar, Cap.bass, Cap.drums, Cap.media, Cap.tambourines];
  final pools = {for (final c in order) c: _Pool(withCap(c))};

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

    for (final role in order) {
      final want = counts[role] ?? defaultTeamCounts[role] ?? 0;
      final pool = pools[role]!;
      if (want < 0) {
        // everyone with this ministry (default for tambourine)
        for (final u in pool.all) {
          if (used.contains(u.id) && role != Cap.tambourines) continue;
          assignments.add(Assignment(userId: u.id, userName: u.fullName, role: role, instrument: instrumentFor(role), status: 'assigned'));
          used.add(u.id);
        }
        continue;
      }
      final free = pool.all.where((u) => !used.contains(u.id)).length;
      for (var k = 0; k < min(want, free); k++) {
        final u = pool.take(used);
        if (u == null) continue;
        used.add(u.id);
        assignments.add(Assignment(userId: u.id, userName: u.fullName, role: role, instrument: instrumentFor(role), status: 'assigned'));
      }
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
