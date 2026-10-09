import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_state_provider.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import 'signup_screen.dart';
import 'main_shell.dart';
import 'policy_screen.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _codeController = TextEditingController();

  bool _obscurePassword = true;
  bool _isLoading = false;
  bool _requires2FA = false;
  final ApiService _apiService = ApiService();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    try {
      if (_requires2FA) {
        final code = _codeController.text.trim();
        final result = await _apiService.verify2FA(email, code);

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
                content: Text(result['message']?.toString() ?? 'Invalid verification code'),
                backgroundColor: Colors.redAccent,
              ),
            );
          }
        }
      } else {
        final result = await _apiService.login(email, password);

        if (mounted) {
          setState(() => _isLoading = false);
          if (result['requires2FA'] == true) {
            setState(() => _requires2FA = true);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Verification code sent to your email'),
                backgroundColor: AppTheme.primaryGreen,
              ),
            );
          } else if (result['success'] == true) {
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
                content: Text(result['message']?.toString() ?? 'Login failed'),
                backgroundColor: Colors.redAccent,
              ),
            );
          }
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
            content: Text(serverMessage ?? dioErr.message ?? 'Network error connecting to backend'),
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
    final storeName = settingsAsync.value?['store']?['name']?.toString() ?? 'Rerendet Coffee';

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: AppTheme.backgroundCream,
        body: SafeArea(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 20),
                  // Logo from Backend or fallback
                  Center(
                    child: Column(
                      children: [
                        if (logoUrl.isNotEmpty) ...[
                          Container(
                            width: 80,
                            height: 80,
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withAlpha(20),
                                  blurRadius: 10,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(14),
                              child: Image.network(
                                logoUrl,
                                fit: BoxFit.contain,
                                errorBuilder: (_, _, _) => const Icon(Icons.coffee, color: AppTheme.primaryGreen, size: 36),
                              ),
                            ),
                          ),
                        ] else ...[
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryGreen,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Icon(Icons.coffee, color: Colors.white, size: 36),
                          ),
                        ],
                        const SizedBox(height: 16),
                        Text(
                          _requires2FA ? 'Verify Identity' : 'Welcome back',
                          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                color: AppTheme.primaryGreen,
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _requires2FA
                              ? 'Enter the 6-digit code sent to your email'
                              : 'Sign in to your $storeName account',
                          style: Theme.of(context).textTheme.bodyMedium,
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 36),

                  if (!_requires2FA) ...[
                    // Email Field
                    const Text(
                      'Email address',
                      style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textMain, fontSize: 14),
                    ),
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
                        if (value == null || value.isEmpty || !value.contains('@')) {
                          return 'Please enter a valid email address';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 20),

                    // Password Field
                    const Text(
                      'Password',
                      style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textMain, fontSize: 14),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _handleLogin(),
                      decoration: InputDecoration(
                        hintText: '••••••••',
                        prefixIcon: const Icon(Icons.lock_outline, color: AppTheme.textMuted),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                            color: AppTheme.textMuted,
                          ),
                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        ),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please enter your password';
                        }
                        return null;
                      },
                    ),
                  ] else ...[
                    // 2FA Code Field
                    const Text(
                      'Verification Code',
                      style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textMain, fontSize: 14),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _codeController,
                      keyboardType: TextInputType.number,
                      textInputAction: TextInputAction.done,
                      maxLength: 6,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 24, letterSpacing: 8, fontWeight: FontWeight.bold),
                      decoration: const InputDecoration(
                        hintText: '000000',
                        counterText: '',
                        prefixIcon: Icon(Icons.security, color: AppTheme.primaryGreen),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().length < 4) {
                          return 'Enter valid code';
                        }
                        return null;
                      },
                    ),
                  ],

                  const SizedBox(height: 28),

                  // Login / Verify Button
                  ElevatedButton(
                    onPressed: _isLoading ? null : _handleLogin,
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : Text(_requires2FA ? 'Verify & Continue' : 'Sign In'),
                  ),

                  if (_requires2FA) ...[
                    const SizedBox(height: 12),
                    Center(
                      child: TextButton(
                        onPressed: () => setState(() => _requires2FA = false),
                        child: const Text('Back to login', style: TextStyle(color: AppTheme.textMuted)),
                      ),
                    ),
                  ],

                  const SizedBox(height: 30),

                  // Don't have an account? Sign Up
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        "Don't have an account? ",
                        style: TextStyle(color: AppTheme.textMuted, fontSize: 14),
                      ),
                      GestureDetector(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const SignUpScreen()),
                          );
                        },
                        child: const Text(
                          'Sign Up',
                          style: TextStyle(
                            color: AppTheme.primaryGreen,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Rules & Terms link
                  Center(
                    child: GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const PolicyScreen(initialPolicy: 'termsConditions')),
                        );
                      },
                      child: const Text(
                        'Terms & Store Rules',
                        style: TextStyle(
                          color: AppTheme.textMuted,
                          fontSize: 12,
                          decoration: TextDecoration.underline,
                        ),
                      ),
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
}
