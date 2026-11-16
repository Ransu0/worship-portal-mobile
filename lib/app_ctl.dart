// App state, navigation and every action — the Flutter version of the web
// app's MobileApp.tsx + StorageService.
import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'config.dart';
import 'helpers.dart';
import 'models.dart';
import 'notify.dart';
import 'repo.dart';
import 'shuffle.dart';

enum Screen { home, schedule, points, me, team, teamSetup, addSlot, cant, songs, editsongs, sunday, swap, markdone, editmember, importNames }

enum NavTab { home, schedule, points, me, team }

enum Role { guest, member, leader, admin }

/// Which way the last navigation went (drives the slide animation).
enum NavDir { forward, back, tab }

class SheetState {
  final String kind; // shuffle | clear | resetAdmin | export
  final String? data;
  final String? title;
  const SheetState(this.kind, {this.data, this.title});
}

T? firstOr<T>(Iterable<T> xs, bool Function(T) test) {
  for (final x in xs) {
    if (test(x)) return x;
  }
  return null;
}

class AppCtl extends ChangeNotifier {
  final repo = Repo();

  List<AppUser> users = [];
  List<Schedule> schedules = [];
  List<PointLog> logs = [];
  Map<Cap, int> teamCounts = Map.of(defaultTeamCounts);
  AppUser? me;
  bool loaded = false;
  bool offline = false;

  Screen view = Screen.home;
  final List<Screen> _stack = [];
  String? selId;
  Assignment? swapTarget;
  String? editUserId;
  String monthKey = monthKeyOf(DateTime.now());
  SheetState? sheet;
  bool confirmCard = false;
  bool signInOpen = false;
  NavDir dir = NavDir.tab;
  String toastMsg = '';
  Timer? _toastTimer;
  Timer? _remoteTimer;
  Timer? _remindTimer;
  bool remindersOn = false;
  Set<String> _dismissed = {};

  static const _kMe = 'me_id', _kDismissed = 'welcome_dismissed';

  // ---------------- derived ----------------
  Schedule? get upcoming {
    final today = todayStr();
    final list = schedules.where((s) => s.date.compareTo(today) >= 0 && s.status != 'completed').toList()
      ..sort((a, b) => a.date.compareTo(b.date));
    return list.isEmpty ? null : list.first;
  }

  Role get role {
    final m = me;
    if (m == null) return Role.guest;
    if (m.isAdmin) return Role.admin;
    final u = upcoming;
    if (u != null && u.songleaderId == m.id) return Role.leader;
    return Role.member;
  }

  bool get isUser => role == Role.member || role == Role.leader;
  Schedule? get sel => selId == null ? null : firstOr(schedules, (s) => s.id == selId);
  AppUser? get editUser => editUserId == null ? null : firstOr(users, (u) => u.id == editUserId);
  bool canEditSongs(Schedule? s) => s != null && (role == Role.admin || (me != null && s.songleaderId == me!.id));
  String get adminName => me?.fullName ?? 'Admin';

  String get _welcomeKey => '${role.name}_${me?.id ?? 'guest'}';
  bool get welcomeOn => !_dismissed.contains(_welcomeKey);

  // ---------------- start / sync ----------------
  Future<void> start() async {
    final prefs = await SharedPreferences.getInstance();
    _dismissed = (prefs.getStringList(_kDismissed) ?? const []).toSet();
    final cache = await repo.readCache();
    users = cache.users;
    schedules = cache.schedules;
    logs = cache.logs;
    final meId = prefs.getString(_kMe);
    me = meId == null ? null : firstOr(users, (u) => u.id == meId);
    remindersOn = me != null && prefs.getString('rem_${me!.id}') == '1';
    if (upcoming != null) monthKey = upcoming!.month;
    loaded = users.isNotEmpty;
    notifyListeners();

    Notify.onResponse = handleReply;
    await reload();
    loaded = true;
    notifyListeners();
    repo.listen(_onRemote);
    final launch = Notify.launchResponse;
    if (launch != null && launch.payload != null) {
      Notify.launchResponse = null;
      final a = launch.actionId;
      handleReply(a == null || a.isEmpty ? 'open' : a, launch.payload!);
    }
  }

