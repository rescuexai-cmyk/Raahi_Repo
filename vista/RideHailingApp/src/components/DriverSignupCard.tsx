import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

interface DriverSignupCardProps {
  visible: boolean;
  onClose: () => void;
  onSignupComplete: (driverData: DriverSignupData) => void;
  onDecline: () => void;
}

export interface DriverSignupData {
  name: string;
  phone: string;
  address: string;
  vehicleNumber: string;
  vehicleName: string;
  vehicleColor: string;
}

const DriverSignupCard: React.FC<DriverSignupCardProps> = ({
  visible,
  onClose,
  onSignupComplete,
  onDecline,
}) => {
  const { user } = useAuth();
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  
  // State management
  const [currentStep, setCurrentStep] = useState<'prompt' | 'details'>('prompt');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<DriverSignupData>({
    name: user?.name || '',
    phone: user?.phone || '',
    address: '',
    vehicleNumber: '',
    vehicleName: '',
    vehicleColor: '',
  });
  
  // Validation errors
  const [errors, setErrors] = useState<Partial<DriverSignupData>>({});

  // Vehicle color options
  const vehicleColors = [
    'White', 'Black', 'Silver', 'Grey', 'Red', 'Blue', 'Green', 'Yellow', 'Brown', 'Orange'
  ];

  React.useEffect(() => {
    if (visible) {
      showCard();
    } else {
      hideCard();
    }
  }, [visible]);

  const showCard = () => {
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideCard = () => {
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePromptYes = () => {
    setCurrentStep('details');
  };

  const handlePromptNo = () => {
    onDecline();
    onClose();
  };

  const updateFormData = (field: keyof DriverSignupData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<DriverSignupData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.vehicleNumber.trim()) {
      newErrors.vehicleNumber = 'Vehicle number is required';
    } else if (!/^[A-Z]{2}[\d]{1,2}[A-Z]{1,3}[\d]{4}$/.test(formData.vehicleNumber.toUpperCase().replace(/\s/g, ''))) {
      newErrors.vehicleNumber = 'Please enter a valid vehicle number (e.g., KA05AB1234)';
    }

    if (!formData.vehicleName.trim()) {
      newErrors.vehicleName = 'Vehicle name is required';
    }

    if (!formData.vehicleColor.trim()) {
      newErrors.vehicleColor = 'Vehicle color is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    setIsLoading(true);

    try {
      // Format vehicle number
      const formattedData = {
        ...formData,
        vehicleNumber: formData.vehicleNumber.toUpperCase().replace(/\s/g, ''),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        vehicleName: formData.vehicleName.trim(),
        vehicleColor: formData.vehicleColor.trim(),
      };

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✅ Driver signup completed:', formattedData);
      
      Alert.alert(
        '🎉 Registration Successful!',
        'Your driver registration has been submitted. You can now start driving with Raahi!',
        [
          {
            text: 'Start Driving',
            onPress: () => {
              onSignupComplete(formattedData);
              onClose();
            }
          }
        ]
      );

    } catch (error) {
      console.error('❌ Error during driver signup:', error);
      Alert.alert(
        'Registration Failed',
        'There was an error processing your registration. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderPromptCard = () => (
    <View style={styles.promptContainer}>
      <View style={styles.promptHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="car" size={48} color="#22C55E" />
        </View>
        <Text style={styles.promptTitle}>Drive with Raahi</Text>
        <Text style={styles.promptSubtitle}>
          Do you want to sign up as a driver and start earning money with Raahi?
        </Text>
      </View>

      <View style={styles.benefitsContainer}>
        <View style={styles.benefitItem}>
          <Ionicons name="cash" size={20} color="#22C55E" />
          <Text style={styles.benefitText}>Earn money in your free time</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="time" size={20} color="#22C55E" />
          <Text style={styles.benefitText}>Flexible working hours</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="people" size={20} color="#22C55E" />
          <Text style={styles.benefitText}>Meet new people</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="shield-checkmark" size={20} color="#22C55E" />
          <Text style={styles.benefitText}>Safe and secure platform</Text>
        </View>
      </View>

      <View style={styles.promptActions}>
        <TouchableOpacity 
          style={styles.noButton}
          onPress={handlePromptNo}
        >
          <Text style={styles.noButtonText}>Not Now</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.yesButton}
          onPress={handlePromptYes}
        >
          <Text style={styles.yesButtonText}>Yes, Sign Me Up!</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDetailsForm = () => (
    <KeyboardAvoidingView 
      style={styles.detailsContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.detailsHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setCurrentStep('prompt')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.detailsTitle}>Driver Registration</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person" size={20} color="#22C55E" />
          <Text style={styles.sectionTitle}>Personal Information</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={[styles.textInput, errors.name ? styles.inputError : null]}
            placeholder="Enter your full name"
            value={formData.name}
            onChangeText={(text) => updateFormData('name', text)}
            autoCapitalize="words"
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={[styles.textInput, errors.phone ? styles.inputError : null]}
            placeholder="+91 9876543210"
            value={formData.phone}
            onChangeText={(text) => updateFormData('phone', text)}
            keyboardType="phone-pad"
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Address</Text>
          <TextInput
            style={[styles.textInput, styles.textArea, errors.address ? styles.inputError : null]}
            placeholder="Enter your complete address"
            value={formData.address}
            onChangeText={(text) => updateFormData('address', text)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
        </View>

        <View style={styles.sectionHeader}>
          <Ionicons name="car-sport" size={20} color="#22C55E" />
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Vehicle Number</Text>
          <TextInput
            style={[styles.textInput, errors.vehicleNumber ? styles.inputError : null]}
            placeholder="KA05AB1234"
            value={formData.vehicleNumber}
            onChangeText={(text) => updateFormData('vehicleNumber', text)}
            autoCapitalize="characters"
            maxLength={15}
          />
          {errors.vehicleNumber && <Text style={styles.errorText}>{errors.vehicleNumber}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Vehicle Name/Model</Text>
          <TextInput
            style={[styles.textInput, errors.vehicleName ? styles.inputError : null]}
            placeholder="e.g., Maruti Swift, Honda City"
            value={formData.vehicleName}
            onChangeText={(text) => updateFormData('vehicleName', text)}
            autoCapitalize="words"
          />
          {errors.vehicleName && <Text style={styles.errorText}>{errors.vehicleName}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Vehicle Color</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.colorSelector}
          >
            {vehicleColors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  formData.vehicleColor === color && styles.colorOptionSelected
                ]}
                onPress={() => updateFormData('vehicleColor', color)}
              >
                <Text style={[
                  styles.colorText,
                  formData.vehicleColor === color && styles.colorTextSelected
                ]}>
                  {color}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {errors.vehicleColor && <Text style={styles.errorText}>{errors.vehicleColor}</Text>}
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <Text style={styles.submitButtonText}>Registering...</Text>
          ) : (
            <Text style={styles.submitButtonText}>Complete Registration</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: overlayAnim,
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.overlayTouch}
          activeOpacity={1}
          onPress={currentStep === 'prompt' ? onClose : undefined}
        />
        
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {currentStep === 'prompt' ? renderPromptCard() : renderDetailsForm()}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouch: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: screenHeight * 0.9,
    minHeight: screenHeight * 0.4,
  },
  // Prompt Card Styles
  promptContainer: {
    padding: 24,
    paddingBottom: 32,
  },
  promptHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  promptTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  promptSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  benefitsContainer: {
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  promptActions: {
    flexDirection: 'row',
    gap: 12,
  },
  noButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  noButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  yesButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    alignItems: 'center',
  },
  yesButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // Details Form Styles
  detailsContainer: {
    flex: 1,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formScroll: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  inputError: {
    borderColor: '#F44336',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  colorSelector: {
    marginTop: 8,
  },
  colorOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
    backgroundColor: '#FAFAFA',
  },
  colorOptionSelected: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  colorText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  colorTextSelected: {
    color: '#FFF',
  },
  submitButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default DriverSignupCard;