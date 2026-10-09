import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_state_provider.dart';
import '../theme/app_theme.dart';
import 'checkout_screen.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartItems = ref.watch(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);
    final settingsAsync = ref.watch(publicSettingsProvider);

    final paymentSettings = settingsAsync.value?['payment'] is Map
        ? settingsAsync.value!['payment'] as Map
        : null;

    final shippingPrice = num.tryParse(paymentSettings?['shippingPrice']?.toString() ?? '250') ?? 250;
    final freeThreshold = num.tryParse(paymentSettings?['freeShippingThreshold']?.toString() ?? '3000') ?? 3000;

    final subtotal = cartNotifier.subtotal;
    final isFreeShipping = subtotal >= freeThreshold && subtotal > 0;
    final deliveryFee = cartItems.isEmpty ? 0 : (isFreeShipping ? 0 : shippingPrice);
    final total = subtotal + deliveryFee;

    return Scaffold(
      backgroundColor: AppTheme.backgroundCream,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: AppTheme.primaryGreen, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Shopping Bag', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryGreen)),
        actions: [
          if (cartItems.isNotEmpty)
            TextButton(
              onPressed: () => cartNotifier.clearCart(),
              child: const Text('Clear', style: TextStyle(color: Colors.redAccent, fontSize: 13)),
            ),
        ],
      ),
      body: cartItems.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.shopping_bag_outlined, size: 64, color: AppTheme.textMuted),
                  const SizedBox(height: 16),
                  const Text('Your shopping bag is empty', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textMain)),
                  const SizedBox(height: 8),
                  const Text('Explore our single-origin coffees and brew gear.', style: TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Start Shopping'),
                  ),
                ],
              ),
            )
          : Column(
              children: [
                if (!isFreeShipping && subtotal > 0)
                  Container(
                    width: double.infinity,
                    color: Colors.amber.shade100,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Text(
                      'Add KSh ${(freeThreshold - subtotal).toStringAsFixed(0)} more for free delivery!',
                      style: TextStyle(color: Colors.amber.shade900, fontSize: 12, fontWeight: FontWeight.w600),
                      textAlign: TextAlign.center,
                    ),
                  ),

                Expanded(
                  child: ListView.builder(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.all(20),
                    itemCount: cartItems.length,
                    itemBuilder: (context, index) {
                      final item = cartItems[index];

                      return Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(8),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Image.network(
                                item.imageUrl,
                                width: 70,
                                height: 70,
                                fit: BoxFit.cover,
                                errorBuilder: (_, _, _) => Container(
                                  width: 70,
                                  height: 70,
                                  color: AppTheme.backgroundCream,
                                  child: const Icon(Icons.coffee, color: AppTheme.primaryGreen),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textMain),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Size: ${item.size}',
                                    style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'KSh ${item.price.toStringAsFixed(0)}',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.primaryGreen),
                                  ),
                                ],
                              ),
                            ),
                            // Quantity Controls
                            Container(
                              decoration: BoxDecoration(
                                color: AppTheme.backgroundCream,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.remove, size: 16),
                                    onPressed: () => cartNotifier.updateQuantity(item.productId, item.size, item.quantity - 1),
                                  ),
                                  Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                  IconButton(
                                    icon: const Icon(Icons.add, size: 16),
                                    onPressed: () => cartNotifier.updateQuantity(item.productId, item.size, item.quantity + 1),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),

                // Summary and Checkout Bar
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withAlpha(10), blurRadius: 10, offset: const Offset(0, -2)),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Subtotal', style: TextStyle(color: AppTheme.textMuted, fontSize: 14)),
                          Text('KSh ${subtotal.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Delivery Fee', style: TextStyle(color: AppTheme.textMuted, fontSize: 14)),
                          Text(
                            isFreeShipping ? 'FREE' : 'KSh ${deliveryFee.toStringAsFixed(0)}',
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                              color: isFreeShipping ? Colors.green.shade700 : AppTheme.textMain,
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: 24, thickness: 1, color: AppTheme.borderColor),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryGreen)),
                          Text('KSh ${total.toStringAsFixed(0)}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primaryGreen)),
                        ],
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => CheckoutScreen(totalAmount: total.toInt()),
                            ),
                          );
                        },
                        child: const Text('Proceed to Checkout'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
