import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_state_provider.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import 'product_detail_screen.dart';
import 'cart_screen.dart';

class ShopScreen extends ConsumerStatefulWidget {
  final String? initialCategory;
  const ShopScreen({super.key, this.initialCategory});

  @override
  ConsumerState<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends ConsumerState<ShopScreen> {
  late String _selectedCategory;
  final ApiService _apiService = ApiService();
  
  List<dynamic> _products = [];
  List<String> _categories = ['All', 'Coffee', 'Ground Coffee', 'Beans', 'Merchandise'];
  bool _isLoading = true;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.initialCategory ?? 'All';
    _fetchInitialData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchInitialData() async {
    try {
      final cats = await _apiService.getCategories();
      if (mounted && cats.isNotEmpty) {
        setState(() => _categories = cats);
      }
    } catch (_) {}
    await _fetchProducts();
  }

  Future<void> _fetchProducts() async {
    setState(() => _isLoading = true);
    try {
      final fetched = await _apiService.getProducts(
        category: _selectedCategory,
        search: _searchQuery,
      );
      if (mounted) {
        setState(() {
          _products = fetched;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _products = [];
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartItemsCount = ref.watch(cartProvider).fold<int>(0, (sum, i) => sum + i.quantity);

    return Scaffold(
      backgroundColor: AppTheme.backgroundCream,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Shop Catalog', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryGreen)),
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
      body: SafeArea(
        child: Column(
          children: [
            // Search Input
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
              child: TextField(
                controller: _searchController,
                onSubmitted: (val) {
                  _searchQuery = val.trim();
                  _fetchProducts();
                },
                decoration: InputDecoration(
                  hintText: 'Search roasts, origin, grind size...',
                  prefixIcon: const Icon(Icons.search, color: AppTheme.textMuted),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            _searchQuery = '';
                            _fetchProducts();
                          },
                        )
                      : null,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
              ),
            ),

            // Horizontal Categories Carousel
            Container(
              height: 44,
              margin: const EdgeInsets.symmetric(vertical: 8),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: _categories.length,
                itemBuilder: (context, index) {
                  final cat = _categories[index];
                  final isSelected = _selectedCategory.toLowerCase() == cat.toLowerCase();

                  return GestureDetector(
                    onTap: () {
                      setState(() => _selectedCategory = cat);
                      _fetchProducts();
                    },
                    child: Container(
                      margin: const EdgeInsets.only(right: 10),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: isSelected ? AppTheme.primaryGreen : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected ? AppTheme.primaryGreen : AppTheme.borderColor,
                        ),
                      ),
                      child: Text(
                        cat,
                        style: TextStyle(
                          color: isSelected ? Colors.white : AppTheme.textMain,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

            // Product Grid
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryGreen))
                  : _products.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.coffee_outlined, size: 48, color: AppTheme.textMuted),
                              const SizedBox(height: 12),
                              Text('No products found for "$_selectedCategory"', style: const TextStyle(color: AppTheme.textMuted)),
                              const SizedBox(height: 8),
                              TextButton(
                                onPressed: () {
                                  setState(() {
                                    _selectedCategory = 'All';
                                    _searchQuery = '';
                                    _searchController.clear();
                                  });
                                  _fetchProducts();
                                },
                                child: const Text('Reset filters'),
                              ),
                            ],
                          ),
                        )
                      : RefreshIndicator(
                          color: AppTheme.primaryGreen,
                          onRefresh: _fetchProducts,
                          child: GridView.builder(
                            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                            padding: const EdgeInsets.all(20),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              childAspectRatio: 0.72,
                              crossAxisSpacing: 16,
                              mainAxisSpacing: 16,
                            ),
                            itemCount: _products.length,
                            itemBuilder: (context, index) {
                              final product = Map<String, dynamic>.from(_products[index] as Map);
                              final name = product['name']?.toString() ?? 'Rerendet Coffee';
                              final price = ApiService.getProductPrice(product);
                              final imageUrl = ApiService.getProductImageUrl(product);
                              final inStock = product['inStock'] != false;

                              return GestureDetector(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => ProductDetailScreen(product: product),
                                    ),
                                  );
                                },
                                child: Container(
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
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: ClipRRect(
                                          borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                                          child: Stack(
                                            fit: StackFit.expand,
                                            children: [
                                              Image.network(
                                                imageUrl,
                                                fit: BoxFit.cover,
                                                errorBuilder: (_, _, _) => const Center(
                                                  child: Icon(Icons.coffee, color: AppTheme.primaryGreen, size: 36),
                                                ),
                                              ),
                                              if (!inStock)
                                                Container(
                                                  color: Colors.black45,
                                                  alignment: Alignment.center,
                                                  child: Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                    decoration: BoxDecoration(
                                                      color: Colors.red.shade700,
                                                      borderRadius: BorderRadius.circular(6),
                                                    ),
                                                    child: const Text(
                                                      'OUT OF STOCK',
                                                      style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                                    ),
                                                  ),
                                                ),
                                            ],
                                          ),
                                        ),
                                      ),
                                      Padding(
                                        padding: const EdgeInsets.all(12.0),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              name,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textMain),
                                            ),
                                            const SizedBox(height: 6),
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                Text(
                                                  'KSh ${price.toStringAsFixed(0)}',
                                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.primaryGreen),
                                                ),
                                                Container(
                                                  padding: const EdgeInsets.all(6),
                                                  decoration: BoxDecoration(
                                                    color: inStock ? AppTheme.primaryGreen : Colors.grey,
                                                    borderRadius: BorderRadius.circular(8),
                                                  ),
                                                  child: const Icon(Icons.add, color: Colors.white, size: 16),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
