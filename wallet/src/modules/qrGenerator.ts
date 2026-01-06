/**
 * Receive QR Generator & Verifier
 * 
 * Purpose:
 * - Pure functions for generating and verifying receive QR payloads
 * - No UI logic, no BLE operations, no navigation
 * - Clean separation between data assembly and crypto operations
 * 
 * Architecture:
 * - generateReceiveQR(): assembles payload + signs with ephemeral key
 * - verifyReceiveQR(): validates signature + timestamp expiry
 * - Crypto operations delegated to cryptoUtils.ts
 * 
 * QR Payload Structure:
 * {
 *   device_id: string,           // Receiver's unique device ID
 *   device_name: string,          // Human-readable device name
 *   ble_service_uuid: string,     // BLE service UUID for connection
 *   ephemeral_public_key: string, // Session-scoped public key (base64)
 *   nonce: string,                // Random nonce for replay protection (base64)
 *   timestamp: number,            // Unix timestamp (ms)
 *   version: string,              // Protocol version
 *   signature: string             // Ed25519 signature over all fields (base64)
 * }
 */

import {
  getEphemeralPublicKey,
  generateNonce,
  signQRPayload,
  verifyQRSignature,
} from './cryptoUtils';

// BLE Service UUID (must match bleTransport.js and bleSessionManager.ts)
const TOKPAY_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';

// QR code expiry time (5 minutes)
const QR_EXPIRY_TIME_MS = 5 * 60 * 1000;

// Protocol versions for QR payload
const QR_PROTOCOL_V1 = '1.0';
const QR_PROTOCOL_V2 = '2.0';

/**
 * Generate receive QR payload with signature
 * Pure function - no side effects, no async operations beyond crypto
 * 
 * @param {Object} payloadDeps - Dependencies for QR generation
 * @param {string} payloadDeps.deviceId - Receiver's device ID
 * @param {string} payloadDeps.deviceName - Receiver's device name
 * @returns {string} JSON string of signed QR payload
 */
