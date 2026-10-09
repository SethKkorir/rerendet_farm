import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../providers/app_state_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class SecuritySettingsScreen extends ConsumerStatefulWidget {
  const SecuritySettingsScreen({super.key});

  @override
  ConsumerState<SecuritySettingsScreen> createState() => _SecuritySettingsScreenState();
}

class _SecuritySettingsScreenState extends ConsumerState<SecuritySettingsScreen> {
  final ApiService _apiService = ApiService();

  // Change Password Form
  final _passwordFormKey = GlobalKey<FormState>();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _isChangingPassword = false;
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _showToggle2FADialog(bool currentStatus) {
    final passwordController = TextEditingController();
    bool isSubmitting = false;
    String? localError;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (modalContext, setModalState) {
            final bottomInset = MediaQuery.of(modalContext).viewInsets.bottom;

            return Container(
              margin: EdgeInsets.only(bottom: bottomInset),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              ),
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 44,
                        height: 5,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: currentStatus ? Colors.amber.shade50 : AppTheme.primaryGreen.withAlpha(25),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            currentStatus ? Icons.shield_outlined : Icons.verified_user_outlined,
                            color: currentStatus ? Colors.amber.shade900 : AppTheme.primaryGreen,
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          currentStatus ? 'Disable 2-Factor Auth' : 'Enable 2-Factor Auth',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.textMain),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      currentStatus
                          ? 'Disabling 2FA reduces the security layer on your account. Please enter your password to confirm.'
                          : 'Enabling 2FA adds an extra security layer. A one-time verification code will be sent to your email whenever you log in.',
                      style: const TextStyle(fontSize: 13, color: AppTheme.textMuted, height: 1.4),
                    ),
                    const SizedBox(height: 20),
                    if (localError != null) ...[
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red.shade200),
                        ),
                        child: Text(localError!, style: TextStyle(color: Colors.red.shade800, fontSize: 13)),
                      ),
                      const SizedBox(height: 14),
                    ],
                    TextFormField(
                      controller: passwordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'Your Current Password',
                        prefixIcon: Icon(Icons.lock_outline, color: AppTheme.primaryGreen),
                        hintText: 'Enter password to confirm',
                      ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(modalContext),
                            child: const Text('Cancel'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: isSubmitting
                                ? null
                                : () async {
                                    final pass = passwordController.text.trim();
                                    if (pass.isEmpty) {
                                      setModalState(() => localError = 'Password is required');
                                      return;
                                    }
                                    setModalState(() {
                                      isSubmitting = true;
                                      localError = null;
                                    });

                                    try {
                                      await ref.read(authProvider.notifier).toggle2FA(
                                            enabled: !currentStatus,
                                            password: pass,
                                          );
                                      if (modalContext.mounted) {
                                        Navigator.pop(modalContext);
                                      }
                                      if (mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: Text(
                                              !currentStatus
                                                  ? 'Two-Factor Authentication is now ENABLED! 🛡️'
                                                  : 'Two-Factor Authentication has been disabled.',
                                            ),
                                            backgroundColor: AppTheme.primaryGreen,
                                          ),
                                        );
                                      }
                                    } on DioException catch (dioErr) {
                                      final msg = dioErr.response?.data is Map ? dioErr.response?.data['message']?.toString() : null;
                                      setModalState(() {
                                        isSubmitting = false;
                                        localError = msg ?? 'Incorrect password or request failed';
                                      });
                                    } catch (e) {
                                      setModalState(() {
                                        isSubmitting = false;
                                        localError = 'Error: ${e.toString()}';
                                      });
                                    }
                                  },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: currentStatus ? Colors.red.shade700 : AppTheme.primaryGreen,
                            ),
                            child: isSubmitting
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                  )
                                : Text(currentStatus ? 'Confirm Disable' : 'Enable 2FA'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _handleChangePassword() async {
    if (!_passwordFormKey.currentState!.validate()) return;

    setState(() => _isChangingPassword = true);

    try {
      await _apiService.changePassword(
        currentPassword: _currentPasswordController.text.trim(),
        newPassword: _newPasswordController.text.trim(),
      );

      if (mounted) {
        setState(() => _isChangingPassword = false);
        _currentPasswordController.clear();
        _newPasswordController.clear();
        _confirmPasswordController.clear();

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Password changed successfully! Please keep it secure.'),
            backgroundColor: AppTheme.primaryGreen,
          ),
        );
      }
    } on DioException catch (dioErr) {
      if (mounted) {
        setState(() => _isChangingPassword = false);
        final msg = dioErr.response?.data is Map ? dioErr.response?.data['message']?.toString() : null;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg ?? 'Password update failed'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isChangingPassword = false);
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
    final user = ref.watch(authProvider).user;
    final is2FAEnabled = user?['twoFactorEnabled'] == true;

    return Scaffold(
      backgroundColor: AppTheme.backgroundCream,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: AppTheme.primaryGreen, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Account Security & 2FA', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryGreen)),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 2FA Security Shield Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 10, offset: const Offset(0, 2)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: is2FAEnabled ? Colors.green.shade50 : Colors.amber.shade50,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          is2FAEnabled ? Icons.verified_user : Icons.gpp_maybe_outlined,
                          color: is2FAEnabled ? Colors.green.shade700 : Colors.amber.shade900,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Two-Step Verification',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textMain),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              is2FAEnabled ? 'Optimal Protection Active' : 'Basic Security Layer',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: is2FAEnabled ? Colors.green.shade700 : Colors.amber.shade900,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Switch.adaptive(
                        value: is2FAEnabled,
                        activeTrackColor: AppTheme.primaryGreen,
                        onChanged: (val) => _showToggle2FADialog(is2FAEnabled),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Divider(height: 1, thickness: 1, color: AppTheme.borderColor),
                  const SizedBox(height: 12),
                  Text(
                    is2FAEnabled
                        ? 'Your account is protected. Every time you log in, a 6-digit confirmation code is required to ensure only you can access your profile, wallet, and orders.'
                        : 'Protect your account from unauthorized sign-ins. When enabled, a verification code will be sent to your email whenever you log in.',
                    style: const TextStyle(fontSize: 13, color: AppTheme.textMuted, height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Change Password Section
            const Text(
              'Change Account Password',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textMain),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 10, offset: const Offset(0, 2)),
                ],
              ),
              child: Form(
                key: _passwordFormKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextFormField(
                      controller: _currentPasswordController,
                      obscureText: _obscureCurrent,
                      decoration: InputDecoration(
                        labelText: 'Current Password',
                        prefixIcon: const Icon(Icons.lock_outline, color: AppTheme.primaryGreen),
                        suffixIcon: IconButton(
                          icon: Icon(_obscureCurrent ? Icons.visibility_off : Icons.visibility, color: AppTheme.textMuted),
                          onPressed: () => setState(() => _obscureCurrent = !_obscureCurrent),
                        ),
                      ),
                      validator: (val) => val == null || val.isEmpty ? 'Current password is required' : null,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _newPasswordController,
                      obscureText: _obscureNew,
                      decoration: InputDecoration(
                        labelText: 'New Password',
                        prefixIcon: const Icon(Icons.lock_reset, color: AppTheme.primaryGreen),
                        suffixIcon: IconButton(
                          icon: Icon(_obscureNew ? Icons.visibility_off : Icons.visibility, color: AppTheme.textMuted),
                          onPressed: () => setState(() => _obscureNew = !_obscureNew),
                        ),
                      ),
                      validator: (val) {
                        if (val == null || val.length < 6) return 'Password must be at least 6 characters';
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _confirmPasswordController,
                      obscureText: _obscureConfirm,
                      decoration: InputDecoration(
                        labelText: 'Confirm New Password',
                        prefixIcon: const Icon(Icons.lock_reset, color: AppTheme.primaryGreen),
                        suffixIcon: IconButton(
                          icon: Icon(_obscureConfirm ? Icons.visibility_off : Icons.visibility, color: AppTheme.textMuted),
                          onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                        ),
                      ),
                      validator: (val) {
                        if (val != _newPasswordController.text) return 'Passwords do not match';
                        return null;
                      },
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isChangingPassword ? null : _handleChangePassword,
                        child: _isChangingPassword
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Text('Update Password'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Security Best Practices
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primaryGreen.withAlpha(12),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.primaryGreen.withAlpha(40)),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline, color: AppTheme.primaryGreen, size: 20),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Rerendet Coffee uses TLS encryption, encrypted phone records, and anti-CSRF shields to protect your data and payment credentials.',
                      style: TextStyle(fontSize: 12, color: AppTheme.textMain, height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
