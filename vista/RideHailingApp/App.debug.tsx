import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function AppDebug() {
  console.log('🚀 App is starting...');
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 Ride Hailing App</Text>
      <Text style={styles.subtitle}>Debug Mode - App is Working!</Text>
      <Text style={styles.info}>If you see this, React Native is working</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    color: '#666',
    textAlign: 'center',
  },
  info: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});