import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_state_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/order_receipt_modal.dart';
import 'order_tracking_screen.dart';
import 'cart_screen.dart';

class OrdersHistoryScreen extends ConsumerStatefulWidget {
  const OrdersHistoryScreen({super.key});

  @override
  ConsumerState<OrdersHistoryScreen> createState() => _OrdersHistoryScreenState();
}

class _OrdersHistoryScreenState extends ConsumerState<OrdersHistoryScreen> {
  String _selectedTab = 'All';
  final ApiService _apiService = ApiService();
  List<dynamic> _orders = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchOrders();
  }

  Future<void> _fetchOrders() async {
    setState(() => _isLoading = true);
    try {
      final orders = await _apiService.getMyOrders();
      if (mounted) {
        setState(() {
          _orders = orders;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _orders = [];
          _isLoading = false;
        });
      }
    }
  }

  void _handleReorder(Map<String, dynamic> order) {
    final rawItems = order['items'];
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
        content: Text('Re-ordered ${cartItems.length} item${cartItems.length > 1 ? 's' : ''} to cart!'),
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
    final filteredOrders = _selectedTab == 'All'
        ? _orders
        : _orders.where((o) {
            final st = (o['status'] ?? o['orderStatus'] ?? '').toString().toLowerCase();
            return st == _selectedTab.toLowerCase();
          }).toList();

    return Scaffold(
      backgroundColor: AppTheme.backgroundCream,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: AppTheme.primaryGreen, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('My Orders & History', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryGreen)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppTheme.primaryGreen),
            tooltip: 'Refresh',
            onPressed: _fetchOrders,
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Filter Tabs
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Row(
                  children: ['All', 'Confirmed', 'Processing', 'Shipped', 'Delivered'].map((tab) {
                    final isSelected = _selectedTab == tab;
                    return GestureDetector(
                      onTap: () => setState(() => _selectedTab = tab),
                      child: Container(
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? AppTheme.primaryGreen : Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: isSelected ? AppTheme.primaryGreen : AppTheme.borderColor),
                        ),
                        child: Text(
                          tab,
                          style: TextStyle(
                            color: isSelected ? Colors.white : AppTheme.textMain,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 16),

              // Orders List
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryGreen))
                    : filteredOrders.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.receipt_long_outlined, size: 54, color: AppTheme.textMuted),
                                const SizedBox(height: 12),
                                const Text('No orders found in this category', style: TextStyle(color: AppTheme.textMuted, fontSize: 14)),
                                const SizedBox(height: 8),
                                TextButton(onPressed: _fetchOrders, child: const Text('Refresh Orders')),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            color: AppTheme.primaryGreen,
                            onRefresh: _fetchOrders,
                            child: ListView.builder(
                              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                              itemCount: filteredOrders.length,
                              itemBuilder: (context, index) {
                                final order = Map<String, dynamic>.from(filteredOrders[index] as Map);
                                final orderId = order['_id']?.toString() ?? '';
                                final orderNumber = order['orderNumber']?.toString() ?? orderId;
                                final total = order['total']?.toString() ?? order['totalAmount']?.toString() ?? '0';
                                final status = order['status']?.toString() ?? order['orderStatus']?.toString() ?? 'Confirmed';
                                final paymentStatus = (order['paymentStatus']?.toString() ?? 'pending').toUpperCase();
                                final isDelivered = status.toLowerCase() == 'delivered';
                                final items = order['items'] is List ? (order['items'] as List) : [];
                                final itemsCount = items.length;

                                return Container(
                                  margin: const EdgeInsets.only(bottom: 16),
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    boxShadow: [
                                      BoxShadow(color: Colors.black.withAlpha(6), blurRadius: 8, offset: const Offset(0, 2)),
                                    ],
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Top Header Row
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            orderNumber,
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textMain),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: isDelivered ? Colors.green.shade50 : Colors.amber.shade50,
                                              borderRadius: BorderRadius.circular(8),
                                              border: Border.all(
                                                color: isDelivered ? Colors.green.shade300 : Colors.amber.shade300,
                                              ),
                                            ),
                                            child: Text(
                                              status.toUpperCase(),
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.bold,
                                                color: isDelivered ? Colors.green.shade800 : Colors.amber.shade900,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),

                                      // Subtitle Row
                                      Row(
                                        children: [
                                          Text(
                                            '$itemsCount item${itemsCount > 1 ? 's' : ''}',
                                            style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                                          ),
                                          const SizedBox(width: 8),
                                          const Text('•', style: TextStyle(color: AppTheme.textMuted)),
                                          const SizedBox(width: 8),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: paymentStatus == 'PAID' ? Colors.green.shade50 : Colors.grey.shade100,
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              paymentStatus,
                                              style: TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: paymentStatus == 'PAID' ? Colors.green.shade800 : Colors.grey.shade700,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),

                                      // Items preview summary
                                      if (items.isNotEmpty) ...[
                                        const SizedBox(height: 8),
                                        Text(
                                          items.map((it) => '${it['quantity'] ?? 1}× ${it['name'] ?? 'Coffee'}').take(2).join(', ') +
                                              (items.length > 2 ? ' ...' : ''),
                                          style: const TextStyle(fontSize: 12, color: AppTheme.textMain),
                                        ),
                                      ],

                                      const Divider(height: 20, thickness: 1, color: AppTheme.borderColor),

                                      // Bottom Actions: Price, Receipt, Re-order, Track
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            'KSh $total',
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.primaryGreen),
                                          ),
                                          Row(
                                            children: [
                                              // Digital Receipt Button
                                              IconButton(
                                                icon: const Icon(Icons.receipt_outlined, size: 20, color: AppTheme.primaryGreen),
                                                tooltip: 'View Receipt',
                                                onPressed: () => OrderReceiptModal.show(context, order),
                                              ),

                                              // Re-order Button
                                              IconButton(
                                                icon: const Icon(Icons.repeat, size: 20, color: AppTheme.accentGold),
                                                tooltip: 'Re-order Items',
                                                onPressed: () => _handleReorder(order),
                                              ),

                                              // Track Order Button
                                              ElevatedButton.icon(
                                                onPressed: () {
                                                  Navigator.push(
                                                    context,
                                                    MaterialPageRoute(
                                                      builder: (context) => OrderTrackingScreen(
                                                        totalAmount: int.tryParse(total) ?? 0,
                                                        orderId: orderId,
                                                        orderNumber: orderNumber,
                                                        initialOrderData: order,
                                                      ),
                                                    ),
                                                  );
                                                },
                                                icon: const Icon(Icons.local_shipping_outlined, size: 14),
                                                label: const Text('Track', style: TextStyle(fontSize: 12)),
                                                style: ElevatedButton.styleFrom(
                                                  backgroundColor: AppTheme.primaryGreen,
                                                  foregroundColor: Colors.white,
                                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                                  visualDensity: VisualDensity.compact,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
