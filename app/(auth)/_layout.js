import { Stack } from 'expo-router';

/**
 * Auth Layout - Stack navigator for authentication screens
 * Screens: LoginScreen, ResetPasswordScreen
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LoginScreen" />
      <Stack.Screen name="ResetPasswordScreen" />
    </Stack>
  );
}
