import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/router/app_routes.dart';
import '../../providers/auth_provider.dart';

class OTPVerificationScreen extends ConsumerStatefulWidget {
  final String phone;
  final bool isNewUser;

  const OTPVerificationScreen({
    super.key,
    required this.phone,
    this.isNewUser = false,
  });

  @override
  ConsumerState<OTPVerificationScreen> createState() => _OTPVerificationScreenState();
}

class _OTPVerificationScreenState extends ConsumerState<OTPVerificationScreen> {
  final List<TextEditingController> _controllers = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  bool _isLoading = false;
  int _resendTimer = 30;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startResendTimer();
  }

  @override
  void dispose() {
    for (final controller in _controllers) {
      controller.dispose();
    }
    for (final node in _focusNodes) {
      node.dispose();
    }
    _timer?.cancel();
    super.dispose();
  }

  void _startResendTimer() {
    _resendTimer = 30;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_resendTimer > 0) {
        setState(() => _resendTimer--);
      } else {
        timer.cancel();
      }
    });
  }

  String get _otp => _controllers.map((c) => c.text).join();

  Future<void> _verifyOTP() async {
    if (_otp.length != 6) {
      _showError('Please enter the complete OTP');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final authNotifier = ref.read(authStateProvider.notifier);
      final result = await authNotifier.verifyOTP(widget.phone, _otp);

      if (mounted) {
        setState(() => _isLoading = false);

        if (result.success) {
          context.go(AppRoutes.home);
        } else {
          _showError(result.error ?? 'Verification failed');
          _clearOTP();
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        _showError(e.toString());
        _clearOTP();
      }
    }
  }

  Future<void> _resendOTP() async {
    if (_resendTimer > 0) return;

    try {
      final authNotifier = ref.read(authStateProvider.notifier);
      final result = await authNotifier.resendOTP(widget.phone);

      if (mounted) {
        if (result.success) {
          _showSuccess('OTP sent successfully');
          _startResendTimer();
          _clearOTP();
        } else {
          _showError(result.error ?? 'Failed to resend OTP');
        }
      }
    } catch (e) {
      if (mounted) {
        _showError(e.toString());
      }
    }
  }

  void _clearOTP() {
    for (final controller in _controllers) {
      controller.clear();
    }
    _focusNodes[0].requestFocus();
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: AppColors.error),
    );
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: AppColors.success),
    );
  }

  void _onOTPChanged(String value, int index) {
    if (value.isNotEmpty && index < 5) {
      _focusNodes[index + 1].requestFocus();
    } else if (value.isNotEmpty && index == 5) {
      _focusNodes[index].unfocus();
      _verifyOTP();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 24),
              Center(
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(40),
                  ),
                  child: const Icon(Icons.message_outlined, size: 40, color: AppColors.primary),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Verify Phone Number',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'We sent a 6-digit code to\n${widget.phone}',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: AppColors.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 40),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: List.generate(6, (index) {
                  return SizedBox(
                    width: 48,
                    height: 56,
                    child: TextFormField(
                      controller: _controllers[index],
                      focusNode: _focusNodes[index],
                      textAlign: TextAlign.center,
                      keyboardType: TextInputType.number,
                      maxLength: 1,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        counterText: '',
                        contentPadding: EdgeInsets.zero,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.primary, width: 2),
                        ),
                        filled: true,
                        fillColor: AppColors.inputBackground,
                      ),
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      onChanged: (value) => _onOTPChanged(value, index),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _verifyOTP,
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.white)),
                      )
                    : const Text('Verify'),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text("Didn't receive the code? ", style: Theme.of(context).textTheme.bodyMedium),
                  TextButton(
                    onPressed: _resendTimer > 0 ? null : _resendOTP,
                    child: Text(
                      _resendTimer > 0 ? 'Resend in ${_resendTimer}s' : 'Resend',
                      style: TextStyle(
                        color: _resendTimer > 0 ? AppColors.textSecondary : AppColors.secondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
