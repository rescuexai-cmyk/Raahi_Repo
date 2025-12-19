import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import { RideProvider } from './src/context/RideContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RideProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </RideProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
