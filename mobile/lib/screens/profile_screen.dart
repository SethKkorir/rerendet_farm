import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_state_provider.dart';
import '../theme/app_theme.dart';
import 'login_screen.dart';
import 'orders_history_screen.dart';
import 'policy_screen.dart';
import 'edit_profile_screen.dart';
import 'security_settings_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final firstName = user?['firstName']?.toString() ?? 'Coffee';
    final lastName = user?['lastName']?.toString() ?? 'Lover';
    final fullName = '$firstName $lastName'.trim();
    final email = user?['email']?.toString() ?? 'customer@rerendet.com';
    final rawPhone = user?['phone']?.toString();
    final phone = (rawPhone != null && !rawPhone.contains(':') && rawPhone.length <= 20)
        ? rawPhone
        : (user?['shippingInfo'] is Map && user!['shippingInfo']['phone'] != null && !user['shippingInfo']['phone'].toString().contains(':'))
            ? user['shippingInfo']['phone'].toString()
            : null;
    final profilePic = user?['profilePicture']?.toString();

    return Scaffold(
      backgroundColor: AppTheme.backgroundCream,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Profile', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.textMain)),
              const SizedBox(height: 20),

              // User Info Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 8, offset: const Offset(0, 2)),
                  ],
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 30,
                      backgroundColor: AppTheme.primaryGreen.withAlpha(40),
                      backgroundImage: (profilePic != null && profilePic.isNotEmpty)
                          ? NetworkImage(profilePic)
                          : const NetworkImage(
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
                            ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(fullName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textMain)),
                          const SizedBox(height: 4),
                          Text(email, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                          if (phone != null && phone.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(phone, style: const TextStyle(color: AppTheme.primaryGreen, fontSize: 12, fontWeight: FontWeight.w600)),
                          ],
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.edit_outlined, color: AppTheme.primaryGreen),
                      tooltip: 'Edit Profile',
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const EditProfileScreen()),
                        );
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Menu Options
              _buildMenuItem(
                Icons.person_outline,
                'Personal Profile & Address',
                'Update name, phone, and delivery locations',
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const EditProfileScreen()),
                  );
                },
              ),
              _buildMenuItem(
                Icons.receipt_long_outlined,
                'My Orders & Receipts',
                'Track deliveries, re-order, and view invoices',
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const OrdersHistoryScreen()),
                  );
                },
              ),
              _buildMenuItem(
                Icons.security_outlined,
                'Security & 2-Step Verification',
                user?['twoFactorEnabled'] == true
                    ? '2FA Active • Optimal account protection'
                    : 'Enable 2FA & manage password',
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const SecuritySettingsScreen()),
                  );
                },
                trailingBadge: user?['twoFactorEnabled'] == true ? '2FA ON' : 'RECOMMENDED',
                badgeColor: user?['twoFactorEnabled'] == true ? Colors.green.shade700 : AppTheme.accentGold,
              ),
              _buildMenuItem(
                Icons.policy_outlined,
                'Store Policies & Rules',
                'Terms, Privacy, Delivery & Refunds',
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const PolicyScreen()),
                  );
                },
              ),
              _buildMenuItem(
                Icons.help_outline,
                'Help & Support',
                'Contact Rerendet farm customer service',
                () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Support Line: +254 700 000 000 | Email: support@rerendet.coffee'),
                      backgroundColor: AppTheme.primaryGreen,
                    ),
                  );
                },
              ),
              const SizedBox(height: 12),

              // Logout Button
              GestureDetector(
                onTap: () async {
                  await ref.read(authProvider.notifier).logout();
                  if (context.mounted) {
                    Navigator.pushAndRemoveUntil(
                      context,
                      MaterialPageRoute(builder: (context) => const LoginScreen()),
                      (route) => false,
                    );
                  }
                },
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.red.withAlpha(15),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Row(
                    children: const [
                      Icon(Icons.logout, color: Colors.redAccent),
                      SizedBox(width: 16),
                      Text('Sign Out', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 15)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMenuItem(
    IconData icon,
    String title,
    String subtitle,
    VoidCallback onTap, {
    String? trailingBadge,
    Color? badgeColor,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: Colors.black.withAlpha(5), blurRadius: 4, offset: const Offset(0, 2)),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppTheme.backgroundCream,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: AppTheme.primaryGreen, size: 22),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textMain)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                ],
              ),
            ),
            if (trailingBadge != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: (badgeColor ?? AppTheme.primaryGreen).withAlpha(25),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  trailingBadge,
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: badgeColor ?? AppTheme.primaryGreen),
                ),
              ),
              const SizedBox(width: 8),
            ],
            const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textMuted),
          ],
        ),
      ),
    );
  }
}