  Future<void> reload() async {
    try {
      final r = await Future.wait([repo.fetchUsers(), repo.fetchSchedules(), repo.fetchLogs()]);
      users = r[0] as List<AppUser>;
      schedules = r[1] as List<Schedule>;
      logs = r[2] as List<PointLog>;
      offline = false;
      try {
        final tc = await repo.fetchTeamCounts();
        if (tc != null) teamCounts = {...defaultTeamCounts, ...tc};
      } catch (_) {}
      unawaited(repo.cacheAll(users, schedules, logs));
    } catch (e) {
      debugPrint('Load failed: $e');
      offline = true;
    }
    _refreshMe();
    notifyListeners();
    _syncReminders();
  }

  void _onRemote(String table) {
    _remoteTimer?.cancel();
    _remoteTimer = Timer(const Duration(milliseconds: 400), reload);
  }

  void _refreshMe() {
    final m = me;
    if (m == null) return;
    final fresh = firstOr(users, (u) => u.id == m.id);
    if (fresh == null && users.isNotEmpty && !offline) {
      me = null; // removed from the team
      _savePref(_kMe, null);
    } else if (fresh != null) {
      me = fresh;
    }
  }

  Future<void> _savePref(String k, String? v) => Repo.setString(k, v);

  void _saveFailed() {
    toast("Couldn't save. Check your internet.");
    unawaited(reload());
  }

  // ---------------- toast ----------------
  void toast(String m) {
    toastMsg = m;
    _toastTimer?.cancel();
    _toastTimer = Timer(const Duration(milliseconds: 2600), () {
      toastMsg = '';
      notifyListeners();
    });
    notifyListeners();
  }

  // ---------------- navigation ----------------
  void go(Screen v, {String? sel, Assignment? swap, bool setEdit = false, String? editId}) {
    if (sel != null) selId = sel;
    if (swap != null) swapTarget = swap;
    if (setEdit) editUserId = editId;
    _stack.add(view);
    view = v;
    dir = NavDir.forward;
    notifyListeners();
  }

  void back() {
    view = _stack.isEmpty ? Screen.home : _stack.removeLast();
    dir = NavDir.back;
    notifyListeners();
  }

  void tab(NavTab t) {
    _stack.clear();
    sheet = null;
    dir = NavDir.tab;
    view = Screen.values.byName(t.name);
    if (t == NavTab.schedule && upcoming != null) monthKey = upcoming!.month;
    notifyListeners();
  }

  void home() {
    if (view != Screen.home) dir = _stack.isEmpty ? NavDir.tab : NavDir.back;
    _stack.clear();
    view = Screen.home;
    notifyListeners();
  }

  void openSignIn() {
    signInOpen = true;
    notifyListeners();
  }

  void closeSignIn() {
    signInOpen = false;
    notifyListeners();
  }

  void setMonth(String k) {
    monthKey = k;
    notifyListeners();
  }

  void openSheet(String kind, {String? data, String? title}) {
    sheet = SheetState(kind, data: data, title: title);
    notifyListeners();
  }

  void closeSheet() {
    sheet = null;
    notifyListeners();
  }

  void closeConfirmCard() {
    confirmCard = false;
    notifyListeners();
  }

  /// Android back button. Returns true when the app should close.
  bool handleBack() {
    if (signInOpen) {
      closeSignIn();
      return false;
    }
    if (sheet != null) {
      closeSheet();
      return false;
    }
    if (confirmCard) {
      closeConfirmCard();
      return false;
    }
    if (_stack.isNotEmpty) {
      back();
      return false;
    }
    if (view != Screen.home) {
      home();
      return false;
    }
    return true;
  }

  void dismissWelcome() {
    _dismissed.add(_welcomeKey);
    SharedPreferences.getInstance().then((p) => p.setStringList(_kDismissed, _dismissed.toList()));
    notifyListeners();
  }

