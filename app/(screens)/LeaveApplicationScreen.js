// LeaveApplication.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Alert,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../_contexts/AuthContext';
import { useFrappeService } from '../_services/frappeService';

const { width } = Dimensions.get('window');

const LeaveApplication = ({ navigation, route }) => {
  const { user } = useAuth();
  const frappeService = useFrappeService();
  
  // State management
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLeaveTypes, setLoadingLeaveTypes] = useState(true);

  // Load employee and leave types on component mount
  useEffect(() => {
    fetchEmployeeAndLeaveTypes();
  }, []);

  const fetchEmployeeAndLeaveTypes = async () => {
    try {
      // First, get current employee
      const employees = await frappeService.getList('Employee', {
        fields: ['name', 'employee_name', 'user_id'],
        filters: { user_id: user.email },
        limit: 1
      });

      if (employees && employees.length > 0) {
        setCurrentEmployee(employees[0]);
      }

      // Then fetch leave types
      const leaveTypesData = await frappeService.getList('Leave Type', {
        fields: ['name', 'leave_type_name', 'max_leaves_allowed', 'is_earned_leave'],
        limit: 100
      });

      if (leaveTypesData && leaveTypesData.length > 0) {
        setLeaveTypes(leaveTypesData);
        setSelectedLeaveType(leaveTypesData[0].name);
      } else {
        // Fallback leave types
        const defaultLeaveTypes = [
          { name: 'Annual Leave', leave_type_name: 'Annual Leave', max_leaves_allowed: 21 },
          { name: 'Sick Leave', leave_type_name: 'Sick Leave', max_leaves_allowed: 12 },
          { name: 'Casual Leave', leave_type_name: 'Casual Leave', max_leaves_allowed: 12 },
        ];
        setLeaveTypes(defaultLeaveTypes);
        setSelectedLeaveType(defaultLeaveTypes[0].name);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load leave types');
    } finally {
      setLoadingLeaveTypes(false);
    }
  };

  const calculateLeaveDays = () => {
    const timeDifference = toDate.getTime() - fromDate.getTime();
    const dayDifference = Math.ceil(timeDifference / (1000 * 3600 * 24)) + 1;
    return Math.max(dayDifference, 1);
  };

  const handleSubmitLeave = async () => {
    // Validation
    if (!currentEmployee) {
      Alert.alert('Error', 'Employee information not found');
      return;
    }

    if (!selectedLeaveType) {
      Alert.alert('Error', 'Please select a leave type');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for leave');
      return;
    }

    if (fromDate > toDate) {
      Alert.alert('Error', 'From date cannot be after to date');
      return;
    }

    try {
      setLoading(true);

      const leaveData = {
        employee: currentEmployee.name,
        leave_type: selectedLeaveType,
        from_date: fromDate.toISOString().split('T')[0],
        to_date: toDate.toISOString().split('T')[0],
        posting_date: new Date().toISOString().split('T')[0],
        reason: reason.trim(),
        half_day: 0,
        status: 'Open',
      };

      console.log('Submitting leave data:', leaveData);

      const result = await frappeService.createDoc('Leave Application', leaveData);

      console.log('Leave application result:', result);

      Alert.alert(
        'Success',
        'Your leave application has been submitted successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );

    } catch (error) {
      console.error('Error submitting leave:', error);
      Alert.alert('Error', 'Failed to submit leave application: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const onFromDateChange = (event, selectedDate) => {
    setShowFromDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFromDate(selectedDate);
      // Auto-adjust to date if it's before from date
      if (selectedDate > toDate) {
        setToDate(selectedDate);
      }
    }
  };

  const onToDateChange = (event, selectedDate) => {
    setShowToDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setToDate(selectedDate);
    }
  };

  const renderLeaveTypeChip = (leaveType) => (
    <TouchableOpacity
      key={leaveType.name}
      style={[
        styles.leaveTypeChip,
        selectedLeaveType === leaveType.name && styles.leaveTypeChipSelected,
      ]}
      onPress={() => setSelectedLeaveType(leaveType.name)}
    >
      <Text
        style={[
          styles.leaveTypeChipText,
          selectedLeaveType === leaveType.name && styles.leaveTypeChipTextSelected,
        ]}
      >
        {leaveType.leave_type_name || leaveType.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apply for Leave</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          {/* User Info Card */}
          {currentEmployee && (
            <View style={styles.userInfoCard}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.userInfoGradient}
              >
                <Ionicons name="person" size={24} color="#fff" />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{currentEmployee.employee_name}</Text>
                  <Text style={styles.userEmployee}>ID: {currentEmployee.name}</Text>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Leave Type Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Leave Type *</Text>
            {loadingLeaveTypes ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#667eea" />
                <Text style={styles.loadingText}>Loading leave types...</Text>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.leaveTypeScroll}
                contentContainerStyle={styles.leaveTypeScrollContent}
              >
                {leaveTypes.map(renderLeaveTypeChip)}
              </ScrollView>
            )}
          </View>

          {/* Date Selection */}
          <View style={styles.dateContainer}>
            <View style={styles.dateGroup}>
              <Text style={styles.label}>From Date *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowFromDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color="#667eea" />
                <Text style={styles.dateButtonText}>{formatDate(fromDate)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateGroup}>
              <Text style={styles.label}>To Date *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowToDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color="#667eea" />
                <Text style={styles.dateButtonText}>{formatDate(toDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Leave Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Leave Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Days:</Text>
              <Text style={styles.summaryValue}>{calculateLeaveDays()} day(s)</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Leave Type:</Text>
              <Text style={styles.summaryValue}>
                {leaveTypes.find(lt => lt.name === selectedLeaveType)?.leave_type_name || selectedLeaveType}
              </Text>
            </View>
          </View>

          {/* Reason Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reason for Leave *</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Please provide a reason for your leave request..."
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmitLeave}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? ['#9CA3AF', '#9CA3AF'] : ['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit Application</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Pickers */}
      {showFromDatePicker && (
        <DateTimePicker
          value={fromDate}
          mode="date"
          display="default"
          onChange={onFromDateChange}
          minimumDate={new Date()}
        />
      )}

      {showToDatePicker && (
        <DateTimePicker
          value={toDate}
          mode="date"
          display="default"
          onChange={onToDateChange}
          minimumDate={fromDate}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  userInfoCard: {
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  userInfoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  userEmployee: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
  },
  loadingText: {
    marginLeft: 12,
    color: '#666',
    fontSize: 14,
  },
  leaveTypeScroll: {
    marginBottom: 8,
  },
  leaveTypeScrollContent: {
    paddingRight: 20,
  },
  leaveTypeChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  leaveTypeChipSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  leaveTypeChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  leaveTypeChipTextSelected: {
    color: '#fff',
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  dateGroup: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    elevation: 2,
  },
  dateButtonText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reasonInput: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#333',
    minHeight: 120,
    elevation: 2,
    textAlignVertical: 'top',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default LeaveApplication;