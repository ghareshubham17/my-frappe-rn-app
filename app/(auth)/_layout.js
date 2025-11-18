import { Stack } from 'expo-router';

/**
 * Auth Layout - Stack navigator for authentication screens
 * Screens: SiteSetupScreen, LoginScreen
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SiteSetupScreen" />
      <Stack.Screen name="LoginScreen" />
    </Stack>
  );
}
