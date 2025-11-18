import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useFrappeService } from '../services/frappeService';

const { width } = Dimensions.get('window');

const MonthlyAttendanceSheet = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const frappeService = useFrappeService();

  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState(null);

  // Get month date range
  const getMonthDateRange = useCallback((date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    return {
      startTime: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')} 00:00:00`,
      endTime: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')} 23:59:59`,
    };
  }, []);

  // Format time
  const formatTime = (timeString) => {
    if (!timeString) return '--';
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Calculate working hours
  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '--';
    const inTime = new Date(checkIn);
    const outTime = new Date(checkOut);
    const diffMs = outTime - inTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return '#4CAF50';
      case 'Incomplete': return '#FF9800';
      case 'Absent': return '#F44336';
      default: return '#999';
    }
  };

  // Fetch employee data
  const fetchEmployeeData = useCallback(async () => {
    if (!user?.email) return null;

    try {
      const employees = await frappeService.getList('Employee', {
        fields: ['name', 'employee_name', 'user_id', 'status'],
        filters: { user_id: user.email },
        limit: 1
      });

      if (employees && employees.length > 0) {
        setCurrentEmployee(employees[0]);
        return employees[0];
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      Alert.alert('Error', 'Failed to fetch employee data');
    }
    return null;
  }, [user?.email, frappeService]);

  // Process attendance data for the month
  const processMonthlyAttendance = useCallback((records) => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Create daily data structure
    const dailyData = {};
    
    // Process records by date
    records.forEach(record => {
      const recordDate = new Date(record.time);
      const dateKey = recordDate.toISOString().split('T')[0];
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { checkIns: [], checkOuts: [] };
      }
      
      if (record.log_type === 'IN') {
        dailyData[dateKey].checkIns.push(record.time);
      } else if (record.log_type === 'OUT') {
        dailyData[dateKey].checkOuts.push(record.time);
      }
    });

    // Generate attendance sheet for all days of the month
    const attendanceSheet = [];
    let totalPresent = 0;
    let totalIncomplete = 0;
    let totalAbsent = 0;
    let totalWorkingHours = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = dailyData[dateKey];
      
      // Get day name
      const dayDate = new Date(year, month, day);
      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
      
      let status = 'Absent';
      let checkInTime = null;
      let checkOutTime = null;
      let workingHours = '--';
      
      if (dayData) {
        const hasCheckIn = dayData.checkIns.length > 0;
        const hasCheckOut = dayData.checkOuts.length > 0;
        
        if (hasCheckIn) {
          checkInTime = dayData.checkIns[0];
          
          if (hasCheckOut) {
            checkOutTime = dayData.checkOuts[0];
            status = 'Present';
            totalPresent++;
            
            // Calculate working hours
            const inTime = new Date(checkInTime);
            const outTime = new Date(checkOutTime);
            const diffMs = outTime - inTime;
            const hours = diffMs / (1000 * 60 * 60);
            totalWorkingHours += hours;
            workingHours = calculateWorkingHours(checkInTime, checkOutTime);
          } else {
            status = 'Incomplete';
            totalIncomplete++;
          }
        } else if (dayData.checkOuts.length > 0) {
          checkOutTime = dayData.checkOuts[0];
          status = 'Incomplete';
          totalIncomplete++;
        } else {
          totalAbsent++;
        }
      } else {
        totalAbsent++;
      }

      attendanceSheet.push({
        date: day,
        dateKey,
        dayName,
        status,
        checkInTime,
        checkOutTime,
        workingHours
      });
    }

    // Calculate statistics
    const stats = {
      totalDays: daysInMonth,
      presentDays: totalPresent,
      incompleteDays: totalIncomplete,
      absentDays: totalAbsent,
      totalWorkingHours: totalWorkingHours.toFixed(1),
      averageHours: totalPresent > 0 ? (totalWorkingHours / totalPresent).toFixed(1) : '0',
      attendancePercentage: ((totalPresent / daysInMonth) * 100).toFixed(1)
    };

    setAttendanceData(attendanceSheet);
    setMonthlyStats(stats);
  }, [selectedMonth]);

  // Fetch monthly data
  const fetchMonthlyData = useCallback(async (employee) => {
    if (!employee) return;

    try {
      setLoading(true);
      const { startTime, endTime } = getMonthDateRange(selectedMonth);
      
      const records = await frappeService.getList('Employee Checkin', {
        fields: ['name', 'employee', 'time', 'log_type'],
        filters: {
          employee: employee.name,
          time: ['between', [startTime, endTime]]
        },
        order_by: 'time asc',
        limit: 1000
      });

      processMonthlyAttendance(records || []);
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      Alert.alert('Error', 'Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, getMonthDateRange, frappeService, processMonthlyAttendance]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      const employee = await fetchEmployeeData();
      if (employee) {
        await fetchMonthlyData(employee);
      } else {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedMonth]);

  // Navigate month
  const navigateMonth = (direction) => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(selectedMonth.getMonth() + direction);
    setSelectedMonth(newMonth);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Monthly Attendance</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading attendance sheet...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Monthly Attendance</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Employee & Month Info */}
        <View style={styles.infoCard}>
          <Text style={styles.employeeName}>
            {currentEmployee?.employee_name || 'Employee'}
          </Text>
          
          {/* Month Navigation */}
          <View style={styles.monthNavigation}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigateMonth(-1)}
            >
              <Ionicons name="chevron-back" size={20} color="#667eea" />
            </TouchableOpacity>
            
            <Text style={styles.monthText}>
              {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigateMonth(1)}
            >
              <Ionicons name="chevron-forward" size={20} color="#667eea" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Stats */}
        {monthlyStats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Monthly Summary</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{monthlyStats.presentDays}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{monthlyStats.incompleteDays}</Text>
                <Text style={styles.statLabel}>Incomplete</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{monthlyStats.absentDays}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{monthlyStats.attendancePercentage}%</Text>
                <Text style={styles.statLabel}>Attendance</Text>
              </View>
            </View>
          </View>
        )}

        {/* Attendance Table */}
        <View style={styles.tableCard}>
          <Text style={styles.tableTitle}>Daily Attendance Record</Text>
          
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.dateColumn]}>Date</Text>
            <Text style={[styles.tableHeaderText, styles.timeColumn]}>In</Text>
            <Text style={[styles.tableHeaderText, styles.timeColumn]}>Out</Text>
            <Text style={[styles.tableHeaderText, styles.hoursColumn]}>Hours</Text>
            <Text style={[styles.tableHeaderText, styles.statusColumn]}>Status</Text>
          </View>

          {/* Table Rows */}
          <ScrollView style={styles.tableBody} nestedScrollEnabled={true}>
            {attendanceData.map((day) => (
              <View key={day.dateKey} style={styles.tableRow}>
                <View style={styles.dateColumn}>
                  <Text style={styles.dateText}>{day.date}</Text>
                  <Text style={styles.dayText}>{day.dayName}</Text>
                </View>
                
                <Text style={[styles.tableCell, styles.timeColumn]}>
                  {formatTime(day.checkInTime)}
                </Text>
                
                <Text style={[styles.tableCell, styles.timeColumn]}>
                  {formatTime(day.checkOutTime)}
                </Text>
                
                <Text style={[styles.tableCell, styles.hoursColumn]}>
                  {day.workingHours}
                </Text>
                
                <View style={[styles.statusColumn, styles.statusContainer]}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(day.status) }]}>
                    <Text style={styles.statusText}>{day.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Legend */}
        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Present - Complete attendance</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendText}>Incomplete - Missing check-in/out</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
              <Text style={styles.legendText}>Absent - No attendance record</Text>
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
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  tableBody: {
    maxHeight: 400,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  dateColumn: {
    width: 60,
    alignItems: 'center',
  },
  timeColumn: {
    width: 60,
    textAlign: 'center',
  },
  hoursColumn: {
    width: 70,
    textAlign: 'center',
  },
  statusColumn: {
    flex: 1,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dayText: {
    fontSize: 10,
    color: '#666',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  legendCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  legendItems: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});

export default MonthlyAttendanceSheet;