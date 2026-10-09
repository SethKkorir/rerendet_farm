import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';

class OrderReceiptModal extends StatelessWidget {
  final Map<String, dynamic> order;

  const OrderReceiptModal({super.key, required this.order});

  static Future<void> show(BuildContext context, Map<String, dynamic> order) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => OrderReceiptModal(order: order),
    );
  }

  @override
  Widget build(BuildContext context) {
    final orderNumber = order['orderNumber']?.toString() ?? order['_id']?.toString() ?? '#ORD';
    final createdAt = order['createdAt']?.toString();
    DateTime? date;
    if (createdAt != null) {
      try {
        date = DateTime.parse(createdAt);
      } catch (_) {}
    }
    final formattedDate = date != null
        ? '${date.day}/${date.month}/${date.year} at ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}'
        : 'Recent Order';

    final total = order['total']?.toString() ?? order['totalAmount']?.toString() ?? '0';
    final subtotal = order['subtotal']?.toString() ?? total;
    final shippingCost = order['shippingCost']?.toString() ?? '0';
    final discount = order['discountAmount']?.toString() ?? '0';
    final paymentMethod = (order['paymentMethod']?.toString() ?? 'mpesa').toUpperCase();
    final paymentStatus = (order['paymentStatus']?.toString() ?? 'pending').toUpperCase();
    final txId = order['transactionId']?.toString();

    final shipping = order['shippingAddress'] is Map ? order['shippingAddress'] as Map : {};
    final recipientName = '${shipping['firstName'] ?? ''} ${shipping['lastName'] ?? ''}'.trim();
    final phone = shipping['phone']?.toString() ?? '';
    final address = shipping['address'] ?? shipping['street'] ?? 'Nairobi, Kenya';
    final city = shipping['city'] ?? shipping['town'] ?? 'Nairobi';
    final landmark = shipping['landmark']?.toString();

    final items = order['items'] is List ? (order['items'] as List) : [];

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // Top handle
          Padding(
            padding: const EdgeInsets.only(top: 12, bottom: 8),
            child: Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.receipt_long, color: AppTheme.primaryGreen, size: 22),
                    SizedBox(width: 8),
                    Text(
                      'Official Receipt',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.textMain),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppTheme.textMuted),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(height: 1, thickness: 1, color: AppTheme.borderColor),

          // Printable Receipt Body
          Expanded(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Brand Header
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: AppTheme.primaryGreen.withAlpha(25),
                      shape: BoxShape.circle,
                    ),
                    child: const Center(
                      child: Text('☕', style: TextStyle(fontSize: 26)),
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'RERENDET COFFEE FARM',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17, letterSpacing: 1.5, color: AppTheme.primaryGreen),
                  ),
                  const Text(
                    'Rift Valley Highlands, Kenya • rerendet.coffee',
                    style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
                  ),
                  const SizedBox(height: 16),

                  // Receipt Meta Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.backgroundCream,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppTheme.borderColor),
                    ),
                    child: Column(
                      children: [
                        _buildMetaRow('Order Number', orderNumber, isBold: true),
                        const SizedBox(height: 6),
                        _buildMetaRow('Date & Time', formattedDate),
                        const SizedBox(height: 6),
                        _buildMetaRow('Payment Method', paymentMethod),
                        const SizedBox(height: 6),
                        _buildMetaRow(
                          'Payment Status',
                          paymentStatus,
                          valueColor: paymentStatus == 'PAID' ? Colors.green.shade700 : Colors.amber.shade900,
                          isBold: true,
                        ),
                        if (txId != null && txId.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          _buildMetaRow('Transaction Ref', txId),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Customer & Delivery Info
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'DELIVERY DESTINATION',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, letterSpacing: 1, color: AppTheme.textMuted),
                        ),
                        const SizedBox(height: 6),
                        if (recipientName.isNotEmpty)
                          Text(recipientName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textMain)),
                        if (phone.isNotEmpty)
                          Text('Phone: $phone', style: const TextStyle(fontSize: 13, color: AppTheme.textMain)),
                        Text('$address, $city', style: const TextStyle(fontSize: 13, color: AppTheme.textMain)),
                        if (landmark != null && landmark.isNotEmpty)
                          Text('Landmark: $landmark', style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Itemized List
                  Align(
                    alignment: Alignment.centerLeft,
                    child: const Text(
                      'PURCHASED ITEMS',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, letterSpacing: 1, color: AppTheme.textMuted),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: AppTheme.borderColor),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: items.map((item) {
                        final name = item['name']?.toString() ?? 'Specialty Coffee';
                        final size = item['size']?.toString() ?? 'Standard';
                        final qty = item['quantity']?.toString() ?? '1';
                        final price = item['price']?.toString() ?? '0';
                        final numQty = int.tryParse(qty) ?? 1;
                        final numPrice = num.tryParse(price) ?? 0;
                        final itemTotal = (numQty * numPrice).toString();

                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            border: Border(
                              bottom: BorderSide(color: Colors.grey.shade200),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textMain)),
                                    Text('Size: $size • Qty: $qty × KSh $price', style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                                  ],
                                ),
                              ),
                              Text('KSh $itemTotal', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textMain)),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Summary Totals
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.backgroundCream.withAlpha(120),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        _buildTotalRow('Subtotal', 'KSh $subtotal'),
                        const SizedBox(height: 4),
                        _buildTotalRow('Delivery Shipping', 'KSh $shippingCost'),
                        if (discount != '0' && discount.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          _buildTotalRow('Discount Saved', '-KSh $discount', color: Colors.green.shade700),
                        ],
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: Divider(height: 1, thickness: 1, color: AppTheme.borderColor),
                        ),
                        _buildTotalRow('Grand Total', 'KSh $total', isBold: true, isLarge: true),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Barcode decoration
                  Text(
                    '* $orderNumber *',
                    style: const TextStyle(
                      fontFamily: 'Courier',
                      fontWeight: FontWeight.w900,
                      fontSize: 15,
                      letterSpacing: 4,
                      color: AppTheme.textMuted,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text('Thank you for supporting sustainable Kenyan coffee farming!',
                      style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppTheme.textMuted)),
                ],
              ),
            ),
          ),

          // Bottom Action Buttons
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      final summary = 'Rerendet Coffee Receipt\nOrder: $orderNumber\nTotal: KSh $total\nPayment: $paymentMethod ($paymentStatus)\nDate: $formattedDate';
                      Clipboard.setData(ClipboardData(text: summary));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Receipt summary copied to clipboard!'),
                          backgroundColor: AppTheme.primaryGreen,
                        ),
                      );
                    },
                    icon: const Icon(Icons.copy_outlined, size: 16),
                    label: const Text('Copy Receipt'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Done'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetaRow(String label, String value, {bool isBold = false, Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
              color: valueColor ?? AppTheme.textMain,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTotalRow(String label, String value, {bool isBold = false, bool isLarge = false, Color? color}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isLarge ? 15 : 13,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            color: isLarge ? AppTheme.primaryGreen : AppTheme.textMain,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isLarge ? 17 : 13,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
            color: color ?? (isLarge ? AppTheme.primaryGreen : AppTheme.textMain),
          ),
        ),
      ],
    );
  }
}
