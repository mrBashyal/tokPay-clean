import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const ReceiveScreen = () => {
  // Static QR data for demo - hardcoded wallet ID
  const qrData = JSON.stringify({
    walletId: 'TOKPAY_USER_001',
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Receive Money</Text>
        <Text style={styles.instructions}>
          Show this QR to receive money
        </Text>
      </View>

      {/* QR Code Display */}
      <View style={styles.qrContainer}>
        <QRCode
          value={qrData}
          size={250}
          backgroundColor="white"
          color="black"
        />
      </View>

      {/* Wallet ID Display */}
      <View style={styles.walletInfoContainer}>
        <Text style={styles.walletIdLabel}>Wallet ID</Text>
        <Text style={styles.walletId}>TOKPAY_USER_001</Text>
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
  header: {
    width: '100%',
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
  },
  instructions: {
    fontSize: 15,
    color: '#FFF',
    opacity: 0.95,
    textAlign: 'center',
    lineHeight: 22,
  },
  qrContainer: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  walletInfoContainer: {
    width: '90%',
    marginTop: 30,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    alignItems: 'center',
  },
  walletIdLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  walletId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default ReceiveScreen;
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
        <Text style={styles.title}>Receive Money</Text>
        <Text style={styles.instructionText}>
          Ask the sender to scan this QR code.
        </Text>
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

      {/* Back to Home Button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.navigate('Home')}>
        <Text style={styles.backButtonText}>← Back to Home</Text>
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
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 15,
    color: '#FFF',
    opacity: 0.95,
    textAlign: 'center',
    lineHeight: 22,
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
  backButton: {
    marginTop: 10,
    backgroundColor: '#FFF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  backButtonText: {
    color: '#007AFF',
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
