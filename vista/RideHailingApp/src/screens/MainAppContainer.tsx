import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useAuth } from '../context/AuthContext';
import HomeScreen from './main/HomeScreen';
import DriverHomeScreen from './driver/DriverHomeScreen';
import UserTypeToggle from '../components/UserTypeToggle';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MainAppContainer: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const [currentUserType, setCurrentUserType] = useState<'rider' | 'driver'>('rider');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserTypePreference();
  }, []);

  /**
   * Load user's preferred mode from storage
   */
  const loadUserTypePreference = async () => {
    try {
      const savedUserType = await AsyncStorage.getItem('userTypePreference');
      if (savedUserType && (savedUserType === 'rider' || savedUserType === 'driver')) {
        // Only set if user is actually registered for that type
        if (user && canUseUserType(savedUserType)) {
          setCurrentUserType(savedUserType);
        }
      }
    } catch (error) {
      console.error('Error loading user type preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check if user can use the specified user type
   */
  const canUseUserType = (userType: 'rider' | 'driver'): boolean => {
    if (!user) return false;

    if (userType === 'rider') {
      return user.user_type === 'rider' || user.user_type === 'both';
    } else {
      return user.user_type === 'driver' || user.user_type === 'both';
    }
  };

  /**
   * Handle user type change
   */
  const handleUserTypeChange = async (newUserType: 'rider' | 'driver') => {
    try {
      setCurrentUserType(newUserType);
      // Save preference
      await AsyncStorage.setItem('userTypePreference', newUserType);
      console.log(`✅ Switched to ${newUserType} mode`);
    } catch (error) {
      console.error('Error saving user type preference:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor="#FFF" barStyle="dark-content" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFF" barStyle="dark-content" />
      
      {/* User Type Toggle - Only show if user can switch */}
      {user && canUseUserType('rider') && canUseUserType('driver') && (
        <View style={styles.toggleContainer}>
          <UserTypeToggle
            currentUserType={currentUserType}
            onUserTypeChange={handleUserTypeChange}
            showLabel={true}
          />
        </View>
      )}

      {/* Render appropriate screen based on current user type */}
      {currentUserType === 'driver' ? (
        <DriverHomeScreen navigation={navigation} />
      ) : (
        <HomeScreen navigation={navigation} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  toggleContainer: {
    position: 'absolute',
    top: 60, // Below status bar
    right: 16,
    zIndex: 1000,
  },
});

export default MainAppContainer;