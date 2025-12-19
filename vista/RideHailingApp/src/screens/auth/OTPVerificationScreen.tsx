import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

interface OTPVerificationScreenProps {
  route: {
    params: {
      phone: string;
      sessionId: string;
      isNewUser?: boolean;
    };
  };
  navigation: any;
}

const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({ route, navigation }) => {
  const { phone, sessionId, isNewUser } = route.params;
  const { verifyOTP, resendOTP, getSessionStatus } = useAuth();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    // Start countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Check session status periodically
    const checkSession = async () => {
      try {
        const status = await getSessionStatus(sessionId);
        if (!status.valid) {
          Alert.alert(
            'Session Expired',
            'Your verification session has expired. Please request a new OTP.',
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ]
          );
        } else {
          setAttemptsRemaining(status.attemptsRemaining || 3);
        }
      } catch (error) {
        console.error('Error checking session status:', error);
      }
    };

    const interval = setInterval(checkSession, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [sessionId, getSessionStatus, navigation]);

  const handleOTPChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste scenario
      const pastedOTP = value.slice(0, 6).split('');
      const newOTP = [...otp];
      pastedOTP.forEach((digit, i) => {
        if (i < 6) newOTP[i] = digit;
      });
      setOtp(newOTP);
      
      // Focus on the last filled input or the next empty one
      const lastFilledIndex = Math.min(pastedOTP.length - 1, 5);
      inputRefs.current[lastFilledIndex]?.focus();
      return;
    }

    const newOTP = [...otp];
    newOTP[index] = value;
    setOtp(newOTP);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits are entered
    if (newOTP.every(digit => digit !== '') && newOTP.join('').length === 6) {
      setTimeout(() => handleVerifyOTP(newOTP.join('')), 100);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      // Focus previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpCode?: string) => {
    const codeToVerify = otpCode || otp.join('');
    
    if (codeToVerify.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the complete 6-digit verification code.');
      return;
    }

    setVerifying(true);

    try {
      let userData = undefined;
      
      // If it's a new user, we need to collect additional info
      if (isNewUser) {
        // For now, we'll use basic data. In a real app, you might want to 
        // navigate to a profile setup screen first
        userData = {
          name: 'User', // This should be collected from user
          user_type: 'rider', // Default to rider
        };
      }

      const result = await verifyOTP(sessionId, codeToVerify, userData);
      
      if (result.success) {
        // Navigate to appropriate screen based on user type
        if (isNewUser) {
          navigation.navigate('ProfileSetup', { user: result.user });
        } else {
          navigation.navigate('Main');
        }
      } else {
        // Handle verification failure
        const remaining = attemptsRemaining - 1;
        setAttemptsRemaining(remaining);
        
        if (remaining <= 0) {
          Alert.alert(
            'Too Many Attempts',
            'You have exceeded the maximum number of attempts. Please request a new OTP.',
            [
              {
                text: 'Request New OTP',
                onPress: handleResendOTP,
              },
            ]
          );
        } else {
          Alert.alert(
            'Incorrect OTP',
            `${result.error}\n\n${remaining} attempt(s) remaining.`
          );
        }
        
        // Clear OTP inputs
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend && countdown > 0) {
      Alert.alert('Wait', `Please wait ${countdown} seconds before requesting a new OTP.`);
      return;
    }

    setResending(true);

    try {
      const result = await resendOTP(sessionId);
      
      if (result.success) {
        Alert.alert('OTP Sent', 'A new verification code has been sent to your phone.');
        
        // Reset state
        setOtp(['', '', '', '', '', '']);
        setCountdown(60);
        setCanResend(false);
        setAttemptsRemaining(3);
        
        // Focus first input
        inputRefs.current[0]?.focus();
      } else {
        Alert.alert('Error', result.error || 'Failed to resend OTP. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maskPhoneNumber = (phone: string) => {
    if (phone.length < 4) return phone;
    const visible = phone.slice(-4);
    const masked = '*'.repeat(phone.length - 4);
    return masked + visible;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.iconContainer}>
            <Ionicons name="mail" size={60} color="#007AFF" />
          </View>
          
          <Text style={styles.title}>Enter verification code</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit code to {'\n'}
            <Text style={styles.phoneNumber}>{maskPhoneNumber(phone)}</Text>
          </Text>
        </View>

        {/* OTP Input */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                if (ref) inputRefs.current[index] = ref;
              }}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
              ]}
              value={digit}
              onChangeText={(value) => handleOTPChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!verifying}
            />
          ))}
        </View>

        {/* Status */}
        <View style={styles.statusContainer}>
          {attemptsRemaining < 3 && (
            <View style={styles.attemptsContainer}>
              <Ionicons name="warning" size={16} color="#FF9800" />
              <Text style={styles.attemptsText}>
                {attemptsRemaining} attempt(s) remaining
              </Text>
            </View>
          )}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            (otp.join('').length !== 6 || verifying) && styles.verifyButtonDisabled
          ]}
          onPress={() => handleVerifyOTP()}
          disabled={otp.join('').length !== 6 || verifying}
        >
          {verifying ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify & Continue</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code?</Text>
          
          {canResend ? (
            <TouchableOpacity 
              style={styles.resendButton} 
              onPress={handleResendOTP}
              disabled={resending}
            >
              {resending ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Text style={styles.resendButtonText}>Resend OTP</Text>
              )}
            </TouchableOpacity>
          ) : (
            <Text style={styles.countdownText}>
              Resend in {formatTime(countdown)}
            </Text>
          )}
        </View>

        {/* Help */}
        <View style={styles.helpContainer}>
          <Ionicons name="information-circle-outline" size={16} color="#666" />
          <Text style={styles.helpText}>
            Make sure you have good network coverage and check your spam folder
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 8,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneNumber: {
    fontWeight: '600',
    color: '#333',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  otpInputFilled: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  statusContainer: {
    minHeight: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  attemptsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  attemptsText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 6,
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  verifyButtonDisabled: {
    backgroundColor: '#999',
    elevation: 0,
    shadowOpacity: 0,
  },
  verifyButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  countdownText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 'auto',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});

export default OTPVerificationScreen;