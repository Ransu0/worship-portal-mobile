// Loading placeholders: grey blocks the same size as the real content, with a soft
// shimmer, so nothing jumps when the data arrives. Shown only while the first load
// is still running after the splash hands over.
import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'theme.dart';

/// Sweeps a soft highlight across its child every 1.2s (pulses instead with Reduce motion).
class Shimmer extends StatefulWidget {
  final Widget child;
  const Shimmer({super.key, required this.child});
  @override
  State<Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<Shimmer> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.disableAnimationsOf(context);
    final hi = C.dark ? const Color(0x14FFFFFF) : const Color(0xBFFFFFFF);
    return AnimatedBuilder(
      animation: _c,
      child: widget.child,
      builder: (context, child) {
        if (reduce) {
          return Opacity(opacity: 0.6 + 0.4 * (0.5 + 0.5 * math.cos(2 * math.pi * _c.value)), child: child);
        }
        final t = Curves.easeInOut.transform(_c.value);
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (rect) => LinearGradient(
            begin: Alignment(-1 - 2 + 4 * t, 0),
            end: Alignment(1 - 2 + 4 * t, 0),
            colors: [Colors.transparent, hi, Colors.transparent],
            stops: const [0.25, 0.5, 0.75],
          ).createShader(rect),
          child: child,
        );
      },
    );
  }
}

/// One grey block.
class Bone extends StatelessWidget {
  final double? w;
  final double h;
  final double r;
  const Bone({super.key, this.w, required this.h, this.r = 12});
  @override
  Widget build(BuildContext context) => Container(
        width: w,
        height: h,
        decoration: BoxDecoration(color: C.dark ? C.chip : const Color(0xFFE8E5DC), borderRadius: BorderRadius.circular(r)),
      );
}

/// The shape of Home: the "This Sunday" card, songs and the team.
class HomeSkeleton extends StatelessWidget {
  const HomeSkeleton({super.key});

  Widget _card(List<Widget> children) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: C.surface, border: Border.all(color: C.line), borderRadius: BorderRadius.circular(24)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
      );

  @override
  Widget build(BuildContext context) => Semantics(
        label: 'Loading',
        child: ExcludeSemantics(
          child: Shimmer(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const Bone(h: 228, r: 24),
              const SizedBox(height: 20),
              _card([
                const Bone(w: 90, h: 22),
                const SizedBox(height: 18),
                for (var i = 0; i < 3; i++) ...[
                  if (i > 0) const SizedBox(height: 12),
                  const Row(children: [Expanded(child: Bone(h: 20)), SizedBox(width: 40), Bone(w: 44, h: 28, r: 8)]),
                ],
              ]),
              const SizedBox(height: 20),
              _card([
                const Bone(w: 80, h: 22),
                const SizedBox(height: 18),
                const Bone(h: 76, r: 18),
                const SizedBox(height: 10),
                for (var i = 0; i < 2; i++) ...[
                  if (i > 0) const SizedBox(height: 10),
                  const Row(children: [Expanded(child: Bone(h: 64, r: 16)), SizedBox(width: 10), Expanded(child: Bone(h: 64, r: 16))]),
                ],
              ]),
            ]),
          ),
        ),
      );
}
