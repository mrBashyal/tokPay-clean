/**
 * Permissions Bootstrap Module
 * 
 * Purpose:
 * - One-time permission request on app launch
 * - Requests Bluetooth, Location, and Camera permissions
 * - Idempotent: tracks completion in AsyncStorage
 * 
 * Architecture:
 * - No BLE operations (scanning, advertising, connecting)
 * - No wallet or business logic
 * - Clean separation from transport layer
 * - Called once from App root before navigation
 * 
 * Permissions requested:
 * - BLUETOOTH_SCAN (Android 12+)
 * - BLUETOOTH_CONNECT (Android 12+)
 * - BLUETOOTH_ADVERTISE (Android 12+)
 * - ACCESS_FINE_LOCATION (required for BLE on Android)
 * - CAMERA (for QR scanning)
 */

import {Platform, PermissionsAndroid, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage key to track if permissions have been requested
const PERMISSIONS_REQUESTED_KEY = '@TokPay:permissions_requested';

/**
 * Request all required permissions for TokPay functionality
 * Idempotent: only requests once, subsequent calls return previous result
 * 
 * @returns {Promise<boolean>} true if all permissions granted, false otherwise
 */
export const requestAllPermissions = async () => {
  try {
    // Check if permissions were already requested
    const alreadyRequested = await AsyncStorage.getItem(PERMISSIONS_REQUESTED_KEY);
    if (alreadyRequested === 'true') {
      console.log('Permissions already requested, skipping bootstrap');
      return true;
    }

    console.log('Starting permissions bootstrap...');

    // Android 12+ requires runtime Bluetooth permissions
    if (Platform.OS === 'android') {
      const androidVersion = Platform.Version;
      
      if (androidVersion >= 31) {
        // Android 12+ (API 31+): Request new Bluetooth permissions
        const permissions = [
          'android.permission.BLUETOOTH_SCAN',
          'android.permission.BLUETOOTH_CONNECT',
          'android.permission.BLUETOOTH_ADVERTISE',
          'android.permission.ACCESS_FINE_LOCATION',
          'android.permission.CAMERA',
        ];

        console.log('Requesting Android 12+ permissions:', permissions);

        const results = await PermissionsAndroid.requestMultiple(permissions);

        // Log results for debugging
        console.log('Permission results:', results);

        // Check if all permissions were granted
        const allGranted = Object.values(results).every(
          result => result === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          console.warn('Some permissions were denied:', results);
          Alert.alert(
            'Permissions Required',
            'TokPay needs Bluetooth, Location, and Camera permissions to function.\n\n' +
            'Please grant all permissions in the next dialog or enable them in Settings.',
            [{text: 'OK'}]
          );
          
          // Mark as requested even if denied to avoid repeated prompts
          await AsyncStorage.setItem(PERMISSIONS_REQUESTED_KEY, 'true');
          return false;
        }

        console.log('All Android 12+ permissions granted');
      } else {
        // Android 11 and below: Only request Location and Camera
        const permissions = [
          'android.permission.ACCESS_FINE_LOCATION',
          'android.permission.CAMERA',
        ];

        console.log('Requesting Android <12 permissions:', permissions);

        const results = await PermissionsAndroid.requestMultiple(permissions);

        const allGranted = Object.values(results).every(
          result => result === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          console.warn('Some permissions were denied:', results);
          Alert.alert(
            'Permissions Required',
            'TokPay needs Location and Camera permissions to function.\n\n' +
            'Please grant all permissions in the next dialog or enable them in Settings.',
            [{text: 'OK'}]
          );
          
          await AsyncStorage.setItem(PERMISSIONS_REQUESTED_KEY, 'true');
          return false;
        }

        console.log('All Android <12 permissions granted');
      }

      // Mark permissions as requested
      await AsyncStorage.setItem(PERMISSIONS_REQUESTED_KEY, 'true');
      console.log('Permissions bootstrap complete');
      return true;
    }

    // iOS: Permissions requested at runtime when features are used
    // No bootstrap needed for iOS
    console.log('iOS detected, no bootstrap needed');
    await AsyncStorage.setItem(PERMISSIONS_REQUESTED_KEY, 'true');
    return true;
    
  } catch (error) {
    console.error('Error requesting permissions:', error);
    
    // Mark as requested to avoid infinite loops on error
    await AsyncStorage.setItem(PERMISSIONS_REQUESTED_KEY, 'true');
    
    Alert.alert(
      'Permission Error',
      `Failed to request permissions: ${error.message}\n\n` +
      'You can enable permissions manually in Settings.',
      [{text: 'OK'}]
    );
    
    return false;
  }
};

/**
 * Reset permissions bootstrap state
 * Useful for testing or allowing user to re-request permissions
 * 
 * @returns {Promise<void>}
 */
export const resetPermissionsBootstrap = async () => {
  try {
    await AsyncStorage.removeItem(PERMISSIONS_REQUESTED_KEY);
    console.log('Permissions bootstrap state reset');
  } catch (error) {
    console.error('Error resetting permissions bootstrap:', error);
  }
};

/**
 * Check if permissions bootstrap has been completed
 * 
 * @returns {Promise<boolean>} true if bootstrap completed, false otherwise
 */
export const hasPermissionsBootstrapped = async () => {
  try {
    const requested = await AsyncStorage.getItem(PERMISSIONS_REQUESTED_KEY);
    return requested === 'true';
  } catch (error) {
    console.error('Error checking permissions bootstrap:', error);
    return false;
  }
};
