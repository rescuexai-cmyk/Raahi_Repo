import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => signOut()
        },
      ]
    );
  };

  const MenuItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true,
    rightElement 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIconContainer}>
          <Ionicons name={icon as any} size={20} color="#007AFF" />
        </View>
        <View style={styles.menuItemContent}>
          <Text style={styles.menuItemTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.menuItemRight}>
        {rightElement}
        {showArrow && !rightElement && (
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        )}
      </View>
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user?.user_metadata?.avatar_url ? (
              <Image 
                source={{ uri: user.user_metadata.avatar_url }} 
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#FFFFFF" />
              </View>
            )}
          </View>
          <Text style={styles.userName}>
            {user?.user_metadata?.name || 'User Name'}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.userType}>
            {user?.user_metadata?.user_type === 'driver' ? 'Driver' : 'Rider'} Account
          </Text>
          
          <TouchableOpacity style={styles.editProfileButton}>
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <SectionHeader title="Account" />
        <View style={styles.menuSection}>
          <MenuItem
            icon="person-outline"
            title="Personal Information"
            subtitle="Name, phone, email"
            onPress={() => Alert.alert('Coming Soon', 'Personal information editing will be available soon')}
          />
          <MenuItem
            icon="card-outline"
            title="Payment Methods"
            subtitle="Manage cards and payment options"
            onPress={() => Alert.alert('Coming Soon', 'Payment management will be available soon')}
          />
          <MenuItem
            icon="location-outline"
            title="Saved Places"
            subtitle="Home, work, and other locations"
            onPress={() => Alert.alert('Coming Soon', 'Saved places will be available soon')}
          />
        </View>

        {/* Preferences Section */}
        <SectionHeader title="Preferences" />
        <View style={styles.menuSection}>
          <MenuItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Push notifications and alerts"
            showArrow={false}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <MenuItem
            icon="location-outline"
            title="Location Services"
            subtitle="Allow location access"
            showArrow={false}
            rightElement={
              <Switch
                value={locationEnabled}
                onValueChange={setLocationEnabled}
                trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <MenuItem
            icon="language-outline"
            title="Language"
            subtitle="English"
            onPress={() => Alert.alert('Coming Soon', 'Language selection will be available soon')}
          />
        </View>

        {/* Safety Section */}
        <SectionHeader title="Safety & Security" />
        <View style={styles.menuSection}>
          <MenuItem
            icon="shield-outline"
            title="Safety Center"
            subtitle="Emergency contacts and safety features"
            onPress={() => Alert.alert('Coming Soon', 'Safety center will be available soon')}
          />
          <MenuItem
            icon="lock-closed-outline"
            title="Privacy Settings"
            subtitle="Control your data and privacy"
            onPress={() => Alert.alert('Coming Soon', 'Privacy settings will be available soon')}
          />
          <MenuItem
            icon="eye-outline"
            title="Two-Factor Authentication"
            subtitle="Add extra security to your account"
            onPress={() => Alert.alert('Coming Soon', '2FA setup will be available soon')}
          />
        </View>

        {/* Support Section */}
        <SectionHeader title="Support" />
        <View style={styles.menuSection}>
          <MenuItem
            icon="help-circle-outline"
            title="Help Center"
            subtitle="FAQs and support articles"
            onPress={() => Alert.alert('Coming Soon', 'Help center will be available soon')}
          />
          <MenuItem
            icon="chatbubble-outline"
            title="Contact Support"
            subtitle="Get help from our team"
            onPress={() => Alert.alert('Coming Soon', 'Contact support will be available soon')}
          />
          <MenuItem
            icon="star-outline"
            title="Rate the App"
            subtitle="Share your feedback"
            onPress={() => Alert.alert('Coming Soon', 'App rating will be available soon')}
          />
        </View>

        {/* Legal Section */}
        <SectionHeader title="Legal" />
        <View style={styles.menuSection}>
          <MenuItem
            icon="document-text-outline"
            title="Terms of Service"
            onPress={() => Alert.alert('Coming Soon', 'Terms of service will be available soon')}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            onPress={() => Alert.alert('Coming Soon', 'Privacy policy will be available soon')}
          />
          <MenuItem
            icon="information-circle-outline"
            title="About"
            subtitle="Version 1.0.0"
            onPress={() => Alert.alert('RideApp', 'Version 1.0.0\nBuilt with React Native and Supabase')}
          />
        </View>

        {/* Sign Out */}
        <View style={styles.signOutSection}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  userType: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 20,
    fontWeight: '500',
  },
  editProfileButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  editProfileButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: '#666666',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF3B30',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 20,
  },
});

export default ProfileScreen;