import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  RefreshControl,
  Alert,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../_contexts/AuthContext';
import { useFrappeService } from '../_services/frappeService';
import AttendanceCalendar from '../components/AttendanceCalendar';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const frappeService = useFrappeService();

  // State management
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [todayCheckins, setTodayCheckins] = useState([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState('');
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [showCheckButton, setShowCheckButton] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Quick Actions Configuration
  const quickActions = [
    {
      id: 'reports',
      title: 'View Reports',
      icon: 'bar-chart',
      color: '#6366F1',
      onPress: () => router.push('/(screens)/ReportsScreen')
    },
    {
      id: 'leave',
      title: 'Apply Leave',
      icon: 'time',
      color: '#4CAF50',
      onPress: () => router.push('/(screens)/LeaveApplicationScreen')
    },
    {
      id: 'salary',
      title: 'Salary Slip',
      icon: 'receipt',
      color: '#2196F3',
      onPress: () => Alert.alert('Salary Slip', 'Navigate to salary slip')
    },
    {
      id: 'expense',
      title: 'Expense Claim',
      icon: 'card',
      color: '#FF9800',
      onPress: () => Alert.alert('Expense Claim', 'Navigate to expense claim')
    },
    {
      id: 'directory',
      title: 'Team Directory',
      icon: 'people',
      color: '#9C27B0',
      onPress: () => Alert.alert('Team Directory', 'Navigate to team directory')
    },
    {
      id: 'holidays',
      title: 'Holidays',
      icon: 'calendar',
      color: '#FF5722',
      onPress: () => router.push('/(screens)/HolidaysScreen')
    }
  ];

  // Calendar related state
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Utility functions
  const formatTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const getTodayDateRange = useCallback(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    return {
      startTime: `${yyyy}-${mm}-${dd} 00:00:00`,
      endTime: `${yyyy}-${mm}-${dd} 23:59:59`,
    };
  }, []);

  const formatTime = (timeString) => {
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Core functions
  const checkTodayCheckinStatus = useCallback(async (employeeName) => {
    try {
      const { startTime, endTime } = getTodayDateRange();

      const checkins = await frappeService.getList('Employee Checkin', {
        fields: ['name', 'employee', 'time', 'log_type'],
        filters: {
          employee: employeeName,
          time: ['between', [startTime, endTime]]
        },
        order_by: 'time asc'
      });

      console.log('Today checkins:', checkins);
      setTodayCheckins(checkins || []);

      if (checkins && checkins.length > 0) {
        const inLog = checkins.find(entry => entry.log_type === 'IN');
        const outLog = checkins.find(entry => entry.log_type === 'OUT');

        if (inLog && outLog) {
          setShowCheckButton(false);
          setCheckInTime('');
          setIsCheckedIn(false);
        } else if (inLog) {
          setShowCheckButton(true);
          const time = new Date(inLog.time);
          setCheckInTime(time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }));
          setIsCheckedIn(true);
        } else {
          setShowCheckButton(true);
          setCheckInTime('');
          setIsCheckedIn(false);
        }
      } else {
        setShowCheckButton(true);
        setCheckInTime('');
        setIsCheckedIn(false);
      }
    } catch (error) {
      console.error('Error checking today checkin status:', error);
      throw error;
    }
  }, [getTodayDateRange, frappeService]);

  const checkEmployeeExist = useCallback(async () => {
    if (!user?.email) {
      setShowCheckButton(false);
      setCurrentEmployee(null);
      return;
    }

    try {
      console.log('Checking employee for user:', user.email);

      const employees = await frappeService.getList('Employee', {
        fields: ['name', 'employee_name', 'user_id', 'status'],
        filters: { user_id: user.email },
        limit: 1
      });

      if (employees && employees.length > 0) {
        const employeeData = employees[0];
        console.log('Found employee:', employeeData);
        setCurrentEmployee(employeeData);
        await checkTodayCheckinStatus(employeeData.name);
      } else {
        console.log('No employee found for user:', user.email);
        setShowCheckButton(false);
        setCurrentEmployee(null);
        setIsCheckedIn(false);
        setCheckInTime('');
      }
    } catch (error) {
      console.error('Error checking employee:', error);
      if (!refreshing) {
        Alert.alert('Error', 'Failed to check employee status: ' + error.message);
      }
      setShowCheckButton(false);
      setCurrentEmployee(null);
    }
  }, [user?.email, frappeService, checkTodayCheckinStatus, refreshing]);

  const handleEmployeeCheckIn = useCallback(async () => {
    if (!currentEmployee) {
      Alert.alert('Error', 'Employee information not found. Please try refreshing.');
      return;
    }

    setCheckInLoading(true);
    try {
      const logType = isCheckedIn ? 'OUT' : 'IN';
      const timestamp = formatTimestamp();

      console.log('Creating checkin record:', {
        employee: currentEmployee.name,
        time: timestamp,
        log_type: logType
      });

      const result = await frappeService.createDoc('Employee Checkin', {
        employee: currentEmployee.name,
        time: timestamp,
        log_type: logType
      });

      console.log('Checkin result:', result);

      if (result) {
        if (!isCheckedIn) {
          setIsCheckedIn(true);
          const time = new Date(result.time || timestamp);
          setCheckInTime(time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }));
          Alert.alert('Success', `Successfully checked in at ${formatTime(result.time || timestamp)}`);
        } else {
          setShowCheckButton(false);
          setCheckInTime('');
          setIsCheckedIn(false);
          Alert.alert('Success', 'Successfully checked out. Have a great day!');
        }

        await checkTodayCheckinStatus(currentEmployee.name);
      }
    } catch (error) {
      console.error('Checkin error:', error);
      Alert.alert('Error', `Failed to ${isCheckedIn ? 'check out' : 'check in'}: ${error.message}`);
    } finally {
      setCheckInLoading(false);
    }
  }, [currentEmployee, isCheckedIn, frappeService, checkTodayCheckinStatus, formatTimestamp]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await checkEmployeeExist();
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [checkEmployeeExist]);

  // Effects
  useEffect(() => {
    let isMounted = true;

    const initializeEmployee = async () => {
      if (isMounted && user?.email) {
        await checkEmployeeExist();
      }
    };

    initializeEmployee();

    return () => {
      isMounted = false;
    };
  }, [user?.email]);

  // Render functions
  const renderCheckinStatus = () => {
    if (!currentEmployee) {
      return (
        <View style={styles.statusContainer}>
          <View style={styles.statusIconContainer}>
            <Ionicons name="alert-circle" size={32} color="#F44336" />
          </View>
          <Text style={styles.statusText}>Employee Not Found</Text>
          <Text style={styles.statusSubtext}>
            Please contact HR or try refreshing the page.
          </Text>
        </View>
      );
    }

    if (!showCheckButton) {
      return (
        <View style={styles.statusContainer}>
          <View style={styles.statusIconContainer}>
            <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
          </View>
          <Text style={styles.statusText}>Work Day Complete!</Text>
          <Text style={styles.statusSubtext}>
            You've successfully completed your work day. Have a great evening!
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.statusContainer}>
        {isCheckedIn ? (
          <>
            <View style={styles.statusIconContainer}>
              <Ionicons name="time" size={32} color="#2196F3" />
            </View>
            <Text style={styles.statusText}>Welcome Back!</Text>
            <Text style={styles.statusSubtext}>
              You started your day at <Text style={styles.timeHighlight}>{checkInTime}</Text>
            </Text>
            <Text style={styles.statusReminder}>
              Don't forget to check out when you're done!
            </Text>
          </>
        ) : (
          <>
            <View style={styles.statusIconContainer}>
              <Ionicons name="sunny" size={32} color="#FF9800" />
            </View>
            <Text style={styles.statusText}>Good Morning!</Text>
            <Text style={styles.statusSubtext}>
              You haven't checked in today. Ready to start your day?
            </Text>
          </>
        )}
      </View>
    );
  };

  const renderQuickAction = (action) => (
    <TouchableOpacity
      key={action.id}
      style={styles.quickActionItem}
      onPress={action.onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
        <Ionicons name={action.icon} size={24} color="#fff" />
      </View>
      <Text style={styles.quickActionText}>{action.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea', '#764ba2']}
            tintColor="#667eea"
            title="Pull to refresh"
            titleColor="#667eea"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.welcomeGradient}
          >
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.welcomeName}>
                {currentEmployee?.employee_name || user?.full_name || user?.name || 'User'}
              </Text>
              <Text style={styles.lastRefreshText}>
                Last updated: {lastRefresh.toLocaleTimeString()}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Check-in/Check-out Card */}
        <View style={styles.checkinCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Attendance</Text>
            <Ionicons name="time" size={24} color="#667eea" />
          </View>

          {renderCheckinStatus()}

          {/* Check-in/Check-out Button */}
          {showCheckButton && (
            <TouchableOpacity
              onPress={handleEmployeeCheckIn}
              disabled={checkInLoading}
              style={[
                styles.checkinButton,
                checkInLoading && styles.checkinButtonDisabled
              ]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isCheckedIn ? ['#F44336', '#D32F2F'] : ['#4CAF50', '#388E3C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.checkinButtonGradient}
              >
                {checkInLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name={isCheckedIn ? "log-out" : "log-in"}
                      size={20}
                      color="#fff"
                      style={styles.checkinIcon}
                    />
                    <Text style={styles.checkinButtonText}>
                      {isCheckedIn ? "Check-Out" : "Check-In"}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Calendar Button */}
        {currentEmployee && (
          <View style={styles.calendarCard}>
            <TouchableOpacity
              style={styles.calendarButton}
              onPress={() => setShowCalendar(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.calendarButtonGradient}
              >
                <Ionicons name="calendar" size={24} color="#fff" style={styles.calendarIcon} />
                <Text style={styles.calendarButtonText}>View Attendance Calendar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions Card */}
        {currentEmployee && (
          <View style={styles.quickActionsCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Quick Actions</Text>
              <Ionicons name="apps" size={24} color="#667eea" />
            </View>
            <View style={styles.quickActionsGrid}>
              {quickActions.map(renderQuickAction)}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Calendar Modal */}
      <AttendanceCalendar
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        currentEmployee={currentEmployee}
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 16,
  },
  welcomeCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  welcomeGradient: {
    padding: 24,
  },
  welcomeContent: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  welcomeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  lastRefreshText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  checkinCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 16,
  },
  statusIconContainer: {
    marginBottom: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  timeHighlight: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statusReminder: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  checkinButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkinButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  checkinButtonDisabled: {
    opacity: 0.6,
  },
  checkinIcon: {
    marginRight: 8,
  },
  checkinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  calendarCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  calendarButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  calendarButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  calendarIcon: {
    marginRight: 12,
  },
  calendarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  quickActionsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  quickActionItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 24,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default HomeScreen;
