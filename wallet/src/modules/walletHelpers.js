import {getBalance, initDatabase, deductMoney, addMoney} from './sqliteWallet';
import {generateToken, verifyToken} from './offlineToken';
import {scanAndConnect, sendToken as bleTransferToken, disconnect, requestBlePermissions} from './bleTransport';

/**
 * Initialize wallet and return current balance
 * Centralizes initialization and balance fetching logic
 * @returns {Promise<number>} Current wallet balance
 */
export const initializeAndGetBalance = async () => {
  try {
    // Initialize database with tables if not already done
    await initDatabase();
    
    // Fetch and return current balance
    const balance = await getBalance();
    return balance;
  } catch (error) {
    console.error('Error initializing wallet:', error);
    throw new Error(`Failed to initialize wallet: ${error.message}`);
  }
};

/**
 * Refresh wallet balance
 * Reusable utility to fetch current balance without re-initialization
 * @returns {Promise<number>} Current wallet balance
 */
export const refreshBalance = async () => {
  try {
    // Fetch current balance from database
    const balance = await getBalance();
    return balance;
  } catch (error) {
    console.error('Error refreshing balance:', error);
    throw new Error('Failed to refresh balance');
  }
};

/**
 * Validate amount input for transactions
 * Centralizes amount validation logic
 * @param {string} amountString - Amount as string from input
 * @returns {Object} {valid: boolean, amount: number, error: string}
 */
export const validateTransactionAmount = (amountString) => {
  // Check if amount is entered
  if (!amountString || amountString.trim() === '') {
    return {
      valid: false,
      amount: 0,
      error: 'Please enter an amount',
    };
  }

  // Parse amount to number
  const amount = parseFloat(amountString);

  // Check if amount is a valid number
  if (isNaN(amount)) {
    return {
      valid: false,
      amount: 0,
      error: 'Please enter a valid number',
    };
  }

  // Check if amount is greater than 0
  if (amount <= 0) {
    return {
      valid: false,
      amount: 0,
      error: 'Amount must be greater than 0',
    };
  }

  return {
    valid: true,
    amount,
    error: '',
  };
};

/**
 * Validate QR code payload for wallet transactions
 * Verifies signature and extracts device ID from signed QR
 * @param {string} qrString - JSON string from QR code
 * @returns {Object} {valid: boolean, deviceId: string, deviceName: string, bleServiceUuid: string, error: string}
 */
export const validateQrPayload = (qrString) => {
  try {
    // Import verifyReceiveQR dynamically to avoid circular deps
    const {verifyReceiveQR} = require('./qrGenerator');
    
    // Verify QR payload using crypto verification
    const verification = verifyReceiveQR(qrString);

    if (!verification.success) {
      return {
        valid: false,
        deviceId: '',
        deviceName: '',
        bleServiceUuid: '',
        error: `Invalid QR: ${verification.message}`,
      };
    }

    // Extract validated fields from payload
    const {device_id, device_name, ble_service_uuid} = verification.payload;

    return {
      valid: true,
      deviceId: device_id,
      deviceName: device_name,
      bleServiceUuid: ble_service_uuid,
      error: '',
    };
  } catch (error) {
    return {
      valid: false,
      deviceId: '',
      deviceName: '',
      bleServiceUuid: '',
      error: `Invalid QR: ${error.message || 'Failed to parse QR code'}`,
    };
  }
};
/**
 * Process offline payment with token generation and BLE transfer
 * Orchestrates: token generation → BLE connection → token transmission → wallet deduction
 * Keeps business logic out of UI components
 * @param {number} amount - Payment amount
 * @param {string} payeeDeviceId - Recipient's device ID
 * @returns {Promise<Object>} {success: boolean, message: string, token: Object}
 */
export const processOfflinePayment = async (amount, payeeDeviceId) => {
  let connectedDevice = null;
  
  try {
    // Step 1: Request BLE permissions before any BLE operations
    const hasPermission = await requestBlePermissions();
    if (!hasPermission) {
      throw new Error('Bluetooth permissions are required for offline payments');
    }

    // Step 2: Generate signed offline token with cryptographic signature
    console.log('Generating offline payment token...');
    const token = await generateToken(amount, payeeDeviceId);

    // Step 3: Scan and auto-connect to payee's BLE device
    console.log('Scanning for payee device via BLE...');
    connectedDevice = await scanAndConnect(payeeDeviceId);

    // Step 4: Send token via BLE to payee device
    console.log('Transmitting token via BLE...');
    await bleTransferToken(token, connectedDevice);

    // Step 5: Deduct amount from local SQLite wallet and log transaction
    console.log('Updating local wallet...');
    await deductMoney(amount);

    // Step 6: Disconnect from BLE device
    await disconnect();

    return {
      success: true,
      message: `Payment of ₹${amount.toFixed(2)} sent successfully`,
      token: token,
    };
  } catch (error) {
    // Cleanup: Disconnect if connection was established
    if (connectedDevice) {
      await disconnect().catch(err => console.error('Disconnect error:', err));
    }

    console.error('Offline payment error:', error);

    // Return detailed error message
    return {
      success: false,
      message: error.message || 'Payment failed',
      token: null,
    };
  }
};

/**
 * Validate and process received offline token
 * Orchestrates: token verification → wallet credit → transaction log
 * @param {Object} token - Received payment token
 * @returns {Promise<Object>} {success: boolean, message: string, amount: number}
 */
export const processReceivedToken = async (token) => {
  try {
    // Step 1: Verify token signature and validity
    console.log('Verifying received token...');
    const isValid = await verifyToken(token);

    if (!isValid) {
      throw new Error('Invalid token signature or expired token');
    }

    // Step 2: Extract amount from verified token
    const amount = token.amount;

    // Step 3: Credit amount to local SQLite wallet (handled in ReceiveScreen)
    // Note: addMoney should be called by the screen, not here to avoid double-credit

    return {
      success: true,
      message: `Received ₹${amount.toFixed(2)}`,
      amount: amount,
    };
  } catch (error) {
    console.error('Token processing error:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to process received token',
      amount: 0,
    };
  }
};

/**
 * Apply a received payment token to the local wallet.
 * Orchestrates: verify token -> credit SQLite wallet.
 * Keeps business logic out of screens; screens only handle UI.
 *
 * @param {Object} token - Received payment token
 * @returns {Promise<{success: boolean, message: string, amount: number, newBalance: number}>}
 */
export const applyReceivedPaymentToken = async (token) => {
  try {
    const result = await processReceivedToken(token);
    if (!result.success) {
      return {
        success: false,
        message: result.message,
        amount: 0,
        newBalance: 0,
      };
    }

    const newBalance = await addMoney(result.amount);
    return {
      success: true,
      message: `Received ₹${result.amount.toFixed(2)}`,
      amount: result.amount,
      newBalance,
    };
  } catch (error) {
    console.error('Error applying received token:', error);
    return {
      success: false,
      message: error.message || 'Failed to apply received payment',
      amount: 0,
      newBalance: 0,
    };
  }
};