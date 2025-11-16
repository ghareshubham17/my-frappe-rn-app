import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";

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
  const [siteUrl, setSiteUrl] = useState(null);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);

  // Check initial setup on app start
  useEffect(() => {
    checkInitialSetup();
  }, []);

  const checkInitialSetup = async () => {
    try {
      // Check if site URL is already configured
      const savedUrl = await SecureStore.getItemAsync("frappe_site_url");
      
      if (!savedUrl) {
        // First time app launch - need URL setup
        setIsFirstLaunch(true);
        setLoading(false);
        return;
      }

      // URL exists, set it
      setSiteUrl(savedUrl);
      console.log("Site URL found:", savedUrl);

      // Check for existing session
      const savedUser = await SecureStore.getItemAsync("frappe_user");
      const savedSid = await SecureStore.getItemAsync("frappe_sid");

      if (savedUser && savedSid) {
        // Verify session is still valid
        try {
          const response = await fetch(
            `${savedUrl}/api/method/frappe.auth.get_logged_user`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
              credentials: "include",
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.message) {
              const userEmail = data.message;

              // Verify Employee still has ESS enabled
              const employeeResponse = await fetch(
                `${savedUrl}/api/resource/Employee?filters=[["user_id","=","${userEmail}"]]&fields=["name","employee_name","custom_allow_ess"]`,
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                  },
                  credentials: "include",
                }
              );

              const employeeData = await employeeResponse.json();

              if (
                employeeResponse.ok &&
                employeeData.data &&
                employeeData.data.length > 0 &&
                employeeData.data[0].custom_allow_ess === 1
              ) {
                // Session valid and ESS still enabled
                setUser(JSON.parse(savedUser));
                setIsAuthenticated(true);
                console.log("Session restored successfully with ESS enabled");
              } else {
                // ESS disabled or no employee record
                console.log("ESS disabled or employee record not found");
                await clearAuthData();
              }
            } else {
              await clearAuthData();
            }
          } else {
            await clearAuthData();
          }
        } catch (error) {
          console.log("Session verification failed:", error);
          await clearAuthData();
        }
      }
    } catch (error) {
      console.error("Setup check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupSiteUrl = async (url) => {
    try {
      setLoading(true);
      
      // Normalize URL - ensure it has protocol
      let normalizedUrl = url.trim();
      
      // Remove trailing slash if present
      normalizedUrl = normalizedUrl.replace(/\/$/, '');
      
      // Add https if no protocol specified
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      
      console.log("Testing connection to:", normalizedUrl);

      // Test connection to the Frappe site
      const testResponse = await fetch(
        `${normalizedUrl}/api/method/frappe.auth.get_logged_user`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
        }
      );

      if (testResponse.status === 403 || testResponse.status === 200) {
        // 403 means site exists but we're not authenticated (expected)
        // 200 means site exists and might have cached credentials
        
        // Save the URL
        await SecureStore.setItemAsync("frappe_site_url", normalizedUrl);
        setSiteUrl(normalizedUrl);
        setIsFirstLaunch(false);
        
        console.log("Site URL configured successfully:", normalizedUrl);
        return { success: true };
      } else {
        throw new Error("Unable to connect to Frappe site");
      }
    } catch (error) {
      console.error("Site setup failed:", error);
      
      let errorMessage = "Unable to connect to the site. Please check the URL and try again.";
      
      if (error.message.includes('Network')) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (error.message.includes('fetch')) {
        errorMessage = "Invalid URL format or site not reachable.";
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setLoading(true);

      if (!siteUrl) {
        throw new Error("Site URL not configured");
      }

      console.log("Attempting login at:", siteUrl);
      console.log("Username:", username);

      // Use standard Frappe login
      const loginResponse = await fetch(`${siteUrl}/api/method/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
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
        // Get user details
        const profileResponse = await fetch(
          `${siteUrl}/api/method/frappe.auth.get_logged_user`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            credentials: "include",
          }
        );

        const profileData = await profileResponse.json();
        const userEmail = profileData.message;

        console.log("Logged in user email:", userEmail);

        // Check if user has an Employee record with Allow ESS enabled
        const employeeResponse = await fetch(
          `${siteUrl}/api/resource/Employee?filters=[["user_id","=","${userEmail}"]]&fields=["name","employee_name","custom_allow_ess"]`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            credentials: "include",
          }
        );

        const employeeData = await employeeResponse.json();
        console.log("Employee data:", employeeData);

        if (!employeeResponse.ok || !employeeData.data || employeeData.data.length === 0) {
          // No employee record found for this user
          // Logout the user
          await fetch(`${siteUrl}/api/method/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            credentials: "include",
          });

          throw new Error("No employee record found for this user. Please contact your administrator.");
        }

        const employee = employeeData.data[0];

        // Check if Allow ESS is enabled
        if (!employee.custom_allow_ess || employee.custom_allow_ess === 0) {
          // Employee Self Service not enabled
          // Logout the user
          await fetch(`${siteUrl}/api/method/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            credentials: "include",
          });

          throw new Error("Employee Self Service is not enabled for your account. Please contact your administrator.");
        }

        // All validations passed - proceed with login
        const userData = {
          name: username,
          email: userEmail,
          full_name: employee.employee_name || userEmail,
          employee_id: employee.name,
          sid: "session_active",
        };

        // Save user data
        await SecureStore.setItemAsync("frappe_user", JSON.stringify(userData));
        await SecureStore.setItemAsync("frappe_sid", userData.sid);

        setUser(userData);
        setIsAuthenticated(true);

        console.log("Login successful with ESS enabled");
        return { success: true };
      } else {
        throw new Error(loginData.exc || loginData.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login failed:", error);

      let errorMessage = "Login failed. Please check your credentials.";

      if (error.message.includes("No employee record found")) {
        errorMessage = error.message;
      } else if (error.message.includes("Employee Self Service is not enabled")) {
        errorMessage = error.message;
      } else if (error.message.includes("Invalid login")) {
        errorMessage = "Invalid username or password.";
      } else if (error.message.includes("User disabled")) {
        errorMessage = "Your account has been disabled.";
      } else if (error.message.includes("Network")) {
        errorMessage = "Network error. Please check your connection.";
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
      if (siteUrl) {
        await fetch(`${siteUrl}/api/method/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          credentials: "include",
        });
      }
    } catch (error) {
      console.error("Logout API call failed:", error);
    }

    await clearAuthData();
    console.log("Logout completed");
  };

  const clearAuthData = async () => {
    try {
      // Clear user session but keep site URL
      await SecureStore.deleteItemAsync("frappe_user");
      await SecureStore.deleteItemAsync("frappe_sid");
    } catch (error) {
      console.error("Failed to clear stored data:", error);
    }

    setIsAuthenticated(false);
    setUser(null);
  };

  const resetSiteUrl = async () => {
    // This function allows resetting the site URL (for testing or changing workspace)
    try {
      await SecureStore.deleteItemAsync("frappe_site_url");
      await clearAuthData();
      setSiteUrl(null);
      setIsFirstLaunch(true);
    } catch (error) {
      console.error("Failed to reset site URL:", error);
    }
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    siteUrl,
    isFirstLaunch,
    setupSiteUrl,
    resetSiteUrl,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};