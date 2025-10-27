/**
 * Anchor Framework Error Definitions
 *
 * Manually defined errors from Anchor framework v0.30.1
 * These errors apply to ANY Anchor program and serve as fallback resolution
 *
 * Source: https://github.com/solana-foundation/anchor/blob/master/ts/packages/anchor-errors/src/index.ts
 */

import type { ErrorInfo } from "../../core/types";

/**
 * All 59 Anchor framework errors (codes 100-5000)
 * Organized by category for maintainability
 */
export const ANCHOR_ERRORS: Record<number, Omit<ErrorInfo, "source">> = {
  // ============================================================================
  // Instruction Errors (100-103)
  // ============================================================================
  100: {
    code: 100,
    name: "InstructionMissing",
    description: "8 byte instruction identifier not provided",
  },
  101: {
    code: 101,
    name: "InstructionFallbackNotFound",
    description: "Fallback functions are not supported",
  },
  102: {
    code: 102,
    name: "InstructionDidNotDeserialize",
    description: "The program could not deserialize the given instruction",
  },
  103: {
    code: 103,
    name: "InstructionDidNotSerialize",
    description: "The program could not serialize the given instruction",
  },

  // ============================================================================
  // IDL Errors (1000-1002)
  // ============================================================================
  1000: {
    code: 1000,
    name: "IdlInstructionStub",
    description: "The program was compiled without idl instructions",
  },
  1001: {
    code: 1001,
    name: "IdlInstructionInvalidProgram",
    description: "Invalid program given to the IDL instruction",
  },
  1002: {
    code: 1002,
    name: "IdlAccountNotEmpty",
    description: "IDL account must be empty in order to resize",
  },

  // ============================================================================
  // Event Errors (1500)
  // ============================================================================
  1500: {
    code: 1500,
    name: "EventInstructionStub",
    description: "The program was compiled without `event-cpi` feature",
  },

  // ============================================================================
  // Constraint Errors (2000-2039)
  // ============================================================================
  2000: {
    code: 2000,
    name: "ConstraintMut",
    description: "A mut constraint was violated",
  },
  2001: {
    code: 2001,
    name: "ConstraintHasOne",
    description: "A has_one constraint was violated",
  },
  2002: {
    code: 2002,
    name: "ConstraintSigner",
    description: "A signer constraint was violated",
  },
  2003: {
    code: 2003,
    name: "ConstraintRaw",
    description: "A raw constraint was violated",
  },
  2004: {
    code: 2004,
    name: "ConstraintOwner",
    description: "An owner constraint was violated",
  },
  2005: {
    code: 2005,
    name: "ConstraintRentExempt",
    description: "A rent exemption constraint was violated",
  },
  2006: {
    code: 2006,
    name: "ConstraintSeeds",
    description: "A seeds constraint was violated",
  },
  2007: {
    code: 2007,
    name: "ConstraintExecutable",
    description: "An executable constraint was violated",
  },
  2008: {
    code: 2008,
    name: "ConstraintState",
    description: "Deprecated error, no longer used",
  },
  2009: {
    code: 2009,
    name: "ConstraintAssociated",
    description: "An associated constraint was violated",
  },
  2010: {
    code: 2010,
    name: "ConstraintAssociatedInit",
    description: "An associated init constraint was violated",
  },
  2011: {
    code: 2011,
    name: "ConstraintClose",
    description: "A close constraint was violated",
  },
  2012: {
    code: 2012,
    name: "ConstraintAddress",
    description: "An address constraint was violated",
  },
  2013: {
    code: 2013,
    name: "ConstraintZero",
    description: "Expected zero account discriminant",
  },
  2014: {
    code: 2014,
    name: "ConstraintTokenMint",
    description: "A token mint constraint was violated",
  },
  2015: {
    code: 2015,
    name: "ConstraintTokenOwner",
    description: "A token owner constraint was violated",
  },
  2016: {
    code: 2016,
    name: "ConstraintMintMintAuthority",
    description: "A mint mint authority constraint was violated",
  },
  2017: {
    code: 2017,
    name: "ConstraintMintFreezeAuthority",
    description: "A mint freeze authority constraint was violated",
  },
  2018: {
    code: 2018,
    name: "ConstraintMintDecimals",
    description: "A mint decimals constraint was violated",
  },
  2019: {
    code: 2019,
    name: "ConstraintSpace",
    description: "A space constraint was violated",
  },
  2020: {
    code: 2020,
    name: "ConstraintAccountIsNone",
    description: "A required account for the constraint is None",
  },
  2021: {
    code: 2021,
    name: "ConstraintTokenTokenProgram",
    description: "A token account token program constraint was violated",
  },
  2022: {
    code: 2022,
    name: "ConstraintMintTokenProgram",
    description: "A mint token program constraint was violated",
  },
  2023: {
    code: 2023,
    name: "ConstraintAssociatedTokenTokenProgram",
    description: "An associated token token program constraint was violated",
  },
  2024: {
    code: 2024,
    name: "ConstraintMintGroupPointerExtension",
    description: "A mint group pointer extension constraint was violated",
  },
  2025: {
    code: 2025,
    name: "ConstraintMintGroupPointerExtensionAuthority",
    description:
      "A mint group pointer extension authority constraint was violated",
  },
  2026: {
    code: 2026,
    name: "ConstraintMintGroupPointerExtensionGroupAddress",
    description:
      "A mint group pointer extension group address constraint was violated",
  },
  2027: {
    code: 2027,
    name: "ConstraintMintGroupMemberPointerExtension",
    description:
      "A mint group member pointer extension constraint was violated",
  },
  2028: {
    code: 2028,
    name: "ConstraintMintGroupMemberPointerExtensionAuthority",
    description:
      "A mint group member pointer extension authority constraint was violated",
  },
  2029: {
    code: 2029,
    name: "ConstraintMintGroupMemberPointerExtensionMemberAddress",
    description:
      "A mint group member pointer extension member address constraint was violated",
  },
  2030: {
    code: 2030,
    name: "ConstraintMintMetadataPointerExtension",
    description: "A mint metadata pointer extension constraint was violated",
  },
  2031: {
    code: 2031,
    name: "ConstraintMintMetadataPointerExtensionAuthority",
    description:
      "A mint metadata pointer extension authority constraint was violated",
  },
  2032: {
    code: 2032,
    name: "ConstraintMintMetadataPointerExtensionMetadataAddress",
    description:
      "A mint metadata pointer extension metadata address constraint was violated",
  },
  2033: {
    code: 2033,
    name: "ConstraintMintCloseAuthorityExtension",
    description: "A mint close authority extension constraint was violated",
  },
  2034: {
    code: 2034,
    name: "ConstraintMintCloseAuthorityExtensionAuthority",
    description:
      "A mint close authority extension authority constraint was violated",
  },
  2035: {
    code: 2035,
    name: "ConstraintMintPermanentDelegateExtension",
    description: "A mint permanent delegate extension constraint was violated",
  },
  2036: {
    code: 2036,
    name: "ConstraintMintPermanentDelegateExtensionDelegate",
    description:
      "A mint permanent delegate extension delegate constraint was violated",
  },
  2037: {
    code: 2037,
    name: "ConstraintMintTransferHookExtension",
    description: "A mint transfer hook extension constraint was violated",
  },
  2038: {
    code: 2038,
    name: "ConstraintMintTransferHookExtensionAuthority",
    description:
      "A mint transfer hook extension authority constraint was violated",
  },
  2039: {
    code: 2039,
    name: "ConstraintMintTransferHookExtensionProgramId",
    description:
      "A mint transfer hook extension program id constraint was violated",
  },

  // ============================================================================
  // Require Errors (2500-2506)
  // ============================================================================
  2500: {
    code: 2500,
    name: "RequireViolated",
    description: "A require expression was violated",
  },
  2501: {
    code: 2501,
    name: "RequireEqViolated",
    description: "A require_eq expression was violated",
  },
  2502: {
    code: 2502,
    name: "RequireKeysEqViolated",
    description: "A require_keys_eq expression was violated",
  },
  2503: {
    code: 2503,
    name: "RequireNeqViolated",
    description: "A require_neq expression was violated",
  },
  2504: {
    code: 2504,
    name: "RequireKeysNeqViolated",
    description: "A require_keys_neq expression was violated",
  },
  2505: {
    code: 2505,
    name: "RequireGtViolated",
    description: "A require_gt expression was violated",
  },
  2506: {
    code: 2506,
    name: "RequireGteViolated",
    description: "A require_gte expression was violated",
  },

  // ============================================================================
  // Account Errors (3000-3017)
  // ============================================================================
  3000: {
    code: 3000,
    name: "AccountDiscriminatorAlreadySet",
    description: "The account discriminator was already set on this account",
  },
  3001: {
    code: 3001,
    name: "AccountDiscriminatorNotFound",
    description: "No 8 byte discriminator was found on the account",
  },
  3002: {
    code: 3002,
    name: "AccountDiscriminatorMismatch",
    description: "8 byte discriminator did not match what was expected",
  },
  3003: {
    code: 3003,
    name: "AccountDidNotDeserialize",
    description: "Failed to deserialize the account",
  },
  3004: {
    code: 3004,
    name: "AccountDidNotSerialize",
    description: "Failed to serialize the account",
  },
  3005: {
    code: 3005,
    name: "AccountNotEnoughKeys",
    description: "Not enough account keys given to the instruction",
  },
  3006: {
    code: 3006,
    name: "AccountNotMutable",
    description: "The given account is not mutable",
  },
  3007: {
    code: 3007,
    name: "AccountOwnedByWrongProgram",
    description:
      "The given account is owned by a different program than expected",
  },
  3008: {
    code: 3008,
    name: "InvalidProgramId",
    description: "Program ID was not as expected",
  },
  3009: {
    code: 3009,
    name: "InvalidProgramExecutable",
    description: "Program account is not executable",
  },
  3010: {
    code: 3010,
    name: "AccountNotSigner",
    description: "The given account did not sign",
  },
  3011: {
    code: 3011,
    name: "AccountNotSystemOwned",
    description: "The given account is not owned by the system program",
  },
  3012: {
    code: 3012,
    name: "AccountNotInitialized",
    description: "The program expected this account to be already initialized",
  },
  3013: {
    code: 3013,
    name: "AccountNotProgramData",
    description: "The given account is not a program data account",
  },
  3014: {
    code: 3014,
    name: "AccountNotAssociatedTokenAccount",
    description: "The given account is not the associated token account",
  },
  3015: {
    code: 3015,
    name: "AccountSysvarMismatch",
    description: "The given public key does not match the required sysvar",
  },
  3016: {
    code: 3016,
    name: "AccountReallocExceedsLimit",
    description:
      "The account reallocation exceeds the MAX_PERMITTED_DATA_INCREASE limit",
  },
  3017: {
    code: 3017,
    name: "AccountDuplicateReallocs",
    description: "The account was duplicated for more than one reallocation",
  },

  // ============================================================================
  // Miscellaneous Errors (4100-4102, 5000)
  // ============================================================================
  4100: {
    code: 4100,
    name: "DeclaredProgramIdMismatch",
    description: "The declared program id does not match the actual program id",
  },
  4101: {
    code: 4101,
    name: "Deprecated",
    description:
      "The API being used is deprecated and should no longer be used",
  },
  4102: {
    code: 4102,
    name: "ZeroCopyTypeMismatch",
    description: "The given account is not zero-copy initialized",
  },

  5000: {
    code: 5000,
    name: "TryingToInitPayerAsProgramAccount",
    description: "Trying to initialize the payer as a program account",
  },
};
