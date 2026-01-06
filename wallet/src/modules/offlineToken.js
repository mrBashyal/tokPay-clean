import nacl from 'tweetnacl';
import {encode as encodeBase64, decode as decodeBase64} from 'base64-arraybuffer';
import * as Keychain from 'react-native-keychain';
import {getDeviceIdentity} from './deviceIdentity';
import {encodeUtf8, decodeUtf8} from './textEncoding';

/**
 * Offline Token Generator & Verifier
 * Uses Ed25519 for cryptographic signing of payment tokens
 * Private keys stored in device Keystore/TEE for security
 */

const KEYCHAIN_SERVICE = 'com.tokpay.wallet.keypair';
let tokenCounter = 0; // Incremental counter to prevent replay attacks

const toArrayBuffer = (bytes) =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

/**
 * Initialize or retrieve Ed25519 keypair from secure storage (Keystore/TEE)
 * Generates new keypair on first use and stores securely
 * @returns {Promise<{publicKey: Uint8Array, secretKey: Uint8Array}>} Ed25519 keypair
 */
const getOrCreateKeypair = async () => {
  try {
    // Try to retrieve existing keypair from secure Keystore
    const credentials = await Keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
    });

    if (credentials) {
      // Deserialize stored keypair from base64
      const publicKey = new Uint8Array(decodeBase64(credentials.username));
      const secretKey = new Uint8Array(decodeBase64(credentials.password));
      return {publicKey, secretKey};
    }

    // No keypair exists - generate new Ed25519 keypair
    const keypair = nacl.sign.keyPair();

    // Store keypair securely in device Keystore/TEE
    await Keychain.setGenericPassword(
      encodeBase64(toArrayBuffer(keypair.publicKey)),
      encodeBase64(toArrayBuffer(keypair.secretKey)),
      {
        service: KEYCHAIN_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY, // TEE security
      }
    );

    console.log('New Ed25519 keypair generated and stored securely');
    return keypair;
  } catch (error) {
    console.error('Error managing keypair:', error);
    throw new Error('Failed to initialize cryptographic keys');
  }
};

/**
 * Get public key in base64 format for sharing with other devices
 * @returns {Promise<string>} Base64-encoded public key
 */
export const getPublicKey = async () => {
  try {
    const {publicKey} = await getOrCreateKeypair();
    return encodeBase64(toArrayBuffer(publicKey));
  } catch (error) {
    console.error('Error getting public key:', error);
    throw error;
  }
};

/**
 * Generate signed offline payment token using Ed25519
 * Creates cryptographically signed token with payer identity, amount, and payee
 * @param {number} amount - Payment amount in rupees
 * @param {string} payeeDeviceId - Recipient's device ID
 * @returns {Promise<Object>} Signed token object with all required fields
 */
export const generateToken = async (amount, payeeDeviceId) => {
  try {
    // Validate inputs
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!payeeDeviceId || typeof payeeDeviceId !== 'string') {
      throw new Error('Valid payee device ID required');
    }

    // Get device identity and keypair
    const {deviceId} = await getDeviceIdentity();
    const {publicKey, secretKey} = await getOrCreateKeypair();

    // Increment counter for replay attack prevention
    tokenCounter += 1;

    // Create token payload with all required fields
    const token = {
      payer_pubkey: encodeBase64(toArrayBuffer(publicKey)),
      amount: amount,
      payee_device_id: payeeDeviceId,
      timestamp: Date.now(),
      counter: tokenCounter,
      payer_device_id: deviceId, // Additional field for tracking
    };

    // Serialize token for signing (deterministic JSON to ensure consistent signing)
    const tokenString = JSON.stringify({
      payer_pubkey: token.payer_pubkey,
      amount: token.amount,
      payee_device_id: token.payee_device_id,
      timestamp: token.timestamp,
      counter: token.counter,
    });

    // Sign token using Ed25519 private key
    const message = encodeUtf8(tokenString);
    const signature = nacl.sign.detached(message, secretKey);

    // Attach signature to token
    token.signature = encodeBase64(signature);

    console.log(`Token generated: ${amount} to ${payeeDeviceId.substring(0, 8)}...`);
    return token;
  } catch (error) {
    console.error('Error generating token:', error);
    throw new Error(`Token generation failed: ${error.message}`);
  }
};

