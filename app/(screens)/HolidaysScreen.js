import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Alert,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useFrappeService } from '../services/frappeService';

const { width } = Dimensions.get('window');

const Holidays = ({ navigation }) => {
  const { user } = useAuth();
  const frappeService = useFrappeService();
  
  // State management
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [holidayList, setHolidayList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEmployeeAndHolidays();
  }, []);

  const fetchEmployeeAndHolidays = async () => {
    try {
      // First, get current employee
      const employees = await frappeService.getList('Employee', {
        fields: ['name', 'employee_name', 'user_id', 'holiday_list'],
        filters: { user_id: user.email },
        limit: 1
      });

      if (employees && employees.length > 0) {
        const employeeData = employees[0];
        setCurrentEmployee(employeeData);
        
        if (employeeData.holiday_list) {
            console.log("exits");
            console.log(employees);
            console.log(employeeData.holiday_list);
            
            
          await fetchHolidayList(employeeData.holiday_list);
        } else {
          // Try to fetch default holiday list for current year
          await fetchDefaultHolidayList();
        }
      } else {
        Alert.alert('Error', 'Employee record not found');
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      Alert.alert('Error', 'Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidayList = async (holidayListName) => {
    try {
      // Get holiday list details
      const holidayListData = await frappeService.getDoc('Holiday List', holidayListName);
      
      console.log('Holiday list data:', holidayListData);
      setHolidayList(holidayListData);

      if (holidayListData && holidayListData.holidays) {
        // Sort holidays by date
        const sortedHolidays = holidayListData.holidays.sort((a, b) => 
          new Date(a.holiday_date) - new Date(b.holiday_date)
        );
        
        // Filter holidays for current year and upcoming holidays
        const currentYear = new Date().getFullYear();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const currentYearHolidays = sortedHolidays.filter(holiday => {
          const holidayDate = new Date(holiday.holiday_date);
          return holidayDate.getFullYear() === currentYear;
        });

        setHolidays(currentYearHolidays);
      }
    } catch (error) {
      console.error('Error fetching holiday list:', error);
      Alert.alert('Error', 'Failed to load holidays');
    }
  };

  const fetchDefaultHolidayList = async () => {
    try {
      const currentYear = new Date().getFullYear();
      
      // Try to find a holiday list for current year
      const holidayLists = await frappeService.getList('Holiday List', {
        fields: ['name', 'holiday_list_name', 'from_date', 'to_date'],
        filters: {
          from_date: ['<=', `${currentYear}-12-31`],
          to_date: ['>=', `${currentYear}-01-01`]
        },
        limit: 1
      });

      if (holidayLists && holidayLists.length > 0) {
        await fetchHolidayList(holidayLists[0].name);
      } else {
        setHolidays([]);
        Alert.alert('Notice', 'No holiday list found for current year');
      }
    } catch (error) {
      console.error('Error fetching default holiday list:', error);
      setHolidays([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEmployeeAndHolidays();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getDateInfo = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { status: 'today', text: 'Today', color: '#4CAF50' };
    if (diffDays === 1) return { status: 'tomorrow', text: 'Tomorrow', color: '#2196F3' };
    if (diffDays > 0 && diffDays <= 7) return { status: 'upcoming', text: `In ${diffDays} days`, color: '#FF9800' };
    if (diffDays > 0) return { status: 'future', text: `In ${diffDays} days`, color: '#9E9E9E' };
    return { status: 'past', text: 'Past', color: '#757575' };
  };

  const renderHolidayItem = (holiday, index) => {
    const dateInfo = getDateInfo(holiday.holiday_date);
    
    return (
      <View key={index} style={styles.holidayItem}>
        <View style={styles.holidayLeft}>
          <View style={[styles.holidayDateContainer, { backgroundColor: dateInfo.color }]}>
            <Text style={styles.holidayDay}>
              {new Date(holiday.holiday_date).getDate()}
            </Text>
            <Text style={styles.holidayMonth}>
              {new Date(holiday.holiday_date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={styles.holidayRight}>
          <Text style={styles.holidayTitle}>{holiday.description}</Text>
          <Text style={styles.holidayDate}>{formatDate(holiday.holiday_date)}</Text>
          <View style={styles.holidayStatusContainer}>
            <View style={[styles.holidayStatusDot, { backgroundColor: dateInfo.color }]} />
            <Text style={[styles.holidayStatus, { color: dateInfo.color }]}>
              {dateInfo.text}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const getUpcomingHolidays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return holidays.filter(holiday => {
      const holidayDate = new Date(holiday.holiday_date);
      holidayDate.setHours(0, 0, 0, 0);
      return holidayDate >= today;
    }).slice(0, 3);
  };

  const renderUpcomingHoliday = (holiday, index) => {
    const dateInfo = getDateInfo(holiday.holiday_date);
    
    return (
      <View key={index} style={styles.upcomingHolidayItem}>
        <Text style={styles.upcomingHolidayTitle}>{holiday.description}</Text>
        <Text style={styles.upcomingHolidayDate}>
          {new Date(holiday.holiday_date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })}
        </Text>
        <Text style={[styles.upcomingHolidayStatus, { color: dateInfo.color }]}>
          {dateInfo.text}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Holidays</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading holidays...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Holidays</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea', '#764ba2']}
            tintColor="#667eea"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Holiday List Info Card */}
        {holidayList && (
          <View style={styles.holidayListCard}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.holidayListGradient}
            >
              <Ionicons name="calendar" size={24} color="#fff" />
              <View style={styles.holidayListInfo}>
                <Text style={styles.holidayListTitle}>
                  {holidayList.holiday_list_name || holidayList.name}
                </Text>
                <Text style={styles.holidayListPeriod}>
                  {new Date(holidayList.from_date).getFullYear()} • {holidays.length} holidays
                </Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Upcoming Holidays */}
        {getUpcomingHolidays().length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Upcoming Holidays</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.upcomingScroll}>
              {getUpcomingHolidays().map(renderUpcomingHoliday)}
            </ScrollView>
          </View>
        )}

        {/* All Holidays */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            All Holidays ({new Date().getFullYear()})
          </Text>
          
          {holidays.length === 0 ? (
            <View style={styles.noHolidaysContainer}>
              <Ionicons name="calendar-outline" size={48} color="#9E9E9E" />
              <Text style={styles.noHolidaysText}>No holidays found</Text>
              <Text style={styles.noHolidaysSubtext}>
                Contact HR if you think this is incorrect
              </Text>
            </View>
          ) : (
            <View style={styles.holidaysContainer}>
              {holidays.map(renderHolidayItem)}
            </View>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  holidayListCard: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  holidayListGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  holidayListInfo: {
    marginLeft: 16,
    flex: 1,
  },
  holidayListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  holidayListPeriod: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  sectionContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  upcomingScroll: {
    marginBottom: 8,
  },
  upcomingHolidayItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 150,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  upcomingHolidayTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  upcomingHolidayDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 4,
  },
  upcomingHolidayStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  holidaysContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  holidayItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  holidayLeft: {
    marginRight: 16,
  },
  holidayDateContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holidayDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 22,
  },
  holidayMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 12,
  },
  holidayRight: {
    flex: 1,
    justifyContent: 'center',
  },
  holidayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  holidayDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  holidayStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  holidayStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  holidayStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  noHolidaysContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noHolidaysText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  noHolidaysSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
export default Holidays;