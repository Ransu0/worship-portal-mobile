import 'package:flutter/material.dart';

import '../app_ctl.dart';
import '../helpers.dart';
import '../ui/icons.dart';
import '../ui/theme.dart';
import '../ui/widgets.dart';

class SignInScreen extends StatefulWidget {
  final AppCtl app;
  const SignInScreen({super.key, required this.app});
  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _u = TextEditingController();
  final _p = TextEditingController();
  bool _show = false;
  String _err = '';

  @override
  void dispose() {
    _u.dispose();
    _p.dispose();
    super.dispose();
  }

  void _submit() {
    FocusScope.of(context).unfocus();
    final e = widget.app.signIn(_u.text, _p.text);
    if (e != null) setState(() => _err = e);
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        Stack(children: [
          Container(
            width: double.infinity,
            padding: EdgeInsets.fromLTRB(28, 72 + top, 28, 48),
            decoration: const BoxDecoration(color: C.navy, borderRadius: BorderRadius.vertical(bottom: Radius.circular(36))),
            child: Column(children: [
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(color: C.white, borderRadius: BorderRadius.circular(60)),
                child: const Center(child: Logo(w: 84, h: 92)),
              ),
              const SizedBox(height: 20),
              const H1('Worship Team', color: C.white, size: 26),
            ]),
          ),
          Positioned(
            left: 12,
            top: top + 14,
            child: IconBtn(icon: 'back', size: 24, fg: C.white, onTap: widget.app.back, label: 'Back'),
          ),
        ]),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: gapped([
            Field(
              label: 'Username',
              child: Input(controller: _u, autocorrect: false, keyboard: TextInputType.text),
            ),
            Field(
              label: 'Password',
              child: Input(
                controller: _p,
                obscure: !_show,
                autocorrect: false,
                suffix: Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: TextBtn(_show ? 'Hide' : 'Show', size: 15, color: C.navy, onTap: () => setState(() => _show = !_show)),
                ),
              ),
            ),
            if (_err.isNotEmpty)
              StateBox(StateKind.bad, _err, fontSize: 15, padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12)),
            Padding(padding: const EdgeInsets.only(top: 8), child: Btn('Sign in', onTap: _submit)),
            const Sub('Forgot password? Ask your leader.', size: 15, align: TextAlign.center),
          ], 24)),
        ),
      ],
    );
  }
}

class CantScreen extends StatefulWidget {
  final AppCtl app;
  const CantScreen({super.key, required this.app});
  @override
  State<CantScreen> createState() => _CantScreenState();
}

class _CantScreenState extends State<CantScreen> {
  String _reason = 'Out of town';
  String? _who;

  @override
  Widget build(BuildContext context) {
    final app = widget.app;
    final s = app.upcoming!;
    final mine = findMine(s, app.me?.id)!;
    final cands = eligibleReplacements(app.users, s, mine.a.role, app.me?.id);
    final who = _who ?? (cands.isNotEmpty ? cands.first.id : 'none');
    final rep = firstOr(cands, (c) => c.id == who);
    return Frame(
      header: BackHeader(title: "Can't serve", sub: '${dLbl(s.date)} · ${roleLabel[mine.a.role]}', onBack: app.back),
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 32),
      gap: 32,
      bottom: ActionBar(child: Btn('Send', onTap: () => app.stepDown(s, who == 'none' ? null : who, _reason))),
      children: [
        Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const H2('Reason', size: 18),
          const SizedBox(height: 14),
          Chips(children: [
            for (final r in const ['Sick', 'Out of town', 'Work', 'Other'])
              ChipBtn(r, pressed: _reason == r, onTap: () => setState(() => _reason = r)),
          ]),
        ]),
        Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const H2('Who will cover?', size: 18),
          const SizedBox(height: 14),
          ...gapped([
            for (final u in cands)
              OptRow(label: u.fullName, lead: Ini(u.fullName), pressed: who == u.id, onTap: () => setState(() => _who = u.id)),
            OptRow(label: 'No one', red: true, pressed: who == 'none', onTap: () => setState(() => _who = 'none')),
          ], 10),
        ]),
        Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (who == 'none')
            const StateBox(StateKind.warn, 'Counts as 1 absence', fontSize: 16, lead: Ic('alert', s: 22, c: C.waitFg))
          else
            const StateBox(StateKind.ok, 'No absence counted', fontSize: 16, lead: Ic('check', s: 22, c: C.green, w: 2.6)),
          if (mine.a.role.name == 'songleader' && rep != null) ...[
            const SizedBox(height: 16),
            Sub('${rep.fullName} will lead and can edit the songs.'),
          ],
        ]),
      ],
    );
  }
}
