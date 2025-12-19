import React, { useState, useRef } from 'react';
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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

interface PhoneNumberScreenProps {
  navigation: any;
}

const PhoneNumberScreen: React.FC<PhoneNumberScreenProps> = ({ navigation }) => {
  const { requestOTP, loading } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [requesting, setRequesting] = useState(false);
  const phoneInputRef = useRef<TextInput>(null);

  const formatPhoneNumber = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    
    // Limit to 10 digits for Indian mobile numbers
    const limited = cleaned.slice(0, 10);
    
    // Format as XXX XXX XXXX
    if (limited.length >= 6) {
      return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`;
    } else if (limited.length >= 3) {
      return `${limited.slice(0, 3)} ${limited.slice(3)}`;
    }
    return limited;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 && /^[6-9]/.test(cleaned);
  };

  const handleContinue = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Invalid Input', 'Please enter your phone number.');
      return;
    }

    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    
    if (!validatePhoneNumber(cleanedPhone)) {
      Alert.alert(
        'Invalid Phone Number', 
        'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
      );
      return;
    }

    setRequesting(true);

    try {
      const result = await requestOTP(cleanedPhone);
      
      if (result.success) {
        navigation.navigate('OTPVerification', {
          phone: `+91${cleanedPhone}`,
          sessionId: result.sessionId,
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to send OTP. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
  };

  const openPrivacyPolicy = () => {
    // Open privacy policy URL
    Linking.openURL('https://your-app.com/privacy-policy');
  };

  const openTermsOfService = () => {
    // Open terms of service URL
    Linking.openURL('https://your-app.com/terms-of-service');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="phone-portrait" size={60} color="#007AFF" />
          </View>
          <Text style={styles.title}>Enter your mobile number</Text>
          <Text style={styles.subtitle}>
            We'll send you a verification code to confirm your number
          </Text>
        </View>

        {/* Phone Input */}
        <View style={styles.inputContainer}>
          <View style={styles.phoneInputContainer}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
            </View>
            <TextInput
              ref={phoneInputRef}
              style={styles.phoneInput}
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              placeholder="Enter mobile number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              returnKeyType="done"
              maxLength={13} // XXX XXX XXXX format
              autoFocus
              editable={!requesting}
            />
          </View>
          
          {phoneNumber.length > 0 && (
            <View style={styles.phoneInfo}>
              <Ionicons name="information-circle-outline" size={16} color="#666" />
              <Text style={styles.phoneInfoText}>
                We'll send an SMS with a 6-digit verification code
              </Text>
            </View>
          )}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!validatePhoneNumber(phoneNumber.replace(/\D/g, '')) || requesting) && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!validatePhoneNumber(phoneNumber.replace(/\D/g, '')) || requesting}
        >
          {requesting ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" style={styles.continueIcon} />
            </>
          )}
        </TouchableOpacity>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Why use phone verification?</Text>
          
          <View style={styles.feature}>
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            <Text style={styles.featureText}>Secure and fast authentication</Text>
          </View>
          
          <View style={styles.feature}>
            <Ionicons name="time" size={20} color="#FF9800" />
            <Text style={styles.featureText}>Quick sign in for return users</Text>
          </View>
          
          <View style={styles.feature}>
            <Ionicons name="lock-closed" size={20} color="#2196F3" />
            <Text style={styles.featureText}>No passwords to remember</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our{' '}
            <Text style={styles.linkText} onPress={openTermsOfService}>
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text style={styles.linkText} onPress={openPrivacyPolicy}>
              Privacy Policy
            </Text>
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
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginVertical: 32,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  countryCode: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#F5F5F5',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  phoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  phoneInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  continueButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  continueButtonDisabled: {
    backgroundColor: '#999',
    elevation: 0,
    shadowOpacity: 0,
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  continueIcon: {
    marginLeft: 8,
  },
  featuresContainer: {
    marginVertical: 32,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  footer: {
    marginTop: 'auto',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default PhoneNumberScreen;