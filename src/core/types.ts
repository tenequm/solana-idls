/**
 * Core type definitions for Solana error database
 *
 * Uses `type` instead of `interface` following 2025 TypeScript best practices
 */

/**
 * Raw error definition from IDL
 * Supports both Anchor format (msg) and Solana Program format (message, docs)
 * @see https://www.anchor-lang.com/docs/idl-spec
 */
export type IdlError = {
  readonly code: number;
  readonly name: string;
  readonly msg?: string; // Anchor format
  readonly message?: string; // Solana Program format
  readonly docs?: string[]; // Additional documentation (Solana Program format)
};

/**
 * Error source provenance for tracking where an error originated
 *
 * - program-specific: Error unique to a specific program (Jupiter, Orca, etc.)
 * - anchor-framework: Anchor framework error that applies to any Anchor program
 * - token-program: SPL Token or Token-2022 program error
 */
export type ErrorSource =
  | {
      readonly type: "program-specific";
      readonly programId: string;
      readonly programName: string;
    }
  | { readonly type: "anchor-framework"; readonly programId: string }
  | {
      readonly type: "token-program";
      readonly programId: string;
      readonly programName: string;
    };

/**
 * Error information extracted directly from IDL
 * No interpretation or enhancement - pure data from source
 */
export type ErrorInfo = {
  readonly code: number;
  readonly name: string;
  readonly description: string;
  readonly docs?: readonly string[]; // Additional documentation when available
  readonly source: ErrorSource;
};

/**
 * IDL source provenance for tracking where errors came from
 */
export type IdlSource =
  | { readonly type: "on-chain"; readonly fetchedAt: string }
  | { readonly type: "github"; readonly url: string; readonly commit: string }
  | {
      readonly type: "npm";
      readonly package: string;
      readonly version: string;
    };

/**
 * Protocol metadata for provenance tracking
 */
export type ProtocolMetadata = {
  readonly name: string;
  readonly programId: string;
  readonly version: string;
  readonly idlSource?: IdlSource;
  readonly lastVerified?: string;
};

/**
 * Instruction account metadata from IDL
 * Supports both Anchor formats (old/new) and Solana Program format
 */
export type InstructionAccount = {
  readonly name: string;
  readonly writable?: boolean;
  readonly signer?: boolean;
  readonly optional?: boolean;
  readonly docs?: readonly string[];
};

/**
 * Instruction definition extracted from IDL
 *
 * Supports three IDL formats:
 * - Modern Anchor: Has discriminator (8-byte SHA256 hash of instruction name)
 * - Old Anchor: No discriminator, position-based matching only
 * - Solana Program: Has discriminator, nested under .program
 */
export type InstructionInfo = {
  readonly name: string;
  readonly discriminator?: readonly number[]; // 8-byte array for modern Anchor/Solana Program
  readonly accounts: readonly InstructionAccount[];
  readonly position?: number; // Index in IDL for protocols without discriminators
};
