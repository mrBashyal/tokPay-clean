import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {buildQrPayload, encodeQrPayload} from '../modules/qrPayload';

const ReceiveScreen = () => {
  const [qrData, setQrData] = useState('');
  const [deviceInfo, setDeviceInfo] = useState({deviceId: '', deviceName: ''});
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Generate QR code on mount
  useEffect(() => {
    generateQrCode();
  }, []);

  /**
   * Generate new QR code with current timestamp and device info
   * Called on mount and when user manually refreshes
   */
  const generateQrCode = async () => {
    try {
      setIsLoading(true);

      // Build payload object with device info, BLE UUID, timestamp, nonce
      const payload = await buildQrPayload();

      // Encode payload to JSON string for QR code
      const encodedPayload = encodeQrPayload(payload);

      // Update state with QR data and device info for display
      setQrData(encodedPayload);
      setDeviceInfo({
        deviceId: payload.deviceId,
        deviceName: payload.deviceName,
      });

      // Record refresh timestamp for display
      setLastRefresh(new Date());

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', `Failed to generate QR code: ${error.message}`);
    }
  };

  /**
   * Handle manual QR refresh button press
   * Regenerates QR with new timestamp and nonce
   */
  const handleRefreshQr = () => {
    generateQrCode();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Generating QR Code...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Receive Payment</Text>
        <Text style={styles.subtitle}>Show this QR code to the payer</Text>
      </View>

      {/* QR Code Display */}
      <View style={styles.qrContainer}>
        {qrData ? (
          <QRCode
            value={qrData}
            size={250}
            backgroundColor="white"
            color="black"
          />
        ) : (
          <Text style={styles.errorText}>QR code unavailable</Text>
        )}
      </View>

      {/* Device Information */}
      <View style={styles.deviceInfoContainer}>
        <Text style={styles.deviceNameLabel}>Device Name</Text>
        <Text style={styles.deviceName}>{deviceInfo.deviceName}</Text>

        <Text style={styles.deviceIdLabel}>Device ID</Text>
        <Text style={styles.deviceId}>{deviceInfo.deviceId}</Text>
      </View>

      {/* Last Refresh Time */}
      {lastRefresh && (
        <View style={styles.timestampContainer}>
          <Text style={styles.timestampLabel}>QR Generated At</Text>
          <Text style={styles.timestamp}>
            {lastRefresh.toLocaleTimeString()}
          </Text>
        </View>
      )}

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshQr}>
        <Text style={styles.refreshButtonText}>🔄 Refresh QR Code</Text>
      </TouchableOpacity>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ How it works</Text>
        <Text style={styles.infoText}>
          • Payer will scan this QR code{'\n'}
          • BLE connection will be established automatically{'\n'}
          • Payment token will be transferred offline{'\n'}
          • You'll receive confirmation immediately
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    width: '100%',
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
  qrContainer: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
  },
  deviceInfoContainer: {
    width: '90%',
    marginTop: 20,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  deviceNameLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  deviceIdLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  deviceId: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  timestampContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  timestampLabel: {
    fontSize: 12,
    color: '#666',
  },
  timestamp: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginTop: 3,
  },
  refreshButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  refreshButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    width: '90%',
    marginTop: 20,
    padding: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
});

export default ReceiveScreen;
