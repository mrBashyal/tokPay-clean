import React, {useState, useRef, useCallback} from 'react';
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
import {useFocusEffect} from '@react-navigation/native';
import {decode as base64Decode} from 'base64-arraybuffer';

// Import modules for device identity, wallet operations, and BLE communication
import {getDeviceIdentity} from '../modules/deviceIdentity';
import {disconnect, requestBlePermissions} from '../modules/bleTransport';
import {applyReceivedPaymentToken} from '../modules/walletHelpers';
import {startAdvertising, stopAdvertising} from '../modules/bleSessionManager';
import {onDataReceived} from '../modules/blePeripheral';
import {deserializeToken} from '../modules/offlineToken';
// Import QR generation utilities (pure functions, no side effects)
import {generateReceiveQR, isQRExpired as checkQRExpiry} from '../modules/qrGenerator';

/**
 * ReceiveScreen - Display QR and listen for BLE token transfers
 * Responsibilities:
 * - Generate dynamic QR with device ID and ephemeral public key
 * - Start BLE peripheral advertising for incoming connections
 * - Listen for token data via native BLE peripheral events
 * - Parse chunk format and reassemble tokens
 * - Verify token signatures using processReceivedToken
 * - Update SQLite wallet and log transactions
 * All async operations wrapped in try/catch with Alert error handling
 */
const ReceiveScreen = ({navigation}) => {
  const [qrData, setQrData] = useState('');
  const [walletId, setWalletId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [qrTimestamp, setQrTimestamp] = useState(Date.now());
  
  // Track received chunks for multi-part token assembly
  const receivedChunks = useRef({});
  const tokenProcessed = useRef(false);

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

  const handleTokenReceived = useCallback(async (token) => {
    if (tokenProcessed.current) {
      console.log('Token already processed, ignoring');
      return;
    }
    tokenProcessed.current = true;

    try {
      console.log('Complete token received, verifying...');

      const result = await applyReceivedPaymentToken(token);
      if (!result.success) {
        tokenProcessed.current = false;
        Alert.alert('Invalid Token', result.message);
        return;
      }

      console.log(`Payment credited: ${result.amount}, new balance: ${result.newBalance}`);

      // Show success alert with payment details
      Alert.alert(
        'Payment Received',
        `Successfully received ${result.amount.toFixed(2)}\nFrom: ${token.payer_device_id?.substring(0, 8)}...\nNew balance: ${result.newBalance.toFixed(2)}`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
      
    } catch (err) {
      console.error('Error processing received token:', err);
      tokenProcessed.current = false;
      Alert.alert('Processing Error', err.message || 'Failed to process payment');
    }
  }, [navigation]);

  /**
   * Process incoming BLE data chunks
   * Format: base64(index/total:tokendata)
   */
  const handleBleDataReceived = useCallback((event) => {
    try {
      console.log(`[BLE Receive] Got data from ${event.deviceId}, ${event.length} bytes`);
      
      // Decode outer base64 wrapper
      const rawBytes = base64Decode(event.data);
      const rawString = new TextDecoder().decode(new Uint8Array(rawBytes));
      
      console.log('[BLE Receive] Raw string:', rawString.substring(0, 100));

      // Parse chunk format: "index/total:data"
      const colonIdx = rawString.indexOf(':');
      if (colonIdx === -1) {
        console.error('[BLE Receive] Invalid chunk format - no colon separator');
        return;
      }

      const header = rawString.substring(0, colonIdx);
      const tokenData = rawString.substring(colonIdx + 1);

      const slashIdx = header.indexOf('/');
      if (slashIdx === -1) {
        console.error('[BLE Receive] Invalid chunk header format');
        return;
      }

      const chunkIndex = parseInt(header.substring(0, slashIdx), 10);
      const totalChunks = parseInt(header.substring(slashIdx + 1), 10);

      console.log(`[BLE Receive] Chunk ${chunkIndex + 1}/${totalChunks}`);

      // Store chunk
      if (!receivedChunks.current.total) {
        receivedChunks.current = {
          total: totalChunks,
          chunks: {},
          deviceId: event.deviceId,
        };
      }

      receivedChunks.current.chunks[chunkIndex] = tokenData;

      // Check if all chunks received
      const receivedCount = Object.keys(receivedChunks.current.chunks).length;
      if (receivedCount === totalChunks) {
        console.log('[BLE Receive] All chunks received, assembling token...');

        // Reassemble token data
        let fullTokenBase64 = '';
        for (let i = 0; i < totalChunks; i++) {
          if (!receivedChunks.current.chunks[i]) {
            console.error(`[BLE Receive] Missing chunk ${i}`);
            return;
          }
          fullTokenBase64 += receivedChunks.current.chunks[i];
        }

        // Reset chunks for next potential transfer
        receivedChunks.current = {};

        // Deserialize the complete token
        console.log('[BLE Receive] Deserializing token...');
        const token = deserializeToken(fullTokenBase64);
        
        if (!token) {
          console.error('[BLE Receive] Failed to deserialize token');
          Alert.alert('Error', 'Received invalid token data');
          return;
        }

        console.log('[BLE Receive] Token deserialized successfully');
        handleTokenReceived(token);
      }
    } catch (error) {
      console.error('[BLE Receive] Error processing data:', error);
    }
  }, [handleTokenReceived]);

  const startAdvertisingFlow = useCallback(async () => {
    // Request BLE permissions before starting advertising
    const hasPermission = await requestBlePermissions();
    if (!hasPermission) {
      throw new Error('Bluetooth permissions required for receiving payments');
    }

    console.log('Starting BLE advertising (Native Peripheral mode)...');
    await startAdvertising();
    setIsListening(true);
    console.log('BLE advertising started - device now discoverable');
  }, []);

  const cleanupBle = useCallback(async () => {
    try {
      setIsListening(false);
      receivedChunks.current = {};
      tokenProcessed.current = false;

      await stopAdvertising();
      console.log('BLE advertising stopped');

      await disconnect();
      console.log('BLE cleanup completed');
    } catch (error) {
      console.error('Error cleaning up BLE:', error);
    }
  }, []);

  // Use useFocusEffect to properly handle screen lifecycle
  // This prevents cleanup from running immediately on mount in dev mode
  useFocusEffect(
    useCallback(() => {
      let unsubscribeData = null;
      let isMounted = true;

      const initializeReceiveFlow = async () => {
        try {
          setIsLoading(true);
          
          // Generate QR and start advertising
          await Promise.all([generateDynamicQR(), startAdvertisingFlow()]);
          
          if (!isMounted) return;
          
          // Subscribe to native peripheral data events
          unsubscribeData = onDataReceived(handleBleDataReceived);
          console.log('Subscribed to BLE data events');
          
          setIsLoading(false);
        } catch (error) {
          if (!isMounted) return;
          setIsLoading(false);
          console.error('Error initializing receive flow:', error);
          Alert.alert('Initialization Error', error.message || 'Failed to start receive mode');
        }
      };

      initializeReceiveFlow();

      // Cleanup on blur/unmount
      return () => {
        isMounted = false;
        console.log('ReceiveScreen losing focus, cleaning up...');
        
        if (unsubscribeData) {
          unsubscribeData();
        }
        
        cleanupBle();
      };
    }, [generateDynamicQR, startAdvertisingFlow, handleBleDataReceived, cleanupBle])
  );

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
        <Text style={styles.refreshButtonText}>�� Refresh QR</Text>
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
