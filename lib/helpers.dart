// Pure helpers ported from the web app's lib/mobile.ts.
import 'models.dart';

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weekdayShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; // Dart weekday 1..7
const weekdayLong = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const roleLabel = <Cap, String>{
  Cap.songleader: 'Song leader',
  Cap.backup: 'Backup',
  Cap.guitar: 'Guitar',
  Cap.bass: 'Bass',
  Cap.drums: 'Drums',
  Cap.keys: 'Keys',
  Cap.media: 'Media',
  Cap.tambourines: 'Tambourine',
};
const allCaps = Cap.values;
const musicianOrder = [Cap.guitar, Cap.bass, Cap.drums, Cap.keys, Cap.media, Cap.tambourines];

enum StatusKind { ok, wait, absent }

StatusKind statusOf(Assignment a) => a.status == 'confirmed' || a.status == 'attended'
    ? StatusKind.ok
    : a.status == 'absent'
        ? StatusKind.absent
        : StatusKind.wait;

const statusLabel = {StatusKind.ok: 'Confirmed', StatusKind.wait: 'Not yet', StatusKind.absent: 'Absent'};

String two(int n) => n.toString().padLeft(2, '0');

/// Parse 'YYYY-MM-DD' as a local date at noon.
DateTime parseDay(String d) {
  final p = d.split('-');
  if (p.length < 3) return DateTime.now();
  return DateTime(int.parse(p[0]), int.parse(p[1]), int.parse(p[2]), 12);
}

String dayStr(DateTime d) => '${d.year}-${two(d.month)}-${two(d.day)}';
String todayStr() => dayStr(DateTime.now());
String dLbl(String d) {
  final x = parseDay(d);
  return '${mon[x.month - 1]} ${x.day}';
}

String longDay(String d) {
  final x = parseDay(d);
  return '${weekdayLong[x.weekday - 1]}, ${mon[x.month - 1]} ${x.day}';
}

String monShortUpper(String d) => mon[parseDay(d).month - 1].toUpperCase();

String monthKeyOf(DateTime d) => '${d.year}-${two(d.month)}';
({int y, int m}) parseMonthKey(String k) {
  final p = k.split('-');
  return (y: int.parse(p[0]), m: int.parse(p[1]) - 1); // m is 0-based like the web app
}

String monthName(String k) {
  final r = parseMonthKey(k);
  return '${months[r.m]} ${r.y}';
}

String addMonth(String k, int n) {
  final r = parseMonthKey(k);
  return monthKeyOf(DateTime(r.y, r.m + 1 + n, 1));
}

int sundaysCount(int y, int m0) {
  var n = 0;
  var d = DateTime(y, m0 + 1, 1);
  while (d.month == m0 + 1) {
    if (d.weekday == DateTime.sunday) n++;
    d = DateTime(d.year, d.month, d.day + 1);
  }
  return n;
}

/// Weekly reminder window: sent the Sunday before at 3:00 PM,
/// replies close Wednesday 3:00 PM (3 days before Saturday practice).
({DateTime sendAt, DateTime replyBy}) replyWindow(String sundayDate) {
  final sun = parseDay(sundayDate);
  return (
    sendAt: DateTime(sun.year, sun.month, sun.day - 7, 15),
    replyBy: DateTime(sun.year, sun.month, sun.day - 4, 15),
  );
}

String replyByLabel(String sundayDate) {
  final r = replyWindow(sundayDate).replyBy;
  return '${weekdayShort[r.weekday - 1]}, ${mon[r.month - 1]} ${r.day} · 3:00 PM';
}

bool replyClosed(String sundayDate) => DateTime.now().isAfter(replyWindow(sundayDate).replyBy);

class Mine {
  final Assignment a;
  final bool covered;
  Mine(this.a, this.covered);
}

/// The assignment for a user on a Sunday, including when someone is covering for them.
Mine? findMine(Schedule? s, String? userId) {
  if (s == null || userId == null) return null;
  for (final a in s.assignments) {
    if (a.userId == userId) return Mine(a, false);
  }
  for (final a in s.assignments) {
    if (a.history.any((h) => h.userId == userId && h.type == 'swap')) return Mine(a, true);
  }
  return null;
}

/// First person this slot was originally given to, when it has been swapped.
String? coveringFor(Assignment a) {
  final h = a.history.where((x) => x.type == 'swap').toList();
  return h.isEmpty ? null : h.first.userName;
}

/// Same rules as the web app: backups can be covered by backups or song leaders.
List<AppUser> eligibleReplacements(List<AppUser> users, Schedule s, Cap role, String? excludeId) {
  final assigned = s.assignments.map((a) => a.userId).toSet();
  return users.where((u) {
    if (!u.active || u.id == excludeId || assigned.contains(u.id)) return false;
    if (role == Cap.backup) return u.capabilities.contains(Cap.backup) || u.capabilities.contains(Cap.songleader);
    return u.capabilities.contains(role);
  }).toList();
}

String firstName(AppUser? u) {
  final n = (u?.fullName ?? '').trim();
  return n.isEmpty ? '' : n.split(RegExp(r'\s+')).first;
}

String initial(String name) => name.trim().isEmpty ? '?' : name.trim()[0].toUpperCase();

String plural(int n, String w) => '$n $w${n == 1 ? '' : 's'}';

({String line, String month}) exportStamp([DateTime? now]) {
  final d = now ?? DateTime.now();
  final h12 = d.hour % 12 == 0 ? 12 : d.hour % 12;
  final ampm = d.hour < 12 ? 'AM' : 'PM';
  final date = '${weekdayShort[d.weekday - 1]}, ${mon[d.month - 1]} ${d.day}, ${d.year}';
  return (line: 'Exported: $date · $h12:${two(d.minute)} $ampm', month: 'Month: ${months[d.month - 1]} ${d.year}');
}

String newId(String prefix) => '$prefix-${DateTime.now().millisecondsSinceEpoch}-${DateTime.now().microsecond % 1000}';
