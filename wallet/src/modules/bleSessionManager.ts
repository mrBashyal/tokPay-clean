/**
 * BLE Session Manager (Receiver-side session state)
 *
 * Uses native TokpayBlePeripheral module for true BLE advertising.
 * The native module handles:
 * - BLE peripheral advertising with TokPay service UUID
 * - GATT server for receiving data from sender devices
 * - Connection state management
 *
 * TokPay Service UUID:
 * - `0000ffe0-0000-1000-8000-00805f9b34fb`
 *
 * Purpose:
 * - Manage Receive-mode session lifecycle state (IDLE | ADVERTISING | CONNECTED)
 * - Provide idempotent start/stop calls for screens to orchestrate
 * - Keep token logic, UI, and navigation out of this module
 */

import {BleManager} from 'react-native-ble-plx';
import {startPeripheral, stopPeripheral} from './blePeripheral';

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
 * Start Receive-mode advertising session using native BLE peripheral.
 *
 * Behavior:
 * - Starts native BLE advertising with GATT server
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

    console.log('[BLE Session] Starting native BLE advertising...');

    // Check Bluetooth state
    const state = await manager.state();
    if (state !== 'PoweredOn') {
      throw new Error(
        `Bluetooth not enabled. Current state: ${state}. Please enable Bluetooth.`
      );
    }

    // Start native BLE peripheral advertising
    await startPeripheral();
    
    sessionState = 'ADVERTISING';
    console.log('[BLE Session] State changed to ADVERTISING (native peripheral active)');

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
 * - Stops native advertising if active
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

    console.log('[BLE Session] Stopping native advertising...');
    
    // Stop native peripheral advertising
    await stopPeripheral();

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
