import 'dart:async';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

enum MpesaStatus {
  initiating,
  waitingPin,
  verifying,
  success,
  failed,
  timeout,
}

class MpesaPaymentModal extends StatefulWidget {
  final String orderId;
  final String orderNumber;
  final int totalAmount;
  final String phoneNumber;
  final VoidCallback onPaymentSuccess;
  final VoidCallback? onCancel;

  const MpesaPaymentModal({
    super.key,
    required this.orderId,
    required this.orderNumber,
    required this.totalAmount,
    required this.phoneNumber,
    required this.onPaymentSuccess,
    this.onCancel,
  });

  static Future<void> show({
    required BuildContext context,
    required String orderId,
    required String orderNumber,
    required int totalAmount,
    required String phoneNumber,
    required VoidCallback onPaymentSuccess,
    VoidCallback? onCancel,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: false,
      enableDrag: false,
      backgroundColor: Colors.transparent,
      builder: (ctx) => MpesaPaymentModal(
        orderId: orderId,
        orderNumber: orderNumber,
        totalAmount: totalAmount,
        phoneNumber: phoneNumber,
        onPaymentSuccess: onPaymentSuccess,
        onCancel: onCancel,
      ),
    );
  }

  @override
  State<MpesaPaymentModal> createState() => _MpesaPaymentModalState();
}

