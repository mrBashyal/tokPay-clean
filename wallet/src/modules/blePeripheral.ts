/**
 * Native BLE Peripheral Bridge
 * 
 * Pure JavaScript bridge to the native Android TokpayBlePeripheral module.
 * Provides BLE advertising and GATT server functionality for the receiver side.
 */

import {NativeModules, NativeEventEmitter, Platform} from 'react-native';

const {TokpayBlePeripheral} = NativeModules;

// Service UUID for TokPay
const TOKPAY_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';

// Event emitter for receiving data from native module
let eventEmitter: NativeEventEmitter | null = null;

/**
 * Get or create the native event emitter
 */
const getEventEmitter = (): NativeEventEmitter => {
  if (!eventEmitter && TokpayBlePeripheral) {
    eventEmitter = new NativeEventEmitter(TokpayBlePeripheral);
  }
  return eventEmitter!;
};

/**
 * Start BLE peripheral advertising with GATT server
 * Makes the device discoverable to sender devices
 * 
 * @returns {Promise<boolean>} Resolves when advertising starts successfully
 * @throws {Error} If advertising fails or BLE is not supported
 */
export const startPeripheral = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    throw new Error('BLE peripheral mode currently only supported on Android');
  }

  if (!TokpayBlePeripheral) {
    throw new Error('TokpayBlePeripheral native module not found');
  }

  console.log('[BLE Peripheral] Starting native advertising...');
  const result = await TokpayBlePeripheral.startAdvertising(TOKPAY_SERVICE_UUID);
  console.log('[BLE Peripheral] Advertising started successfully');
  return result;
};

/**
 * Stop BLE peripheral advertising and close GATT server
 * 
 * @returns {Promise<boolean>} Resolves when advertising stops
 */
export const stopPeripheral = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  if (!TokpayBlePeripheral) {
    return true;
  }

  console.log('[BLE Peripheral] Stopping native advertising...');
  const result = await TokpayBlePeripheral.stopAdvertising();
  console.log('[BLE Peripheral] Advertising stopped');
  return result;
};

/**
 * Send ACK response to connected device
 * 
 * @param {string} dataBase64 - Base64 encoded ACK data
 * @returns {Promise<boolean>} Resolves when ACK is sent
 */
export const sendAck = async (dataBase64: string): Promise<boolean> => {
  if (Platform.OS !== 'android' || !TokpayBlePeripheral) {
    throw new Error('ACK sending not available');
  }

  return TokpayBlePeripheral.sendAck(dataBase64);
};

/**
 * Subscribe to token data received events from sender devices
 * 
 * @param {Function} callback - Called when data is received: (event: {deviceId: string, data: string, length: number}) => void
 * @returns {Function} Unsubscribe function
 */
export const onDataReceived = (
  callback: (event: {deviceId: string; data: string; length: number}) => void
): (() => void) => {
  if (Platform.OS !== 'android' || !TokpayBlePeripheral) {
    console.warn('[BLE Peripheral] Native module not available for event subscription');
    return () => {};
  }

  const emitter = getEventEmitter();
  const subscription = emitter.addListener('onTokenReceived', callback);

  return () => {
    subscription.remove();
  };
};

/**
 * Check if native BLE peripheral is available
 */
export const isPeripheralAvailable = (): boolean => {
  return Platform.OS === 'android' && !!TokpayBlePeripheral;
};
