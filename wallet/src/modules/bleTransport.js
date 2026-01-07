import {BleManager} from 'react-native-ble-plx';
import {PermissionsAndroid, Platform, Alert} from 'react-native';
import {serializeToken, deserializeToken} from './offlineToken';
import {encode as encodeBase64, decode as decodeBase64} from 'base64-arraybuffer';
import {encodeUtf8, decodeUtf8} from './textEncoding';

/**
 * BLE Transport Module for Offline P2P Token Transfers
 * Handles automatic device discovery, connection, and token transmission
 * Uses react-native-ble-plx for cross-platform BLE operations
 */

// BLE Service and Characteristic UUIDs for TokPay
const TOKPAY_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
const TOKPAY_CHARACTERISTIC_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';

// Connection timeout settings
const SCAN_TIMEOUT = 10000; // 10 seconds
const CONNECTION_TIMEOUT = 5000; // 5 seconds

let bleManager = null;
let currentDevice = null;
let scanSubscription = null;

const getMaxWriteBytes = (device) => {
  if (Platform.OS === 'android' && device && typeof device.mtu === 'number' && device.mtu > 0) {
    return Math.max(20, device.mtu - 3);
  }
  return 20;
};

const stopActiveScan = (manager = null) => {
  const mgr = manager || bleManager;

  // react-native-ble-plx uses stopDeviceScan(); startDeviceScan may or may not
  // return a subscription/function depending on version/build.
  if (mgr && typeof mgr.stopDeviceScan === 'function') {
    try {
      mgr.stopDeviceScan();
    } catch (e) {
      console.error('Error stopping BLE scan:', e);
    }
  }

  if (scanSubscription) {
    try {
      if (typeof scanSubscription.remove === 'function') {
        scanSubscription.remove();
      } else if (typeof scanSubscription === 'function') {
        scanSubscription();
      }
    } catch (e) {
      console.error('Error cleaning scan subscription:', e);
    }
  }

  scanSubscription = null;
};

const toArrayBuffer = (bytes) =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

/**
 * Extract error message safely from any error object
 * Handles BLE library errors which may have non-standard structures
 */
const getErrorMessage = (error) => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.reason) return error.reason;
  if (error.toString) return error.toString();
  return 'Unknown BLE error';
};

/**
 * Initialize BLE manager singleton
 * Creates new manager instance if not already initialized
 * @returns {BleManager} BLE manager instance
 */
const initBleManager = () => {
  if (!bleManager) {
    bleManager = new BleManager({
      // Handle internal RxBle errors to prevent crashes
      errorOnBluetoothOff: false,
    });
    
    // Set up state change handler
    bleManager.onStateChange((state) => {
      console.log('[BLE] Bluetooth state changed:', state);
    }, true);
    
    console.log('BLE Manager initialized');
  }
  return bleManager;
};

/**
 * Request BLE permissions for Android 12+ (required for BLE operations)
 * Handles BLUETOOTH_SCAN, BLUETOOTH_CONNECT, and BLUETOOTH_ADVERTISE permissions
 * @returns {Promise<boolean>} True if all permissions granted
 */
export const requestBlePermissions = async () => {
  try {
    if (Platform.OS !== 'android') {
      // iOS handles BLE permissions automatically via Info.plist
      return true;
    }

    console.log('Requesting BLE permissions, Android version:', Platform.Version);

    if (Platform.Version >= 31) {
      // Android 12+ requires explicit runtime permissions
      // Use string literals because PermissionsAndroid.PERMISSIONS.BLUETOOTH_* may not exist
      const permissions = [
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.BLUETOOTH_ADVERTISE',
      ];

      console.log('Requesting permissions:', permissions);

      const granted = await PermissionsAndroid.requestMultiple(permissions);

      console.log('Permission results:', granted);

      const allGranted = Object.values(granted).every(
        status => status === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        console.log('Not all BLE permissions granted');
        return false;
      }
      console.log('All BLE permissions granted');
      return true;
    } else {
      // Android 11 and below - need location permission for BLE scanning
      console.log('Android < 12, requesting location permission');
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'TokPay needs location access for Bluetooth scanning',
          buttonPositive: 'OK',
        }
      );
      console.log('Location permission result:', granted);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (error) {
    console.error('Error requesting BLE permissions:', error);
    // Don't silently fail - show the actual error
    Alert.alert('Permission Error', `Failed to request permissions: ${error.message}`);
    return false;
  }
};

/**
 * Check if Bluetooth is enabled on device
 * @returns {Promise<boolean>} True if Bluetooth is powered on
 */
export const isBluetoothEnabled = async () => {
  try {
    const manager = initBleManager();
    const state = await manager.state();
    return state === 'PoweredOn';
  } catch (error) {
    console.error('Error checking Bluetooth state:', error);
    return false;
  }
};

/**
 * Scan for BLE devices advertising TokPay service and auto-connect
 * Automatically connects to first device found with matching service UUID
 * @param {string} targetDeviceId - Optional specific device ID to connect to
 * @returns {Promise<Object>} Connected device object
 */
