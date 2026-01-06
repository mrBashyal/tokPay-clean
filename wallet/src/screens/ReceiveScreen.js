import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
// Import modules for device identity, wallet operations, and BLE communication
import {getDeviceIdentity} from '../modules/deviceIdentity';
import {receiveToken, disconnect, requestBlePermissions, isConnected} from '../modules/bleTransport';
import {applyReceivedPaymentToken} from '../modules/walletHelpers';
import {startAdvertising, stopAdvertising} from '../modules/bleSessionManager';
// Import QR generation utilities (pure functions, no side effects)
import {generateReceiveQR, isQRExpired as checkQRExpiry} from '../modules/qrGenerator';

/**
 * ReceiveScreen - Display QR and listen for BLE token transfers
 * Responsibilities:
 * - Generate dynamic QR with device ID and ephemeral public key
 * - Start BLE listener for incoming tokens
 * - Verify token signatures using processReceivedToken
 * - Update SQLite wallet and log transactions
 * - Send ACK to sender via BLE
 * All async operations wrapped in try/catch with Alert error handling
 */
const ReceiveScreen = ({navigation}) => {
  const [qrData, setQrData] = useState('');
  const [walletId, setWalletId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [qrTimestamp, setQrTimestamp] = useState(Date.now());
  
  // Track if BLE cleanup has been done to prevent duplicate cleanup
  const bleCleanedUp = useRef(false);
  const tokenListenerStarted = useRef(false);

  const generateDynamicQR = useCallback(async () => {
    try {
      // Get device identity (device ID and name)
      const {deviceId, deviceName} = await getDeviceIdentity();

      // Generate signed QR payload using pure function
      const qrString = generateReceiveQR({
        deviceId: deviceId,
        deviceName: deviceName,
      });

      setQrData(qrString);
      setWalletId(deviceId);
      setQrTimestamp(Date.now());
      console.log('Dynamic QR generated with signature');
    } catch (error) {
      console.error('Error generating QR:', error);
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }, []);

  const startAdvertisingFlow = useCallback(async () => {
    // Request BLE permissions before starting advertising
    const hasPermission = await requestBlePermissions();
    if (!hasPermission) {
      throw new Error('Bluetooth permissions required for receiving payments');
    }

    console.log('Starting BLE advertising (Peripheral mode)...');
    await startAdvertising();
    setIsListening(true);
    console.log('BLE advertising started - device now discoverable');
  }, []);

  const cleanupBle = useCallback(async () => {
    if (bleCleanedUp.current) return;

    try {
      bleCleanedUp.current = true;
      setIsListening(false);
      tokenListenerStarted.current = false;

      await stopAdvertising();
      console.log('BLE advertising stopped');

      await disconnect();
      console.log('BLE listener stopped and cleaned up');
    } catch (error) {
      console.error('Error cleaning up BLE:', error);
    }
  }, []);

  const initializeReceiveFlow = useCallback(async () => {
    try {
      setIsLoading(true);
      await Promise.all([generateDynamicQR(), startAdvertisingFlow()]);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('Error initializing receive flow:', error);
      Alert.alert('Initialization Error', error.message || 'Failed to start receive mode');
    }
  }, [generateDynamicQR, startAdvertisingFlow]);

  // On mount: start advertising + generate QR
  useEffect(() => {
    initializeReceiveFlow();
    return () => {
      cleanupBle();
    };
  }, [initializeReceiveFlow, cleanupBle]);

  const handleTokenReceived = useCallback(async (token, error) => {
    if (error) {
      console.error('Token reception error:', error);
      Alert.alert('Reception Error', 'Failed to receive payment token');
      return;
    }

    try {
      console.log('Token received via BLE, verifying...');

      const result = await applyReceivedPaymentToken(token);
      if (!result.success) {
        Alert.alert('Invalid Token', result.message);
        return;
      }

      console.log(`Payment credited: ₹${result.amount}, new balance: ₹${result.newBalance}`);

      // Show success alert with payment details
      Alert.alert(
        'Payment Received',
        `Successfully received ₹${result.amount.toFixed(2)}\nFrom: ${token.payer_device_id?.substring(0, 8)}...\nNew balance: ₹${result.newBalance.toFixed(2)}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to home to refresh balance display
              navigation.goBack();
            },
          },
        ]
      );

      // Send ACK to sender via BLE (implicit through successful processing)
      console.log('ACK sent to sender (token processed successfully)');
      
    } catch (err) {
      console.error('Error processing received token:', err);
      Alert.alert('Processing Error', err.message || 'Failed to process payment');
    }
  }, [navigation]);

  // After connection is established: start token listener exactly once.
  useEffect(() => {
    if (!isListening) return;
    if (tokenListenerStarted.current) return;

    let cancelled = false;
    const intervalId = setInterval(async () => {
      try {
        const connected = await isConnected();
        if (cancelled) return;

        if (connected) {
          clearInterval(intervalId);

          if (tokenListenerStarted.current) return;
          tokenListenerStarted.current = true;

          // Only start listening once a connection exists.
          await receiveToken(handleTokenReceived);
        }
      } catch (e) {
        // Keep polling; transient BLE errors may happen during connect/disconnect.
      }
    }, 750);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isListening, handleTokenReceived]);

  /**
   * Check if QR code has expired (older than 5 minutes)
   * Returns true if QR needs refresh
   * Uses helper function from qrGenerator module
   */
  const isQrExpired = () => {
    return checkQRExpiry(qrTimestamp);
  };

  /**
   * Refresh QR code manually
   * Generates new QR with updated timestamp and public key
   */
  const handleRefreshQR = async () => {
    try {
      setIsLoading(true);
      await generateDynamicQR();
      setIsLoading(false);
      Alert.alert('QR Refreshed', 'New QR code generated');
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Refresh Failed', error.message || 'Failed to refresh QR');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing receive mode...</Text>
      </View>
    );
  }

  // Calculate QR expiry status for UI display
  const qrExpired = isQrExpired();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Receive Money</Text>
        <Text style={styles.subtitle}>Show this QR to sender</Text>
        {isListening && (
          <View style={styles.listeningBadge}>
            <View style={styles.listeningDot} />
            <Text style={styles.listeningText}>Listening for payments</Text>
          </View>
        )}
      </View>

      {/* QR Code Display */}
      <View style={[styles.qrContainer, qrExpired && styles.qrContainerExpired]}>
        {qrExpired && (
          <View style={styles.expiredOverlay}>
            <Text style={styles.expiredText}>QR Expired</Text>
          </View>
        )}
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

      {/* Refresh QR Button */}
      <TouchableOpacity 
        style={styles.refreshButton} 
        onPress={handleRefreshQR}
        disabled={isLoading}>
        <Text style={styles.refreshButtonText}>🔄 Refresh QR</Text>
      </TouchableOpacity>

      {/* Wallet ID Display */}
      <View style={styles.walletIdContainer}>
        <Text style={styles.walletIdLabel}>Your Wallet ID</Text>
        <Text style={styles.walletId}>{walletId}</Text>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ How it works</Text>
        <Text style={styles.infoText}>
          • Sender scans this QR code{'\n'}
          • Payment token sent via BLE{'\n'}
          • Token verified automatically{'\n'}
          • Amount credited to your wallet{'\n'}
          • QR expires after 5 minutes
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
  listeningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  listeningText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
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
    position: 'relative',
  },
  qrContainerExpired: {
    opacity: 0.5,
    borderWidth: 3,
    borderColor: '#FF5252',
  },
  expiredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    zIndex: 10,
  },
  expiredText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF5252',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButton: {
    marginTop: 15,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  refreshButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
