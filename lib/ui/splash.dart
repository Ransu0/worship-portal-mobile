// Launch splash (matches the "Splash, loading and tap animations" preview).
//
// 1. First frame = the Android / web launch screen: the church logo, 146dp tall,
//    centred on navy. So the hand-over from Android is invisible.
// 2. The logo lifts, a soft glow, a breathing halo and faint sound ripples come in,
//    "Worship Team" fades in and five wave bars bounce while the first data loads.
// 3. Instrument morph: the logo melts into a glowing outline that becomes a mic,
//    guitar, drums, keys and tambourine, then the logo again, and the real logo
//    fills back in. The line under the name shows each instrument.
// 4. When the data is ready the bars flatten into a line and the splash fades into Home.
//
// Short splash (no morph): at least 0.8s, at most 2.5s. With the morph: until it ends,
// plus up to 1.5s more. After that Home shows its skeleton until the data arrives.
// No saved data and no internet: the bars droop, "No connection" + Retry.
// Reduce motion (phone setting): no morph, no ripples, the bars pulse instead.
import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app_ctl.dart';
import '../config.dart';
import '../webpush/webpush.dart';
import 'splash_shapes.dart';
import 'theme.dart';

/// Turn the instrument morph off for the short splash.
const kSplashMorph = true;

const _navy = Color(0xFF2B2D80);
const _goldAccent = Color(0xFFF2B33D);
const _logoPath = 'assets/logo.png';
const _boxW = 149.0, _boxH = 168.0; // the logo box (same shape as logo.png)
const _nativeH = 146.0; // logo height on the launch screen (fits Android 12's icon circle)
const _lift = 66.0;

// Morph timing (ms).
const _mDelay = 480, _mFade = 220, _mStep = 280, _mHold = 150, _mReveal = 320, _mBurst = 700;
final _mSteps = splashMorphShapes.length - 1;
final _mRevealAt = _mFade + _mSteps * _mStep + (_mSteps - 1) * _mHold;
final _mTotal = _mRevealAt + _mReveal;

/// The logo, decoded before runApp so the first frame already shows it.
class SplashArt {
  static ui.Image? logo;

  static Future<void> load() async {
    try {
      final views = ui.PlatformDispatcher.instance.views;
      final dpr = views.isEmpty ? 3.0 : views.first.devicePixelRatio;
      final data = await rootBundle.load(_logoPath);
      final codec = await ui.instantiateImageCodec(data.buffer.asUint8List(), targetHeight: (_boxH * dpr).round().clamp(168, 1024));
      logo = (await codec.getNextFrame()).image;
    } catch (e) {
      debugPrint('Splash logo not preloaded: $e');
    }
  }
}

/// Splash colours for the current look.
class _Look {
  final Color glow, edge, halo, ripple, bar, barHi, title, muted;
  const _Look(this.glow, this.edge, this.halo, this.ripple, this.bar, this.barHi, this.title, this.muted);
  static _Look get now {
    if (C.gold) {
      return const _Look(Color(0x2BF2B33D), Color(0x99000000), Color(0x2EF2B33D), Color(0x8CF2B33D), _goldAccent, Color(0xFFFFE2A3), _goldAccent, Color(0xFFCDBF9F));
    }
    if (C.dark) {
      return const _Look(Color(0x733B3FB8), Color(0x8C000000), Color(0x26FFD60A), Color(0x99A9ADFF), C.yellow, Color(0xFFFFF3B0), Colors.white, Color(0xA8FFFFFF));
    }
    return const _Look(Color(0x66848AFF), Color(0x8008082D), Color(0x38FFD60A), Color(0x8CFFFFFF), C.yellow, Color(0xFFFFF3B0), Colors.white, Color(0xB8FFFFFF));
  }
}

enum _Phase { waiting, offline, outro, done }

/// Shows the splash on top of [child] until the first data is ready.
/// Sits outside the theme cross-fade so a theme change never restarts it.
class SplashGate extends StatefulWidget {
  final AppCtl app;
  final Widget child;
  const SplashGate({super.key, required this.app, required this.child});

  @override
  State<SplashGate> createState() => _SplashGateState();
}

