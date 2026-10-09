import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class PolicyScreen extends StatefulWidget {
  final String initialPolicy; // 'privacyPolicy', 'termsConditions', 'refundPolicy', 'shippingPolicy'
  const PolicyScreen({super.key, this.initialPolicy = 'termsConditions'});

  @override
  State<PolicyScreen> createState() => _PolicyScreenState();
}

class _PolicyScreenState extends State<PolicyScreen> {
  final ApiService _apiService = ApiService();
  late String _activePolicyKey;
  Map<String, dynamic>? _policies;
  bool _isLoading = true;
  String? _errorMessage;

  final Map<String, String> _policyTitles = {
    'termsConditions': 'Terms & Conditions',
    'privacyPolicy': 'Privacy Policy',
    'shippingPolicy': 'Shipping & Delivery',
    'refundPolicy': 'Refund Policy',
  };

  @override
  void initState() {
    super.initState();
    _activePolicyKey = widget.initialPolicy;
    _fetchPolicies();
  }

  Future<void> _fetchPolicies() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final settings = await _apiService.getPublicSettings();
      if (mounted) {
        setState(() {
          _policies = settings['policies'] is Map
              ? Map<String, dynamic>.from(settings['policies'])
              : null;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Could not load policies from server. Please check connection.';
          _isLoading = false;
        });
      }
    }
  }

  String _getPolicyContent(String key) {
    if (_policies != null && _policies![key] != null && _policies![key].toString().trim().isNotEmpty) {
      return _policies![key].toString();
    }
    // Fallback standard text if not yet configured in admin settings
    switch (key) {
      case 'termsConditions':
        return 'Welcome to Rerendet Coffee. By using our application and placing an order, you agree to comply with and be bound by the terms and conditions outlined here.\n\n'
            '1. Orders & Pricing: All prices listed are in Kenyan Shillings (KES) inclusive of applicable taxes.\n\n'
            '2. Account Security: You are responsible for safeguarding your login credentials and two-factor verification codes.\n\n'
            '3. Freshness Guarantee: All coffee beans are fresh from the Rerendet Farm roasted in small batches to preserve aroma and quality.';
      case 'privacyPolicy':
        return 'At Rerendet Coffee, your privacy is of utmost priority. We collect customer information strictly for order processing, verification, and reliable shipment delivery.\n\n'
            '• Personal Data: We store your name, email, phone number, and delivery address.\n\n'
            '• Security: All communications are encrypted over TLS, and tokens are stored in secure on-device hardware keystores.\n\n'
            '• Third Parties: We do not sell or lease your personal information to third-party advertisers.';
      case 'shippingPolicy':
        return 'We deliver across Nairobi and all major counties throughout Kenya.\n\n'
            '• Delivery Timeline: Orders within Nairobi are dispatched within 24 hours. Countrywide deliveries take 24–48 hours via vetted courier partners.\n\n'
            '• Shipping Rates: Transparent standard delivery rates apply, with complimentary free shipping available above the order threshold.';
      case 'refundPolicy':
        return 'We stand by the quality of our farm-to-cup coffee.\n\n'
            '• Unopened Items: You may request a replacement or return within 7 days of delivery if the packaging is undamaged.\n\n'
            '• Damaged Orders: If your coffee package arrives punctured or damaged in transit, please notify our support within 24 hours with a photo for instant replacement.';
      default:
        return 'No details available.';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundCream,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: AppTheme.primaryGreen, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          _policyTitles[_activePolicyKey] ?? 'Store Rules',
          style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryGreen, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppTheme.primaryGreen),
            onPressed: _fetchPolicies,
          )
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Tabs Bar for Rules & Policies
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Row(
                  children: _policyTitles.entries.map((entry) {
                    final isSelected = _activePolicyKey == entry.key;
                    return GestureDetector(
                      onTap: () => setState(() => _activePolicyKey = entry.key),
                      child: Container(
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? AppTheme.primaryGreen : AppTheme.backgroundCream,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isSelected ? AppTheme.primaryGreen : AppTheme.borderColor,
                          ),
                        ),
                        child: Text(
                          entry.value,
                          style: TextStyle(
                            color: isSelected ? Colors.white : AppTheme.textMain,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),

            // Content Area
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryGreen))
                  : SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.all(20),
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(8),
                              blurRadius: 10,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.verified_user_outlined, color: AppTheme.primaryGreen, size: 24),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    _policyTitles[_activePolicyKey] ?? 'Policy',
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.primaryGreen,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const Divider(height: 24, thickness: 1, color: AppTheme.borderColor),
                            if (_errorMessage != null)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Text(
                                  _errorMessage!,
                                  style: const TextStyle(color: Colors.orange, fontSize: 12),
                                ),
                              ),
                            Text(
                              _getPolicyContent(_activePolicyKey),
                              style: const TextStyle(
                                fontSize: 14,
                                height: 1.6,
                                color: AppTheme.textMain,
                              ),
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
