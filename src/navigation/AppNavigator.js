// export default AppNavigator;
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";

// Import screens
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import LeaveApplication from "../screens/LeaveApplication";
import Holidays from "../screens/Holidays";
import ReportsScreen from "../screens/ReportsScreen";
import MonthlyAttendanceSheet from "../reports/MonthlyAttendanceSheet";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    // You can add a loading screen here if needed
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
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
          // Authentication stack
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
