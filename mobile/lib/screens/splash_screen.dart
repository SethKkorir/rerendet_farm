import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_state_provider.dart';
import '../services/api_service.dart';
import 'onboarding_screen.dart';
import '../theme/app_theme.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    // Auto navigate after 2.5 seconds
    Future.delayed(const Duration(milliseconds: 2500), () {
      if (mounted) {
        _navigateNext();
      }
    });
  }

  void _navigateNext() {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const OnboardingScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final settingsAsync = ref.watch(publicSettingsProvider);
    final logoUrl = ApiService.getStoreLogo(settingsAsync.value);
    final isMaintenance = settingsAsync.value?['maintenance']?['enabled'] == true;
    final maintenanceMsg = settingsAsync.value?['maintenance']?['message']?.toString();

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: AppTheme.primaryGreen,
        body: GestureDetector(
          onTap: _navigateNext,
          child: Container(
            width: double.infinity,
            height: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xFF0F3923),
                  Color(0xFF1B4D3E),
                ],
              ),
            ),
            child: SafeArea(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Spacer(),
                  if (isMaintenance) ...[
                    Container(
                      margin: const EdgeInsets.symmetric(horizontal: 24),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade900.withAlpha(200),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 28),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              maintenanceMsg ?? 'System undergoing scheduled maintenance.',
                              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Logo (from backend or branded frame)
                  if (logoUrl.isNotEmpty) ...[
                    Container(
                      width: 110,
                      height: 110,
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withAlpha(30),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Image.network(
                          logoUrl,
                          fit: BoxFit.contain,
                          errorBuilder: (_, _, _) => _buildFallbackBadge(),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'RERENDET COFFEE',
                      style: TextStyle(
                        fontFamily: 'serif',
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: 3,
                      ),
                    ),
                  ] else ...[
                    _buildFallbackBadge(),
                  ],

                  const SizedBox(height: 30),
                  const Text(
                    'Premium Kenyan Coffee\nFrom Farm to Cup',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 18,
                      fontStyle: FontStyle.italic,
                      color: Colors.white,
                      height: 1.4,
                    ),
                  ),
                  const Spacer(),
                  // Bottom indicator line
                  Container(
                    width: 120,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFallbackBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.white, width: 2),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: const [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.coffee, color: Colors.white, size: 28),
              SizedBox(width: 8),
              Text(
                'RERENDET',
                style: TextStyle(
                  fontFamily: 'serif',
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  letterSpacing: 3,
                ),
              ),
            ],
          ),
          SizedBox(height: 4),
          Text(
            'COFFEE',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: Colors.white70,
              letterSpacing: 6,
            ),
          ),
        ],
      ),
    );
  }
}
