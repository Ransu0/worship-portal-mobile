// Shared building blocks, matching the web redesign's classes (mobile.css).
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../app_ctl.dart';
import '../helpers.dart';
import '../models.dart';
import 'icons.dart';
import 'theme.dart';

// ---------------------------------------------------------------- layout
/// Header + scrolling body + bottom bar, like the web `.screen`.
class Frame extends StatelessWidget {
  final Widget header;
  final List<Widget> children;
  final Widget? bottom;
  final double gap;
  final EdgeInsets padding;
  final Widget? under; // e.g. the Mine/All bar under the schedule header
  const Frame({
    super.key,
    required this.header,
    required this.children,
    this.bottom,
    this.gap = 20,
    this.padding = const EdgeInsets.fromLTRB(20, 24, 20, 32),
    this.under,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        header,
        if (under != null) under!,
        Expanded(
          child: ListView(
            padding: padding,
            children: gapped([for (var i = 0; i < children.length; i++) Appear(index: i, child: children[i])], gap),
          ),
        ),
        if (bottom != null) bottom!,
      ],
    );
  }
}

List<Widget> gapped(List<Widget> xs, double gap) {
  final out = <Widget>[];
  for (var i = 0; i < xs.length; i++) {
    if (i > 0) out.add(SizedBox(height: gap));
    out.add(xs[i]);
  }
  return out;
}

class _HeaderBox extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  final double minHeight;
  const _HeaderBox({required this.child, this.padding = const EdgeInsets.symmetric(horizontal: 20), this.minHeight = 72});
  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    return Container(
      decoration: const BoxDecoration(color: C.white, border: Border(bottom: BorderSide(color: C.line))),
      padding: EdgeInsets.only(top: top),
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: minHeight),
        child: Padding(padding: padding, child: child),
      ),
    );
  }
}

class Logo extends StatelessWidget {
  final double w, h;
  const Logo({super.key, this.w = 38, this.h = 42});
  @override
  Widget build(BuildContext context) => Image.asset('assets/logo.png', width: w, height: h, fit: BoxFit.contain);
}

class TopHeader extends StatelessWidget {
  final bool admin;
  final Widget? right;
  const TopHeader({super.key, this.admin = false, this.right});
  @override
  Widget build(BuildContext context) => _HeaderBox(
        child: Row(children: [
          const Logo(),
          const SizedBox(width: 12),
          Text('Worship Team', style: tx(18, w800)),
          if (admin) ...[const SizedBox(width: 12), const Tag('Admin')],
          const Spacer(),
          if (right != null) right!,
        ]),
      );
}

class BackHeader extends StatelessWidget {
  final String title;
  final String? sub;
  final VoidCallback onBack;
  final Widget? right;
  const BackHeader({super.key, required this.title, this.sub, required this.onBack, this.right});
  @override
  Widget build(BuildContext context) => _HeaderBox(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Row(children: [
          IconBtn(icon: 'back', size: 24, onTap: onBack, label: 'Back'),
          const SizedBox(width: 4),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
              Text(title, style: tx(19, w800), maxLines: 1, overflow: TextOverflow.ellipsis),
              if (sub != null) Text(sub!, style: tx(14, FontWeight.w400, C.soft), maxLines: 1, overflow: TextOverflow.ellipsis),
            ]),
          ),
          if (right != null) right!,
        ]),
      );
}

class TitleHeader extends StatelessWidget {
  final String title;
  final Widget? right;
  final double minHeight;
  const TitleHeader({super.key, required this.title, this.right, this.minHeight = 72});
  @override
  Widget build(BuildContext context) => _HeaderBox(
        minHeight: minHeight,
        child: Row(children: [
          Expanded(child: Text(title, style: tx(26, w800).copyWith(letterSpacing: -0.4))),
          if (right != null) right!,
        ]),
      );
}

class H1 extends StatelessWidget {
  final String text;
  final Color color;
  final double size;
  const H1(this.text, {super.key, this.color = C.ink, this.size = 28});
  @override
  Widget build(BuildContext context) => Text(text, style: tx(size, w800, color).copyWith(letterSpacing: -0.5));
}

class H2 extends StatelessWidget {
  final String text;
  final double size;
  const H2(this.text, {super.key, this.size = 19});
  @override
  Widget build(BuildContext context) => Text(text, style: tx(size, w800));
}

class Sub extends StatelessWidget {
  final String text;
  final double size;
  final TextAlign? align;
  final Color color;
  final FontWeight weight;
  const Sub(this.text, {super.key, this.size = 14, this.align, this.color = C.soft, this.weight = FontWeight.w400});
  @override
  Widget build(BuildContext context) => Text(text, textAlign: align, style: tx(size, weight, color));
}

class Tag extends StatelessWidget {
  final String text;
  final String? icon;
  const Tag(this.text, {super.key, this.icon});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(color: C.lav, borderRadius: BorderRadius.circular(6)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (icon != null) ...[Ic(icon!, s: 12, w: 2.5, c: C.navy), const SizedBox(width: 4)],
          Text(text, style: tx(12, w800, C.navy)),
        ]),
      );
}

// ---------------------------------------------------------------- tappables
/// Tappable with ink ripple, a small press "squish", and animated colour/border changes.
class Tap extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final Color color;
  final BorderRadius radius;
  final BoxBorder? border;
  final EdgeInsets? padding;
  final double? height;
  final double? width;
  final double pressScale;
  const Tap({
    super.key,
    required this.child,
    this.onTap,
    this.color = Colors.transparent,
    this.radius = BorderRadius.zero,
    this.border,
    this.padding,
    this.height,
    this.width,
    this.pressScale = 0.97,
  });
  @override
  State<Tap> createState() => _TapState();
}

