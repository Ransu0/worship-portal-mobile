import 'package:flutter/material.dart';

import '../app_ctl.dart';
import '../helpers.dart';
import '../models.dart';
import '../ui/icons.dart';
import '../ui/theme.dart';
import '../ui/widgets.dart';

class ScheduleScreen extends StatefulWidget {
  final AppCtl app;
  const ScheduleScreen({super.key, required this.app});
  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  bool _mineOnly = false;

  @override
  Widget build(BuildContext context) {
    final app = widget.app;
    final k = app.monthKey;
    final admin = app.role == Role.admin;
    final list = app.schedules.where((s) => s.month == k).toList()..sort((a, b) => a.date.compareTo(b.date));
    final next = addMonth(k, 1);
    final nextMade = app.schedules.any((s) => s.month == next);
    final today = todayStr();
    final ym = parseMonthKey(k);
    final header = TitleHeader(
      title: monthName(k),
      minHeight: 80,
      right: Row(mainAxisSize: MainAxisSize.min, children: [
        IconBtn(icon: 'chevL', w: 2.5, bg: C.chip, label: 'Previous month', onTap: () => app.setMonth(addMonth(k, -1))),
        const SizedBox(width: 8),
        IconBtn(icon: 'chev', w: 2.5, bg: C.chip, label: 'Next month', onTap: () => app.setMonth(addMonth(k, 1))),
      ]),
    );
    final nav = BottomNav(role: app.role, active: NavTab.schedule, onTab: app.tab);

    if (list.isEmpty) {
      return Frame(header: header, bottom: nav, children: [
        admin
            ? EmptyCard(
                title: 'No schedule for ${monthName(k)}',
                sub: '${plural(sundaysCount(ym.y, ym.m), 'Sunday')} to fill.',
                action: Btn('Auto-shuffle ${months[ym.m]}', icon: 'shuffle', iconSize: 18, md: true, onTap: () => app.openSheet('shuffle', data: k)),
              )
            : EmptyCard(title: 'Not scheduled yet', sub: "The ${monthName(k)} schedule will show here once it's made."),
      ]);
    }

    final rows = list.where((s) => !app.isUser || !_mineOnly || findMine(s, app.me?.id) != null).toList();
    return Frame(
      header: header,
      under: app.isUser
          ? Container(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              decoration: const BoxDecoration(color: C.white, border: Border(bottom: BorderSide(color: C.line))),
              child: Seg(a: 'Mine', b: 'All', aOn: _mineOnly, onA: () => setState(() => _mineOnly = true), onB: () => setState(() => _mineOnly = false)),
            )
          : null,
      bottom: nav,
      gap: 14,
      children: [
        if (rows.isEmpty) const EmptyText("You're not scheduled this month.", center: true),
        for (final s in rows) _SunRow(app: app, s: s, today: today),
        if (admin)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: gapped([
              if (!nextMade) Btn('Auto-shuffle ${monthName(next)}', icon: 'shuffle', onTap: () => app.openSheet('shuffle', data: next)),
              Btn('Delete ${months[ym.m]}', icon: 'trash', kind: BtnKind.outlineRed, onTap: () => app.openSheet('clear', data: k)),
            ], 12)),
          ),
      ],
    );
  }
}

class _SunRow extends StatelessWidget {
  final AppCtl app;
  final Schedule s;
  final String today;
  const _SunRow({required this.app, required this.s, required this.today});

