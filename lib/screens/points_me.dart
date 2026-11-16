import 'package:flutter/material.dart';

import '../app_ctl.dart';
import '../config.dart';
import '../helpers.dart';
import '../models.dart';
import '../ui/icons.dart';
import '../ui/theme.dart';
import '../ui/widgets.dart';

const _medal = [Color(0xFFFFD60A), Color(0xFFE4E2DA), Color(0xFFF3D3B5)];

class PointsScreen extends StatefulWidget {
  final AppCtl app;
  const PointsScreen({super.key, required this.app});
  @override
  State<PointsScreen> createState() => _PointsScreenState();
}

class _PointsScreenState extends State<PointsScreen> {
  String? _open;
  bool _add = true;
  int _amount = 5;
  final _reason = TextEditingController();
  bool _all = false;

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  void _toggle(String id) => setState(() {
        _open = _open == id ? null : id;
        _add = true;
        _amount = 5;
        _reason.text = '';
      });

  @override
  Widget build(BuildContext context) {
    final app = widget.app;
    final admin = app.role == Role.admin;
    final ranked = app.users.where((u) => u.active && !u.isAdmin).toList()..sort((a, b) => b.points.compareTo(a.points));
    final me = app.me;
    final myRank = me == null ? 0 : ranked.indexWhere((u) => u.id == me.id) + 1;
    final logs = _all ? app.logs : app.logs.take(4).toList();

    return Frame(
      header: const TitleHeader(title: 'Points'),
      bottom: BottomNav(role: app.role, active: NavTab.points, onTab: app.tab),
      children: [
        if (app.isUser && me != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
            decoration: BoxDecoration(color: C.navy, borderRadius: BorderRadius.circular(24)),
            child: Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  CountUp(me.points, style: tx(56, w800, C.yellow, 1)),
                  const SizedBox(height: 6),
                  Text('your points', style: tx(16, w600, C.lavText)),
                ]),
              ),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('#${myRank == 0 ? '–' : myRank} rank', style: tx(17, w700, C.white)),
                const SizedBox(height: 14),
                Text(plural(me.absentCount, 'absence'), style: tx(17, w700, C.white)),
              ]),
            ]),
          ),
        Sub(admin ? 'Tap a name to add or take away points.' : '+10 when you confirm and serve', size: 15, align: TextAlign.center),
        CardBox(list: true, children: [
          if (ranked.isEmpty) const EmptyText('No members yet.'),
          for (var i = 0; i < ranked.length; i++) ..._rankRow(ranked[i], i, admin),
        ]),
        if (admin)
          CardBox(list: true, children: [
            Padding(padding: const EdgeInsets.only(top: 14, bottom: 6), child: Text('Recent changes', style: tx(18, w800))),
            if (logs.isEmpty) const EmptyText('No changes yet.'),
            for (var i = 0; i < logs.length; i++) _logRow(logs[i], i == 0),
            if (app.logs.length > 4)
              Align(
                alignment: Alignment.centerLeft,
                child: TextBtn(_all ? 'Show less' : 'Show all ${app.logs.length}', color: C.navy, onTap: () => setState(() => _all = !_all)),
              ),
          ]),
      ],
    );
  }

  List<Widget> _rankRow(AppUser u, int i, bool admin) {
    final app = widget.app;
    final mine = app.isUser && u.id == app.me?.id;
    final isOpen = admin && _open == u.id;
    final row = LRow(
      minHeight: admin ? 64 : 62,
      first: i == 0 || mine,
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(color: i < 3 ? _medal[i] : C.chip, borderRadius: BorderRadius.circular(16)),
          child: Center(child: Text('${i + 1}', style: tx(15, w800))),
        ),
        Grow(title: '${u.fullName}${mine ? ' (you)' : ''}', sub: admin ? plural(u.absentCount, 'absence') : null),
        Text('${u.points}', style: tx(17, w800)),
        if (admin) Ic(isOpen ? 'x' : 'edit', s: 16, c: C.soft),
      ],
    );
    return [
      if (admin)
        InkWell(onTap: () => _toggle(u.id), child: row)
      else if (mine)
        Container(
          margin: const EdgeInsets.symmetric(vertical: 4),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(color: C.lav, borderRadius: BorderRadius.circular(14)),
          child: row,
        )
      else
        row,
      if (isOpen) Reveal(key: ValueKey('adj-${u.id}'), child: _adjustBox(u)),
    ];
  }

  Widget _adjustBox(AppUser u) {
    final app = widget.app;
    return Container(
      margin: const EdgeInsets.fromLTRB(0, 2, 0, 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: C.bg, border: Border.all(color: C.line), borderRadius: BorderRadius.circular(18)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: gapped([
        Seg(a: 'Add', b: 'Remove', aOn: _add, onA: () => setState(() => _add = true), onB: () => setState(() => _add = false)),
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: C.white, border: Border.all(color: C.line), borderRadius: BorderRadius.circular(16)),
          child: Row(children: [
            _stepBtn('−', () => setState(() => _amount = _amount > 5 ? _amount - 5 : 5)),
            Expanded(
              child: Text('${_add ? '+' : '−'}$_amount', textAlign: TextAlign.center, style: tx(30, w800, _add ? C.green : C.red)),
            ),
            _stepBtn('+', () => setState(() => _amount += 5)),
          ]),
        ),
        Input(controller: _reason, hint: 'Reason', kind: InputKind.sm, style: tx(16, w600), caps: TextCapitalization.sentences),
        Chips(gap: 8, children: [
          for (final c in const ['Late to practice', 'Missed practice', 'Bonus'])
            ChipBtn(c, small: true, pressed: _reason.text == c, onTap: () => setState(() {
                  _reason.text = c;
                  _add = c == 'Bonus';
                })),
        ]),
        Row(children: [
          Expanded(child: Btn('Cancel', md: true, kind: BtnKind.outline, onTap: () => setState(() => _open = null))),
          const SizedBox(width: 12),
          Expanded(
            child: Btn('Save', md: true, onTap: () {
              app.adjust(u, _add ? _amount : -_amount, _reason.text.trim());
              setState(() => _open = null);
            }),
          ),
        ]),
      ], 12)),
    );
  }

  Widget _stepBtn(String l, VoidCallback f) => Tap(
        onTap: f,
        color: C.chip,
        radius: BorderRadius.circular(12),
        width: 48,
        height: 48,
        child: Center(child: Text(l, style: tx(26, w700))),
      );

  Widget _logRow(PointLog l, bool first) {
    final plus = l.points > 0, zero = l.points == 0;
    final bg = zero ? C.chip : (plus ? C.okBg : C.badBg);
    final fg = zero ? C.soft : (plus ? C.green : C.red);
    return LRow(minHeight: 64, first: first, children: [
      Container(
        constraints: const BoxConstraints(minWidth: 48),
        height: 32,
        padding: const EdgeInsets.symmetric(horizontal: 6),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
        child: Center(widthFactor: 1, child: Text(zero ? '0' : '${plus ? '+' : '−'}${l.points.abs()}', style: tx(15, w800, fg))),
      ),
      Grow(title: l.userName, sub: l.reason),
      Sub(dLbl(l.date)),
    ]);
  }
}

