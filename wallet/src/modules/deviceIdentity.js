import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import {v4 as uuidv4} from 'uuid';

// Storage keys for persisting device identity
const DEVICE_ID_KEY = '@tokpay:device_id';
const DEVICE_NAME_KEY = '@tokpay:device_name';

/**
 * Generate a new device identity with UUID and device name
 * This is called only on first app launch or after reset
 * @returns {Promise<Object>} Object with deviceId and deviceName
 */
const generateDeviceIdentity = async () => {
  try {
    // Generate a unique UUID v4 for this device
    const deviceId = uuidv4();

    // Get the device name from device info (e.g., "Samsung Galaxy S21")
    const deviceName = await DeviceInfo.getDeviceName();

    // Store both values in AsyncStorage for persistence across app restarts
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    await AsyncStorage.setItem(DEVICE_NAME_KEY, deviceName);

    console.log('Device identity generated:', {deviceId, deviceName});

    return {deviceId, deviceName};
  } catch (error) {
    console.error('Error generating device identity:', error);
    throw error;
  }
};

/**
 * Get device identity from storage or generate if not exists
 * Ensures identity is stable across app launches
 * @returns {Promise<Object>} Object with deviceId and deviceName
 */
export const getDeviceIdentity = async () => {
  try {
    // Attempt to retrieve existing device ID and name from AsyncStorage
    const storedDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    const storedDeviceName = await AsyncStorage.getItem(DEVICE_NAME_KEY);

    // If both values exist, return the stored identity (already generated)
    if (storedDeviceId && storedDeviceName) {
      return {
        deviceId: storedDeviceId,
        deviceName: storedDeviceName,
      };
    }

    // If identity doesn't exist, generate a new one (first app launch)
    console.log('No device identity found, generating new one...');
    return await generateDeviceIdentity();
  } catch (error) {
    console.error('Error getting device identity:', error);
    throw error;
  }
};

/**
 * Clear stored device identity from AsyncStorage
 * Used for testing purposes only - allows regenerating identity
 * @returns {Promise<boolean>} True if successfully cleared
 */
export const resetDeviceIdentity = async () => {
  try {
    // Remove both device ID and device name from AsyncStorage
    await AsyncStorage.multiRemove([DEVICE_ID_KEY, DEVICE_NAME_KEY]);

    console.log('Device identity reset successfully');
    return true;
  } catch (error) {
    console.error('Error resetting device identity:', error);
    throw error;
  }
};

/**
 * Check if device identity already exists in storage
 * Useful for determining if this is first app launch
 * @returns {Promise<boolean>} True if identity exists
 */
export const hasDeviceIdentity = async () => {
  try {
    // Check if device ID exists in storage
    const storedDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    return storedDeviceId !== null;
  } catch (error) {
    console.error('Error checking device identity:', error);
    return false;
  }
};
