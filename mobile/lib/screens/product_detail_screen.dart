import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_state_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'cart_screen.dart';

class ProductDetailScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic>? product;
  final String? name;
  final String? price;
  final String? imageUrl;

  const ProductDetailScreen({
    super.key,
    this.product,
    this.name,
    this.price,
    this.imageUrl,
  });

  @override
  ConsumerState<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  int _quantity = 1;
  bool _isFavorite = false;
  String _selectedSize = '250g';
  num _selectedPrice = 0;

  @override
  void initState() {
    super.initState();
    _initializeProductData();
  }

  void _initializeProductData() {
    final p = widget.product;
    if (p != null) {
      if (p['sizes'] is List && (p['sizes'] as List).isNotEmpty) {
        final firstSize = p['sizes'][0];
        if (firstSize is Map) {
          _selectedSize = firstSize['size']?.toString() ?? 'Standard';
          _selectedPrice = num.tryParse(firstSize['price']?.toString() ?? '0') ?? 0;
          return;
        }
      }
      _selectedPrice = ApiService.getProductPrice(p);
    } else {
      final cleanPriceStr = (widget.price ?? '0').replaceAll(RegExp(r'[^0-9.]'), '');
      _selectedPrice = num.tryParse(cleanPriceStr) ?? 0;
    }
  }

  void _onSizeSelected(String size, num price) {
    setState(() {
      _selectedSize = size;
      _selectedPrice = price;
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.product;
    final name = p?['name']?.toString() ?? widget.name ?? 'Rerendet Coffee';
    final imageUrl = p != null ? ApiService.getProductImageUrl(p) : (widget.imageUrl ?? '');
    final description = p?['description']?.toString() ??
        'Single origin Arabica coffee grown in the rich volcanic soils of the Rift Valley highlands. Harvested by hand and freshly roasted to perfection.';
    final origin = p?['origin']?.toString() ?? 'Rerendet, Kenya';
    final roastLevel = p?['roastLevel']?.toString() ?? 'Medium Roast';
    final inStock = p?['inStock'] != false;
    final sizesList = (p?['sizes'] is List) ? (p!['sizes'] as List) : [];
    final cartItemsCount = ref.watch(cartProvider).fold<int>(0, (sum, i) => sum + i.quantity);

    return Scaffold(
      backgroundColor: AppTheme.backgroundCream,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: AppTheme.primaryGreen, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_bag_outlined, color: AppTheme.primaryGreen),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const CartScreen()),
                  );
                },
              ),
              if (cartItemsCount > 0)
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: AppTheme.primaryGreen,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      '$cartItemsCount',
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Column(
          children: [
            // Product Image Header
            Container(
              height: 320,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                image: imageUrl.isNotEmpty
                    ? DecorationImage(
                        image: NetworkImage(imageUrl),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: imageUrl.isEmpty
                  ? const Center(child: Icon(Icons.coffee, size: 80, color: AppTheme.primaryGreen))
                  : null,
            ),

            // Details Card
            Transform.translate(
              offset: const Offset(0, -20),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: const BoxDecoration(
                  color: AppTheme.backgroundCream,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(32),
                    topRight: Radius.circular(32),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryGreen,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: Icon(
                            _isFavorite ? Icons.favorite : Icons.favorite_border,
                            color: _isFavorite ? Colors.red : AppTheme.textMuted,
                          ),
                          onPressed: () => setState(() => _isFavorite = !_isFavorite),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Stock & Origin tags
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildInfoTag(origin, icon: Icons.location_on_outlined),
                        _buildInfoTag(roastLevel, icon: Icons.local_fire_department_outlined),
                        _buildInfoTag(
                          inStock ? 'In Stock' : 'Out of Stock',
                          icon: inStock ? Icons.check_circle_outline : Icons.cancel_outlined,
                          color: inStock ? Colors.green.shade700 : Colors.red,
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Sizes Selection from Backend
                    if (sizesList.isNotEmpty) ...[
                      const Text(
                        'Select Size',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textMain),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 10,
                        children: sizesList.map((s) {
                          final sizeName = s['size']?.toString() ?? 'Standard';
                          final sizePrice = num.tryParse(s['price']?.toString() ?? '0') ?? 0;
                          final isSelected = _selectedSize == sizeName;

                          return GestureDetector(
                            onTap: () => _onSizeSelected(sizeName, sizePrice),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                              decoration: BoxDecoration(
                                color: isSelected ? AppTheme.primaryGreen : Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isSelected ? AppTheme.primaryGreen : AppTheme.borderColor,
                                  width: isSelected ? 2 : 1,
                                ),
                              ),
                              child: Text(
                                '$sizeName (KSh $sizePrice)',
                                style: TextStyle(
                                  color: isSelected ? Colors.white : AppTheme.textMain,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // Description
                    const Text(
                      'About This Coffee',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textMain),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      description,
                      style: const TextStyle(fontSize: 14, color: AppTheme.textMuted, height: 1.5),
                    ),
                    const SizedBox(height: 24),

                    // Quantity Counter
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Quantity',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textMain),
                        ),
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.borderColor),
                          ),
                          child: Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove, size: 18),
                                onPressed: () {
                                  if (_quantity > 1) setState(() => _quantity--);
                                },
                              ),
                              Text(
                                '$_quantity',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                              IconButton(
                                icon: const Icon(Icons.add, size: 18),
                                onPressed: () => setState(() => _quantity++),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Price & Add to Cart
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Total Price', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                            const SizedBox(height: 4),
                            Text(
                              'KSh ${(_selectedPrice * _quantity).toStringAsFixed(0)}',
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryGreen,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: 20),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: inStock
                                ? () {
                                    final productId = p?['_id']?.toString() ?? p?['id']?.toString() ?? name;
                                    ref.read(cartProvider.notifier).addItem(
                                          CartItem(
                                            productId: productId,
                                            name: name,
                                            price: _selectedPrice,
                                            quantity: _quantity,
                                            size: _selectedSize,
                                            imageUrl: imageUrl,
                                          ),
                                        );

                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('Added $_quantity x $name ($_selectedSize) to cart!'),
                                        backgroundColor: AppTheme.primaryGreen,
                                        action: SnackBarAction(
                                          label: 'View Cart',
                                          textColor: Colors.white,
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
                                : null,
                            icon: const Icon(Icons.shopping_cart_outlined),
                            label: Text(inStock ? 'Add to Cart' : 'Out of Stock'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoTag(String text, {IconData? icon, Color? color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: color ?? AppTheme.primaryGreen),
            const SizedBox(width: 4),
          ],
          Text(
            text,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color ?? AppTheme.textMain,
            ),
          ),
        ],
      ),
    );
  }
}