export const scanAndConnect = async (targetDeviceId = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Check permissions before scanning
      const hasPermission = await requestBlePermissions();
      if (!hasPermission) {
        reject(new Error('BLE permissions not granted'));
        return;
      }

      // Check if Bluetooth is enabled
      const btEnabled = await isBluetoothEnabled();
      if (!btEnabled) {
        reject(new Error('Bluetooth is not enabled'));
        return;
      }

      const manager = initBleManager();

      // Stop any existing scan
      stopActiveScan(manager);

      console.log('Starting BLE scan for TokPay devices...');

      // Set scan timeout to prevent infinite scanning
      const timeoutId = setTimeout(() => {
        stopActiveScan(manager);
        reject(new Error('Scan timeout - no devices found. Make sure the receiver is on the Receive screen.'));
      }, SCAN_TIMEOUT);

      // Start scanning for devices with TokPay service UUID
      scanSubscription = manager.startDeviceScan(
        [TOKPAY_SERVICE_UUID],
        {allowDuplicates: false},
        async (error, device) => {
          if (error) {
            clearTimeout(timeoutId);
            stopActiveScan(manager);
            console.error('Scan error:', error);
            reject(new Error(`Scan failed: ${getErrorMessage(error)}`));
            return;
          }

          // Note: Device ID filtering removed - Android device IDs may not match expected format
          // Accept any device advertising the TokPay service UUID
          console.log(`Found TokPay device: ${device.name || device.id} (ID: ${device.id})`);

          // Stop scanning once device is found
          stopActiveScan(manager);
          clearTimeout(timeoutId);

          try {
            // Auto-connect to discovered device (no manual pairing)
            console.log('Connecting to device...');
            const connectedDevice = await device.connect({
              timeout: CONNECTION_TIMEOUT,
            });

            // Discover all services and characteristics
            await connectedDevice.discoverAllServicesAndCharacteristics();

            let finalDevice = connectedDevice;
            if (Platform.OS === 'android' && typeof connectedDevice.requestMTU === 'function') {
              try {
                finalDevice = await connectedDevice.requestMTU(517);
              } catch (mtuError) {
                console.log('MTU request failed:', getErrorMessage(mtuError));
              }
            }

            currentDevice = finalDevice;

            console.log('Successfully connected to TokPay device');
            console.log('Max write bytes:', getMaxWriteBytes(finalDevice));
            resolve(finalDevice);
          } catch (connectError) {
            console.error('Connection error:', connectError);
            reject(new Error(`Connection failed: ${getErrorMessage(connectError)}`));
          }
        }
      );
    } catch (error) {
      console.error('Error in scanAndConnect:', error);
      reject(new Error(`Scan and connect failed: ${getErrorMessage(error)}`));
    }
  });
};

/**
 * Send payment token to connected BLE device
 * Serializes token to base64 and transmits via BLE characteristic write
 * @param {Object} token - Payment token object to send
 * @param {Object} device - Connected BLE device (optional, uses currentDevice if not provided)
 * @returns {Promise<boolean>} True if token sent successfully
 */
