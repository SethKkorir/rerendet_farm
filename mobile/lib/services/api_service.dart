import 'dart:convert';
import 'dart:io' show Platform;
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  // Automatically detects the appropriate loopback IP based on platform & environment
  static String get defaultBaseUrl {
    const envUrl = String.fromEnvironment('API_BASE_URL');
    if (envUrl.isNotEmpty) return envUrl;
    if (kIsWeb) return 'http://localhost:5004/api';
    try {
      if (Platform.isAndroid) {
        return 'http://192.168.0.162:5004/api';
      }
    } catch (_) {}
    return 'http://127.0.0.1:5004/api';
  }

  // Production Cloudinary store logo from MongoDB
  static const String defaultStoreLogo =
      'https://res.cloudinary.com/dln2pifwf/image/upload/v1779294419/rerendet-coffee/products/pb7indr2rhu7fnhh3jjh.png';

  static String getStoreLogo(Map<String, dynamic>? settings) {
    final backendLogo = settings?['store']?['logo']?.toString();
    if (backendLogo != null && backendLogo.trim().isNotEmpty) {
      return backendLogo.trim();
    }
    return defaultStoreLogo;
  }

  // Override baseURL if connecting to custom LAN IP or production server
  static String activeBaseUrl = defaultBaseUrl;

  late final Dio _dio;
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  ApiService({String? customBaseUrl}) {
    final url = customBaseUrl ?? activeBaseUrl;
    _dio = Dio(BaseOptions(
      baseUrl: url,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _secureStorage.read(key: 'jwt_token');
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        return handler.next(e);
      },
    ));
  }

  // ── Public Store Settings, Logo & Rules ────────────────────────────────────
  Future<Map<String, dynamic>> getPublicSettings() async {
    try {
      final response = await _dio.get('/settings/public');
      if (response.data is Map && response.data['data'] != null) {
        return Map<String, dynamic>.from(response.data['data']);
      }
      return Map<String, dynamic>.from(response.data);
    } catch (e) {
      debugPrint('Error loading public settings: $e');
      rethrow;
    }
  }

  // ── Authentication ────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _dio.post('/auth/customer/login', data: {
      'email': email.trim(),
      'password': password,
    });

    final resData = Map<String, dynamic>.from(response.data);
    final dataObj = resData['data'];

    String? token;
    Map<String, dynamic>? user;

    if (dataObj is Map) {
      token = dataObj['token']?.toString();
      if (dataObj['user'] is Map) {
        user = Map<String, dynamic>.from(dataObj['user']);
      }
    } else if (resData['token'] != null) {
      token = resData['token']?.toString();
      if (resData['user'] is Map) {
        user = Map<String, dynamic>.from(resData['user']);
      }
    }

    if (token != null && token.isNotEmpty) {
      await _secureStorage.write(key: 'jwt_token', value: token);
    }
    if (user != null) {
      await _secureStorage.write(key: 'user_profile', value: jsonEncode(user));
    }

    return resData;
  }

  Future<Map<String, dynamic>> verify2FA(String email, String code) async {
    final response = await _dio.post('/auth/customer/verify-2fa', data: {
      'email': email.trim(),
      'code': code.trim(),
    });

    final resData = Map<String, dynamic>.from(response.data);
    final dataObj = resData['data'];

    String? token;
    Map<String, dynamic>? user;

    if (dataObj is Map) {
      token = dataObj['token']?.toString();
      if (dataObj['user'] is Map) {
        user = Map<String, dynamic>.from(dataObj['user']);
      }
    }

    if (token != null && token.isNotEmpty) {
      await _secureStorage.write(key: 'jwt_token', value: token);
    }
    if (user != null) {
      await _secureStorage.write(key: 'user_profile', value: jsonEncode(user));
    }

    return resData;
  }

  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    // Split full name into firstName & lastName to satisfy backend validation
    final parts = name.trim().split(RegExp(r'\s+'));
    final firstName = parts.isNotEmpty ? parts.first : name;
    final lastName = parts.length > 1 ? parts.sublist(1).join(' ') : '.';

    final response = await _dio.post('/auth/customer/register', data: {
      'firstName': firstName,
      'lastName': lastName,
      'email': email.trim(),
      'phone': phone?.trim() ?? '',
      'password': password,
    });

    final resData = Map<String, dynamic>.from(response.data);
    final dataObj = resData['data'];

    String? token;
    Map<String, dynamic>? user;

    if (dataObj is Map) {
      token = dataObj['token']?.toString();
      if (dataObj['user'] is Map) {
        user = Map<String, dynamic>.from(dataObj['user']);
      }
    }

    if (token != null && token.isNotEmpty) {
      await _secureStorage.write(key: 'jwt_token', value: token);
    }
    if (user != null) {
      await _secureStorage.write(key: 'user_profile', value: jsonEncode(user));
    }

    return resData;
  }

  Future<void> logout() async {
    try {
      await _dio.post('/auth/logout');
    } catch (_) {
      // Ignore network errors on logout to allow offline sign out
    } finally {
      await _secureStorage.delete(key: 'jwt_token');
      await _secureStorage.delete(key: 'user_profile');
    }
  }

  Future<Map<String, dynamic>?> getCurrentUser() async {
    try {
      final response = await _dio.get('/auth/me');
      final resData = response.data;
      if (resData is Map && resData['data'] is Map) {
        final user = Map<String, dynamic>.from(resData['data']);
        await _secureStorage.write(key: 'user_profile', value: jsonEncode(user));
        return user;
      }
      return null;
    } catch (e) {
      // Fallback to locally stored profile if offline
      final cached = await _secureStorage.read(key: 'user_profile');
      if (cached != null) {
        return jsonDecode(cached) as Map<String, dynamic>;
      }
      rethrow;
    }
  }

  Future<String?> getSavedToken() async {
    return await _secureStorage.read(key: 'jwt_token');
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> profileData) async {
    final response = await _dio.put('/auth/profile', data: profileData);
    final resData = Map<String, dynamic>.from(response.data);
    final dataObj = resData['data'];
    if (dataObj is Map) {
      await _secureStorage.write(key: 'user_profile', value: jsonEncode(dataObj));
    }
    return resData;
  }

  Future<Map<String, dynamic>> toggle2FA({required bool enabled, required String password}) async {
    final response = await _dio.put('/auth/toggle-2fa', data: {
      'enabled': enabled,
      'password': password,
    });
    return Map<String, dynamic>.from(response.data);
  }

  Future<Map<String, dynamic>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final response = await _dio.put('/auth/change-password', data: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
    return Map<String, dynamic>.from(response.data);
  }

  // ── Products & Catalog ───────────────────────────────────────────────────
  Future<List<dynamic>> getProducts({String? category, String? search}) async {
    final queryParams = <String, dynamic>{
      'limit': 50,
    };
    if (category != null && category.isNotEmpty && category.toLowerCase() != 'all') {
      queryParams['category'] = category.toLowerCase();
    }
    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }

    final response = await _dio.get('/products', queryParameters: queryParams);
    final resData = response.data;

    if (resData is Map) {
      final dataField = resData['data'];
      if (dataField is Map && dataField['products'] is List) {
        return dataField['products'] as List<dynamic>;
      }
      if (dataField is List) {
        return dataField;
      }
      if (resData['products'] is List) {
        return resData['products'] as List<dynamic>;
      }
    }
    return [];
  }

  Future<List<String>> getCategories() async {
    try {
      final response = await _dio.get('/products', queryParameters: {'page': 1, 'limit': 1});
      final resData = response.data;
      if (resData is Map && resData['data'] is Map) {
        final cats = resData['data']['categories'];
        if (cats is List) {
          final list = cats.map((e) => e.toString()).toList();
          return ['All', ...list];
        }
      }
    } catch (_) {}
    return ['All', 'Coffee', 'Ground Coffee', 'Beans', 'Merchandise'];
  }

  Future<Map<String, dynamic>> getProductById(String id) async {
    final response = await _dio.get('/products/$id');
    final resData = response.data;
    if (resData is Map && resData['data'] is Map) {
      return Map<String, dynamic>.from(resData['data']);
    }
    return Map<String, dynamic>.from(resData);
  }

  // ── Cart API ─────────────────────────────────────────────────────────────
  Future<List<dynamic>> getCart() async {
    final response = await _dio.get('/auth/cart');
    final resData = response.data;
    if (resData is Map && resData['data'] is List) {
      return resData['data'] as List<dynamic>;
    }
    return [];
  }

  Future<Map<String, dynamic>> syncCart(List<Map<String, dynamic>> items) async {
    // Backend expects { "cart": [...] }
    final response = await _dio.post('/auth/cart', data: {'cart': items});
    return Map<String, dynamic>.from(response.data);
  }

  // ── Orders API ───────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> createOrder(Map<String, dynamic> orderPayload) async {
    final response = await _dio.post('/orders', data: orderPayload);
    return Map<String, dynamic>.from(response.data);
  }

  Future<List<dynamic>> getMyOrders() async {
    final response = await _dio.get('/orders/my');
    final resData = response.data;
    if (resData is Map) {
      final dataField = resData['data'];
      if (dataField is Map && dataField['orders'] is List) {
        return dataField['orders'] as List<dynamic>;
      }
      if (dataField is List) {
        return dataField;
      }
      if (resData['orders'] is List) {
        return resData['orders'] as List<dynamic>;
      }
    }
    return [];
  }

  Future<Map<String, dynamic>> getOrderById(String orderId) async {
    final response = await _dio.get('/orders/$orderId');
    final resData = response.data;
    if (resData is Map && resData['data'] is Map) {
      return Map<String, dynamic>.from(resData['data']);
    }
    return Map<String, dynamic>.from(resData);
  }

  Future<Map<String, dynamic>> trackOrderPublic(String orderId) async {
    final response = await _dio.get('/orders/track/$orderId');
    final resData = response.data;
    if (resData is Map && resData['data'] is Map) {
      return Map<String, dynamic>.from(resData['data']);
    }
    return Map<String, dynamic>.from(resData);
  }

  // ── Payments API (M-Pesa Express & Card) ──────────────────────────────────
  Future<Map<String, dynamic>> processMpesaPayment({
    required String orderId,
    required String phoneNumber,
  }) async {
    final response = await _dio.post('/payments/mpesa/stk', data: {
      'orderId': orderId,
      'phoneNumber': phoneNumber,
    });
    return Map<String, dynamic>.from(response.data);
  }

  Future<Map<String, dynamic>> checkMpesaPaymentStatus(String checkoutRequestId) async {
    final response = await _dio.get('/payments/mpesa/status/$checkoutRequestId');
    return Map<String, dynamic>.from(response.data);
  }

  // ── Static Helper: Extract Image & Pricing from Backend Schema ─────────────
  static String getProductImageUrl(dynamic product) {
    if (product == null) return '';
    if (product is Map) {
      if (product['images'] is List && (product['images'] as List).isNotEmpty) {
        final firstImg = product['images'][0];
        if (firstImg is Map && firstImg['url'] != null && firstImg['url'].toString().isNotEmpty) {
          return firstImg['url'].toString();
        } else if (firstImg is String && firstImg.isNotEmpty) {
          return firstImg;
        }
      }
      if (product['imageUrl'] != null && product['imageUrl'].toString().isNotEmpty) {
        return product['imageUrl'].toString();
      }
      if (product['image'] != null && product['image'].toString().isNotEmpty) {
        return product['image'].toString();
      }
    }
    return 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=500&auto=format&fit=crop';
  }

  static num getProductPrice(dynamic product) {
    if (product == null) return 0;
    if (product is Map) {
      if (product['price'] != null) {
        final p = num.tryParse(product['price'].toString());
        if (p != null) return p;
      }
      if (product['sizes'] is List && (product['sizes'] as List).isNotEmpty) {
        final firstSize = product['sizes'][0];
        if (firstSize is Map && firstSize['price'] != null) {
          final p = num.tryParse(firstSize['price'].toString());
          if (p != null) return p;
        }
      }
    }
    return 0;
  }
}
