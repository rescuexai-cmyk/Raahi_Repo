import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.log('🚨 Error caught by boundary:', error);
    console.log('🚨 Error info:', errorInfo);
  }

  render() {
    if ((this.state as any).hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <Text style={styles.errorTitle}>🚨 App Error Detected</Text>
          <Text style={styles.errorText}>
            {(this.state as any).error?.toString() || 'Unknown error'}
          </Text>
          <Text style={styles.helpText}>
            Check the console for more details
          </Text>
        </SafeAreaView>
      );
    }

    return (this.props as any).children;
  }
}

// Safe App Component
function SafeApp() {
  console.log('🚀 Safe App is starting...');
  
  try {
    // Test if basic React Native is working
    console.log('✅ React and React Native are working');
    
    // Try to import and test the main app
    const App = require('./App').default;
    console.log('✅ Main App component imported successfully');
    
    return <App />;
  } catch (error) {
    console.error('🚨 Error loading main app:', error);
    
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorTitle}>🔧 Loading Issue Detected</Text>
        <Text style={styles.errorText}>
          Main app failed to load: {error?.toString()}
        </Text>
        <Text style={styles.helpText}>
          This usually means missing dependencies or configuration
        </Text>
        <Text style={styles.suggestion}>
          1. Check if backend is running on localhost:3000{'\n'}
          2. Verify all npm packages are installed{'\n'}
          3. Check environment variables (.env file)
        </Text>
      </SafeAreaView>
    );
  }
}

export default function AppWithErrorHandling() {
  return (
    <ErrorBoundary>
      <SafeApp />
      <StatusBar style="auto" />
    </ErrorBoundary>
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
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#e74c3c',
    marginBottom: 20,
    textAlign: 'center',
  },
  helpText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'center',
  },
  suggestion: {
    fontSize: 12,
    color: '#34495e',
    textAlign: 'left',
  },
});