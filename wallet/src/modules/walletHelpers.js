import {getBalance, initDatabase} from './sqliteWallet';

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
 * Ensures QR contains required fields
 * @param {string} qrString - JSON string from QR code
 * @returns {Object} {valid: boolean, walletId: string, error: string}
 */
export const validateQrPayload = (qrString) => {
  try {
    // Parse QR data as JSON
    const qrData = JSON.parse(qrString);

    // Validate that walletId exists and is not empty
    if (!qrData.walletId || typeof qrData.walletId !== 'string') {
      return {
        valid: false,
        walletId: '',
        error: 'Invalid QR: walletId not found or invalid',
      };
    }

    return {
      valid: true,
      walletId: qrData.walletId,
      error: '',
    };
  } catch (error) {
    return {
      valid: false,
      walletId: '',
      error: 'Invalid QR: Not a valid JSON format',
    };
  }
};
