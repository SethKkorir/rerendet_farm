import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_theme.dart';
import '../providers/app_state_provider.dart';
import '../services/api_service.dart';
import 'login_screen.dart';

class OnboardingItem {
  final String title;
  final String description;
  final String imageUrl;

  OnboardingItem({
    required this.title,
    required this.description,
    required this.imageUrl,
  });
}

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentIndex = 0;

  final List<OnboardingItem> _items = [
    OnboardingItem(
      title: 'From the Heart\nof Rerendet',
      description: 'Authentic Kenyan coffee, grown by our farmers, with a passion for quality and community.',
      imageUrl: 'https://images.unsplash.com/photo-1595925341270-984e7233857e?q=80&w=1000&auto=format&fit=crop',
    ),
    OnboardingItem(
      title: 'Grown With Care',
      description: 'Naturally nurtured, carefully harvested and expertly processed to preserve its rich flavour and aroma.',
      imageUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=1000&auto=format&fit=crop',
    ),
    OnboardingItem(
      title: 'A Cup Like No Other',
      description: 'Bold flavour. Smooth finish. Pure Kenyan coffee. A taste you\'ll always come back to.',
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1000&auto=format&fit=crop',
    ),
  ];

  void _onNext() {
    if (_currentIndex < _items.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      _navigateToLogin();
    }
  }

  void _navigateToLogin() {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: AppTheme.primaryGreen,
        body: Stack(
          children: [
            // Background Image (Top Half)
            PageView.builder(
              controller: _pageController,
              onPageChanged: (index) {
                setState(() {
                  _currentIndex = index;
                });
              },
              itemCount: _items.length,
              itemBuilder: (context, index) {
                return Image.network(
                  _items[index].imageUrl,
                  fit: BoxFit.cover,
                  height: MediaQuery.of(context).size.height * 0.6,
                  width: double.infinity,
                  errorBuilder: (context, error, stackTrace) => Container(
                    color: AppTheme.primaryGreen,
                    child: const Center(
                      child: Icon(Icons.coffee, size: 80, color: Colors.white24),
                    ),
                  ),
                );
              },
            ),

            // Top Bar with Rerendet Logo
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.black.withAlpha(120),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Image.network(
                              ApiService.getStoreLogo(ref.watch(publicSettingsProvider).value),
                              width: 26,
                              height: 26,
                              fit: BoxFit.contain,
                              errorBuilder: (_, _, _) => const Icon(Icons.coffee, color: Colors.white, size: 18),
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            'RERENDET',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                              letterSpacing: 1.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: _navigateToLogin,
                      child: const Text('Skip', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            ),

            // Bottom White Curved Container
            Align(
              alignment: Alignment.bottomCenter,
              child: Container(
                height: MediaQuery.of(context).size.height * 0.46,
                width: double.infinity,
                decoration: const BoxDecoration(
                  color: AppTheme.backgroundCream,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(32),
                    topRight: Radius.circular(32),
                  ),
                ),
                padding: const EdgeInsets.only(left: 24.0, right: 24.0, top: 28.0, bottom: 24.0),
                child: SafeArea(
                  top: false,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Title
                          Text(
                            _items[_currentIndex].title,
                            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                  fontSize: 28,
                                  height: 1.2,
                                  color: AppTheme.primaryGreen,
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          const SizedBox(height: 14),
                          // Description
                          Text(
                            _items[_currentIndex].description,
                            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                  color: AppTheme.textMuted,
                                  height: 1.5,
                                  fontSize: 15,
                                ),
                          ),
                        ],
                      ),

                      // Indicator Dots & Navigation Buttons
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          // Back or Skip button
                          _currentIndex > 0
                              ? TextButton(
                                  onPressed: () {
                                    _pageController.previousPage(
                                      duration: const Duration(milliseconds: 300),
                                      curve: Curves.easeInOut,
                                    );
                                  },
                                  child: const Text(
                                    'Back',
                                    style: TextStyle(
                                      color: AppTheme.primaryGreen,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 16,
                                    ),
                                  ),
                                )
                              : TextButton(
                                  onPressed: _navigateToLogin,
                                  child: const Text(
                                    'Skip',
                                    style: TextStyle(
                                      color: AppTheme.textMuted,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 16,
                                    ),
                                  ),
                                ),

                          // Dots Indicator
                          Row(
                            children: List.generate(
                              _items.length,
                              (index) => AnimatedContainer(
                                duration: const Duration(milliseconds: 250),
                                margin: const EdgeInsets.symmetric(horizontal: 4),
                                width: _currentIndex == index ? 22 : 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: _currentIndex == index
                                      ? AppTheme.primaryGreen
                                      : AppTheme.borderColor,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                            ),
                          ),

                          // Next / Get Started Button
                          ElevatedButton(
                            onPressed: _onNext,
                            style: ElevatedButton.styleFrom(
                              minimumSize: const Size(110, 48),
                              backgroundColor: AppTheme.primaryGreen,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(24),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  _currentIndex == _items.length - 1 ? 'Get Started' : 'Next',
                                  style: const TextStyle(fontSize: 14, color: Colors.white),
                                ),
                                if (_currentIndex < _items.length - 1) ...[
                                  const SizedBox(width: 4),
                                  const Icon(Icons.arrow_forward, size: 16, color: Colors.white),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