/**
 * Verify cryptographic signature of an offline payment token
 * Validates Ed25519 signature to ensure token authenticity and integrity
 * @param {Object} token - Token object with signature to verify
 * @returns {Promise<boolean>} True if signature is valid, false otherwise
 */
export const verifyToken = async (token) => {
  try {
    // Validate token structure
    if (!token || typeof token !== 'object') {
      console.error('Invalid token: not an object');
      return false;
    }

    // Check required fields exist
    const requiredFields = ['payer_pubkey', 'amount', 'payee_device_id', 'timestamp', 'counter', 'signature'];
    for (const field of requiredFields) {
      if (!(field in token)) {
        console.error(`Invalid token: missing field ${field}`);
        return false;
      }
    }

    // Validate amount is positive
    if (token.amount <= 0) {
      console.error('Invalid token: amount must be positive');
      return false;
    }

    // Check token is not too old (prevent replay attacks beyond 24 hours)
    const tokenAge = Date.now() - token.timestamp;
    const MAX_TOKEN_AGE = 24 * 60 * 60 * 1000; // 24 hours
    if (tokenAge > MAX_TOKEN_AGE) {
      console.error('Invalid token: expired (older than 24 hours)');
      return false;
    }

    // Reconstruct message that was signed
    const tokenString = JSON.stringify({
      payer_pubkey: token.payer_pubkey,
      amount: token.amount,
      payee_device_id: token.payee_device_id,
      timestamp: token.timestamp,
      counter: token.counter,
    });

    // Convert to Uint8Array for verification
    const message = encodeUtf8(tokenString);
    const signature = new Uint8Array(decodeBase64(token.signature));
    const publicKey = new Uint8Array(decodeBase64(token.payer_pubkey));

    // Verify Ed25519 signature
    const isValid = nacl.sign.detached.verify(message, signature, publicKey);

    if (isValid) {
      console.log(`Token verified successfully from ${token.payer_pubkey.substring(0, 16)}...`);
    } else {
      console.error('Invalid token: signature verification failed');
    }

    return isValid;
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
};

/**
 * Reset token counter (for testing purposes only)
 * In production, counter should persist across app restarts
 */
export const resetCounter = () => {
  tokenCounter = 0;
  console.log('Token counter reset');
};

/**
 * Delete stored keypair from secure storage (for testing/reset)
 * @returns {Promise<boolean>} True if successfully deleted
 */
export const resetKeypair = async () => {
  try {
    await Keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
    console.log('Keypair deleted from secure storage');
    return true;
  } catch (error) {
    console.error('Error resetting keypair:', error);
    return false;
  }
};

/**
 * Export token as base64 string for transfer over BLE/NFC
 * @param {Object} token - Token object to serialize
 * @returns {string} Base64-encoded token string
 */
export const serializeToken = (token) => {
  try {
    const tokenString = JSON.stringify(token);
    return encodeBase64(toArrayBuffer(encodeUtf8(tokenString)));
  } catch (error) {
    console.error('Error serializing token:', error);
    throw new Error('Failed to serialize token');
  }
};

/**
 * Import token from base64 string received over BLE/NFC
 * @param {string} tokenString - Base64-encoded token string
 * @returns {Object} Parsed token object
 */
export const deserializeToken = (tokenString) => {
  try {
    const decodedBytes = new Uint8Array(decodeBase64(tokenString));
    const decoded = decodeUtf8(decodedBytes);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Error deserializing token:', error);
    throw new Error('Failed to deserialize token');
  }
};
