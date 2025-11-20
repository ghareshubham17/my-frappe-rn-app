import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { Alert, Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";

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

  // Get device information including ID, model, and brand
  const getDeviceInfo = async () => {
    try {
      // Try to get stored device ID first (persists across app restarts)
      let deviceId = await SecureStore.getItemAsync("device_id");

      if (!deviceId) {
        // Generate a unique device ID based on device characteristics
        // Using stable device info (no timestamp) for consistency
        const deviceFingerprint = [
          Device.modelName || 'unknown',
          Device.brand || 'unknown',
          Device.osVersion || 'unknown',
          Device.deviceName || 'unknown',
          Platform.OS || 'unknown',
          // Add installation identifier for uniqueness per install
          Constants.sessionId || Date.now().toString()
        ].join('-');

        // Create a hash-like ID (simplified base64 encoding)
        // This creates a unique but readable device identifier
        try {
          deviceId = btoa(deviceFingerprint)
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 32);
        } catch (e) {
          // Fallback if btoa fails (shouldn't happen in React Native)
          deviceId = deviceFingerprint
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 32);
        }

        // Store it securely for future use
        await SecureStore.setItemAsync("device_id", deviceId);
        console.log("📱 Generated new device ID using device fingerprint");
      } else {
        console.log("📱 Retrieved existing device ID from storage");
      }

      // Get device model and brand
      const deviceModel = Device.modelName || 'Unknown Model';
      const deviceBrand = Device.brand || 'Unknown Brand';

      console.log("Device Info:", {
        id: deviceId,
        model: deviceModel,
        brand: deviceBrand,
        os: `${Platform.OS} ${Device.osVersion}`,
      });

      return {
        device_id: deviceId,
        device_model: deviceModel,
        device_brand: deviceBrand
      };
    } catch (error) {
      console.error("Error getting device info:", error);
      // Fallback to session-based ID if everything fails
      const fallbackId = Constants.sessionId?.substring(0, 32) || `${Platform.OS}-${Date.now()}`;
      console.warn("Using fallback device info");
      return {
        device_id: fallbackId,
        device_model: 'Unknown Model',
        device_brand: 'Unknown Brand'
      };
    }
  };

  // Check initial setup on app start
  useEffect(() => {
    checkInitialSetup();
  }, []);

  const checkInitialSetup = async () => {
    try {
      // Check if site URL is already configured
      const savedUrl = await SecureStore.getItemAsync("frappe_site_url");

      if (savedUrl) {
        // URL exists, set it
        setSiteUrl(savedUrl);
        console.log("Site URL found:", savedUrl);
      } else {
        // No saved URL - LoginScreen will handle workspace URL input
        console.log("No saved URL - user will enter on LoginScreen");
        setLoading(false);
        return;
      }

      // Check for existing API credentials
      const savedUser = await SecureStore.getItemAsync("frappe_user");
      const savedApiKey = await SecureStore.getItemAsync("frappe_api_key");
      const savedApiSecret = await SecureStore.getItemAsync("frappe_api_secret");

      if (savedUser && savedApiKey && savedApiSecret) {
        // Verify API credentials are still valid
        try {
          const authToken = `token ${savedApiKey}:${savedApiSecret}`;

          const response = await fetch(
            `${savedUrl}/api/method/frappe.auth.get_logged_user`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": authToken,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.message) {
              const userEmail = data.message;

              // Verify Employee still has ESS enabled
              const employeeResponse = await fetch(
                `${savedUrl}/api/resource/Employee?filters=[["user_id","=","${userEmail}"]]&fields=["name","employee_name","allow_ess"]`,
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": authToken,
                  },
                }
              );

              const employeeData = await employeeResponse.json();

              if (
                employeeResponse.ok &&
                employeeData.data &&
                employeeData.data.length > 0 &&
                employeeData.data[0].allow_ess === 1
              ) {
                // API credentials valid and ESS still enabled
                const userData = JSON.parse(savedUser);
                setUser(userData);

                // Only set authenticated if password reset is NOT required
                if (!userData.require_password_reset) {
                  setIsAuthenticated(true);
                  console.log("Session restored successfully with API credentials");
                } else {
                  console.log("Session restored but password reset required");
                }
              } else {
                // ESS disabled or no employee record
                console.log("ESS disabled or employee record not found");
                await clearAuthData();
              }
            } else {
              await clearAuthData();
            }
          } else {
            // Invalid credentials
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

        console.log("Site URL configured successfully:", normalizedUrl);
        return { success: true, url: normalizedUrl };
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

  const login = async (appId, appPassword, urlOverride = null) => {
    try {
      setLoading(true);

      // Use provided URL or fall back to state
      const loginUrl = urlOverride || siteUrl;

      if (!loginUrl) {
        throw new Error("Site URL not configured");
      }

      console.log("Attempting mobile app login at:", loginUrl);
      console.log("App ID:", appId);

      // Get device info (ID, model, brand)
      const deviceInfo = await getDeviceInfo();
      console.log("Device Info:", deviceInfo);

      // Use mobile_app_login endpoint
      const loginResponse = await fetch(`${loginUrl}/api/method/ashida.ashida_gaxis.api.mobile_auth.mobile_app_login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          usr: appId,
          app_password: appPassword,
          device_id: deviceInfo.device_id,
          device_model: deviceInfo.device_model,
          device_brand: deviceInfo.device_brand,
        }),
      });

      const loginData = await loginResponse.json();
      console.log("Login response:", loginData);

      if (loginResponse.ok && loginData.message) {
        const response = loginData.message;

        if (response.success && response.data) {
          const { employee_id, employee_name, user, api_key, api_secret, device_id, app_id, require_password_reset } = response.data;

          console.log("✅ Login successful!");
          console.log("📱 Device registered/verified:", deviceInfo.device_model, deviceInfo.device_brand);
          console.log("👤 Employee:", employee_name, `(${employee_id})`);
          console.log("🔐 Require password reset:", require_password_reset);

          // All validations passed - proceed with login
          const userData = {
            name: appId,
            email: user,
            full_name: employee_name || user,
            employee_id: employee_id,
            api_key: api_key,
            api_secret: api_secret,
            device_id: device_id,
            app_id: app_id,
            require_password_reset: require_password_reset === 1,
          };

          // Save user data with API credentials
          await SecureStore.setItemAsync("frappe_user", JSON.stringify(userData));
          await SecureStore.setItemAsync("frappe_api_key", api_key);
          await SecureStore.setItemAsync("frappe_api_secret", api_secret);

          setUser(userData);

          // Only set authenticated if password reset is NOT required
          if (require_password_reset !== 1) {
            setIsAuthenticated(true);
          }

          console.log("Login successful with API credentials");
          return {
            success: true,
            require_password_reset: require_password_reset === 1
          };
        } else {
          // Backend returned success: false with a message
          throw new Error(response.message || "Login failed");
        }
      } else {
        throw new Error(loginData.exc || loginData.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login failed:", error);

      let errorMessage = "Login failed. Please check your credentials.";

      // Handle specific error messages from backend
      if (error.message.includes("Invalid App ID")) {
        errorMessage = "Invalid App ID. Please check your credentials.";
      } else if (error.message.includes("Employee Self Service is not enabled")) {
        errorMessage = error.message;
      } else if (error.message.includes("App password not set")) {
        errorMessage = "App password not set. Please contact your administrator.";
      } else if (error.message.includes("Invalid app password")) {
        errorMessage = "Invalid app password. Please try again.";
      } else if (error.message.includes("Access denied. This account is registered to a different device")) {
        console.log("🚫 Device mismatch - login blocked");
        errorMessage = "This account is registered to a different device. Please contact HR to reset device access.";
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

  const resetPassword = async (newPassword) => {
    try {
      if (!user || !user.api_key || !user.api_secret) {
        throw new Error("Not authenticated");
      }

      const authToken = `token ${user.api_key}:${user.api_secret}`;

      const response = await fetch(
        `${siteUrl}/api/method/ashida.ashida_gaxis.api.mobile_auth.reset_app_password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": authToken,
          },
          body: JSON.stringify({
            new_password: newPassword,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.message && data.message.success) {
        // Update user data to clear require_password_reset flag
        const updatedUser = { ...user, require_password_reset: false };
        await SecureStore.setItemAsync("frappe_user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        setIsAuthenticated(true);

        console.log("✅ Password reset successful");
        return { success: true };
      } else {
        throw new Error(data.message?.message || "Password reset failed");
      }
    } catch (error) {
      console.error("Password reset failed:", error);
      return {
        success: false,
        error: error.message || "Failed to reset password. Please try again.",
      };
    }
  };

  const logout = async () => {
    // Clear local authentication data
    // Note: API keys remain valid on server until regenerated or user is disabled
    await clearAuthData();
    console.log("Logout completed");
  };

  const clearAuthData = async () => {
    try {
      // Clear user data and API credentials but keep site URL
      await SecureStore.deleteItemAsync("frappe_user");
      await SecureStore.deleteItemAsync("frappe_api_key");
      await SecureStore.deleteItemAsync("frappe_api_secret");
      // Also clear old session ID if it exists (for migration)
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
    resetPassword,
    siteUrl,
    setupSiteUrl,
    resetSiteUrl,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};