  // ---------------- reply from a notification ----------------
  void handleReply(String reply, String scheduleId) {
    final s = firstOr(schedules, (x) => x.id == scheduleId);
    if (s == null) return;
    final cur = me;
    if (cur == null) {
      toast('Sign in to reply');
      openSignIn();
      return;
    }
    final mine = findMine(s, cur.id);
    if (mine == null || mine.covered) return home();
    if (replyClosed(s.date)) {
      toast('Reply time ended. Ask your leader.');
      return home();
    }
    if (reply == 'yes') {
      confirm(s);
      home();
    } else if (reply == 'no') {
      _stack.clear();
      view = Screen.cant;
      notifyListeners();
    } else if (statusOf(mine.a) == StatusKind.wait) {
      home();
      confirmCard = true;
      notifyListeners();
    } else {
      home();
    }
  }

  // ---------------- local + remote helpers ----------------
  void _putSchedule(Schedule s) {
    final i = schedules.indexWhere((x) => x.id == s.id);
    if (i >= 0) {
      schedules[i] = s;
    } else {
      schedules.add(s);
    }
    schedules.sort((a, b) => a.date.compareTo(b.date));
  }

  void _putUser(AppUser u) {
    final i = users.indexWhere((x) => x.id == u.id);
    if (i >= 0) {
      users[i] = u;
    } else {
      users.add(u);
    }
    if (me?.id == u.id) me = u;
  }

  /// Read the latest row, change it, write it back.
  Future<Schedule?> _mutSchedule(String id, void Function(Schedule s) change) async {
    Schedule? s;
    try {
      s = await repo.fetchSchedule(id);
    } catch (_) {}
    s ??= firstOr(schedules, (x) => x.id == id)?.copy();
    if (s == null) return null;
    change(s);
    _putSchedule(s);
    notifyListeners();
    try {
      await repo.saveSchedule(s);
    } catch (_) {
      _saveFailed();
    }
    return s;
  }

  Future<AppUser?> _mutUser(String id, void Function(AppUser u) change) async {
    AppUser? u;
    try {
      u = await repo.fetchUser(id);
    } catch (_) {}
    u ??= firstOr(users, (x) => x.id == id)?.copy();
    if (u == null) return null;
    change(u);
    _putUser(u);
    notifyListeners();
    try {
      await repo.saveUser(u);
    } catch (_) {
      _saveFailed();
    }
    return u;
  }

  Future<void> _log(PointLog l) async {
    logs.insert(0, l);
    notifyListeners();
    try {
      await repo.addLog(l);
    } catch (_) {
      _saveFailed();
    }
  }

  PointLog _newLog(AppUser u, int points, String reason, String type, String admin) => PointLog(
        id: newId('log-${u.id}'),
        userId: u.id,
        userName: u.fullName,
        points: points,
        reason: reason,
        date: todayStr(),
        adminName: admin,
        type: type,
      );

  // ---------------- actions ----------------
  /// Returns an error message, or null when signed in.
  String? signIn(String username, String password) {
    if (users.isEmpty && offline) return 'No internet. Connect and try again.';
    final u = firstOr(users, (x) => x.username.toLowerCase() == username.trim().toLowerCase());
    if (u == null || !u.active) return 'Wrong username or password.';
    if (password != (u.password.isEmpty ? defaultPassword : u.password)) return 'Wrong username or password.';
    me = u;
    signInOpen = false;
    _savePref(_kMe, u.id);
    SharedPreferences.getInstance().then((p) {
      remindersOn = p.getString('rem_${u.id}') == '1';
      notifyListeners();
      _syncReminders();
    });
    home();
    toast('Welcome back, ${firstName(u)}');
    return null;
  }

  void signOut() {
    me = null;
    remindersOn = false;
    _savePref(_kMe, null);
    Notify.cancelAll();
    home();
    toast('Signed out');
  }

  Future<void> confirm(Schedule s) async {
    final m = me;
    if (m == null) return;
    await _mutSchedule(s.id, (x) {
      for (final a in x.assignments) {
        if (a.userId == m.id) a.status = 'confirmed';
      }
    });
    toast("Thanks! You're confirmed");
    _syncReminders();
  }

