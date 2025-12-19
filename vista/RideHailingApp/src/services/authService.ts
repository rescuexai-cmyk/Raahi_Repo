import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { apiClient } from './apiClient';
import { OTPResult, VerifyOTPResult } from './otpService';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

// Get current authenticated user
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    // Try to get user from cache first
    const cachedUser = await AsyncStorage.getItem(USER_KEY);
    if (cachedUser) {
      return JSON.parse(cachedUser);
    }

    // Fetch from API if not cached
    const userData = await apiClient.getCurrentUser();
    if (userData.success && userData.user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData.user));
      return userData.user;
    }

    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Request OTP for phone number
export const requestOTP = async (phone: string): Promise<OTPResult> => {
  try {
    const result = await apiClient.requestOTP(phone);
    return result;
  } catch (error: any) {
    console.error('Error requesting OTP:', error);
    return { success: false, error: error.message };
  }
};

// Verify OTP and sign in
export const verifyOTPAndSignIn = async (
  sessionId: string, 
  otp: string, 
  userData?: any
): Promise<VerifyOTPResult> => {
  try {
    const result = await apiClient.verifyOTP(sessionId, otp, userData);
    
    if (result.success && result.user && result.token) {
      // Store token and user data
      await AsyncStorage.setItem(TOKEN_KEY, result.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(result.user));
    }
    
    return result;
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return { success: false, error: error.message };
  }
};

// Resend OTP
export const resendOTP = async (sessionId: string): Promise<OTPResult> => {
  try {
    const result = await apiClient.requestOTP(''); // This would need the phone number from session
    return result;
  } catch (error: any) {
    console.error('Error resending OTP:', error);
    return { success: false, error: error.message };
  }
};

// Get OTP session status
export const getOTPSessionStatus = async (sessionId: string) => {
  try {
    // This would be implemented on the API side
    return { valid: true, expiresAt: new Date(Date.now() + 300000) }; // 5 minutes
  } catch (error) {
    console.error('Error getting session status:', error);
    return { valid: false, error: 'Session check failed' };
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  try {
    await apiClient.signOut();
  } catch (error) {
    console.error('Error during sign out API call:', error);
  } finally {
    // Always clear local storage
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  }
};

// Get stored token
export const getStoredToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting stored token:', error);
    return null;
  }
};

// Update user profile
export const updateUserProfile = async (userId: string, userData: Partial<User>): Promise<User | null> => {
  try {
    const result = await apiClient.updateUser(userId, userData);
    
    if (result.success && result.user) {
      // Update cached user data
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(result.user));
      return result.user;
    }
    
    return null;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return null;
  }
};

// Check if phone number is already registered
export const checkPhoneExists = async (phone: string): Promise<{ exists: boolean; user?: User }> => {
  try {
    // This would be implemented on the API
    return { exists: false };
  } catch (error) {
    console.error('Error checking phone exists:', error);
    return { exists: false };
  }
};

// Delete user account
export const deleteUserAccount = async (userId: string) => {
  try {
    // This would be implemented on the API
    // Clear local storage
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Legacy functions for backward compatibility (will be removed)
export const signUp = async (phone: string, userData: any) => {
  console.warn('signUp is deprecated. Use requestOTP and verifyOTPAndSignIn instead.');
  const otpResult = await requestOTP(phone);
  return {
    data: otpResult.success ? { sessionId: otpResult.sessionId } : null,
    error: otpResult.error || null,
  };
};

export const signIn = async (phone: string) => {
  console.warn('signIn is deprecated. Use requestOTP and verifyOTPAndSignIn instead.');
  const otpResult = await requestOTP(phone);
  return {
    data: otpResult.success ? { sessionId: otpResult.sessionId } : null,
    error: otpResult.error || null,
  };
};