  @override
  Widget build(BuildContext context) {
    final isNow = app.upcoming?.id == s.id;
    final past = s.date.compareTo(today) < 0;
    final done = s.isCompleted;
    var note = '';
    var color = C.soft;
    if (done) {
      note = 'Done';
      color = C.green;
    } else if (app.role == Role.admin) {
      final ok = s.assignments.where((a) => statusOf(a) == StatusKind.ok).length;
      if (past) {
        note = 'Not marked done yet';
        color = C.waitFg;
      } else if (isNow) {
        note = '$ok of ${s.assignments.length} confirmed';
      } else {
        note = '${s.assignments.length} assigned';
      }
    } else if (app.isUser) {
      final mine = findMine(s, app.me?.id);
      if (mine == null) {
        note = past ? 'Done' : 'Free';
      } else if (mine.covered) {
        note = '${mine.a.userName} covers you';
      } else if (statusOf(mine.a) == StatusKind.absent) {
        note = 'You: absent';
      } else {
        note = 'You: ${roleLabel[mine.a.role]}';
      }
    } else {
      note = isNow ? 'This Sunday' : '${s.assignments.length} serving';
    }
    final dateBg = isNow ? C.navy : (done ? C.chip : C.lav);
    final dateFg = isNow ? C.yellow : (done ? C.soft : C.navy);
    return Tap(
      onTap: () => app.go(Screen.sunday, sel: s.id),
      color: C.white,
      radius: BorderRadius.circular(20),
      border: Border.all(color: isNow ? C.navy : C.line, width: 2),
      padding: const EdgeInsets.all(16),
      child: Row(children: [
        Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(color: dateBg, borderRadius: BorderRadius.circular(16)),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Text(monShortUpper(s.date), style: tx(12, w800, dateFg)),
            Text('${parseDay(s.date).day}', style: tx(22, w800, dateFg, 1.1)),
          ]),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${s.songleaderName} leads', style: tx(17, w700)),
            const SizedBox(height: 4),
            Text(note, style: tx(15, w600, color)),
          ]),
        ),
        const Ic('chev', s: 20, c: C.soft, w: 2.5),
      ]),
    );
  }
}

class SundayScreen extends StatelessWidget {
  final AppCtl app;
  const SundayScreen({super.key, required this.app});

  @override
  Widget build(BuildContext context) {
    final s = app.sel;
    if (s == null) return const SizedBox.shrink();
    final admin = app.role == Role.admin;
    final ok = s.assignments.where((a) => statusOf(a) == StatusKind.ok).length;
    final canMark = admin && !s.isCompleted && (s.date.compareTo(todayStr()) <= 0 || app.upcoming?.id == s.id);
    final songs = s.lineup?.songs ?? const <Song>[];
    return Frame(
      header: BackHeader(title: 'Sunday, ${dLbl(s.date)}', sub: 'Practice Sat ${s.practiceTime} · Service ${s.worshipTime}', onBack: app.back),
      bottom: BottomNav(role: app.role, active: NavTab.schedule, onTab: app.tab),
      children: [
        Tap(
          onTap: () => app.go(Screen.songs, sel: s.id),
          color: C.navy,
          radius: BorderRadius.circular(18),
          height: 60,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(children: [
            const Ic('music', s: 22, c: C.yellow, w: 2),
            const SizedBox(width: 8),
            Expanded(child: Text(songs.isEmpty ? 'Songs: none yet' : plural(songs.length, 'song'), style: tx(17, w700, C.white))),
            const Ic('chev', s: 20, c: C.white, w: 2.5),
          ]),
        ),
        CardBox(gap: 0, children: [
          CardHead(
            title: 'Team',
            marginBottom: 0,
            right: app.role != Role.guest ? Sub('$ok of ${s.assignments.length} confirmed') : null,
          ),
          if (admin)
            const Padding(padding: EdgeInsets.only(top: 4, bottom: 10), child: Sub('Tap a name to replace or mark absent.'))
          else
            const SizedBox(height: 8),
          TeamCards(
            s: s,
            meId: app.me?.id,
            signedIn: app.role != Role.guest,
            onPick: admin ? (a) => app.go(Screen.swap, sel: s.id, swap: a) : null,
          ),
        ]),
        if (canMark) Btn('Mark as done (+10 points)', icon: 'done', kind: BtnKind.green, onTap: () => app.go(Screen.markdone, sel: s.id)),
        if (s.isCompleted) const StateBox(StateKind.ok, 'Done · points given', fontSize: 16, lead: Ic('check', s: 22, c: C.green, w: 2.6)),
      ],
    );
  }
}

class SwapScreen extends StatefulWidget {
  final AppCtl app;
  const SwapScreen({super.key, required this.app});
  @override
  State<SwapScreen> createState() => _SwapScreenState();
}

class _SwapScreenState extends State<SwapScreen> {
  String? _who;

