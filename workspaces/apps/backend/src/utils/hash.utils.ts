/**
 * High-performance non-cryptographic hashing utilities using native 'Bun.hash'.
 * These are significantly faster than Node's 'crypto' module for tasks like
 * ETag generation, short link creation, and data integrity checks.
 */

/**
 * Generates a fast ETag for a given content string or buffer.
 * Uses 'wyhash' by default for optimal performance.
 *
 * @param content - The body content to hash.
 * @returns A hex string representation of the hash, prefixed for ETag compliance.
 */
export function generateETag(content: string | Buffer | Uint8Array): string {
  if (!content) return "";

  // Bun.hash returns a 64-bit number. We convert it to hex for the ETag.
  const hash = Bun.hash(content);
  return `W/"${hash.toString(16)}"`;
}

/**
 * Generates a short, non-cryptographic identifier.
 * Useful for short invite links, temporary IDs, or cache keys.
 *
 * @param content - The data to base the ID on.
 * @returns A base36 encoded short string.
 */
export function generateShortId(content: string | number | Buffer): string {
  const data = typeof content === "number" ? String(content) : content;
  const hash = Bun.hash(data);
  // Base36 gives a compact representation using [0-9a-z]
  return hash.toString(36);
}

/**
 * Quickly verifies data integrity using a fast hash.
 * @param data - The data to verify.
 * @param expectedHash - The expected hash value (number or string).
 * @returns True if the hashes match.
 */
export function verifyIntegrity(data: Buffer | string, expectedHash: number | string | bigint): boolean {
  const currentHash = Bun.hash(data);

  if (typeof expectedHash === "number" || typeof expectedHash === "bigint") {
    return currentHash === BigInt(expectedHash);
  }

  // If string, handle both decimal and hex formats
  if (expectedHash.startsWith("0x")) {
    return currentHash === BigInt(expectedHash);
  }

  return currentHash.toString() === expectedHash || currentHash.toString(16) === expectedHash;
}
