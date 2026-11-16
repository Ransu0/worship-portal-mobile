import 'package:flutter/material.dart';

import '../app_ctl.dart';
import '../config.dart';
import '../helpers.dart';
import '../models.dart';
import '../ui/icons.dart';
import '../ui/theme.dart';
import '../ui/widgets.dart';
import 'points_me.dart';

class TeamScreen extends StatefulWidget {
  final AppCtl app;
  const TeamScreen({super.key, required this.app});
  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  final _q = TextEditingController();
  String _f = 'All'; // All | Singers | <cap name>

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final app = widget.app;
    final q = _q.text.trim().toLowerCase();
    final list = app.users.where((u) {
      if (q.isNotEmpty && !u.fullName.toLowerCase().contains(q) && !u.username.contains(q)) return false;
      if (_f == 'All') return true;
      if (_f == 'Singers') return u.capabilities.contains(Cap.songleader) || u.capabilities.contains(Cap.backup);
      return u.capabilities.any((c) => c.name == _f);
    }).toList()
      ..sort((a, b) => a.fullName.toLowerCase().compareTo(b.fullName.toLowerCase()));
    final filters = ['All', 'Singers', 'guitar', 'bass', 'drums', 'keys', 'media', 'tambourines'];

    Widget rb(String label, String icon, BtnKind kind, VoidCallback f) => Expanded(
          child: Btn(label, icon: icon, iconSize: 18, kind: kind, height: 52, md: true, onTap: f),
        );

    return Frame(
      header: const TitleHeader(title: 'Team'),
      bottom: BottomNav(role: app.role, active: NavTab.team, onTab: app.tab),
      gap: 16,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(color: C.white, border: Border.all(color: C.line), borderRadius: BorderRadius.circular(24)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Tag('Admin roster control', icon: 'shield'),
            const SizedBox(height: 14),
            Row(children: [
              rb('Add member', 'userplus', BtnKind.navy, () => app.go(Screen.editmember, setEdit: true, editId: null)),
              const SizedBox(width: 10),
              rb('Import names', 'upload', BtnKind.soft, () => app.go(Screen.importNames)),
            ]),
            const SizedBox(height: 10),
            Row(children: [
              rb('Team per Sunday', 'team', BtnKind.soft, () => app.go(Screen.teamSetup)),
              const SizedBox(width: 10),
              rb('Copy all logins', 'copy', BtnKind.soft, () => app.exportLogins(app.users, 'All member logins')),
            ]),
            const SizedBox(height: 10),
            Row(children: [
              rb('Reset to Admin', 'trash', BtnKind.outlineRed, () => app.openSheet('resetAdmin')),
              const SizedBox(width: 10),
              const Expanded(child: SizedBox()),
            ]),
          ]),
        ),
        Padding(padding: const EdgeInsets.only(top: 4), child: H2('Team directory (${app.users.length})')),
        Input(controller: _q, hint: 'Search', kind: InputKind.search, onChanged: (_) => setState(() {})),
        SizedBox(
          height: 44,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: filters.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final x = filters[i];
              final label = x == 'All' || x == 'Singers' ? x : roleLabel[capFrom(x)!]!;
              return ChipBtn(label, pressed: _f == x, height: 44, borderColor: C.line, onTap: () => setState(() => _f = x));
            },
          ),
        ),
        Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (list.isEmpty) const EmptyText('No members found.'),
          ...gapped([for (final u in list) _memberCard(u)], 10),
        ]),
        SignOutMenu(app: app, showName: true),
        const VersionLine(),
      ],
    );
  }

  Widget _memberCard(AppUser u) {
    final app = widget.app;
    final ownPw = u.password.isNotEmpty && u.password != defaultPassword;
    return Tap(
      onTap: () => app.go(Screen.editmember, setEdit: true, editId: u.id),
      color: C.white,
      radius: BorderRadius.circular(18),
      border: Border.all(color: C.line),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(children: [
        Ini(u.fullName, size: 44),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text.rich(TextSpan(children: [
              TextSpan(text: u.fullName, style: tx(16, w700)),
              if (!u.active) TextSpan(text: ' · Inactive', style: tx(14, FontWeight.w400, C.soft)),
            ])),
            const SizedBox(height: 2),
            Text('@${u.username} · ${ownPw ? 'Own password' : 'Default password'}', style: tx(13, FontWeight.w400, C.soft)),
            if (u.capabilities.isNotEmpty || u.isAdmin) ...[
              const SizedBox(height: 4),
              Wrap(spacing: 4, runSpacing: 4, children: [
                for (final c in u.capabilities) _rtag(roleLabel[c]!, c == Cap.songleader ? C.waitBg : C.chip, c == Cap.songleader ? C.warnTxt : C.ink),
                if (u.isAdmin) _rtag('Admin', C.lav, C.navyD),
              ]),
            ],
          ]),
        ),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('${u.points}', style: tx(17, w800)),
          Text('pts', style: tx(12, FontWeight.w400, C.soft)),
        ]),
      ]),
    );
  }

  Widget _rtag(String t, Color bg, Color fg) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
        child: Text(t, style: tx(12, w700, fg)),
      );
}

