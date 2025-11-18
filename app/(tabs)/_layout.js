import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../components/Navbar';
import { View, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
          tabBarActiveTintColor: '#667eea',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 0 : 8, // SafeAreaView handles iOS bottom
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
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
    backgroundColor: '#F9FAFB',
  },
});
