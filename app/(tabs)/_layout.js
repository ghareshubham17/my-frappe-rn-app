import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../components/Navbar';
import { View, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../_data/constants';

/**
 * Tabs Layout - Bottom tab navigation for authenticated users
 */
export default function TabsLayout() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Navbar at the top - handles its own top safe area */}
      <Navbar />

      {/* Bottom Tab Navigator */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textSecondary,
          tabBarStyle: {
            backgroundColor: COLORS.background,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 0 : 8, // SafeAreaView handles iOS bottom
            elevation: 8, // Android shadow
            shadowColor: '#000', // iOS shadow
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginBottom: 4,
          },
          tabBarIconStyle: {
            marginTop: 4,
          },
        }}
      >
        {/* Hide the _HomeScreen from tabs - it's only imported by index.js */}
        <Tabs.Screen
          name="_HomeScreen"
          options={{
            href: null, // This hides it from the tab bar
          }}
        />

        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="UpdatesScreen"
          options={{
            title: 'Updates',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="notifications" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ProfileScreen"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
});
