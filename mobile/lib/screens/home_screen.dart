import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_state_provider.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import 'shop_screen.dart';
import 'cart_screen.dart';
import 'product_detail_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final ApiService _apiService = ApiService();
  List<dynamic> _popularProducts = [];
  bool _isLoading = true;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadHomeData();
  }

  Future<void> _loadHomeData() async {
    setState(() => _isLoading = true);
    try {
      final products = await _apiService.getProducts(search: _searchQuery);
      if (mounted) {
        setState(() {
          _popularProducts = products;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final userName = user?['firstName']?.toString() ?? 'Coffee Lover';
    final profilePic = user?['profilePicture']?.toString();
    final cartItemsCount = ref.watch(cartProvider).fold<int>(0, (sum, i) => sum + i.quantity);

    return Scaffold(
      backgroundColor: AppTheme.backgroundCream,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppTheme.primaryGreen,
          onRefresh: _loadHomeData,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header (Greeting & Cart)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: AppTheme.primaryGreen.withAlpha(40),
                          backgroundImage: (profilePic != null && profilePic.isNotEmpty)
                              ? NetworkImage(profilePic)
                              : const NetworkImage(
                                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
                                ),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Hello, $userName',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.textMain,
                              ),
                            ),
                            const Text(
                              'Great coffee. Better days.',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppTheme.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.shopping_bag_outlined, color: AppTheme.textMain, size: 26),
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => const CartScreen()),
                            );
                          },
                        ),
                        if (cartItemsCount > 0)
                          Positioned(
                            top: 6,
                            right: 6,
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
                const SizedBox(height: 20),

                // Search Bar
                TextField(
                  onChanged: (val) {
                    _searchQuery = val;
                  },
                  onSubmitted: (_) => _loadHomeData(),
                  decoration: InputDecoration(
                    hintText: 'Search coffee blends, roast...',
                    prefixIcon: const Icon(Icons.search, color: AppTheme.textMuted),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchQuery = '';
                              _loadHomeData();
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                ),
                const SizedBox(height: 20),

                // Hero Banner
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryGreen,
                    borderRadius: BorderRadius.circular(20),
                    image: const DecorationImage(
                      image: NetworkImage(
                        'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=800&auto=format&fit=crop',
                      ),
                      fit: BoxFit.cover,
                      colorFilter: ColorFilter.mode(Colors.black54, BlendMode.darken),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Premium\nKenyan Coffee',
                                  style: TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                    height: 1.2,
                                  ),
                                ),
                                SizedBox(height: 8),
                                Text(
                                  'From Rerendet farm straight to your cup.',
                                  style: TextStyle(fontSize: 14, color: Colors.white70),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            width: 52,
                            height: 52,
                            padding: const EdgeInsets.all(5),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withAlpha(50),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: Image.network(
                                ApiService.getStoreLogo(ref.watch(publicSettingsProvider).value),
                                fit: BoxFit.contain,
                                errorBuilder: (_, _, _) => const Icon(Icons.coffee, color: AppTheme.primaryGreen),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const ShopScreen()),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: AppTheme.primaryGreen,
                          minimumSize: const Size(120, 40),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                        ),
                        child: const Text('Shop Catalog →', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Shop by Category
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Shop by Category',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textMain),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const ShopScreen()),
                        );
                      },
                      child: const Text('See all', style: TextStyle(color: AppTheme.primaryGreen)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 90,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    children: [
                      _buildCategoryItem('All Coffee', Icons.coffee, 'All'),
                      _buildCategoryItem('Ground', Icons.filter_vintage, 'Ground Coffee'),
                      _buildCategoryItem('Beans', Icons.grain, 'Beans'),
                      _buildCategoryItem('Accessories', Icons.card_giftcard, 'Merchandise'),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Featured / Popular Products from Backend
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Fresh Harvest (Backend)',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textMain),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const ShopScreen()),
                        );
                      },
                      child: const Text('Browse all', style: TextStyle(color: AppTheme.primaryGreen)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                if (_isLoading)
                  const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator(color: AppTheme.primaryGreen)))
                else if (_popularProducts.isEmpty)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.all(30),
                      child: Column(
                        children: [
                          const Icon(Icons.coffee_outlined, size: 48, color: AppTheme.textMuted),
                          const SizedBox(height: 12),
                          const Text('No products currently available', style: TextStyle(color: AppTheme.textMuted)),
                          TextButton(onPressed: _loadHomeData, child: const Text('Retry Connection')),
                        ],
                      ),
                    ),
                  )
                else
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.72,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                    ),
                    itemCount: _popularProducts.length > 6 ? 6 : _popularProducts.length,
                    itemBuilder: (context, index) {
                      final product = Map<String, dynamic>.from(_popularProducts[index] as Map);
                      final name = product['name']?.toString() ?? 'Rerendet Coffee';
                      final price = ApiService.getProductPrice(product);
                      final imageUrl = ApiService.getProductImageUrl(product);

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
                                  child: Image.network(
                                    imageUrl,
                                    fit: BoxFit.cover,
                                    width: double.infinity,
                                    errorBuilder: (_, _, _) => const Center(
                                      child: Icon(Icons.coffee, color: AppTheme.primaryGreen, size: 40),
                                    ),
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
                                            color: AppTheme.primaryGreen,
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
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryItem(String title, IconData icon, String categoryFilter) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => ShopScreen(initialCategory: categoryFilter)),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(right: 16),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(10),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Icon(icon, color: AppTheme.primaryGreen, size: 24),
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textMain),
            ),
          ],
        ),
      ),
    );
  }
}