class _TapState extends State<Tap> {
  bool _down = false;
  @override
  Widget build(BuildContext context) {
    final w = widget;
    return AnimatedScale(
      scale: _down && w.onTap != null ? w.pressScale : 1,
      duration: const Duration(milliseconds: 120),
      curve: Curves.easeOut,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        height: w.height,
        width: w.width,
        decoration: BoxDecoration(color: w.color, borderRadius: w.radius, border: w.border),
        child: Material(
          type: MaterialType.transparency,
          child: InkWell(
            onTap: w.onTap,
            onHighlightChanged: (v) => setState(() => _down = v),
            borderRadius: w.radius,
            splashColor: const Color(0x142B2D80),
            highlightColor: const Color(0x0A2B2D80),
            child: w.padding == null ? w.child : Padding(padding: w.padding!, child: w.child),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------- motion helpers
/// Fades + slides a child up when it first appears. [index] staggers lists.
class Appear extends StatefulWidget {
  final Widget child;
  final int index;
  final double dy;
  const Appear({super.key, required this.child, this.index = 0, this.dy = 14});
  @override
  State<Appear> createState() => _AppearState();
}

class _AppearState extends State<Appear> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 380));
  late final Animation<double> _a = CurvedAnimation(parent: _c, curve: Curves.easeOutCubic);

  @override
  void initState() {
    super.initState();
    final delay = Duration(milliseconds: 45 * math.min(widget.index, 8));
    if (delay == Duration.zero) {
      _c.forward();
    } else {
      Future.delayed(delay, () {
        if (mounted) _c.forward();
      });
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: _a,
        builder: (context, child) => Opacity(
          opacity: _a.value,
          child: Transform.translate(offset: Offset(0, widget.dy * (1 - _a.value)), child: child),
        ),
        child: widget.child,
      );
}

/// Grows open (height + fade) when it first appears.
class Reveal extends StatefulWidget {
  final Widget child;
  const Reveal({super.key, required this.child});
  @override
  State<Reveal> createState() => _RevealState();
}

class _RevealState extends State<Reveal> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 260))..forward();
  late final Animation<double> _a = CurvedAnimation(parent: _c, curve: Curves.easeOutCubic);
  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => SizeTransition(
        sizeFactor: _a,
        axisAlignment: -1,
        child: FadeTransition(opacity: _a, child: widget.child),
      );
}

/// A short side-to-side shake (e.g. wrong password).
class Shake extends StatefulWidget {
  final Widget child;
  const Shake({super.key, required this.child});
  @override
  State<Shake> createState() => _ShakeState();
}

class _ShakeState extends State<Shake> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 420))..forward();
  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: _c,
        builder: (context, child) {
          final t = _c.value;
          final dx = (1 - t) * 10 * math.sin(t * math.pi * 6);
          return Transform.translate(offset: Offset(dx, 0), child: child);
        },
        child: widget.child,
      );
}

/// Counts a number up to its value.
class CountUp extends StatelessWidget {
  final int value;
  final TextStyle style;
  const CountUp(this.value, {super.key, required this.style});
  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: value.toDouble()),
        duration: const Duration(milliseconds: 700),
        curve: Curves.easeOutCubic,
        builder: (context, v, _) => Text('${v.round()}', style: style),
      );
}

class IconBtn extends StatelessWidget {
  final String icon;
  final double size;
  final VoidCallback onTap;
  final String? label;
  final Color bg;
  final Color fg;
  final double w;
  final double radius;
  const IconBtn({
    super.key,
    required this.icon,
    required this.onTap,
    this.size = 20,
    this.label,
    this.bg = Colors.transparent,
    this.fg = C.ink,
    this.w = 2.2,
    this.radius = 22,
  });
  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: label,
        child: Tap(
          onTap: onTap,
          color: bg,
          radius: BorderRadius.circular(radius),
          width: 44,
          height: 44,
          child: Center(child: Ic(icon, s: size, c: fg, w: w)),
        ),
      );
}

enum BtnKind { navy, green, red, outlineRed, outline, soft, dash, yellow, ghostW }

class Btn extends StatelessWidget {
  final String label;
  final String? icon;
  final double iconSize;
  final double iconW;
  final Color? iconColor;
  final BtnKind kind;
  final bool md;
  final VoidCallback? onTap;
  final double? height;
  final bool leftAlign;
  final String? trailingIcon;
  const Btn(
    this.label, {
    super.key,
    this.icon,
    this.iconSize = 20,
    this.iconW = 2.2,
    this.iconColor,
    this.kind = BtnKind.navy,
    this.md = false,
    this.onTap,
    this.height,
    this.leftAlign = false,
    this.trailingIcon,
  });