  Future<void> _swap(Schedule s, String currentUserId, String replacementId, String reason, String admin) async {
    final target = firstOr(users, (u) => u.id == currentUserId);
    final rep = firstOr(users, (u) => u.id == replacementId);
    if (target == null || rep == null) return;
    String title = s.title.isEmpty ? s.date : s.title;
    await _mutSchedule(s.id, (x) {
      title = x.title.isEmpty ? x.date : x.title;
      for (final a in x.assignments) {
        if (a.userId != currentUserId) continue;
        if (a.role == Cap.songleader) {
          x.songleaderId = rep.id;
          x.songleaderName = rep.fullName;
        }
        a.history.add(HistoryStep(
          userId: target.id,
          userName: target.fullName,
          type: 'swap',
          reason: reason.isEmpty ? 'Covered by replacement' : reason,
          replacedAt: DateTime.now().toUtc().toIso8601String(),
        ));
        a.userId = rep.id;
        a.userName = rep.fullName;
        a.status = 'assigned';
      }
    });
    await _log(_newLog(target, 0,
        'Swapped on $title: Covered by ${rep.fullName} (No absence penalty)${reason.isEmpty ? '' : ' - $reason'}', 'bonus', admin));
  }

  Future<void> _markAbsent(Schedule s, String userId, String reason, String admin) async {
    final target = firstOr(users, (u) => u.id == userId);
    if (target == null) return;
    String title = s.title.isEmpty ? s.date : s.title;
    await _mutUser(userId, (u) => u.absentCount = u.absentCount + 1);
    await _mutSchedule(s.id, (x) {
      title = x.title.isEmpty ? x.date : x.title;
      for (final a in x.assignments) {
        if (a.userId == userId) {
          a.status = 'absent';
          a.notes = reason.isEmpty ? 'Stepped down without replacement' : reason;
        }
      }
    });
    await _log(_newLog(target, 0, 'Marked Absent on $title: No replacement found${reason.isEmpty ? '' : ' ($reason)'}', 'absence', admin));
  }

  Future<void> stepDown(Schedule s, String? replacementId, String reason) async {
    final m = me;
    if (m == null) return;
    home();
    if (replacementId != null) {
      final rep = firstOr(users, (u) => u.id == replacementId);
      await _swap(s, m.id, replacementId, reason, 'System / Member');
      toast('Asked ${rep?.fullName ?? 'them'} to cover');
    } else {
      await _markAbsent(s, m.id, reason, 'System / Member');
      toast('Your leader has been told');
    }
    _syncReminders();
  }

  Future<void> saveLineup(Schedule s, Lineup l) async {
    back();
    await _mutSchedule(s.id, (x) => x.lineup = l);
    toast('Songs saved');
  }

  Future<void> adminReplace(Schedule s, String userId, String? replacementId) async {
    final t = firstOr(users, (u) => u.id == userId);
    back();
    if (replacementId != null) {
      final rep = firstOr(users, (u) => u.id == replacementId);
      await _swap(s, userId, replacementId, 'Changed by $adminName', adminName);
      toast('${rep?.fullName} replaces ${t?.fullName}');
    } else {
      await _markAbsent(s, userId, 'Marked by $adminName', adminName);
      toast('${t?.fullName} marked absent');
    }
  }

  Future<int> markDone(Schedule s, Set<String> ticked) async {
    back();
    final served = <Assignment>[];
    final fresh = await _mutSchedule(s.id, (x) {
      if (x.isCompleted) return;
      for (final a in x.assignments) {
        // Rule: only members who confirmed ("I'll be there") get +10, even if
        // someone else showed up without confirming.
        if (!ticked.contains(a.userId) || a.status != 'confirmed') continue;
        served.add(a);
        a.status = 'attended';
      }
      x.isCompleted = true;
      x.status = 'completed';
    });
    if (fresh == null) return 0;
    final title = fresh.title.isEmpty ? fresh.date : fresh.title;
    for (final a in served) {
      final u = await _mutUser(a.userId, (u) => u.points += 10);
      if (u != null) {
        await _log(_newLog(u, 10, 'Served on $title as ${a.role.name} (+10 pts)', 'attendance', adminName));
      }
    }
    toast('+10 given to ${plural(served.length, 'member')}');
    return served.length;
  }

