/**
 * Comprehensive Solana and program-specific error code mappings
 * Used to translate hex error codes into human-readable names and descriptions
 *
 * Sources:
 * - Anchor Framework: https://github.com/coral-xyz/anchor
 * - Solana Runtime: https://github.com/solana-labs/solana
 * - Raydium AMM: https://github.com/raydium-io/raydium-amm
 * - Metaplex: https://github.com/metaplex-foundation
 */
interface ErrorInfo {
    name: string;
    description: string;
    category?: string;
    debugTip?: string;
}
/**
 * Common Solana runtime/builtin errors
 */
declare const SOLANA_ERRORS: Record<number, ErrorInfo>;
/**
 * Anchor Framework errors (100-5000 range)
 * Most common errors for Anchor-based programs
 */
declare const ANCHOR_ERRORS: Record<number, ErrorInfo>;
/**
 * Raydium AMM V4 error codes
 * Source: https://github.com/raydium-io/raydium-amm/blob/master/program/src/error.rs
 */
declare const RAYDIUM_AMM_ERRORS: Record<number, ErrorInfo>;
/**
 * SPL Token Program error codes
 * Source: https://docs.rs/spl-token/latest/spl_token/error/enum.TokenError.html
 * Used by the standard Token Program (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)
 */
declare const SPL_TOKEN_ERRORS: Record<number, ErrorInfo>;
/**
 * Metaplex Candy Machine error codes
 * Source: https://github.com/metaplex-foundation/mpl-core-candy-machine
 */
declare const METAPLEX_CANDY_MACHINE_ERRORS: Record<number, ErrorInfo>;
/**
 * Metaplex MPL Core error codes
 * Source: https://github.com/metaplex-foundation/mpl-core
 */
declare const MPL_CORE_ERRORS: Record<number, ErrorInfo>;
/**
 * Orca Whirlpools error codes
 * Source: https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/errors.rs
 * Used by Orca's concentrated liquidity AMM (Whirlpools program)
 */
declare const ORCA_WHIRLPOOLS_ERRORS: Record<number, ErrorInfo>;
/**
 * Jupiter Aggregator error codes
 * Source: https://dev.jup.ag/docs/swap/common-errors
 * Used by Jupiter swap aggregator (v1, v4, v6)
 */
declare const JUPITER_ERRORS: Record<number, ErrorInfo>;
/**
 * Map program addresses to their error code dictionaries
 */
declare const PROGRAM_ERROR_CODES: Record<string, Record<number, ErrorInfo>>;
/**
 * Resolve an error code to a human-readable name and description
 * Enhanced to support Anchor errors and provide categorization
 */
declare function resolveErrorCode(programId: string | undefined, errorCode: number): ErrorInfo | null;

/**
 * Common Solana error patterns and scenarios
 * Used to provide additional context and debugging tips for frequently encountered errors
 */
interface ErrorPattern {
    keywords: string[];
    category: string;
    likelyReason: string;
    quickFix: string;
    severity: "critical" | "high" | "medium" | "low";
}
/**
 * Common error patterns extracted from real-world Solana debugging scenarios
 * Sources: Community reports, Stack Exchange, developer blogs
 */
declare const ERROR_PATTERNS: ErrorPattern[];
/**
 * Match error logs against known patterns
 * Returns the most relevant pattern based on keyword matching
 */
declare function matchErrorPattern(errorText: string): ErrorPattern | null;
/**
 * Get debugging tips based on error category
 */
declare function getCategoryDebugTips(category: string): string[];

/**
 * Solana utility functions
 */
/**
 * Validates if a string is a valid Solana transaction signature
 */
declare function isValidSignature(signature: string): boolean;

export { ANCHOR_ERRORS, ERROR_PATTERNS, type ErrorInfo, type ErrorPattern, JUPITER_ERRORS, METAPLEX_CANDY_MACHINE_ERRORS, MPL_CORE_ERRORS, ORCA_WHIRLPOOLS_ERRORS, PROGRAM_ERROR_CODES, RAYDIUM_AMM_ERRORS, SOLANA_ERRORS, SPL_TOKEN_ERRORS, getCategoryDebugTips, isValidSignature, matchErrorPattern, resolveErrorCode };