class _SplashGateState extends State<SplashGate> with TickerProviderStateMixin {
  // Bar speeds: whole cycles per 3.6s loop (0.9s, 0.72s, 1.2s, 0.9s, 0.9s), each offset.
  static const _cycles = [4, 5, 3, 4, 4];
  static const _phaseShift = [0.0, 0.35, 0.7, 0.2, 0.55];

  late final AnimationController _intro = AnimationController(vsync: this, duration: const Duration(milliseconds: 760));
  late final AnimationController _wave = AnimationController(vsync: this, duration: const Duration(milliseconds: 3600));
  late final AnimationController _loop = AnimationController(vsync: this, duration: const Duration(milliseconds: 2600));
  late final AnimationController _fx = AnimationController(vsync: this, duration: const Duration(milliseconds: 600), reverseDuration: const Duration(milliseconds: 420));
  late final AnimationController _hint = AnimationController(vsync: this, duration: const Duration(milliseconds: 360), reverseDuration: const Duration(milliseconds: 160));
  late final AnimationController _droop = AnimationController(vsync: this, duration: const Duration(milliseconds: 320));
  late final AnimationController _morph = AnimationController(vsync: this, duration: Duration(milliseconds: _mRevealAt + _mBurst));
  late final AnimationController _outro = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));

  _Phase _phase = _Phase.waiting;
  DateTime _since = DateTime.now();
  Duration _min = const Duration(milliseconds: 800), _max = const Duration(milliseconds: 2500);
  final List<Timer> _timers = [];
  Timer? _minTimer, _maxTimer, _hintTimer;
  List<double> _frozen = List.filled(5, 0.3);
  bool _reduce = false, _started = false, _morphOn = false, _buzzed = false;

  AppCtl get app => widget.app;

  /// Something to show: saved data, or a finished load (even if the team is empty).
  bool get _hasData => app.loaded && !(app.offline && app.users.isEmpty);

  /// Nothing saved on this phone and the first load failed.
  bool get _noDataOffline => app.loaded && app.offline && app.users.isEmpty;

  @override
  void initState() {
    super.initState();
    app.addListener(_check);
    // The HTML splash on the web looks the same; drop it as soon as we've drawn.
    WidgetsBinding.instance.addPostFrameCallback((_) => WebPush.hideSplash());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reduce = MediaQuery.disableAnimationsOf(context);
    if (_started) return;
    _started = true;
    _morphOn = kSplashMorph && !_reduce;
    if (_morphOn) {
      _min = Duration(milliseconds: _mDelay + _mTotal + 150);
      _max = _min + const Duration(milliseconds: 1500);
      _later(_mDelay, () => _morph.forward());
    }
    if (_reduce) {
      _intro.value = 1;
      _fx.value = 1;
    } else {
      _intro.forward();
      _later(180, () => _fx.forward());
    }
    _wave.repeat();
    _loop.repeat();
    _arm();
  }

  @override
  void dispose() {
    app.removeListener(_check);
    for (final t in [..._timers, _minTimer, _maxTimer, _hintTimer]) {
      t?.cancel();
    }
    for (final c in [_intro, _wave, _loop, _fx, _hint, _droop, _morph, _outro]) {
      c.dispose();
    }
    super.dispose();
  }

  void _later(int ms, VoidCallback f) => _timers.add(Timer(Duration(milliseconds: ms), () {
        if (mounted) f();
      }));

  void _arm() {
    _since = DateTime.now();
    _minTimer?.cancel();
    _maxTimer?.cancel();
    _hintTimer?.cancel();
    _minTimer = Timer(_min, _check);
    _maxTimer = Timer(_max, _onMax);
    // Only if loading is slow: a friendly line under the bars.
    _hintTimer = Timer(const Duration(milliseconds: 1700), () {
      if (mounted && _phase == _Phase.waiting && !_hasData) _hint.forward();
    });
  }

  void _check() {
    if (!mounted || _phase != _Phase.waiting) return;
    if (DateTime.now().difference(_since) < _min) return;
    if (_hasData) {
      _finish();
    } else if (_noDataOffline) {
      _goOffline();
    }
  }

  void _onMax() {
    if (!mounted || _phase != _Phase.waiting) return;
    if (_noDataOffline) {
      _goOffline();
    } else {
      _finish(); // ready, or still loading: Home shows its skeleton until the data arrives
    }
  }

  double _live(int i, double t) => 0.25 + 0.75 * (0.5 - 0.5 * math.cos(2 * math.pi * (t * _cycles[i] + _phaseShift[i])));

  void _freeze() {
    _frozen = List.generate(5, (i) => _wave.isAnimating ? _live(i, _wave.value) : _frozen[i]);
    _wave.stop();
  }

  void _goOffline() {
    _freeze();
    _hint.reverse();
    setState(() => _phase = _Phase.offline);
    _droop.forward(from: 0);
  }

  void _retry() {
    HapticFeedback.lightImpact();
    setState(() => _phase = _Phase.waiting);
    _droop.reverse();
    _wave.repeat();
    _min = const Duration(milliseconds: 800);
    _max = const Duration(milliseconds: 2500);
    _arm();
    app.reload();
  }

  void _finish() {
    _freeze();
    _minTimer?.cancel();
    _maxTimer?.cancel();
    _hintTimer?.cancel();
    _hint.reverse();
    _fx.reverse();
    setState(() => _phase = _Phase.outro);
    _outro.duration = Duration(milliseconds: _reduce ? 260 : 900);
    _outro.forward().whenComplete(() {
      if (!mounted) return;
      app.removeListener(_check);
      setState(() => _phase = _Phase.done);
    });
  }

  static double _iv(double t, double a, double b) => ((t - a) / (b - a)).clamp(0.0, 1.0);
  static double _easeIO(double t) => t < .5 ? 4 * t * t * t : 1 - math.pow(-2 * t + 2, 3) / 2;
  static double _easeOut(double t) => Curves.easeOutCubic.transform(t.clamp(0.0, 1.0));

  @override
  Widget build(BuildContext context) => Stack(
        fit: StackFit.expand,
        children: [
          widget.child,
          if (_phase != _Phase.done) _splash(context),
        ],
      );

  Widget _splash(BuildContext context) {
    final look = _Look.now;
    final target = C.dark ? C.bg : _navy; // Gold is dark too
    // Android's launch screen is always navy; on the web the HTML splash already uses the theme colour.
    final start = kIsWeb ? target : _navy;
    final bottomPad = MediaQuery.paddingOf(context).bottom;

    return Material(
      type: MaterialType.transparency,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque, // nothing underneath can be tapped while it shows
        onTap: () {},
        child: AnimatedBuilder(
          animation: Listenable.merge([_intro, _wave, _loop, _fx, _hint, _droop, _morph, _outro]),
          builder: (context, _) {
            final it = _intro.value;
            final o = _outro.value;
            final out = Curves.easeInCubic.transform(_iv(o, _reduce ? 0 : 0.5, 1));
            final bg = Color.lerp(start, target, _iv(it, 0, 0.4))!;
            final glowIn = _iv(it, 0, 0.45);
            final group = _easeOut(_iv(it, 0.33, 0.95));
            final m = _morphFrame();
            return AnnotatedRegion<SystemUiOverlayStyle>(
              value: SystemUiOverlayStyle(
                statusBarColor: Colors.transparent,
                statusBarIconBrightness: Brightness.light,
                statusBarBrightness: Brightness.dark,
                systemNavigationBarColor: bg,
                systemNavigationBarIconBrightness: Brightness.light,
              ),
              child: Opacity(
                opacity: 1 - out,
                child: Transform.scale(
                  scale: _reduce ? 1 : 1 + 0.04 * out,
                  child: LayoutBuilder(builder: (context, box) {
                    final w = box.maxWidth, h = box.maxHeight, cy = h / 2;
                    final shortest = math.min(w, h);
                    return Stack(children: [
                      Positioned.fill(child: ColoredBox(color: bg)),
                      // soft light behind the logo + gentle darkening at the edges
                      Positioned.fill(
                        child: Opacity(
                          opacity: glowIn,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: RadialGradient(
                                center: Alignment(0, -_lift / cy),
                                radius: 250 / shortest,
                                colors: [look.glow, look.glow.withValues(alpha: 0)],
                              ),
                            ),
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                gradient: RadialGradient(
                                  center: const Alignment(0, -0.1),
                                  radius: 0.9 * h / shortest,
                                  colors: [look.edge.withValues(alpha: 0), look.edge.withValues(alpha: 0), look.edge],
                                  stops: const [0, 0.55, 1],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      Positioned(left: (w - _boxW) / 2, top: cy - _boxH / 2, width: _boxW, height: _boxH, child: _logoGroup(look, m)),
                      Positioned(
                        left: 24,
                        right: 24,
                        top: cy + 22,
                        child: Opacity(
                          opacity: group,
                          child: Transform.translate(
                            offset: Offset(0, 12 * (1 - group)),
                            child: Column(mainAxisSize: MainAxisSize.min, children: [
                              Text('Worship Team', textAlign: TextAlign.center, style: tx(27, w800, look.title).copyWith(letterSpacing: -0.4)),
                              const SizedBox(height: 6),
                              SizedBox(
                                height: 22,
                                child: AnimatedSwitcher(
                                  duration: const Duration(milliseconds: 170),
                                  reverseDuration: const Duration(milliseconds: 110),
                                  transitionBuilder: (child, a) => FadeTransition(
                                    opacity: a,
                                    child: SlideTransition(position: Tween(begin: const Offset(0, 0.25), end: Offset.zero).animate(a), child: child),
                                  ),
                                  child: Text(m.label, key: ValueKey(m.label), textAlign: TextAlign.center, style: tx(15, FontWeight.w500, look.muted)),
                                ),
                              ),
                              const SizedBox(height: 22),
                              SizedBox(height: 34, child: _bars(look, o)),
                              _hintLine(look),
                              if (_phase == _Phase.offline) _offline(look),
                            ]),
                          ),
                        ),
                      ),
                      Positioned(
                        left: 0,
                        right: 0,
                        bottom: 30 + bottomPad,
                        child: Opacity(
                          opacity: _iv(it, 0.6, 1),
                          child: Text('Worship Team v$appVersion', textAlign: TextAlign.center, style: tx(13, FontWeight.w500, look.muted)),
                        ),
                      ),
                    ]);
                  }),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  /// Logo, halo, ripples, the morph shape and the reveal ring, moving together.
  Widget _logoGroup(_Look look, _MorphFrame m) {
    final it = _intro.value, o = _outro.value;
    final lift = _easeOut(_iv(it, 0.15, 0.9));
    final startScale = _nativeH / _boxH;
    final scale = (startScale + (0.8 - startScale) * lift) * (1 + 0.07 * _easeOut(_iv(o, 0.5, 0.92)));
    final fx = Curves.easeOut.transform(_fx.value);
    final live = _phase == _Phase.waiting && !_reduce;
    final l = _loop.value;
    final breathe = _reduce ? 0.5 : 0.5 - 0.5 * math.cos(2 * math.pi * l);
    final haloOpacity = fx * (0.75 + 0.25 * breathe) * (_phase == _Phase.offline ? 0.35 : 1);

    Widget centred(double size, Widget child) => Positioned(left: (_boxW - size) / 2, top: (_boxH - size) / 2, width: size, height: size, child: child);
    Widget ring(double p) {
      final s = 0.72 + 1.03 * _easeOut(p);
      final a = p < 0.14 ? p / 0.14 * 0.5 : 0.5 * (1 - (p - 0.14) / 0.86);
      return centred(
        200,
        Opacity(
          opacity: (a * fx).clamp(0.0, 1.0),
          child: Transform.scale(
            scale: s,
            child: DecoratedBox(decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: look.ripple, width: 1.5))),
          ),
        ),
      );
    }

    final logo = SplashArt.logo != null
        ? RawImage(image: SplashArt.logo, width: _boxW, height: _boxH, fit: BoxFit.contain, filterQuality: FilterQuality.medium)
        : Image.asset(_logoPath, width: _boxW, height: _boxH, fit: BoxFit.contain, filterQuality: FilterQuality.medium, gaplessPlayback: true);

    return Transform.translate(
      offset: Offset(0, -_lift * lift),
      child: Transform.scale(
        scale: scale,
        child: Stack(clipBehavior: Clip.none, children: [
          centred(
            310,
            Opacity(
              opacity: haloOpacity.clamp(0.0, 1.0),
              child: Transform.scale(
                scale: 0.92 + 0.14 * breathe,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(colors: [look.halo, look.halo.withValues(alpha: 0)], stops: const [0, 0.66]),
                  ),
                ),
              ),
            ),
          ),
          if (live) ...[ring(l), ring((l + 0.5) % 1)],
          // soft shadow under the logo, growing as it lifts
          Positioned(
            left: 0,
            top: 12,
            width: _boxW,
            height: _boxH,
            child: Opacity(
              opacity: (0.35 * lift * m.logoOpacity).clamp(0.0, 1.0),
              child: ImageFiltered(
                imageFilter: ui.ImageFilter.blur(sigmaX: 9, sigmaY: 9),
                child: ColorFiltered(colorFilter: const ColorFilter.mode(Colors.black, BlendMode.srcIn), child: logo),
              ),
            ),
          ),
          Positioned.fill(
            child: Opacity(
              opacity: m.logoOpacity,
              child: Transform.scale(scale: m.logoScale, child: logo),
            ),
          ),
          if (m.shapeOpacity > 0)
            Positioned.fill(
              child: Opacity(
                opacity: m.shapeOpacity,
                child: Transform.scale(
                  scale: m.shapeScale,
                  child: CustomPaint(painter: _MorphPainter(m.points!, look.bar, look.halo)),
                ),
              ),
            ),
          if (m.burst > 0 && m.burst < 1)
            centred(
              200,
              Opacity(
                opacity: 0.7 * (1 - m.burst),
                child: Transform.scale(
                  scale: 0.6 + 0.9 * _easeOut(m.burst),
                  child: DecoratedBox(decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: look.bar, width: 2))),
                ),
              ),
            ),
        ]),
      ),
    );
  }

  /// Where the instrument morph is at right now.
  _MorphFrame _morphFrame() {
    if (!_morphOn || _morph.value == 0) return const _MorphFrame.logo();
    final t = _morph.value * (_mRevealAt + _mBurst);
    final shapes = splashMorphShapes;
    List<double> lerp(int a, int b, double k) {
      final pa = shapes[a], pb = shapes[b];
      return List<double>.generate(pa.length, (i) => pa[i] + (pb[i] - pa[i]) * k, growable: false);
    }

    double bump(double since) => (since >= 0 && since < 260) ? 0.96 + 0.08 * math.sin(math.pi * since / 260) : 0.96;

    if (t < _mFade) {
      final f = t / _mFade;
      return _MorphFrame(shapes[0], splashMorphLabels[0], 1 - f, 1, f, 1 - 0.04 * f, 0);
    }
    if (t < _mRevealAt) {
      final s = t - _mFade;
      for (var i = 1; i <= _mSteps; i++) {
        final stepStart = (i - 1) * (_mStep + _mHold).toDouble();
        final landedPrev = stepStart - _mHold;
        if (s < stepStart + _mStep) {
          final k = _easeIO(((s - stepStart) / _mStep).clamp(0.0, 1.0));
          return _MorphFrame(lerp(i - 1, i, k), splashMorphLabels[i], 0, 1, 1, i > 1 ? bump(s - landedPrev) : 0.96, 0);
        }
        if (i < _mSteps && s < stepStart + _mStep + _mHold) {
          return _MorphFrame(shapes[i], splashMorphLabels[i], 0, 1, 1, bump(s - stepStart - _mStep), 0);
        }
      }
    }
    // the outline fills back in with the real logo, with a soft ring
    final r = ((t - _mRevealAt) / _mReveal).clamp(0.0, 1.0);
    if (!_buzzed) {
      _buzzed = true;
      HapticFeedback.lightImpact();
    }
    final last = splashMorphShapes.length - 1;
    return _MorphFrame(shapes[last], splashMorphLabels[last], _easeOut(r), 0.96 + 0.04 * _easeOut(r), 1 - r, 0.96, ((t - _mRevealAt) / _mBurst).clamp(0.0, 1.0));
  }

  Widget _bars(_Look look, double o) {
    final flat = _easeOut(_iv(o, 0, 0.3));
    final drop = _easeOut(_droop.value);
    final barsOpacity = (1 - _iv(o, 0.28, 0.42)) * (1 - 0.55 * drop);
    final pulse = _reduce && _phase == _Phase.waiting ? 0.55 + 0.45 * (0.5 + 0.5 * math.cos(2 * math.pi * _wave.value * 2)) : 1.0;
    final lineW = 34 + 116 * _easeOut(_iv(o, 0.28, 0.62));
    final lineO = (_reduce || o < 0.28) ? 0.0 : 1 - _iv(o, 0.55, 0.75);

    double h(int i) {
      if (_reduce) return 0.6;
      if (_phase == _Phase.outro) return ui.lerpDouble(_frozen[i], 0.14, flat)!;
      final base = _wave.isAnimating ? _live(i, _wave.value) : _frozen[i];
      return ui.lerpDouble(base, 0.14, drop)!;
    }

    return Stack(alignment: Alignment.center, children: [
      Opacity(
        opacity: (barsOpacity * pulse).clamp(0.0, 1.0),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          for (var i = 0; i < 5; i++)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3.5),
              child: Container(
                width: 6,
                height: 34 * h(i),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(3),
                  gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.topCenter, colors: [look.bar, look.barHi]),
                  boxShadow: [BoxShadow(color: look.halo, blurRadius: 12)],
                ),
              ),
            ),
        ]),
      ),
      if (lineO > 0)
        Opacity(
          opacity: lineO,
          child: Container(width: lineW, height: 4, decoration: BoxDecoration(color: look.bar, borderRadius: BorderRadius.circular(2))),
        ),
    ]);
  }

  Widget _hintLine(_Look look) {
    final v = _easeOut(_hint.value);
    if (v == 0) return const SizedBox.shrink();
    return Opacity(
      opacity: v,
      child: Transform.translate(
        offset: Offset(0, 6 * (1 - v)),
        child: Padding(
          padding: const EdgeInsets.only(top: 16),
          child: Text('Getting this Sunday ready…', textAlign: TextAlign.center, style: tx(14, FontWeight.w500, look.muted)),
        ),
      ),
    );
  }

  Widget _offline(_Look look) => Opacity(
        opacity: _droop.value,
        child: Padding(
          padding: const EdgeInsets.only(top: 18),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.wifi_off_rounded, size: 20, color: look.title),
              const SizedBox(width: 8),
              Text('No connection', style: tx(17, w700, look.title)),
            ]),
            const SizedBox(height: 6),
            Text('Check your internet, then try again.', textAlign: TextAlign.center, style: tx(14, FontWeight.w500, look.muted)),
            const SizedBox(height: 14),
            Material(
              color: look.bar,
              borderRadius: BorderRadius.circular(14),
              child: InkWell(
                onTap: _retry,
                borderRadius: BorderRadius.circular(14),
                child: SizedBox(
                  height: 48,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 26),
                    child: Center(widthFactor: 1, child: Text('Retry', style: tx(15, w800, const Color(0xFF1A1407)))),
                  ),
                ),
              ),
            ),
          ]),
        ),
      );
}

