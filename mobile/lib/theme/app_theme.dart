import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Rerendet Coffee Brand Colors
  static const Color primaryGreen = Color(0xFF0F3923);
  static const Color darkGreen = Color(0xFF1B4D3E);
  static const Color lightGreenBg = Color(0xFFE8F0EC);
  static const Color backgroundCream = Color(0xFFF8F6F2);
  static const Color surfaceWhite = Colors.white;
  static const Color accentGold = Color(0xFFC5A059);
  
  static const Color textMain = Color(0xFF1E1E1E);
  static const Color textMuted = Color(0xFF6B7280);
  static const Color borderColor = Color(0xFFE2E8F0);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: backgroundCream,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryGreen,
        primary: primaryGreen,
        secondary: accentGold,
        surface: surfaceWhite,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryGreen,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
          elevation: 0,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: borderColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primaryGreen, width: 2),
        ),
        hintStyle: GoogleFonts.inter(color: textMuted, fontSize: 14),
        labelStyle: GoogleFonts.inter(color: textMain, fontSize: 14),
      ),
    );
  }
}
