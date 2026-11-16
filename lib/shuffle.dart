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

/// Fair monthly rotation.
///
/// - Every Sunday: 1 song leader + the team size per role from [counts].
/// - Nobody gets two roles on the same Sunday. Members with two ministries
///   (e.g. Backup + Media) can be used for either one, one at a time.
/// - Names don't repeat in the same month while someone else is still free for
///   that role; when a role has fewer people than Sundays, it takes turns evenly.
/// - Rarer roles are filled first (e.g. Media before Backup), so a member who is
///   the only option for a role isn't used up somewhere else.
/// - Song leaders take turns; whoever led last month goes last.
/// - Roles set to "Everyone" (Tambourine by default) list all their members every Sunday.
///
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

  // How often each person already serves this month (Sundays kept from before count too),
  // and last month (used to break ties, so the same people don't always go first).
  final prevKey = monthKeyOf(DateTime(y, m0, 1));
  final monthCount = <String, int>{};
  final lastMonth = <String, int>{};
  final ledLastMonth = <String>{};
  bool isEveryone(Cap c) => (counts[c] ?? defaultTeamCounts[c] ?? 0) < 0;
  for (final s in existing) {
    if (s.month == monthKey) {
      for (final a in s.assignments) {
        if (!isEveryone(a.role)) monthCount[a.userId] = (monthCount[a.userId] ?? 0) + 1;
      }
    } else if (s.month == prevKey) {
      ledLastMonth.add(s.songleaderId);
      for (final a in s.assignments) {
        if (!isEveryone(a.role)) lastMonth[a.userId] = (lastMonth[a.userId] ?? 0) + 1;
      }
    }
  }

  /// Least-used first; then whoever served less last month; then random.
  AppUser? pick(List<AppUser> pool, Set<String> used, {bool songleader = false}) {
    final free = pool.where((u) => !used.contains(u.id)).toList();
    if (free.isEmpty) return null;
    final jitter = {for (final u in free) u.id: _rnd.nextDouble()};
    free.sort((a, b) {
      final c = (monthCount[a.id] ?? 0).compareTo(monthCount[b.id] ?? 0);
      if (c != 0) return c;
      if (songleader) {
        final l = (ledLastMonth.contains(a.id) ? 1 : 0).compareTo(ledLastMonth.contains(b.id) ? 1 : 0);
        if (l != 0) return l;
      }
      final m = (lastMonth[a.id] ?? 0).compareTo(lastMonth[b.id] ?? 0);
      if (m != 0) return m;
      return jitter[a.id]!.compareTo(jitter[b.id]!);
    });
    return free.first;
  }

  // Fill order: rarest roles first (fewest people per spot needed).
  const roles = [Cap.media, Cap.keys, Cap.drums, Cap.bass, Cap.guitar, Cap.backup, Cap.tambourines];
  final fixed = roles.where((c) => !isEveryone(c) && (counts[c] ?? defaultTeamCounts[c] ?? 0) > 0).toList()
    ..sort((a, b) {
      final ra = withCap(a).length / (counts[a] ?? 1);
      final rb = withCap(b).length / (counts[b] ?? 1);
      return ra.compareTo(rb);
    });
  final everyone = roles.where(isEveryone).toList();
  // Shown in this order on the schedule (same as the web app).
  const display = [Cap.songleader, Cap.backup, Cap.keys, Cap.guitar, Cap.bass, Cap.drums, Cap.media, Cap.tambourines];

  final out = <Schedule>[];
  for (final date in sundays) {
    final already = existing.where((s) => s.date == date);
    if (already.isNotEmpty) {
      out.add(already.first);
      continue;
    }
    final used = <String>{};
    final picked = <Assignment>[];
    void add(AppUser u, Cap role) {
      used.add(u.id);
      if (!isEveryone(role)) monthCount[u.id] = (monthCount[u.id] ?? 0) + 1;
      picked.add(Assignment(userId: u.id, userName: u.fullName, role: role, instrument: instrumentFor(role), status: 'assigned'));
    }

    final sl = pick(songleaders, used, songleader: true)!;
    add(sl, Cap.songleader);

    for (final role in fixed) {
      final want = counts[role] ?? defaultTeamCounts[role] ?? 0;
      for (var k = 0; k < want; k++) {
        final u = pick(withCap(role), used);
        if (u == null) break;
        add(u, role);
      }
    }
    for (final role in everyone) {
      for (final u in withCap(role)) {
        if (used.contains(u.id)) continue; // already serving in another role this Sunday
        add(u, role);
      }
    }

    picked.sort((a, b) => display.indexOf(a.role).compareTo(display.indexOf(b.role)));
    out.add(Schedule(
      id: 'sched-$date',
      date: date,
      practiceDate: saturdayBefore(date),
      month: monthKey,
      title: 'Sunday Worship Service - ${dLbl(date)}',
      songleaderId: sl.id,
      songleaderName: sl.fullName,
      assignments: picked,
    ));
  }
  return out;
}