  @override
  Widget build(BuildContext context) {
    late Color bg, fg;
    BoxBorder? border;
    switch (kind) {
      case BtnKind.navy:
        bg = C.navy;
        fg = C.white;
      case BtnKind.green:
        bg = C.green;
        fg = C.white;
      case BtnKind.red:
        bg = C.red;
        fg = C.white;
      case BtnKind.outlineRed:
        bg = C.white;
        fg = C.red;
        border = Border.all(color: C.line, width: 2);
      case BtnKind.outline:
        bg = C.white;
        fg = C.ink;
        border = Border.all(color: C.line, width: 2);
      case BtnKind.soft:
        bg = C.chip;
        fg = C.navy;
      case BtnKind.dash:
        bg = Colors.transparent;
        fg = C.navy;
      case BtnKind.yellow:
        bg = C.yellow;
        fg = C.ink;
      case BtnKind.ghostW:
        bg = Colors.transparent;
        fg = C.white;
        border = Border.all(color: const Color(0x66FFFFFF), width: 2);
    }
    final enabled = onTap != null;
    final r = BorderRadius.circular(md ? 14 : 16);
    final content = Row(
      mainAxisAlignment: leftAlign ? MainAxisAlignment.start : MainAxisAlignment.center,
      children: [
        if (icon != null) ...[Ic(icon!, s: iconSize, c: iconColor ?? fg, w: iconW), const SizedBox(width: 8)],
        if (leftAlign)
          Expanded(child: Text(label, style: tx(md ? 16 : 17, w700, fg)))
        else
          Flexible(child: Text(label, style: tx(md ? 16 : 17, w700, fg), textAlign: TextAlign.center, overflow: TextOverflow.ellipsis)),
        if (trailingIcon != null) ...[const SizedBox(width: 8), Ic(trailingIcon!, s: 20, c: fg, w: 2.5)],
      ],
    );
    Widget b = Tap(
      onTap: onTap,
      color: bg,
      radius: r,
      border: border,
      height: height ?? (md ? 48 : 56),
      padding: EdgeInsets.symmetric(horizontal: leftAlign ? 20 : 12),
      child: content,
    );
    if (kind == BtnKind.dash) {
      b = CustomPaint(painter: DashBorder(color: C.dash, radius: 16), child: b);
    }
    return Opacity(opacity: enabled ? 1 : 0.5, child: b);
  }
}

class DashBorder extends CustomPainter {
  final Color color;
  final double radius;
  DashBorder({required this.color, required this.radius});
  @override
  void paint(Canvas canvas, Size size) {
    final rect = RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(radius)).deflate(1);
    final path = Path()..addRRect(rect);
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    for (final m in path.computeMetrics()) {
      var d = 0.0;
      while (d < m.length) {
        canvas.drawPath(m.extractPath(d, d + 6), paint);
        d += 10;
      }
    }
  }

  @override
  bool shouldRepaint(covariant DashBorder old) => old.color != color;
}

/// Small chip-coloured button (`.mini`).
class MiniBtn extends StatelessWidget {
  final String label;
  final String? icon;
  final VoidCallback onTap;
  final bool green;
  const MiniBtn(this.label, {super.key, this.icon, required this.onTap, this.green = false});
  @override
  Widget build(BuildContext context) {
    final fg = green ? C.green : C.navy;
    return Tap(
      onTap: onTap,
      color: green ? C.okBg : C.chip,
      radius: BorderRadius.circular(12),
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Ic(icon!, s: 16, c: fg), const SizedBox(width: 6)],
        Text(label, style: tx(15, w700, fg)),
      ]),
    );
  }
}

class TextBtn extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final Color color;
  final double size;
  final bool underline;
  const TextBtn(this.label, {super.key, required this.onTap, this.color = C.ink, this.size = 16, this.underline = false});
  @override
  Widget build(BuildContext context) => Tap(
        onTap: onTap,
        radius: BorderRadius.circular(10),
        height: underline ? 44 : 48,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        child: Center(
          widthFactor: 1,
          child: Text(label,
              style: tx(size, w700, color).copyWith(
                decoration: underline ? TextDecoration.underline : null,
                decorationColor: color,
              )),
        ),
      );
}

class MoreLink extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const MoreLink(this.label, {super.key, required this.onTap});
  @override
  Widget build(BuildContext context) => Tap(
        onTap: onTap,
        radius: BorderRadius.circular(10),
        height: 44,
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Text(label, style: tx(15, w700, C.navy)),
          const SizedBox(width: 2),
          const Ic('chev', s: 18, w: 2.5, c: C.navy),
        ]),
      );
}

class PillBtn extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const PillBtn(this.label, {super.key, required this.onTap});
  @override
  Widget build(BuildContext context) => Tap(
        onTap: onTap,
        color: C.navy,
        radius: BorderRadius.circular(22),
        height: 44,
        padding: const EdgeInsets.symmetric(horizontal: 18),
        child: Center(widthFactor: 1, child: Text(label, style: tx(15, w700, C.white))),
      );
}

class AvatarBtn extends StatelessWidget {
  final String letter;
  final VoidCallback onTap;
  const AvatarBtn(this.letter, {super.key, required this.onTap});
  @override
  Widget build(BuildContext context) => Tap(
        onTap: onTap,
        color: C.navy,
        radius: BorderRadius.circular(22),
        width: 44,
        height: 44,
        child: Center(child: Text(letter, style: tx(16, w800, C.yellow))),
      );
}

// ---------------------------------------------------------------- bottom bars
class BottomNav extends StatelessWidget {
  final Role role;
  final NavTab active;
  final void Function(NavTab) onTab;
  const BottomNav({super.key, required this.role, required this.active, required this.onTab});

