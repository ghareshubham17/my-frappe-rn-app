import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as eva from '@eva-design/eva';
import { ApplicationProvider } from '@ui-kitten/components';

/**
 * Root Layout - Protected route logic
 * Handles authentication-based navigation
 *
 * Route Groups:
 * - (auth) - Unauthenticated screens (site-setup, login)
 * - (tabs) - Main app with bottom tabs
 * - (screens) - Other authenticated screens
 */
function RootLayoutNav() {
  const { isAuthenticated, loading, isFirstLaunch, siteUrl } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Wait for auth check

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inScreensGroup = segments[0] === '(screens)';

    // Determine where user should be
    if (!siteUrl || isFirstLaunch) {
      // Need site setup
      if (!inAuthGroup || segments[1] !== 'SiteSetupScreen') {
        router.replace('/(auth)/SiteSetupScreen');
      }
    } else if (!isAuthenticated) {
      // Need login
      if (!inAuthGroup || segments[1] !== 'LoginScreen') {
        router.replace('/(auth)/LoginScreen');
      }
    } else {
      // Authenticated - go to tabs if not already in app
      if (!inTabsGroup && !inScreensGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, loading, segments, siteUrl, isFirstLaunch]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Auth screens group */}
      <Stack.Screen name="(auth)" />

      {/* Main app tabs */}
      <Stack.Screen name="(tabs)" />

      {/* Other app screens */}
      <Stack.Screen name="(screens)" />
    </Stack>
  );
}

/**
 * Root Layout Component
 * Wraps the entire app with providers
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ApplicationProvider {...eva} theme={eva.dark}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </ApplicationProvider>
    </SafeAreaProvider>
  );
}