/// One moment of the morph: which outline to draw and how the real logo shows.
class _MorphFrame {
  final List<double>? points;
  final String label;
  final double logoOpacity, logoScale, shapeOpacity, shapeScale, burst;
  const _MorphFrame(this.points, this.label, this.logoOpacity, this.logoScale, this.shapeOpacity, this.shapeScale, this.burst);
  const _MorphFrame.logo()
      : points = null,
        label = 'Serving together',
        logoOpacity = 1,
        logoScale = 1,
        shapeOpacity = 0,
        shapeScale = 1,
        burst = 0;
}

/// Draws one outline (points in the 100 x 113 logo box) as a glowing solid shape.
class _MorphPainter extends CustomPainter {
  final List<double> pts;
  final Color color, glow;
  _MorphPainter(this.pts, this.color, this.glow);

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 100;
    final path = Path()..moveTo(pts[0] * s, pts[1] * s);
    for (var i = 2; i < pts.length; i += 2) {
      path.lineTo(pts[i] * s, pts[i + 1] * s);
    }
    path.close();
    canvas.drawPath(path.shift(const Offset(0, 8)), Paint()..color = const Color(0x4D000000)..maskFilter = const MaskFilter.blur(BlurStyle.normal, 7));
    canvas.drawPath(path, Paint()..color = glow..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8));
    canvas.drawPath(path, Paint()..color = color);
  }

  @override
  bool shouldRepaint(_MorphPainter old) => old.pts != pts || old.color != color;
}
