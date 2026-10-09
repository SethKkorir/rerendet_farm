import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_state_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/order_receipt_modal.dart';
import 'main_shell.dart';
import 'cart_screen.dart';

class OrderTrackingScreen extends ConsumerStatefulWidget {
  final int totalAmount;
  final String? orderId;
  final String? orderNumber;
  final Map<String, dynamic>? initialOrderData;

  const OrderTrackingScreen({
    super.key,
    required this.totalAmount,
    this.orderId,
    this.orderNumber,
    this.initialOrderData,
  });

  @override
  ConsumerState<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends ConsumerState<OrderTrackingScreen> {
  final ApiService _apiService = ApiService();
  Map<String, dynamic>? _order;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _order = widget.initialOrderData;
    _fetchLiveOrder();
  }

  Future<void> _fetchLiveOrder() async {
    final targetId = widget.orderId ?? widget.orderNumber;
    if (targetId == null || targetId.isEmpty) {
      setState(() => _isLoading = false);
      return;
    }

    try {
      final res = await _apiService.getOrderById(targetId);
      if (mounted) {
        setState(() {
          _order = res;
          _isLoading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          if (_order == null) {
            _error = 'Could not load live tracking data';
          }
        });
      }
    }
  }

  void _handleReorder() {
    if (_order == null) return;
    final rawItems = _order!['items'];
    if (rawItems is! List || rawItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No re-orderable items found in this order.')),
      );
      return;
    }

    final cartItems = <CartItem>[];
    for (final it in rawItems) {
      if (it is Map) {
        final product = it['product'];
        final prodId = product is Map ? product['_id']?.toString() ?? '' : it['product']?.toString() ?? '';
        final name = it['name']?.toString() ?? (product is Map ? product['name']?.toString() ?? 'Coffee' : 'Coffee');
        final price = num.tryParse(it['price']?.toString() ?? '0') ?? 0;
        final qty = int.tryParse(it['quantity']?.toString() ?? '1') ?? 1;
        final size = it['size']?.toString() ?? 'Standard';
        String imageUrl = '';
        if (product is Map && product['images'] is List && (product['images'] as List).isNotEmpty) {
          imageUrl = product['images'][0].toString();
        } else if (it['image'] != null) {
          imageUrl = it['image'].toString();
        }

        if (prodId.isNotEmpty) {
          cartItems.add(CartItem(
            productId: prodId,
            name: name,
            price: price,
            quantity: qty,
            size: size,
            imageUrl: imageUrl,
          ));
        }
      }
    }