  @override
  Widget build(BuildContext context) {
    final items = <(NavTab, String, String)>[
      (NavTab.home, 'Home', 'home'),
      (NavTab.schedule, 'Schedule', 'schedule'),
      (NavTab.points, 'Points', 'points'),
      if (role == Role.member || role == Role.leader) (NavTab.me, 'Me', 'me'),
      if (role == Role.admin) (NavTab.team, 'Team', 'team'),
    ];
    final bottom = MediaQuery.paddingOf(context).bottom;
    return Container(
      height: 80 + bottom,
      padding: EdgeInsets.fromLTRB(8, 8, 8, 16 + bottom),
      decoration: const BoxDecoration(color: C.white, border: Border(top: BorderSide(color: C.line))),
      child: Row(
        children: [
          for (final it in items)
            Expanded(
              child: Semantics(
                selected: it.$1 == active,
                button: true,
                child: InkWell(
                  onTap: () => onTab(it.$1),
                  borderRadius: BorderRadius.circular(16),
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 260),
                      curve: Curves.easeOutCubic,
                      width: it.$1 == active ? 60 : 36,
                      height: 32,
                      decoration: BoxDecoration(color: it.$1 == active ? C.lav : Colors.transparent, borderRadius: BorderRadius.circular(16)),
                      child: Center(
                        child: AnimatedScale(
                          scale: it.$1 == active ? 1.08 : 1,
                          duration: const Duration(milliseconds: 260),
                          curve: Curves.easeOutBack,
                          child: Ic(it.$3, s: 22, w: it.$1 == active ? 2.3 : 2, c: it.$1 == active ? C.navy : C.soft),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    AnimatedDefaultTextStyle(
                      duration: const Duration(milliseconds: 200),
                      style: tx(13, it.$1 == active ? w800 : w600, it.$1 == active ? C.navy : C.soft),
                      child: Text(it.$2),
                    ),
                  ]),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class ActionBar extends StatelessWidget {
  final Widget child;
  const ActionBar({super.key, required this.child});
  @override
  Widget build(BuildContext context) => Container(
        padding: EdgeInsets.fromLTRB(20, 16, 20, 24 + MediaQuery.paddingOf(context).bottom),
        decoration: const BoxDecoration(color: C.white, border: Border(top: BorderSide(color: C.line))),
        child: child,
      );
}

// ---------------------------------------------------------------- cards
class CardBox extends StatelessWidget {
  final List<Widget> children;
  final bool list;
  final EdgeInsets? padding;
  final double radius;
  final double gap;
  const CardBox({super.key, required this.children, this.list = false, this.padding, this.radius = 24, this.gap = 6});
  @override
  Widget build(BuildContext context) => Container(
        padding: padding ?? (list ? const EdgeInsets.symmetric(horizontal: 20, vertical: 8) : const EdgeInsets.all(20)),
        decoration: BoxDecoration(color: C.white, border: Border.all(color: C.line), borderRadius: BorderRadius.circular(radius)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: gapped(children, list ? 0 : gap)),
      );
}

/// Card header row: tappable title on the left, action on the right.
class CardHead extends StatelessWidget {
  final String title;
  final VoidCallback? onTitle;
  final Widget? right;
  final double marginBottom;
  const CardHead({super.key, required this.title, this.onTitle, this.right, this.marginBottom = 8});
  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.only(bottom: marginBottom),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44),
          child: Row(children: [
            Expanded(
              child: GestureDetector(
                onTap: onTitle,
                behavior: HitTestBehavior.opaque,
                child: Padding(padding: const EdgeInsets.symmetric(vertical: 10), child: H2(title)),
              ),
            ),
            if (right != null) right!,
          ]),
        ),
      );
}

/// List row with a hairline on top (`.row`).
class LRow extends StatelessWidget {
  final List<Widget> children;
  final double minHeight;
  final bool first;
  final Color? bg;
  const LRow({super.key, required this.children, this.minHeight = 60, this.first = false, this.bg});
  @override
  Widget build(BuildContext context) => Container(
        constraints: BoxConstraints(minHeight: minHeight),
        decoration: BoxDecoration(
          color: bg,
          border: first ? null : const Border(top: BorderSide(color: C.line2)),
        ),
        child: Row(children: _gapRow(children, 14)),
      );
}

List<Widget> _gapRow(List<Widget> xs, double gap) {
  final out = <Widget>[];
  for (var i = 0; i < xs.length; i++) {
    if (i > 0) out.add(SizedBox(width: gap));
    out.add(xs[i]);
  }
  return out;
}

class Grow extends StatelessWidget {
  final String title;
  final String? sub;
  final Widget? titleWidget;
  const Grow({super.key, required this.title, this.sub, this.titleWidget});
  @override
  Widget build(BuildContext context) => Expanded(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            titleWidget ?? Text(title, style: tx(16, w700)),
            if (sub != null) ...[const SizedBox(height: 2), Text(sub!, style: tx(14, FontWeight.w400, C.soft))],
          ]),
        ),
      );
}

class Ini extends StatelessWidget {
  final String name;
  final double size;
  const Ini(this.name, {super.key, this.size = 40});
  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(color: C.chip, borderRadius: BorderRadius.circular(size / 2)),
        child: Center(child: Text(initial(name), style: tx(15, w800))),
      );
}

class KeyBadge extends StatelessWidget {
  final String k;
  final bool big;
  const KeyBadge(this.k, {super.key, this.big = false});
  @override
  Widget build(BuildContext context) => Container(
        constraints: BoxConstraints(minWidth: big ? 40 : 36),
        height: big ? 36 : 32,
        padding: EdgeInsets.symmetric(horizontal: big ? 8 : 6),
        decoration: BoxDecoration(color: big ? C.navy : C.lav, borderRadius: BorderRadius.circular(10)),
        child: Center(widthFactor: 1, child: Text(k.isEmpty ? '–' : k, style: tx(big ? 16 : 15, w800, big ? C.white : C.navy))),
      );
}

class EmptyText extends StatelessWidget {
  final String text;
  final bool center;
  const EmptyText(this.text, {super.key, this.center = false});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Text(text, textAlign: center ? TextAlign.center : TextAlign.start, style: tx(15, FontWeight.w400, C.soft)),
      );
}

