// The app shell: picks the screen, draws sheets, the "Can you serve?" card
// and the toast on top, and handles the Android back button.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_ctl.dart';
import 'helpers.dart';
import 'screens/home.dart';
import 'screens/points_me.dart';
import 'screens/schedule.dart';
import 'screens/signin_cant.dart';
import 'screens/songs.dart';
import 'screens/team.dart';
import 'ui/icons.dart';
import 'ui/splash.dart';
import 'ui/theme.dart';
import 'ui/widgets.dart';

class WorshipApp extends StatelessWidget {
  final AppCtl app;
  const WorshipApp({super.key, required this.app});

  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: app,
        builder: (context, _) => MaterialApp(
          title: 'Worship Team',
          debugShowCheckedModeBanner: false,
          theme: appTheme(),
          home: AnnotatedRegion<SystemUiOverlayStyle>(
            value: overlayStyle(),
            // The launch splash sits outside the theme cross-fade so it never restarts.
            child: SplashGate(
              app: app,
              // Keyed on the mode so every widget (const ones too) repaints with
              // the new colours; the switcher cross-fades light <-> dark.
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 280),
                child: KeyedSubtree(key: ValueKey('${C.dark}${C.gold}'), child: Shell(app: app)),
              ),
            ),
          ),
        ),
      );
}

class Shell extends StatelessWidget {
  final AppCtl app;
  const Shell({super.key, required this.app});

  Widget _screen() {
    final me = app.me;
    final role = app.role;
    var v = app.view;
    if ((v == Screen.cant || v == Screen.me) && me == null) v = Screen.home;
    if ([Screen.songs, Screen.editsongs, Screen.sunday, Screen.swap, Screen.markdone].contains(v) && app.sel == null) v = Screen.home;
    if ([Screen.team, Screen.editmember, Screen.importNames, Screen.teamSetup].contains(v) && role != Role.admin) v = Screen.home;
    if (v == Screen.swap && app.swapTarget == null) v = Screen.home;
    if (v == Screen.cant && findMine(app.upcoming, me?.id) == null) v = Screen.home;
    return switch (v) {
      Screen.home => HomeScreen(app: app),
      Screen.cant => CantScreen(app: app),
      Screen.songs => SongsScreen(app: app),
      Screen.editsongs => EditSongsScreen(key: ValueKey('edit-${app.selId}'), app: app),
      Screen.schedule => ScheduleScreen(app: app),
      Screen.sunday => SundayScreen(app: app),
      Screen.swap => SwapScreen(key: ValueKey('swap-${app.selId}-${app.swapTarget?.userId}'), app: app),
      Screen.markdone => MarkDoneScreen(key: ValueKey('done-${app.selId}'), app: app),
      Screen.points => PointsScreen(app: app),
      Screen.me => MeScreen(app: app),
      Screen.team => TeamScreen(app: app),
      Screen.editmember => EditMemberScreen(key: ValueKey('member-${app.editUserId ?? 'new'}'), app: app),
      Screen.importNames => ImportScreen(app: app),
      Screen.teamSetup => TeamSetupScreen(app: app),
    };
  }

