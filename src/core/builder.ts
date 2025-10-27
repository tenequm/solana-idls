/**
 * Core builder functions for extracting errors from Anchor IDLs
 */

import type { ErrorInfo, IdlError } from "./types";

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