class EditMemberScreen extends StatefulWidget {
  final AppCtl app;
  const EditMemberScreen({super.key, required this.app});
  @override
  State<EditMemberScreen> createState() => _EditMemberScreenState();
}

class _EditMemberScreenState extends State<EditMemberScreen> {
  final _name = TextEditingController();
  final _username = TextEditingController();
  List<Cap> _caps = [];
  String _role = 'member';
  bool _active = true;
  bool _confirmDel = false;
  AppUser? _u;

  @override
  void initState() {
    super.initState();
    _u = widget.app.editUser;
    final u = _u;
    if (u != null) {
      _name.text = u.fullName;
      _username.text = u.username;
      _caps = List.of(u.capabilities);
      _role = u.role;
      _active = u.active;
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _username.dispose();
    super.dispose();
  }

  void _save() {
    final app = widget.app;
    final fullName = _name.text.trim();
    if (fullName.isEmpty) {
      app.toast('Add a name first');
      return;
    }
    final raw = _username.text.trim().isEmpty ? fullName : _username.text.trim();
    final uname = raw.toLowerCase().replaceAll(RegExp(r'\s+'), '.');
    if (app.users.any((x) => x.username == uname && x.id != _u?.id)) {
      app.toast('That username is taken');
      return;
    }
    final caps = Cap.values.where(_caps.contains).toList();
    if (_u == null) {
      app.addUser(fullName: fullName, username: uname, role: _role, caps: caps, active: _active);
    } else {
      app.updateUser(_u!.id, fullName: fullName, username: uname, role: _role, caps: caps, active: _active);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = widget.app;
    final u = _u;
    return Frame(
      header: BackHeader(title: u == null ? 'Add member' : 'Edit member', onBack: app.back),
      gap: 24,
      bottom: ActionBar(child: Btn('Save', onTap: _save)),
      children: [
        Field(label: 'Name', child: Input(controller: _name, hint: 'Full name', caps: TextCapitalization.words)),
        Field(label: 'Username', child: Input(controller: _username, hint: 'e.g. ana.cruz', autocorrect: false)),
        Field(
          label: 'Ministry',
          child: Chips(gap: 8, children: [
            for (final c in allCaps)
              ChipBtn(roleLabel[c]!, height: 44, pressed: _caps.contains(c), onTap: () => setState(() {
                if (_caps.contains(c)) {
                  _caps.remove(c);
                } else {
                  _caps.add(c);
                }
              }),
            ),
          ]),
        ),
        Field(
          label: 'Access',
          child: Seg(a: 'Member', b: 'Admin', aOn: _role == 'member', onA: () => setState(() => _role = 'member'), onB: () => setState(() => _role = 'admin')),
        ),
        ToggleRow(on: _active, onTap: () => setState(() => _active = !_active), label: Text('Active', style: tx(16, w700))),
        if (u == null)
          const Sub("They'll sign in with the default password.")
        else ...[
          Row(children: [
            Expanded(child: Btn('Reset password', md: true, kind: BtnKind.soft, onTap: () => app.resetPassword(u))),
            const SizedBox(width: 12),
            Expanded(child: Btn('Copy login', icon: 'copy', iconSize: 18, md: true, kind: BtnKind.soft, onTap: () => app.exportLogins([u], "${u.fullName}'s login"))),
          ]),
          TextBtn(
            _confirmDel ? 'Tap again to remove' : 'Remove from team',
            color: C.red,
            onTap: () {
              if (_confirmDel) {
                app.deleteUser(u.id);
              } else {
                setState(() => _confirmDel = true);
              }
            },
          ),
        ],
      ],
    );
  }
}

class ImportScreen extends StatefulWidget {
  final AppCtl app;
  const ImportScreen({super.key, required this.app});
  @override
  State<ImportScreen> createState() => _ImportScreenState();
}

class _ImportScreenState extends State<ImportScreen> {
  final _text = TextEditingController();
  Cap _cap = Cap.backup;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _add() async {
    final names = _text.text.split(RegExp(r'[\n,]')).map((x) => x.trim()).where((x) => x.isNotEmpty).toList();
    final app = widget.app;
    final n = await app.importNames(names, _cap);
    app.toast(n > 0 ? '${plural(n, 'member')} added' : 'No new names');
  }

  @override
  Widget build(BuildContext context) {
    final app = widget.app;
    return Frame(
      header: BackHeader(title: 'Import names', onBack: app.back),
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 32),
      gap: 24,
      bottom: ActionBar(child: Btn('Add members', onTap: _add)),
      children: [
        Field(label: 'One name per line', child: Input(controller: _text, hint: 'Ana Cruz\nBen Torres', lines: 7, caps: TextCapitalization.words)),
        Field(
          label: 'Ministry',
          child: Chips(gap: 8, children: [
            for (final c in allCaps) ChipBtn(roleLabel[c]!, height: 44, pressed: _cap == c, onTap: () => setState(() => _cap = c)),
          ]),
        ),
        const StateBox(
          StateKind.info,
          'Usernames like ana.cruz · default password',
          fontSize: 15,
          weight: w600,
          lead: Ic('info', s: 22, c: C.navy, w: 2),
        ),
      ],
    );
  }
}

/// Admin: how many of each role the auto-shuffle puts on every Sunday.
class TeamSetupScreen extends StatefulWidget {
  final AppCtl app;
  const TeamSetupScreen({super.key, required this.app});
  @override
  State<TeamSetupScreen> createState() => _TeamSetupScreenState();
}

class _TeamSetupScreenState extends State<TeamSetupScreen> {
  late final Map<Cap, int> _n = Map.of(widget.app.teamCounts);