class EmptyCard extends StatelessWidget {
  final String title;
  final String sub;
  final Widget? action;
  const EmptyCard({super.key, required this.title, required this.sub, this.action});
  @override
  Widget build(BuildContext context) => CustomPaint(
        painter: DashBorder(color: C.border, radius: 24),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
          decoration: BoxDecoration(color: C.white, borderRadius: BorderRadius.circular(24)),
          child: Column(children: [
            Text(title, textAlign: TextAlign.center, style: tx(18, w800)),
            const SizedBox(height: 14),
            Sub(sub, align: TextAlign.center),
            if (action != null) ...[const SizedBox(height: 14), action!],
          ]),
        ),
      );
}

enum StateKind { ok, warn, bad, info }

class StateBox extends StatelessWidget {
  final StateKind kind;
  final String text;
  final Widget? lead;
  final Widget? trailing;
  final double fontSize;
  final FontWeight weight;
  final EdgeInsets padding;
  const StateBox(this.kind, this.text,
      {super.key, this.lead, this.trailing, this.fontSize = 17, this.weight = w700, this.padding = const EdgeInsets.symmetric(horizontal: 18, vertical: 16)});
  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (kind) {
      StateKind.ok => (C.okBg, C.okTxt),
      StateKind.warn => (C.waitBg, C.warnTxt),
      StateKind.bad => (C.badBg, C.badTxt),
      StateKind.info => (C.lav, C.navyD),
    };
    return Container(
      padding: padding,
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Row(children: [
        if (lead != null) ...[lead!, const SizedBox(width: 14)],
        Expanded(child: Text(text, style: tx(fontSize, weight, fg))),
        if (trailing != null) ...[const SizedBox(width: 14), trailing!],
      ]),
    );
  }
}

class Circle extends StatelessWidget {
  final Color color;
  final Widget child;
  final double size;
  const Circle({super.key, required this.color, required this.child, this.size = 40});
  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(size / 2)),
        child: Center(child: child),
      );
}

// ---------------------------------------------------------------- chips / options
class ChipBtn extends StatelessWidget {
  final String label;
  final bool pressed;
  final VoidCallback onTap;
  final bool small;
  final double? height;
  final Color borderColor;
  const ChipBtn(this.label,
      {super.key, required this.pressed, required this.onTap, this.small = false, this.height, this.borderColor = C.border});
  @override
  Widget build(BuildContext context) => Tap(
        onTap: onTap,
        color: pressed ? C.navy : C.white,
        radius: BorderRadius.circular(999),
        border: Border.all(color: pressed ? C.navy : (small ? C.line : borderColor), width: 2),
        height: height ?? (small ? 40 : 46),
        padding: EdgeInsets.symmetric(horizontal: small ? 14 : 18),
        child: Center(widthFactor: 1, child: Text(label, style: tx(small ? 14 : 15, w700, pressed ? C.white : C.ink))),
      );
}

class Chips extends StatelessWidget {
  final List<Widget> children;
  final double gap;
  const Chips({super.key, required this.children, this.gap = 10});
  @override
  Widget build(BuildContext context) => Wrap(spacing: gap, runSpacing: gap, children: children);
}

/// Radio-style option row (`.opt`).
class OptRow extends StatelessWidget {
  final String label;
  final bool pressed;
  final VoidCallback onTap;
  final bool red;
  final Widget? lead;
  const OptRow({super.key, required this.label, required this.pressed, required this.onTap, this.red = false, this.lead});
  @override
  Widget build(BuildContext context) {
    final on = red ? C.red : C.navy;
    return Tap(
      onTap: onTap,
      color: C.white,
      radius: BorderRadius.circular(16),
      border: Border.all(color: pressed ? on : C.line, width: 2),
      height: 68,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(children: [
        if (lead != null) ...[lead!, const SizedBox(width: 14)],
        Expanded(child: Text(label, style: tx(17, w700, red ? C.red : C.ink))),
        AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: pressed ? on : C.line, width: 2),
            color: C.white,
          ),
          child: AnimatedScale(
            scale: pressed ? 1 : 0,
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOutBack,
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: DecoratedBox(decoration: BoxDecoration(color: on, borderRadius: BorderRadius.circular(8))),
            ),
          ),
        ),
      ]),
    );
  }
}

/// Two-option segmented control (`.seg`) with a sliding thumb.
class Seg extends StatelessWidget {
  final String a, b;
  final bool aOn;
  final VoidCallback onA, onB;
  const Seg({super.key, required this.a, required this.b, required this.aOn, required this.onA, required this.onB});
  @override
  Widget build(BuildContext context) {
    Widget item(String l, bool on, VoidCallback f) => Expanded(
          child: GestureDetector(
            onTap: f,
            behavior: HitTestBehavior.opaque,
            child: SizedBox(
              height: 46,
              child: Center(
                child: AnimatedDefaultTextStyle(
                  duration: const Duration(milliseconds: 200),
                  style: tx(16, w700, on ? C.ink : C.soft),
                  child: Text(l),
                ),
              ),
            ),
          ),
        );
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: C.chip, borderRadius: BorderRadius.circular(14)),
      child: Stack(children: [
        Positioned.fill(
          child: AnimatedAlign(
            duration: const Duration(milliseconds: 260),
            curve: Curves.easeOutCubic,
            alignment: aOn ? Alignment.centerLeft : Alignment.centerRight,
            child: FractionallySizedBox(
              widthFactor: 0.5,
              heightFactor: 1,
              child: Container(
                decoration: BoxDecoration(
                  color: C.white,
                  borderRadius: BorderRadius.circular(11),
                  boxShadow: const [BoxShadow(color: Color(0x14191A2E), blurRadius: 6, offset: Offset(0, 2))],
                ),
              ),
            ),
          ),
        ),
        Row(children: [item(a, aOn, onA), item(b, !aOn, onB)]),
      ]),
    );
  }
}

