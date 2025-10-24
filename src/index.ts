/**
 * @obsidian-debug/solana-errors
 *
 * Comprehensive Solana error code database covering:
 * - Solana runtime errors
 * - Anchor Framework errors
 * - Popular program errors (Raydium, Jupiter, Orca, Metaplex)
 * - Common error patterns and debugging tips
 *
 * @packageDocumentation
 */

// Error codes database
export {
  ANCHOR_ERRORS,
  type ErrorInfo,
  JUPITER_ERRORS,
  METAPLEX_CANDY_MACHINE_ERRORS,
  MPL_CORE_ERRORS,
  ORCA_WHIRLPOOLS_ERRORS,
  PROGRAM_ERROR_CODES,
  RAYDIUM_AMM_ERRORS,
  resolveErrorCode,
  SOLANA_ERRORS,
  SPL_TOKEN_ERRORS,
} from "./error-codes";

// Error patterns and debugging helpers
export {
  ERROR_PATTERNS,
  type ErrorPattern,
  getCategoryDebugTips,
  matchErrorPattern,
} from "./error-patterns";

// Utilities
export { isValidSignature } from "./utils";
