import {getDeviceIdentity} from './deviceIdentity';

// BLE service UUID for offline payment (used for auto-discovery)
const BLE_SERVICE_UUID = '00001234-0000-1000-8000-00805f9b34fb';

/**
 * Generate a random nonce for replay attack prevention
 * @returns {string} Random hex string
 */
const generateNonce = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

/**
 * Build QR payload with device info, BLE UUID, timestamp, and nonce
 * Contains all data needed for payer to connect and send offline token
 * @returns {Promise<Object>} Payload object with all required fields
 */
export const buildQrPayload = async () => {
  try {
    // Get stable device identity (device ID and name)
    const {deviceId, deviceName} = await getDeviceIdentity();

    // Generate current timestamp to enable QR expiry validation
    const timestamp = Date.now();

    // Generate random nonce to prevent replay attacks
    const nonce = generateNonce();

    // TODO: Generate ephemeral public key for encrypted communication (to be implemented with crypto module)
    const ephemeralPublicKey = 'ephemeral_key_placeholder';

    // TODO: Sign payload with device private key (to be implemented with crypto module)
    const signature = 'signature_placeholder';

    // Construct payload object with all required fields for offline payment
    const payload = {
      deviceId,
      deviceName,
      bleServiceUuid: BLE_SERVICE_UUID,
      ephemeralPublicKey,
      nonce,
      timestamp,
      signature,
    };

    console.log('QR payload built:', payload);
    return payload;
  } catch (error) {
    console.error('Error building QR payload:', error);
    throw error;
  }
};

/**
 * Encode QR payload object to JSON string for QR code generation
 * @param {Object} payload - Payload object from buildQrPayload()
 * @returns {string} JSON string to be encoded in QR code
 */
export const encodeQrPayload = (payload) => {
  try {
    // Convert payload object to JSON string for QR encoding
    const encoded = JSON.stringify(payload);
    console.log('QR payload encoded, length:', encoded.length);
    return encoded;
  } catch (error) {
    console.error('Error encoding QR payload:', error);
    throw error;
  }
};

/**
 * Decode QR payload JSON string back to object
 * Used by sender to extract device info and connection details
 * @param {string} encodedPayload - JSON string from QR code
 * @returns {Object} Decoded payload object
 */
export const decodeQrPayload = (encodedPayload) => {
  try {
    // Parse JSON string back to object
    const payload = JSON.parse(encodedPayload);
    
    // Validate required fields exist
    if (!payload.deviceId || !payload.bleServiceUuid || !payload.timestamp) {
      throw new Error('Invalid QR payload: missing required fields');
    }

    return payload;
  } catch (error) {
    console.error('Error decoding QR payload:', error);
    throw error;
  }
};

/**
 * Check if QR payload has expired based on timestamp
 * @param {Object} payload - Decoded payload object
 * @param {number} expirySeconds - Expiry time in seconds (default 20s)
 * @returns {boolean} True if expired
 */
export const isQrExpired = (payload, expirySeconds = 60) => {
  const now = Date.now();
  const age = (now - payload.timestamp) / 1000; // Convert to seconds
  return age > expirySeconds;
};