class Switch2 extends StatelessWidget {
  final bool on;
  const Switch2({super.key, required this.on});
  @override
  Widget build(BuildContext context) => AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
        width: 52,
        height: 32,
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(color: on ? C.green : C.dash, borderRadius: BorderRadius.circular(16)),
        alignment: on ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(width: 26, height: 26, decoration: BoxDecoration(color: C.white, borderRadius: BorderRadius.circular(13))),
      );
}

class ToggleRow extends StatelessWidget {
  final Widget label;
  final bool on;
  final VoidCallback onTap;
  const ToggleRow({super.key, required this.label, required this.on, required this.onTap});
  @override
  Widget build(BuildContext context) => Tap(
        onTap: onTap,
        color: C.white,
        radius: BorderRadius.circular(16),
        border: Border.all(color: C.line),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 36),
          child: Row(children: [Expanded(child: label), const SizedBox(width: 12), Switch2(on: on)]),
        ),
      );
}

// ---------------------------------------------------------------- inputs
class Field extends StatelessWidget {
  final String label;
  final Widget child;
  const Field({super.key, required this.label, required this.child});
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(label, style: tx(16, w700)),
        const SizedBox(height: 10),
        child,
      ]);
}

enum InputKind { normal, sm, soft, search }

class Input extends StatelessWidget {
  final TextEditingController controller;
  final String? hint;
  final InputKind kind;
  final bool obscure;
  final int? lines;
  final TextAlign align;
  final TextStyle? style;
  final ValueChanged<String>? onChanged;
  final Widget? suffix;
  final TextCapitalization caps;
  final TextInputType? keyboard;
  final bool autocorrect;
  final bool autofocus;
  final ValueChanged<String>? onSubmitted;
  final TextInputAction? inputAction;
  const Input({
    super.key,
    required this.controller,
    this.hint,
    this.kind = InputKind.normal,
    this.obscure = false,
    this.lines,
    this.align = TextAlign.start,
    this.style,
    this.onChanged,
    this.suffix,
    this.caps = TextCapitalization.none,
    this.keyboard,
    this.autocorrect = true,
    this.autofocus = false,
    this.onSubmitted,
    this.inputAction,
  });

  @override
  Widget build(BuildContext context) {
    final multi = lines != null && lines! > 1;
    final (double h, double r, Color fill, Color border, double size, FontWeight weight, double pad) = switch (kind) {
      InputKind.normal => (56.0, 14.0, C.white, C.border, 17.0, FontWeight.w400, 16.0),
      InputKind.sm => (48.0, 12.0, C.white, C.line, 16.0, w700, 12.0),
      InputKind.soft => (44.0, 12.0, C.bg, Colors.transparent, 15.0, FontWeight.w400, 12.0),
      InputKind.search => (52.0, 14.0, C.chip, Colors.transparent, 17.0, FontWeight.w400, 16.0),
    };
    final ob = OutlineInputBorder(borderRadius: BorderRadius.circular(r), borderSide: BorderSide(color: border, width: 2));
    final field = TextField(
      controller: controller,
      obscureText: obscure,
      maxLines: multi ? lines : 1,
      minLines: multi ? lines : null,
      textAlign: align,
      onChanged: onChanged,
      textCapitalization: caps,
      keyboardType: keyboard ?? (multi ? TextInputType.multiline : null),
      autocorrect: autocorrect,
      autofocus: autofocus,
      onSubmitted: onSubmitted,
      textInputAction: multi ? TextInputAction.newline : inputAction,
      style: style ?? tx(size, weight, C.ink, multi ? 1.6 : null),
      decoration: InputDecoration(
        isDense: true,
        hintText: hint,
        hintStyle: tx(size, weight, const Color(0xFF8A8C9E)),
        filled: true,
        fillColor: fill,
        contentPadding: EdgeInsets.symmetric(horizontal: pad, vertical: multi ? 12 : (h - size * 1.4) / 2),
        enabledBorder: ob,
        border: ob,
        focusedBorder: ob.copyWith(borderSide: BorderSide(color: kind == InputKind.normal ? C.navy : (border == Colors.transparent ? C.navy : C.navy), width: 2)),
        prefixIcon: kind == InputKind.search ? const Padding(padding: EdgeInsets.only(left: 16, right: 10), child: Ic('search', s: 20, c: C.soft)) : null,
        prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
        suffixIcon: suffix,
      ),
    );
    return multi ? field : SizedBox(height: h, child: field);
  }
}

// ---------------------------------------------------------------- hero + team
class Hero2 extends StatelessWidget {
  final Schedule s;
  final Widget chip;
  final Widget? extra;
  const Hero2({super.key, required this.s, required this.chip, this.extra});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(color: C.navy, borderRadius: BorderRadius.circular(24)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('This Sunday', style: tx(14, w600, C.lavText)),
                const SizedBox(height: 2),
                Text(dLbl(s.date), style: tx(26, w800, C.white)),
              ]),
            ),
            const SizedBox(width: 12),
            chip,
          ]),
          const SizedBox(height: 20),
          extra ?? HeroRows(s: s),
        ]),
      );
}