  Future<void> adjust(AppUser u, int delta, String reason) async {
    final fresh = await _mutUser(u.id, (x) => x.points = max(0, x.points + delta));
    if (fresh == null) return;
    await _log(_newLog(fresh, delta, reason.isEmpty ? (delta < 0 ? 'Admin manual deduction' : 'Admin manual bonus') : reason,
        delta < 0 ? 'deduction' : 'bonus', adminName));
    toast('${delta > 0 ? '+' : '−'}${delta.abs()} for ${u.fullName}');
  }

  Future<void> addUser({required String fullName, required String username, required String role, required List<Cap> caps, required bool active}) async {
    final u = AppUser(
      id: 'u-${DateTime.now().millisecondsSinceEpoch}-${Random().nextInt(1000)}',
      username: username,
      fullName: fullName,
      password: defaultPassword,
      role: role,
      capabilities: caps,
      instrument: caps.isEmpty ? 'Vocals' : caps.first.name,
      points: 0,
      absentCount: 0,
      active: active,
    );
    _putUser(u);
    back();
    toast('$fullName added');
    try {
      await repo.saveUser(u);
    } catch (_) {
      _saveFailed();
    }
  }

  Future<void> updateUser(String id, {required String fullName, required String username, required String role, required List<Cap> caps, required bool active}) async {
    back();
    await _mutUser(id, (u) {
      u.fullName = fullName;
      u.username = username;
      u.role = role;
      u.capabilities = caps;
      u.active = active;
    });
    toast('Saved');
  }

  Future<void> resetPassword(AppUser u) async {
    await _mutUser(u.id, (x) => x.password = defaultPassword);
    toast('Password reset to default');
  }

  Future<void> deleteUser(String id) async {
    final u = firstOr(users, (x) => x.id == id);
    users.removeWhere((x) => x.id == id);
    back();
    toast('${u?.fullName ?? 'Member'} removed');
    try {
      await repo.deleteUser(id);
    } catch (_) {
      _saveFailed();
    }
  }

  Future<int> importNames(List<String> names, Cap cap) async {
    final existing = users.map((u) => u.fullName.toLowerCase()).toSet();
    final added = <AppUser>[];
    for (final name in names) {
      if (existing.contains(name.toLowerCase())) continue;
      final parts = name.toLowerCase().split(RegExp(r'\s+'));
      final username = parts.length > 1 ? '${parts.first}.${parts.last}' : parts.first;
      final u = AppUser(
        id: 'u-${DateTime.now().millisecondsSinceEpoch}-${Random().nextInt(100000)}',
        username: username,
        fullName: name,
        password: defaultPassword,
        role: 'member',
        capabilities: [cap],
        instrument: cap.name,
        points: 0,
        absentCount: 0,
        active: true,
      );
      added.add(u);
      _putUser(u);
      existing.add(name.toLowerCase());
    }
    if (added.isNotEmpty) back();
    notifyListeners();
    for (final u in added) {
      try {
        await repo.saveUser(u);
      } catch (_) {
        _saveFailed();
        break;
      }
    }
    return added.length;
  }

  Future<void> exportLogins(List<AppUser> list, String title) async {
    final st = exportStamp();
    String line(AppUser u) =>
        '${u.fullName} · @${u.username} · ${u.password.isNotEmpty && u.password != defaultPassword ? 'own password (ask member)' : 'default password'} · '
        '${u.capabilities.isEmpty ? 'No ministry' : u.capabilities.map((c) => roleLabel[c]).join(', ')}'
        '${u.isAdmin ? ' · Admin' : ''}${u.active ? '' : ' · Inactive'}';
    final many = list.length > 1;
    final text = 'COG Worship Team — ${many ? 'Member logins' : 'Login'}\n${st.line}\n${st.month}\n'
        '${many ? 'Total: ${list.length} members\n' : ''}\n${list.map(line).join('\n')}';
    openSheet('export', data: text, title: title);
    await Clipboard.setData(ClipboardData(text: text));
    toast('Copied');
  }

