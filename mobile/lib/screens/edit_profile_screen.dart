import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../providers/app_state_provider.dart';
import '../theme/app_theme.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _phoneController;
  late TextEditingController _streetController;
  late TextEditingController _cityController;
  late TextEditingController _landmarkController;
  late TextEditingController _postalCodeController;
  late TextEditingController _mpesaPhoneController;

  String? _selectedGender;
  bool _isSaving = false;

  String? _cleanPhone(dynamic val) {
    if (val == null) return null;
    final str = val.toString().trim();
    if (str.isEmpty || str.contains(':') || str.length > 20) return null;
    if (RegExp(r'^\+?[0-9\s\-]{9,15}$').hasMatch(str)) {
      return str;
    }
    return null;
  }

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider).user;

    _firstNameController = TextEditingController(text: user?['firstName']?.toString() ?? '');
    _lastNameController = TextEditingController(text: user?['lastName']?.toString() ?? '');

    final shipping = user?['shippingInfo'] is Map ? user!['shippingInfo'] as Map : null;
    final wallet = user?['wallet'] is Map ? user!['wallet'] as Map : null;

    final phone = _cleanPhone(user?['phone']) ??
        _cleanPhone(shipping?['phone']) ??
        _cleanPhone(wallet?['mpesaPhone']);
    _phoneController = TextEditingController(text: phone ?? '');

    if (shipping != null) {
      _streetController = TextEditingController(
        text: (shipping['address'] ?? shipping['street'] ?? '').toString(),
      );
      _cityController = TextEditingController(
        text: (shipping['city'] ?? shipping['town'] ?? shipping['county'] ?? 'Nairobi').toString(),
      );
      _landmarkController = TextEditingController(
        text: (shipping['landmark'] ?? '').toString(),
      );
      _postalCodeController = TextEditingController(
        text: (shipping['zip'] ?? shipping['postalCode'] ?? '00100').toString(),
      );
    } else {
      _streetController = TextEditingController();
      _cityController = TextEditingController(text: 'Nairobi');
      _landmarkController = TextEditingController();
      _postalCodeController = TextEditingController(text: '00100');
    }

    final mpesaWallet = _cleanPhone(wallet?['mpesaPhone']);
    _mpesaPhoneController = TextEditingController(
      text: mpesaWallet ?? phone ?? '',
    );

    final rawGender = (user?['gender'] as String?)?.toLowerCase();
    if (['male', 'female', 'other'].contains(rawGender)) {
      _selectedGender = rawGender;
    } else {
      _selectedGender = 'prefer_not_to_say';
    }
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _streetController.dispose();
    _cityController.dispose();
    _landmarkController.dispose();
    _postalCodeController.dispose();
    _mpesaPhoneController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      final street = _streetController.text.trim();
      final city = _cityController.text.trim();
      final landmark = _landmarkController.text.trim();
      final postalCode = _postalCodeController.text.trim();
      final mpesaPhone = _mpesaPhoneController.text.trim();

      final payload = <String, dynamic>{
        'firstName': _firstNameController.text.trim(),
        'lastName': _lastNameController.text.trim(),
        'phone': _phoneController.text.trim(),
        'gender': _selectedGender,
        'shippingInfo': {
          'address': street,
          'street': street,
          'city': city,
          'town': city,
          'county': city,
          'country': 'Kenya',
          'landmark': landmark,
          'zip': postalCode.isNotEmpty ? postalCode : '00100',
        },
        'wallet': {
          'mpesaPhone': mpesaPhone.isNotEmpty ? mpesaPhone : _phoneController.text.trim(),
        }
      };

      await ref.read(authProvider.notifier).updateProfile(payload);

      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile updated successfully!'),
            backgroundColor: AppTheme.primaryGreen,
            duration: Duration(seconds: 3),
          ),
        );
        Navigator.pop(context);
      }
    } on DioException catch (dioErr) {
      if (mounted) {
        setState(() => _isSaving = false);
        final msg = dioErr.response?.data is Map
            ? dioErr.response?.data['message']?.toString()
            : null;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg ?? dioErr.message ?? 'Failed to update profile'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
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
    return Scaffold(
      backgroundColor: AppTheme.backgroundCream,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: AppTheme.primaryGreen, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Edit Profile',
          style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryGreen),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Personal Information Section
              _buildSectionCard(
                title: 'Personal Information',
                icon: Icons.person_outline,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('First Name', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textMain)),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _firstNameController,
                              decoration: const InputDecoration(hintText: 'First Name'),
                              validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Last Name', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textMain)),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _lastNameController,
                              decoration: const InputDecoration(hintText: 'Last Name'),
                              validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  const Text('Phone Number', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textMain)),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      hintText: 'e.g. 0712345678 or 254712345678',
                      prefixIcon: Icon(Icons.phone_outlined, color: AppTheme.primaryGreen, size: 20),
                    ),
                    validator: (val) {
                      if (val == null || val.trim().length < 9) return 'Enter a valid phone number';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  const Text('Gender', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textMain)),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    initialValue: _selectedGender,
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.transgender, color: AppTheme.primaryGreen, size: 20),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'male', child: Text('Male')),
                      DropdownMenuItem(value: 'female', child: Text('Female')),
                      DropdownMenuItem(value: 'other', child: Text('Other')),
                      DropdownMenuItem(value: 'prefer_not_to_say', child: Text('Prefer not to say')),
                    ],
                    onChanged: (val) => setState(() => _selectedGender = val),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Shipping Address Section
              _buildSectionCard(
                title: 'Default Shipping Address',
                icon: Icons.local_shipping_outlined,
                children: [
                  const Text('Street / Apartment / Estate', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textMain)),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _streetController,
                    decoration: const InputDecoration(
                      hintText: 'e.g. Kilimani, Rose Avenue, Apt 4B',
                      prefixIcon: Icon(Icons.location_on_outlined, color: AppTheme.primaryGreen, size: 20),
                    ),
                    validator: (val) => val == null || val.trim().isEmpty ? 'Address is required' : null,
                  ),
                  const SizedBox(height: 14),

                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('City / Town', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textMain)),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _cityController,
                              decoration: const InputDecoration(hintText: 'Nairobi'),
                              validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Postal Code', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textMain)),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _postalCodeController,
                              decoration: const InputDecoration(hintText: '00100'),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  const Text('Delivery Landmark / Gate Notes', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textMain)),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _landmarkController,
                    decoration: const InputDecoration(
                      hintText: 'e.g. Near Shell station / Ring bell on Gate 2',
                      prefixIcon: Icon(Icons.flag_outlined, color: AppTheme.primaryGreen, size: 20),
                    ),
                    validator: (val) => val == null || val.trim().isEmpty ? 'Landmark helps delivery riders find you' : null,
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Payment Preferences Section
              _buildSectionCard(
                title: 'Default M-Pesa Phone',
                icon: Icons.account_balance_wallet_outlined,
                children: [
                  const Text('Preferred M-Pesa Number for Checkout', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textMain)),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _mpesaPhoneController,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      hintText: '07XXXXXXXX',
                      prefixIcon: Icon(Icons.phone_android, color: Color(0xFF00A34E), size: 20),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Save Button
              ElevatedButton(
                onPressed: _isSaving ? null : _handleSave,
                child: _isSaving
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                      )
                    : const Text('Save Profile Changes'),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(6),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.primaryGreen.withAlpha(20),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: AppTheme.primaryGreen, size: 20),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: AppTheme.textMain,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(height: 1, color: AppTheme.borderColor),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }
}