class _MpesaPaymentModalState extends State<MpesaPaymentModal>
    with SingleTickerProviderStateMixin {
  final ApiService _apiService = ApiService();

  MpesaStatus _status = MpesaStatus.initiating;
  String _message = 'Sending STK Push prompt to your phone...';
  String? _checkoutRequestId;
  String? _errorMessage;

  Timer? _pollTimer;
  Timer? _countdownTimer;
  int _secondsRemaining = 70;

  late AnimationController _animController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.95, end: 1.08).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );

    _startMpesaPayment();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _countdownTimer?.cancel();
    _animController.dispose();
    super.dispose();
  }

  Future<void> _startMpesaPayment() async {
    setState(() {
      _status = MpesaStatus.initiating;
      _message = 'Sending Secure STK Push prompt to ${widget.phoneNumber}...';
      _errorMessage = null;
      _secondsRemaining = 70;
    });

    _pollTimer?.cancel();
    _countdownTimer?.cancel();

    try {
      final res = await _apiService.processMpesaPayment(
        orderId: widget.orderId,
        phoneNumber: widget.phoneNumber,
      );

      final checkoutId = res['checkoutRequestId']?.toString() ??
          (res['data'] is Map ? res['data']['checkoutRequestId']?.toString() : null);

      if (checkoutId != null && checkoutId.isNotEmpty) {
        _checkoutRequestId = checkoutId;
        if (!mounted) return;
        setState(() {
          _status = MpesaStatus.waitingPin;
          _message = 'Please check your phone and enter your M-Pesa PIN.';
        });
        _startCountdown();
        _startPolling(checkoutId);
      } else {
        // Gateway busy or queued
        final msg = res['message']?.toString() ?? 'STK push queued. Please wait...';
        if (!mounted) return;
        setState(() {
          _status = MpesaStatus.waitingPin;
          _message = msg;
        });
        _startCountdown();
      }
    } on DioException catch (e) {
      if (!mounted) return;
      final serverMsg = e.response?.data is Map
          ? e.response?.data['message']?.toString()
          : null;
      setState(() {
        _status = MpesaStatus.failed;
        _errorMessage = serverMsg ?? e.message ?? 'Failed to send STK Push prompt.';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _status = MpesaStatus.failed;
        _errorMessage = 'Error initiating payment: ${e.toString()}';
      });
    }
  }

  void _startCountdown() {
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_secondsRemaining <= 1) {
        timer.cancel();
        _pollTimer?.cancel();
        setState(() {
          _status = MpesaStatus.timeout;
          _message = 'Request timed out. Please verify your phone is unlocked and retry.';
        });
      } else {
        setState(() {
          _secondsRemaining--;
        });
      }
    });
  }

  void _startPolling(String checkoutId) {
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (timer) async {
      if (!mounted) {
        timer.cancel();
        return;
      }

      try {
        final statusRes = await _apiService.checkMpesaPaymentStatus(checkoutId);
        final status = (statusRes['status'] as String?)?.toUpperCase();
        final paymentStatus = (statusRes['paymentStatus'] as String?)?.toLowerCase();

        if (status == 'SUCCESS' || paymentStatus == 'paid') {
          timer.cancel();
          _countdownTimer?.cancel();
          if (!mounted) return;
          setState(() {
            _status = MpesaStatus.success;
            _message = 'Payment Confirmed! Asante sana.';
          });

          // Delay slightly so the user sees the confirmation animation
          await Future.delayed(const Duration(milliseconds: 1400));
          if (!mounted) return;
          Navigator.of(context).pop();
          widget.onPaymentSuccess();
        } else if (status == 'FAILED' || paymentStatus == 'failed') {
          timer.cancel();
          _countdownTimer?.cancel();
          if (!mounted) return;
          setState(() {
            _status = MpesaStatus.failed;
            _errorMessage = statusRes['message']?.toString() ??
                'Transaction was cancelled or declined on your phone.';
          });
        }
      } catch (err) {
        debugPrint('Polling M-Pesa error: $err');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      margin: EdgeInsets.only(bottom: bottomInset),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Top Drag Handle
            Center(
              child: Container(
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Header with Brand and Order Number
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00A34E).withAlpha(25),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.phone_android, size: 16, color: Color(0xFF00A34E)),
                          SizedBox(width: 6),
                          Text(
                            'M-PESA EXPRESS',
                            style: TextStyle(
                              color: Color(0xFF00A34E),
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                Text(
                  widget.orderNumber.isNotEmpty ? '#${widget.orderNumber}' : '',
                  style: const TextStyle(
                    color: AppTheme.textMuted,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Animated Status Visual
            _buildStatusVisual(),
            const SizedBox(height: 20),

            // Amount Header
            Text(
              'KSh ${widget.totalAmount}',
              style: const TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: AppTheme.textMain,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Phone: ${widget.phoneNumber}',
              style: const TextStyle(
                fontSize: 14,
                color: AppTheme.textMuted,
                fontWeight: FontWeight.w500,
              ),
            ),
            if (_checkoutRequestId != null) ...[
              const SizedBox(height: 2),
              Text(
                'Request ID: $_checkoutRequestId',
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey.shade500,
                  fontFamily: 'monospace',
                ),
              ),
            ],
            const SizedBox(height: 16),

            // Status Description
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: _getStatusBgColor(),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: _getStatusBorderColor()),
              ),
              child: Row(
                children: [
                  Icon(_getStatusIcon(), size: 20, color: _getStatusColor()),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _errorMessage ?? _message,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: _getStatusColor(),
                        height: 1.3,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Countdown Timer (if waiting)
            if (_status == MpesaStatus.waitingPin || _status == MpesaStatus.initiating) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.timer_outlined, size: 16, color: AppTheme.textMuted),
                  const SizedBox(width: 6),
                  Text(
                    'Prompt expires in ${_secondsRemaining}s',
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppTheme.textMuted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
            ],

            // Action Buttons
            if (_status == MpesaStatus.failed || _status == MpesaStatus.timeout) ...[
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        Navigator.of(context).pop();
                        widget.onCancel?.call();
                      },
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _startMpesaPayment,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00A34E),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Retry STK Push', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ] else if (_status == MpesaStatus.success) ...[
              const SizedBox(height: 8),
              const Text(
                'Redirecting to order tracking...',
                style: TextStyle(color: AppTheme.primaryGreen, fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ] else ...[
              TextButton(
                onPressed: () {
                  _pollTimer?.cancel();
                  _countdownTimer?.cancel();
                  Navigator.of(context).pop();
                  widget.onCancel?.call();
                },
                child: const Text(
                  'Cancel / Pay Later',
                  style: TextStyle(color: AppTheme.textMuted, fontWeight: FontWeight.w600),
                ),
              ),
            ],

            const SizedBox(height: 8),
            // Security trust badge
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.shield_outlined, size: 14, color: Colors.grey.shade400),
                const SizedBox(width: 6),
                Text(
                  'Protected by Safaricom Daraja M-Pesa API',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusVisual() {
    if (_status == MpesaStatus.success) {
      return Container(
        width: 84,
        height: 84,
        decoration: BoxDecoration(
          color: const Color(0xFF00A34E).withAlpha(30),
          shape: BoxShape.circle,
        ),
        child: const Center(
          child: Icon(Icons.check_circle_rounded, color: Color(0xFF00A34E), size: 56),
        ),
      );
    }

    if (_status == MpesaStatus.failed || _status == MpesaStatus.timeout) {
      return Container(
        width: 84,
        height: 84,
        decoration: BoxDecoration(
          color: Colors.red.withAlpha(25),
          shape: BoxShape.circle,
        ),
        child: const Center(
          child: Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 56),
        ),
      );
    }

    // Pulsing Waiting / PIN Visual
    return ScaleTransition(
      scale: _pulseAnimation,
      child: Container(
        width: 84,
        height: 84,
        decoration: BoxDecoration(
          color: const Color(0xFF00A34E).withAlpha(25),
          shape: BoxShape.circle,
        ),
        child: const Center(
          child: SizedBox(
            width: 44,
            height: 44,
            child: CircularProgressIndicator(
              strokeWidth: 3.5,
              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00A34E)),
            ),
          ),
        ),
      ),
    );
  }

  Color _getStatusColor() {
    switch (_status) {
      case MpesaStatus.success:
        return const Color(0xFF00A34E);
      case MpesaStatus.failed:
      case MpesaStatus.timeout:
        return Colors.red.shade700;
      default:
        return AppTheme.primaryGreen;
    }
  }

  Color _getStatusBgColor() {
    switch (_status) {
      case MpesaStatus.success:
        return const Color(0xFF00A34E).withAlpha(20);
      case MpesaStatus.failed:
      case MpesaStatus.timeout:
        return Colors.red.withAlpha(20);
      default:
        return AppTheme.lightGreenBg;
    }
  }

  Color _getStatusBorderColor() {
    switch (_status) {
      case MpesaStatus.success:
        return const Color(0xFF00A34E).withAlpha(60);
      case MpesaStatus.failed:
      case MpesaStatus.timeout:
        return Colors.red.withAlpha(60);
      default:
        return AppTheme.primaryGreen.withAlpha(30);
    }
  }

  IconData _getStatusIcon() {
    switch (_status) {
      case MpesaStatus.success:
        return Icons.check_circle_outline;
      case MpesaStatus.failed:
        return Icons.cancel_outlined;
      case MpesaStatus.timeout:
        return Icons.hourglass_empty;
      default:
        return Icons.lock_clock;
    }
  }
}
