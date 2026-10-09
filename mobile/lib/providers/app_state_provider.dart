import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService();
});

// ── Public Store Settings (Logo, Store Name, Policies, Maintenance) ───────────
final publicSettingsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  return await api.getPublicSettings();
});

// ── Authentication State ──────────────────────────────────────────────────────
class AuthState {
  final Map<String, dynamic>? user;
  final String? token;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.user,
    this.token,
    this.isLoading = false,
    this.error,
  });

  bool get isAuthenticated => user != null && token != null;

  AuthState copyWith({
    Map<String, dynamic>? user,
    String? token,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      token: token ?? this.token,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    Future.microtask(() => initAuth());
    return const AuthState();
  }

  ApiService get _apiService => ref.read(apiServiceProvider);

  Future<void> initAuth() async {
    state = state.copyWith(isLoading: true);
    try {
      final token = await _apiService.getSavedToken();
      if (token != null && token.isNotEmpty) {
        final user = await _apiService.getCurrentUser();
        state = AuthState(user: user, token: token, isLoading: false);
        return;
      }
    } catch (_) {}
    state = const AuthState(isLoading: false);
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await _apiService.login(email, password);
      if (res['requires2FA'] == true) {
        state = state.copyWith(isLoading: false);
        return res;
      }
      final data = res['data'];
      final user = data is Map ? data['user'] : null;
      final token = data is Map ? data['token'] : null;
      state = AuthState(
        user: user is Map ? Map<String, dynamic>.from(user) : null,
        token: token?.toString(),
        isLoading: false,
      );
      return res;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await _apiService.register(
        name: name,
        email: email,
        password: password,
        phone: phone,
      );
      final data = res['data'];
      final user = data is Map ? data['user'] : null;
      final token = data is Map ? data['token'] : null;
      state = AuthState(
        user: user is Map ? Map<String, dynamic>.from(user) : null,
        token: token?.toString(),
        isLoading: false,
      );
      return res;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> updateData) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await _apiService.updateProfile(updateData);
      final updatedUser = res['data'] is Map ? Map<String, dynamic>.from(res['data']) : null;
      if (updatedUser != null) {
        state = state.copyWith(user: updatedUser, isLoading: false);
      } else {
        state = state.copyWith(isLoading: false);
      }
      return res;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<Map<String, dynamic>> toggle2FA({required bool enabled, required String password}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await _apiService.toggle2FA(enabled: enabled, password: password);
      if (state.user != null) {
        final updatedUser = Map<String, dynamic>.from(state.user!);
        updatedUser['twoFactorEnabled'] = enabled;
        state = state.copyWith(user: updatedUser, isLoading: false);
      } else {
        state = state.copyWith(isLoading: false);
      }
      return res;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> logout() async {
    await _apiService.logout();
    state = const AuthState();
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

// ── Cart State Management ─────────────────────────────────────────────────────
class CartItem {
  final String productId;
  final String name;
  final num price;
  final int quantity;
  final String size;
  final String imageUrl;

  const CartItem({
    required this.productId,
    required this.name,
    required this.price,
    required this.quantity,
    this.size = 'Standard',
    required this.imageUrl,
  });

  Map<String, dynamic> toMap() {
    return {
      'productId': productId,
      'name': name,
      'price': price,
      'quantity': quantity,
      'size': size,
      'imageUrl': imageUrl,
    };
  }

  CartItem copyWith({int? quantity}) {
    return CartItem(
      productId: productId,
      name: name,
      price: price,
      quantity: quantity ?? this.quantity,
      size: size,
      imageUrl: imageUrl,
    );
  }
}

class CartNotifier extends Notifier<List<CartItem>> {
  @override
  List<CartItem> build() => [];

  ApiService get _apiService => ref.read(apiServiceProvider);

  void addItem(CartItem item) {
    final existingIdx = state.indexWhere(
      (element) => element.productId == item.productId && element.size == item.size,
    );
    if (existingIdx >= 0) {
      final updated = List<CartItem>.from(state);
      updated[existingIdx] = updated[existingIdx].copyWith(
        quantity: updated[existingIdx].quantity + item.quantity,
      );
      state = updated;
    } else {
      state = [...state, item];
    }
    _syncWithBackend();
  }

  void addMultipleItems(List<CartItem> items) {
    var current = List<CartItem>.from(state);
    for (final item in items) {
      final existingIdx = current.indexWhere(
        (element) => element.productId == item.productId && element.size == item.size,
      );
      if (existingIdx >= 0) {
        current[existingIdx] = current[existingIdx].copyWith(
          quantity: current[existingIdx].quantity + item.quantity,
        );
      } else {
        current.add(item);
      }
    }
    state = current;
    _syncWithBackend();
  }

  void updateQuantity(String productId, String size, int newQty) {
    if (newQty <= 0) {
      removeItem(productId, size);
      return;
    }
    state = state.map((item) {
      if (item.productId == productId && item.size == size) {
        return item.copyWith(quantity: newQty);
      }
      return item;
    }).toList();
    _syncWithBackend();
  }

  void removeItem(String productId, String size) {
    state = state.where((item) => !(item.productId == productId && item.size == size)).toList();
    _syncWithBackend();
  }

  void clearCart() {
    state = [];
    _syncWithBackend();
  }

  num get subtotal => state.fold(0, (sum, item) => sum + (item.price * item.quantity));
  num get deliveryFee => state.isEmpty ? 0 : 250;
  num get total => subtotal + deliveryFee;

  void _syncWithBackend() async {
    try {
      final items = state.map((e) => e.toMap()).toList();
      await _apiService.syncCart(items);
    } catch (_) {
      // Offline fallback
    }
  }
}

final cartProvider = NotifierProvider<CartNotifier, List<CartItem>>(CartNotifier.new);