    if (cartItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to add items to cart.')),
      );
      return;
    }

    ref.read(cartProvider.notifier).addMultipleItems(cartItems);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Added ${cartItems.length} item${cartItems.length > 1 ? 's' : ''} to your cart!'),
        backgroundColor: AppTheme.primaryGreen,
        action: SnackBarAction(
          label: 'View Cart',
          textColor: AppTheme.accentGold,
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const CartScreen()),
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final orderNum = _order?['orderNumber']?.toString() ?? widget.orderNumber ?? 'Confirmed';
    final total = _order?['total']?.toString() ?? widget.totalAmount.toString();
    final paymentStatus = (_order?['paymentStatus']?.toString() ?? 'PENDING').toUpperCase();
    final roastStage = (_order?['roastStage']?.toString() ?? '').toLowerCase();
    final trackingNumber = _order?['trackingNumber']?.toString();

    // Map clean display status
    final rawStatus = (_order?['status'] ?? _order?['orderStatus'] ?? '').toString().toUpperCase();
    final rawFulfillment = (_order?['fulfillmentStatus'] ?? '').toString().toUpperCase();

    String orderStatus = 'CONFIRMED';
    if (rawStatus == 'CANCELLED') {
      orderStatus = 'CANCELLED';
    } else if (rawFulfillment == 'DELIVERED') {
      orderStatus = 'DELIVERED';
    } else if (rawFulfillment == 'SHIPPED') {
      orderStatus = 'SHIPPED';
    } else if (rawFulfillment == 'PACKED' || roastStage == 'packaged') {
      orderStatus = 'PACKED';
    } else if (['roasting_in_progress', 'roast_scheduled', 'resting_quality_check'].contains(roastStage)) {
      orderStatus = 'ROASTING';
    } else if (paymentStatus == 'PAID') {
      orderStatus = 'PROCESSING';
    } else if (paymentStatus == 'FAILED') {
      orderStatus = 'PAYMENT FAILED';
    } else if (rawStatus.isNotEmpty && rawStatus != 'OPEN') {
      orderStatus = rawStatus;
    }

    // Determine timeline completion levels
    final isPaid = paymentStatus == 'PAID';
    final isProcessing = ['PROCESSING', 'ROASTING', 'PACKED', 'SHIPPED', 'DELIVERED'].contains(orderStatus) || roastStage.isNotEmpty;
    final isShipped = ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].contains(orderStatus);
    final isDelivered = orderStatus == 'DELIVERED';

    return Scaffold(
      backgroundColor: AppTheme.primaryGreen,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
          onPressed: () {
            if (Navigator.canPop(context)) {
              Navigator.pop(context);
            } else {
              Navigator.pushAndRemoveUntil(
                context,
                MaterialPageRoute(builder: (context) => const MainShell()),
                (route) => false,
              );
            }
          },
        ),
        title: const Text('Live Order Tracking', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            tooltip: 'Refresh Status',
            onPressed: _fetchLiveOrder,
          ),
          if (_order != null)
            IconButton(
              icon: const Icon(Icons.receipt_long, color: Colors.white),
              tooltip: 'Receipt',
              onPressed: () => OrderReceiptModal.show(context, _order!),
            ),
        ],
      ),
      body: SafeArea(
        child: _isLoading && _order == null
            ? const Center(child: CircularProgressIndicator(color: Colors.white))
            : _error != null && _order == null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, color: Colors.white70, size: 48),
                        const SizedBox(height: 12),
                        Text(_error!, style: const TextStyle(color: Colors.white, fontSize: 16)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _fetchLiveOrder,
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppTheme.primaryGreen),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    color: AppTheme.primaryGreen,
                    onRefresh: _fetchLiveOrder,
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Top Header Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isDelivered ? Icons.done_all : Icons.local_shipping_outlined,
                    color: AppTheme.primaryGreen,
                    size: 40,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  isDelivered ? 'Order Delivered!' : 'Order In Progress',
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 6),
                Text(
                  'Order #$orderNum • Total: KSh $total',
                  style: const TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w500),
                ),
                if (trackingNumber != null && trackingNumber.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Container(
                    margin: const EdgeInsets.only(top: 6),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withAlpha(35),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'Tracking Ref: $trackingNumber',
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontFamily: 'Courier', fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
                const SizedBox(height: 24),

                // Tracking Timeline Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: AppTheme.backgroundCream,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withAlpha(20), blurRadius: 15, offset: const Offset(0, 4)),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Delivery Journey', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textMain)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: isDelivered ? Colors.green.shade100 : Colors.amber.shade100,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              orderStatus,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: isDelivered ? Colors.green.shade900 : Colors.amber.shade900,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // Step 1: Order Placed
                      _buildTimelineStep(
                        title: 'Order Placed & Registered',
                        subtitle: 'Order recorded in the Rerendet system',
                        isCompleted: true,
                        isActive: true,
                        isLast: false,
                        icon: Icons.check,
                      ),

                      // Step 2: Payment Verified
                      _buildTimelineStep(
                        title: 'Payment Status: $paymentStatus',
                        subtitle: isPaid ? 'Payment confirmed via M-Pesa' : 'Payment processing or awaiting prompt',
                        isCompleted: isPaid,
                        isActive: true,
                        isLast: false,
                        icon: isPaid ? Icons.check : Icons.payment,
                      ),

                      // Step 3: Roasting & Preparing
                      _buildTimelineStep(
                        title: 'Artisan Roasting & Packaging',
                        subtitle: roastStage.isNotEmpty
                            ? 'Stage: ${roastStage.toUpperCase()} at Rerendet Roastery'
                            : (isProcessing ? 'Beans selected & packaged fresh' : 'Scheduled for morning roasting queue'),
                        isCompleted: isProcessing,
                        isActive: isPaid,
                        isLast: false,
                        icon: Icons.coffee,
                      ),

                      // Step 4: Dispatch & Out for Delivery
                      _buildTimelineStep(
                        title: 'Out for Delivery',
                        subtitle: isShipped ? 'Carrier en route with your package' : 'Preparing for courier dispatch',
                        isCompleted: isShipped,
                        isActive: isProcessing,
                        isLast: false,
                        icon: Icons.delivery_dining,
                      ),

                      // Step 5: Delivered
                      _buildTimelineStep(
                        title: 'Delivered',
                        subtitle: isDelivered ? 'Delivered successfully! Enjoy your cup.' : 'Estimated arrival soon',
                        isCompleted: isDelivered,
                        isActive: isShipped,
                        isLast: true,
                        icon: Icons.home,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Delivery Destination & Items summary card
                if (_order != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Destination & Items',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textMain),
                        ),
                        const SizedBox(height: 10),
                        if (_order!['shippingAddress'] is Map) ...[
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.location_on_outlined, size: 18, color: AppTheme.primaryGreen),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  '${_order!['shippingAddress']['address'] ?? _order!['shippingAddress']['street'] ?? ''}, ${_order!['shippingAddress']['city'] ?? 'Nairobi'}',
                                  style: const TextStyle(fontSize: 13, color: AppTheme.textMain),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                        ],
                        if (_order!['items'] is List) ...[
                          const Divider(height: 16, thickness: 1, color: AppTheme.borderColor),
                          ...(_order!['items'] as List).map((item) {
                            final name = item['name']?.toString() ?? 'Specialty Coffee';
                            final qty = item['quantity']?.toString() ?? '1';
                            final size = item['size']?.toString() ?? 'Standard';
                            final price = item['price']?.toString() ?? '0';
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('$qty× $name ($size)', style: const TextStyle(fontSize: 13, color: AppTheme.textMain)),
                                  Text('KSh $price', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textMain)),
                                ],
                              ),
                            );
                          }),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                // Action Buttons Tray
                Row(
                  children: [
                    if (_order != null) ...[
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => OrderReceiptModal.show(context, _order!),
                          icon: const Icon(Icons.receipt_outlined, size: 18),
                          label: const Text('Receipt'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: const BorderSide(color: Colors.white),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                    ],
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _handleReorder,
                        icon: const Icon(Icons.repeat, size: 18),
                        label: const Text('Re-order'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.accentGold,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Back to Home Button
                SizedBox(
                  width: double.infinity,
                  child: TextButton(
                    onPressed: () {
                      Navigator.pushAndRemoveUntil(
                        context,
                        MaterialPageRoute(builder: (context) => const MainShell()),
                        (route) => false,
                      );
                    },
                    style: TextButton.styleFrom(foregroundColor: Colors.white70),
                    child: const Text('Back to Farm Store'),
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTimelineStep({
    required String title,
    required String subtitle,
    required bool isCompleted,
    required bool isActive,
    required bool isLast,
    required IconData icon,
  }) {
    final color = isCompleted ? AppTheme.primaryGreen : (isActive ? AppTheme.accentGold : AppTheme.borderColor);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 26,
              height: 26,
              decoration: BoxDecoration(
                color: isCompleted ? AppTheme.primaryGreen : (isActive ? AppTheme.accentGold.withAlpha(40) : Colors.white),
                border: Border.all(color: color, width: 2),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 14,
                color: isCompleted ? Colors.white : color,
              ),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 42,
                color: isCompleted ? AppTheme.primaryGreen : AppTheme.borderColor,
              ),
          ],
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: isCompleted ? AppTheme.textMain : (isActive ? AppTheme.textMain : AppTheme.textMuted),
                ),
              ),
              const SizedBox(height: 3),
              Text(
                subtitle,
                style: TextStyle(fontSize: 12, color: isActive ? AppTheme.textMain : AppTheme.textMuted),
              ),
              const SizedBox(height: 14),
            ],
          ),
        ),
      ],
    );
  }
}