class HeroRows extends StatelessWidget {
  final Schedule s;
  const HeroRows({super.key, required this.s});
  @override
  Widget build(BuildContext context) {
    Widget row(String icon, String k, String v) => Row(children: [
          Ic(icon, s: 22, c: C.yellow, w: 2),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(k, style: tx(13, w700, C.lavText)),
              const SizedBox(height: 2),
              Text(v, style: tx(16, w700, C.white)),
            ]),
          ),
        ]);
    return Column(children: [
      row('music', 'Practice', '${longDay(s.practiceDate)} · ${s.practiceTime}'),
      const SizedBox(height: 14),
      Container(height: 1, color: const Color(0x26FFFFFF)),
      const SizedBox(height: 14),
      row('clock', 'Service', '${longDay(s.date)} · ${s.worshipTime}'),
    ]);
  }
}

class ChipY extends StatelessWidget {
  final String text;
  const ChipY(this.text, {super.key});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(color: C.yellow, borderRadius: BorderRadius.circular(999)),
        child: Text(text, style: tx(14, w800, C.ink)),
      );
}

class ChipG extends StatelessWidget {
  final String text;
  const ChipG(this.text, {super.key});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(color: const Color(0x24FFFFFF), borderRadius: BorderRadius.circular(999)),
        child: Text(text, style: tx(14, w700, C.white)),
      );
}

({Color bg, Color fg, String icon}) stStyle(StatusKind k) => switch (k) {
      StatusKind.ok => (bg: C.okBg, fg: C.okFg, icon: 'check'),
      StatusKind.wait => (bg: C.waitBg, fg: C.waitFg, icon: 'wait'),
      StatusKind.absent => (bg: C.badBg, fg: C.red, icon: 'x'),
    };

/// Team grouped under Song leader / Backup / Musicians & media, as role cards.
class TeamCards extends StatelessWidget {
  final Schedule s;
  final String? meId;
  final bool signedIn;
  final void Function(Assignment)? onPick;
  const TeamCards({super.key, required this.s, this.meId, required this.signedIn, this.onPick});

  @override
  Widget build(BuildContext context) {
    final lead = s.assignments.where((a) => a.role == Cap.songleader).toList();
    final backups = s.assignments.where((a) => a.role == Cap.backup).toList();
    final musicians = s.assignments.where((a) => a.role != Cap.songleader && a.role != Cap.backup).toList()
      ..sort((x, y) => musicianOrder.indexOf(x.role).compareTo(musicianOrder.indexOf(y.role)));
    final groups = <(String, List<Assignment>)>[('Song leader', lead), ('Backup', backups), ('Musicians & media', musicians)];
    final out = <Widget>[];
    for (final g in groups) {
      if (g.$2.isEmpty) continue;
      if (out.isNotEmpty) out.add(const SizedBox(height: 16));
      out.add(Row(children: [
        Text(g.$1, style: tx(13, w800, C.soft)),
        if (g.$2.length > 1) ...[
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
            decoration: BoxDecoration(color: C.chip, borderRadius: BorderRadius.circular(999)),
            child: Text('${g.$2.length}', style: tx(12, w800, C.soft)),
          ),
        ],
      ]));
      out.add(const SizedBox(height: 8));
      if (g.$1 == 'Song leader') {
        for (final a in g.$2) {
          out.add(_RoleCard(a: a, lead: true, mine: meId != null && a.userId == meId, signedIn: signedIn, onPick: onPick));
        }
      } else {
        // two per row
        for (var i = 0; i < g.$2.length; i += 2) {
          if (i > 0) out.add(const SizedBox(height: 8));
          out.add(IntrinsicHeight(
            child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Expanded(child: _RoleCard(a: g.$2[i], lead: false, mine: meId != null && g.$2[i].userId == meId, signedIn: signedIn, onPick: onPick)),
              const SizedBox(width: 8),
              Expanded(
                child: i + 1 < g.$2.length
                    ? _RoleCard(a: g.$2[i + 1], lead: false, mine: meId != null && g.$2[i + 1].userId == meId, signedIn: signedIn, onPick: onPick)
                    : const SizedBox(),
              ),
            ]),
          ));
        }
      }
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: out);
  }
}

class _RoleCard extends StatelessWidget {
  final Assignment a;
  final bool lead, mine, signedIn;
  final void Function(Assignment)? onPick;
  const _RoleCard({required this.a, required this.lead, required this.mine, required this.signedIn, this.onPick});

  @override
  Widget build(BuildContext context) {
    final st = statusOf(a);
    final sty = stStyle(st);
    final forName = coveringFor(a);
    final cardBg = lead ? C.lav : (mine ? C.white : C.bg);
    final icBg = lead ? C.navy : (mine ? C.lav : C.white);
    final icFg = lead ? C.yellow : C.navy;
    final icSize = lead ? 46.0 : 34.0;
    final badgeBorder = lead ? C.lav : (mine ? C.white : C.bg);
    return Semantics(
      label: '${roleLabel[a.role]}: ${a.userName}${forName != null ? ', covering for $forName' : ''}${signedIn ? ', ${statusLabel[st]}' : ''}',
      button: onPick != null,
      child: Tap(
        onTap: onPick == null ? null : () => onPick!(a),
        color: cardBg,
        radius: BorderRadius.circular(16),
        border: Border.all(color: mine ? C.navy : Colors.transparent, width: 2),
        padding: lead ? const EdgeInsets.symmetric(horizontal: 14, vertical: 12) : const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: lead ? 44 : 40),
          child: Row(children: [
            SizedBox(
              width: icSize + 3,
              height: icSize + 3,
              child: Stack(clipBehavior: Clip.none, children: [
                Container(
                  width: icSize,
                  height: icSize,
                  decoration: BoxDecoration(color: icBg, borderRadius: BorderRadius.circular(icSize / 2)),
                  child: Center(child: Ic(roleIcon[a.role]!, s: lead ? 22 : 18, w: 2.1, c: icFg)),
                ),
                if (signedIn)
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 18,
                      height: 18,
                      decoration: BoxDecoration(color: sty.fg, borderRadius: BorderRadius.circular(9), border: Border.all(color: badgeBorder, width: 2)),
                      child: Center(child: Ic(sty.icon, s: 10, c: C.white, w: 3.6)),
                    ),
                  ),
              ]),
            ),
            SizedBox(width: lead ? 9 : 5),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                Row(children: [
                  Flexible(child: Text(roleLabel[a.role]!, style: tx(13, w700, C.soft, 1.3), overflow: TextOverflow.ellipsis)),
                  if (mine) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: C.navy, borderRadius: BorderRadius.circular(6)),
                      child: Text('You', style: tx(10, w800, C.white)),
                    ),
                  ],
                ]),
                Text(a.userName, style: tx(lead ? 18 : 16, w800, C.ink, 1.25)),
                if (forName != null) Text('for $forName', style: tx(12, w600, C.soft)),
              ]),
            ),
            if (lead && signedIn) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: sty.bg, borderRadius: BorderRadius.circular(999)),
                child: Text(statusLabel[st]!, style: tx(13, w800, sty.fg)),
              ),
            ],
          ]),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------- welcome card
