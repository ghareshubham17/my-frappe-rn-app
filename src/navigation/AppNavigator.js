import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";
import { View, ActivityIndicator } from "react-native";

// Import screens
import SiteSetupScreen from "../screens/SiteSetupScreen";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import LeaveApplication from "../screens/LeaveApplication";
import Holidays from "../screens/Holidays";
import ReportsScreen from "../screens/ReportsScreen";
import MonthlyAttendanceSheet from "../reports/MonthlyAttendanceSheet";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, loading, isFirstLaunch, siteUrl } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!siteUrl || isFirstLaunch ? (
          // Need site setup
          <Stack.Screen name="SiteSetup" component={SiteSetupScreen} />
        ) : isAuthenticated ? (
          // Authenticated stack
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="LeaveApplication"
              component={LeaveApplication}
              options={{
                headerShown: false,
                presentation: "card",
              }}
            />
            <Stack.Screen
              name="Holidays"
              component={Holidays}
              options={{
                headerShown: false,
                presentation: "card",
              }}
            />
            <Stack.Screen
              name="ReportsScreen"
              component={ReportsScreen}
              options={{ presentation: "card" }}
            />
            <Stack.Screen
              name="MonthlyAttendanceSheet"
              component={MonthlyAttendanceSheet}
              options={{ presentation: "card" }}
            />
          </>
        ) : (
          // Login screen
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;