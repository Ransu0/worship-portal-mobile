// Design tokens. Light = the web redesign's mobile.css.
// Dark = near-black refined with our navy. Gold = the original portal's near-black + gold look.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

Color _p(Color light, Color dark, [Color? gold]) => C.gold ? (gold ?? dark) : (C.dark ? dark : light);

class C {
  /// Set by AppCtl before every rebuild. Gold is a dark theme, so dark is true for it too.
  static bool dark = false;
  static bool gold = false;

  // Brand
  /// Accent for text, icons, borders and thin marks.
  static Color get navy => _p(const Color(0xFF2B2D80), const Color(0xFFA9ADFF), const Color(0xFFF2B33D));
  /// Solid brand fill (buttons, avatars, active date). White text sits on it.
  static Color get brand => _p(const Color(0xFF2B2D80), const Color(0xFF3B3FB8), const Color(0xFFE9AE2E));
  /// Big hero cards. In dark mode a deep navy that lets the gold glow.
  static Color get hero => _p(const Color(0xFF2B2D80), const Color(0xFF1B1D52), const Color(0xFF1E1810));
  static Color get navyD => _p(const Color(0xFF1C1E5C), const Color(0xFF14163F), const Color(0xFF15110A));
  static const yellow = Color(0xFFFFD60A);
  /// Text on yellow, the same in both modes.
  static const onYellow = Color(0xFF191A2E);
  static Color get red => _p(const Color(0xFFA51C20), const Color(0xFFE5484D));
  static Color get green => _p(const Color(0xFF17784A), const Color(0xFF1F9D63));

  // Neutrals
  static Color get ink => _p(const Color(0xFF191A2E), const Color(0xFFF3F3F7), const Color(0xFFF6F1E4));
  static Color get soft => _p(const Color(0xFF55576E), const Color(0xFFA0A2B8), const Color(0xFFADA48C));
  static Color get bg => _p(const Color(0xFFF6F5F1), const Color(0xFF0C0D15), const Color(0xFF0A0907));
  /// Cards, headers, nav, sheets, inputs.
  static Color get surface => _p(Colors.white, const Color(0xFF161722), const Color(0xFF15130E));
  /// Raised bits on a surface (segmented thumb).
  static Color get surfaceHi => _p(Colors.white, const Color(0xFF2A2C3F), const Color(0xFF2A2519));
  static Color get line => _p(const Color(0xFFE4E2DA), const Color(0xFF272939), const Color(0xFF2B261B));
  static Color get line2 => _p(const Color(0xFFEFEDE6), const Color(0xFF1C1E2B), const Color(0xFF1C1912));
  static Color get chip => _p(const Color(0xFFF1EFE8), const Color(0xFF1F2130), const Color(0xFF1F1B13));
  static Color get lav => _p(const Color(0xFFE8E9F7), const Color(0xFF23264F), const Color(0xFF2E2511));
  /// Soft labels on hero cards.
  static Color get lavText => _p(const Color(0xFFC9CBF2), const Color(0xFFC9CBF2), const Color(0xFFD9C79A));
  /// Text / icons on a brand fill (white, but dark ink on gold).
  static Color get onBrand => _p(Colors.white, Colors.white, const Color(0xFF1A1407));
  /// The yellow mark on a brand fill (avatar letter, active date).
  static Color get brandMark => _p(const Color(0xFFFFD60A), const Color(0xFFFFD60A), const Color(0xFF1A1407));
  static Color get border => _p(const Color(0xFFD6D3C8), const Color(0xFF34374B), const Color(0xFF3B3424));
  static Color get dash => _p(const Color(0xFFB9B6AB), const Color(0xFF4A4D63), const Color(0xFF5A513B));
  static const white = Colors.white;
  static Color get toastBg => _p(const Color(0xFF191A2E), const Color(0xFF2E3045), const Color(0xFF2E281C));
  static Color get dim => _p(const Color(0xFF191A2E), const Color(0xFF000000));

  // Status colours
  static Color get okBg => _p(const Color(0xFFE6F4EC), const Color(0xFF0F2A1C));
  static Color get okFg => _p(const Color(0xFF17784A), const Color(0xFF4ADE80));
  static Color get okTxt => _p(const Color(0xFF10583A), const Color(0xFF86EFAC));
  static Color get waitBg => _p(const Color(0xFFFFF4CC), const Color(0xFF332905));
  static Color get waitFg => _p(const Color(0xFF6B4F00), const Color(0xFFFFD60A));
  static Color get warnTxt => _p(const Color(0xFF5A4300), const Color(0xFFFDE68A));
  static Color get badBg => _p(const Color(0xFFFDECEC), const Color(0xFF361315));
  static Color get badTxt => _p(const Color(0xFF7F1518), const Color(0xFFFCA5A5));
  static Color get welcomeText => _p(const Color(0xFF3F4158), const Color(0xFFC5C7DA), const Color(0xFFD2C9B0));
  static Color get noteText => _p(const Color(0xFF3D2E00), const Color(0xFFFDE68A));
}

/// Plus Jakarta Sans text style.
TextStyle tx(double size, [FontWeight weight = FontWeight.w400, Color? color, double? height]) =>
    GoogleFonts.plusJakartaSans(fontSize: size, fontWeight: weight, color: color ?? C.ink, height: height);

const w600 = FontWeight.w600;
const w700 = FontWeight.w700;
const w800 = FontWeight.w800;

/// Status bar + Android nav bar colours for the current mode.
SystemUiOverlayStyle overlayStyle() => SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: C.dark ? Brightness.light : Brightness.dark,
      statusBarBrightness: C.dark ? Brightness.dark : Brightness.light,
      systemNavigationBarColor: C.surface,
      systemNavigationBarIconBrightness: C.dark ? Brightness.light : Brightness.dark,
    );

final Map<String, ThemeData> _themes = {};

ThemeData appTheme() => _themes.putIfAbsent('${C.dark}${C.gold}', () {
      final b = C.dark ? Brightness.dark : Brightness.light;
      return ThemeData(
        useMaterial3: true,
        brightness: b,
        scaffoldBackgroundColor: C.bg,
        canvasColor: C.bg,
        colorScheme: ColorScheme.fromSeed(seedColor: C.gold ? const Color(0xFFE9AE2E) : const Color(0xFF2B2D80), brightness: b, primary: C.brand, surface: C.surface),
        textTheme: GoogleFonts.plusJakartaSansTextTheme(ThemeData(brightness: b).textTheme),
        splashFactory: InkRipple.splashFactory,
        textSelectionTheme: TextSelectionThemeData(cursorColor: C.navy, selectionHandleColor: C.navy),
      );
    });