class WelcomeCard extends StatelessWidget {
  final String title;
  final String text;
  final Widget action;
  final VoidCallback onClose;
  const WelcomeCard({super.key, required this.title, required this.text, required this.action, required this.onClose});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: C.white, border: Border.all(color: C.line), borderRadius: BorderRadius.circular(24)),
        child: Stack(clipBehavior: Clip.none, children: [
          Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Align(
              alignment: Alignment.centerLeft,
              child: Container(width: 44, height: 6, decoration: BoxDecoration(color: C.yellow, borderRadius: BorderRadius.circular(3))),
            ),
            const SizedBox(height: 12),
            Padding(padding: const EdgeInsets.only(right: 40), child: Text(title, style: tx(20, w800))),
            const SizedBox(height: 12),
            Text(text, style: tx(15, FontWeight.w400, C.welcomeText, 1.5)),
            const SizedBox(height: 12),
            action,
          ]),
          Positioned(
            right: -12,
            top: -12,
            child: IconBtn(icon: 'x', size: 18, fg: C.soft, onTap: onClose, label: 'Dismiss welcome'),
          ),
        ]),
      );
}

// ---------------------------------------------------------------- sheet + toast
/// Dimmed backdrop + white sheet that slides up from the bottom.
class SheetFrame extends StatelessWidget {
  final Widget child;
  final VoidCallback onClose;
  const SheetFrame({super.key, required this.child, required this.onClose});
  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom + MediaQuery.viewInsetsOf(context).bottom;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
      builder: (context, t, sheet) => Stack(children: [
        Positioned.fill(
          child: GestureDetector(
            onTap: onClose,
            child: Container(color: Color.fromRGBO(25, 26, 46, 0.45 * t)),
          ),
        ),
        Align(
          alignment: Alignment.bottomCenter,
          child: FractionalTranslation(translation: Offset(0, 1 - t), child: sheet),
        ),
      ]),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.92),
        child: Material(
          color: C.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          child: SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(24, 14, 24, 32 + bottom),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
              Center(child: Container(width: 44, height: 5, decoration: BoxDecoration(color: C.border, borderRadius: BorderRadius.circular(3)))),
              const SizedBox(height: 22),
              child,
            ]),
          ),
        ),
      ),
    );
  }
}

class SheetView extends StatelessWidget {
  final String title;
  final String? sub;
  final Widget? child;
  final Widget actions;
  final VoidCallback onClose;
  const SheetView({super.key, required this.title, this.sub, this.child, required this.actions, required this.onClose});
  @override
  Widget build(BuildContext context) => SheetFrame(
        onClose: onClose,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
          Text(title, style: tx(23, w800)),
          if (sub != null) ...[const SizedBox(height: 6), Text(sub!, style: tx(16, FontWeight.w400, C.soft))],
          if (child != null) ...[const SizedBox(height: 22), child!],
          const SizedBox(height: 22),
          actions,
          const SizedBox(height: 8),
          TextBtn('Cancel', onTap: onClose),
        ]),
      );
}

class Feat extends StatelessWidget {
  final String icon;
  final Widget child;
  const Feat({super.key, required this.icon, required this.child});
  @override
  Widget build(BuildContext context) => Row(children: [
        Circle(color: C.lav, size: 36, child: Ic(icon, s: 18, c: C.navy)),
        const SizedBox(width: 14),
        Expanded(child: DefaultTextStyle(style: tx(16, w600), child: child)),
      ]);
}

class ToastView extends StatelessWidget {
  final String msg;
  const ToastView({super.key, required this.msg});
  @override
  Widget build(BuildContext context) => IgnorePointer(
        child: Align(
          alignment: Alignment.bottomCenter,
          child: Padding(
            padding: EdgeInsets.only(bottom: 100 + MediaQuery.paddingOf(context).bottom, left: 20, right: 20),
            child: AnimatedOpacity(
              opacity: msg.isEmpty ? 0 : 1,
              duration: const Duration(milliseconds: 200),
              child: AnimatedSlide(
                offset: msg.isEmpty ? const Offset(0, 0.4) : Offset.zero,
                duration: const Duration(milliseconds: 200),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                  decoration: BoxDecoration(color: C.ink, borderRadius: BorderRadius.circular(14)),
                  child: Text(msg.isEmpty ? ' ' : msg, style: tx(15, w700, C.white), maxLines: 1, overflow: TextOverflow.ellipsis),
                ),
              ),
            ),
          ),
        ),
      );
}