export const generateReceiveQR = (payloadDeps: {
  deviceId: string;
  deviceName: string;
}): string => {
  try {
    const {deviceId, deviceName} = payloadDeps;

    // Validate inputs
    if (!deviceId || !deviceName) {
      throw new Error('Device ID and device name are required');
    }

    // Get session-scoped ephemeral public key (cached per session)
    const ephemeralPublicKey = getEphemeralPublicKey();

    // Transaction intent (kept inside QR; no extra UI)
    const txTimestamp = Date.now();
    const txNonce = generateNonce();

    // Connection bootstrap fields (for establishing BLE connection)
    const conn = {
      device_id: deviceId,
      device_name: deviceName,
      ble_service_uuid: TOKPAY_SERVICE_UUID,
      ephemeral_public_key: ephemeralPublicKey,
    };

    // Transaction intent fields (for binding intent to the QR)
    const tx = {
      intent: 'receive',
      timestamp: txTimestamp,
      nonce: txNonce,
    };

    // Assemble payload (without signature)
    const payload = {
      version: QR_PROTOCOL_V2,
      conn,
      tx,
    };

    // Sign payload with ephemeral secret key
    const signature = signQRPayload(payload);

    // Add signature to payload
    const signedPayload = {
      ...payload,
      signature: signature,
    };

    // Serialize to JSON string for QR encoding
    return JSON.stringify(signedPayload);
  } catch (error) {
    console.error('[QR Generator] Error generating receive QR:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate receive QR: ${errorMessage}`);
  }
};

/**
 * Verify receive QR payload signature and expiry
 * Validates cryptographic signature and timestamp
 * 
 * @param {string} qrString - JSON string of QR payload
 * @returns {Object} Verification result with success flag and parsed data
 */
export const verifyReceiveQR = (qrString: string): {
  success: boolean;
  message: string;
  payload?: any;
} => {
  try {
    // Parse QR string
    const payload = JSON.parse(qrString);

    // Backward-compatible validation for v1 payloads
    if (payload?.version === QR_PROTOCOL_V1) {
      const requiredFields = [
        'device_id',
        'device_name',
        'ble_service_uuid',
        'ephemeral_public_key',
        'nonce',
        'timestamp',
        'version',
        'signature',
      ];

      for (const field of requiredFields) {
        if (!payload[field]) {
          return {
            success: false,
            message: `Missing required field: ${field}`,
          };
        }
      }

      if (payload.ble_service_uuid !== TOKPAY_SERVICE_UUID) {
        return {
          success: false,
          message: 'Invalid BLE service UUID',
        };
      }

      const now = Date.now();
      const age = now - payload.timestamp;
      if (age > QR_EXPIRY_TIME_MS) {
        return {
          success: false,
          message: `QR code expired (age: ${Math.floor(age / 1000)}s)`,
        };
      }

      const isValidSignature = verifyQRSignature(
        payload,
        payload.signature,
        payload.ephemeral_public_key
      );

      if (!isValidSignature) {
        return {
          success: false,
          message: 'Invalid signature',
        };
      }

      return {
        success: true,
        message: 'QR payload verified successfully',
        payload,
      };
    }

    // Versioned schema validation (v2)
    if (payload?.version !== QR_PROTOCOL_V2) {
      return {
        success: false,
        message: `Unsupported protocol version: ${payload?.version ?? 'missing'}`,
      };
    }

    // Validate required top-level fields
    for (const field of ['version', 'conn', 'tx', 'signature']) {
      if (!payload[field]) {
        return {
          success: false,
          message: `Missing required field: ${field}`,
        };
      }
    }

    // Validate connection bootstrap fields
    const connRequired = [
      'device_id',
      'device_name',
      'ble_service_uuid',
      'ephemeral_public_key',
    ];
    for (const field of connRequired) {
      if (!payload.conn?.[field]) {
        return {
          success: false,
          message: `Missing required BLE field: conn.${field}`,
        };
      }
    }

    if (payload.conn.ble_service_uuid !== TOKPAY_SERVICE_UUID) {
      return {
        success: false,
        message: 'Invalid BLE service UUID',
      };
    }

    // Validate transaction intent fields
    const txRequired = ['intent', 'timestamp', 'nonce'];
    for (const field of txRequired) {
      if (!payload.tx?.[field]) {
        return {
          success: false,
          message: `Missing required tx field: tx.${field}`,
        };
      }
    }

    if (payload.tx.intent !== 'receive') {
      return {
        success: false,
        message: `Unsupported tx intent: ${payload.tx.intent}`,
      };
    }

    // Reject if tx timestamp is stale
    const now = Date.now();
    const age = now - payload.tx.timestamp;
    if (age > QR_EXPIRY_TIME_MS) {
      return {
        success: false,
        message: `QR intent expired (age: ${Math.floor(age / 1000)}s)`,
      };
    }

    // Verify signature over (version + conn + tx)
    const isValidSignature = verifyQRSignature(
      payload,
      payload.signature,
      payload.conn.ephemeral_public_key
    );

    if (!isValidSignature) {
      return {
        success: false,
        message: 'Invalid signature',
      };
    }

    return {
      success: true,
      message: 'QR payload verified successfully',
      payload,
    };
  } catch (error) {
    console.error('[QR Generator] Error verifying receive QR:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Verification failed: ${errorMessage}`,
    };
  }
};

/**
 * Check if QR timestamp has expired
 * Helper function for UI to determine if refresh needed
 * 
 * @param {number} timestamp - QR timestamp (ms)
 * @returns {boolean} True if expired, false otherwise
 */
export const isQRExpired = (timestamp: number): boolean => {
  const age = Date.now() - timestamp;
  return age > QR_EXPIRY_TIME_MS;
};

/**
 * Get QR expiry time in milliseconds
 * 
 * @returns {number} Expiry time (ms)
 */
export const getQRExpiryTime = (): number => {
  return QR_EXPIRY_TIME_MS;
};
