/**
 * Core builder functions for extracting errors and instructions from Anchor IDLs
 */

import type {
  ErrorInfo,
  IdlError,
  InstructionAccount,
  InstructionInfo,
} from "./types";

/**
 * Type guard to validate standard Anchor IDL structure
 */
function isValidIdl(value: unknown): value is { errors?: IdlError[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    (!("errors" in value) ||
      Array.isArray((value as { errors?: unknown }).errors))
  );
}

/**
 * Type guard to validate Solana Program IDL structure (nested format)
 */
function isSolanaProgramIdl(
  value: unknown
): value is { program: { errors?: IdlError[] } } {
  return (
    typeof value === "object" &&
    value !== null &&
    "program" in value &&
    typeof (value as { program: unknown }).program === "object" &&
    (value as { program: unknown }).program !== null
  );
}

/**
 * Extract errors array from IDL (supports both Anchor and Solana Program formats)
 *
 * @param idl - IDL object (Anchor or Solana Program format)
 * @returns Array of IDL errors, empty array if no errors found
 */
function extractFromIdl(idl: unknown): readonly IdlError[] {
  // Try Solana Program format first (.program.errors)
  if (isSolanaProgramIdl(idl)) {
    const programIdl = (idl as { program: { errors?: IdlError[] } }).program;
    if ("errors" in programIdl && Array.isArray(programIdl.errors)) {
      return programIdl.errors;
    }
  }

  // Fall back to standard Anchor format (.errors)
  if (isValidIdl(idl)) {
    return idl.errors ?? [];
  }

  return [];
}

/**
 * Convert raw IDL error to base ErrorInfo format (without source)
 * Source metadata is added by registry during resolution
 * Supports both Anchor format (msg) and Solana Program format (message, docs)
 *
 * @param idlError - Raw error from IDL
 * @returns ErrorInfo with code, name, description, and optional docs (no source)
 */
function toErrorInfo(idlError: IdlError): Omit<ErrorInfo, "source"> {
  return {
    code: idlError.code,
    name: idlError.name,
    description: idlError.message || idlError.msg || "", // Support both formats
    ...(idlError.docs && { docs: idlError.docs }), // Preserve docs when available
  };
}

/**
 * Build protocol error database from IDL (without source metadata)
 *
 * @param idl - Anchor IDL object
 * @returns Immutable record of errors keyed by error code
 *
 * @example
 * ```ts
 * const errors = buildProtocolErrors(jupiterIdl);
 * ```
 */
export function buildProtocolErrors(
  idl: unknown
): Readonly<Record<number, Omit<ErrorInfo, "source">>> {
  const idlErrors = extractFromIdl(idl);
  const result: Record<number, Omit<ErrorInfo, "source">> = {};

  for (const idlError of idlErrors) {
    const error = toErrorInfo(idlError);

    // Freeze individual error objects for immutability
    result[error.code] = Object.freeze(error);
  }

  // Freeze the entire result object
  return Object.freeze(result);
}

// ============================================================================
// Instruction Extraction
// ============================================================================

/**
 * Raw instruction account definition (supports all IDL formats)
 */
type RawInstructionAccount =
  | {
      // Modern Anchor format
      name: string;
      writable?: boolean;
      signer?: boolean;
      optional?: boolean;
      docs?: string[];
    }
  | {
      // Old Anchor format
      name: string;
      isMut?: boolean;
      isSigner?: boolean;
      docs?: string[];
    }
  | {
      // Solana Program format
      kind?: string;
      name: string;
      isWritable?: boolean;
      isSigner?: boolean;
      isOptional?: boolean;
      docs?: string[];
    };

/**
 * Raw instruction definition from IDL (any format)
 */
type RawInstruction = {
  name: string;
  discriminator?: number[] | Uint8Array;
  accounts: RawInstructionAccount[];
};

/**
 * Normalize instruction account from any format to InstructionAccount
 */
function normalizeAccount(account: RawInstructionAccount): InstructionAccount {
  // Handle all three formats with clear if-else chains
  let writable: boolean | undefined;
  if ("writable" in account) {
    writable = account.writable;
  } else if ("isMut" in account) {
    writable = account.isMut;
  } else if ("isWritable" in account) {
    writable = account.isWritable;
  }

  let signer: boolean | undefined;
  if ("signer" in account) {
    signer = account.signer;
  } else if ("isSigner" in account) {
    signer = account.isSigner;
  }

  let optional: boolean | undefined;
  if ("optional" in account) {
    optional = account.optional;
  } else if ("isOptional" in account) {
    optional = account.isOptional;
  }

  return {
    name: account.name,
    ...(writable !== undefined && { writable }),
    ...(signer !== undefined && { signer }),
    ...(optional !== undefined && { optional }),
    ...(account.docs && { docs: account.docs }),
  };
}

