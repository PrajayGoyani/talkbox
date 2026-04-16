/**
 * Message encryption using the native Web Crypto API (AES-256-GCM).
 *
 * Wire format:  [1-byte version][12-byte IV][ciphertext][16-byte auth tag]
 *               → Base64url encoded string
 *
 * - Version byte allows future format migrations.
 * - AES-GCM provides authenticated encryption with no padding overhead.
 * - Key is derived once via PBKDF2 and cached for performance.
 */

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY;

/** Current wire-format version */
const VERSION = 0x01;

/** IV size for AES-GCM (NIST recommended) */
const IV_LENGTH = 12;

/** Fixed salt for PBKDF2 key derivation (acceptable for a shared symmetric key) */
const FIXED_SALT = new TextEncoder().encode("talkbox-e2e-v1");

if (!ENCRYPTION_KEY) {
  console.warn("[encryption] VITE_ENCRYPTION_KEY is not set — messages will be sent in plaintext.");
}

// ── Key derivation (cached) ──────────────────────────────────────────

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ENCRYPTION_KEY),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  cachedKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: FIXED_SALT, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  return cachedKey;
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Encode bytes to a URL-safe Base64 string (no padding) */
function toBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode a URL-safe Base64 string back to bytes */
function fromBase64url(str: string): Uint8Array {
  // Restore standard Base64 characters
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Encrypt a plaintext message using AES-256-GCM.
 * Returns the original string if no key is configured.
 */
export async function encryptMessage(message: string): Promise<string> {
  if (!ENCRYPTION_KEY) return message;

  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const plaintext = new TextEncoder().encode(message);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );

  // Pack: version + IV + ciphertext (includes auth tag appended by WebCrypto)
  const packed = new Uint8Array(1 + IV_LENGTH + ciphertext.byteLength);
  packed[0] = VERSION;
  packed.set(iv, 1);
  packed.set(new Uint8Array(ciphertext), 1 + IV_LENGTH);

  return toBase64url(packed.buffer);
}

/**
 * Decrypt an AES-256-GCM encrypted message back to plaintext.
 * If the message is not in v1 encrypted format, it is returned as-is (plaintext).
 */
export async function decryptMessage(encryptedMessage: string): Promise<string> {
  if (!ENCRYPTION_KEY) return encryptedMessage;

  try {
    const raw = fromBase64url(encryptedMessage);

    // Only handle our v1 format
    if (raw.length < 1 + IV_LENGTH + 1 || raw[0] !== VERSION) {
      return encryptedMessage;
    }

    const iv = raw.slice(1, 1 + IV_LENGTH);
    const ciphertext = raw.slice(1 + IV_LENGTH);

    const key = await getKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    // Decryption failed — treat as plaintext
    return encryptedMessage;
  }
}

