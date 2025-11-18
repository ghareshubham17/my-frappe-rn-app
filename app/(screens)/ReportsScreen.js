import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const ReportsScreen = () => {
  const router = useRouter();

  const reports = [
    {
      id: "monthly_attendance",
      title: "Monthly Attendance Sheet",
      description: "View detailed monthly attendance records",
      icon: "calendar",
      color: "#4CAF50",
      onPress: () => router.push("/(screens)/MonthlyAttendanceScreen"),
    },
    {
      id: "leave_balance",
      title: "Employee Leave Balance",
      description: "Check current leave balance and history",
      icon: "time",
      color: "#2196F3",
      onPress: () => Alert.alert("leave_balance", "Navigate to leave_balance"),
    },
    {
      id: "leave_summary",
      title: "Employee Leave Balance Summary",
      description: "Summary of all leave types and balances",
      icon: "document-text",
      color: "#FF9800",
      onPress: () => Alert.alert("leave_summary", "Navigate to leave_summary"),
    },
  ];

  const renderReportCard = (report) => (
    <TouchableOpacity
      key={report.id}
      style={styles.reportCard}
      onPress={report.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.reportCardContent}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: report.color + "20" },
          ]}
        >
          <Ionicons name={report.icon} size={24} color={report.color} />
        </View>

        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle}>{report.title}</Text>
          <Text style={styles.reportDescription}>{report.description}</Text>
        </View>

        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.welcomeText}>Select a Report</Text>
          <Text style={styles.subtitleText}>
            Choose from the available reports below
          </Text>
        </View>

        {/* Reports List */}
        <View style={styles.reportsContainer}>
          <Text style={styles.sectionTitle}>Available Reports</Text>

          <View style={styles.reportsList}>
            {reports.map(renderReportCard)}
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#667eea" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Report Information</Text>
              <Text style={styles.infoText}>
                Reports are generated based on your attendance and leave data.
                Select any report above to view detailed information.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerSection: {
    paddingVertical: 24,
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  reportsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  reportsList: {
    gap: 12,
  },
  reportCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  reportCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  arrowContainer: {
    marginLeft: 12,
  },
  infoSection: {
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
});

export default ReportsScreen;
