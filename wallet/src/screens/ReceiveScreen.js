import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
// Import identity read function and wallet mutation function
import {getDeviceIdentity} from '../modules/deviceIdentity';
import {addMoney} from '../modules/sqliteWallet';
import {validateTransactionAmount} from '../modules/walletHelpers';

/**
 * ReceiveScreen - Display QR code for receiving payments
 * Responsibilities:
 * - Fetch device identity (read-only operation)
 * - Generate QR payload with walletId
 * - Accept incoming payments via addMoney()
 * - Log transactions automatically via sqliteWallet
 * All async operations wrapped in try/catch with Alert error handling
 */
const ReceiveScreen = ({navigation}) => {
  const [qrData, setQrData] = useState('');
  const [walletId, setWalletId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [receiveAmount, setReceiveAmount] = useState('');
  const [isReceiving, setIsReceiving] = useState(false);

  // Generate QR code on mount - read-only operation
  useEffect(() => {
    generateQrCode();
  }, []);

  /**
   * Generate QR code with device identity as walletId
   * Read-only operation - fetches identity and creates JSON payload for display
   * Wraps async operation in try/catch with Alert error handling
   */
  const generateQrCode = async () => {
    try {
      setIsLoading(true);

      // Get device identity to use as wallet ID - read-only, no mutations
      const {deviceId} = await getDeviceIdentity();

      // Create QR payload with walletId - simple data structure for scanning
      const qrPayload = {
        walletId: deviceId,
      };

      // Convert to JSON string for QR code encoding
      const qrString = JSON.stringify(qrPayload);

      // Update state for UI rendering
      setQrData(qrString);
      setWalletId(deviceId);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      // Surface all errors using Alert as per refactor requirements
      console.error('Error generating QR:', error);
      Alert.alert('Error', error.message || 'Failed to generate QR code');
    }
  };

  /**
   * Handle receiving money from sender
   * Validates amount, calls addMoney() to credit wallet and log transaction
   * Simulates BLE/offline payment reception - in production would be triggered by BLE transfer
   */
  const handleReceiveMoney = async () => {
    // Validate amount using centralized helper
    const validation = validateTransactionAmount(receiveAmount);
    
    if (!validation.valid) {
      Alert.alert('Invalid Amount', validation.error);
      return;
    }

    try {
      setIsReceiving(true);

      // Call addMoney to credit wallet - automatically logs transaction
      const newBalance = await addMoney(validation.amount);

      setIsReceiving(false);
      setReceiveAmount(''); // Clear input after success

      // Show success alert with new balance
      Alert.alert(
        'Payment Received',
        `Successfully received ₹${validation.amount.toFixed(2)}\nNew balance: ₹${newBalance.toFixed(2)}`,
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
    } catch (error) {
      setIsReceiving(false);
      // Surface all errors using Alert
      console.error('Receive money error:', error);
      Alert.alert('Receive Failed', error.message || 'Failed to receive payment');
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

      {/* Simulate Receive Payment (for testing) */}
      <View style={styles.testSection}>
        <Text style={styles.testTitle}>🧪 Test Receive Payment</Text>
        <Text style={styles.testSubtitle}>Simulate incoming payment for testing</Text>
        
        <View style={styles.receiveInputContainer}>
          <Text style={styles.receiveCurrencySymbol}>₹</Text>
          <TextInput
            style={styles.receiveInput}
            value={receiveAmount}
            onChangeText={setReceiveAmount}
            placeholder="Enter amount to receive"
            placeholderTextColor="#999"
            keyboardType="numeric"
            editable={!isReceiving}
          />
        </View>

        <TouchableOpacity
          style={[styles.receiveButton, isReceiving && styles.buttonDisabled]}
          onPress={handleReceiveMoney}
          disabled={isReceiving}>
          {isReceiving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.receiveButtonText}>Receive Money</Text>
          )}
        </TouchableOpacity>
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
  testSection: {
    width: '90%',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
    borderStyle: 'dashed',
  },
  testTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  testSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
  },
  receiveInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  receiveCurrencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 5,
  },
  receiveInput: {
    flex: 1,
    fontSize: 20,
    color: '#333',
    paddingVertical: 12,
  },
  receiveButton: {
    backgroundColor: '#34C759',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  receiveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default ReceiveScreen;
