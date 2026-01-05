import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';

const SendScanScreen = ({navigation}) => {
  const [scanned, setScanned] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Get the back camera device (modern vision-camera API)
  const device = useCameraDevice('back');

  // Request camera permission on mount
  useEffect(() => {
    requestCameraPermission();
  }, []);

  // Pause camera when navigating away
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setIsActive(false);
    });
    return unsubscribe;
  }, [navigation]);

  // Resume camera when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setIsActive(true);
      setScanned(false);
    });
    return unsubscribe;
  }, [navigation]);

  /**
   * Request camera permission using modern vision-camera API
   * Opens settings if permission is denied
   */
  const requestCameraPermission = async () => {
    try {
      const permission = await Camera.requestCameraPermission();
      
      if (permission === 'granted') {
        setHasPermission(true);
      } else if (permission === 'denied') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera permission in settings to scan QR codes.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open Settings', onPress: () => Linking.openSettings()},
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      Alert.alert('Error', 'Failed to request camera permission');
    }
  };

  /**
   * Configure code scanner to detect QR codes
   * Processes scanned data and navigates to SendAmountScreen
   */
  const codeScanner = useCodeScanner({
    codeTypes: ['qr'], // Only scan QR codes
    onCodeScanned: (codes) => {
      // Prevent multiple scans - only process first scan
      if (scanned || codes.length === 0) {
        return;
      }

      try {
        // Mark as scanned to prevent duplicate processing
        setScanned(true);

        // Get the first QR code value
        const qrValue = codes[0].value;

        // Parse QR data as JSON
        const qrData = JSON.parse(qrValue);

        // Validate that walletId exists in parsed data
        if (!qrData.walletId) {
          throw new Error('Invalid QR: walletId not found');
        }

        console.log('QR scanned successfully:', qrData);

        // Navigate to SendAmountScreen with walletId parameter
        navigation.navigate('SendAmount', {
          walletId: qrData.walletId,
        });
      } catch (error) {
        // Handle invalid QR data (not JSON or missing fields)
        console.error('QR scan error:', error);
        Alert.alert(
          'Invalid QR Code',
          'The scanned QR code is not a valid recipient code. Please try again.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Allow scanning again after error
                setScanned(false);
              },
            },
          ]
        );
      }
    },
  });

  /**
   * Handle cancel button press
   * Navigate back to home screen
   */
  const handleCancel = () => {
    navigation.goBack();
  };

  // Show loading while camera permission is being checked
  if (!hasPermission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  // Show error if camera device is not available
  if (!device) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Camera not available</Text>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera view with QR scanner */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive && !scanned}
        codeScanner={codeScanner}
      />

      {/* Top overlay with instructions */}
      <View style={styles.topOverlay}>
        <Text style={styles.title}>Send Money</Text>
        <Text style={styles.instructions}>
          Scan recipient QR to send money
        </Text>
      </View>

      {/* Center frame for QR scanning area */}
      <View style={styles.centerOverlay}>
        <View style={styles.scanFrame} />
      </View>

      {/* Bottom overlay with cancel button */}
      <View style={styles.bottomOverlay}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Scanning indicator */}
      {scanned && (
        <View style={styles.scannedOverlay}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.scannedText}>Processing...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FFF',
    marginBottom: 30,
    textAlign: 'center',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
  },
  instructions: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  centerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#007AFF',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFF',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scannedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannedText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FFF',
  },
});

export default SendScanScreen;
