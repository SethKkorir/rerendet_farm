import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_state_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'order_tracking_screen.dart';
import 'policy_screen.dart';
import 'edit_profile_screen.dart';
import '../widgets/mpesa_payment_modal.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  final int totalAmount;
  const CheckoutScreen({super.key, required this.totalAmount});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final ApiService _apiService = ApiService();

  final _phoneController = TextEditingController();
  final _streetController = TextEditingController();
  final _cityController = TextEditingController(text: 'Nairobi');
  final _landmarkController = TextEditingController();

  String _selectedPaymentMethod = 'mpesa';
  bool _isLoading = false;

  String? _cleanPhone(dynamic val) {
    if (val == null) return null;
    final str = val.toString().trim();
    if (str.isEmpty || str.contains(':') || str.length > 20) return null;
    if (RegExp(r'^\+?[0-9\s\-]{9,15}$').hasMatch(str)) {
      return str;
    }
    return null;
  }

  void _populateFromUser(Map<String, dynamic>? user, {bool forceOverwrite = false}) {
    if (user == null) return;

    final phone = _cleanPhone(user['phone']) ??
        _cleanPhone(user['wallet'] is Map ? user['wallet']['mpesaPhone'] : null) ??
        _cleanPhone(user['shippingInfo'] is Map ? user['shippingInfo']['phone'] : null);
    if (phone != null && (_phoneController.text.isEmpty || forceOverwrite)) {
      _phoneController.text = phone;
    }

    final shipping = (user['shippingInfo'] is Map ? user['shippingInfo'] : null) ??
        (user['shippingAddress'] is Map ? user['shippingAddress'] : null);

    if (shipping is Map) {
      final street = (shipping['address'] ?? shipping['street'] ?? '').toString().trim();
      if (street.isNotEmpty && (_streetController.text.isEmpty || forceOverwrite)) {
        _streetController.text = street;
      }

      final city = (shipping['city'] ?? shipping['town'] ?? shipping['county'] ?? '').toString().trim();
      if (city.isNotEmpty && (_cityController.text.isEmpty || _cityController.text == 'Nairobi' || forceOverwrite)) {
        _cityController.text = city;
      }

      final landmark = (shipping['landmark'] ?? '').toString().trim();
      if (landmark.isNotEmpty && (_landmarkController.text.isEmpty || forceOverwrite)) {
        _landmarkController.text = landmark;
      }
    }
  }

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider).user;
    if (user != null) {
      _populateFromUser(user, forceOverwrite: true);
    }
    Future.microtask(() async {
      try {
        final freshUser = await _apiService.getCurrentUser();
        if (freshUser != null && mounted) {
          _populateFromUser(freshUser, forceOverwrite: _streetController.text.isEmpty);
        }
      } catch (_) {}
    });
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _streetController.dispose();
    _cityController.dispose();
    _landmarkController.dispose();
    super.dispose();
  }

  Future<void> _handlePayment() async {
    if (!_formKey.currentState!.validate()) return;

    final cartItems = ref.read(cartProvider);
    if (cartItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Your cart is empty.')),
      );
      return;
    }

    final user = ref.read(authProvider).user;
    final userEmail = user?['email']?.toString() ?? 'customer@rerendet.com';
    final userName = user?['firstName']?.toString() ?? 'Valued Customer';

    setState(() => _isLoading = true);

    try {
      // 1. Prepare items payload according to backend schema
      final itemsPayload = cartItems.map((item) {
        return {
          'product': item.productId,
          'name': item.name,
          'price': item.price,
          'quantity': item.quantity,
          'size': item.size,
        };
      }).toList();

      // 2. Prepare shipping address payload
      final streetAddress = _streetController.text.trim();
      final cityName = _cityController.text.trim();
      final shippingPayload = {
        'firstName': userName,
        'lastName': user?['lastName']?.toString() ?? '.',
        'email': userEmail,
        'phone': _phoneController.text.trim(),
        'address': streetAddress,
        'street': streetAddress,
        'city': cityName,
        'town': cityName,
        'county': cityName,
        'country': 'Kenya',
        'postalCode': '00100',
        'landmark': _landmarkController.text.trim(),
      };

      // 3. Create Order on Backend
      final orderRes = await _apiService.createOrder({
        'items': itemsPayload,
        'shippingAddress': shippingPayload,
        'paymentMethod': _selectedPaymentMethod,
      });

      final orderData = orderRes['data'] is Map ? orderRes['data'] : orderRes;
      final orderId = orderData['_id']?.toString() ?? orderData['id']?.toString() ?? '';
      final orderNumber = orderData['orderNumber']?.toString() ?? '';

      setState(() => _isLoading = false);

      // 4. If M-Pesa is selected, show interactive STK Push Waiting Modal
      if (_selectedPaymentMethod == 'mpesa' && orderId.isNotEmpty) {
        if (!mounted) return;
        await MpesaPaymentModal.show(
          context: context,
          orderId: orderId,
          orderNumber: orderNumber,
          totalAmount: widget.totalAmount,
          phoneNumber: _phoneController.text.trim(),
          onPaymentSuccess: () {
            ref.read(cartProvider.notifier).clearCart();
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (context) => OrderTrackingScreen(
                  totalAmount: widget.totalAmount,
                  orderId: orderId,
                  orderNumber: orderNumber,
                ),
              ),
            );
          },
          onCancel: () {
            ref.read(cartProvider.notifier).clearCart();
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (context) => OrderTrackingScreen(
                  totalAmount: widget.totalAmount,
                  orderId: orderId,
                  orderNumber: orderNumber,
                ),
              ),
            );
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  orderNumber.isNotEmpty
                      ? 'Order #$orderNumber created! Track status or pay anytime.'
                      : 'Order created! Track status or pay anytime.',
                ),
                backgroundColor: AppTheme.primaryGreen,
              ),
            );
          },
        );
        return;
      }

      // 5. If COD or other payment method, clear cart & navigate
      ref.read(cartProvider.notifier).clearCart();

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => OrderTrackingScreen(
              totalAmount: widget.totalAmount,
              orderId: orderId,
              orderNumber: orderNumber,
            ),
          ),
        );
      }
    } on DioException catch (dioErr) {
      if (mounted) {
        setState(() => _isLoading = false);
        final msg = dioErr.response?.data is Map ? dioErr.response?.data['message']?.toString() : null;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg ?? dioErr.message ?? 'Checkout failed'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authProvider, (previous, next) {
      if (next.user != null) {
        _populateFromUser(next.user, forceOverwrite: true);
      }
    });

    return Scaffold(
      backgroundColor: AppTheme.backgroundCream,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: AppTheme.primaryGreen, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Checkout', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryGreen)),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Contact / Phone Section
              const Text('Phone Number (M-Pesa)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textMain)),
              const SizedBox(height: 8),
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  hintText: 'e.g. 0712345678 or 254712345678',
                  prefixIcon: Icon(Icons.phone_outlined, color: AppTheme.primaryGreen),
                ),
                validator: (val) {
                  if (val == null || val.trim().length < 9) return 'Enter valid phone number';
                  return null;
                },
              ),
              const SizedBox(height: 20),

              // Delivery Address Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Delivery Street & Area', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textMain)),
                  TextButton.icon(
                    onPressed: () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const EditProfileScreen()),
                      );
                    },
                    icon: const Icon(Icons.edit_outlined, size: 14, color: AppTheme.accentGold),
                    label: const Text('Edit in Profile', style: TextStyle(color: AppTheme.accentGold, fontSize: 13, fontWeight: FontWeight.bold)),
                    style: TextButton.styleFrom(visualDensity: VisualDensity.compact, padding: EdgeInsets.zero),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _streetController,
                decoration: const InputDecoration(
                  hintText: 'Street / Apartment / Estate name',
                  prefixIcon: Icon(Icons.location_on_outlined, color: AppTheme.primaryGreen),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Street address is required';
                  return null;
                },
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
                          validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Landmark', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textMain)),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _landmarkController,
                          decoration: const InputDecoration(hintText: 'Near Shell / Gate 4'),
                          validator: (val) {
                            if (val == null || val.trim().isEmpty) return 'Landmark required';
                            return null;
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Payment Method
              const Text('Payment Method', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textMain)),
              const SizedBox(height: 12),
              _buildPaymentOption(
                id: 'mpesa',
                title: 'M-Pesa Express (STK Push)',
                subtitle: 'Enter PIN on your phone immediately',
                icon: Icons.phone_android,
              ),
              _buildPaymentOption(
                id: 'card',
                title: 'Credit / Debit Card',
                subtitle: 'Visa, MasterCard, or Amex',
                icon: Icons.credit_card,
              ),
              _buildPaymentOption(
                id: 'cash',
                title: 'Cash on Delivery',
                subtitle: 'Pay when your fresh roast arrives',
                icon: Icons.payments_outlined,
              ),
              const SizedBox(height: 24),

              // Order Summary
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withAlpha(5), blurRadius: 6, offset: const Offset(0, 2)),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Amount Payable', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppTheme.textMuted)),
                        Text('KSh ${widget.totalAmount}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.primaryGreen)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Pay / Place Order Button
              ElevatedButton(
                onPressed: _isLoading ? null : _handlePayment,
                child: _isLoading
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(_selectedPaymentMethod == 'mpesa' ? 'Pay KSh ${widget.totalAmount} via M-Pesa' : 'Confirm Order'),
              ),
              const SizedBox(height: 16),

              // Store Policy Guarantee
              Center(
                child: GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const PolicyScreen(initialPolicy: 'refundPolicy')),
                    );
                  },
                  child: const Text(
                    'Protected by Rerendet Farm Satisfaction & Refund Policy',
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 12, decoration: TextDecoration.underline),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentOption({
    required String id,
    required String title,
    required String subtitle,
    required IconData icon,
  }) {
    final isSelected = _selectedPaymentMethod == id;

    return GestureDetector(
      onTap: () => setState(() => _selectedPaymentMethod = id),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppTheme.primaryGreen : AppTheme.borderColor,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: isSelected ? AppTheme.primaryGreen : AppTheme.textMuted, size: 24),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                ],
              ),
            ),
            // ignore: deprecated_member_use
            Radio<String>(
              value: id,
              // ignore: deprecated_member_use
              groupValue: _selectedPaymentMethod,
              activeColor: AppTheme.primaryGreen,
              // ignore: deprecated_member_use
              onChanged: (val) => setState(() => _selectedPaymentMethod = val!),
            ),
          ],
        ),
      ),
    );
  }
}