  Future<void> shuffleMonth(String k) async {
    final r = parseMonthKey(k);
    closeSheet();
    try {
      final generated = generateMonthSchedule(r.y, r.m, users, schedules, teamCounts);
      final created = generated.where((g) => !schedules.any((s) => s.id == g.id)).toList();
      for (final s in created) {
        _putSchedule(s);
      }
      monthKey = k;
      notifyListeners();
      toast('${monthName(k)} schedule made');
      await repo.saveSchedules(created);
      _syncReminders();
    } on StateError catch (e) {
      toast(e.message);
    } catch (_) {
      _saveFailed();
    }
  }

  Future<void> deleteMonth(String k) async {
    closeSheet();
    schedules.removeWhere((s) => s.month == k);
    toast('${monthName(k)} deleted');
    try {
      await repo.deleteMonth(k);
    } catch (_) {
      _saveFailed();
    }
    _syncReminders();
  }

  Future<void> resetToAdmin() async {
    closeSheet();
    final admin = AppUser(
      id: 'u-admin',
      username: 'admin',
      fullName: 'Admin (Worship Director)',
      password: defaultPassword,
      role: 'admin',
      capabilities: [],
      instrument: 'Worship Director',
      points: 0,
      absentCount: 0,
      active: true,
    );
    users = [admin];
    schedules = [];
    logs = [];
    me = null;
    _savePref(_kMe, null);
    home();
    toast('Reset. Only Admin is left');
    try {
      await repo.resetToAdmin(admin);
    } catch (_) {
      _saveFailed();
    }
  }

  // ---------------- team size + extra spots ----------------
  Future<void> saveTeamCounts(Map<Cap, int> counts) async {
    teamCounts = {...counts, Cap.songleader: 1};
    back();
    toast('Saved. Used for the next auto-shuffle');
    try {
      await repo.saveTeamCounts(teamCounts);
    } catch (_) {
      _saveFailed();
    }
  }

  /// Adds one more person to a Sunday (e.g. a second guitar).
  Future<void> addToSunday(Schedule s, String userId, Cap role) async {
    final u = firstOr(users, (x) => x.id == userId);
    if (u == null) return;
    back();
    await _mutSchedule(s.id, (x) {
      if (x.assignments.any((a) => a.userId == userId)) return;
      x.assignments.add(Assignment(userId: u.id, userName: u.fullName, role: role, instrument: instrumentFor(role), status: 'assigned'));
    });
    toast('${u.fullName} added as ${roleLabel[role]}');
    _syncReminders();
  }

  /// Removes a spot from a Sunday entirely (not an absence).
  Future<void> removeFromSunday(Schedule s, Assignment a) async {
    if (a.role == Cap.songleader) return;
    back();
    await _mutSchedule(s.id, (x) {
      x.assignments.removeWhere((y) => y.userId == a.userId && y.role == a.role);
    });
    toast('${roleLabel[a.role]} spot removed');
    _syncReminders();
  }

  // ---------------- reminders ----------------
  Future<void> enableReminders() async {
    final m = me;
    if (m == null) return;
    final ok = await Notify.requestPermission();
    if (!ok) {
      toast('Notifications are blocked in your phone settings');
      return;
    }
    remindersOn = true;
    await _savePref('rem_${m.id}', '1');
    notifyListeners();
    await Notify.scheduleFor(m, schedules);
    toast('Reminders on: every Sunday afternoon');
  }

  Future<void> disableReminders() async {
    final m = me;
    if (m == null) return;
    remindersOn = false;
    await _savePref('rem_${m.id}', null);
    await Notify.cancelAll();
    notifyListeners();
    toast('Reminders off');
  }

  void _syncReminders() {
    _remindTimer?.cancel();
    _remindTimer = Timer(const Duration(seconds: 1), () {
      final m = me;
      if (m != null && remindersOn) Notify.scheduleFor(m, schedules);
    });
  }

  Future<void> sendTestReminder() async {
    final s = upcoming;
    if (s == null) {
      toast('No Sunday scheduled');
      return;
    }
    await Notify.requestPermission();
    final ok = await Notify.showTest(s);
    toast(ok ? 'Test reminder sent to this phone' : 'Notifications are not available');
  }
}
