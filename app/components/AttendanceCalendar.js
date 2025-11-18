import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFrappeService } from '../services/frappeService';

const { width } = Dimensions.get('window');
const CELL_WIDTH = (width - 40) / 7; // 7 days in a week, 40px for padding

const AttendanceCalendar = ({ 
  visible, 
  onClose, 
  currentEmployee, 
  currentMonth, 
  setCurrentMonth 
}) => {
  const frappeService = useFrappeService();
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [processedData, setProcessedData] = useState({});
  
  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [checkoutTime, setCheckoutTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const processAttendanceData = useCallback((records) => {
    const dailyData = {};
    
    records.forEach(record => {
      const recordDate = new Date(record.time);
      const dateKey = recordDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          checkIns: [],
          checkOuts: [],
          status: 'absent'
        };
      }
      
      if (record.log_type === 'IN') {
        dailyData[dateKey].checkIns.push(record.time);
      } else if (record.log_type === 'OUT') {
        dailyData[dateKey].checkOuts.push(record.time);
      }
    });
    
    // Determine status for each day
    Object.keys(dailyData).forEach(dateKey => {
      const dayData = dailyData[dateKey];
      const hasCheckIn = dayData.checkIns.length > 0;
      const hasCheckOut = dayData.checkOuts.length > 0;
      
      if (hasCheckIn && hasCheckOut) {
        // Both IN and OUT entries exist
        if (dayData.checkOuts.length >= dayData.checkIns.length) {
          dayData.status = 'present';
        } else {
          dayData.status = 'incomplete'; // Missing checkout
        }
      } else if (hasCheckIn && !hasCheckOut) {
        // Only IN entry, missing OUT
        dayData.status = 'incomplete';
      } else if (!hasCheckIn && hasCheckOut) {
        // Only OUT entry, missing IN - this is also incomplete
        dayData.status = 'incomplete';
      } else {
        // No entries at all
        dayData.status = 'absent';
      }
    });
    
    return dailyData;
  }, []);

  const fetchMonthlyRecords = useCallback(async () => {
    if (!currentEmployee) return;
    
    try {
      console.log('=== FETCHING MONTHLY RECORDS ===');
      console.log('Employee:', currentEmployee);
      console.log('Current Month:', currentMonth);

      const { startTime, endTime } = getMonthDateRange(currentMonth);
      console.log('Date range:', { startTime, endTime });
      
      const records = await frappeService.getList('Employee Checkin', {
        fields: ['name', 'employee', 'time', 'log_type'],
        filters: {
          employee: currentEmployee.name,
          time: ['between', [startTime, endTime]]
        },
        order_by: 'time asc',
        limit: 1000
      });

      console.log('Fetched records:', records);
      console.log('Number of records:', records?.length || 0);
      
      setMonthlyRecords(records || []);
      const processed = processAttendanceData(records || []);
      setProcessedData(processed);
      console.log('Processed data:', processed);
      
    } catch (error) {
      console.error('Error fetching monthly records:', error);
      Alert.alert('Error', 'Failed to fetch calendar data: ' + error.message);
    }
  }, [currentEmployee, currentMonth, getMonthDateRange, frappeService, processAttendanceData]);

  useEffect(() => {
    if (visible && currentEmployee) {
      console.log('Calendar opened, fetching records...');
      fetchMonthlyRecords();
    }
  }, [visible, currentMonth, currentEmployee?.name]);

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const formatTime = (timeString) => {
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleIncompleteClick = (day, dayData) => {
    const dateKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateKey);
    setSelectedDayData(dayData);
    setCheckoutTime('17:00'); // Default checkout time
    setShowDialog(true);
  };

  const handleSubmitCheckout = async () => {
    if (!checkoutTime || !selectedDate || !currentEmployee) {
      Alert.alert('Error', 'Please enter a valid checkout time');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create timestamp for checkout
      const checkoutTimestamp = `${selectedDate} ${checkoutTime}:00`;
      
      console.log('Creating checkout record:', {
        employee: currentEmployee.name,
        time: checkoutTimestamp,
        log_type: 'OUT'
      });

      const result = await frappeService.createDoc('Employee Checkin', {
        employee: currentEmployee.name,
        time: checkoutTimestamp,
        log_type: 'OUT'
      });

      console.log('Checkout record created:', result);
      
      // Close dialog and refresh data
      setShowDialog(false);
      setCheckoutTime('');
      setSelectedDate(null);
      setSelectedDayData(null);
      
      Alert.alert('Success', 'Checkout record added successfully!');
      
      // Refresh the calendar data
      await fetchMonthlyRecords();
      
    } catch (error) {
      console.error('Error creating checkout record:', error);
      Alert.alert('Error', 'Failed to add checkout record: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCalendarGrid = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    const weeks = [];
    let currentWeek = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      currentWeek.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = processedData[dateKey];
      
      currentWeek.push({
        day,
        dateKey,
        data: dayData
      });
    }
    
    // Fill remaining cells in the last week
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
    
    return weeks;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return '#4CAF50'; // Green
      case 'incomplete':
        return '#FF9800'; // Orange
      case 'absent':
        return '#F44336'; // Red
      default:
        return '#E0E0E0'; // Light gray
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'present':
        return 'P';
      case 'incomplete':
        return 'I';
      case 'absent':
        return 'A';
      default:
        return '';
    }
  };

  const renderDayCell = (dayInfo) => {
    if (!dayInfo) {
      return <View style={[styles.dayCell, styles.emptyCell]} key="empty" />;
    }

    const { day, data } = dayInfo;
    const today = new Date();
    const isToday = 
      today.getFullYear() === currentMonth.getFullYear() &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getDate() === day;

    return (
      <TouchableOpacity
        key={day}
        style={[
          styles.dayCell,
          isToday && styles.todayCell,
          data && { backgroundColor: getStatusColor(data.status) + '20' }
        ]}
        onPress={() => {
          if (data) {
            if (data.status === 'incomplete') {
              handleIncompleteClick(day, data);
            } else if (data.status === 'absent') {
              Alert.alert(
                `Attendance - ${day}/${currentMonth.getMonth() + 1}`,
                `Status: ${data.status}\nCheck-ins: ${data.checkIns.length}\nCheck-outs: ${data.checkOuts.length}`
              );
            }
            // No action for 'present' status - user can't interact with it
          }
        }}
      >
        <Text style={[styles.dayNumber, isToday && styles.todayText]}>
          {day}
        </Text>
        {data && (
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(data.status) }]}>
            <Text style={styles.statusText}>{getStatusText(data.status)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderWeek = (week, weekIndex) => (
    <View key={weekIndex} style={styles.weekRow}>
      {week.map((dayInfo, dayIndex) => (
        <View key={`${weekIndex}-${dayIndex}`}>
          {renderDayCell(dayInfo)}
        </View>
      ))}
    </View>
  );

  const weeks = renderCalendarGrid();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Attendance Calendar</Text>
          <View style={styles.placeholder} />
        </View>
        
        <ScrollView style={styles.content}>
          {/* Month Navigation */}
          <View style={styles.monthNavigation}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigateMonth(-1)}
            >
              <Ionicons name="chevron-back" size={24} color="#667eea" />
            </TouchableOpacity>
            
            <Text style={styles.monthText}>
              {currentMonth?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigateMonth(1)}
            >
              <Ionicons name="chevron-forward" size={24} color="#667eea" />
            </TouchableOpacity>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendText}>Incomplete (Tap to fix)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
              <Text style={styles.legendText}>Absent</Text>
            </View>
          </View>

          {/* Day Headers */}
          <View style={styles.dayHeaders}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} style={styles.dayHeader}>{day}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {weeks.map((week, weekIndex) => renderWeek(week, weekIndex))}
          </View>

          {/* Refresh Button */}
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={fetchMonthlyRecords}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.refreshButtonText}>Refresh Data</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Checkout Dialog */}
        <Modal
          visible={showDialog}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDialog(false)}
        >
          <View style={styles.dialogOverlay}>
            <View style={styles.dialogContainer}>
              <View style={styles.dialogHeader}>
                <Text style={styles.dialogTitle}>Add Missing Checkout</Text>
                <TouchableOpacity 
                  onPress={() => setShowDialog(false)}
                  style={styles.dialogCloseButton}
                >
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.dialogContent}>
                <Text style={styles.dialogDate}>
                  Date: {selectedDate}
                </Text>
                
                {selectedDayData && (
                  <View style={styles.existingRecords}>
                    <Text style={styles.sectionTitle}>Existing Records:</Text>
                    {selectedDayData.checkIns.map((checkIn, index) => (
                      <Text key={index} style={styles.recordText}>
                        Check-in: {formatTime(checkIn)}
                      </Text>
                    ))}
                    {selectedDayData.checkOuts.map((checkOut, index) => (
                      <Text key={index} style={styles.recordText}>
                        Check-out: {formatTime(checkOut)}
                      </Text>
                    ))}
                  </View>
                )}
                
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Checkout Time (24-hour format):</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={checkoutTime}
                    onChangeText={setCheckoutTime}
                    placeholder="17:00"
                    keyboardType="numeric"
                  />
                  <Text style={styles.inputHint}>Format: HH:MM (e.g., 17:30)</Text>
                </View>
              </View>
              
              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowDialog(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                  onPress={handleSubmitCheckout}
                  disabled={isSubmitting}
                >
                  <Text style={styles.submitButtonText}>
                    {isSubmitting ? 'Adding...' : 'Add Checkout'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
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
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 10,
    color: '#666',
    flexShrink: 1,
  },
  dayHeaders: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingVertical: 12,
  },
  dayHeader: {
    width: CELL_WIDTH,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  calendarGrid: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingBottom: 8,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    width: CELL_WIDTH,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  emptyCell: {
    backgroundColor: '#f9f9f9',
  },
  todayCell: {
    backgroundColor: '#667eea20',
  },
  dayNumber: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  todayText: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  statusIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  refreshButton: {
    flexDirection: 'row',
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Dialog styles
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dialogCloseButton: {
    padding: 4,
  },
  dialogContent: {
    padding: 20,
  },
  dialogDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  existingRecords: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  recordText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default AttendanceCalendar;