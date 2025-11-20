import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../_contexts/AuthContext";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

const ProfileDetailsScreen = () => {
  const { user, siteUrl } = useAuth();
  const router = useRouter();
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchEmployeeDetails = async () => {
    try {
      if (!user?.employee_id || !user?.api_key || !user?.api_secret) {
        throw new Error("User information not available");
      }

      const authToken = `token ${user.api_key}:${user.api_secret}`;

      const response = await fetch(
        `${siteUrl}/api/resource/Employee/${user.employee_id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: authToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch employee details");
      }

      const data = await response.json();
      setEmployeeData(data.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching employee details:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployeeDetails();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployeeDetails();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatFieldName = (fieldName) => {
    return fieldName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const DetailItem = ({ icon, label, value, valueColor = "#1F2937" }) => {
    if (!value || value === "N/A") return null;

    return (
      <View style={styles.detailItem}>
        <View style={styles.detailHeader}>
          <Ionicons name={icon} size={20} color="#667eea" />
          <Text style={styles.detailLabel}>{label}</Text>
        </View>
        <Text style={[styles.detailValue, { color: valueColor }]}>
          {value}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading employee details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3D71" />
        <Text style={styles.errorText}>Failed to load employee details</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchEmployeeDetails}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile Details</Text>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color="#667eea" />
            </View>
          </View>
          <Text style={styles.employeeName}>
            {employeeData?.employee_name || "N/A"}
          </Text>
          <Text style={styles.employeeId}>
            {employeeData?.name || employeeData?.employee || "N/A"}
          </Text>
          {employeeData?.status && (
            <View
              style={[
                styles.statusBadge,
                employeeData.status === "Active"
                  ? styles.statusActive
                  : styles.statusInactive,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  employeeData.status === "Active"
                    ? styles.statusTextActive
                    : styles.statusTextInactive,
                ]}
              >
                {employeeData.status}
              </Text>
            </View>
          )}
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.sectionContent}>
            <DetailItem
              icon="briefcase-outline"
              label="Designation"
              value={employeeData?.designation}
            />
            <DetailItem
              icon="business-outline"
              label="Department"
              value={employeeData?.department}
            />
            <DetailItem
              icon="home-outline"
              label="Company"
              value={employeeData?.company}
            />
            <DetailItem
              icon="location-outline"
              label="Branch"
              value={employeeData?.branch}
            />
            <DetailItem
              icon="person-outline"
              label="Gender"
              value={employeeData?.gender}
            />
            <DetailItem
              icon="calendar-outline"
              label="Date of Birth"
              value={formatDate(employeeData?.date_of_birth)}
            />
            <DetailItem
              icon="calendar-outline"
              label="Date of Joining"
              value={formatDate(employeeData?.date_of_joining)}
            />
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.sectionContent}>
            <DetailItem
              icon="mail-outline"
              label="Company Email"
              value={employeeData?.company_email || employeeData?.user_id}
            />
            <DetailItem
              icon="mail-outline"
              label="Personal Email"
              value={employeeData?.personal_email}
            />
            <DetailItem
              icon="call-outline"
              label="Mobile Number"
              value={employeeData?.cell_number}
            />
            <DetailItem
              icon="home-outline"
              label="Current Address"
              value={employeeData?.current_address}
            />
            <DetailItem
              icon="home-outline"
              label="Permanent Address"
              value={employeeData?.permanent_address}
            />
          </View>
        </View>

        {/* Employment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employment Details</Text>
          <View style={styles.sectionContent}>
            <DetailItem
              icon="person-outline"
              label="Reports To"
              value={employeeData?.reports_to}
            />
            <DetailItem
              icon="people-outline"
              label="Employee Number"
              value={employeeData?.employee_number}
            />
            <DetailItem
              icon="card-outline"
              label="Attendance Device ID"
              value={employeeData?.attendance_device_id}
            />
            <DetailItem
              icon="briefcase-outline"
              label="Employment Type"
              value={employeeData?.employment_type}
            />
            <DetailItem
              icon="calendar-outline"
              label="Contract End Date"
              value={formatDate(employeeData?.contract_end_date)}
            />
            <DetailItem
              icon="calendar-outline"
              label="Relieving Date"
              value={formatDate(employeeData?.relieving_date)}
            />
          </View>
        </View>

        {/* Personal Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <View style={styles.sectionContent}>
            <DetailItem
              icon="person-outline"
              label="Blood Group"
              value={employeeData?.blood_group}
            />
            <DetailItem
              icon="heart-outline"
              label="Marital Status"
              value={employeeData?.marital_status}
            />
            <DetailItem
              icon="card-outline"
              label="PAN Number"
              value={employeeData?.pan_number}
            />
            <DetailItem
              icon="card-outline"
              label="Passport Number"
              value={employeeData?.passport_number}
            />
            <DetailItem
              icon="shield-outline"
              label="Aadhaar Number"
              value={employeeData?.aadhaar_number}
            />
          </View>
        </View>

        {/* Additional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          <View style={styles.sectionContent}>
            <DetailItem
              icon="calendar-outline"
              label="Date of Retirement"
              value={formatDate(employeeData?.date_of_retirement)}
            />
            <DetailItem
              icon="alert-circle-outline"
              label="Notice Period (Days)"
              value={employeeData?.notice_number_of_days?.toString()}
            />
            <DetailItem
              icon="person-outline"
              label="Prefered Contact Email"
              value={employeeData?.prefered_contact_email}
            />
            <DetailItem
              icon="call-outline"
              label="Emergency Contact"
              value={employeeData?.emergency_phone_number}
            />
            <DetailItem
              icon="person-outline"
              label="Emergency Contact Name"
              value={employeeData?.person_to_be_contacted}
            />
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingVertical: 32,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#667eea",
  },
  employeeName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  employeeId: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  statusActive: {
    backgroundColor: "#D1FAE5",
  },
  statusInactive: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  statusTextActive: {
    color: "#059669",
  },
  statusTextInactive: {
    color: "#DC2626",
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailItem: {
    marginBottom: 16,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginLeft: 8,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 28,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: "#667eea",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomSpacing: {
    height: 32,
  },
});

export default ProfileDetailsScreen;
