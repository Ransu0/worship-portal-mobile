import 'package:flutter/material.dart';

import '../app_ctl.dart';
import '../helpers.dart';
import '../models.dart';
import '../ui/icons.dart';
import '../ui/theme.dart';
import '../ui/widgets.dart';

/// Welcome card per role (dismissible).
class Welcome extends StatelessWidget {
  final AppCtl app;
  const Welcome({super.key, required this.app});

  @override
  Widget build(BuildContext context) {
    if (!app.welcomeOn) return const SizedBox.shrink();
    final s = app.upcoming;
    final role = app.role;
    if (role == Role.guest) {
      return WelcomeCard(
        title: 'Welcome!',
        text: "See this Sunday's team, songs and the schedule. On the team? Sign in to confirm your part.",
        onClose: app.dismissWelcome,
        action: Btn('Sign in', md: true, onTap: () => app.go(Screen.signin)),
      );
    }
    if (role == Role.admin) {
      return WelcomeCard(
        title: 'Welcome, ${firstName(app.me)}',
        text: "Check who hasn't confirmed, keep next month's schedule ready, and look after points and members.",
        onClose: app.dismissWelcome,
        action: Btn('Open schedule', icon: 'schedule', iconSize: 18, md: true, onTap: () => app.tab(NavTab.schedule)),
      );
    }
    if (role == Role.leader && s != null) {
      return WelcomeCard(
        title: 'Welcome, ${firstName(app.me)}',
        text: 'You lead ${dLbl(s.date)}. Add the songs before Thursday so the team can practice.',
        onClose: app.dismissWelcome,
        action: Btn('Set songs', icon: 'music', iconSize: 18, md: true, onTap: () => app.go(Screen.editsongs, sel: s.id)),
      );
    }
    return _member();
  }

  Widget _member() => WelcomeCard(
        title: 'Welcome, ${firstName(app.me)}',
        text: "Every Sunday afternoon you'll get a reminder for the next Sunday. Reply by Wednesday afternoon.",
        onClose: app.dismissWelcome,
        action: app.remindersOn
            ? const StateBox(StateKind.ok, 'Reminders are on',
                fontSize: 15, padding: EdgeInsets.symmetric(horizontal: 14, vertical: 12), lead: Ic('check', s: 20, c: C.green, w: 2.6))
            : Btn('Turn on reminders', icon: 'bell', iconSize: 18, md: true, onTap: app.enableReminders),
      );
}

class SongsCard extends StatelessWidget {
  final AppCtl app;
  final Schedule s;
  const SongsCard({super.key, required this.app, required this.s});
  @override
  Widget build(BuildContext context) {
    final songs = s.lineup?.songs ?? const <Song>[];
    return CardBox(children: [
      CardHead(
        title: 'Songs',
        onTitle: () => app.go(Screen.songs, sel: s.id),
        right: app.canEditSongs(s)
            ? MiniBtn('Edit', icon: 'edit', onTap: () => app.go(Screen.editsongs, sel: s.id))
            : MoreLink('View all', onTap: () => app.go(Screen.songs, sel: s.id)),
      ),
      if (songs.isEmpty)
        const EmptyText('No songs yet.')
      else
        for (var i = 0; i < songs.length; i++)
          LRow(minHeight: 52, first: i == 0, children: [
            Expanded(child: Text(songs[i].title.isEmpty ? 'Untitled' : songs[i].title, style: tx(16, w600))),
            KeyBadge(songs[i].key),
          ]),
    ]);
  }
}

class HomeScreen extends StatelessWidget {
  final AppCtl app;
  const HomeScreen({super.key, required this.app});

