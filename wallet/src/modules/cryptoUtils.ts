/**
 * Cryptographic Utilities for TokPay
 * 
 * Purpose:
 * - Session-scoped ephemeral key generation for QR codes
 * - Signing and verification of QR payloads
 * - Nonce generation for replay protection
 * 
 * Architecture:
 * - Uses tweetnacl for Ed25519 cryptography (same as offlineToken.js)
 * - Ephemeral keys are session-scoped (not per-render)
 * - All crypto operations isolated in this module
 * - No business logic, no UI, no BLE operations
 * 
 * Security:
 * - Ephemeral keys for receive QR (session-based)
 * - Nonce prevents replay attacks
 * - Signature over entire payload for integrity
 * - Timestamp for expiry validation
 */

import nacl from 'tweetnacl';
import {encode as encodeBase64, decode as decodeBase64} from 'base64-arraybuffer';

/**
 * Session-scoped ephemeral keypair
 * Generated once per app session, reused for all QR codes until app restart
 */
let sessionEphemeralKeypair: {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
} | null = null;

/**
 * Generate or retrieve session-scoped ephemeral keypair
 * Used for signing receive QR codes
 * 
 * Behavior:
 * - First call: generates new Ed25519 keypair
 * - Subsequent calls: returns cached keypair
 * - Keypair destroyed on app restart
 * 
 * @returns {Object} Ephemeral keypair with publicKey and secretKey
 */
export const getSessionEphemeralKeypair = (): {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
} => {
  if (!sessionEphemeralKeypair) {
    console.log('[CryptoUtils] Generating session ephemeral keypair...');
    sessionEphemeralKeypair = nacl.sign.keyPair();
    console.log('[CryptoUtils] Session ephemeral keypair generated');
  }
  return sessionEphemeralKeypair;
};

/**
 * Get ephemeral public key in base64 format
 * Used for including in QR payload
 * 
 * @returns {string} Base64-encoded ephemeral public key
 */
export const getEphemeralPublicKey = (): string => {
  const {publicKey} = getSessionEphemeralKeypair();
  const arrayBuffer = publicKey.buffer.slice(
    publicKey.byteOffset,
    publicKey.byteOffset + publicKey.byteLength
  ) as ArrayBuffer;
  return encodeBase64(arrayBuffer);
};

/**
 * Generate cryptographic nonce for replay protection
 * Nonce is unique per QR generation and prevents replay attacks
 * 
 * @returns {string} Base64-encoded random nonce (32 bytes)
 */
export const generateNonce = (): string => {
  const nonce = nacl.randomBytes(32);
  const arrayBuffer = nonce.buffer.slice(
    nonce.byteOffset,
    nonce.byteOffset + nonce.byteLength
  ) as ArrayBuffer;
  return encodeBase64(arrayBuffer);
};

/**
 * Convert string to Uint8Array for crypto operations
 * Helper function for React Native compatibility
 */
const stringToUint8Array = (str: string): Uint8Array => {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
};

/**
 * Sign QR payload using session ephemeral keypair
 * Creates Ed25519 signature over all payload fields
 * 
 * @param {Object} payload - QR payload to sign (without signature field)
 * @returns {string} Base64-encoded Ed25519 signature
 */
export const signQRPayload = (payload: Record<string, any>): string => {
  try {
    // Serialize payload to JSON for signing (deterministic order)
    const payloadString = JSON.stringify(payload);
    
    // Convert string to Uint8Array
    const payloadBytes = stringToUint8Array(payloadString);

    // Sign with ephemeral secret key
    const {secretKey} = getSessionEphemeralKeypair();
    const signature = nacl.sign.detached(payloadBytes, secretKey);

    // Convert Uint8Array to ArrayBuffer and encode
    const arrayBuffer = signature.buffer.slice(
      signature.byteOffset,
      signature.byteOffset + signature.byteLength
    ) as ArrayBuffer;
    return encodeBase64(arrayBuffer);
  } catch (error) {
    console.error('[CryptoUtils] Error signing QR payload:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to sign QR payload: ${errorMessage}`);
  }
};

/**
 * Verify QR payload signature using ephemeral public key
 * Validates Ed25519 signature against payload
 * 
 * @param {Object} payload - QR payload with signature field
 * @param {string} signature - Base64-encoded signature to verify
 * @param {string} publicKey - Base64-encoded public key from payload
 * @returns {boolean} True if signature is valid, false otherwise
 */
export const verifyQRSignature = (
  payload: Record<string, any>,
  signature: string,
  publicKey: string
): boolean => {
  try {
    // Create payload without signature for verification
    const {signature: _, ...payloadWithoutSig} = payload;
    const payloadString = JSON.stringify(payloadWithoutSig);
    
    // Convert string to Uint8Array
    const payloadBytes = stringToUint8Array(payloadString);

    // Decode signature and public key from base64
    const signatureBytes = new Uint8Array(decodeBase64(signature));
    const publicKeyBytes = new Uint8Array(decodeBase64(publicKey));

    // Verify signature
    return nacl.sign.detached.verify(payloadBytes, signatureBytes, publicKeyBytes);
  } catch (error) {
    console.error('[CryptoUtils] Error verifying QR signature:', error);
    return false;
  }
};

/**
 * Reset session ephemeral keypair
 * Useful for testing or forcing regeneration
 * 
 * @returns {void}
 */
export const resetSessionEphemeralKey = (): void => {
  console.log('[CryptoUtils] Resetting session ephemeral keypair');
  sessionEphemeralKeypair = null;
};