  int _have(Cap c) => widget.app.users.where((u) => u.active && u.capabilities.contains(c)).length;

  @override
  Widget build(BuildContext context) {
    final app = widget.app;
    return Frame(
      header: BackHeader(title: 'Team per Sunday', sub: 'Used by Auto-shuffle', onBack: app.back),
      gap: 12,
      bottom: ActionBar(child: Btn('Save', onTap: () => app.saveTeamCounts(_n))),
      children: [
        const StateBox(
          StateKind.info,
          'Changes apply to the next Auto-shuffle. To change a Sunday that is already made, open it and tap "Add someone".',
          fontSize: 15,
          weight: w600,
          lead: Ic('info', s: 22, c: C.navy, w: 2),
        ),
        for (final c in allCaps) _row(c),
      ],
    );
  }

  Widget _row(Cap c) {
    final n = _n[c] ?? 0;
    final everyone = n < 0;
    final have = _have(c);
    final locked = c == Cap.songleader;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
      decoration: BoxDecoration(color: C.white, border: Border.all(color: C.line), borderRadius: BorderRadius.circular(18)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Circle(color: C.lav, size: 40, child: Ic(roleIcon[c]!, s: 20, c: C.navy, w: 2.1)),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(roleLabel[c]!, style: tx(16, w700)),
              Text(locked ? 'Always 1 · takes turns' : '${plural(have, 'member')} with this ministry', style: tx(13, FontWeight.w400, C.soft)),
            ]),
          ),
          if (locked)
            Text('1', style: tx(22, w800, C.navy))
          else if (everyone)
            Text('All', style: tx(18, w800, C.navy))
          else ...[
            _step('−', n > 0 ? () => setState(() => _n[c] = n - 1) : null),
            SizedBox(width: 44, child: Text('$n', textAlign: TextAlign.center, style: tx(22, w800, n == 0 ? C.soft : C.navy))),
            _step('+', n < 6 ? () => setState(() => _n[c] = n + 1) : null),
          ],
        ]),
        if (!locked) ...[
          const SizedBox(height: 10),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => setState(() => _n[c] = everyone ? 1 : -1),
            child: Row(children: [
              Switch2(on: everyone),
              const SizedBox(width: 10),
              Expanded(child: Text('Everyone with ${roleLabel[c]} every Sunday', style: tx(14, w600, C.soft))),
            ]),
          ),
          if (!everyone && n > have && have > 0)
            Reveal(
              child: Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text('Only ${plural(have, 'member')} can play this, so some Sundays get fewer.', style: tx(13, w600, C.waitFg)),
              ),
            ),
        ],
      ]),
    );
  }

  Widget _step(String l, VoidCallback? f) => Opacity(
        opacity: f == null ? 0.35 : 1,
        child: Tap(
          onTap: f,
          color: C.chip,
          radius: BorderRadius.circular(12),
          width: 44,
          height: 44,
          child: Center(child: Text(l, style: tx(24, w700))),
        ),
      );
}
