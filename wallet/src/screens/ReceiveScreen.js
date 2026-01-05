import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {getDeviceIdentity} from '../modules/deviceIdentity';

const ReceiveScreen = ({navigation}) => {
  const [qrData, setQrData] = useState('');
  const [walletId, setWalletId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Generate QR code on mount
  useEffect(() => {
    generateQrCode();
  }, []);

  /**
   * Generate QR code with device identity as walletId
   * Creates JSON payload for scanning
   */
  const generateQrCode = async () => {
    try {
      setIsLoading(true);

      // Get device identity to use as wallet ID
      const {deviceId} = await getDeviceIdentity();

      // Create QR payload with walletId
      const qrPayload = {
        walletId: deviceId,
      };

      // Convert to JSON string for QR code
      const qrString = JSON.stringify(qrPayload);

      // Update state
      setQrData(qrString);
      setWalletId(deviceId);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('Error generating QR:', error);
      Alert.alert('Error', 'Failed to generate QR code');
    }
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Receive Money</Text>
        <Text style={styles.subtitle}>Show this QR to receive money</Text>
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

      {/* Wallet ID Display */}
      <View style={styles.walletIdContainer}>
        <Text style={styles.walletIdLabel}>Your Wallet ID</Text>
        <Text style={styles.walletId}>{walletId}</Text>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ How it works</Text>
        <Text style={styles.infoText}>
          • Sender will scan this QR code{'\n'}
          • They will enter the amount to send{'\n'}
          • Payment will be processed instantly{'\n'}
          • Check your balance after receiving
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
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#FFF',
    opacity: 0.95,
    textAlign: 'center',
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
  walletIdContainer: {
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
  walletIdLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  walletId: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
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