  @override
  Widget build(BuildContext context) {
    final s = app.upcoming;
    final role = app.role;
    final Widget? right = role == Role.guest
        ? PillBtn('Sign in', onTap: () => app.go(Screen.signin))
        : role == Role.admin
            ? null
            : AvatarBtn(initial(app.me?.fullName ?? ''), onTap: () => app.tab(NavTab.me));
    final title = app.isUser ? 'Hi, ${firstName(app.me)}' : 'This Sunday';
    final nav = BottomNav(role: role, active: NavTab.home, onTab: app.tab);

    if (s == null) {
      return Frame(
        header: TopHeader(admin: role == Role.admin, right: right),
        bottom: nav,
        children: [
          H1(title),
          if (app.welcomeOn) Welcome(app: app),
          if (!app.loaded)
            const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator(color: C.navy)))
          else
            EmptyCard(
              title: 'No service scheduled',
              sub: app.offline ? 'No internet. Pull data again when you are online.' : (role == Role.admin ? 'Make the schedule for this month.' : 'Check back soon.'),
              action: role == Role.admin
                  ? Btn('Open schedule', md: true, onTap: () => app.tab(NavTab.schedule))
                  : app.offline
                      ? Btn('Try again', md: true, kind: BtnKind.soft, onTap: app.reload)
                      : null,
            ),
        ],
      );
    }
    if (role == Role.admin) return AdminHome(app: app, s: s);

    Widget chip = ChipG('${s.songleaderName} leads');
    final block = <Widget>[];
    if (app.isUser) {
      final mine = findMine(s, app.me?.id);
      if (mine == null) {
        chip = const ChipG('Free');
        block.add(const StateBox(StateKind.info, "You're not on the team this Sunday.", fontSize: 16));
      } else {
        final st = statusOf(mine.a);
        final serving = !mine.covered && st != StatusKind.absent;
        chip = serving ? ChipY(roleLabel[mine.a.role]!) : const ChipG('Not serving');
        final closed = replyClosed(s.date);
        if (mine.covered) {
          block.add(StateBox(StateKind.warn, '${mine.a.userName} is covering for you'));
        } else if (st == StatusKind.absent) {
          block.add(const StateBox(StateKind.bad, "You're marked absent"));
        } else if (st == StatusKind.ok) {
          block.add(StateBox(
            StateKind.ok,
            "You're confirmed",
            lead: const Circle(color: C.green, child: Ic('check', s: 20, c: C.white, w: 3)),
            trailing: closed ? null : TextBtn("Can't make it?", underline: true, size: 15, color: C.okTxt, onTap: () => app.go(Screen.cant)),
          ));
        } else if (closed) {
          block.add(const StateBox(StateKind.warn, 'Reply time ended. Ask your leader.', fontSize: 16, lead: Ic('clock', s: 22, c: C.waitFg)));
        } else {
          block.add(Row(children: [
            Expanded(child: Btn("I'll be there", icon: 'check', iconW: 2.6, kind: BtnKind.green, onTap: () => app.confirm(s))),
            const SizedBox(width: 12),
            Expanded(child: Btn("Can't serve", kind: BtnKind.outlineRed, onTap: () => app.go(Screen.cant))),
          ]));
          block.add(Transform.translate(offset: const Offset(0, -8), child: ByLine(s: s)));
        }
      }
    }

    return Frame(
      header: TopHeader(right: right),
      bottom: nav,
      children: [
        H1(title),
        if (app.welcomeOn) Welcome(app: app),
        Hero2(s: s, chip: chip),
        ...block,
        SongsCard(app: app, s: s),
        CardBox(children: [
          CardHead(
            title: 'Team',
            onTitle: () => app.go(Screen.sunday, sel: s.id),
            right: MoreLink('View all', onTap: () => app.go(Screen.sunday, sel: s.id)),
          ),
          TeamCards(s: s, meId: app.me?.id, signedIn: role != Role.guest),
        ]),
        if (app.offline) const OfflineNote(),
      ],
    );
  }
}

class ByLine extends StatelessWidget {
  final Schedule s;
  final Color color;
  const ByLine({super.key, required this.s, this.color = C.waitFg});
  @override
  Widget build(BuildContext context) => Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Ic('clock', s: 15, w: 2.4, c: color),
        const SizedBox(width: 6),
        Text('Reply by ${replyByLabel(s.date)}', style: tx(14, w700, color)),
      ]);
}

class OfflineNote extends StatelessWidget {
  const OfflineNote({super.key});
  @override
  Widget build(BuildContext context) => const StateBox(StateKind.warn, 'Offline. Showing the last saved data.', fontSize: 15, lead: Ic('alert', s: 20, c: C.waitFg));
}

class AdminHome extends StatelessWidget {
  final AppCtl app;
  final Schedule s;
  const AdminHome({super.key, required this.app, required this.s});

  @override
  Widget build(BuildContext context) {
    final ok = s.assignments.where((a) => statusOf(a) == StatusKind.ok).length;
    final pending = s.assignments.where((a) => statusOf(a) != StatusKind.ok).toList();
    final total = s.assignments.length;
    final pct = total == 0 ? 0.0 : ok / total;
    return Frame(
      header: const TopHeader(admin: true),
      bottom: BottomNav(role: Role.admin, active: NavTab.home, onTab: app.tab),
      children: [
        const H1('This Sunday'),
        if (app.welcomeOn) Welcome(app: app),
        Hero2(
          s: s,
          chip: ChipG('${s.songleaderName} leads'),
          extra: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              Expanded(child: Text('Confirmed', style: tx(15, w700, C.lavText))),
              Text('$ok of $total', style: tx(15, w700, C.white)),
            ]),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(5),
              child: Stack(children: [
                Container(height: 10, color: const Color(0x2EFFFFFF)),
                FractionallySizedBox(alignment: Alignment.centerLeft, widthFactor: pct, child: Container(height: 10, decoration: BoxDecoration(color: C.yellow, borderRadius: BorderRadius.circular(5)))),
              ]),
            ),
          ]),
        ),
        CardBox(list: true, children: [
          Padding(padding: const EdgeInsets.only(top: 14, bottom: 6), child: Text('Not confirmed yet', style: tx(18, w800))),
          if (pending.isEmpty)
            const EmptyText('Everyone has confirmed.')
          else
            for (var i = 0; i < pending.length; i++)
              LRow(minHeight: 68, first: i == 0, children: [
                Grow(
                  title: pending[i].userName,
                  sub: '${roleLabel[pending[i].role]}${statusOf(pending[i]) == StatusKind.absent ? ' · absent' : ''}',
                ),
                MiniBtn('Swap', onTap: () => app.go(Screen.swap, sel: s.id, swap: pending[i])),
              ]),
        ]),
        Btn('Open Sunday, ${dLbl(s.date)}', trailingIcon: 'chev', onTap: () => app.go(Screen.sunday, sel: s.id)),
        Btn('Send test reminder to this phone', icon: 'bell', iconSize: 18, kind: BtnKind.soft, md: true, onTap: app.sendTestReminder),
        if (app.offline) const OfflineNote(),
      ],
    );
  }
}
