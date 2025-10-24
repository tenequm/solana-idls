/**
 * Solana utility functions
 */

// Solana signatures are base58-encoded and typically 87-88 characters
const SOLANA_SIGNATURE_REGEX = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;

/**
 * Validates if a string is a valid Solana transaction signature
 */
export function isValidSignature(signature: string): boolean {
  return SOLANA_SIGNATURE_REGEX.test(signature.trim());
}
