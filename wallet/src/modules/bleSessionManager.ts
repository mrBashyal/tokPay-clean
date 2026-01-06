/**
 * BLE Session Manager (Receiver-side session state)
 *
 * IMPORTANT LIMITATION (as of now):
 * - True BLE peripheral advertising is NOT implemented in this module.
 * - `react-native-ble-plx` primarily supports Central mode (scan/connect).
 * - `startAdvertising()` currently validates Bluetooth is PoweredOn and updates
 *   session state, but it does NOT make the device discoverable via real BLE
 *   advertising.
 *
 * This is intentionally NOT “faking connections”:
 * - No connection is created here.
 * - No token transport occurs here.
 * - `CONNECTED` can only be set by calling `markConnected()` from a real
 *   connection event source (currently pending integration).
 *
 * TokPay Service UUID:
 * - The service UUID used by the transport protocol is
 *   `0000ffe0-0000-1000-8000-00805f9b34fb`.
 * - It is defined/used in the Central-mode transport module
 *   [wallet/src/modules/bleTransport.js](wallet/src/modules/bleTransport.js) and
 *   in the receiver QR payload.
 * - This module does not currently advertise that UUID because true peripheral
 *   mode requires a dedicated native peripheral/advertising implementation.
 *
 * Purpose:
 * - Manage Receive-mode session lifecycle state (IDLE | ADVERTISING | CONNECTED)
 * - Provide idempotent start/stop calls for screens to orchestrate
 * - Keep token logic, UI, and navigation out of this module
 */

import {BleManager} from 'react-native-ble-plx';
import {Platform} from 'react-native';

// Session states
export type BleSessionState = 'IDLE' | 'ADVERTISING' | 'CONNECTED';

let bleManager: BleManager | null = null;
let sessionState: BleSessionState = 'IDLE';

/**
 * Initialize BLE manager singleton
 * Creates new manager instance if not already initialized
 */
const initBleManager = (): BleManager => {
  if (!bleManager) {
    bleManager = new BleManager();
    console.log('[BLE Session] Manager initialized');
  }
  return bleManager;
};

/**
 * Get current BLE session state (read-only)
 * 
 * @returns {BleSessionState} Current state: IDLE | ADVERTISING | CONNECTED
 */
export const getSessionState = (): BleSessionState => {
  return sessionState;
};

/**
 * Start Receive-mode advertising session.
 *
 * Current behavior:
 * - Does NOT start true BLE advertising.
 * - Only checks Bluetooth state and sets internal sessionState.
 *
 * Pending work (explicitly not implemented here):
 * - Real peripheral advertising of TokPay service UUID
 * - Accepting incoming connections and raising connection events
 * 
 * Behavior:
 * - Sets state to ADVERTISING
 * - Idempotent: safe to call multiple times
 * 
 * @returns {Promise<void>}
 * @throws {Error} If advertising fails
 */
export const startAdvertising = async (): Promise<void> => {
  try {
    const manager = initBleManager();

    // Check if already advertising
    if (sessionState === 'ADVERTISING') {
      console.log('[BLE Session] Already advertising, skipping');
      return;
    }

    console.log('[BLE Session] Starting advertising...');

    // Check Bluetooth state
    const state = await manager.state();
    if (state !== 'PoweredOn') {
      throw new Error(
        `Bluetooth not enabled. Current state: ${state}. Please enable Bluetooth.`
      );
    }

    // Start advertising with TokPay service UUID
    // Note: react-native-ble-plx provides peripheral mode via startDeviceScan
    // For true advertising, we need to use native modules or alternative approach
    
    if (Platform.OS === 'android') {
      // Android: Use BLE advertising API
      // Note: react-native-ble-plx doesn't expose peripheral mode directly
      // For MVP, we'll use a workaround: continuous scanning with no connection
      // Production would need native module for BLE peripheral advertising
      
      console.log('[BLE Session] Android: Advertising simulation mode');
      console.log('[BLE Session] WARNING: True BLE advertising requires native module');
      console.log('[BLE Session] For two-device testing, sender device must scan and connect');
      
      sessionState = 'ADVERTISING';
      console.log('[BLE Session] State changed to ADVERTISING');
      
    } else {
      // iOS: Use Core Bluetooth peripheral manager (requires native module)
      console.log('[BLE Session] iOS: Advertising simulation mode');
      console.log('[BLE Session] WARNING: True BLE advertising requires native module');
      
      sessionState = 'ADVERTISING';
      console.log('[BLE Session] State changed to ADVERTISING');
    }

  } catch (err) {
    console.error('[BLE Session] Advertising failed:', err);
    sessionState = 'IDLE';
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to start advertising: ${message}`);
  }
};

/**
 * Stop BLE advertising
 * Stops device from being discoverable and cleans up resources
 * 
 * Behavior:
 * - Stops advertising if active
 * - Resets state to IDLE
 * - Idempotent: safe to call multiple times
 * 
 * @returns {Promise<void>}
 */
export const stopAdvertising = async (): Promise<void> => {
  try {
    if (sessionState === 'IDLE') {
      console.log('[BLE Session] Already idle, skipping stop');
      return;
    }

    console.log('[BLE Session] Stopping advertising...');

    // Stop advertising (in simulation mode, just reset state)
    sessionState = 'IDLE';
    console.log('[BLE Session] State changed to IDLE');

  } catch (error) {
    console.error('[BLE Session] Error stopping advertising:', error);
    // Force reset state even on error
    sessionState = 'IDLE';
  }
};

/**
 * Mark session as connected
 * Called when a sender establishes connection
 * 
 * @returns {void}
 */
export const markConnected = (): void => {
  if (sessionState === 'ADVERTISING') {
    sessionState = 'CONNECTED';
    console.log('[BLE Session] State changed to CONNECTED');
  }
};

/**
 * Reset session to IDLE
 * Called when connection is closed or on error
 * 
 * @returns {void}
 */
export const resetSession = (): void => {
  sessionState = 'IDLE';
  console.log('[BLE Session] State reset to IDLE');
};

/**
 * Destroy BLE manager and cleanup
 * Should be called on app shutdown
 * 
 * @returns {Promise<void>}
 */
export const destroySession = async (): Promise<void> => {
  try {
    await stopAdvertising();
    
    if (bleManager) {
      await bleManager.destroy();
      bleManager = null;
      console.log('[BLE Session] Manager destroyed');
    }
  } catch (error) {
    console.error('[BLE Session] Error destroying session:', error);
  }
};
