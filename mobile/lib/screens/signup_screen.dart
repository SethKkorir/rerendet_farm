import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_state_provider.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import 'main_shell.dart';
import 'policy_screen.dart';

class SignUpScreen extends ConsumerStatefulWidget {
  const SignUpScreen({super.key});

  @override
  ConsumerState<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends ConsumerState<SignUpScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _agreeToTerms = false;
  bool _isLoading = false;
  final ApiService _apiService = ApiService();

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _handleSignUp() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_agreeToTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please agree to the Terms & Privacy Policy'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      final result = await _apiService.register(
        name: _nameController.text.trim(),
        email: _emailController.text.trim(),
        phone: _phoneController.text.trim(),
        password: _passwordController.text,
      );

      if (mounted) {
        setState(() => _isLoading = false);
        if (result['success'] == true) {
          await ref.read(authProvider.notifier).initAuth();
          if (mounted) {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (context) => const MainShell()),
            );
          }
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message']?.toString() ?? 'Registration failed'),
              backgroundColor: Colors.redAccent,
            ),
          );
        }
      }
    } on DioException catch (dioErr) {
      if (mounted) {
        setState(() => _isLoading = false);
        final serverMessage = dioErr.response?.data is Map
            ? dioErr.response?.data['message']?.toString()
            : null;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(serverMessage ?? dioErr.message ?? 'Failed to connect to registration server'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final settingsAsync = ref.watch(publicSettingsProvider);
    final logoUrl = ApiService.getStoreLogo(settingsAsync.value);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: AppTheme.backgroundCream,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new, color: AppTheme.primaryGreen, size: 20),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 8.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Logo & Header
                  Center(
                    child: Column(
                      children: [
                        if (logoUrl.isNotEmpty) ...[
                          Container(
                            width: 70,
                            height: 70,
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Image.network(
                                logoUrl,
                                fit: BoxFit.contain,
                                errorBuilder: (_, _, _) => const Icon(Icons.coffee, color: AppTheme.primaryGreen, size: 30),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                        ],
                        Text(
                          'Create Account',
                          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                color: AppTheme.primaryGreen,
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Join Rerendet Coffee for fresh farm delivery',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 30),

                  // Full Name Field
                  const Text('Full Name', style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textMain, fontSize: 14)),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _nameController,
                    textCapitalization: TextCapitalization.words,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                      hintText: 'John Doe',
                      prefixIcon: Icon(Icons.person_outline, color: AppTheme.textMuted),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) return 'Please enter your full name';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Email Field
                  const Text('Email Address', style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textMain, fontSize: 14)),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                      hintText: 'name@example.com',
                      prefixIcon: Icon(Icons.email_outlined, color: AppTheme.textMuted),
                    ),
                    validator: (value) {
                      if (value == null || !value.contains('@')) return 'Enter a valid email';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Phone Number Field
                  const Text('Phone Number', style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textMain, fontSize: 14)),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                      hintText: '+254 700 000 000',
                      prefixIcon: Icon(Icons.phone_outlined, color: AppTheme.textMuted),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Password Field
                  const Text('Password', style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textMain, fontSize: 14)),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    textInputAction: TextInputAction.next,
                    decoration: InputDecoration(
                      hintText: 'Min. 8 characters',
                      prefixIcon: const Icon(Icons.lock_outline, color: AppTheme.textMuted),
                      suffixIcon: IconButton(
                        icon: Icon(_obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: AppTheme.textMuted),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.length < 8) return 'Password must be at least 8 characters';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Confirm Password Field
                  const Text('Confirm Password', style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textMain, fontSize: 14)),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _confirmPasswordController,
                    obscureText: _obscureConfirmPassword,
                    textInputAction: TextInputAction.done,
                    decoration: InputDecoration(
                      hintText: 'Repeat password',
                      prefixIcon: const Icon(Icons.lock_outline, color: AppTheme.textMuted),
                      suffixIcon: IconButton(
                        icon: Icon(_obscureConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: AppTheme.textMuted),
                        onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                      ),
                    ),
                    validator: (value) {
                      if (value != _passwordController.text) return 'Passwords do not match';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Terms & Policies Checkbox
                  Row(
                    children: [
                      Checkbox(
                        value: _agreeToTerms,
                        activeColor: AppTheme.primaryGreen,
                        onChanged: (val) => setState(() => _agreeToTerms = val ?? false),
                      ),
                      Expanded(
                        child: Wrap(
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            const Text('I agree to the ', style: TextStyle(fontSize: 13, color: AppTheme.textMuted)),
                            GestureDetector(
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (context) => const PolicyScreen(initialPolicy: 'termsConditions')),
                                );
                              },
                              child: const Text(
                                'Terms & Conditions',
                                style: TextStyle(color: AppTheme.primaryGreen, fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                            ),
                            const Text(' & ', style: TextStyle(fontSize: 13, color: AppTheme.textMuted)),
                            GestureDetector(
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (context) => const PolicyScreen(initialPolicy: 'privacyPolicy')),
                                );
                              },
                              child: const Text(
                                'Privacy Policy',
                                style: TextStyle(color: AppTheme.primaryGreen, fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Sign Up Button
                  ElevatedButton(
                    onPressed: _isLoading ? null : _handleSignUp,
                    child: _isLoading
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Create Account'),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