  @override
  Widget build(BuildContext context) {
    final app = widget.app;
    final s = app.sel!;
    final t = app.swapTarget!;
    final cands = eligibleReplacements(app.users, s, t.role, t.userId);
    return Frame(
      header: BackHeader(title: 'Replace ${t.userName}', sub: '${dLbl(s.date)} · ${roleLabel[t.role]}', onBack: app.back),
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 32),
      gap: 14,
      bottom: ActionBar(
        child: Btn('Save', onTap: _who == null ? null : () => app.adminReplace(s, t.userId, _who == 'absent' ? null : _who)),
      ),
      children: [
        const H2('Replace with', size: 18),
        if (cands.isEmpty) EmptyText('No one else free for ${roleLabel[t.role]}.'),
        for (final u in cands) OptRow(label: u.fullName, lead: Ini(u.fullName), pressed: _who == u.id, onTap: () => setState(() => _who = u.id)),
        OptRow(label: 'No one — mark absent', red: true, pressed: _who == 'absent', onTap: () => setState(() => _who = 'absent')),
        if (_who == 'absent')
          Reveal(child: Padding(
            padding: const EdgeInsets.only(top: 12),
            child: StateBox(StateKind.warn, '${t.userName} gets 1 absence', fontSize: 16, lead: const Ic('alert', s: 22, c: C.waitFg)),
          )),
      ],
    );
  }
}

class MarkDoneScreen extends StatefulWidget {
  final AppCtl app;
  const MarkDoneScreen({super.key, required this.app});
  @override
  State<MarkDoneScreen> createState() => _MarkDoneScreenState();
}

class _MarkDoneScreenState extends State<MarkDoneScreen> {
  late final Map<String, bool> _ticked;

  @override
  void initState() {
    super.initState();
    // Only members who confirmed can get points. They start ticked; untick anyone who didn't come.
    _ticked = {for (final a in widget.app.sel!.assignments) a.userId: a.status == 'confirmed'};
  }

  @override
  Widget build(BuildContext context) {
    final app = widget.app;
    final s = app.sel!;
    final count = s.assignments.where((a) => (_ticked[a.userId] ?? false) && a.status == 'confirmed').length;
    return Frame(
      header: BackHeader(title: 'Who came?', sub: dLbl(s.date), onBack: app.back),
      gap: 10,
      bottom: ActionBar(
        child: Btn('Give +10 to $count', kind: BtnKind.green, onTap: () => app.markDone(s, _ticked.entries.where((e) => e.value).map((e) => e.key).toSet())),
      ),
      children: [
        const StateBox(StateKind.info, "Only members who confirmed get +10. Untick anyone who didn't come.", fontSize: 15, weight: w600, lead: Ic('info', s: 22, c: C.navy, w: 2)),
        for (final a in s.assignments) _attRow(a),
      ],
    );
  }

  Widget _attRow(Assignment a) {
    final absent = statusOf(a) == StatusKind.absent;
    final confirmed = a.status == 'confirmed';
    final on = confirmed && (_ticked[a.userId] ?? false);
    final note = absent ? 'Absent' : (confirmed ? roleLabel[a.role]! : "Didn't confirm · no points");
    return Opacity(
      opacity: confirmed ? 1 : 0.6,
      child: Tap(
        onTap: () {
          if (absent) {
            widget.app.toast('${a.userName} is marked absent');
          } else if (!confirmed) {
            widget.app.toast("${a.userName} didn't confirm, so no points");
          } else {
            setState(() => _ticked[a.userId] = !(_ticked[a.userId] ?? false));
          }
        },
        color: C.white,
        radius: BorderRadius.circular(16),
        border: Border.all(color: on ? C.green : C.line, width: 2),
        height: 64,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: on ? C.green : (confirmed ? C.white : C.chip),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: on ? C.green : C.border, width: 2),
            ),
            child: confirmed ? const Center(child: Ic('check', s: 16, c: C.white, w: 3.5)) : const Center(child: Ic('x', s: 14, c: C.soft, w: 3)),
          ),
          const SizedBox(width: 14),
          Expanded(child: Text(a.userName, style: tx(16, w700))),
          Text(note, style: tx(14, confirmed ? FontWeight.w400 : w600, absent ? C.red : C.soft)),
        ]),
      ),
    );
  }
}
