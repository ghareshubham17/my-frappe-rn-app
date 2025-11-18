import { Stack } from 'expo-router';

/**
 * Screens Layout - Stack navigator for authenticated app screens
 * Screens: LeaveApplicationScreen, HolidaysScreen, ReportsScreen, MonthlyAttendanceScreen
 */
export default function ScreensLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="LeaveApplicationScreen"
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="HolidaysScreen"
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="ReportsScreen"
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="MonthlyAttendanceScreen"
        options={{ presentation: 'card' }}
      />
    </Stack>
  );
}
