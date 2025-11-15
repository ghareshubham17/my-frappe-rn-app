import React, { createContext, useContext, useState, useEffect } from "react";
import { BASE_URI } from "../data/constants";
import * as SecureStore from "expo-secure-store";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Check authentication status on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const savedUser = await SecureStore.getItemAsync("frappe_user");
      const savedSid = await SecureStore.getItemAsync("frappe_sid");

      if (savedUser && savedSid) {
        // Verify the session is still valid with direct API call
        try {
          const response = await fetch(
            `${BASE_URI}/api/method/frappe.auth.get_logged_user`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              credentials: "include",
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.message) {
              setUser(JSON.parse(savedUser));
              setIsAuthenticated(true);
              console.log("Session restored successfully");
              return;
            }
          }
        } catch (error) {
          console.log("Session verification failed:", error);
        }
      }

      // Clear invalid session data
      await clearAuthData();
    } catch (error) {
      console.error("Auth check failed:", error);
      await clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  const debugAuthMethod = () => {
    console.log("\n=== AUTHENTICATION METHOD DEBUG ===");
    console.log("Auth type: SESSION-BASED");
    console.log('Reason: Uses credentials: "include"');
    console.log("Storage: Saves session ID, not tokens");
    console.log("Headers: No Authorization header needed");
    console.log("Cookie handling: Automatic via browser");
    console.log("===================================\n");
  };

  const login = async (username, password) => {
    try {
      setLoading(true);
      console.log("Attempting login with direct API call:", {
        username,
        site: BASE_URI,
      });

      // Direct API login call
      const loginResponse = await fetch(`${BASE_URI}/api/method/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          usr: username,
          pwd: password,
        }),
        credentials: "include",
      });

      const loginData = await loginResponse.json();
      console.log("Login response:", loginData);

      if (loginResponse.ok && loginData.message) {
        // Get user profile after successful login
        let userData;

        try {
          const profileResponse = await fetch(
            `${BASE_URI}/api/method/frappe.auth.get_logged_user`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              credentials: "include",
            }
          );

          const profileData = await profileResponse.json();
          console.log("Profile response:", profileData);

          userData = {
            name: username,
            email: username,
            full_name:
              profileData.message?.full_name ||
              loginData.full_name ||
              loginData.message?.full_name ||
              username,
            sid: "session_active",
          };
        } catch (profileError) {
          console.error("Failed to fetch user profile:", profileError);
          // Use basic user data if profile fetch fails
          userData = {
            name: username,
            email: username,
            full_name: loginData.full_name || username,
            sid: "session_active",
          };
        }

        // Store user data
        await SecureStore.setItemAsync("frappe_user", JSON.stringify(userData));
        await SecureStore.setItemAsync("frappe_sid", userData.sid);
        console.log("Stored session ID:", userData.sid);
        console.log("Stored user data:", userData);

        setUser(userData);
        setIsAuthenticated(true);

        console.log("Login successful via direct API");
        // Add debug info here
        console.log("🔐 LOGIN METHOD CHECK:");
        console.log("- Uses credentials: 'include':", true);
        console.log("- Has Authorization header:", false);
        console.log("- Authentication type: SESSION-BASED");

        debugAuthMethod();
        return { success: true };
      } else {
        // Handle login errors
        const errorMessage =
          loginData.exc || loginData.message || "Invalid credentials";
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Login failed:", error);

      let errorMessage = "Login failed. Please check your credentials.";

      if (error.message) {
        if (error.message.includes("Incomplete login details")) {
          errorMessage = "Please enter both username and password.";
        } else if (
          error.message.includes("Invalid login credentials") ||
          error.message.includes("Authentication failed")
        ) {
          errorMessage = "Invalid username or password.";
        } else if (error.message.includes("User disabled")) {
          errorMessage = "Your account has been disabled.";
        } else if (
          error.message.includes("Network") ||
          error.message.includes("fetch")
        ) {
          errorMessage =
            "Network error. Please check your internet connection.";
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout API
      const logoutResponse = await fetch(`${BASE_URI}/api/method/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
      });

      console.log("Logout API response:", logoutResponse.status);
    } catch (error) {
      console.error("Logout API call failed:", error);
      // Continue with local cleanup even if API call fails
    }

    // Clear all stored data
    await clearAuthData();
    console.log("Logout completed");
  };

  const clearAuthData = async () => {
    try {
      await SecureStore.deleteItemAsync("frappe_user");
      await SecureStore.deleteItemAsync("frappe_sid");
    } catch (error) {
      console.error("Failed to clear stored data:", error);
    }

    setIsAuthenticated(false);
    setUser(null);
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
