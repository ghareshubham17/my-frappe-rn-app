
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';

export default function App() {
  const [deviceInfo, setDeviceInfo] = useState({});
  const [uniqueId, setUniqueId] = useState('');

  useEffect(() => {
    getUniqueDeviceId();
  }, []);

  const getUniqueDeviceId = async () => {
    try {
      // Try multiple methods to get a unique ID
      let deviceId = null;

      // Method 1: Try to get stored UUID (persists across app restarts)
      deviceId = await SecureStore.getItemAsync('unique_device_id');
      
      if (!deviceId) {
        // Method 2: Generate a unique ID based on device info
        const deviceFingerprint = [
          Device.modelName || 'unknown',
          Device.brand || 'unknown',
          Device.osVersion || 'unknown',
          Device.deviceName || 'unknown',
          // Add timestamp for uniqueness
          Date.now().toString()
        ].join('-');

        // Create a hash-like ID (simplified)
        deviceId = btoa(deviceFingerprint).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
        
        // Store it for future use
        await SecureStore.setItemAsync('unique_device_id', deviceId);
        console.log('Generated new unique ID:', deviceId);
      } else {
        console.log('Retrieved existing unique ID:', deviceId);
      }

      // Get all device information
      const info = {
        // Unique Identifiers
        uniqueId: deviceId,
        sessionId: Constants.sessionId,
        
        // Device Info for display
        brand: Device.brand,
        modelName: Device.modelName,
        deviceName: Device.deviceName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        isDevice: Device.isDevice,
      };

      setDeviceInfo(info);
      setUniqueId(deviceId);

    } catch (error) {
      console.error('Error getting device ID:', error);
      // Fallback to session ID
      const fallbackId = Constants.sessionId?.substring(0, 16);
      setUniqueId(fallbackId);
    }
  };

  const copyToClipboard = () => {
    // You can add clipboard functionality here
    Alert.alert('Device ID', `Your unique device ID is:\n\n${uniqueId}`, [
      { text: 'OK' }
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>📱 Device Mapping ID</Text>
        
        {/* Unique ID Section - This is what you use for mapping */}
        <View style={[styles.section, styles.uniqueSection]}>
          <Text style={styles.uniqueLabel}>Unique Device ID for Mapping:</Text>
          <Text style={styles.uniqueId} onPress={copyToClipboard}>
            {uniqueId || 'Generating...'}
          </Text>
          <Text style={styles.hint}>Tap to view full ID</Text>
        </View>

        {/* Device Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Details</Text>
          <InfoRow label="Brand" value={deviceInfo.brand} />
          <InfoRow label="Model" value={deviceInfo.modelName} />
          <InfoRow label="Device Name" value={deviceInfo.deviceName} />
          <InfoRow label="OS" value={`${deviceInfo.osName} ${deviceInfo.osVersion}`} />
          <InfoRow label="Real Device" value={deviceInfo.isDevice ? 'Yes' : 'Simulator'} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How This ID Works</Text>
          <Text style={styles.description}>
            • Unique per device installation{'\n'}
            • Persists across app restarts{'\n'}
            • Resets only on app uninstall{'\n'}
            • Perfect for device mapping & analytics
          </Text>
        </View>
      </View>
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const InfoRow = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={styles.value}>{value || 'N/A'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingTop: 50,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  uniqueSection: {
    backgroundColor: '#4a90e2',
  },
  uniqueLabel: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 10,
    fontWeight: '600',
  },
  uniqueId: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 5,
  },
  hint: {
    fontSize: 12,
    color: '#e0e0e0',
    textAlign: 'center',
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#4a90e2',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '400',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});