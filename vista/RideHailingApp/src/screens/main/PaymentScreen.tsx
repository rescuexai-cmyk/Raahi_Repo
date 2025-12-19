import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { paymentService, PaymentRecord } from '../../services/paymentService';
import { getRideById } from '../../services/rideService';

interface PaymentScreenProps {
  route: {
    params: {
      rideId: string;
      amount: number;
      rideDetails?: any;
    };
  };
  navigation: any;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'upi' | 'netbanking' | 'wallet' | 'cash';
  name: string;
  icon: string;
  details?: string;
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({ route, navigation }) => {
  const { user } = useAuth();
  const { rideId, amount, rideDetails } = route.params;
  
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('razorpay');
  const [ride, setRide] = useState<any>(rideDetails);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Default payment methods
  const defaultPaymentMethods: PaymentMethod[] = [
    {
      id: 'razorpay',
      type: 'card',
      name: 'Credit/Debit Card',
      icon: 'card-outline',
      details: 'Pay securely with Razorpay',
    },
    {
      id: 'upi',
      type: 'upi',
      name: 'UPI',
      icon: 'phone-portrait-outline',
      details: 'Pay with any UPI app',
    },
    {
      id: 'netbanking',
      type: 'netbanking',
      name: 'Net Banking',
      icon: 'globe-outline',
      details: 'Pay with your bank account',
    },
    {
      id: 'wallet',
      type: 'wallet',
      name: 'Digital Wallet',
      icon: 'wallet-outline',
      details: 'Paytm, PhonePe, Google Pay',
    },
    {
      id: 'cash',
      type: 'cash',
      name: 'Cash Payment',
      icon: 'cash-outline',
      details: 'Pay with cash to driver',
    },
  ];

  useEffect(() => {
    initializePaymentScreen();
  }, []);

  const initializePaymentScreen = async () => {
    setLoading(true);
    
    try {
      // Get ride details if not provided
      if (!ride && rideId) {
        const rideResult = await getRideById(rideId);
        if (rideResult.data) {
          setRide(rideResult.data);
        }
      }

      // Get user's saved payment methods
      if (user) {
        const userPaymentMethods = await paymentService.getUserPaymentMethods(user.id);
        // Combine default methods with user's saved methods
        setPaymentMethods([...defaultPaymentMethods, ...userPaymentMethods]);
      } else {
        setPaymentMethods(defaultPaymentMethods);
      }
    } catch (error) {
      console.error('Error initializing payment screen:', error);
      Alert.alert('Error', 'Failed to load payment options');
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to continue');
      return;
    }

    if (selectedPaymentMethod === 'cash') {
      handleCashPayment();
      return;
    }

    setProcessingPayment(true);

    try {
      const userDetails = {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
      };

      const result = await paymentService.processPayment(
        rideId,
        user.id,
        amount,
        userDetails
      );

      if (result.success) {
        Alert.alert(
          'Payment Successful!',
          `Payment of ₹${amount} completed successfully.`,
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('RideDetails', { rideId });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Payment Failed',
          result.error || 'Payment could not be processed. Please try again.',
          [
            {
              text: 'Retry',
              onPress: () => processPayment(),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Payment Error', error.message || 'An unexpected error occurred');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCashPayment = () => {
    Alert.alert(
      'Cash Payment',
      'You have selected cash payment. Please pay the driver directly.',
      [
        {
          text: 'Confirm',
          onPress: () => {
            // Update ride payment method to cash
            navigation.navigate('RideDetails', { rideId });
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const calculateTotalAmount = () => {
    // Add any additional charges here (taxes, service fee, etc.)
    const serviceCharge = Math.round(amount * 0.05); // 5% service charge
    const taxes = Math.round((amount + serviceCharge) * 0.18); // 18% GST
    return amount + serviceCharge + taxes;
  };

  const renderPaymentMethod = (method: PaymentMethod) => (
    <TouchableOpacity
      key={method.id}
      style={[
        styles.paymentMethodCard,
        selectedPaymentMethod === method.id && styles.selectedPaymentMethod,
      ]}
      onPress={() => setSelectedPaymentMethod(method.id)}
    >
      <View style={styles.paymentMethodHeader}>
        <Ionicons
          name={method.icon as any}
          size={24}
          color={selectedPaymentMethod === method.id ? '#007AFF' : '#666'}
        />
        <View style={styles.paymentMethodInfo}>
          <Text style={styles.paymentMethodName}>{method.name}</Text>
          {method.details && (
            <Text style={styles.paymentMethodDetails}>{method.details}</Text>
          )}
        </View>
        <View style={styles.radioButton}>
          {selectedPaymentMethod === method.id && (
            <View style={styles.radioButtonSelected} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFareBreakdown = () => (
    <View style={styles.fareBreakdown}>
      <Text style={styles.fareTitle}>Fare Breakdown</Text>
      
      <View style={styles.fareItem}>
        <Text style={styles.fareLabel}>Base Fare</Text>
        <Text style={styles.fareValue}>₹{amount}</Text>
      </View>
      
      <View style={styles.fareItem}>
        <Text style={styles.fareLabel}>Service Charge (5%)</Text>
        <Text style={styles.fareValue}>₹{Math.round(amount * 0.05)}</Text>
      </View>
      
      <View style={styles.fareItem}>
        <Text style={styles.fareLabel}>GST (18%)</Text>
        <Text style={styles.fareValue}>₹{Math.round((amount + Math.round(amount * 0.05)) * 0.18)}</Text>
      </View>
      
      <View style={[styles.fareItem, styles.totalFare]}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <Text style={styles.totalValue}>₹{calculateTotalAmount()}</Text>
      </View>
    </View>
  );

  const renderRideInfo = () => (
    <View style={styles.rideInfo}>
      <Text style={styles.rideTitle}>Ride Details</Text>
      
      {ride && (
        <>
          <View style={styles.locationContainer}>
            <View style={styles.locationItem}>
              <Ionicons name="location-outline" size={20} color="#4CAF50" />
              <Text style={styles.locationText}>
                {ride.pickup_location?.address || 'Pickup Location'}
              </Text>
            </View>
            
            <View style={styles.locationItem}>
              <Ionicons name="flag-outline" size={20} color="#F44336" />
              <Text style={styles.locationText}>
                {ride.destination_location?.address || 'Destination'}
              </Text>
            </View>
          </View>
          
          <View style={styles.rideDetails}>
            <Text style={styles.rideDetailItem}>Distance: {ride.distance} km</Text>
            <Text style={styles.rideDetailItem}>Type: {ride.ride_type}</Text>
            <Text style={styles.rideDetailItem}>Duration: {ride.estimated_duration} min</Text>
          </View>
        </>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading payment options...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderRideInfo()}
        {renderFareBreakdown()}
        
        <View style={styles.paymentMethodsContainer}>
          <Text style={styles.paymentMethodsTitle}>Select Payment Method</Text>
          {paymentMethods.map(renderPaymentMethod)}
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, processingPayment && styles.payButtonDisabled]}
          onPress={processPayment}
          disabled={processingPayment}
        >
          {processingPayment ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.payButtonText}>
                Pay ₹{calculateTotalAmount()}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  rideInfo: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rideTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  locationContainer: {
    marginBottom: 12,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  rideDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 12,
  },
  rideDetailItem: {
    fontSize: 12,
    color: '#666',
  },
  fareBreakdown: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  fareTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  fareItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fareLabel: {
    fontSize: 14,
    color: '#666',
  },
  fareValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalFare: {
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  paymentMethodsContainer: {
    marginBottom: 100,
  },
  paymentMethodsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  paymentMethodCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedPaymentMethod: {
    borderColor: '#007AFF',
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  paymentMethodDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  payButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#999',
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default PaymentScreen;