/**
 * Extract instructions from Solana Program format IDL (.program.instructions)
 */
function extractSolanaProgramInstructions(
  instructions: unknown[]
): readonly InstructionInfo[] {
  return instructions
    .filter(
      (inst): inst is RawInstruction =>
        typeof inst === "object" &&
        inst !== null &&
        "name" in inst &&
        typeof inst.name === "string" &&
        "accounts" in inst &&
        Array.isArray(inst.accounts)
    )
    .map((inst, index) => ({
      name: inst.name,
      discriminator: inst.discriminator
        ? Array.from(inst.discriminator)
        : undefined,
      accounts: inst.accounts.map(normalizeAccount),
      position: index,
    }));
}

/**
 * Extract instructions from Anchor format IDL (.instructions)
 */
function extractAnchorInstructions(
  instructions: unknown[]
): readonly InstructionInfo[] {
  return instructions
    .filter(
      (inst): inst is RawInstruction =>
        typeof inst === "object" &&
        inst !== null &&
        "name" in inst &&
        typeof inst.name === "string" &&
        "accounts" in inst &&
        Array.isArray(inst.accounts)
    )
    .map((inst, index) => ({
      name: inst.name,
      discriminator: inst.discriminator
        ? Array.from(inst.discriminator)
        : undefined,
      accounts: inst.accounts.map(normalizeAccount),
      position: index, // Store position for protocols without discriminators
    }));
}

/**
 * Extract instructions array from IDL (supports both Anchor and Solana Program formats)
 *
 * @param idl - IDL object (Anchor or Solana Program format)
 * @returns Array of InstructionInfo, empty array if no instructions found
 */
function extractInstructionsFromIdl(idl: unknown): readonly InstructionInfo[] {
  // Try Solana Program format first (.program.instructions)
  if (isSolanaProgramIdl(idl)) {
    const programIdl = idl as {
      program: { instructions?: unknown[] };
    };
    if (
      "instructions" in programIdl.program &&
      Array.isArray(programIdl.program.instructions)
    ) {
      return extractSolanaProgramInstructions(programIdl.program.instructions);
    }
  }

  // Fall back to standard Anchor format (.instructions)
  if (
    isValidIdl(idl) &&
    "instructions" in idl &&
    Array.isArray((idl as { instructions: unknown[] }).instructions)
  ) {
    return extractAnchorInstructions(
      (idl as { instructions: unknown[] }).instructions
    );
  }

  return [];
}

/**
 * Build protocol instructions database from IDL
 *
 * Creates two types of keys:
 * - Discriminator-based (hex string): For modern Anchor and Solana Programs with discriminators
 * - Position-based (string number): For old Anchor programs without discriminators
 *
 * @param idl - Anchor or Solana Program IDL object
 * @returns Immutable record of instructions keyed by discriminator (hex) or position (number as string)
 *
 * @example
 * ```ts
 * const instructions = buildProtocolInstructions(jupiterIdl);
 * // Access by discriminator: instructions["e517cb977ae3ad2a"]
 * // Access by position: instructions["0"], instructions["1"], etc.
 * ```
 */
export function buildProtocolInstructions(
  idl: unknown
): Readonly<Record<string, InstructionInfo>> {
  const instructions = extractInstructionsFromIdl(idl);
  const result: Record<string, InstructionInfo> = {};

  for (const instruction of instructions) {
    // Key by discriminator if available (modern Anchor/Solana Program)
    if (instruction.discriminator && instruction.discriminator.length === 8) {
      const discriminatorHex = Buffer.from(instruction.discriminator).toString(
        "hex"
      );
      result[discriminatorHex] = Object.freeze(instruction);
    }

    // Also key by position for protocols without discriminators (old Anchor)
    if (instruction.position !== undefined) {
      result[`pos:${instruction.position}`] = Object.freeze(instruction);
    }
  }

  // Freeze the entire result object
  return Object.freeze(result);
}
