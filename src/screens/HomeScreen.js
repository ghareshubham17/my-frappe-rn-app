import React from 'react';
import {
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import components
import Navbar from '../components/Navbar';

// Import tab screens
import HomeTabScreen from '../tabs/HomeTabScreen';
import UpdatesTabScreen from '../tabs/UpdatesTabScreen';
import ProfileTabScreen from '../tabs/ProfileTabScreen';

const Tab = createBottomTabNavigator();

const HomeScreen = () => {
  const insets = useSafeAreaInsets();

  // Calculate dynamic tab bar height based on device safe area
  const tabBarHeight = Platform.select({
    ios: 60 + insets.bottom,
    android: 60,
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#667eea"
        translucent={false}
      />

      {/* Separate Navbar Component */}
      <Navbar />

      {/* Tab Navigator with Dynamic Safe Area Handling */}
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#667eea',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            height: tabBarHeight,
            paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          headerShown: false,
        }}
      >
        <Tab.Screen 
          name="HomeTab" 
          component={HomeTabScreen}
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="UpdatesTab" 
          component={UpdatesTabScreen}
          options={{
            title: 'Updates',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="notifications" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="ProfileTab" 
          component={ProfileTabScreen}
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});

export default HomeScreen;