  @override
  Widget build(BuildContext context) {
    final overlay = _overlay(context);
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (app.handleBack()) SystemNavigator.pop();
      },
      child: Scaffold(
        backgroundColor: C.bg,
        resizeToAvoidBottomInset: true,
        body: Stack(children: [
          Positioned.fill(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              reverseDuration: const Duration(milliseconds: 220),
              switchInCurve: Curves.easeOutCubic,
              switchOutCurve: Curves.easeInCubic,
              layoutBuilder: (current, previous) => Stack(fit: StackFit.expand, children: [...previous, if (current != null) current]),
              transitionBuilder: (child, anim) => _transition(child, anim),
              child: KeyedSubtree(key: ValueKey(app.view), child: _screen()),
            ),
          ),
          if (overlay != null) Positioned.fill(child: overlay),
          Positioned.fill(child: ToastView(msg: app.toastMsg)),
        ]),
      ),
    );
  }

  /// Forward: new screen slides in from the right. Back: from the left. Tabs: fade.
  Widget _transition(Widget child, Animation<double> anim) {
    final incoming = (child.key as ValueKey?)?.value == app.view;
    final fade = FadeTransition(opacity: anim, child: child);
    if (app.dir == NavDir.tab) {
      return ScaleTransition(scale: Tween(begin: incoming ? 0.985 : 1.0, end: 1.0).animate(anim), child: fade);
    }
    final dx = app.dir == NavDir.forward ? 0.12 : -0.12;
    final begin = incoming ? Offset(dx, 0) : Offset(-dx * 0.5, 0);
    return SlideTransition(position: Tween(begin: begin, end: Offset.zero).animate(anim), child: fade);
  }

  Widget? _overlay(BuildContext context) {
    final sheet = app.sheet;
    if (app.themePickerOpen) return ThemePicker(app: app);
    if (app.confirmCard) {
      final card = _confirmCard(context);
      if (card != null) return card;
    }
    if (app.signInOpen) return SignInOverlay(app: app);
    if (sheet == null) return null;
    switch (sheet.kind) {
      case 'shuffle':
        final k = sheet.data!;
        final ym = parseMonthKey(k);
        final prevLeaders = app.schedules.where((s) => s.month == addMonth(k, -1)).map((s) => s.songleaderName).toSet().toList();
        return SheetView(
          title: 'Auto-shuffle ${monthName(k)}?',
          sub: plural(sundaysCount(ym.y, ym.m), 'Sunday'),
          onClose: app.closeSheet,
          actions: Btn('Shuffle and save', icon: 'shuffle', onTap: () => app.shuffleMonth(k)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Feat(
              icon: 'rotate',
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Song leaders take turns'),
                if (prevLeaders.isNotEmpty) Sub('${prevLeaders.join(', ')} led last month, so they go last'),
              ]),
            ),
            const SizedBox(height: 16),
            const Feat(icon: 'team', child: Text('Active members only')),
            const SizedBox(height: 16),
            const Feat(icon: 'music', child: Text('Tambourine every Sunday')),
          ]),
        );
      case 'clear':
        final k = sheet.data!;
        final n = app.schedules.where((s) => s.month == k).length;
        return SheetView(
          title: 'Delete all of ${monthName(k)}?',
          sub: "Removes ${plural(n, 'Sunday')}, their teams and songs. This can't be undone.",
          onClose: app.closeSheet,
          actions: Btn('Delete ${months[parseMonthKey(k).m]}', icon: 'trash', kind: BtnKind.red, onTap: () => app.deleteMonth(k)),
        );
      case 'install':
        Widget step(int n, String t) => Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Row(children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(color: C.lav, borderRadius: BorderRadius.circular(14)),
                  child: Center(child: Text('$n', style: tx(14, w800, C.navy))),
                ),
                const SizedBox(width: 12),
                Expanded(child: Text(t, style: tx(16, w600))),
              ]),
            );
        return SheetView(
          title: 'Add to Home Screen first',
          sub: 'iPhone only sends reminders to apps on your Home Screen.',
          onClose: app.closeSheet,
          actions: Btn('Got it', onTap: app.closeSheet),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            step(1, 'In Safari, tap the Share button (square with an arrow).'),
            step(2, 'Tap "Add to Home Screen", then "Add".'),
            step(3, 'Open Worship Team from your Home Screen.'),
            step(4, 'Sign in and tap "Turn on reminders".'),
          ]),
        );
      case 'resetAdmin':
        return SheetView(
          title: 'Reset to Admin only?',
          sub: 'Removes every member, schedule and point. Only the Admin account stays.',
          onClose: app.closeSheet,
          actions: Btn('Reset everything', icon: 'trash', kind: BtnKind.red, onTap: app.resetToAdmin),
        );
      case 'export':
        final text = sheet.data ?? '';
        return SheetView(
          title: sheet.title ?? 'Export',
          sub: 'Copied to your clipboard. You can also select the text below.',
          onClose: app.closeSheet,
          actions: Btn('Copy again', icon: 'copy', onTap: () async {
            await Clipboard.setData(ClipboardData(text: text));
            app.toast('Copied');
          }),
          child: Container(
            height: 220,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: C.bg, border: Border.all(color: C.line), borderRadius: BorderRadius.circular(14)),
            child: SingleChildScrollView(
              child: SelectableText(text, style: TextStyle(fontFamily: 'monospace', fontSize: 13, height: 1.5, color: C.ink)),
            ),
          ),
        );
    }
    return null;
  }

  /// Full-screen "Can you serve this Sunday?" card (opened from a reminder).
  Widget? _confirmCard(BuildContext context) {
    final s = app.upcoming;
    final me = app.me;
    if (s == null || me == null) return null;
    final mine = findMine(s, me.id);
    if (mine == null || mine.covered) return null;
    final pad = MediaQuery.paddingOf(context);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 40, end: 0),
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
      builder: (context, v, child) => Transform.translate(offset: Offset(0, v), child: Opacity(opacity: 1 - v / 40, child: child)),
      child: Container(
        color: C.hero,
        padding: EdgeInsets.fromLTRB(24, 56 + pad.top, 24, 32 + pad.bottom),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(color: C.white, borderRadius: BorderRadius.circular(26)),
              child: const Center(child: Logo(w: 36, h: 40)),
            ),
            const SizedBox(width: 12),
            Text('Worship Team', style: tx(16, w700, C.lavText)),
          ]),
          const SizedBox(height: 28),
          Text('Can you serve this Sunday?', style: tx(28, w800, C.white, 1.2)),
          const SizedBox(height: 28),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: const Color(0x1AFFFFFF), borderRadius: BorderRadius.circular(20)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(children: [
                Expanded(child: Text(dLbl(s.date), style: tx(26, w800, C.white))),
                ChipY(roleLabel[mine.a.role]!),
              ]),
              const SizedBox(height: 14),
              Container(height: 1, color: const Color(0x26FFFFFF)),
              const SizedBox(height: 14),
              HeroRows(s: s),
            ]),
          ),
          const SizedBox(height: 28),
          Row(children: [
            const Ic('clock', s: 18, w: 2.4, c: C.yellow),
            const SizedBox(width: 8),
            Text('Reply by ${replyByLabel(s.date)}', style: tx(15, w700, C.yellow)),
          ]),
          const Spacer(),
          Btn("Yes, I'll be there", icon: 'check', iconW: 2.8, kind: BtnKind.yellow, onTap: () {
            app.closeConfirmCard();
            app.confirm(s);
          }),
          const SizedBox(height: 12),
          Btn("I can't serve", kind: BtnKind.ghostW, onTap: () {
            app.closeConfirmCard();
            app.go(Screen.cant);
          }),
          const SizedBox(height: 12),
          TextBtn('Later', color: C.white, onTap: app.closeConfirmCard),
        ]),
      ),
    );
  }
}