class MeScreen extends StatelessWidget {
  final AppCtl app;
  const MeScreen({super.key, required this.app});

  @override
  Widget build(BuildContext context) {
    final me = app.me!;
    final today = todayStr();
    final upcoming = app.schedules
        .where((s) => s.date.compareTo(today) >= 0)
        .map((s) => (s: s, mine: findMine(s, me.id)))
        .where((x) => x.mine != null)
        .take(4)
        .toList();
    return Frame(
      header: const SizedBox.shrink(),
      padding: EdgeInsets.fromLTRB(20, 40 + MediaQuery.paddingOf(context).top, 20, 32),
      gap: 24,
      bottom: BottomNav(role: app.role, active: NavTab.me, onTab: app.tab),
      children: [
        Column(children: [
          Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(color: C.navy, borderRadius: BorderRadius.circular(48)),
            child: Center(child: Text(initial(me.fullName), style: tx(38, w800, C.yellow))),
          ),
          const SizedBox(height: 12),
          H1(me.fullName, size: 26),
          const SizedBox(height: 12),
          if (me.capabilities.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(color: C.yellow, borderRadius: BorderRadius.circular(999)),
              child: Text(me.capabilities.map((c) => roleLabel[c]).join(' · '), style: tx(14, w800)),
            ),
        ]),
        Row(children: [
          Expanded(child: _stat('${me.points}', 'points')),
          const SizedBox(width: 12),
          Expanded(child: _stat('${me.absentCount}', me.absentCount == 1 ? 'absence' : 'absences')),
        ]),
        CardBox(list: true, children: [
          Padding(padding: const EdgeInsets.only(top: 14, bottom: 6), child: Text('My next Sundays', style: tx(18, w800))),
          if (upcoming.isEmpty) const EmptyText('Nothing scheduled.'),
          for (var i = 0; i < upcoming.length; i++)
            LRow(first: i == 0, children: [
              Expanded(child: Text(dLbl(upcoming[i].s.date), style: tx(16, w700))),
              Text(upcoming[i].mine!.covered ? 'Covered by ${upcoming[i].mine!.a.userName}' : roleLabel[upcoming[i].mine!.a.role]!, style: tx(15, FontWeight.w400, C.soft)),
            ]),
        ]),
        ToggleRow(
          on: app.remindersOn,
          onTap: app.remindersOn ? app.disableReminders : app.enableReminders,
          label: Row(children: [
            const Ic('bell', s: 20, c: C.navy, w: 2),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Reminders', style: tx(16, w700)),
                Text(app.needsInstallForReminders ? 'Add the app to your Home Screen first' : 'Sunday afternoon until you reply', style: tx(14, w600, C.soft)),
              ]),
            ),
          ]),
        ),
        SignOutMenu(app: app),
        const VersionLine(),
      ],
    );
  }

  Widget _stat(String big, String small) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(color: C.white, border: Border.all(color: C.line), borderRadius: BorderRadius.circular(20)),
        child: Column(children: [
          CountUp(int.tryParse(big) ?? 0, style: tx(28, w800)),
          const SizedBox(height: 4),
          Text(small, style: tx(14, w600, C.soft)),
        ]),
      );
}

class SignOutMenu extends StatelessWidget {
  final AppCtl app;
  final bool showName;
  const SignOutMenu({super.key, required this.app, this.showName = false});
  @override
  Widget build(BuildContext context) => Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(color: C.white, border: Border.all(color: C.line), borderRadius: BorderRadius.circular(24)),
        child: Tap(
          onTap: app.signOut,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          height: 60,
          child: Row(children: [
            const Ic('logout', s: 20, w: 2, c: C.red),
            const SizedBox(width: 14),
            Expanded(child: Text('Sign out${showName && app.me != null ? ' (${app.me!.fullName})' : ''}', style: tx(16, w700, C.red))),
          ]),
        ),
      );
}

class VersionLine extends StatelessWidget {
  const VersionLine({super.key});
  @override
  Widget build(BuildContext context) => Text(
        'Worship Team v$appVersion${appBuild == 'dev' ? ' (dev)' : ' · build $appBuild'}',
        textAlign: TextAlign.center,
        style: tx(13, w600, C.soft),
      );
}
