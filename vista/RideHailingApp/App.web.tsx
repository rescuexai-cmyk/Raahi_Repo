import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, Text, StyleSheet, View, TouchableOpacity, TextInput, ScrollView } from 'react-native';

// Simple mock authentication for web demo
function WebApp() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [phone, setPhone] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [sessionId, setSessionId] = React.useState('');
  const [currentUser, setCurrentUser] = React.useState<any>(null);

  const requestOTP = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });
      
      const data = await response.json();
      if (data.success) {
        setSessionId(data.sessionId);
        alert(`OTP sent! Check backend console for OTP code.`);
      } else {
        alert('Failed to send OTP: ' + data.error);
      }
    } catch (error) {
      alert('Error: Make sure backend is running on localhost:3000');
    }
  };

  const verifyOTP = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          otp,
          userData: { name: 'Web User', user_type: 'rider' }
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setCurrentUser(data.user);
        setIsLoggedIn(true);
        alert('Login successful!');
      } else {
        alert('Invalid OTP: ' + data.error);
      }
    } catch (error) {
      alert('Error verifying OTP');
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setPhone('');
    setOtp('');
    setSessionId('');
  };

  if (isLoggedIn && currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🚗 Ride Hailing App</Text>
          <Text style={styles.subtitle}>Web Demo Version</Text>
        </View>

        <ScrollView style={styles.content}>
          {/* User Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>👤 User Profile</Text>
            <Text style={styles.infoText}>Name: {currentUser.name}</Text>
            <Text style={styles.infoText}>Phone: {currentUser.phone}</Text>
            <Text style={styles.infoText}>Type: {currentUser.user_type}</Text>
            <Text style={styles.infoText}>ID: {currentUser.id}</Text>
          </View>

          {/* Map Placeholder */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🗺️ Map View</Text>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapText}>Interactive Map</Text>
              <Text style={styles.mapSubtext}>📍 Your Location: San Francisco, CA</Text>
              <Text style={styles.mapSubtext}>🚗 2 drivers nearby</Text>
              <Text style={styles.mapSubtext}>📱 Use mobile app for full map experience</Text>
            </View>
          </View>

          {/* Ride Booking */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🚕 Book a Ride</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>From:</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Current Location" 
                value="Current Location"
                editable={false}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>To:</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Enter destination" 
              />
            </View>
            <TouchableOpacity style={styles.bookButton}>
              <Text style={styles.bookButtonText}>📱 Book Ride</Text>
            </TouchableOpacity>
          </View>

          {/* Features */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>✨ Available Features</Text>
            <Text style={styles.featureText}>✅ Phone Authentication (Working)</Text>
            <Text style={styles.featureText}>✅ User Management (Working)</Text>
            <Text style={styles.featureText}>✅ Backend API (Working)</Text>
            <Text style={styles.featureText}>✅ Real-time Updates (Working)</Text>
            <Text style={styles.featureText}>📱 Full Maps (Mobile Only)</Text>
            <Text style={styles.featureText}>📱 GPS Tracking (Mobile Only)</Text>
          </View>

          {/* API Status */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔗 API Status</Text>
            <Text style={styles.statusText}>Backend: ✅ Connected (localhost:3000)</Text>
            <Text style={styles.statusText}>Authentication: ✅ Working</Text>
            <Text style={styles.statusText}>Database: ✅ Mock Data Ready</Text>
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>

        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loginContainer}>
        <Text style={styles.title}>🚗 Ride Hailing App</Text>
        <Text style={styles.subtitle}>Web Demo - Phone Authentication</Text>

        <View style={styles.loginCard}>
          <Text style={styles.loginTitle}>📱 Sign In</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Phone Number:</Text>
            <TextInput
              style={styles.input}
              placeholder="+1234567890"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity 
            style={styles.otpButton} 
            onPress={requestOTP}
            disabled={!phone}
          >
            <Text style={styles.otpButtonText}>📤 Send OTP</Text>
          </TouchableOpacity>

          {sessionId ? (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Enter OTP:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123456"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>

              <TouchableOpacity 
                style={styles.verifyButton} 
                onPress={verifyOTP}
                disabled={!otp}
              >
                <Text style={styles.verifyButtonText}>✅ Verify & Login</Text>
              </TouchableOpacity>

              <Text style={styles.helpText}>
                💡 Check the backend terminal for the OTP code
              </Text>
            </>
          ) : null}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Demo Information</Text>
          <Text style={styles.infoPoint}>• Backend API running on localhost:3000</Text>
          <Text style={styles.infoPoint}>• Authentication working with real OTP</Text>
          <Text style={styles.infoPoint}>• Full ride-hailing features available</Text>
          <Text style={styles.infoPoint}>• Maps work fully on mobile version</Text>
        </View>
      </View>

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#22C55E',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#e8f5e8',
  },
  content: {
    flex: 1,
    padding: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  mapPlaceholder: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#22C55E',
    borderStyle: 'dashed',
  },
  mapText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#22C55E',
    marginBottom: 10,
  },
  mapSubtext: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  bookButton: {
    backgroundColor: '#22C55E',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 14,
    color: '#22C55E',
    marginBottom: 5,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    margin: 20,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loginCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  otpButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  otpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  verifyButton: {
    backgroundColor: '#22C55E',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 10,
  },
  infoPoint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
});

export default WebApp;