export const sendToken = async (token, device = null) => {
  try {
    const targetDevice = device || currentDevice;

    if (!targetDevice) {
      throw new Error('No device connected. Call scanAndConnect first.');
    }

    // Check if device is still connected
    const isConnected = await targetDevice.isConnected();
    if (!isConnected) {
      throw new Error('Device disconnected. Please reconnect.');
    }

    console.log('Serializing token for transmission...');
    
    // Serialize token to base64 string for BLE transmission
    const tokenString = serializeToken(token);

    const maxWriteBytes = getMaxWriteBytes(targetDevice);
    let maxFragmentLen = Math.max(1, maxWriteBytes - 15);

    let fragments = [];
    while (true) {
      fragments = [];
      for (let i = 0; i < tokenString.length; i += maxFragmentLen) {
        fragments.push(tokenString.substring(i, i + maxFragmentLen));
      }

      const totalChunks = fragments.length;
      const testHeader = `${totalChunks - 1}/${totalChunks}:`;
      const testPayload = encodeUtf8(`${testHeader}${fragments[totalChunks - 1]}`);
      if (testPayload.byteLength <= maxWriteBytes) {
        break;
      }

      maxFragmentLen = Math.max(1, maxFragmentLen - 1);
    }

    const totalChunks = fragments.length;
    console.log(`Sending token in ${totalChunks} chunk(s)...`);

    for (let i = 0; i < totalChunks; i++) {
      const fragment = fragments[i];
      const chunkData = `${i}/${totalChunks}:${fragment}`;

      const payloadBytes = encodeUtf8(chunkData);
      if (payloadBytes.byteLength > maxWriteBytes) {
        throw new Error('Chunk exceeds max write size');
      }

      const payloadBase64 = encodeBase64(toArrayBuffer(payloadBytes));
      console.log(`Writing chunk ${i + 1}/${totalChunks}, bytes: ${payloadBytes.byteLength}`);

      await targetDevice.writeCharacteristicWithoutResponseForService(
        TOKPAY_SERVICE_UUID,
        TOKPAY_CHARACTERISTIC_UUID,
        payloadBase64
      );

      if (i < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }

    console.log('Token sent successfully via BLE');
    return true;
  } catch (error) {
    console.error('Error sending token:', error);
    
    const errorMsg = getErrorMessage(error);
    
    // Handle specific BLE errors
    if (errorMsg.toLowerCase().includes('disconnect')) {
      throw new Error('Device disconnected during transmission');
    } else if (errorMsg.toLowerCase().includes('timeout')) {
      throw new Error('Transmission timeout - device not responding');
    } else {
      throw new Error(`Token transmission failed: ${errorMsg}`);
    }
  }
};

/**
 * Listen for incoming payment tokens from connected BLE device
 * Monitors BLE characteristic notifications and deserializes received token
 * @param {Function} onTokenReceived - Callback function when token is received
 * @param {Object} device - Connected BLE device (optional, uses currentDevice if not provided)
 * @returns {Promise<void>} Resolves when listener is active
 */
export const receiveToken = async (onTokenReceived, device = null) => {
  try {
    const targetDevice = device || currentDevice;

    if (!targetDevice) {
      throw new Error('No device connected. Call scanAndConnect first.');
    }

    // Check if device is still connected
    const isConnected = await targetDevice.isConnected();
    if (!isConnected) {
      throw new Error('Device disconnected. Please reconnect.');
    }

    console.log('Starting to listen for incoming tokens...');

    let receivedChunks = {};
    let expectedChunks = 0;

    // Monitor characteristic for incoming data (notifications)
    targetDevice.monitorCharacteristicForService(
      TOKPAY_SERVICE_UUID,
      TOKPAY_CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          console.error('Error receiving token:', error);
          onTokenReceived(null, new Error(`Receive failed: ${getErrorMessage(error)}`));
          return;
        }

        try {
          // Decode base64 data from characteristic
          const valueBase64 = characteristic?.value;
          if (!valueBase64) {
            throw new Error('Empty BLE payload');
          }

          const rawBytes = new Uint8Array(decodeBase64(valueBase64));
          const rawData = decodeUtf8(rawBytes);
          
          // Parse chunk format: "index/total:data"
          const [chunkInfo, chunkData] = rawData.split(':');
          const [currentIndex, totalChunks] = chunkInfo.split('/').map(Number);

          expectedChunks = totalChunks;
          receivedChunks[currentIndex] = chunkData;

          console.log(`Received chunk ${currentIndex + 1}/${totalChunks}`);

          // Check if all chunks received
          if (Object.keys(receivedChunks).length === expectedChunks) {
            // Reconstruct full token string from chunks
            let fullTokenString = '';
            for (let i = 0; i < expectedChunks; i++) {
              fullTokenString += receivedChunks[i];
            }

            // Deserialize token from base64 string
            const token = deserializeToken(fullTokenString);

            console.log('Token received and deserialized successfully');
            onTokenReceived(token, null);

            // Reset for next token
            receivedChunks = {};
            expectedChunks = 0;
          }
        } catch (parseError) {
          console.error('Error parsing received token:', parseError);
          onTokenReceived(null, new Error('Failed to parse received token'));
        }
      }
    );

    console.log('Token listener active');
  } catch (error) {
    console.error('Error setting up token receiver:', error);
    throw new Error(`Receive setup failed: ${error.message}`);
  }
};

/**
 * Disconnect from current BLE device and cleanup
 * Safely closes connection and removes listeners
 * @returns {Promise<boolean>} True if disconnected successfully
 */
export const disconnect = async () => {
  try {
    if (currentDevice) {
      const deviceId = currentDevice.id;
      await currentDevice.cancelConnection();
      currentDevice = null;
      console.log(`Disconnected from device: ${deviceId}`);
    }

    stopActiveScan();

    return true;
  } catch (error) {
    console.error('Error disconnecting:', error);
    return false;
  }
};

/**
 * Get current connection status
 * @returns {Promise<boolean>} True if device is connected
 */
export const isConnected = async () => {
  try {
    if (!currentDevice) {
      return false;
    }
    return await currentDevice.isConnected();
  } catch (error) {
    console.error('Error checking connection status:', error);
    return false;
  }
};

/**
 * Cleanup BLE manager and destroy instance (for app cleanup)
 */
export const cleanup = async () => {
  try {
    await disconnect();
    if (bleManager) {
      await bleManager.destroy();
      bleManager = null;
      console.log('BLE Manager cleaned up');
    }
  } catch (error) {
    console.error('Error cleaning up BLE:', error);
  }
};

/**
 * Start advertising as BLE peripheral (payee mode)
 * Makes device discoverable for incoming payment connections
 * Note: react-native-ble-plx has limited peripheral support on Android
 * @returns {Promise<boolean>} True if advertising started
 */
export const startAdvertising = async () => {
  try {
    console.warn('BLE peripheral mode has limited support. Use native modules for full implementation.');
    // Peripheral mode requires platform-specific native modules
    // This is a placeholder for future implementation
    return false;
  } catch (error) {
    console.error('Error starting BLE advertising:', error);
    return false;
  }
};
