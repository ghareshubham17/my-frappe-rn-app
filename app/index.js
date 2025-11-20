import { Redirect } from 'expo-router';
import { useAuth } from './_contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';

/**
 * Index route - Initial entry point
 * Redirects based on authentication state
 */
export default function Index() {
  const { isAuthenticated, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  // Redirect based on authentication state
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/LoginScreen" />;
  }

  return <Redirect href="/(tabs)" />;
}
