// Design tokens copied from the web redesign's mobile.css.
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class C {
  static const navy = Color(0xFF2B2D80);
  static const navyD = Color(0xFF1C1E5C);
  static const yellow = Color(0xFFFFD60A);
  static const red = Color(0xFFA51C20);
  static const green = Color(0xFF17784A);
  static const ink = Color(0xFF191A2E);
  static const soft = Color(0xFF55576E);
  static const bg = Color(0xFFF6F5F1);
  static const line = Color(0xFFE4E2DA);
  static const line2 = Color(0xFFEFEDE6);
  static const chip = Color(0xFFF1EFE8);
  static const lav = Color(0xFFE8E9F7);
  static const lavText = Color(0xFFC9CBF2);
  static const border = Color(0xFFD6D3C8);
  static const dash = Color(0xFFB9B6AB);
  static const white = Colors.white;

  // status colours
  static const okBg = Color(0xFFE6F4EC);
  static const okFg = Color(0xFF17784A);
  static const okTxt = Color(0xFF10583A);
  static const waitBg = Color(0xFFFFF4CC);
  static const waitFg = Color(0xFF6B4F00);
  static const warnTxt = Color(0xFF5A4300);
  static const badBg = Color(0xFFFDECEC);
  static const badTxt = Color(0xFF7F1518);
  static const welcomeText = Color(0xFF3F4158);
  static const noteText = Color(0xFF3D2E00);
}

/// Plus Jakarta Sans text style.
TextStyle tx(double size, [FontWeight weight = FontWeight.w400, Color color = C.ink, double? height]) =>
    GoogleFonts.plusJakartaSans(fontSize: size, fontWeight: weight, color: color, height: height);

const w600 = FontWeight.w600;
const w700 = FontWeight.w700;
const w800 = FontWeight.w800;

ThemeData appTheme() => ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: C.bg,
      colorScheme: ColorScheme.fromSeed(seedColor: C.navy, primary: C.navy, surface: C.white),
      textTheme: GoogleFonts.plusJakartaSansTextTheme(),
      splashFactory: InkRipple.splashFactory,
      textSelectionTheme: const TextSelectionThemeData(cursorColor: C.navy, selectionHandleColor: C.navy),
    );
