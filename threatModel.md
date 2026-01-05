ThreatModel.md

Offline Token–Based Mobile Payment System

1. System Goal

Enable fast, low-friction offline payments between a user wallet and a merchant using:

Preloaded offline balance (subwallet)

Cryptographically signed offline tokens

Dynamic QR codes

BLE for short-range secure transport

Deferred online reconciliation

The system prioritizes usability and safety, not perfect offline double-spend elimination.

2. Trust Domains (Frozen)
2.1 Bank Backend (Highest Trust)

Issues and manages cryptographic keys

Final authority on balances

Performs reconciliation and fraud detection

2.2 User Wallet (Medium Trust)

Runs on user-controlled device

Uses TEE / Keystore to protect private keys

Can be compromised at OS level, but not key-extraction level (assumed)

2.3 Merchant App (Medium Trust)

Offline verifier

Stores offline transactions

No authority to mint or alter tokens

Trust Rule:

Merchant and Wallet never trust each other directly.
Both trust cryptographic rules defined by the Backend.

3. Offline Token (FROZEN FORMAT)

This format must never change after implementation.

{
  "payer_pubkey": "base64",
  "merchant_id": "string",
  "amount": "number",
  "timestamp": "unix_seconds",
  "counter": "integer",
  "nonce": "random_128bit",
  "signature": "base64"
}

Token Invariants

counter is strictly monotonic per device

timestamp must be within acceptable skew (e.g., ±2 minutes)

signature is generated using a device-bound private key

Token is single-use

Token is merchant-specific

4. Dynamic QR Code (FROZEN FORMAT)

QR codes are short-lived capability grants, not payment data.

{
  "merchant_id": "string",
  "merchant_name": "string",
  "ble_service_uuid": "uuid",
  "ephemeral_pubkey": "base64",
  "nonce": "random_128bit",
  "timestamp": "unix_seconds",
  "expiry": "unix_seconds",
  "signature": "base64"
}

QR Invariants

Expiry: 15–20 seconds

Signed by merchant private key

Cannot be reused after expiry

Must match BLE service UUID

Used to prevent replay and relay attacks

5. Cryptographic Assumptions (Frozen)

Ed25519 or ECDSA P-256 only

No custom crypto

Canonical serialization before signing

All signatures verified before acceptance

Key Storage Rules

Wallet private keys stored in:

Android Keystore (StrongBox if available)

iOS Secure Enclave

Private keys never leave secure hardware

Public keys are registered with backend

6. Offline Payment Flow (Invariant)

Merchant generates dynamic QR

Wallet scans QR

Wallet verifies QR signature + expiry

Wallet auto-connects to BLE UUID

User enters amount

Wallet generates signed offline token

Token sent via BLE

Merchant verifies token offline

Merchant sends ACK

Both store transaction locally

This flow must not change.

7. Double-Spend Model (Explicitly Accepted Risk)
What is prevented:

Replay of old tokens

Reuse of tokens at same merchant

Forged tokens

Screenshot-based attacks

What is NOT fully preventable:

Spending offline at multiple merchants before sync

Mitigations:

Offline balance caps

Counters

Device-bound keys

Short QR expiry

Backend reconciliation

Statement for judges:

Offline systems minimize, not eliminate, double spending.

8. BLE Security Model (Frozen)

BLE is transport only

No trust decisions made at BLE layer

Encrypted characteristic

Session tied to QR ephemeral key

Timeout + retry allowed

9. Reconciliation Rules (Frozen)

Merchant uploads offline transactions when online

Backend:

Verifies signatures

Detects counter reuse

Flags suspicious devices

Settles balances

Merchant decisions are provisional until sync

10. Failure Cases (Must Be Implemented)
Case	Behavior
QR expired	Wallet rejects, asks rescan
BLE fails	Retry or fallback
Invalid signature	Reject payment
Counter reuse	Backend flags device
Sync conflict	Backend wins
11. Non-Goals (Explicit)

Perfect offline double-spend prevention

Anonymous payments

Cross-device wallet cloning

Custom cryptographic algorithms

12. Final Invariant

No module may violate the rules in this document.
If behavior conflicts, this document wins.