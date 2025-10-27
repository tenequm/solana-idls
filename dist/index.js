"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Protocol: () => Protocol,
  registry: () => registry
});
module.exports = __toCommonJS(index_exports);

// src/core/builder.ts
function isValidIdl(value) {
  return typeof value === "object" && value !== null && (!("errors" in value) || Array.isArray(value.errors));
}
function isSolanaProgramIdl(value) {
  return typeof value === "object" && value !== null && "program" in value && typeof value.program === "object" && value.program !== null;
}
function extractFromIdl(idl) {
  if (isSolanaProgramIdl(idl)) {
    const programIdl = idl.program;
    if ("errors" in programIdl && Array.isArray(programIdl.errors)) {
      return programIdl.errors;
    }
  }
  if (isValidIdl(idl)) {
    return idl.errors ?? [];
  }
  return [];
}
function toErrorInfo(idlError) {
  return {
    code: idlError.code,
    name: idlError.name,
    description: idlError.message || idlError.msg || "",
    // Support both formats
    ...idlError.docs && { docs: idlError.docs }
    // Preserve docs when available
  };
}
function buildProtocolErrors(idl) {
  const idlErrors = extractFromIdl(idl);
  const result = {};
  for (const idlError of idlErrors) {
    const error = toErrorInfo(idlError);
    result[error.code] = Object.freeze(error);
  }
  return Object.freeze(result);
}

// src/core/protocol.ts
var Protocol = class {
  name;
  programId;
  version;
  errors;
  metadata;
  constructor(config) {
    this.name = config.name;
    this.programId = config.programId;
    this.version = config.version;
    this.errors = config.errors;
    this.metadata = {
      name: config.name,
      programId: config.programId,
      version: config.version,
      ...config.idlSource && { idlSource: config.idlSource },
      lastVerified: config.lastVerified
    };
  }
  /**
   * Get error by code (without source metadata)
   * Source is added by registry during resolution
   */
  getError(code) {
    return this.errors[code] ?? null;
  }
  /**
   * Get all errors for this protocol (without source metadata)
   */
  getAllErrors() {
    return Object.values(this.errors);
  }
  /**
   * Get protocol metadata
   */
  getMetadata() {
    return this.metadata;
  }
  /**
   * Get error count
   */
  getErrorCount() {
    return Object.keys(this.errors).length;
  }
  /**
   * Check if protocol has a specific error code
   */
  hasError(code) {
    return code in this.errors;
  }
  /**
   * Search errors by name or description (without source metadata)
   */
  searchErrors(query) {
    const lowerQuery = query.toLowerCase();
    return Object.values(this.errors).filter(
      (error) => error.name.toLowerCase().includes(lowerQuery) || error.description.toLowerCase().includes(lowerQuery)
    );
  }
};

// src/core/registry.ts
var ProtocolRegistry = class {
  protocols = /* @__PURE__ */ new Map();
  programIdIndex = /* @__PURE__ */ new Map();
  frameworkProtocol = null;
  /**
   * Register a protocol in the registry
   */
  register(protocol) {
    this.protocols.set(protocol.name, protocol);
    this.programIdIndex.set(protocol.programId, protocol);
  }
  /**
   * Register a framework protocol that provides fallback error resolution
   * Framework protocols (like Anchor) apply to any program and are checked
   * after program-specific lookups fail
   */
  registerFramework(protocol) {
    this.frameworkProtocol = protocol;
    this.protocols.set(protocol.name, protocol);
  }
  /**
   * Resolve error by program ID and error code
   * Uses hierarchical resolution:
   * 1. Program-specific lookup (Jupiter, Orca, SPL Token, etc.)
   * 2. Framework fallback (Anchor errors)
   *
   * Enriches errors with source metadata for transparency
   */
  resolve(programId, code) {
    const protocol = this.programIdIndex.get(programId);
    if (protocol) {
      const error = protocol.getError(code);
      if (error) {
        const metadata = protocol.getMetadata();
        if (metadata.name === "SPL Token Program" || metadata.name === "Token-2022 Program") {
          return {
            ...error,
            source: {
              type: "token-program",
              programId,
              programName: metadata.name
            }
          };
        }
        return {
          ...error,
          source: {
            type: "program-specific",
            programId,
            programName: metadata.name
          }
        };
      }
    }
    if (this.frameworkProtocol) {
      const frameworkError = this.frameworkProtocol.getError(code);
      if (frameworkError) {
        return {
          ...frameworkError,
          source: {
            type: "anchor-framework",
            programId
          }
        };
      }
    }
    return null;
  }
  /**
   * Get protocol by name
   */
  getByName(name) {
    return this.protocols.get(name) ?? null;
  }
  /**
   * Get protocol by program ID
   */
  getByProgramId(programId) {
    return this.programIdIndex.get(programId) ?? null;
  }
  /**
   * List all registered protocols
   */
  listAll() {
    return Array.from(this.protocols.values());
  }
  /**
   * Get all protocol metadata
   */
  listMetadata() {
    return Array.from(this.protocols.values()).map((p) => p.getMetadata());
  }
  /**
   * Search errors across all protocols (returns errors without source metadata)
   */
  search(query) {
    const results = [];
    for (const protocol of this.protocols.values()) {
      const errors = protocol.searchErrors(query);
      for (const error of errors) {
        results.push({ protocol, error });
      }
    }
    return results;
  }
  /**
   * Get total error count across all protocols
   */
  getTotalErrorCount() {
    return Array.from(this.protocols.values()).reduce(
      (sum, p) => sum + p.getErrorCount(),
      0
    );
  }
  /**
   * Clear all registered protocols (useful for testing)
   */
  clear() {
    this.protocols.clear();
    this.programIdIndex.clear();
  }
};
var registry = new ProtocolRegistry();

// src/protocols.config.ts
var PROTOCOLS = [
  // ============================================================================
  // Jupiter Aggregator
  // ============================================================================
  {
    idlFileName: "jupiter",
    programId: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    fetchSource: "github",
    githubUrl: "https://raw.githubusercontent.com/jup-ag/jupiter-cpi-swap-example/b0c59b7ac537c47e9502391d83f8926ffffa412e/cpi-swap-program/idls/jupiter_aggregator.json",
    displayName: "Jupiter Aggregator v6",
    version: "0.1.0"
  },
  // ============================================================================
  // Orca Whirlpools
  // ============================================================================
  {
    idlFileName: "orca-whirlpools",
    programId: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    fetchSource: "anchor",
    displayName: "Orca Whirlpools",
    version: "1.0.0"
  },
  // ============================================================================
  // Raydium DEX Protocols
  // ============================================================================
  {
    idlFileName: "raydium-amm",
    programId: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    fetchSource: "github",
    githubUrl: "https://raw.githubusercontent.com/raydium-io/raydium-idl/refs/heads/master/raydium_amm/idl.json",
    displayName: "Raydium AMM V4",
    version: "0.1.0",
    notes: "Traditional constant product AMM"
  },
  {
    idlFileName: "raydium-amm-v3",
    programId: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
    fetchSource: "github",
    githubUrl: "https://raw.githubusercontent.com/raydium-io/raydium-idl/refs/heads/master/raydium_clmm/amm_v3.json",
    displayName: "Raydium AMM V3 (CLMM)",
    version: "0.1.0",
    notes: "Concentrated liquidity market maker"
  },
  {
    idlFileName: "raydium-cp-swap",
    programId: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
    fetchSource: "github",
    githubUrl: "https://raw.githubusercontent.com/raydium-io/raydium-idl/refs/heads/master/raydium_cpmm/raydium_cp_swap.json",
    displayName: "Raydium CP Swap",
    version: "0.1.0",
    notes: "Constant product swap"
  },
  // ============================================================================
  // TON Whales Holders
  // ============================================================================
  {
    idlFileName: "ton-whales-holders",
    programId: "6bES2dKy1ee13HQ4uW4ycw4Kw4od9ziZeWMyAxVySYEd",
    fetchSource: "anchor",
    displayName: "TON Whales Holders",
    version: "1.0.0",
    notes: "TON whales holders program, 27 errors"
  },
  // ============================================================================
  // NFT Marketplaces
  // ============================================================================
  {
    idlFileName: "magic-eden-v2",
    programId: "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K",
    fetchSource: "anchor",
    displayName: "Magic Eden V2",
    version: "2.0.0",
    notes: "Leading Solana NFT marketplace"
  },
  {
    idlFileName: "tensor",
    programId: "TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN",
    fetchSource: "anchor",
    displayName: "Tensor",
    version: "1.0.0",
    notes: "NFT marketplace and AMM"
  },
  {
    idlFileName: "metaplex-auction-house",
    programId: "hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk",
    fetchSource: "anchor",
    displayName: "Metaplex Auction House",
    version: "1.0.0",
    notes: "Metaplex NFT marketplace protocol"
  },
  // ============================================================================
  // Framework Errors
  // ============================================================================
  {
    idlFileName: "anchor",
    programId: "*",
    type: "framework",
    fetchSource: "manual",
    displayName: "Anchor Framework",
    version: "0.30.1",
    notes: "Framework errors that apply to any Anchor program"
  },
  // ============================================================================
  // Token Programs
  // ============================================================================
  {
    idlFileName: "spl-token",
    programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    type: "token-program",
    fetchSource: "github",
    githubUrl: "https://raw.githubusercontent.com/solana-program/token/refs/heads/main/program/idl.json",
    displayName: "SPL Token Program",
    version: "1.0.0",
    notes: "Native Solana token standard"
  },
  {
    idlFileName: "token-2022",
    programId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    type: "token-program",
    fetchSource: "github",
    githubUrl: "https://raw.githubusercontent.com/solana-program/token-2022/refs/heads/main/interface/idl.json",
    displayName: "Token-2022 Program",
    version: "1.0.0",
    notes: "Extended token program with additional features"
  }
];

// src/protocols/manual/anchor.ts
var ANCHOR_ERRORS = {
  // ============================================================================
  // Instruction Errors (100-103)
  // ============================================================================
  100: {
    code: 100,
    name: "InstructionMissing",
    description: "8 byte instruction identifier not provided"
  },
  101: {
    code: 101,
    name: "InstructionFallbackNotFound",
    description: "Fallback functions are not supported"
  },
  102: {
    code: 102,
    name: "InstructionDidNotDeserialize",
    description: "The program could not deserialize the given instruction"
  },
  103: {
    code: 103,
    name: "InstructionDidNotSerialize",
    description: "The program could not serialize the given instruction"
  },
  // ============================================================================
  // IDL Errors (1000-1002)
  // ============================================================================
  1e3: {
    code: 1e3,
    name: "IdlInstructionStub",
    description: "The program was compiled without idl instructions"
  },
  1001: {
    code: 1001,
    name: "IdlInstructionInvalidProgram",
    description: "Invalid program given to the IDL instruction"
  },
  1002: {
    code: 1002,
    name: "IdlAccountNotEmpty",
    description: "IDL account must be empty in order to resize"
  },
  // ============================================================================
  // Event Errors (1500)
  // ============================================================================
  1500: {
    code: 1500,
    name: "EventInstructionStub",
    description: "The program was compiled without `event-cpi` feature"
  },
  // ============================================================================
  // Constraint Errors (2000-2039)
  // ============================================================================
  2e3: {
    code: 2e3,
    name: "ConstraintMut",
    description: "A mut constraint was violated"
  },
  2001: {
    code: 2001,
    name: "ConstraintHasOne",
    description: "A has_one constraint was violated"
  },
  2002: {
    code: 2002,
    name: "ConstraintSigner",
    description: "A signer constraint was violated"
  },
  2003: {
    code: 2003,
    name: "ConstraintRaw",
    description: "A raw constraint was violated"
  },
  2004: {
    code: 2004,
    name: "ConstraintOwner",
    description: "An owner constraint was violated"
  },
  2005: {
    code: 2005,
    name: "ConstraintRentExempt",
    description: "A rent exemption constraint was violated"
  },
  2006: {
    code: 2006,
    name: "ConstraintSeeds",
    description: "A seeds constraint was violated"
  },
  2007: {
    code: 2007,
    name: "ConstraintExecutable",
    description: "An executable constraint was violated"
  },
  2008: {
    code: 2008,
    name: "ConstraintState",
    description: "Deprecated error, no longer used"
  },
  2009: {
    code: 2009,
    name: "ConstraintAssociated",
    description: "An associated constraint was violated"
  },
  2010: {
    code: 2010,
    name: "ConstraintAssociatedInit",
    description: "An associated init constraint was violated"
  },
  2011: {
    code: 2011,
    name: "ConstraintClose",
    description: "A close constraint was violated"
  },
  2012: {
    code: 2012,
    name: "ConstraintAddress",
    description: "An address constraint was violated"
  },
  2013: {
    code: 2013,
    name: "ConstraintZero",
    description: "Expected zero account discriminant"
  },
  2014: {
    code: 2014,
    name: "ConstraintTokenMint",
    description: "A token mint constraint was violated"
  },
  2015: {
    code: 2015,
    name: "ConstraintTokenOwner",
    description: "A token owner constraint was violated"
  },
  2016: {
    code: 2016,
    name: "ConstraintMintMintAuthority",
    description: "A mint mint authority constraint was violated"
  },
  2017: {
    code: 2017,
    name: "ConstraintMintFreezeAuthority",
    description: "A mint freeze authority constraint was violated"
  },
  2018: {
    code: 2018,
    name: "ConstraintMintDecimals",
    description: "A mint decimals constraint was violated"
  },
  2019: {
    code: 2019,
    name: "ConstraintSpace",
    description: "A space constraint was violated"
  },
  2020: {
    code: 2020,
    name: "ConstraintAccountIsNone",
    description: "A required account for the constraint is None"
  },
  2021: {
    code: 2021,
    name: "ConstraintTokenTokenProgram",
    description: "A token account token program constraint was violated"
  },
  2022: {
    code: 2022,
    name: "ConstraintMintTokenProgram",
    description: "A mint token program constraint was violated"
  },
  2023: {
    code: 2023,
    name: "ConstraintAssociatedTokenTokenProgram",
    description: "An associated token token program constraint was violated"
  },
  2024: {
    code: 2024,
    name: "ConstraintMintGroupPointerExtension",
    description: "A mint group pointer extension constraint was violated"
  },
  2025: {
    code: 2025,
    name: "ConstraintMintGroupPointerExtensionAuthority",
    description: "A mint group pointer extension authority constraint was violated"
  },
  2026: {
    code: 2026,
    name: "ConstraintMintGroupPointerExtensionGroupAddress",
    description: "A mint group pointer extension group address constraint was violated"
  },
  2027: {
    code: 2027,
    name: "ConstraintMintGroupMemberPointerExtension",
    description: "A mint group member pointer extension constraint was violated"
  },
  2028: {
    code: 2028,
    name: "ConstraintMintGroupMemberPointerExtensionAuthority",
    description: "A mint group member pointer extension authority constraint was violated"
  },
  2029: {
    code: 2029,
    name: "ConstraintMintGroupMemberPointerExtensionMemberAddress",
    description: "A mint group member pointer extension member address constraint was violated"
  },
  2030: {
    code: 2030,
    name: "ConstraintMintMetadataPointerExtension",
    description: "A mint metadata pointer extension constraint was violated"
  },
  2031: {
    code: 2031,
    name: "ConstraintMintMetadataPointerExtensionAuthority",
    description: "A mint metadata pointer extension authority constraint was violated"
  },
  2032: {
    code: 2032,
    name: "ConstraintMintMetadataPointerExtensionMetadataAddress",
    description: "A mint metadata pointer extension metadata address constraint was violated"
  },
  2033: {
    code: 2033,
    name: "ConstraintMintCloseAuthorityExtension",
    description: "A mint close authority extension constraint was violated"
  },
  2034: {
    code: 2034,
    name: "ConstraintMintCloseAuthorityExtensionAuthority",
    description: "A mint close authority extension authority constraint was violated"
  },
  2035: {
    code: 2035,
    name: "ConstraintMintPermanentDelegateExtension",
    description: "A mint permanent delegate extension constraint was violated"
  },
  2036: {
    code: 2036,
    name: "ConstraintMintPermanentDelegateExtensionDelegate",
    description: "A mint permanent delegate extension delegate constraint was violated"
  },
  2037: {
    code: 2037,
    name: "ConstraintMintTransferHookExtension",
    description: "A mint transfer hook extension constraint was violated"
  },
  2038: {
    code: 2038,
    name: "ConstraintMintTransferHookExtensionAuthority",
    description: "A mint transfer hook extension authority constraint was violated"
  },
  2039: {
    code: 2039,
    name: "ConstraintMintTransferHookExtensionProgramId",
    description: "A mint transfer hook extension program id constraint was violated"
  },
  // ============================================================================
  // Require Errors (2500-2506)
  // ============================================================================
  2500: {
    code: 2500,
    name: "RequireViolated",
    description: "A require expression was violated"
  },
  2501: {
    code: 2501,
    name: "RequireEqViolated",
    description: "A require_eq expression was violated"
  },
  2502: {
    code: 2502,
    name: "RequireKeysEqViolated",
    description: "A require_keys_eq expression was violated"
  },
  2503: {
    code: 2503,
    name: "RequireNeqViolated",
    description: "A require_neq expression was violated"
  },
  2504: {
    code: 2504,
    name: "RequireKeysNeqViolated",
    description: "A require_keys_neq expression was violated"
  },
  2505: {
    code: 2505,
    name: "RequireGtViolated",
    description: "A require_gt expression was violated"
  },
  2506: {
    code: 2506,
    name: "RequireGteViolated",
    description: "A require_gte expression was violated"
  },
  // ============================================================================
  // Account Errors (3000-3017)
  // ============================================================================
  3e3: {
    code: 3e3,
    name: "AccountDiscriminatorAlreadySet",
    description: "The account discriminator was already set on this account"
  },
  3001: {
    code: 3001,
    name: "AccountDiscriminatorNotFound",
    description: "No 8 byte discriminator was found on the account"
  },
  3002: {
    code: 3002,
    name: "AccountDiscriminatorMismatch",
    description: "8 byte discriminator did not match what was expected"
  },
  3003: {
    code: 3003,
    name: "AccountDidNotDeserialize",
    description: "Failed to deserialize the account"
  },
  3004: {
    code: 3004,
    name: "AccountDidNotSerialize",
    description: "Failed to serialize the account"
  },
  3005: {
    code: 3005,
    name: "AccountNotEnoughKeys",
    description: "Not enough account keys given to the instruction"
  },
  3006: {
    code: 3006,
    name: "AccountNotMutable",
    description: "The given account is not mutable"
  },
  3007: {
    code: 3007,
    name: "AccountOwnedByWrongProgram",
    description: "The given account is owned by a different program than expected"
  },
  3008: {
    code: 3008,
    name: "InvalidProgramId",
    description: "Program ID was not as expected"
  },
  3009: {
    code: 3009,
    name: "InvalidProgramExecutable",
    description: "Program account is not executable"
  },
  3010: {
    code: 3010,
    name: "AccountNotSigner",
    description: "The given account did not sign"
  },
  3011: {
    code: 3011,
    name: "AccountNotSystemOwned",
    description: "The given account is not owned by the system program"
  },
  3012: {
    code: 3012,
    name: "AccountNotInitialized",
    description: "The program expected this account to be already initialized"
  },
  3013: {
    code: 3013,
    name: "AccountNotProgramData",
    description: "The given account is not a program data account"
  },
  3014: {
    code: 3014,
    name: "AccountNotAssociatedTokenAccount",
    description: "The given account is not the associated token account"
  },
  3015: {
    code: 3015,
    name: "AccountSysvarMismatch",
    description: "The given public key does not match the required sysvar"
  },
  3016: {
    code: 3016,
    name: "AccountReallocExceedsLimit",
    description: "The account reallocation exceeds the MAX_PERMITTED_DATA_INCREASE limit"
  },
  3017: {
    code: 3017,
    name: "AccountDuplicateReallocs",
    description: "The account was duplicated for more than one reallocation"
  },
  // ============================================================================
  // Miscellaneous Errors (4100-4102, 5000)
  // ============================================================================
  4100: {
    code: 4100,
    name: "DeclaredProgramIdMismatch",
    description: "The declared program id does not match the actual program id"
  },
  4101: {
    code: 4101,
    name: "Deprecated",
    description: "The API being used is deprecated and should no longer be used"
  },
  4102: {
    code: 4102,
    name: "ZeroCopyTypeMismatch",
    description: "The given account is not zero-copy initialized"
  },
  5e3: {
    code: 5e3,
    name: "TryingToInitPayerAsProgramAccount",
    description: "Trying to initialize the payer as a program account"
  }
};

// idl/jupiter.json
var jupiter_default = {
  address: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
  metadata: {
    name: "jupiter",
    version: "0.1.0",
    spec: "0.1.0"
  },
  instructions: [
    {
      name: "route",
      docs: ["route_plan Topologically sorted trade DAG"],
      discriminator: [229, 23, 203, 151, 122, 227, 173, 42],
      accounts: [
        {
          name: "token_program"
        },
        {
          name: "user_transfer_authority",
          signer: true
        },
        {
          name: "user_source_token_account",
          writable: true
        },
        {
          name: "user_destination_token_account",
          writable: true
        },
        {
          name: "destination_token_account",
          writable: true,
          optional: true
        },
        {
          name: "destination_mint"
        },
        {
          name: "platform_fee_account",
          writable: true,
          optional: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "route_plan",
          type: {
            vec: {
              defined: {
                name: "RoutePlanStep"
              }
            }
          }
        },
        {
          name: "in_amount",
          type: "u64"
        },
        {
          name: "quoted_out_amount",
          type: "u64"
        },
        {
          name: "slippage_bps",
          type: "u16"
        },
        {
          name: "platform_fee_bps",
          type: "u8"
        }
      ],
      returns: "u64"
    },
    {
      name: "route_with_token_ledger",
      discriminator: [150, 86, 71, 116, 167, 93, 14, 104],
      accounts: [
        {
          name: "token_program"
        },
        {
          name: "user_transfer_authority",
          signer: true
        },
        {
          name: "user_source_token_account",
          writable: true
        },
        {
          name: "user_destination_token_account",
          writable: true
        },
        {
          name: "destination_token_account",
          writable: true,
          optional: true
        },
        {
          name: "destination_mint"
        },
        {
          name: "platform_fee_account",
          writable: true,
          optional: true
        },
        {
          name: "token_ledger"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "route_plan",
          type: {
            vec: {
              defined: {
                name: "RoutePlanStep"
              }
            }
          }
        },
        {
          name: "quoted_out_amount",
          type: "u64"
        },
        {
          name: "slippage_bps",
          type: "u16"
        },
        {
          name: "platform_fee_bps",
          type: "u8"
        }
      ],
      returns: "u64"
    },
    {
      name: "exact_out_route",
      discriminator: [208, 51, 239, 151, 123, 43, 237, 92],
      accounts: [
        {
          name: "token_program"
        },
        {
          name: "user_transfer_authority",
          signer: true
        },
        {
          name: "user_source_token_account",
          writable: true
        },
        {
          name: "user_destination_token_account",
          writable: true
        },
        {
          name: "destination_token_account",
          writable: true,
          optional: true
        },
        {
          name: "source_mint"
        },
        {
          name: "destination_mint"
        },
        {
          name: "platform_fee_account",
          writable: true,
          optional: true
        },
        {
          name: "token2022_program",
          optional: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "route_plan",
          type: {
            vec: {
              defined: {
                name: "RoutePlanStep"
              }
            }
          }
        },
        {
          name: "out_amount",
          type: "u64"
        },
        {
          name: "quoted_in_amount",
          type: "u64"
        },
        {
          name: "slippage_bps",
          type: "u16"
        },
        {
          name: "platform_fee_bps",
          type: "u8"
        }
      ],
      returns: "u64"
    },
    {
      name: "shared_accounts_route",
      docs: [
        "Route by using program owned token accounts and open orders accounts."
      ],
      discriminator: [193, 32, 155, 51, 65, 214, 156, 129],
      accounts: [
        {
          name: "token_program"
        },
        {
          name: "program_authority"
        },
        {
          name: "user_transfer_authority",
          signer: true
        },
        {
          name: "source_token_account",
          writable: true
        },
        {
          name: "program_source_token_account",
          writable: true
        },
        {
          name: "program_destination_token_account",
          writable: true
        },
        {
          name: "destination_token_account",
          writable: true
        },
        {
          name: "source_mint"
        },
        {
          name: "destination_mint"
        },
        {
          name: "platform_fee_account",
          writable: true,
          optional: true
        },
        {
          name: "token2022_program",
          optional: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "id",
          type: "u8"
        },
        {
          name: "route_plan",
          type: {
            vec: {
              defined: {
                name: "RoutePlanStep"
              }
            }
          }
        },
        {
          name: "in_amount",
          type: "u64"
        },
        {
          name: "quoted_out_amount",
          type: "u64"
        },
        {
          name: "slippage_bps",
          type: "u16"
        },
        {
          name: "platform_fee_bps",
          type: "u8"
        }
      ],
      returns: "u64"
    },
    {
      name: "shared_accounts_route_with_token_ledger",
      discriminator: [230, 121, 143, 80, 119, 159, 106, 170],
      accounts: [
        {
          name: "token_program"
        },
        {
          name: "program_authority"
        },
        {
          name: "user_transfer_authority",
          signer: true
        },
        {
          name: "source_token_account",
          writable: true
        },
        {
          name: "program_source_token_account",
          writable: true
        },
        {
          name: "program_destination_token_account",
          writable: true
        },
        {
          name: "destination_token_account",
          writable: true
        },
        {
          name: "source_mint"
        },
        {
          name: "destination_mint"
        },
        {
          name: "platform_fee_account",
          writable: true,
          optional: true
        },
        {
          name: "token2022_program",
          optional: true
        },
        {
          name: "token_ledger"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "id",
          type: "u8"
        },
        {
          name: "route_plan",
          type: {
            vec: {
              defined: {
                name: "RoutePlanStep"
              }
            }
          }
        },
        {
          name: "quoted_out_amount",
          type: "u64"
        },
        {
          name: "slippage_bps",
          type: "u16"
        },
        {
          name: "platform_fee_bps",
          type: "u8"
        }
      ],
      returns: "u64"
    },
    {
      name: "shared_accounts_exact_out_route",
      docs: [
        "Route by using program owned token accounts and open orders accounts."
      ],
      discriminator: [176, 209, 105, 168, 154, 125, 69, 62],
      accounts: [
        {
          name: "token_program"
        },
        {
          name: "program_authority"
        },
        {
          name: "user_transfer_authority",
          signer: true
        },
        {
          name: "source_token_account",
          writable: true
        },
        {
          name: "program_source_token_account",
          writable: true
        },
        {
          name: "program_destination_token_account",
          writable: true
        },
        {
          name: "destination_token_account",
          writable: true
        },
        {
          name: "source_mint"
        },
        {
          name: "destination_mint"
        },
        {
          name: "platform_fee_account",
          writable: true,
          optional: true
        },
        {
          name: "token2022_program",
          optional: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "id",
          type: "u8"
        },
        {
          name: "route_plan",
          type: {
            vec: {
              defined: {
                name: "RoutePlanStep"
              }
            }
          }
        },
        {
          name: "out_amount",
          type: "u64"
        },
        {
          name: "quoted_in_amount",
          type: "u64"
        },
        {
          name: "slippage_bps",
          type: "u16"
        },
        {
          name: "platform_fee_bps",
          type: "u8"
        }
      ],
      returns: "u64"
    },
    {
      name: "set_token_ledger",
      discriminator: [228, 85, 185, 112, 78, 79, 77, 2],
      accounts: [
        {
          name: "token_ledger",
          writable: true
        },
        {
          name: "token_account"
        }
      ],
      args: []
    },
    {
      name: "create_open_orders",
      discriminator: [229, 194, 212, 172, 8, 10, 134, 147],
      accounts: [
        {
          name: "open_orders",
          writable: true
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "dex_program"
        },
        {
          name: "system_program"
        },
        {
          name: "rent"
        },
        {
          name: "market"
        }
      ],
      args: []
    },
    {
      name: "create_token_account",
      discriminator: [147, 241, 123, 100, 244, 132, 174, 118],
      accounts: [
        {
          name: "token_account",
          writable: true
        },
        {
          name: "user",
          writable: true,
          signer: true
        },
        {
          name: "mint"
        },
        {
          name: "token_program"
        },
        {
          name: "system_program"
        }
      ],
      args: [
        {
          name: "bump",
          type: "u8"
        }
      ]
    },
    {
      name: "create_program_open_orders",
      discriminator: [28, 226, 32, 148, 188, 136, 113, 171],
      accounts: [
        {
          name: "open_orders",
          writable: true
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "program_authority"
        },
        {
          name: "dex_program"
        },
        {
          name: "system_program"
        },
        {
          name: "rent"
        },
        {
          name: "market"
        }
      ],
      args: [
        {
          name: "id",
          type: "u8"
        }
      ]
    },
    {
      name: "claim",
      discriminator: [62, 198, 214, 193, 213, 159, 108, 210],
      accounts: [
        {
          name: "wallet",
          writable: true
        },
        {
          name: "program_authority",
          writable: true
        },
        {
          name: "system_program"
        }
      ],
      args: [
        {
          name: "id",
          type: "u8"
        }
      ],
      returns: "u64"
    },
    {
      name: "claim_token",
      discriminator: [116, 206, 27, 191, 166, 19, 0, 73],
      accounts: [
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "wallet"
        },
        {
          name: "program_authority"
        },
        {
          name: "program_token_account",
          writable: true
        },
        {
          name: "destination_token_account",
          writable: true
        },
        {
          name: "mint"
        },
        {
          name: "associated_token_token_program"
        },
        {
          name: "associated_token_program"
        },
        {
          name: "system_program"
        }
      ],
      args: [
        {
          name: "id",
          type: "u8"
        }
      ],
      returns: "u64"
    },
    {
      name: "create_token_ledger",
      discriminator: [232, 242, 197, 253, 240, 143, 129, 52],
      accounts: [
        {
          name: "token_ledger",
          writable: true,
          signer: true
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "system_program"
        }
      ],
      args: []
    }
  ],
  accounts: [
    {
      name: "TokenLedger",
      discriminator: [156, 247, 9, 188, 54, 108, 85, 77]
    }
  ],
  events: [
    {
      name: "SwapEvent",
      discriminator: [64, 198, 205, 232, 38, 8, 113, 226]
    },
    {
      name: "FeeEvent",
      discriminator: [73, 79, 78, 127, 184, 213, 13, 220]
    }
  ],
  errors: [
    {
      code: 6e3,
      name: "EmptyRoute",
      msg: "Empty route"
    },
    {
      code: 6001,
      name: "SlippageToleranceExceeded",
      msg: "Slippage tolerance exceeded"
    },
    {
      code: 6002,
      name: "InvalidCalculation",
      msg: "Invalid calculation"
    },
    {
      code: 6003,
      name: "MissingPlatformFeeAccount",
      msg: "Missing platform fee account"
    },
    {
      code: 6004,
      name: "InvalidSlippage",
      msg: "Invalid slippage"
    },
    {
      code: 6005,
      name: "NotEnoughPercent",
      msg: "Not enough percent to 100"
    },
    {
      code: 6006,
      name: "InvalidInputIndex",
      msg: "Token input index is invalid"
    },
    {
      code: 6007,
      name: "InvalidOutputIndex",
      msg: "Token output index is invalid"
    },
    {
      code: 6008,
      name: "NotEnoughAccountKeys",
      msg: "Not Enough Account keys"
    },
    {
      code: 6009,
      name: "NonZeroMinimumOutAmountNotSupported",
      msg: "Non zero minimum out amount not supported"
    },
    {
      code: 6010,
      name: "InvalidRoutePlan",
      msg: "Invalid route plan"
    },
    {
      code: 6011,
      name: "InvalidReferralAuthority",
      msg: "Invalid referral authority"
    },
    {
      code: 6012,
      name: "LedgerTokenAccountDoesNotMatch",
      msg: "Token account doesn't match the ledger"
    },
    {
      code: 6013,
      name: "InvalidTokenLedger",
      msg: "Invalid token ledger"
    },
    {
      code: 6014,
      name: "IncorrectTokenProgramID",
      msg: "Token program ID is invalid"
    },
    {
      code: 6015,
      name: "TokenProgramNotProvided",
      msg: "Token program not provided"
    },
    {
      code: 6016,
      name: "SwapNotSupported",
      msg: "Swap not supported"
    },
    {
      code: 6017,
      name: "ExactOutAmountNotMatched",
      msg: "Exact out amount doesn't match"
    }
  ],
  types: [
    {
      name: "AmountWithSlippage",
      type: {
        kind: "struct",
        fields: [
          {
            name: "amount",
            type: "u64"
          },
          {
            name: "slippage_bps",
            type: "u16"
          }
        ]
      }
    },
    {
      name: "RoutePlanStep",
      type: {
        kind: "struct",
        fields: [
          {
            name: "swap",
            type: {
              defined: {
                name: "Swap"
              }
            }
          },
          {
            name: "percent",
            type: "u8"
          },
          {
            name: "input_index",
            type: "u8"
          },
          {
            name: "output_index",
            type: "u8"
          }
        ]
      }
    },
    {
      name: "Side",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Bid"
          },
          {
            name: "Ask"
          }
        ]
      }
    },
    {
      name: "Swap",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Saber"
          },
          {
            name: "SaberAddDecimalsDeposit"
          },
          {
            name: "SaberAddDecimalsWithdraw"
          },
          {
            name: "TokenSwap"
          },
          {
            name: "Sencha"
          },
          {
            name: "Step"
          },
          {
            name: "Cropper"
          },
          {
            name: "Raydium"
          },
          {
            name: "Crema",
            fields: [
              {
                name: "a_to_b",
                type: "bool"
              }
            ]
          },
          {
            name: "Lifinity"
          },
          {
            name: "Mercurial"
          },
          {
            name: "Cykura"
          },
          {
            name: "Serum",
            fields: [
              {
                name: "side",
                type: {
                  defined: {
                    name: "Side"
                  }
                }
              }
            ]
          },
          {
            name: "MarinadeDeposit"
          },
          {
            name: "MarinadeUnstake"
          },
          {
            name: "Aldrin",
            fields: [
              {
                name: "side",
                type: {
                  defined: {
                    name: "Side"
                  }
                }
              }
            ]
          },
          {
            name: "AldrinV2",
            fields: [
              {
                name: "side",
                type: {
                  defined: {
                    name: "Side"
                  }
                }
              }
            ]
          },
          {
            name: "Whirlpool",
            fields: [
              {
                name: "a_to_b",
                type: "bool"
              }
            ]
          },
          {
            name: "Invariant",
            fields: [
              {
                name: "x_to_y",
                type: "bool"
              }
            ]
          },
          {
            name: "Meteora"
          },
          {
            name: "GooseFX"
          },
          {
            name: "DeltaFi",
            fields: [
              {
                name: "stable",
                type: "bool"
              }
            ]
          },
          {
            name: "Balansol"
          },
          {
            name: "MarcoPolo",
            fields: [
              {
                name: "x_to_y",
                type: "bool"
              }
            ]
          },
          {
            name: "Dradex",
            fields: [
              {
                name: "side",
                type: {
                  defined: {
                    name: "Side"
                  }
                }
              }
            ]
          },
          {
            name: "LifinityV2"
          },
          {
            name: "RaydiumClmm"
          },
          {
            name: "Openbook",
            fields: [
              {
                name: "side",
                type: {
                  defined: {
                    name: "Side"
                  }
                }
              }
            ]
          },
          {
            name: "Phoenix",
            fields: [
              {
                name: "side",
                type: {
                  defined: {
                    name: "Side"
                  }
                }
              }
            ]
          },
          {
            name: "Symmetry",
            fields: [
              {
                name: "from_token_id",
                type: "u64"
              },
              {
                name: "to_token_id",
                type: "u64"
              }
            ]
          },
          {
            name: "TokenSwapV2"
          },
          {
            name: "HeliumTreasuryManagementRedeemV0"
          },
          {
            name: "StakeDexStakeWrappedSol"
          },
          {
            name: "StakeDexSwapViaStake",
            fields: [
              {
                name: "bridge_stake_seed",
                type: "u32"
              }
            ]
          },
          {
            name: "GooseFXV2"
          },
          {
            name: "Perps"
          },
          {
            name: "PerpsAddLiquidity"
          },
          {
            name: "PerpsRemoveLiquidity"
          },
          {
            name: "MeteoraDlmm"
          },
          {
            name: "OpenBookV2",
            fields: [
              {
                name: "side",
                type: {
                  defined: {
                    name: "Side"
                  }
                }
              }
            ]
          },
          {
            name: "RaydiumClmmV2"
          },
          {
            name: "Clone",
            fields: [
              {
                name: "pool_index",
                type: "u8"
              },
              {
                name: "quantity_is_input",
                type: "bool"
              },
              {
                name: "quantity_is_collateral",
                type: "bool"
              }
            ]
          },
          {
            name: "WhirlpoolSwapV2",
            fields: [
              {
                name: "a_to_b",
                type: "bool"
              },
              {
                name: "remaining_accounts_info",
                type: {
                  option: {
                    defined: {
                      name: "RemainingAccountsInfo"
                    }
                  }
                }
              }
            ]
          },
          {
            name: "OneIntro"
          },
          {
            name: "PumpdotfunWrappedBuy"
          },
          {
            name: "PumpdotfunWrappedSell"
          },
          {
            name: "PerpsV2"
          },
          {
            name: "PerpsV2AddLiquidity"
          },
          {
            name: "PerpsV2RemoveLiquidity"
          },
          {
            name: "MoonshotWrappedBuy"
          },
          {
            name: "MoonshotWrappedSell"
          },
          {
            name: "StabbleStableSwap"
          },
          {
            name: "StabbleWeightedSwap"
          },
          {
            name: "Obric",
            fields: [
              {
                name: "x_to_y",
                type: "bool"
              }
            ]
          },
          {
            name: "FoxBuyFromEstimatedCost"
          },
          {
            name: "FoxClaimPartial",
            fields: [
              {
                name: "is_y",
                type: "bool"
              }
            ]
          },
          {
            name: "SolFi",
            fields: [
              {
                name: "is_quote_to_base",
                type: "bool"
              }
            ]
          },
          {
            name: "SolayerDelegateNoInit"
          },
          {
            name: "SolayerUndelegateNoInit"
          },
          {
            name: "TokenMill",
            fields: [
              {
                name: "side",
                type: {
                  defined: {
                    name: "Side"
                  }
                }
              }
            ]
          },
          {
            name: "DaosFunBuy"
          },
          {
            name: "DaosFunSell"
          }
        ]
      }
    },
    {
      name: "RemainingAccountsSlice",
      type: {
        kind: "struct",
        fields: [
          {
            name: "accounts_type",
            type: {
              defined: {
                name: "AccountsType"
              }
            }
          },
          {
            name: "length",
            type: "u8"
          }
        ]
      }
    },
    {
      name: "RemainingAccountsInfo",
      type: {
        kind: "struct",
        fields: [
          {
            name: "slices",
            type: {
              vec: {
                defined: {
                  name: "RemainingAccountsSlice"
                }
              }
            }
          }
        ]
      }
    },
    {
      name: "AccountsType",
      type: {
        kind: "enum",
        variants: [
          {
            name: "TransferHookA"
          },
          {
            name: "TransferHookB"
          }
        ]
      }
    },
    {
      name: "TokenLedger",
      type: {
        kind: "struct",
        fields: [
          {
            name: "token_account",
            type: "pubkey"
          },
          {
            name: "amount",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "SwapEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "amm",
            type: "pubkey"
          },
          {
            name: "input_mint",
            type: "pubkey"
          },
          {
            name: "input_amount",
            type: "u64"
          },
          {
            name: "output_mint",
            type: "pubkey"
          },
          {
            name: "output_amount",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "FeeEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "account",
            type: "pubkey"
          },
          {
            name: "mint",
            type: "pubkey"
          },
          {
            name: "amount",
            type: "u64"
          }
        ]
      }
    }
  ]
};

// idl/orca-whirlpools.json
var orca_whirlpools_default = {
  accounts: [
    {
      name: "WhirlpoolsConfigExtension",
      type: {
        fields: [
          {
            name: "whirlpoolsConfig",
            type: "publicKey"
          },
          {
            name: "configExtensionAuthority",
            type: "publicKey"
          },
          {
            name: "tokenBadgeAuthority",
            type: "publicKey"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "WhirlpoolsConfig",
      type: {
        fields: [
          {
            name: "feeAuthority",
            type: "publicKey"
          },
          {
            name: "collectProtocolFeesAuthority",
            type: "publicKey"
          },
          {
            name: "rewardEmissionsSuperAuthority",
            type: "publicKey"
          },
          {
            name: "defaultProtocolFeeRate",
            type: "u16"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "FeeTier",
      type: {
        fields: [
          {
            name: "whirlpoolsConfig",
            type: "publicKey"
          },
          {
            name: "tickSpacing",
            type: "u16"
          },
          {
            name: "defaultFeeRate",
            type: "u16"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "PositionBundle",
      type: {
        fields: [
          {
            name: "positionBundleMint",
            type: "publicKey"
          },
          {
            name: "positionBitmap",
            type: {
              array: ["u8", 32]
            }
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "Position",
      type: {
        fields: [
          {
            name: "whirlpool",
            type: "publicKey"
          },
          {
            name: "positionMint",
            type: "publicKey"
          },
          {
            name: "liquidity",
            type: "u128"
          },
          {
            name: "tickLowerIndex",
            type: "i32"
          },
          {
            name: "tickUpperIndex",
            type: "i32"
          },
          {
            name: "feeGrowthCheckpointA",
            type: "u128"
          },
          {
            name: "feeOwedA",
            type: "u64"
          },
          {
            name: "feeGrowthCheckpointB",
            type: "u128"
          },
          {
            name: "feeOwedB",
            type: "u64"
          },
          {
            name: "rewardInfos",
            type: {
              array: [
                {
                  defined: "PositionRewardInfo"
                },
                3
              ]
            }
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "TickArray",
      type: {
        fields: [
          {
            name: "startTickIndex",
            type: "i32"
          },
          {
            name: "ticks",
            type: {
              array: [
                {
                  defined: "Tick"
                },
                88
              ]
            }
          },
          {
            name: "whirlpool",
            type: "publicKey"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "TokenBadge",
      type: {
        fields: [
          {
            name: "whirlpoolsConfig",
            type: "publicKey"
          },
          {
            name: "tokenMint",
            type: "publicKey"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "Whirlpool",
      type: {
        fields: [
          {
            name: "whirlpoolsConfig",
            type: "publicKey"
          },
          {
            name: "whirlpoolBump",
            type: {
              array: ["u8", 1]
            }
          },
          {
            name: "tickSpacing",
            type: "u16"
          },
          {
            name: "tickSpacingSeed",
            type: {
              array: ["u8", 2]
            }
          },
          {
            name: "feeRate",
            type: "u16"
          },
          {
            name: "protocolFeeRate",
            type: "u16"
          },
          {
            name: "liquidity",
            type: "u128"
          },
          {
            name: "sqrtPrice",
            type: "u128"
          },
          {
            name: "tickCurrentIndex",
            type: "i32"
          },
          {
            name: "protocolFeeOwedA",
            type: "u64"
          },
          {
            name: "protocolFeeOwedB",
            type: "u64"
          },
          {
            name: "tokenMintA",
            type: "publicKey"
          },
          {
            name: "tokenVaultA",
            type: "publicKey"
          },
          {
            name: "feeGrowthGlobalA",
            type: "u128"
          },
          {
            name: "tokenMintB",
            type: "publicKey"
          },
          {
            name: "tokenVaultB",
            type: "publicKey"
          },
          {
            name: "feeGrowthGlobalB",
            type: "u128"
          },
          {
            name: "rewardLastUpdatedTimestamp",
            type: "u64"
          },
          {
            name: "rewardInfos",
            type: {
              array: [
                {
                  defined: "WhirlpoolRewardInfo"
                },
                3
              ]
            }
          }
        ],
        kind: "struct"
      }
    }
  ],
  errors: [
    {
      code: 6e3,
      msg: "Enum value could not be converted",
      name: "InvalidEnum"
    },
    {
      code: 6001,
      msg: "Invalid start tick index provided.",
      name: "InvalidStartTick"
    },
    {
      code: 6002,
      msg: "Tick-array already exists in this whirlpool",
      name: "TickArrayExistInPool"
    },
    {
      code: 6003,
      msg: "Attempt to search for a tick-array failed",
      name: "TickArrayIndexOutofBounds"
    },
    {
      code: 6004,
      msg: "Tick-spacing is not supported",
      name: "InvalidTickSpacing"
    },
    {
      code: 6005,
      msg: "Position is not empty It cannot be closed",
      name: "ClosePositionNotEmpty"
    },
    {
      code: 6006,
      msg: "Unable to divide by zero",
      name: "DivideByZero"
    },
    {
      code: 6007,
      msg: "Unable to cast number into BigInt",
      name: "NumberCastError"
    },
    {
      code: 6008,
      msg: "Unable to down cast number",
      name: "NumberDownCastError"
    },
    {
      code: 6009,
      msg: "Tick not found within tick array",
      name: "TickNotFound"
    },
    {
      code: 6010,
      msg: "Provided tick index is either out of bounds or uninitializable",
      name: "InvalidTickIndex"
    },
    {
      code: 6011,
      msg: "Provided sqrt price out of bounds",
      name: "SqrtPriceOutOfBounds"
    },
    {
      code: 6012,
      msg: "Liquidity amount must be greater than zero",
      name: "LiquidityZero"
    },
    {
      code: 6013,
      msg: "Liquidity amount must be less than i64::MAX",
      name: "LiquidityTooHigh"
    },
    {
      code: 6014,
      msg: "Liquidity overflow",
      name: "LiquidityOverflow"
    },
    {
      code: 6015,
      msg: "Liquidity underflow",
      name: "LiquidityUnderflow"
    },
    {
      code: 6016,
      msg: "Tick liquidity net underflowed or overflowed",
      name: "LiquidityNetError"
    },
    {
      code: 6017,
      msg: "Exceeded token max",
      name: "TokenMaxExceeded"
    },
    {
      code: 6018,
      msg: "Did not meet token min",
      name: "TokenMinSubceeded"
    },
    {
      code: 6019,
      msg: "Position token account has a missing or invalid delegate",
      name: "MissingOrInvalidDelegate"
    },
    {
      code: 6020,
      msg: "Position token amount must be 1",
      name: "InvalidPositionTokenAmount"
    },
    {
      code: 6021,
      msg: "Timestamp should be convertible from i64 to u64",
      name: "InvalidTimestampConversion"
    },
    {
      code: 6022,
      msg: "Timestamp should be greater than the last updated timestamp",
      name: "InvalidTimestamp"
    },
    {
      code: 6023,
      msg: "Invalid tick array sequence provided for instruction.",
      name: "InvalidTickArraySequence"
    },
    {
      code: 6024,
      msg: "Token Mint in wrong order",
      name: "InvalidTokenMintOrder"
    },
    {
      code: 6025,
      msg: "Reward not initialized",
      name: "RewardNotInitialized"
    },
    {
      code: 6026,
      msg: "Invalid reward index",
      name: "InvalidRewardIndex"
    },
    {
      code: 6027,
      msg: "Reward vault requires amount to support emissions for at least one day",
      name: "RewardVaultAmountInsufficient"
    },
    {
      code: 6028,
      msg: "Exceeded max fee rate",
      name: "FeeRateMaxExceeded"
    },
    {
      code: 6029,
      msg: "Exceeded max protocol fee rate",
      name: "ProtocolFeeRateMaxExceeded"
    },
    {
      code: 6030,
      msg: "Multiplication with shift right overflow",
      name: "MultiplicationShiftRightOverflow"
    },
    {
      code: 6031,
      msg: "Muldiv overflow",
      name: "MulDivOverflow"
    },
    {
      code: 6032,
      msg: "Invalid div_u256 input",
      name: "MulDivInvalidInput"
    },
    {
      code: 6033,
      msg: "Multiplication overflow",
      name: "MultiplicationOverflow"
    },
    {
      code: 6034,
      msg: "Provided SqrtPriceLimit not in the same direction as the swap.",
      name: "InvalidSqrtPriceLimitDirection"
    },
    {
      code: 6035,
      msg: "There are no tradable amount to swap.",
      name: "ZeroTradableAmount"
    },
    {
      code: 6036,
      msg: "Amount out below minimum threshold",
      name: "AmountOutBelowMinimum"
    },
    {
      code: 6037,
      msg: "Amount in above maximum threshold",
      name: "AmountInAboveMaximum"
    },
    {
      code: 6038,
      msg: "Invalid index for tick array sequence",
      name: "TickArraySequenceInvalidIndex"
    },
    {
      code: 6039,
      msg: "Amount calculated overflows",
      name: "AmountCalcOverflow"
    },
    {
      code: 6040,
      msg: "Amount remaining overflows",
      name: "AmountRemainingOverflow"
    },
    {
      code: 6041,
      msg: "Invalid intermediary mint",
      name: "InvalidIntermediaryMint"
    },
    {
      code: 6042,
      msg: "Duplicate two hop pool",
      name: "DuplicateTwoHopPool"
    },
    {
      code: 6043,
      msg: "Bundle index is out of bounds",
      name: "InvalidBundleIndex"
    },
    {
      code: 6044,
      msg: "Position has already been opened",
      name: "BundledPositionAlreadyOpened"
    },
    {
      code: 6045,
      msg: "Position has already been closed",
      name: "BundledPositionAlreadyClosed"
    },
    {
      code: 6046,
      msg: "Unable to delete PositionBundle with open positions",
      name: "PositionBundleNotDeletable"
    },
    {
      code: 6047,
      msg: "Token mint has unsupported attributes",
      name: "UnsupportedTokenMint"
    },
    {
      code: 6048,
      msg: "Invalid remaining accounts",
      name: "RemainingAccountsInvalidSlice"
    },
    {
      code: 6049,
      msg: "Insufficient remaining accounts",
      name: "RemainingAccountsInsufficient"
    },
    {
      code: 6050,
      msg: "Unable to call transfer hook without extra accounts",
      name: "NoExtraAccountsForTransferHook"
    },
    {
      code: 6051,
      msg: "Output and input amount mismatch",
      name: "IntermediateTokenAmountMismatch"
    },
    {
      code: 6052,
      msg: "Transfer fee calculation failed",
      name: "TransferFeeCalculationError"
    },
    {
      code: 6053,
      msg: "Same accounts type is provided more than once",
      name: "RemainingAccountsDuplicatedAccountsType"
    },
    {
      code: 6054,
      msg: "Too many supplemental tick arrays provided",
      name: "TooManySupplementalTickArrays"
    },
    {
      code: 6055,
      msg: "TickArray account for different whirlpool provided",
      name: "DifferentWhirlpoolTickArrayAccount"
    }
  ],
  instructions: [
    {
      accounts: [
        {
          isMut: true,
          isSigner: true,
          name: "config"
        },
        {
          isMut: true,
          isSigner: true,
          name: "funder"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "feeAuthority",
          type: "publicKey"
        },
        {
          name: "collectProtocolFeesAuthority",
          type: "publicKey"
        },
        {
          name: "rewardEmissionsSuperAuthority",
          type: "publicKey"
        },
        {
          name: "defaultProtocolFeeRate",
          type: "u16"
        }
      ],
      name: "initializeConfig"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "whirlpoolsConfig"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMintA"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMintB"
        },
        {
          isMut: true,
          isSigner: true,
          name: "funder"
        },
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: true,
          isSigner: true,
          name: "tokenVaultA"
        },
        {
          isMut: true,
          isSigner: true,
          name: "tokenVaultB"
        },
        {
          isMut: false,
          isSigner: false,
          name: "feeTier"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "bumps",
          type: {
            defined: "WhirlpoolBumps"
          }
        },
        {
          name: "tickSpacing",
          type: "u16"
        },
        {
          name: "initialSqrtPrice",
          type: "u128"
        }
      ],
      name: "initializePool"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: true,
          isSigner: true,
          name: "funder"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArray"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "startTickIndex",
          type: "i32"
        }
      ],
      name: "initializeTickArray"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "config"
        },
        {
          isMut: true,
          isSigner: false,
          name: "feeTier"
        },
        {
          isMut: true,
          isSigner: true,
          name: "funder"
        },
        {
          isMut: false,
          isSigner: true,
          name: "feeAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "tickSpacing",
          type: "u16"
        },
        {
          name: "defaultFeeRate",
          type: "u16"
        }
      ],
      name: "initializeFeeTier"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: true,
          name: "rewardAuthority"
        },
        {
          isMut: true,
          isSigner: true,
          name: "funder"
        },
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rewardMint"
        },
        {
          isMut: true,
          isSigner: true,
          name: "rewardVault"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "rewardIndex",
          type: "u8"
        }
      ],
      name: "initializeReward"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: true,
          name: "rewardAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rewardVault"
        }
      ],
      args: [
        {
          name: "rewardIndex",
          type: "u8"
        },
        {
          name: "emissionsPerSecondX64",
          type: "u128"
        }
      ],
      name: "setRewardEmissions"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: true,
          name: "funder"
        },
        {
          isMut: false,
          isSigner: false,
          name: "owner"
        },
        {
          isMut: true,
          isSigner: false,
          name: "position"
        },
        {
          isMut: true,
          isSigner: true,
          name: "positionMint"
        },
        {
          isMut: true,
          isSigner: false,
          name: "positionTokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        },
        {
          isMut: false,
          isSigner: false,
          name: "associatedTokenProgram"
        }
      ],
      args: [
        {
          name: "bumps",
          type: {
            defined: "OpenPositionBumps"
          }
        },
        {
          name: "tickLowerIndex",
          type: "i32"
        },
        {
          name: "tickUpperIndex",
          type: "i32"
        }
      ],
      name: "openPosition"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: true,
          name: "funder"
        },
        {
          isMut: false,
          isSigner: false,
          name: "owner"
        },
        {
          isMut: true,
          isSigner: false,
          name: "position"
        },
        {
          isMut: true,
          isSigner: true,
          name: "positionMint"
        },
        {
          isMut: true,
          isSigner: false,
          name: "positionMetadataAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "positionTokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        },
        {
          isMut: false,
          isSigner: false,
          name: "associatedTokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadataProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadataUpdateAuth"
        }
      ],
      args: [
        {
          name: "bumps",
          type: {
            defined: "OpenPositionWithMetadataBumps"
          }
        },
        {
          name: "tickLowerIndex",
          type: "i32"
        },
        {
          name: "tickUpperIndex",
          type: "i32"
        }
      ],
      name: "openPositionWithMetadata"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: true,
          name: "positionAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "position"
        },
        {
          isMut: false,
          isSigner: false,
          name: "positionTokenAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayLower"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayUpper"
        }
      ],
      args: [
        {
          name: "liquidityAmount",
          type: "u128"
        },
        {
          name: "tokenMaxA",
          type: "u64"
        },
        {
          name: "tokenMaxB",
          type: "u64"
        }
      ],
      name: "increaseLiquidity"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: true,
          name: "positionAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "position"
        },
        {
          isMut: false,
          isSigner: false,
          name: "positionTokenAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayLower"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayUpper"
        }
      ],
      args: [
        {
          name: "liquidityAmount",
          type: "u128"
        },
        {
          name: "tokenMinA",
          type: "u64"
        },
        {
          name: "tokenMinB",
          type: "u64"
        }
      ],
      name: "decreaseLiquidity"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: true,
          isSigner: false,
          name: "position"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tickArrayLower"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tickArrayUpper"
        }
      ],
      args: [],
      name: "updateFeesAndRewards"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: true,
          name: "positionAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "position"
        },
        {
          isMut: false,
          isSigner: false,
          name: "positionTokenAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultB"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        }
      ],
      args: [],
      name: "collectFees"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: true,
          name: "positionAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "position"
        },
        {
          isMut: false,
          isSigner: false,
          name: "positionTokenAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "rewardOwnerAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "rewardVault"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        }
      ],
      args: [
        {
          name: "rewardIndex",
          type: "u8"
        }
      ],
      name: "collectReward"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "whirlpoolsConfig"
        },
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: true,
          name: "collectProtocolFeesAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenDestinationA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenDestinationB"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        }
      ],
      args: [],
      name: "collectProtocolFees"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: true,
          name: "tokenAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArray0"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArray1"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArray2"
        },
        {
          isMut: false,
          isSigner: false,
          name: "oracle"
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        },
        {
          name: "otherAmountThreshold",
          type: "u64"
        },
        {
          name: "sqrtPriceLimit",
          type: "u128"
        },
        {
          name: "amountSpecifiedIsInput",
          type: "bool"
        },
        {
          name: "aToB",
          type: "bool"
        }
      ],
      name: "swap"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: true,
          name: "positionAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "receiver"
        },
        {
          isMut: true,
          isSigner: false,
          name: "position"
        },
        {
          isMut: true,
          isSigner: false,
          name: "positionMint"
        },
        {
          isMut: true,
          isSigner: false,
          name: "positionTokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        }
      ],
      args: [],
      name: "closePosition"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "whirlpoolsConfig"
        },
        {
          isMut: true,
          isSigner: false,
          name: "feeTier"
        },
        {
          isMut: false,
          isSigner: true,
          name: "feeAuthority"
        }
      ],
      args: [
        {
          name: "defaultFeeRate",
          type: "u16"
        }
      ],
      name: "setDefaultFeeRate"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "whirlpoolsConfig"
        },
        {
          isMut: false,
          isSigner: true,
          name: "feeAuthority"
        }
      ],
      args: [
        {
          name: "defaultProtocolFeeRate",
          type: "u16"
        }
      ],
      name: "setDefaultProtocolFeeRate"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "whirlpoolsConfig"
        },
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: true,
          name: "feeAuthority"
        }
      ],
      args: [
        {
          name: "feeRate",
          type: "u16"
        }
      ],
      name: "setFeeRate"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "whirlpoolsConfig"
        },
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: true,
          name: "feeAuthority"
        }
      ],
      args: [
        {
          name: "protocolFeeRate",
          type: "u16"
        }
      ],
      name: "setProtocolFeeRate"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "whirlpoolsConfig"
        },
        {
          isMut: false,
          isSigner: true,
          name: "feeAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "newFeeAuthority"
        }
      ],
      args: [],
      name: "setFeeAuthority"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "whirlpoolsConfig"
        },
        {
          isMut: false,
          isSigner: true,
          name: "collectProtocolFeesAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "newCollectProtocolFeesAuthority"
        }
      ],
      args: [],
      name: "setCollectProtocolFeesAuthority"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: true,
          name: "rewardAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "newRewardAuthority"
        }
      ],
      args: [
        {
          name: "rewardIndex",
          type: "u8"
        }
      ],
      name: "setRewardAuthority"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "whirlpoolsConfig"
        },
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: true,
          name: "rewardEmissionsSuperAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "newRewardAuthority"
        }
      ],
      args: [
        {
          name: "rewardIndex",
          type: "u8"
        }
      ],
      name: "setRewardAuthorityBySuperAuthority"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "whirlpoolsConfig"
        },
        {
          isMut: false,
          isSigner: true,
          name: "rewardEmissionsSuperAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "newRewardEmissionsSuperAuthority"
        }
      ],
      args: [],
      name: "setRewardEmissionsSuperAuthority"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: true,
          name: "tokenAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "whirlpoolOne"
        },
        {
          isMut: true,
          isSigner: false,
          name: "whirlpoolTwo"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountOneA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultOneA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountOneB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultOneB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountTwoA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultTwoA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountTwoB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultTwoB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayOne0"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayOne1"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayOne2"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayTwo0"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayTwo1"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayTwo2"
        },
        {
          isMut: false,
          isSigner: false,
          name: "oracleOne"
        },
        {
          isMut: false,
          isSigner: false,
          name: "oracleTwo"
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        },
        {
          name: "otherAmountThreshold",
          type: "u64"
        },
        {
          name: "amountSpecifiedIsInput",
          type: "bool"
        },
        {
          name: "aToBOne",
          type: "bool"
        },
        {
          name: "aToBTwo",
          type: "bool"
        },
        {
          name: "sqrtPriceLimitOne",
          type: "u128"
        },
        {
          name: "sqrtPriceLimitTwo",
          type: "u128"
        }
      ],
      name: "twoHopSwap"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "positionBundle"
        },
        {
          isMut: true,
          isSigner: true,
          name: "positionBundleMint"
        },
        {
          isMut: true,
          isSigner: false,
          name: "positionBundleTokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "positionBundleOwner"
        },
        {
          isMut: true,
          isSigner: true,
          name: "funder"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        },
        {
          isMut: false,
          isSigner: false,
          name: "associatedTokenProgram"
        }
      ],
      args: [],
      name: "initializePositionBundle"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "positionBundle"
        },
        {
          isMut: true,
          isSigner: true,
          name: "positionBundleMint"
        },
        {
          isMut: true,
          isSigner: false,
          name: "positionBundleMetadata"
        },
        {
          isMut: true,
          isSigner: false,
          name: "positionBundleTokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "positionBundleOwner"
        },
        {
          isMut: true,
          isSigner: true,
          name: "funder"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadataUpdateAuth"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        },
        {
          isMut: false,
          isSigner: false,
          name: "associatedTokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadataProgram"
        }
      ],
      args: [],
      name: "initializePositionBundleWithMetadata"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "positionBundle"
        },
        {
          isMut: true,
          isSigner: false,
          name: "positionBundleMint"
        },
        {
          isMut: true,
          isSigner: false,
          name: "positionBundleTokenAccount"
        },
        {
          isMut: false,
          isSigner: true,
          name: "positionBundleOwner"
        },
        {
          isMut: true,
          isSigner: false,
          name: "receiver"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        }
      ],
      args: [],
      name: "deletePositionBundle"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "bundledPosition"
        },
        {
          isMut: true,
          isSigner: false,
          name: "positionBundle"
        },
        {
          isMut: false,
          isSigner: false,
          name: "positionBundleTokenAccount"
        },
        {
          isMut: false,
          isSigner: true,
          name: "positionBundleAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: true,
          isSigner: true,
          name: "funder"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "bundleIndex",
          type: "u16"
        },
        {
          name: "tickLowerIndex",
          type: "i32"
        },
        {
          name: "tickUpperIndex",
          type: "i32"
        }
      ],
      name: "openBundledPosition"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "bundledPosition"
        },
        {
          isMut: true,
          isSigner: false,
          name: "positionBundle"
        },
        {
          isMut: false,
          isSigner: false,
          name: "positionBundleTokenAccount"
        },
        {
          isMut: false,
          isSigner: true,
          name: "positionBundleAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "receiver"
        }
      ],
      args: [
        {
          name: "bundleIndex",
          type: "u16"
        }
      ],
      name: "closeBundledPosition"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: true,
          name: "positionAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "position"
        },
        {
          isMut: false,
          isSigner: false,
          name: "positionTokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMintA"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMintB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultB"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgramA"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgramB"
        },
        {
          isMut: false,
          isSigner: false,
          name: "memoProgram"
        }
      ],
      args: [
        {
          name: "remainingAccountsInfo",
          type: {
            option: {
              defined: "RemainingAccountsInfo"
            }
          }
        }
      ],
      name: "collectFeesV2"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "whirlpoolsConfig"
        },
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: true,
          name: "collectProtocolFeesAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMintA"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMintB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenDestinationA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenDestinationB"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgramA"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgramB"
        },
        {
          isMut: false,
          isSigner: false,
          name: "memoProgram"
        }
      ],
      args: [
        {
          name: "remainingAccountsInfo",
          type: {
            option: {
              defined: "RemainingAccountsInfo"
            }
          }
        }
      ],
      name: "collectProtocolFeesV2"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: true,
          name: "positionAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "position"
        },
        {
          isMut: false,
          isSigner: false,
          name: "positionTokenAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "rewardOwnerAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rewardMint"
        },
        {
          isMut: true,
          isSigner: false,
          name: "rewardVault"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rewardTokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "memoProgram"
        }
      ],
      args: [
        {
          name: "rewardIndex",
          type: "u8"
        },
        {
          name: "remainingAccountsInfo",
          type: {
            option: {
              defined: "RemainingAccountsInfo"
            }
          }
        }
      ],
      name: "collectRewardV2"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgramA"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgramB"
        },
        {
          isMut: false,
          isSigner: false,
          name: "memoProgram"
        },
        {
          isMut: false,
          isSigner: true,
          name: "positionAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "position"
        },
        {
          isMut: false,
          isSigner: false,
          name: "positionTokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMintA"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMintB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayLower"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayUpper"
        }
      ],
      args: [
        {
          name: "liquidityAmount",
          type: "u128"
        },
        {
          name: "tokenMinA",
          type: "u64"
        },
        {
          name: "tokenMinB",
          type: "u64"
        },
        {
          name: "remainingAccountsInfo",
          type: {
            option: {
              defined: "RemainingAccountsInfo"
            }
          }
        }
      ],
      name: "decreaseLiquidityV2"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgramA"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgramB"
        },
        {
          isMut: false,
          isSigner: false,
          name: "memoProgram"
        },
        {
          isMut: false,
          isSigner: true,
          name: "positionAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "position"
        },
        {
          isMut: false,
          isSigner: false,
          name: "positionTokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMintA"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMintB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayLower"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayUpper"
        }
      ],
      args: [
        {
          name: "liquidityAmount",
          type: "u128"
        },
        {
          name: "tokenMaxA",
          type: "u64"
        },
        {
          name: "tokenMaxB",
          type: "u64"
        },
        {
          name: "remainingAccountsInfo",
          type: {
            option: {
              defined: "RemainingAccountsInfo"
            }
          }
        }
      ],
      name: "increaseLiquidityV2"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "whirlpoolsConfig"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMintA"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMintB"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenBadgeA"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenBadgeB"
        },
        {
          isMut: true,
          isSigner: true,
          name: "funder"
        },
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: true,
          isSigner: true,
          name: "tokenVaultA"
        },
        {
          isMut: true,
          isSigner: true,
          name: "tokenVaultB"
        },
        {
          isMut: false,
          isSigner: false,
          name: "feeTier"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgramA"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgramB"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "tickSpacing",
          type: "u16"
        },
        {
          name: "initialSqrtPrice",
          type: "u128"
        }
      ],
      name: "initializePoolV2"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: true,
          name: "rewardAuthority"
        },
        {
          isMut: true,
          isSigner: true,
          name: "funder"
        },
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rewardMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rewardTokenBadge"
        },
        {
          isMut: true,
          isSigner: true,
          name: "rewardVault"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rewardTokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "rewardIndex",
          type: "u8"
        }
      ],
      name: "initializeRewardV2"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: true,
          name: "rewardAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rewardVault"
        }
      ],
      args: [
        {
          name: "rewardIndex",
          type: "u8"
        },
        {
          name: "emissionsPerSecondX64",
          type: "u128"
        }
      ],
      name: "setRewardEmissionsV2"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgramA"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgramB"
        },
        {
          isMut: false,
          isSigner: false,
          name: "memoProgram"
        },
        {
          isMut: false,
          isSigner: true,
          name: "tokenAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "whirlpool"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMintA"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMintB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultA"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultB"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArray0"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArray1"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArray2"
        },
        {
          isMut: true,
          isSigner: false,
          name: "oracle"
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        },
        {
          name: "otherAmountThreshold",
          type: "u64"
        },
        {
          name: "sqrtPriceLimit",
          type: "u128"
        },
        {
          name: "amountSpecifiedIsInput",
          type: "bool"
        },
        {
          name: "aToB",
          type: "bool"
        },
        {
          name: "remainingAccountsInfo",
          type: {
            option: {
              defined: "RemainingAccountsInfo"
            }
          }
        }
      ],
      name: "swapV2"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "whirlpoolOne"
        },
        {
          isMut: true,
          isSigner: false,
          name: "whirlpoolTwo"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMintInput"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMintIntermediate"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMintOutput"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgramInput"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgramIntermediate"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgramOutput"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountInput"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultOneInput"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultOneIntermediate"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultTwoIntermediate"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenVaultTwoOutput"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenOwnerAccountOutput"
        },
        {
          isMut: false,
          isSigner: true,
          name: "tokenAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayOne0"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayOne1"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayOne2"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayTwo0"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayTwo1"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tickArrayTwo2"
        },
        {
          isMut: true,
          isSigner: false,
          name: "oracleOne"
        },
        {
          isMut: true,
          isSigner: false,
          name: "oracleTwo"
        },
        {
          isMut: false,
          isSigner: false,
          name: "memoProgram"
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        },
        {
          name: "otherAmountThreshold",
          type: "u64"
        },
        {
          name: "amountSpecifiedIsInput",
          type: "bool"
        },
        {
          name: "aToBOne",
          type: "bool"
        },
        {
          name: "aToBTwo",
          type: "bool"
        },
        {
          name: "sqrtPriceLimitOne",
          type: "u128"
        },
        {
          name: "sqrtPriceLimitTwo",
          type: "u128"
        },
        {
          name: "remainingAccountsInfo",
          type: {
            option: {
              defined: "RemainingAccountsInfo"
            }
          }
        }
      ],
      name: "twoHopSwapV2"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "config"
        },
        {
          isMut: true,
          isSigner: false,
          name: "configExtension"
        },
        {
          isMut: true,
          isSigner: true,
          name: "funder"
        },
        {
          isMut: false,
          isSigner: true,
          name: "feeAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [],
      name: "initializeConfigExtension"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "whirlpoolsConfig"
        },
        {
          isMut: true,
          isSigner: false,
          name: "whirlpoolsConfigExtension"
        },
        {
          isMut: false,
          isSigner: true,
          name: "configExtensionAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "newConfigExtensionAuthority"
        }
      ],
      args: [],
      name: "setConfigExtensionAuthority"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "whirlpoolsConfig"
        },
        {
          isMut: true,
          isSigner: false,
          name: "whirlpoolsConfigExtension"
        },
        {
          isMut: false,
          isSigner: true,
          name: "configExtensionAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "newTokenBadgeAuthority"
        }
      ],
      args: [],
      name: "setTokenBadgeAuthority"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "whirlpoolsConfig"
        },
        {
          isMut: false,
          isSigner: false,
          name: "whirlpoolsConfigExtension"
        },
        {
          isMut: false,
          isSigner: true,
          name: "tokenBadgeAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenBadge"
        },
        {
          isMut: true,
          isSigner: true,
          name: "funder"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [],
      name: "initializeTokenBadge"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "whirlpoolsConfig"
        },
        {
          isMut: false,
          isSigner: false,
          name: "whirlpoolsConfigExtension"
        },
        {
          isMut: false,
          isSigner: true,
          name: "tokenBadgeAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenBadge"
        },
        {
          isMut: true,
          isSigner: false,
          name: "receiver"
        }
      ],
      args: [],
      name: "deleteTokenBadge"
    }
  ],
  name: "whirlpool",
  types: [
    {
      name: "OpenPositionBumps",
      type: {
        fields: [
          {
            name: "positionBump",
            type: "u8"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "OpenPositionWithMetadataBumps",
      type: {
        fields: [
          {
            name: "positionBump",
            type: "u8"
          },
          {
            name: "metadataBump",
            type: "u8"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "PositionRewardInfo",
      type: {
        fields: [
          {
            name: "growthInsideCheckpoint",
            type: "u128"
          },
          {
            name: "amountOwed",
            type: "u64"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "Tick",
      type: {
        fields: [
          {
            name: "initialized",
            type: "bool"
          },
          {
            name: "liquidityNet",
            type: "i128"
          },
          {
            name: "liquidityGross",
            type: "u128"
          },
          {
            name: "feeGrowthOutsideA",
            type: "u128"
          },
          {
            name: "feeGrowthOutsideB",
            type: "u128"
          },
          {
            name: "rewardGrowthsOutside",
            type: {
              array: ["u128", 3]
            }
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "WhirlpoolRewardInfo",
      type: {
        fields: [
          {
            name: "mint",
            type: "publicKey"
          },
          {
            name: "vault",
            type: "publicKey"
          },
          {
            name: "authority",
            type: "publicKey"
          },
          {
            name: "emissionsPerSecondX64",
            type: "u128"
          },
          {
            name: "growthGlobalX64",
            type: "u128"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "WhirlpoolBumps",
      type: {
        fields: [
          {
            name: "whirlpoolBump",
            type: "u8"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "RemainingAccountsSlice",
      type: {
        fields: [
          {
            name: "accountsType",
            type: {
              defined: "AccountsType"
            }
          },
          {
            name: "length",
            type: "u8"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "RemainingAccountsInfo",
      type: {
        fields: [
          {
            name: "slices",
            type: {
              vec: {
                defined: "RemainingAccountsSlice"
              }
            }
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "CurrIndex",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Below"
          },
          {
            name: "Inside"
          },
          {
            name: "Above"
          }
        ]
      }
    },
    {
      name: "TickLabel",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Upper"
          },
          {
            name: "Lower"
          }
        ]
      }
    },
    {
      name: "Direction",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Left"
          },
          {
            name: "Right"
          }
        ]
      }
    },
    {
      name: "AccountsType",
      type: {
        kind: "enum",
        variants: [
          {
            name: "TransferHookA"
          },
          {
            name: "TransferHookB"
          },
          {
            name: "TransferHookReward"
          },
          {
            name: "TransferHookInput"
          },
          {
            name: "TransferHookIntermediate"
          },
          {
            name: "TransferHookOutput"
          },
          {
            name: "SupplementalTickArrays"
          },
          {
            name: "SupplementalTickArraysOne"
          },
          {
            name: "SupplementalTickArraysTwo"
          }
        ]
      }
    }
  ],
  version: "0.3.0"
};

// idl/raydium-amm.json
var raydium_amm_default = {
  version: "0.3.0",
  name: "raydium_amm",
  instructions: [
    {
      name: "initialize",
      accounts: [
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false
        },
        {
          name: "amm",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "ammOpenOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "lpMintAddress",
          isMut: true,
          isSigner: false
        },
        {
          name: "coinMintAddress",
          isMut: false,
          isSigner: false
        },
        {
          name: "pcMintAddress",
          isMut: false,
          isSigner: false
        },
        {
          name: "poolCoinTokenAccount",
          isMut: false,
          isSigner: false
        },
        {
          name: "poolPcTokenAccount",
          isMut: false,
          isSigner: false
        },
        {
          name: "poolWithdrawQueue",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolTargetOrdersAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "userLpTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolTempLpTokenAccount",
          isMut: false,
          isSigner: false
        },
        {
          name: "serumProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "serumMarket",
          isMut: false,
          isSigner: false
        },
        {
          name: "userWallet",
          isMut: true,
          isSigner: true
        }
      ],
      args: [
        {
          name: "nonce",
          type: "u8"
        },
        {
          name: "openTime",
          type: "u64"
        }
      ]
    },
    {
      name: "initialize2",
      accounts: [
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "splAssociatedTokenAccount",
          isMut: false,
          isSigner: false
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false
        },
        {
          name: "amm",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "ammOpenOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "lpMint",
          isMut: true,
          isSigner: false
        },
        {
          name: "coinMint",
          isMut: false,
          isSigner: false
        },
        {
          name: "pcMint",
          isMut: false,
          isSigner: false
        },
        {
          name: "poolCoinTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolPcTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolWithdrawQueue",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammTargetOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolTempLp",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "serumMarket",
          isMut: false,
          isSigner: false
        },
        {
          name: "userWallet",
          isMut: true,
          isSigner: true
        },
        {
          name: "userTokenCoin",
          isMut: true,
          isSigner: false
        },
        {
          name: "userTokenPc",
          isMut: true,
          isSigner: false
        },
        {
          name: "userLpTokenAccount",
          isMut: true,
          isSigner: false
        }
      ],
      args: [
        {
          name: "nonce",
          type: "u8"
        },
        {
          name: "openTime",
          type: "u64"
        },
        {
          name: "initPcAmount",
          type: "u64"
        },
        {
          name: "initCoinAmount",
          type: "u64"
        }
      ]
    },
    {
      name: "monitorStep",
      accounts: [
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false
        },
        {
          name: "clock",
          isMut: false,
          isSigner: false
        },
        {
          name: "amm",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "ammOpenOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammTargetOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolCoinTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolPcTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolWithdrawQueue",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "serumMarket",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumCoinVaultAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumPcVaultAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumVaultSigner",
          isMut: false,
          isSigner: false
        },
        {
          name: "serumReqQ",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumEventQ",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumBids",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumAsks",
          isMut: true,
          isSigner: false
        }
      ],
      args: [
        {
          name: "planOrderLimit",
          type: "u16"
        },
        {
          name: "placeOrderLimit",
          type: "u16"
        },
        {
          name: "cancelOrderLimit",
          type: "u16"
        }
      ]
    },
    {
      name: "deposit",
      accounts: [
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "amm",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "ammOpenOrders",
          isMut: false,
          isSigner: false
        },
        {
          name: "ammTargetOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "lpMintAddress",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolCoinTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolPcTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumMarket",
          isMut: false,
          isSigner: false
        },
        {
          name: "userCoinTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "userPcTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "userLpTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "userOwner",
          isMut: false,
          isSigner: true
        },
        {
          name: "serumEventQueue",
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: "maxCoinAmount",
          type: "u64"
        },
        {
          name: "maxPcAmount",
          type: "u64"
        },
        {
          name: "baseSide",
          type: "u64"
        }
      ]
    },
    {
      name: "withdraw",
      accounts: [
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "amm",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "ammOpenOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammTargetOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "lpMintAddress",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolCoinTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolPcTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolWithdrawQueue",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolTempLpTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "serumMarket",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumCoinVaultAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumPcVaultAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumVaultSigner",
          isMut: false,
          isSigner: false
        },
        {
          name: "userLpTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "uerCoinTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "uerPcTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "userOwner",
          isMut: false,
          isSigner: true
        },
        {
          name: "serumEventQ",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumBids",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumAsks",
          isMut: true,
          isSigner: false
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        }
      ]
    },
    {
      name: "migrateToOpenBook",
      accounts: [
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false
        },
        {
          name: "amm",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "ammOpenOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammTokenCoin",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammTokenPc",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammTargetOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "serumMarket",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumBids",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumAsks",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumEventQueue",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumCoinVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumPcVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumVaultSigner",
          isMut: false,
          isSigner: false
        },
        {
          name: "newAmmOpenOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "newSerumProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "newSerumMarket",
          isMut: false,
          isSigner: false
        },
        {
          name: "admin",
          isMut: true,
          isSigner: true
        }
      ],
      args: []
    },
    {
      name: "setParams",
      accounts: [
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "amm",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "ammOpenOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammTargetOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammCoinVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammPcVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "serumMarket",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumCoinVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumPcVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumVaultSigner",
          isMut: false,
          isSigner: false
        },
        {
          name: "serumEventQueue",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumBids",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumAsks",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammAdminAccount",
          isMut: false,
          isSigner: true
        }
      ],
      args: [
        {
          name: "param",
          type: "u8"
        },
        {
          name: "value",
          type: {
            option: "u64"
          }
        },
        {
          name: "newPubkey",
          type: {
            option: "publicKey"
          }
        },
        {
          name: "fees",
          type: {
            option: {
              defined: "Fees"
            }
          }
        },
        {
          name: "lastOrderDistance",
          type: {
            option: {
              defined: "LastOrderDistance"
            }
          }
        },
        {
          name: "needTakeAmounts",
          type: {
            option: {
              defined: "NeedTake"
            }
          }
        }
      ]
    },
    {
      name: "withdrawPnl",
      accounts: [
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "amm",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammConfig",
          isMut: false,
          isSigner: false
        },
        {
          name: "ammAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "ammOpenOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolCoinTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolPcTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "coinPnlTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "pcPnlTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "pnlOwnerAccount",
          isMut: false,
          isSigner: true
        },
        {
          name: "ammTargetOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "serumMarket",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumEventQueue",
          isMut: false,
          isSigner: false
        },
        {
          name: "serumCoinVaultAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumPcVaultAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumVaultSigner",
          isMut: false,
          isSigner: false
        }
      ],
      args: []
    },
    {
      name: "withdrawSrm",
      accounts: [
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "amm",
          isMut: false,
          isSigner: false
        },
        {
          name: "ammOwnerAccount",
          isMut: false,
          isSigner: true
        },
        {
          name: "ammAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "srmToken",
          isMut: true,
          isSigner: false
        },
        {
          name: "destSrmToken",
          isMut: true,
          isSigner: false
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        }
      ]
    },
    {
      name: "swapBaseIn",
      accounts: [
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "amm",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "ammOpenOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammTargetOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolCoinTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolPcTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "serumMarket",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumBids",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumAsks",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumEventQueue",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumCoinVaultAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumPcVaultAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumVaultSigner",
          isMut: false,
          isSigner: false
        },
        {
          name: "uerSourceTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "uerDestinationTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "userSourceOwner",
          isMut: false,
          isSigner: true
        }
      ],
      args: [
        {
          name: "amountIn",
          type: "u64"
        },
        {
          name: "minimumAmountOut",
          type: "u64"
        }
      ]
    },
    {
      name: "preInitialize",
      accounts: [
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false
        },
        {
          name: "ammTargetOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolWithdrawQueue",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "lpMintAddress",
          isMut: true,
          isSigner: false
        },
        {
          name: "coinMintAddress",
          isMut: false,
          isSigner: false
        },
        {
          name: "pcMintAddress",
          isMut: false,
          isSigner: false
        },
        {
          name: "poolCoinTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolPcTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolTempLpTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumMarket",
          isMut: false,
          isSigner: false
        },
        {
          name: "userWallet",
          isMut: true,
          isSigner: true
        }
      ],
      args: [
        {
          name: "nonce",
          type: "u8"
        }
      ]
    },
    {
      name: "swapBaseOut",
      accounts: [
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "amm",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "ammOpenOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammTargetOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolCoinTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolPcTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "serumMarket",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumBids",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumAsks",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumEventQueue",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumCoinVaultAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumPcVaultAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumVaultSigner",
          isMut: false,
          isSigner: false
        },
        {
          name: "uerSourceTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "uerDestinationTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "userSourceOwner",
          isMut: false,
          isSigner: true
        }
      ],
      args: [
        {
          name: "maxAmountIn",
          type: "u64"
        },
        {
          name: "amountOut",
          type: "u64"
        }
      ]
    },
    {
      name: "simulateInfo",
      accounts: [
        {
          name: "amm",
          isMut: false,
          isSigner: false
        },
        {
          name: "ammAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "ammOpenOrders",
          isMut: false,
          isSigner: false
        },
        {
          name: "poolCoinTokenAccount",
          isMut: false,
          isSigner: false
        },
        {
          name: "poolPcTokenAccount",
          isMut: false,
          isSigner: false
        },
        {
          name: "lpMintAddress",
          isMut: false,
          isSigner: false
        },
        {
          name: "serumMarket",
          isMut: false,
          isSigner: false
        },
        {
          name: "serumEventQueue",
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: "param",
          type: "u8"
        },
        {
          name: "swapBaseInValue",
          type: {
            option: {
              defined: "SwapInstructionBaseIn"
            }
          }
        },
        {
          name: "swapBaseOutValue",
          type: {
            option: {
              defined: "SwapInstructionBaseOut"
            }
          }
        }
      ]
    },
    {
      name: "adminCancelOrders",
      accounts: [
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "amm",
          isMut: false,
          isSigner: false
        },
        {
          name: "ammAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "ammOpenOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammTargetOrders",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolCoinTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "poolPcTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "ammOwnerAccount",
          isMut: false,
          isSigner: true
        },
        {
          name: "ammConfig",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "serumMarket",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumCoinVaultAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumPcVaultAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumVaultSigner",
          isMut: false,
          isSigner: false
        },
        {
          name: "serumEventQ",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumBids",
          isMut: true,
          isSigner: false
        },
        {
          name: "serumAsks",
          isMut: true,
          isSigner: false
        }
      ],
      args: [
        {
          name: "limit",
          type: "u16"
        }
      ]
    },
    {
      name: "createConfigAccount",
      accounts: [
        {
          name: "admin",
          isMut: true,
          isSigner: true
        },
        {
          name: "ammConfig",
          isMut: true,
          isSigner: false
        },
        {
          name: "owner",
          isMut: false,
          isSigner: false
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false
        }
      ],
      args: []
    },
    {
      name: "updateConfigAccount",
      accounts: [
        {
          name: "admin",
          isMut: false,
          isSigner: true
        },
        {
          name: "ammConfig",
          isMut: true,
          isSigner: false
        }
      ],
      args: [
        {
          name: "param",
          type: "u8"
        },
        {
          name: "owner",
          type: "publicKey"
        }
      ]
    }
  ],
  accounts: [
    {
      name: "TargetOrders",
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            type: {
              array: ["u64", 4]
            }
          },
          {
            name: "buyOrders",
            type: {
              array: [
                {
                  defined: "TargetOrder"
                },
                50
              ]
            }
          },
          {
            name: "padding1",
            type: {
              array: ["u64", 8]
            }
          },
          {
            name: "targetX",
            type: "u128"
          },
          {
            name: "targetY",
            type: "u128"
          },
          {
            name: "planXBuy",
            type: "u128"
          },
          {
            name: "planYBuy",
            type: "u128"
          },
          {
            name: "planXSell",
            type: "u128"
          },
          {
            name: "planYSell",
            type: "u128"
          },
          {
            name: "placedX",
            type: "u128"
          },
          {
            name: "placedY",
            type: "u128"
          },
          {
            name: "calcPnlX",
            type: "u128"
          },
          {
            name: "calcPnlY",
            type: "u128"
          },
          {
            name: "sellOrders",
            type: {
              array: [
                {
                  defined: "TargetOrder"
                },
                50
              ]
            }
          },
          {
            name: "padding2",
            type: {
              array: ["u64", 6]
            }
          },
          {
            name: "replaceBuyClientId",
            type: {
              array: ["u64", 10]
            }
          },
          {
            name: "replaceSellClientId",
            type: {
              array: ["u64", 10]
            }
          },
          {
            name: "lastOrderNumerator",
            type: "u64"
          },
          {
            name: "lastOrderDenominator",
            type: "u64"
          },
          {
            name: "planOrdersCur",
            type: "u64"
          },
          {
            name: "placeOrdersCur",
            type: "u64"
          },
          {
            name: "validBuyOrderNum",
            type: "u64"
          },
          {
            name: "validSellOrderNum",
            type: "u64"
          },
          {
            name: "padding3",
            type: {
              array: ["u64", 10]
            }
          },
          {
            name: "freeSlotBits",
            type: "u128"
          }
        ]
      }
    },
    {
      name: "Fees",
      type: {
        kind: "struct",
        fields: [
          {
            name: "minSeparateNumerator",
            type: "u64"
          },
          {
            name: "minSeparateDenominator",
            type: "u64"
          },
          {
            name: "tradeFeeNumerator",
            type: "u64"
          },
          {
            name: "tradeFeeDenominator",
            type: "u64"
          },
          {
            name: "pnlNumerator",
            type: "u64"
          },
          {
            name: "pnlDenominator",
            type: "u64"
          },
          {
            name: "swapFeeNumerator",
            type: "u64"
          },
          {
            name: "swapFeeDenominator",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "AmmInfo",
      type: {
        kind: "struct",
        fields: [
          {
            name: "status",
            type: "u64"
          },
          {
            name: "nonce",
            type: "u64"
          },
          {
            name: "orderNum",
            type: "u64"
          },
          {
            name: "depth",
            type: "u64"
          },
          {
            name: "coinDecimals",
            type: "u64"
          },
          {
            name: "pcDecimals",
            type: "u64"
          },
          {
            name: "state",
            type: "u64"
          },
          {
            name: "resetFlag",
            type: "u64"
          },
          {
            name: "minSize",
            type: "u64"
          },
          {
            name: "volMaxCutRatio",
            type: "u64"
          },
          {
            name: "amountWave",
            type: "u64"
          },
          {
            name: "coinLotSize",
            type: "u64"
          },
          {
            name: "pcLotSize",
            type: "u64"
          },
          {
            name: "minPriceMultiplier",
            type: "u64"
          },
          {
            name: "maxPriceMultiplier",
            type: "u64"
          },
          {
            name: "sysDecimalValue",
            type: "u64"
          },
          {
            name: "fees",
            type: {
              defined: "Fees"
            }
          },
          {
            name: "outPut",
            type: {
              defined: "OutPutData"
            }
          },
          {
            name: "tokenCoin",
            type: "publicKey"
          },
          {
            name: "tokenPc",
            type: "publicKey"
          },
          {
            name: "coinMint",
            type: "publicKey"
          },
          {
            name: "pcMint",
            type: "publicKey"
          },
          {
            name: "lpMint",
            type: "publicKey"
          },
          {
            name: "openOrders",
            type: "publicKey"
          },
          {
            name: "market",
            type: "publicKey"
          },
          {
            name: "serumDex",
            type: "publicKey"
          },
          {
            name: "targetOrders",
            type: "publicKey"
          },
          {
            name: "withdrawQueue",
            type: "publicKey"
          },
          {
            name: "tokenTempLp",
            type: "publicKey"
          },
          {
            name: "ammOwner",
            type: "publicKey"
          },
          {
            name: "lpAmount",
            type: "u64"
          },
          {
            name: "clientOrderId",
            type: "u64"
          },
          {
            name: "padding",
            type: {
              array: ["u64", 2]
            }
          }
        ]
      }
    }
  ],
  types: [
    {
      name: "WithdrawDestToken",
      type: {
        kind: "struct",
        fields: [
          {
            name: "withdrawAmount",
            type: "u64"
          },
          {
            name: "coinAmount",
            type: "u64"
          },
          {
            name: "pcAmount",
            type: "u64"
          },
          {
            name: "destTokenCoin",
            type: "publicKey"
          },
          {
            name: "destTokenPc",
            type: "publicKey"
          }
        ]
      }
    },
    {
      name: "WithdrawQueue",
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            type: {
              array: ["u64", 4]
            }
          },
          {
            name: "head",
            type: "u64"
          },
          {
            name: "count",
            type: "u64"
          },
          {
            name: "buf",
            type: {
              array: [
                {
                  defined: "WithdrawDestToken"
                },
                64
              ]
            }
          }
        ]
      }
    },
    {
      name: "TargetOrder",
      type: {
        kind: "struct",
        fields: [
          {
            name: "price",
            type: "u64"
          },
          {
            name: "vol",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "OutPutData",
      type: {
        kind: "struct",
        fields: [
          {
            name: "needTakePnlCoin",
            type: "u64"
          },
          {
            name: "needTakePnlPc",
            type: "u64"
          },
          {
            name: "totalPnlPc",
            type: "u64"
          },
          {
            name: "totalPnlCoin",
            type: "u64"
          },
          {
            name: "poolOpenTime",
            type: "u64"
          },
          {
            name: "punishPcAmount",
            type: "u64"
          },
          {
            name: "punishCoinAmount",
            type: "u64"
          },
          {
            name: "orderbookToInitTime",
            type: "u64"
          },
          {
            name: "swapCoinInAmount",
            type: "u128"
          },
          {
            name: "swapPcOutAmount",
            type: "u128"
          },
          {
            name: "swapTakePcFee",
            type: "u64"
          },
          {
            name: "swapPcInAmount",
            type: "u128"
          },
          {
            name: "swapCoinOutAmount",
            type: "u128"
          },
          {
            name: "swapTakeCoinFee",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "AmmConfig",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pnlOwner",
            type: "publicKey"
          },
          {
            name: "cancelOwner",
            type: "publicKey"
          },
          {
            name: "pending1",
            type: {
              array: ["u64", 28]
            }
          },
          {
            name: "pending2",
            type: {
              array: ["u64", 32]
            }
          }
        ]
      }
    },
    {
      name: "LastOrderDistance",
      type: {
        kind: "struct",
        fields: [
          {
            name: "lastOrderNumerator",
            type: "u64"
          },
          {
            name: "lastOrderDenominator",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "NeedTake",
      type: {
        kind: "struct",
        fields: [
          {
            name: "needTakePc",
            type: "u64"
          },
          {
            name: "needTakeCoin",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "SwapInstructionBaseIn",
      type: {
        kind: "struct",
        fields: [
          {
            name: "amountIn",
            type: "u64"
          },
          {
            name: "minimumAmountOut",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "SwapInstructionBaseOut",
      type: {
        kind: "struct",
        fields: [
          {
            name: "maxAmountIn",
            type: "u64"
          },
          {
            name: "amountOut",
            type: "u64"
          }
        ]
      }
    }
  ],
  errors: [
    {
      code: 0,
      name: "AlreadyInUse",
      msg: "AlreadyInUse"
    },
    {
      code: 1,
      name: "InvalidProgramAddress",
      msg: "InvalidProgramAddress"
    },
    {
      code: 2,
      name: "ExpectedMint",
      msg: "ExpectedMint"
    },
    {
      code: 3,
      name: "ExpectedAccount",
      msg: "ExpectedAccount"
    },
    {
      code: 4,
      name: "InvalidCoinVault",
      msg: "InvalidCoinVault"
    },
    {
      code: 5,
      name: "InvalidPCVault",
      msg: "InvalidPCVault"
    },
    {
      code: 6,
      name: "InvalidTokenLP",
      msg: "InvalidTokenLP"
    },
    {
      code: 7,
      name: "InvalidDestTokenCoin",
      msg: "InvalidDestTokenCoin"
    },
    {
      code: 8,
      name: "InvalidDestTokenPC",
      msg: "InvalidDestTokenPC"
    },
    {
      code: 9,
      name: "InvalidPoolMint",
      msg: "InvalidPoolMint"
    },
    {
      code: 10,
      name: "InvalidOpenOrders",
      msg: "InvalidOpenOrders"
    },
    {
      code: 11,
      name: "InvalidSerumMarket",
      msg: "InvalidSerumMarket"
    },
    {
      code: 12,
      name: "InvalidSerumProgram",
      msg: "InvalidSerumProgram"
    },
    {
      code: 13,
      name: "InvalidTargetOrders",
      msg: "InvalidTargetOrders"
    },
    {
      code: 14,
      name: "InvalidWithdrawQueue",
      msg: "InvalidWithdrawQueue"
    },
    {
      code: 15,
      name: "InvalidTempLp",
      msg: "InvalidTempLp"
    },
    {
      code: 16,
      name: "InvalidCoinMint",
      msg: "InvalidCoinMint"
    },
    {
      code: 17,
      name: "InvalidPCMint",
      msg: "InvalidPCMint"
    },
    {
      code: 18,
      name: "InvalidOwner",
      msg: "InvalidOwner"
    },
    {
      code: 19,
      name: "InvalidSupply",
      msg: "InvalidSupply"
    },
    {
      code: 20,
      name: "InvalidDelegate",
      msg: "InvalidDelegate"
    },
    {
      code: 21,
      name: "InvalidSignAccount",
      msg: "Invalid Sign Account"
    },
    {
      code: 22,
      name: "InvalidStatus",
      msg: "InvalidStatus"
    },
    {
      code: 23,
      name: "InvalidInstruction",
      msg: "Invalid instruction"
    },
    {
      code: 24,
      name: "WrongAccountsNumber",
      msg: "Wrong accounts number"
    },
    {
      code: 25,
      name: "WithdrawTransferBusy",
      msg: "Withdraw_transfer is busy"
    },
    {
      code: 26,
      name: "WithdrawQueueFull",
      msg: "WithdrawQueue is full"
    },
    {
      code: 27,
      name: "WithdrawQueueEmpty",
      msg: "WithdrawQueue is empty"
    },
    {
      code: 28,
      name: "InvalidParamsSet",
      msg: "Params Set is invalid"
    },
    {
      code: 29,
      name: "InvalidInput",
      msg: "InvalidInput"
    },
    {
      code: 30,
      name: "ExceededSlippage",
      msg: "instruction exceeds desired slippage limit"
    },
    {
      code: 31,
      name: "CalculationExRateFailure",
      msg: "CalculationExRateFailure"
    },
    {
      code: 32,
      name: "CheckedSubOverflow",
      msg: "Checked_Sub Overflow"
    },
    {
      code: 33,
      name: "CheckedAddOverflow",
      msg: "Checked_Add Overflow"
    },
    {
      code: 34,
      name: "CheckedMulOverflow",
      msg: "Checked_Mul Overflow"
    },
    {
      code: 35,
      name: "CheckedDivOverflow",
      msg: "Checked_Div Overflow"
    },
    {
      code: 36,
      name: "CheckedEmptyFunds",
      msg: "Empty Funds"
    },
    {
      code: 37,
      name: "CalcPnlError",
      msg: "Calc pnl error"
    },
    {
      code: 38,
      name: "InvalidSplTokenProgram",
      msg: "InvalidSplTokenProgram"
    },
    {
      code: 39,
      name: "TakePnlError",
      msg: "Take Pnl error"
    },
    {
      code: 40,
      name: "InsufficientFunds",
      msg: "Insufficient funds"
    },
    {
      code: 41,
      name: "ConversionFailure",
      msg: "Conversion to u64 failed with an overflow or underflow"
    },
    {
      code: 42,
      name: "InvalidUserToken",
      msg: "user token input does not match amm"
    },
    {
      code: 43,
      name: "InvalidSrmMint",
      msg: "InvalidSrmMint"
    },
    {
      code: 44,
      name: "InvalidSrmToken",
      msg: "InvalidSrmToken"
    },
    {
      code: 45,
      name: "TooManyOpenOrders",
      msg: "TooManyOpenOrders"
    },
    {
      code: 46,
      name: "OrderAtSlotIsPlaced",
      msg: "OrderAtSlotIsPlaced"
    },
    {
      code: 47,
      name: "InvalidSysProgramAddress",
      msg: "InvalidSysProgramAddress"
    },
    {
      code: 48,
      name: "InvalidFee",
      msg: "The provided fee does not match the program owner's constraints"
    },
    {
      code: 49,
      name: "RepeatCreateAmm",
      msg: "Repeat create amm about market"
    },
    {
      code: 50,
      name: "NotAllowZeroLP",
      msg: "Not allow Zero LP"
    },
    {
      code: 51,
      name: "InvalidCloseAuthority",
      msg: "Token account has a close authority"
    },
    {
      code: 52,
      name: "InvalidFreezeAuthority",
      msg: "Pool token mint has a freeze authority"
    },
    {
      code: 53,
      name: "InvalidReferPCMint",
      msg: "InvalidReferPCMint"
    },
    {
      code: 54,
      name: "InvalidConfigAccount",
      msg: "InvalidConfigAccount"
    },
    {
      code: 55,
      name: "RepeatCreateConfigAccount",
      msg: "Repeat create staking config account"
    },
    {
      code: 56,
      name: "UnknownAmmError",
      msg: "Unknown Amm Error"
    }
  ]
};

// idl/raydium-amm-v3.json
var raydium_amm_v3_default = {
  address: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
  metadata: {
    name: "amm_v3",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Anchor client and source for Raydium concentrated liquidity AMM"
  },
  instructions: [
    {
      name: "close_position",
      docs: [
        "Close the user's position and NFT account. If the NFT mint belongs to token2022, it will also be closed and the funds returned to the NFT owner.",
        "",
        "# Arguments",
        "",
        "* `ctx` - The context of accounts",
        ""
      ],
      discriminator: [123, 134, 81, 0, 49, 68, 98, 98],
      accounts: [
        {
          name: "nft_owner",
          docs: ["The position nft owner"],
          writable: true,
          signer: true
        },
        {
          name: "position_nft_mint",
          docs: ["Mint address bound to the personal position."],
          writable: true
        },
        {
          name: "position_nft_account",
          docs: ["User token account where position NFT be minted to"],
          writable: true
        },
        {
          name: "personal_position",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 111, 115, 105, 116, 105, 111, 110]
              },
              {
                kind: "account",
                path: "position_nft_mint"
              }
            ]
          }
        },
        {
          name: "system_program",
          docs: ["System program to close the position state account"],
          address: "11111111111111111111111111111111"
        },
        {
          name: "token_program",
          docs: ["Token/Token2022 program to close token/mint account"]
        }
      ],
      args: []
    },
    {
      name: "collect_fund_fee",
      docs: [
        "Collect the fund fee accrued to the pool",
        "",
        "# Arguments",
        "",
        "* `ctx` - The context of accounts",
        "* `amount_0_requested` - The maximum amount of token_0 to send",
        "* `amount_1_requested` - The maximum amount of token_1 to send",
        ""
      ],
      discriminator: [167, 138, 78, 149, 223, 194, 6, 126],
      accounts: [
        {
          name: "owner",
          docs: ["Only admin or fund_owner can collect fee now"],
          signer: true
        },
        {
          name: "pool_state",
          docs: ["Pool state stores accumulated protocol fee amount"],
          writable: true
        },
        {
          name: "amm_config",
          docs: ["Amm config account stores fund_owner"]
        },
        {
          name: "token_vault_0",
          docs: ["The address that holds pool tokens for token_0"],
          writable: true
        },
        {
          name: "token_vault_1",
          docs: ["The address that holds pool tokens for token_1"],
          writable: true
        },
        {
          name: "vault_0_mint",
          docs: ["The mint of token vault 0"]
        },
        {
          name: "vault_1_mint",
          docs: ["The mint of token vault 1"]
        },
        {
          name: "recipient_token_account_0",
          docs: [
            "The address that receives the collected token_0 protocol fees"
          ],
          writable: true
        },
        {
          name: "recipient_token_account_1",
          docs: [
            "The address that receives the collected token_1 protocol fees"
          ],
          writable: true
        },
        {
          name: "token_program",
          docs: ["The SPL program to perform token transfers"],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "token_program_2022",
          docs: ["The SPL program 2022 to perform token transfers"],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      args: [
        {
          name: "amount_0_requested",
          type: "u64"
        },
        {
          name: "amount_1_requested",
          type: "u64"
        }
      ]
    },
    {
      name: "collect_protocol_fee",
      docs: [
        "Collect the protocol fee accrued to the pool",
        "",
        "# Arguments",
        "",
        "* `ctx` - The context of accounts",
        "* `amount_0_requested` - The maximum amount of token_0 to send",
        "* `amount_1_requested` - The maximum amount of token_1 to send",
        ""
      ],
      discriminator: [136, 136, 252, 221, 194, 66, 126, 89],
      accounts: [
        {
          name: "owner",
          docs: ["Only admin or config owner can collect fee now"],
          signer: true
        },
        {
          name: "pool_state",
          docs: ["Pool state stores accumulated protocol fee amount"],
          writable: true
        },
        {
          name: "amm_config",
          docs: ["Amm config account stores owner"]
        },
        {
          name: "token_vault_0",
          docs: ["The address that holds pool tokens for token_0"],
          writable: true
        },
        {
          name: "token_vault_1",
          docs: ["The address that holds pool tokens for token_1"],
          writable: true
        },
        {
          name: "vault_0_mint",
          docs: ["The mint of token vault 0"]
        },
        {
          name: "vault_1_mint",
          docs: ["The mint of token vault 1"]
        },
        {
          name: "recipient_token_account_0",
          docs: [
            "The address that receives the collected token_0 protocol fees"
          ],
          writable: true
        },
        {
          name: "recipient_token_account_1",
          docs: [
            "The address that receives the collected token_1 protocol fees"
          ],
          writable: true
        },
        {
          name: "token_program",
          docs: ["The SPL program to perform token transfers"],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "token_program_2022",
          docs: ["The SPL program 2022 to perform token transfers"],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      args: [
        {
          name: "amount_0_requested",
          type: "u64"
        },
        {
          name: "amount_1_requested",
          type: "u64"
        }
      ]
    },
    {
      name: "collect_remaining_rewards",
      docs: [
        "Collect remaining reward token for reward founder",
        "",
        "# Arguments",
        "",
        "* `ctx`- The context of accounts",
        "* `reward_index` - the index to reward info, it must be smaller than 3",
        ""
      ],
      discriminator: [18, 237, 166, 197, 34, 16, 213, 144],
      accounts: [
        {
          name: "reward_funder",
          docs: ["The founder who init reward info previously"],
          signer: true
        },
        {
          name: "funder_token_account",
          docs: ["The funder's reward token account"],
          writable: true
        },
        {
          name: "pool_state",
          docs: ["Set reward for this pool"],
          writable: true
        },
        {
          name: "reward_token_vault",
          docs: [
            "Reward vault transfer remaining token to founder token account"
          ]
        },
        {
          name: "reward_vault_mint",
          docs: ["The mint of reward token vault"]
        },
        {
          name: "token_program",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "token_program_2022",
          docs: ["Token program 2022"],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          name: "memo_program",
          docs: ["memo program"],
          address: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        }
      ],
      args: [
        {
          name: "reward_index",
          type: "u8"
        }
      ]
    },
    {
      name: "create_amm_config",
      docs: [
        "# Arguments",
        "",
        "* `ctx`- The accounts needed by instruction.",
        "* `index` - The index of amm config, there may be multiple config.",
        "* `tick_spacing` - The tickspacing binding with config, cannot be changed.",
        "* `trade_fee_rate` - Trade fee rate, can be changed.",
        "* `protocol_fee_rate` - The rate of protocol fee within trade fee.",
        "* `fund_fee_rate` - The rate of fund fee within trade fee.",
        ""
      ],
      discriminator: [137, 52, 237, 212, 215, 117, 108, 104],
      accounts: [
        {
          name: "owner",
          docs: ["Address to be set as protocol owner."],
          writable: true,
          signer: true,
          address: "GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ"
        },
        {
          name: "amm_config",
          docs: [
            "Initialize config state account to store protocol owner address and fee rates."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [97, 109, 109, 95, 99, 111, 110, 102, 105, 103]
              },
              {
                kind: "arg",
                path: "index"
              }
            ]
          }
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "index",
          type: "u16"
        },
        {
          name: "tick_spacing",
          type: "u16"
        },
        {
          name: "trade_fee_rate",
          type: "u32"
        },
        {
          name: "protocol_fee_rate",
          type: "u32"
        },
        {
          name: "fund_fee_rate",
          type: "u32"
        }
      ]
    },
    {
      name: "create_operation_account",
      docs: [
        "Creates an operation account for the program",
        "",
        "# Arguments",
        "",
        "* `ctx`- The context of accounts",
        ""
      ],
      discriminator: [63, 87, 148, 33, 109, 35, 8, 104],
      accounts: [
        {
          name: "owner",
          docs: ["Address to be set as operation account owner."],
          writable: true,
          signer: true,
          address: "GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ"
        },
        {
          name: "operation_state",
          docs: [
            "Initialize operation state account to store operation owner address and white list mint."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [111, 112, 101, 114, 97, 116, 105, 111, 110]
              }
            ]
          }
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        }
      ],
      args: []
    },
    {
      name: "create_pool",
      docs: [
        "Creates a pool for the given token pair and the initial price",
        "",
        "# Arguments",
        "",
        "* `ctx`- The context of accounts",
        "* `sqrt_price_x64` - the initial sqrt price (amount_token_1 / amount_token_0) of the pool as a Q64.64",
        "Note: The open_time must be smaller than the current block_timestamp on chain."
      ],
      discriminator: [233, 146, 209, 142, 207, 104, 64, 188],
      accounts: [
        {
          name: "pool_creator",
          docs: ["Address paying to create the pool. Can be anyone"],
          writable: true,
          signer: true
        },
        {
          name: "amm_config",
          docs: ["Which config the pool belongs to."]
        },
        {
          name: "pool_state",
          docs: ["Initialize an account to store the pool state"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 111, 111, 108]
              },
              {
                kind: "account",
                path: "amm_config"
              },
              {
                kind: "account",
                path: "token_mint_0"
              },
              {
                kind: "account",
                path: "token_mint_1"
              }
            ]
          }
        },
        {
          name: "token_mint_0",
          docs: ["Token_0 mint, the key must be smaller then token_1 mint."]
        },
        {
          name: "token_mint_1",
          docs: ["Token_1 mint"]
        },
        {
          name: "token_vault_0",
          docs: ["Token_0 vault for the pool"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 111, 111, 108, 95, 118, 97, 117, 108, 116]
              },
              {
                kind: "account",
                path: "pool_state"
              },
              {
                kind: "account",
                path: "token_mint_0"
              }
            ]
          }
        },
        {
          name: "token_vault_1",
          docs: ["Token_1 vault for the pool"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 111, 111, 108, 95, 118, 97, 117, 108, 116]
              },
              {
                kind: "account",
                path: "pool_state"
              },
              {
                kind: "account",
                path: "token_mint_1"
              }
            ]
          }
        },
        {
          name: "observation_state",
          docs: ["Initialize an account to store oracle observations"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [111, 98, 115, 101, 114, 118, 97, 116, 105, 111, 110]
              },
              {
                kind: "account",
                path: "pool_state"
              }
            ]
          }
        },
        {
          name: "tick_array_bitmap",
          docs: [
            "Initialize an account to store if a tick array is initialized."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108,
                  95,
                  116,
                  105,
                  99,
                  107,
                  95,
                  97,
                  114,
                  114,
                  97,
                  121,
                  95,
                  98,
                  105,
                  116,
                  109,
                  97,
                  112,
                  95,
                  101,
                  120,
                  116,
                  101,
                  110,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                kind: "account",
                path: "pool_state"
              }
            ]
          }
        },
        {
          name: "token_program_0",
          docs: ["Spl token program or token program 2022"]
        },
        {
          name: "token_program_1",
          docs: ["Spl token program or token program 2022"]
        },
        {
          name: "system_program",
          docs: ["To create a new program account"],
          address: "11111111111111111111111111111111"
        },
        {
          name: "rent",
          docs: ["Sysvar for program account"],
          address: "SysvarRent111111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "sqrt_price_x64",
          type: "u128"
        },
        {
          name: "open_time",
          type: "u64"
        }
      ]
    },
    {
      name: "create_support_mint_associated",
      docs: [
        "Create support token22 mint account which can create pool and send rewards with ignoring the not support extensions."
      ],
      discriminator: [17, 251, 65, 92, 136, 242, 14, 169],
      accounts: [
        {
          name: "owner",
          docs: ["Address to be set as protocol owner."],
          writable: true,
          signer: true,
          address: "GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ"
        },
        {
          name: "token_mint",
          docs: ["Support token mint"]
        },
        {
          name: "support_mint_associated",
          docs: [
            "Initialize support mint state account to store support mint address and bump."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  115,
                  117,
                  112,
                  112,
                  111,
                  114,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                kind: "account",
                path: "token_mint"
              }
            ]
          }
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        }
      ],
      args: []
    },
    {
      name: "decrease_liquidity",
      docs: [
        '#[deprecated(note = "Use `decrease_liquidity_v2` instead.")]',
        "Decreases liquidity for an existing position",
        "",
        "# Arguments",
        "",
        "* `ctx` -  The context of accounts",
        "* `liquidity` - The amount by which liquidity will be decreased",
        "* `amount_0_min` - The minimum amount of token_0 that should be accounted for the burned liquidity",
        "* `amount_1_min` - The minimum amount of token_1 that should be accounted for the burned liquidity",
        ""
      ],
      discriminator: [160, 38, 208, 111, 104, 91, 44, 1],
      accounts: [
        {
          name: "nft_owner",
          docs: ["The position owner or delegated authority"],
          signer: true
        },
        {
          name: "nft_account",
          docs: ["The token account for the tokenized position"]
        },
        {
          name: "personal_position",
          docs: ["Decrease liquidity for this position"],
          writable: true
        },
        {
          name: "pool_state",
          writable: true
        },
        {
          name: "protocol_position",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 111, 115, 105, 116, 105, 111, 110]
              },
              {
                kind: "account",
                path: "pool_state"
              },
              {
                kind: "account",
                path: "personal_position.tick_lower_index",
                account: "PersonalPositionState"
              },
              {
                kind: "account",
                path: "personal_position.tick_upper_index",
                account: "PersonalPositionState"
              }
            ]
          }
        },
        {
          name: "token_vault_0",
          docs: ["Token_0 vault"],
          writable: true
        },
        {
          name: "token_vault_1",
          docs: ["Token_1 vault"],
          writable: true
        },
        {
          name: "tick_array_lower",
          docs: ["Stores init state for the lower tick"],
          writable: true
        },
        {
          name: "tick_array_upper",
          docs: ["Stores init state for the upper tick"],
          writable: true
        },
        {
          name: "recipient_token_account_0",
          docs: ["The destination token account for receive amount_0"],
          writable: true
        },
        {
          name: "recipient_token_account_1",
          docs: ["The destination token account for receive amount_1"],
          writable: true
        },
        {
          name: "token_program",
          docs: ["SPL program to transfer out tokens"],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "liquidity",
          type: "u128"
        },
        {
          name: "amount_0_min",
          type: "u64"
        },
        {
          name: "amount_1_min",
          type: "u64"
        }
      ]
    },
    {
      name: "decrease_liquidity_v2",
      docs: [
        "Decreases liquidity for an existing position, support Token2022",
        "",
        "# Arguments",
        "",
        "* `ctx` -  The context of accounts",
        "* `liquidity` - The amount by which liquidity will be decreased",
        "* `amount_0_min` - The minimum amount of token_0 that should be accounted for the burned liquidity",
        "* `amount_1_min` - The minimum amount of token_1 that should be accounted for the burned liquidity",
        ""
      ],
      discriminator: [58, 127, 188, 62, 79, 82, 196, 96],
      accounts: [
        {
          name: "nft_owner",
          docs: ["The position owner or delegated authority"],
          signer: true
        },
        {
          name: "nft_account",
          docs: ["The token account for the tokenized position"]
        },
        {
          name: "personal_position",
          docs: ["Decrease liquidity for this position"],
          writable: true
        },
        {
          name: "pool_state",
          writable: true
        },
        {
          name: "protocol_position",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 111, 115, 105, 116, 105, 111, 110]
              },
              {
                kind: "account",
                path: "pool_state"
              },
              {
                kind: "account",
                path: "personal_position.tick_lower_index",
                account: "PersonalPositionState"
              },
              {
                kind: "account",
                path: "personal_position.tick_upper_index",
                account: "PersonalPositionState"
              }
            ]
          }
        },
        {
          name: "token_vault_0",
          docs: ["Token_0 vault"],
          writable: true
        },
        {
          name: "token_vault_1",
          docs: ["Token_1 vault"],
          writable: true
        },
        {
          name: "tick_array_lower",
          docs: ["Stores init state for the lower tick"],
          writable: true
        },
        {
          name: "tick_array_upper",
          docs: ["Stores init state for the upper tick"],
          writable: true
        },
        {
          name: "recipient_token_account_0",
          docs: ["The destination token account for receive amount_0"],
          writable: true
        },
        {
          name: "recipient_token_account_1",
          docs: ["The destination token account for receive amount_1"],
          writable: true
        },
        {
          name: "token_program",
          docs: ["SPL program to transfer out tokens"],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "token_program_2022",
          docs: ["Token program 2022"],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          name: "memo_program",
          docs: ["memo program"],
          address: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        },
        {
          name: "vault_0_mint",
          docs: ["The mint of token vault 0"]
        },
        {
          name: "vault_1_mint",
          docs: ["The mint of token vault 1"]
        }
      ],
      args: [
        {
          name: "liquidity",
          type: "u128"
        },
        {
          name: "amount_0_min",
          type: "u64"
        },
        {
          name: "amount_1_min",
          type: "u64"
        }
      ]
    },
    {
      name: "increase_liquidity",
      docs: [
        '#[deprecated(note = "Use `increase_liquidity_v2` instead.")]',
        "Increases liquidity for an existing position, with amount paid by `payer`",
        "",
        "# Arguments",
        "",
        "* `ctx` - The context of accounts",
        "* `liquidity` - The desired liquidity to be added, can't be zero",
        "* `amount_0_max` - The max amount of token_0 to spend, which serves as a slippage check",
        "* `amount_1_max` - The max amount of token_1 to spend, which serves as a slippage check",
        ""
      ],
      discriminator: [46, 156, 243, 118, 13, 205, 251, 178],
      accounts: [
        {
          name: "nft_owner",
          docs: ["Pays to mint the position"],
          signer: true
        },
        {
          name: "nft_account",
          docs: ["The token account for nft"]
        },
        {
          name: "pool_state",
          writable: true
        },
        {
          name: "protocol_position",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 111, 115, 105, 116, 105, 111, 110]
              },
              {
                kind: "account",
                path: "pool_state"
              },
              {
                kind: "account",
                path: "personal_position.tick_lower_index",
                account: "PersonalPositionState"
              },
              {
                kind: "account",
                path: "personal_position.tick_upper_index",
                account: "PersonalPositionState"
              }
            ]
          }
        },
        {
          name: "personal_position",
          docs: ["Increase liquidity for this position"],
          writable: true
        },
        {
          name: "tick_array_lower",
          docs: ["Stores init state for the lower tick"],
          writable: true
        },
        {
          name: "tick_array_upper",
          docs: ["Stores init state for the upper tick"],
          writable: true
        },
        {
          name: "token_account_0",
          docs: ["The payer's token account for token_0"],
          writable: true
        },
        {
          name: "token_account_1",
          docs: ["The token account spending token_1 to mint the position"],
          writable: true
        },
        {
          name: "token_vault_0",
          docs: ["The address that holds pool tokens for token_0"],
          writable: true
        },
        {
          name: "token_vault_1",
          docs: ["The address that holds pool tokens for token_1"],
          writable: true
        },
        {
          name: "token_program",
          docs: ["Program to create mint account and mint tokens"],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "liquidity",
          type: "u128"
        },
        {
          name: "amount_0_max",
          type: "u64"
        },
        {
          name: "amount_1_max",
          type: "u64"
        }
      ]
    },
    {
      name: "increase_liquidity_v2",
      docs: [
        "Increases liquidity for an existing position, with amount paid by `payer`, support Token2022",
        "",
        "# Arguments",
        "",
        "* `ctx` - The context of accounts",
        "* `liquidity` - The desired liquidity to be added, if zero, calculate liquidity base amount_0 or amount_1 according base_flag",
        "* `amount_0_max` - The max amount of token_0 to spend, which serves as a slippage check",
        "* `amount_1_max` - The max amount of token_1 to spend, which serves as a slippage check",
        "* `base_flag` - must be specified if liquidity is zero, true: calculate liquidity base amount_0_max otherwise base amount_1_max",
        ""
      ],
      discriminator: [133, 29, 89, 223, 69, 238, 176, 10],
      accounts: [
        {
          name: "nft_owner",
          docs: ["Pays to mint the position"],
          signer: true
        },
        {
          name: "nft_account",
          docs: ["The token account for nft"]
        },
        {
          name: "pool_state",
          writable: true
        },
        {
          name: "protocol_position",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 111, 115, 105, 116, 105, 111, 110]
              },
              {
                kind: "account",
                path: "pool_state"
              },
              {
                kind: "account",
                path: "personal_position.tick_lower_index",
                account: "PersonalPositionState"
              },
              {
                kind: "account",
                path: "personal_position.tick_upper_index",
                account: "PersonalPositionState"
              }
            ]
          }
        },
        {
          name: "personal_position",
          docs: ["Increase liquidity for this position"],
          writable: true
        },
        {
          name: "tick_array_lower",
          docs: ["Stores init state for the lower tick"],
          writable: true
        },
        {
          name: "tick_array_upper",
          docs: ["Stores init state for the upper tick"],
          writable: true
        },
        {
          name: "token_account_0",
          docs: ["The payer's token account for token_0"],
          writable: true
        },
        {
          name: "token_account_1",
          docs: ["The token account spending token_1 to mint the position"],
          writable: true
        },
        {
          name: "token_vault_0",
          docs: ["The address that holds pool tokens for token_0"],
          writable: true
        },
        {
          name: "token_vault_1",
          docs: ["The address that holds pool tokens for token_1"],
          writable: true
        },
        {
          name: "token_program",
          docs: ["Program to create mint account and mint tokens"],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "token_program_2022",
          docs: ["Token program 2022"],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          name: "vault_0_mint",
          docs: ["The mint of token vault 0"]
        },
        {
          name: "vault_1_mint",
          docs: ["The mint of token vault 1"]
        }
      ],
      args: [
        {
          name: "liquidity",
          type: "u128"
        },
        {
          name: "amount_0_max",
          type: "u64"
        },
        {
          name: "amount_1_max",
          type: "u64"
        },
        {
          name: "base_flag",
          type: {
            option: "bool"
          }
        }
      ]
    },
    {
      name: "initialize_reward",
      docs: [
        "Initialize a reward info for a given pool and reward index",
        "",
        "# Arguments",
        "",
        "* `ctx`- The context of accounts",
        "* `reward_index` - the index to reward info",
        "* `open_time` - reward open timestamp",
        "* `end_time` - reward end timestamp",
        "* `emissions_per_second_x64` - Token reward per second are earned per unit of liquidity.",
        ""
      ],
      discriminator: [95, 135, 192, 196, 242, 129, 230, 68],
      accounts: [
        {
          name: "reward_funder",
          docs: ["The founder deposit reward token to vault"],
          writable: true,
          signer: true
        },
        {
          name: "funder_token_account",
          writable: true
        },
        {
          name: "amm_config",
          docs: ["For check the reward_funder authority"]
        },
        {
          name: "pool_state",
          docs: ["Set reward for this pool"],
          writable: true
        },
        {
          name: "operation_state",
          docs: ["load info from the account to judge reward permission"],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [111, 112, 101, 114, 97, 116, 105, 111, 110]
              }
            ]
          }
        },
        {
          name: "reward_token_mint",
          docs: ["Reward mint"]
        },
        {
          name: "reward_token_vault",
          docs: ["A pda, reward vault"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108,
                  95,
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "pool_state"
              },
              {
                kind: "account",
                path: "reward_token_mint"
              }
            ]
          }
        },
        {
          name: "reward_token_program"
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "rent",
          address: "SysvarRent111111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "param",
          type: {
            defined: {
              name: "InitializeRewardParam"
            }
          }
        }
      ]
    },
    {
      name: "open_position",
      docs: [
        '#[deprecated(note = "Use `open_position_with_token22_nft` instead.")]',
        "Creates a new position wrapped in a NFT",
        "",
        "# Arguments",
        "",
        "* `ctx` - The context of accounts",
        "* `tick_lower_index` - The low boundary of market",
        "* `tick_upper_index` - The upper boundary of market",
        "* `tick_array_lower_start_index` - The start index of tick array which include tick low",
        "* `tick_array_upper_start_index` - The start index of tick array which include tick upper",
        "* `liquidity` - The liquidity to be added",
        "* `amount_0_max` - The max amount of token_0 to spend, which serves as a slippage check",
        "* `amount_1_max` - The max amount of token_1 to spend, which serves as a slippage check",
        ""
      ],
      discriminator: [135, 128, 47, 77, 15, 152, 240, 49],
      accounts: [
        {
          name: "payer",
          docs: ["Pays to mint the position"],
          writable: true,
          signer: true
        },
        {
          name: "position_nft_owner"
        },
        {
          name: "position_nft_mint",
          docs: ["Unique token mint address"],
          writable: true,
          signer: true
        },
        {
          name: "position_nft_account",
          docs: [
            "Token account where position NFT will be minted",
            "This account created in the contract by cpi to avoid large stack variables"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "position_nft_owner"
              },
              {
                kind: "const",
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                kind: "account",
                path: "position_nft_mint"
              }
            ],
            program: {
              kind: "const",
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          name: "metadata_account",
          docs: ["To store metaplex metadata"],
          writable: true
        },
        {
          name: "pool_state",
          docs: ["Add liquidity for this pool"],
          writable: true
        },
        {
          name: "protocol_position",
          docs: ["Store the information of market marking in range"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 111, 115, 105, 116, 105, 111, 110]
              },
              {
                kind: "account",
                path: "pool_state"
              },
              {
                kind: "arg",
                path: "tick_lower_index"
              },
              {
                kind: "arg",
                path: "tick_upper_index"
              }
            ]
          }
        },
        {
          name: "tick_array_lower",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [116, 105, 99, 107, 95, 97, 114, 114, 97, 121]
              },
              {
                kind: "account",
                path: "pool_state"
              },
              {
                kind: "arg",
                path: "tick_array_lower_start_index"
              }
            ]
          }
        },
        {
          name: "tick_array_upper",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [116, 105, 99, 107, 95, 97, 114, 114, 97, 121]
              },
              {
                kind: "account",
                path: "pool_state"
              },
              {
                kind: "arg",
                path: "tick_array_upper_start_index"
              }
            ]
          }
        },
        {
          name: "personal_position",
          docs: ["personal position state"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 111, 115, 105, 116, 105, 111, 110]
              },
              {
                kind: "account",
                path: "position_nft_mint"
              }
            ]
          }
        },
        {
          name: "token_account_0",
          docs: ["The token_0 account deposit token to the pool"],
          writable: true
        },
        {
          name: "token_account_1",
          docs: ["The token_1 account deposit token to the pool"],
          writable: true
        },
        {
          name: "token_vault_0",
          docs: ["The address that holds pool tokens for token_0"],
          writable: true
        },
        {
          name: "token_vault_1",
          docs: ["The address that holds pool tokens for token_1"],
          writable: true
        },
        {
          name: "rent",
          docs: ["Sysvar for token mint and ATA creation"],
          address: "SysvarRent111111111111111111111111111111111"
        },
        {
          name: "system_program",
          docs: ["Program to create the position manager state account"],
          address: "11111111111111111111111111111111"
        },
        {
          name: "token_program",
          docs: ["Program to create mint account and mint tokens"],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "associated_token_program",
          docs: ["Program to create an ATA for receiving position NFT"],
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          name: "metadata_program",
          docs: ["Program to create NFT metadata"],
          address: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        }
      ],
      args: [
        {
          name: "tick_lower_index",
          type: "i32"
        },
        {
          name: "tick_upper_index",
          type: "i32"
        },
        {
          name: "tick_array_lower_start_index",
          type: "i32"
        },
        {
          name: "tick_array_upper_start_index",
          type: "i32"
        },
        {
          name: "liquidity",
          type: "u128"
        },
        {
          name: "amount_0_max",
          type: "u64"
        },
        {
          name: "amount_1_max",
          type: "u64"
        }
      ]
    },
    {
      name: "open_position_v2",
      docs: [
        '#[deprecated(note = "Use `open_position_with_token22_nft` instead.")]',
        "Creates a new position wrapped in a NFT, support Token2022",
        "",
        "# Arguments",
        "",
        "* `ctx` - The context of accounts",
        "* `tick_lower_index` - The low boundary of market",
        "* `tick_upper_index` - The upper boundary of market",
        "* `tick_array_lower_start_index` - The start index of tick array which include tick low",
        "* `tick_array_upper_start_index` - The start index of tick array which include tick upper",
        "* `liquidity` - The liquidity to be added, if zero, and the base_flag is specified, calculate liquidity base amount_0_max or amount_1_max according base_flag, otherwise open position with zero liquidity",
        "* `amount_0_max` - The max amount of token_0 to spend, which serves as a slippage check",
        "* `amount_1_max` - The max amount of token_1 to spend, which serves as a slippage check",
        "* `with_metadata` - The flag indicating whether to create NFT mint metadata",
        "* `base_flag` - if the liquidity specified as zero, true: calculate liquidity base amount_0_max otherwise base amount_1_max",
        ""
      ],
      discriminator: [77, 184, 74, 214, 112, 86, 241, 199],
      accounts: [
        {
          name: "payer",
          docs: ["Pays to mint the position"],
          writable: true,
          signer: true
        },
        {
          name: "position_nft_owner"
        },
        {
          name: "position_nft_mint",
          docs: ["Unique token mint address"],
          writable: true,
          signer: true
        },
        {
          name: "position_nft_account",
          docs: ["Token account where position NFT will be minted"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "position_nft_owner"
              },
              {
                kind: "const",
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                kind: "account",
                path: "position_nft_mint"
              }
            ],
            program: {
              kind: "const",
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          name: "metadata_account",
          docs: ["To store metaplex metadata"],
          writable: true
        },
        {
          name: "pool_state",
          docs: ["Add liquidity for this pool"],
          writable: true
        },
        {
          name: "protocol_position",
          docs: ["Store the information of market marking in range"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 111, 115, 105, 116, 105, 111, 110]
              },
              {
                kind: "account",
                path: "pool_state"
              },
              {
                kind: "arg",
                path: "tick_lower_index"
              },
              {
                kind: "arg",
                path: "tick_upper_index"
              }
            ]
          }
        },
        {
          name: "tick_array_lower",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [116, 105, 99, 107, 95, 97, 114, 114, 97, 121]
              },
              {
                kind: "account",
                path: "pool_state"
              },
              {
                kind: "arg",
                path: "tick_array_lower_start_index"
              }
            ]
          }
        },
        {
          name: "tick_array_upper",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [116, 105, 99, 107, 95, 97, 114, 114, 97, 121]
              },
              {
                kind: "account",
                path: "pool_state"
              },
              {
                kind: "arg",
                path: "tick_array_upper_start_index"
              }
            ]
          }
        },
        {
          name: "personal_position",
          docs: ["personal position state"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 111, 115, 105, 116, 105, 111, 110]
              },
              {
                kind: "account",
                path: "position_nft_mint"
              }
            ]
          }
        },
        {
          name: "token_account_0",
          docs: ["The token_0 account deposit token to the pool"],
          writable: true
        },
        {
          name: "token_account_1",
          docs: ["The token_1 account deposit token to the pool"],
          writable: true
        },
        {
          name: "token_vault_0",
          docs: ["The address that holds pool tokens for token_0"],
          writable: true
        },
        {
          name: "token_vault_1",
          docs: ["The address that holds pool tokens for token_1"],
          writable: true
        },
        {
          name: "rent",
          docs: ["Sysvar for token mint and ATA creation"],
          address: "SysvarRent111111111111111111111111111111111"
        },
        {
          name: "system_program",
          docs: ["Program to create the position manager state account"],
          address: "11111111111111111111111111111111"
        },
        {
          name: "token_program",
          docs: ["Program to create mint account and mint tokens"],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "associated_token_program",
          docs: ["Program to create an ATA for receiving position NFT"],
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          name: "metadata_program",
          docs: ["Program to create NFT metadata"],
          address: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        },
        {
          name: "token_program_2022",
          docs: ["Program to create mint account and mint tokens"],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          name: "vault_0_mint",
          docs: ["The mint of token vault 0"]
        },
        {
          name: "vault_1_mint",
          docs: ["The mint of token vault 1"]
        }
      ],
      args: [
        {
          name: "tick_lower_index",
          type: "i32"
        },
        {
          name: "tick_upper_index",
          type: "i32"
        },
        {
          name: "tick_array_lower_start_index",
          type: "i32"
        },
        {
          name: "tick_array_upper_start_index",
          type: "i32"
        },
        {
          name: "liquidity",
          type: "u128"
        },
        {
          name: "amount_0_max",
          type: "u64"
        },
        {
          name: "amount_1_max",
          type: "u64"
        },
        {
          name: "with_metadata",
          type: "bool"
        },
        {
          name: "base_flag",
          type: {
            option: "bool"
          }
        }
      ]
    },
    {
      name: "open_position_with_token22_nft",
      docs: [
        "Creates a new position wrapped in a Token2022 NFT without relying on metadata_program and metadata_account, reduce the cost for user to create a personal position.",
        "",
        "# Arguments",
        "",
        "* `ctx` - The context of accounts",
        "* `tick_lower_index` - The low boundary of market",
        "* `tick_upper_index` - The upper boundary of market",
        "* `tick_array_lower_start_index` - The start index of tick array which include tick low",
        "* `tick_array_upper_start_index` - The start index of tick array which include tick upper",
        "* `liquidity` - The liquidity to be added, if zero, and the base_flag is specified, calculate liquidity base amount_0_max or amount_1_max according base_flag, otherwise open position with zero liquidity",
        "* `amount_0_max` - The max amount of token_0 to spend, which serves as a slippage check",
        "* `amount_1_max` - The max amount of token_1 to spend, which serves as a slippage check",
        "* `with_metadata` - The flag indicating whether to create NFT mint metadata",
        "* `base_flag` - if the liquidity specified as zero, true: calculate liquidity base amount_0_max otherwise base amount_1_max",
        ""
      ],
      discriminator: [77, 255, 174, 82, 125, 29, 201, 46],
      accounts: [
        {
          name: "payer",
          docs: ["Pays to mint the position"],
          writable: true,
          signer: true
        },
        {
          name: "position_nft_owner"
        },
        {
          name: "position_nft_mint",
          docs: ["Unique token mint address, initialize in contract"],
          writable: true,
          signer: true
        },
        {
          name: "position_nft_account",
          writable: true
        },
        {
          name: "pool_state",
          docs: ["Add liquidity for this pool"],
          writable: true
        },
        {
          name: "protocol_position",
          docs: ["Store the information of market marking in range"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 111, 115, 105, 116, 105, 111, 110]
              },
              {
                kind: "account",
                path: "pool_state"
              },
              {
                kind: "arg",
                path: "tick_lower_index"
              },
              {
                kind: "arg",
                path: "tick_upper_index"
              }
            ]
          }
        },
        {
          name: "tick_array_lower",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [116, 105, 99, 107, 95, 97, 114, 114, 97, 121]
              },
              {
                kind: "account",
                path: "pool_state"
              },
              {
                kind: "arg",
                path: "tick_array_lower_start_index"
              }
            ]
          }
        },
        {
          name: "tick_array_upper",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [116, 105, 99, 107, 95, 97, 114, 114, 97, 121]
              },
              {
                kind: "account",
                path: "pool_state"
              },
              {
                kind: "arg",
                path: "tick_array_upper_start_index"
              }
            ]
          }
        },
        {
          name: "personal_position",
          docs: ["personal position state"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 111, 115, 105, 116, 105, 111, 110]
              },
              {
                kind: "account",
                path: "position_nft_mint"
              }
            ]
          }
        },
        {
          name: "token_account_0",
          docs: ["The token_0 account deposit token to the pool"],
          writable: true
        },
        {
          name: "token_account_1",
          docs: ["The token_1 account deposit token to the pool"],
          writable: true
        },
        {
          name: "token_vault_0",
          docs: ["The address that holds pool tokens for token_0"],
          writable: true
        },
        {
          name: "token_vault_1",
          docs: ["The address that holds pool tokens for token_1"],
          writable: true
        },
        {
          name: "rent",
          docs: ["Sysvar for token mint and ATA creation"],
          address: "SysvarRent111111111111111111111111111111111"
        },
        {
          name: "system_program",
          docs: ["Program to create the position manager state account"],
          address: "11111111111111111111111111111111"
        },
        {
          name: "token_program",
          docs: ["Program to transfer for token account"],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "associated_token_program",
          docs: ["Program to create an ATA for receiving position NFT"],
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          name: "token_program_2022",
          docs: [
            "Program to create NFT mint/token account and transfer for token22 account"
          ],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          name: "vault_0_mint",
          docs: ["The mint of token vault 0"]
        },
        {
          name: "vault_1_mint",
          docs: ["The mint of token vault 1"]
        }
      ],
      args: [
        {
          name: "tick_lower_index",
          type: "i32"
        },
        {
          name: "tick_upper_index",
          type: "i32"
        },
        {
          name: "tick_array_lower_start_index",
          type: "i32"
        },
        {
          name: "tick_array_upper_start_index",
          type: "i32"
        },
        {
          name: "liquidity",
          type: "u128"
        },
        {
          name: "amount_0_max",
          type: "u64"
        },
        {
          name: "amount_1_max",
          type: "u64"
        },
        {
          name: "with_metadata",
          type: "bool"
        },
        {
          name: "base_flag",
          type: {
            option: "bool"
          }
        }
      ]
    },
    {
      name: "set_reward_params",
      docs: [
        "Reset reward param, start a new reward cycle or extend the current cycle.",
        "",
        "# Arguments",
        "",
        "* `ctx` - The context of accounts",
        "* `reward_index` - The index of reward token in the pool, it must be smaller than 3",
        "* `emissions_per_second_x64` - The per second emission reward, when extend the current cycle,",
        "new value can't be less than old value",
        "* `open_time` - reward open timestamp, must be set when starting a new cycle",
        "* `end_time` - reward end timestamp",
        ""
      ],
      discriminator: [112, 52, 167, 75, 32, 201, 211, 137],
      accounts: [
        {
          name: "authority",
          docs: [
            "Address to be set as protocol owner. It pays to create factory state account."
          ],
          signer: true
        },
        {
          name: "amm_config"
        },
        {
          name: "pool_state",
          writable: true
        },
        {
          name: "operation_state",
          docs: ["load info from the account to judge reward permission"],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [111, 112, 101, 114, 97, 116, 105, 111, 110]
              }
            ]
          }
        },
        {
          name: "token_program",
          docs: ["Token program"],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "token_program_2022",
          docs: ["Token program 2022"],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      args: [
        {
          name: "reward_index",
          type: "u8"
        },
        {
          name: "emissions_per_second_x64",
          type: "u128"
        },
        {
          name: "open_time",
          type: "u64"
        },
        {
          name: "end_time",
          type: "u64"
        }
      ]
    },
    {
      name: "swap",
      docs: [
        '#[deprecated(note = "Use `swap_v2` instead.")]',
        "Swaps one token for as much as possible of another token across a single pool",
        "",
        "# Arguments",
        "",
        "* `ctx` - The context of accounts",
        "* `amount` - Arranged in pairs with other_amount_threshold. (amount_in, amount_out_minimum) or (amount_out, amount_in_maximum)",
        "* `other_amount_threshold` - For slippage check",
        "* `sqrt_price_limit_x64` - The Q64.64 format \u221AP limit price, and if it is 0, the maximum and minimum prices that can be reached are set by default according to the swap direction.",
        "* `is_base_input` - swap base input or swap base output",
        ""
      ],
      discriminator: [248, 198, 158, 145, 225, 117, 135, 200],
      accounts: [
        {
          name: "payer",
          docs: ["The user performing the swap"],
          signer: true
        },
        {
          name: "amm_config",
          docs: ["The factory state to read protocol fees"]
        },
        {
          name: "pool_state",
          docs: [
            "The program account of the pool in which the swap will be performed"
          ],
          writable: true
        },
        {
          name: "input_token_account",
          docs: ["The user token account for input token"],
          writable: true
        },
        {
          name: "output_token_account",
          docs: ["The user token account for output token"],
          writable: true
        },
        {
          name: "input_vault",
          docs: ["The vault token account for input token"],
          writable: true
        },
        {
          name: "output_vault",
          docs: ["The vault token account for output token"],
          writable: true
        },
        {
          name: "observation_state",
          docs: [
            "The program account for the most recent oracle observation"
          ],
          writable: true
        },
        {
          name: "token_program",
          docs: ["SPL program for token transfers"],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "tick_array",
          writable: true
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        },
        {
          name: "other_amount_threshold",
          type: "u64"
        },
        {
          name: "sqrt_price_limit_x64",
          type: "u128"
        },
        {
          name: "is_base_input",
          type: "bool"
        }
      ]
    },
    {
      name: "swap_router_base_in",
      docs: [
        "Swap token for as much as possible of another token across the path provided, base input",
        "",
        "# Arguments",
        "",
        "* `ctx` - The context of accounts",
        "* `amount_in` - Token amount to be swapped in",
        "* `amount_out_minimum` - Minimum output amount for slip control"
      ],
      discriminator: [69, 125, 115, 218, 245, 186, 242, 196],
      accounts: [
        {
          name: "payer",
          docs: ["The user performing the swap"],
          signer: true
        },
        {
          name: "input_token_account",
          docs: ["The token account that pays input tokens for the swap"],
          writable: true
        },
        {
          name: "input_token_mint",
          docs: ["The mint of input token"],
          writable: true
        },
        {
          name: "token_program",
          docs: ["SPL program for token transfers"],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "token_program_2022",
          docs: ["SPL program 2022 for token transfers"],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          name: "memo_program",
          docs: ["Memo program"],
          address: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        }
      ],
      args: [
        {
          name: "amount_in",
          type: "u64"
        },
        {
          name: "amount_out_minimum",
          type: "u64"
        }
      ]
    },
    {
      name: "swap_v2",
      docs: [
        "Swaps one token for as much as possible of another token across a single pool, support token program 2022",
        "",
        "# Arguments",
        "",
        "* `ctx` - The context of accounts",
        "* `amount` - Arranged in pairs with other_amount_threshold. (amount_in, amount_out_minimum) or (amount_out, amount_in_maximum)",
        "* `other_amount_threshold` - For slippage check",
        "* `sqrt_price_limit` - The Q64.64 format \u221AP limit price, and if it is 0, the maximum and minimum prices that can be reached are set by default according to the swap direction.",
        "* `is_base_input` - swap base input or swap base output",
        ""
      ],
      discriminator: [43, 4, 237, 11, 26, 201, 30, 98],
      accounts: [
        {
          name: "payer",
          docs: ["The user performing the swap"],
          signer: true
        },
        {
          name: "amm_config",
          docs: ["The factory state to read protocol fees"]
        },
        {
          name: "pool_state",
          docs: [
            "The program account of the pool in which the swap will be performed"
          ],
          writable: true
        },
        {
          name: "input_token_account",
          docs: ["The user token account for input token"],
          writable: true
        },
        {
          name: "output_token_account",
          docs: ["The user token account for output token"],
          writable: true
        },
        {
          name: "input_vault",
          docs: ["The vault token account for input token"],
          writable: true
        },
        {
          name: "output_vault",
          docs: ["The vault token account for output token"],
          writable: true
        },
        {
          name: "observation_state",
          docs: [
            "The program account for the most recent oracle observation"
          ],
          writable: true
        },
        {
          name: "token_program",
          docs: ["SPL program for token transfers"],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "token_program_2022",
          docs: ["SPL program 2022 for token transfers"],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          name: "memo_program",
          docs: ["Memo program"],
          address: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        },
        {
          name: "input_vault_mint",
          docs: ["The mint of token vault 0"]
        },
        {
          name: "output_vault_mint",
          docs: ["The mint of token vault 1"]
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        },
        {
          name: "other_amount_threshold",
          type: "u64"
        },
        {
          name: "sqrt_price_limit_x64",
          type: "u128"
        },
        {
          name: "is_base_input",
          type: "bool"
        }
      ]
    },
    {
      name: "transfer_reward_owner",
      docs: [
        "Transfer reward owner",
        "",
        "# Arguments",
        "",
        "* `ctx`- The context of accounts",
        "* `new_owner`- new owner pubkey",
        ""
      ],
      discriminator: [7, 22, 12, 83, 242, 43, 48, 121],
      accounts: [
        {
          name: "authority",
          docs: ["Address to be set as operation account owner."],
          signer: true,
          address: "GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ"
        },
        {
          name: "pool_state",
          writable: true
        }
      ],
      args: [
        {
          name: "new_owner",
          type: "pubkey"
        }
      ]
    },
    {
      name: "update_amm_config",
      docs: [
        "Updates the owner of the amm config",
        "Must be called by the current owner or admin",
        "",
        "# Arguments",
        "",
        "* `ctx`- The context of accounts",
        "* `trade_fee_rate`- The new trade fee rate of amm config, be set when `param` is 0",
        "* `protocol_fee_rate`- The new protocol fee rate of amm config, be set when `param` is 1",
        "* `fund_fee_rate`- The new fund fee rate of amm config, be set when `param` is 2",
        "* `new_owner`- The config's new owner, be set when `param` is 3",
        "* `new_fund_owner`- The config's new fund owner, be set when `param` is 4",
        "* `param`- The value can be 0 | 1 | 2 | 3 | 4, otherwise will report a error",
        ""
      ],
      discriminator: [49, 60, 174, 136, 154, 28, 116, 200],
      accounts: [
        {
          name: "owner",
          docs: ["The amm config owner or admin"],
          signer: true,
          address: "GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ"
        },
        {
          name: "amm_config",
          docs: ["Amm config account to be changed"],
          writable: true
        }
      ],
      args: [
        {
          name: "param",
          type: "u8"
        },
        {
          name: "value",
          type: "u32"
        }
      ]
    },
    {
      name: "update_operation_account",
      docs: [
        "Update the operation account",
        "",
        "# Arguments",
        "",
        "* `ctx`- The context of accounts",
        "* `param`- The value can be 0 | 1 | 2 | 3, otherwise will report a error",
        "* `keys`- update operation owner when the `param` is 0",
        "remove operation owner when the `param` is 1",
        "update whitelist mint when the `param` is 2",
        "remove whitelist mint when the `param` is 3",
        ""
      ],
      discriminator: [127, 70, 119, 40, 188, 227, 61, 7],
      accounts: [
        {
          name: "owner",
          docs: ["Address to be set as operation account owner."],
          signer: true,
          address: "GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ"
        },
        {
          name: "operation_state",
          docs: [
            "Initialize operation state account to store operation owner address and white list mint."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [111, 112, 101, 114, 97, 116, 105, 111, 110]
              }
            ]
          }
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "param",
          type: "u8"
        },
        {
          name: "keys",
          type: {
            vec: "pubkey"
          }
        }
      ]
    },
    {
      name: "update_pool_status",
      docs: [
        "Update pool status for given value",
        "",
        "# Arguments",
        "",
        "* `ctx`- The context of accounts",
        "* `status` - The value of status",
        ""
      ],
      discriminator: [130, 87, 108, 6, 46, 224, 117, 123],
      accounts: [
        {
          name: "authority",
          signer: true,
          address: "GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ"
        },
        {
          name: "pool_state",
          writable: true
        }
      ],
      args: [
        {
          name: "status",
          type: "u8"
        }
      ]
    },
    {
      name: "update_reward_infos",
      docs: [
        "Update rewards info of the given pool, can be called for everyone",
        "",
        "# Arguments",
        "",
        "* `ctx`- The context of accounts",
        ""
      ],
      discriminator: [163, 172, 224, 52, 11, 154, 106, 223],
      accounts: [
        {
          name: "pool_state",
          docs: ["The liquidity pool for which reward info to update"],
          writable: true
        }
      ],
      args: []
    }
  ],
  accounts: [
    {
      name: "AmmConfig",
      discriminator: [218, 244, 33, 104, 203, 203, 43, 111]
    },
    {
      name: "ObservationState",
      discriminator: [122, 174, 197, 53, 129, 9, 165, 132]
    },
    {
      name: "OperationState",
      discriminator: [19, 236, 58, 237, 81, 222, 183, 252]
    },
    {
      name: "PersonalPositionState",
      discriminator: [70, 111, 150, 126, 230, 15, 25, 117]
    },
    {
      name: "PoolState",
      discriminator: [247, 237, 227, 245, 215, 195, 222, 70]
    },
    {
      name: "ProtocolPositionState",
      discriminator: [100, 226, 145, 99, 146, 218, 160, 106]
    },
    {
      name: "SupportMintAssociated",
      discriminator: [134, 40, 183, 79, 12, 112, 162, 53]
    },
    {
      name: "TickArrayBitmapExtension",
      discriminator: [60, 150, 36, 219, 97, 128, 139, 153]
    },
    {
      name: "TickArrayState",
      discriminator: [192, 155, 85, 205, 49, 249, 129, 42]
    }
  ],
  events: [
    {
      name: "CollectPersonalFeeEvent",
      discriminator: [166, 174, 105, 192, 81, 161, 83, 105]
    },
    {
      name: "CollectProtocolFeeEvent",
      discriminator: [206, 87, 17, 79, 45, 41, 213, 61]
    },
    {
      name: "ConfigChangeEvent",
      discriminator: [247, 189, 7, 119, 106, 112, 95, 151]
    },
    {
      name: "CreatePersonalPositionEvent",
      discriminator: [100, 30, 87, 249, 196, 223, 154, 206]
    },
    {
      name: "DecreaseLiquidityEvent",
      discriminator: [58, 222, 86, 58, 68, 50, 85, 56]
    },
    {
      name: "IncreaseLiquidityEvent",
      discriminator: [49, 79, 105, 212, 32, 34, 30, 84]
    },
    {
      name: "LiquidityCalculateEvent",
      discriminator: [237, 112, 148, 230, 57, 84, 180, 162]
    },
    {
      name: "LiquidityChangeEvent",
      discriminator: [126, 240, 175, 206, 158, 88, 153, 107]
    },
    {
      name: "PoolCreatedEvent",
      discriminator: [25, 94, 75, 47, 112, 99, 53, 63]
    },
    {
      name: "SwapEvent",
      discriminator: [64, 198, 205, 232, 38, 8, 113, 226]
    },
    {
      name: "UpdateRewardInfosEvent",
      discriminator: [109, 127, 186, 78, 114, 65, 37, 236]
    }
  ],
  errors: [
    {
      code: 6e3,
      name: "LOK",
      msg: "LOK"
    },
    {
      code: 6001,
      name: "NotApproved",
      msg: "Not approved"
    },
    {
      code: 6002,
      name: "InvalidUpdateConfigFlag",
      msg: "invalid update amm config flag"
    },
    {
      code: 6003,
      name: "AccountLack",
      msg: "Account lack"
    },
    {
      code: 6004,
      name: "ClosePositionErr",
      msg: "Remove liquitity, collect fees owed and reward then you can close position account"
    },
    {
      code: 6005,
      name: "ZeroMintAmount",
      msg: "Minting amount should be greater than 0"
    },
    {
      code: 6006,
      name: "InvalidTickIndex",
      msg: "Tick out of range"
    },
    {
      code: 6007,
      name: "TickInvalidOrder",
      msg: "The lower tick must be below the upper tick"
    },
    {
      code: 6008,
      name: "TickLowerOverflow",
      msg: "The tick must be greater, or equal to the minimum tick(-443636)"
    },
    {
      code: 6009,
      name: "TickUpperOverflow",
      msg: "The tick must be lesser than, or equal to the maximum tick(443636)"
    },
    {
      code: 6010,
      name: "TickAndSpacingNotMatch",
      msg: "tick % tick_spacing must be zero"
    },
    {
      code: 6011,
      name: "InvalidTickArray",
      msg: "Invalid tick array account"
    },
    {
      code: 6012,
      name: "InvalidTickArrayBoundary",
      msg: "Invalid tick array boundary"
    },
    {
      code: 6013,
      name: "SqrtPriceLimitOverflow",
      msg: "Square root price limit overflow"
    },
    {
      code: 6014,
      name: "SqrtPriceX64",
      msg: "sqrt_price_x64 out of range"
    },
    {
      code: 6015,
      name: "LiquiditySubValueErr",
      msg: "Liquidity sub delta L must be smaller than before"
    },
    {
      code: 6016,
      name: "LiquidityAddValueErr",
      msg: "Liquidity add delta L must be greater, or equal to before"
    },
    {
      code: 6017,
      name: "InvalidLiquidity",
      msg: "Invalid liquidity when update position"
    },
    {
      code: 6018,
      name: "ForbidBothZeroForSupplyLiquidity",
      msg: "Both token amount must not be zero while supply liquidity"
    },
    {
      code: 6019,
      name: "LiquidityInsufficient",
      msg: "Liquidity insufficient"
    },
    {
      code: 6020,
      name: "TransactionTooOld",
      msg: "Transaction too old"
    },
    {
      code: 6021,
      name: "PriceSlippageCheck",
      msg: "Price slippage check"
    },
    {
      code: 6022,
      name: "TooLittleOutputReceived",
      msg: "Too little output received"
    },
    {
      code: 6023,
      name: "TooMuchInputPaid",
      msg: "Too much input paid"
    },
    {
      code: 6024,
      name: "ZeroAmountSpecified",
      msg: "Swap special amount can not be zero"
    },
    {
      code: 6025,
      name: "InvalidInputPoolVault",
      msg: "Input pool vault is invalid"
    },
    {
      code: 6026,
      name: "TooSmallInputOrOutputAmount",
      msg: "Swap input or output amount is too small"
    },
    {
      code: 6027,
      name: "NotEnoughTickArrayAccount",
      msg: "Not enought tick array account"
    },
    {
      code: 6028,
      name: "InvalidFirstTickArrayAccount",
      msg: "Invalid first tick array account"
    },
    {
      code: 6029,
      name: "InvalidRewardIndex",
      msg: "Invalid reward index"
    },
    {
      code: 6030,
      name: "FullRewardInfo",
      msg: "The init reward token reach to the max"
    },
    {
      code: 6031,
      name: "RewardTokenAlreadyInUse",
      msg: "The init reward token already in use"
    },
    {
      code: 6032,
      name: "ExceptRewardMint",
      msg: "The reward tokens must contain one of pool vault mint except the last reward"
    },
    {
      code: 6033,
      name: "InvalidRewardInitParam",
      msg: "Invalid reward init param"
    },
    {
      code: 6034,
      name: "InvalidRewardDesiredAmount",
      msg: "Invalid collect reward desired amount"
    },
    {
      code: 6035,
      name: "InvalidRewardInputAccountNumber",
      msg: "Invalid collect reward input account number"
    },
    {
      code: 6036,
      name: "InvalidRewardPeriod",
      msg: "Invalid reward period"
    },
    {
      code: 6037,
      name: "NotApproveUpdateRewardEmissiones",
      msg: "Modification of emissiones is allowed within 72 hours from the end of the previous cycle"
    },
    {
      code: 6038,
      name: "UnInitializedRewardInfo",
      msg: "uninitialized reward info"
    },
    {
      code: 6039,
      name: "NotSupportMint",
      msg: "Not support token_2022 mint extension"
    },
    {
      code: 6040,
      name: "MissingTickArrayBitmapExtensionAccount",
      msg: "Missing tickarray bitmap extension account"
    },
    {
      code: 6041,
      name: "InsufficientLiquidityForDirection",
      msg: "Insufficient liquidity for this direction"
    },
    {
      code: 6042,
      name: "MaxTokenOverflow",
      msg: "Max token overflow"
    },
    {
      code: 6043,
      name: "CalculateOverflow",
      msg: "Calculate overflow"
    },
    {
      code: 6044,
      name: "TransferFeeCalculateNotMatch",
      msg: "TransferFee calculate not match"
    }
  ],
  types: [
    {
      name: "AmmConfig",
      docs: ["Holds the current owner of the factory"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            docs: ["Bump to identify PDA"],
            type: "u8"
          },
          {
            name: "index",
            type: "u16"
          },
          {
            name: "owner",
            docs: ["Address of the protocol owner"],
            type: "pubkey"
          },
          {
            name: "protocol_fee_rate",
            docs: ["The protocol fee"],
            type: "u32"
          },
          {
            name: "trade_fee_rate",
            docs: [
              "The trade fee, denominated in hundredths of a bip (10^-6)"
            ],
            type: "u32"
          },
          {
            name: "tick_spacing",
            docs: ["The tick spacing"],
            type: "u16"
          },
          {
            name: "fund_fee_rate",
            docs: [
              "The fund fee, denominated in hundredths of a bip (10^-6)"
            ],
            type: "u32"
          },
          {
            name: "padding_u32",
            type: "u32"
          },
          {
            name: "fund_owner",
            type: "pubkey"
          },
          {
            name: "padding",
            type: {
              array: ["u64", 3]
            }
          }
        ]
      }
    },
    {
      name: "CollectPersonalFeeEvent",
      docs: ["Emitted when tokens are collected for a position"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "position_nft_mint",
            docs: [
              "The ID of the token for which underlying tokens were collected"
            ],
            type: "pubkey"
          },
          {
            name: "recipient_token_account_0",
            docs: [
              "The token account that received the collected token_0 tokens"
            ],
            type: "pubkey"
          },
          {
            name: "recipient_token_account_1",
            docs: [
              "The token account that received the collected token_1 tokens"
            ],
            type: "pubkey"
          },
          {
            name: "amount_0",
            docs: [
              "The amount of token_0 owed to the position that was collected"
            ],
            type: "u64"
          },
          {
            name: "amount_1",
            docs: [
              "The amount of token_1 owed to the position that was collected"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "CollectProtocolFeeEvent",
      docs: [
        "Emitted when the collected protocol fees are withdrawn by the factory owner"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_state",
            docs: ["The pool whose protocol fee is collected"],
            type: "pubkey"
          },
          {
            name: "recipient_token_account_0",
            docs: [
              "The address that receives the collected token_0 protocol fees"
            ],
            type: "pubkey"
          },
          {
            name: "recipient_token_account_1",
            docs: [
              "The address that receives the collected token_1 protocol fees"
            ],
            type: "pubkey"
          },
          {
            name: "amount_0",
            docs: ["The amount of token_0 protocol fees that is withdrawn"],
            type: "u64"
          },
          {
            name: "amount_1",
            docs: ["The amount of token_0 protocol fees that is withdrawn"],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "ConfigChangeEvent",
      docs: ["Emitted when create or update a config"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "index",
            type: "u16"
          },
          {
            name: "owner",
            type: "pubkey"
          },
          {
            name: "protocol_fee_rate",
            type: "u32"
          },
          {
            name: "trade_fee_rate",
            type: "u32"
          },
          {
            name: "tick_spacing",
            type: "u16"
          },
          {
            name: "fund_fee_rate",
            type: "u32"
          },
          {
            name: "fund_owner",
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "CreatePersonalPositionEvent",
      docs: ["Emitted when create a new position"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_state",
            docs: ["The pool for which liquidity was added"],
            type: "pubkey"
          },
          {
            name: "minter",
            docs: ["The address that create the position"],
            type: "pubkey"
          },
          {
            name: "nft_owner",
            docs: [
              "The owner of the position and recipient of any minted liquidity"
            ],
            type: "pubkey"
          },
          {
            name: "tick_lower_index",
            docs: ["The lower tick of the position"],
            type: "i32"
          },
          {
            name: "tick_upper_index",
            docs: ["The upper tick of the position"],
            type: "i32"
          },
          {
            name: "liquidity",
            docs: ["The amount of liquidity minted to the position range"],
            type: "u128"
          },
          {
            name: "deposit_amount_0",
            docs: ["The amount of token_0 was deposit for the liquidity"],
            type: "u64"
          },
          {
            name: "deposit_amount_1",
            docs: ["The amount of token_1 was deposit for the liquidity"],
            type: "u64"
          },
          {
            name: "deposit_amount_0_transfer_fee",
            docs: ["The token transfer fee for deposit_amount_0"],
            type: "u64"
          },
          {
            name: "deposit_amount_1_transfer_fee",
            docs: ["The token transfer fee for deposit_amount_1"],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "DecreaseLiquidityEvent",
      docs: ["Emitted when liquidity is decreased."],
      type: {
        kind: "struct",
        fields: [
          {
            name: "position_nft_mint",
            docs: ["The ID of the token for which liquidity was decreased"],
            type: "pubkey"
          },
          {
            name: "liquidity",
            docs: [
              "The amount by which liquidity for the position was decreased"
            ],
            type: "u128"
          },
          {
            name: "decrease_amount_0",
            docs: [
              "The amount of token_0 that was paid for the decrease in liquidity"
            ],
            type: "u64"
          },
          {
            name: "decrease_amount_1",
            docs: [
              "The amount of token_1 that was paid for the decrease in liquidity"
            ],
            type: "u64"
          },
          {
            name: "fee_amount_0",
            type: "u64"
          },
          {
            name: "fee_amount_1",
            docs: ["The amount of token_1 fee"],
            type: "u64"
          },
          {
            name: "reward_amounts",
            docs: ["The amount of rewards"],
            type: {
              array: ["u64", 3]
            }
          },
          {
            name: "transfer_fee_0",
            docs: ["The amount of token_0 transfer fee"],
            type: "u64"
          },
          {
            name: "transfer_fee_1",
            docs: ["The amount of token_1 transfer fee"],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "IncreaseLiquidityEvent",
      docs: ["Emitted when liquidity is increased."],
      type: {
        kind: "struct",
        fields: [
          {
            name: "position_nft_mint",
            docs: ["The ID of the token for which liquidity was increased"],
            type: "pubkey"
          },
          {
            name: "liquidity",
            docs: [
              "The amount by which liquidity for the NFT position was increased"
            ],
            type: "u128"
          },
          {
            name: "amount_0",
            docs: [
              "The amount of token_0 that was paid for the increase in liquidity"
            ],
            type: "u64"
          },
          {
            name: "amount_1",
            docs: [
              "The amount of token_1 that was paid for the increase in liquidity"
            ],
            type: "u64"
          },
          {
            name: "amount_0_transfer_fee",
            docs: ["The token transfer fee for amount_0"],
            type: "u64"
          },
          {
            name: "amount_1_transfer_fee",
            docs: ["The token transfer fee for amount_1"],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "InitializeRewardParam",
      type: {
        kind: "struct",
        fields: [
          {
            name: "open_time",
            docs: ["Reward open time"],
            type: "u64"
          },
          {
            name: "end_time",
            docs: ["Reward end time"],
            type: "u64"
          },
          {
            name: "emissions_per_second_x64",
            docs: [
              "Token reward per second are earned per unit of liquidity"
            ],
            type: "u128"
          }
        ]
      }
    },
    {
      name: "LiquidityCalculateEvent",
      docs: ["Emitted when liquidity decreased or increase."],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_liquidity",
            docs: ["The pool liquidity before decrease or increase"],
            type: "u128"
          },
          {
            name: "pool_sqrt_price_x64",
            docs: ["The pool price when decrease or increase in liquidity"],
            type: "u128"
          },
          {
            name: "pool_tick",
            docs: ["The pool tick when decrease or increase in liquidity"],
            type: "i32"
          },
          {
            name: "calc_amount_0",
            docs: [
              "The amount of token_0 that was calculated for the decrease or increase in liquidity"
            ],
            type: "u64"
          },
          {
            name: "calc_amount_1",
            docs: [
              "The amount of token_1 that was calculated for the decrease or increase in liquidity"
            ],
            type: "u64"
          },
          {
            name: "trade_fee_owed_0",
            type: "u64"
          },
          {
            name: "trade_fee_owed_1",
            docs: ["The amount of token_1 fee"],
            type: "u64"
          },
          {
            name: "transfer_fee_0",
            docs: [
              "The amount of token_0 transfer fee without trade_fee_amount_0"
            ],
            type: "u64"
          },
          {
            name: "transfer_fee_1",
            docs: [
              "The amount of token_1 transfer fee without trade_fee_amount_0"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "LiquidityChangeEvent",
      docs: [
        "Emitted pool liquidity change when increase and decrease liquidity"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_state",
            docs: ["The pool for swap"],
            type: "pubkey"
          },
          {
            name: "tick",
            docs: ["The tick of the pool"],
            type: "i32"
          },
          {
            name: "tick_lower",
            docs: ["The tick lower of position"],
            type: "i32"
          },
          {
            name: "tick_upper",
            docs: ["The tick lower of position"],
            type: "i32"
          },
          {
            name: "liquidity_before",
            docs: ["The liquidity of the pool before liquidity change"],
            type: "u128"
          },
          {
            name: "liquidity_after",
            docs: ["The liquidity of the pool after liquidity change"],
            type: "u128"
          }
        ]
      }
    },
    {
      name: "Observation",
      docs: ["The element of observations in ObservationState"],
      serialization: "bytemuckunsafe",
      repr: {
        kind: "c",
        packed: true
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "block_timestamp",
            docs: ["The block timestamp of the observation"],
            type: "u32"
          },
          {
            name: "tick_cumulative",
            docs: ["the cumulative of tick during the duration time"],
            type: "i64"
          },
          {
            name: "padding",
            docs: ["padding for feature update"],
            type: {
              array: ["u64", 4]
            }
          }
        ]
      }
    },
    {
      name: "ObservationState",
      serialization: "bytemuckunsafe",
      repr: {
        kind: "c",
        packed: true
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "initialized",
            docs: ["Whether the ObservationState is initialized"],
            type: "bool"
          },
          {
            name: "recent_epoch",
            docs: ["recent update epoch"],
            type: "u64"
          },
          {
            name: "observation_index",
            docs: [
              "the most-recently updated index of the observations array"
            ],
            type: "u16"
          },
          {
            name: "pool_id",
            docs: ["belongs to which pool"],
            type: "pubkey"
          },
          {
            name: "observations",
            docs: ["observation array"],
            type: {
              array: [
                {
                  defined: {
                    name: "Observation"
                  }
                },
                100
              ]
            }
          },
          {
            name: "padding",
            docs: ["padding for feature update"],
            type: {
              array: ["u64", 4]
            }
          }
        ]
      }
    },
    {
      name: "OperationState",
      docs: ["Holds the current owner of the factory"],
      serialization: "bytemuckunsafe",
      repr: {
        kind: "c",
        packed: true
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            docs: ["Bump to identify PDA"],
            type: "u8"
          },
          {
            name: "operation_owners",
            docs: ["Address of the operation owner"],
            type: {
              array: ["pubkey", 10]
            }
          },
          {
            name: "whitelist_mints",
            docs: ["The mint address of whitelist to emit reward"],
            type: {
              array: ["pubkey", 100]
            }
          }
        ]
      }
    },
    {
      name: "PersonalPositionState",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            docs: ["Bump to identify PDA"],
            type: {
              array: ["u8", 1]
            }
          },
          {
            name: "nft_mint",
            docs: ["Mint address of the tokenized position"],
            type: "pubkey"
          },
          {
            name: "pool_id",
            docs: ["The ID of the pool with which this token is connected"],
            type: "pubkey"
          },
          {
            name: "tick_lower_index",
            docs: ["The lower bound tick of the position"],
            type: "i32"
          },
          {
            name: "tick_upper_index",
            docs: ["The upper bound tick of the position"],
            type: "i32"
          },
          {
            name: "liquidity",
            docs: ["The amount of liquidity owned by this position"],
            type: "u128"
          },
          {
            name: "fee_growth_inside_0_last_x64",
            docs: [
              "The token_0 fee growth of the aggregate position as of the last action on the individual position"
            ],
            type: "u128"
          },
          {
            name: "fee_growth_inside_1_last_x64",
            docs: [
              "The token_1 fee growth of the aggregate position as of the last action on the individual position"
            ],
            type: "u128"
          },
          {
            name: "token_fees_owed_0",
            docs: [
              "The fees owed to the position owner in token_0, as of the last computation"
            ],
            type: "u64"
          },
          {
            name: "token_fees_owed_1",
            docs: [
              "The fees owed to the position owner in token_1, as of the last computation"
            ],
            type: "u64"
          },
          {
            name: "reward_infos",
            type: {
              array: [
                {
                  defined: {
                    name: "PositionRewardInfo"
                  }
                },
                3
              ]
            }
          },
          {
            name: "recent_epoch",
            type: "u64"
          },
          {
            name: "padding",
            type: {
              array: ["u64", 7]
            }
          }
        ]
      }
    },
    {
      name: "PoolCreatedEvent",
      docs: [
        "Emitted when a pool is created and initialized with a starting price",
        ""
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "token_mint_0",
            docs: ["The first token of the pool by address sort order"],
            type: "pubkey"
          },
          {
            name: "token_mint_1",
            docs: ["The second token of the pool by address sort order"],
            type: "pubkey"
          },
          {
            name: "tick_spacing",
            docs: ["The minimum number of ticks between initialized ticks"],
            type: "u16"
          },
          {
            name: "pool_state",
            docs: ["The address of the created pool"],
            type: "pubkey"
          },
          {
            name: "sqrt_price_x64",
            docs: ["The initial sqrt price of the pool, as a Q64.64"],
            type: "u128"
          },
          {
            name: "tick",
            docs: [
              "The initial tick of the pool, i.e. log base 1.0001 of the starting price of the pool"
            ],
            type: "i32"
          },
          {
            name: "token_vault_0",
            docs: ["Vault of token_0"],
            type: "pubkey"
          },
          {
            name: "token_vault_1",
            docs: ["Vault of token_1"],
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "PoolState",
      docs: [
        "The pool state",
        "",
        "PDA of `[POOL_SEED, config, token_mint_0, token_mint_1]`",
        ""
      ],
      serialization: "bytemuckunsafe",
      repr: {
        kind: "c",
        packed: true
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            docs: ["Bump to identify PDA"],
            type: {
              array: ["u8", 1]
            }
          },
          {
            name: "amm_config",
            type: "pubkey"
          },
          {
            name: "owner",
            type: "pubkey"
          },
          {
            name: "token_mint_0",
            docs: [
              "Token pair of the pool, where token_mint_0 address < token_mint_1 address"
            ],
            type: "pubkey"
          },
          {
            name: "token_mint_1",
            type: "pubkey"
          },
          {
            name: "token_vault_0",
            docs: ["Token pair vault"],
            type: "pubkey"
          },
          {
            name: "token_vault_1",
            type: "pubkey"
          },
          {
            name: "observation_key",
            docs: ["observation account key"],
            type: "pubkey"
          },
          {
            name: "mint_decimals_0",
            docs: ["mint0 and mint1 decimals"],
            type: "u8"
          },
          {
            name: "mint_decimals_1",
            type: "u8"
          },
          {
            name: "tick_spacing",
            docs: ["The minimum number of ticks between initialized ticks"],
            type: "u16"
          },
          {
            name: "liquidity",
            docs: ["The currently in range liquidity available to the pool."],
            type: "u128"
          },
          {
            name: "sqrt_price_x64",
            docs: [
              "The current price of the pool as a sqrt(token_1/token_0) Q64.64 value"
            ],
            type: "u128"
          },
          {
            name: "tick_current",
            docs: [
              "The current tick of the pool, i.e. according to the last tick transition that was run."
            ],
            type: "i32"
          },
          {
            name: "padding3",
            type: "u16"
          },
          {
            name: "padding4",
            type: "u16"
          },
          {
            name: "fee_growth_global_0_x64",
            docs: [
              "The fee growth as a Q64.64 number, i.e. fees of token_0 and token_1 collected per",
              "unit of liquidity for the entire life of the pool."
            ],
            type: "u128"
          },
          {
            name: "fee_growth_global_1_x64",
            type: "u128"
          },
          {
            name: "protocol_fees_token_0",
            docs: [
              "The amounts of token_0 and token_1 that are owed to the protocol."
            ],
            type: "u64"
          },
          {
            name: "protocol_fees_token_1",
            type: "u64"
          },
          {
            name: "swap_in_amount_token_0",
            docs: ["The amounts in and out of swap token_0 and token_1"],
            type: "u128"
          },
          {
            name: "swap_out_amount_token_1",
            type: "u128"
          },
          {
            name: "swap_in_amount_token_1",
            type: "u128"
          },
          {
            name: "swap_out_amount_token_0",
            type: "u128"
          },
          {
            name: "status",
            docs: [
              "Bitwise representation of the state of the pool",
              "bit0, 1: disable open position and increase liquidity, 0: normal",
              "bit1, 1: disable decrease liquidity, 0: normal",
              "bit2, 1: disable collect fee, 0: normal",
              "bit3, 1: disable collect reward, 0: normal",
              "bit4, 1: disable swap, 0: normal"
            ],
            type: "u8"
          },
          {
            name: "padding",
            docs: ["Leave blank for future use"],
            type: {
              array: ["u8", 7]
            }
          },
          {
            name: "reward_infos",
            type: {
              array: [
                {
                  defined: {
                    name: "RewardInfo"
                  }
                },
                3
              ]
            }
          },
          {
            name: "tick_array_bitmap",
            docs: ["Packed initialized tick array state"],
            type: {
              array: ["u64", 16]
            }
          },
          {
            name: "total_fees_token_0",
            docs: ["except protocol_fee and fund_fee"],
            type: "u64"
          },
          {
            name: "total_fees_claimed_token_0",
            docs: ["except protocol_fee and fund_fee"],
            type: "u64"
          },
          {
            name: "total_fees_token_1",
            type: "u64"
          },
          {
            name: "total_fees_claimed_token_1",
            type: "u64"
          },
          {
            name: "fund_fees_token_0",
            type: "u64"
          },
          {
            name: "fund_fees_token_1",
            type: "u64"
          },
          {
            name: "open_time",
            type: "u64"
          },
          {
            name: "recent_epoch",
            type: "u64"
          },
          {
            name: "padding1",
            type: {
              array: ["u64", 24]
            }
          },
          {
            name: "padding2",
            type: {
              array: ["u64", 32]
            }
          }
        ]
      }
    },
    {
      name: "PositionRewardInfo",
      type: {
        kind: "struct",
        fields: [
          {
            name: "growth_inside_last_x64",
            type: "u128"
          },
          {
            name: "reward_amount_owed",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "ProtocolPositionState",
      docs: ["Info stored for each user's position"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            docs: ["Bump to identify PDA"],
            type: "u8"
          },
          {
            name: "pool_id",
            docs: ["The ID of the pool with which this token is connected"],
            type: "pubkey"
          },
          {
            name: "tick_lower_index",
            docs: ["The lower bound tick of the position"],
            type: "i32"
          },
          {
            name: "tick_upper_index",
            docs: ["The upper bound tick of the position"],
            type: "i32"
          },
          {
            name: "liquidity",
            docs: ["The amount of liquidity owned by this position"],
            type: "u128"
          },
          {
            name: "fee_growth_inside_0_last_x64",
            docs: [
              "The token_0 fee growth per unit of liquidity as of the last update to liquidity or fees owed"
            ],
            type: "u128"
          },
          {
            name: "fee_growth_inside_1_last_x64",
            docs: [
              "The token_1 fee growth per unit of liquidity as of the last update to liquidity or fees owed"
            ],
            type: "u128"
          },
          {
            name: "token_fees_owed_0",
            docs: ["The fees owed to the position owner in token_0"],
            type: "u64"
          },
          {
            name: "token_fees_owed_1",
            docs: ["The fees owed to the position owner in token_1"],
            type: "u64"
          },
          {
            name: "reward_growth_inside",
            docs: [
              "The reward growth per unit of liquidity as of the last update to liquidity"
            ],
            type: {
              array: ["u128", 3]
            }
          },
          {
            name: "recent_epoch",
            type: "u64"
          },
          {
            name: "padding",
            type: {
              array: ["u64", 7]
            }
          }
        ]
      }
    },
    {
      name: "RewardInfo",
      serialization: "bytemuckunsafe",
      repr: {
        kind: "c",
        packed: true
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "reward_state",
            docs: ["Reward state"],
            type: "u8"
          },
          {
            name: "open_time",
            docs: ["Reward open time"],
            type: "u64"
          },
          {
            name: "end_time",
            docs: ["Reward end time"],
            type: "u64"
          },
          {
            name: "last_update_time",
            docs: ["Reward last update time"],
            type: "u64"
          },
          {
            name: "emissions_per_second_x64",
            docs: [
              "Q64.64 number indicates how many tokens per second are earned per unit of liquidity."
            ],
            type: "u128"
          },
          {
            name: "reward_total_emissioned",
            docs: ["The total amount of reward emissioned"],
            type: "u64"
          },
          {
            name: "reward_claimed",
            docs: ["The total amount of claimed reward"],
            type: "u64"
          },
          {
            name: "token_mint",
            docs: ["Reward token mint."],
            type: "pubkey"
          },
          {
            name: "token_vault",
            docs: ["Reward vault token account."],
            type: "pubkey"
          },
          {
            name: "authority",
            docs: ["The owner that has permission to set reward param"],
            type: "pubkey"
          },
          {
            name: "reward_growth_global_x64",
            docs: [
              "Q64.64 number that tracks the total tokens earned per unit of liquidity since the reward",
              "emissions were turned on."
            ],
            type: "u128"
          }
        ]
      }
    },
    {
      name: "SupportMintAssociated",
      docs: ["Holds the current owner of the factory"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            docs: ["Bump to identify PDA"],
            type: "u8"
          },
          {
            name: "mint",
            docs: ["Address of the supported token22 mint"],
            type: "pubkey"
          },
          {
            name: "padding",
            type: {
              array: ["u64", 8]
            }
          }
        ]
      }
    },
    {
      name: "SwapEvent",
      docs: ["Emitted by when a swap is performed for a pool"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_state",
            docs: ["The pool for which token_0 and token_1 were swapped"],
            type: "pubkey"
          },
          {
            name: "sender",
            docs: [
              "The address that initiated the swap call, and that received the callback"
            ],
            type: "pubkey"
          },
          {
            name: "token_account_0",
            docs: [
              "The payer token account in zero for one swaps, or the recipient token account",
              "in one for zero swaps"
            ],
            type: "pubkey"
          },
          {
            name: "token_account_1",
            docs: [
              "The payer token account in one for zero swaps, or the recipient token account",
              "in zero for one swaps"
            ],
            type: "pubkey"
          },
          {
            name: "amount_0",
            docs: [
              "The real delta amount of the token_0 of the pool or user"
            ],
            type: "u64"
          },
          {
            name: "transfer_fee_0",
            docs: [
              "The transfer fee charged by the withheld_amount of the token_0"
            ],
            type: "u64"
          },
          {
            name: "amount_1",
            docs: ["The real delta of the token_1 of the pool or user"],
            type: "u64"
          },
          {
            name: "transfer_fee_1",
            docs: [
              "The transfer fee charged by the withheld_amount of the token_1"
            ],
            type: "u64"
          },
          {
            name: "zero_for_one",
            docs: ["if true, amount_0 is negtive and amount_1 is positive"],
            type: "bool"
          },
          {
            name: "sqrt_price_x64",
            docs: ["The sqrt(price) of the pool after the swap, as a Q64.64"],
            type: "u128"
          },
          {
            name: "liquidity",
            docs: ["The liquidity of the pool after the swap"],
            type: "u128"
          },
          {
            name: "tick",
            docs: ["The log base 1.0001 of price of the pool after the swap"],
            type: "i32"
          }
        ]
      }
    },
    {
      name: "TickArrayBitmapExtension",
      serialization: "bytemuckunsafe",
      repr: {
        kind: "c",
        packed: true
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_id",
            type: "pubkey"
          },
          {
            name: "positive_tick_array_bitmap",
            docs: [
              "Packed initialized tick array state for start_tick_index is positive"
            ],
            type: {
              array: [
                {
                  array: ["u64", 8]
                },
                14
              ]
            }
          },
          {
            name: "negative_tick_array_bitmap",
            docs: [
              "Packed initialized tick array state for start_tick_index is negitive"
            ],
            type: {
              array: [
                {
                  array: ["u64", 8]
                },
                14
              ]
            }
          }
        ]
      }
    },
    {
      name: "TickArrayState",
      serialization: "bytemuckunsafe",
      repr: {
        kind: "c",
        packed: true
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_id",
            type: "pubkey"
          },
          {
            name: "start_tick_index",
            type: "i32"
          },
          {
            name: "ticks",
            type: {
              array: [
                {
                  defined: {
                    name: "TickState"
                  }
                },
                60
              ]
            }
          },
          {
            name: "initialized_tick_count",
            type: "u8"
          },
          {
            name: "recent_epoch",
            type: "u64"
          },
          {
            name: "padding",
            type: {
              array: ["u8", 107]
            }
          }
        ]
      }
    },
    {
      name: "TickState",
      serialization: "bytemuckunsafe",
      repr: {
        kind: "c",
        packed: true
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "tick",
            type: "i32"
          },
          {
            name: "liquidity_net",
            docs: [
              "Amount of net liquidity added (subtracted) when tick is crossed from left to right (right to left)"
            ],
            type: "i128"
          },
          {
            name: "liquidity_gross",
            docs: ["The total position liquidity that references this tick"],
            type: "u128"
          },
          {
            name: "fee_growth_outside_0_x64",
            docs: [
              "Fee growth per unit of liquidity on the _other_ side of this tick (relative to the current tick)",
              "only has relative meaning, not absolute \u2014 the value depends on when the tick is initialized"
            ],
            type: "u128"
          },
          {
            name: "fee_growth_outside_1_x64",
            type: "u128"
          },
          {
            name: "reward_growths_outside_x64",
            type: {
              array: ["u128", 3]
            }
          },
          {
            name: "padding",
            type: {
              array: ["u32", 13]
            }
          }
        ]
      }
    },
    {
      name: "UpdateRewardInfosEvent",
      docs: ["Emitted when Reward are updated for a pool"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "reward_growth_global_x64",
            docs: ["Reward info"],
            type: {
              array: ["u128", 3]
            }
          }
        ]
      }
    }
  ]
};

// idl/raydium-cp-swap.json
var raydium_cp_swap_default = {
  address: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
  metadata: {
    name: "raydium_cp_swap",
    version: "0.2.0",
    spec: "0.1.0",
    description: "Raydium constant product AMM, supports Token2022 and without Openbook"
  },
  instructions: [
    {
      name: "collect_fund_fee",
      docs: [
        "Collect the fund fee accrued to the pool",
        "",
        "# Arguments",
        "",
        "* `ctx` - The context of accounts",
        "* `amount_0_requested` - The maximum amount of token_0 to send, can be 0 to collect fees in only token_1",
        "* `amount_1_requested` - The maximum amount of token_1 to send, can be 0 to collect fees in only token_0",
        ""
      ],
      discriminator: [167, 138, 78, 149, 223, 194, 6, 126],
      accounts: [
        {
          name: "owner",
          docs: ["Only admin or fund_owner can collect fee now"],
          signer: true
        },
        {
          name: "authority",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  110,
                  100,
                  95,
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  95,
                  115,
                  101,
                  101,
                  100
                ]
              }
            ]
          }
        },
        {
          name: "pool_state",
          docs: ["Pool state stores accumulated protocol fee amount"],
          writable: true
        },
        {
          name: "amm_config",
          docs: ["Amm config account stores fund_owner"]
        },
        {
          name: "token_0_vault",
          docs: ["The address that holds pool tokens for token_0"],
          writable: true
        },
        {
          name: "token_1_vault",
          docs: ["The address that holds pool tokens for token_1"],
          writable: true
        },
        {
          name: "vault_0_mint",
          docs: ["The mint of token_0 vault"]
        },
        {
          name: "vault_1_mint",
          docs: ["The mint of token_1 vault"]
        },
        {
          name: "recipient_token_0_account",
          docs: ["The address that receives the collected token_0 fund fees"],
          writable: true
        },
        {
          name: "recipient_token_1_account",
          docs: ["The address that receives the collected token_1 fund fees"],
          writable: true
        },
        {
          name: "token_program",
          docs: ["The SPL program to perform token transfers"],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "token_program_2022",
          docs: ["The SPL program 2022 to perform token transfers"],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      args: [
        {
          name: "amount_0_requested",
          type: "u64"
        },
        {
          name: "amount_1_requested",
          type: "u64"
        }
      ]
    },
    {
      name: "collect_protocol_fee",
      docs: [
        "Collect the protocol fee accrued to the pool",
        "",
        "# Arguments",
        "",
        "* `ctx` - The context of accounts",
        "* `amount_0_requested` - The maximum amount of token_0 to send, can be 0 to collect fees in only token_1",
        "* `amount_1_requested` - The maximum amount of token_1 to send, can be 0 to collect fees in only token_0",
        ""
      ],
      discriminator: [136, 136, 252, 221, 194, 66, 126, 89],
      accounts: [
        {
          name: "owner",
          docs: ["Only admin or owner can collect fee now"],
          signer: true
        },
        {
          name: "authority",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  110,
                  100,
                  95,
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  95,
                  115,
                  101,
                  101,
                  100
                ]
              }
            ]
          }
        },
        {
          name: "pool_state",
          docs: ["Pool state stores accumulated protocol fee amount"],
          writable: true
        },
        {
          name: "amm_config",
          docs: ["Amm config account stores owner"]
        },
        {
          name: "token_0_vault",
          docs: ["The address that holds pool tokens for token_0"],
          writable: true
        },
        {
          name: "token_1_vault",
          docs: ["The address that holds pool tokens for token_1"],
          writable: true
        },
        {
          name: "vault_0_mint",
          docs: ["The mint of token_0 vault"]
        },
        {
          name: "vault_1_mint",
          docs: ["The mint of token_1 vault"]
        },
        {
          name: "recipient_token_0_account",
          docs: [
            "The address that receives the collected token_0 protocol fees"
          ],
          writable: true
        },
        {
          name: "recipient_token_1_account",
          docs: [
            "The address that receives the collected token_1 protocol fees"
          ],
          writable: true
        },
        {
          name: "token_program",
          docs: ["The SPL program to perform token transfers"],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "token_program_2022",
          docs: ["The SPL program 2022 to perform token transfers"],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      args: [
        {
          name: "amount_0_requested",
          type: "u64"
        },
        {
          name: "amount_1_requested",
          type: "u64"
        }
      ]
    },
    {
      name: "create_amm_config",
      docs: [
        "# Arguments",
        "",
        "* `ctx`- The accounts needed by instruction.",
        "* `index` - The index of amm config, there may be multiple config.",
        "* `trade_fee_rate` - Trade fee rate, can be changed.",
        "* `protocol_fee_rate` - The rate of protocol fee within trade fee.",
        "* `fund_fee_rate` - The rate of fund fee within trade fee.",
        ""
      ],
      discriminator: [137, 52, 237, 212, 215, 117, 108, 104],
      accounts: [
        {
          name: "owner",
          docs: ["Address to be set as protocol owner."],
          writable: true,
          signer: true,
          address: "GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ"
        },
        {
          name: "amm_config",
          docs: [
            "Initialize config state account to store protocol owner address and fee rates."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [97, 109, 109, 95, 99, 111, 110, 102, 105, 103]
              },
              {
                kind: "arg",
                path: "index"
              }
            ]
          }
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "index",
          type: "u16"
        },
        {
          name: "trade_fee_rate",
          type: "u64"
        },
        {
          name: "protocol_fee_rate",
          type: "u64"
        },
        {
          name: "fund_fee_rate",
          type: "u64"
        },
        {
          name: "create_pool_fee",
          type: "u64"
        }
      ]
    },
    {
      name: "deposit",
      docs: [
        "Deposit lp token to the pool",
        "",
        "# Arguments",
        "",
        "* `ctx`- The context of accounts",
        "* `lp_token_amount` - Pool token amount to transfer. token_a and token_b amount are set by the current exchange rate and size of the pool",
        "* `maximum_token_0_amount` -  Maximum token 0 amount to deposit, prevents excessive slippage",
        "* `maximum_token_1_amount` - Maximum token 1 amount to deposit, prevents excessive slippage",
        ""
      ],
      discriminator: [242, 35, 198, 137, 82, 225, 242, 182],
      accounts: [
        {
          name: "owner",
          docs: ["Pays to mint the position"],
          signer: true
        },
        {
          name: "authority",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  110,
                  100,
                  95,
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  95,
                  115,
                  101,
                  101,
                  100
                ]
              }
            ]
          }
        },
        {
          name: "pool_state",
          writable: true
        },
        {
          name: "owner_lp_token",
          docs: ["Owner lp token account"],
          writable: true
        },
        {
          name: "token_0_account",
          docs: ["The payer's token account for token_0"],
          writable: true
        },
        {
          name: "token_1_account",
          docs: ["The payer's token account for token_1"],
          writable: true
        },
        {
          name: "token_0_vault",
          docs: ["The address that holds pool tokens for token_0"],
          writable: true
        },
        {
          name: "token_1_vault",
          docs: ["The address that holds pool tokens for token_1"],
          writable: true
        },
        {
          name: "token_program",
          docs: ["token Program"],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "token_program_2022",
          docs: ["Token program 2022"],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          name: "vault_0_mint",
          docs: ["The mint of token_0 vault"]
        },
        {
          name: "vault_1_mint",
          docs: ["The mint of token_1 vault"]
        },
        {
          name: "lp_mint",
          docs: ["Lp token mint"],
          writable: true
        }
      ],
      args: [
        {
          name: "lp_token_amount",
          type: "u64"
        },
        {
          name: "maximum_token_0_amount",
          type: "u64"
        },
        {
          name: "maximum_token_1_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "initialize",
      docs: [
        "Creates a pool for the given token pair and the initial price",
        "",
        "# Arguments",
        "",
        "* `ctx`- The context of accounts",
        "* `init_amount_0` - the initial amount_0 to deposit",
        "* `init_amount_1` - the initial amount_1 to deposit",
        "* `open_time` - the timestamp allowed for swap",
        ""
      ],
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237],
      accounts: [
        {
          name: "creator",
          docs: ["Address paying to create the pool. Can be anyone"],
          writable: true,
          signer: true
        },
        {
          name: "amm_config",
          docs: ["Which config the pool belongs to."]
        },
        {
          name: "authority",
          docs: ["pool vault and lp mint authority"],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  110,
                  100,
                  95,
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  95,
                  115,
                  101,
                  101,
                  100
                ]
              }
            ]
          }
        },
        {
          name: "pool_state",
          docs: [
            "PDA account:",
            "seeds = [",
            "POOL_SEED.as_bytes(),",
            "amm_config.key().as_ref(),",
            "token_0_mint.key().as_ref(),",
            "token_1_mint.key().as_ref(),",
            "],",
            "",
            "Or random account: must be signed by cli"
          ],
          writable: true
        },
        {
          name: "token_0_mint",
          docs: ["Token_0 mint, the key must smaller than token_1 mint."]
        },
        {
          name: "token_1_mint",
          docs: ["Token_1 mint, the key must grater then token_0 mint."]
        },
        {
          name: "lp_mint",
          docs: ["pool lp mint"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108,
                  95,
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                kind: "account",
                path: "pool_state"
              }
            ]
          }
        },
        {
          name: "creator_token_0",
          docs: ["payer token0 account"],
          writable: true
        },
        {
          name: "creator_token_1",
          docs: ["creator token1 account"],
          writable: true
        },
        {
          name: "creator_lp_token",
          docs: ["creator lp token account"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "creator"
              },
              {
                kind: "const",
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                kind: "account",
                path: "lp_mint"
              }
            ],
            program: {
              kind: "const",
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          name: "token_0_vault",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 111, 111, 108, 95, 118, 97, 117, 108, 116]
              },
              {
                kind: "account",
                path: "pool_state"
              },
              {
                kind: "account",
                path: "token_0_mint"
              }
            ]
          }
        },
        {
          name: "token_1_vault",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [112, 111, 111, 108, 95, 118, 97, 117, 108, 116]
              },
              {
                kind: "account",
                path: "pool_state"
              },
              {
                kind: "account",
                path: "token_1_mint"
              }
            ]
          }
        },
        {
          name: "create_pool_fee",
          docs: ["create pool fee account"],
          writable: true,
          address: "DNXgeM9EiiaAbaWvwjHj9fQQLAX5ZsfHyvmYUNRAdNC8"
        },
        {
          name: "observation_state",
          docs: ["an account to store oracle observations"],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [111, 98, 115, 101, 114, 118, 97, 116, 105, 111, 110]
              },
              {
                kind: "account",
                path: "pool_state"
              }
            ]
          }
        },
        {
          name: "token_program",
          docs: ["Program to create mint account and mint tokens"],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "token_0_program",
          docs: ["Spl token program or token program 2022"]
        },
        {
          name: "token_1_program",
          docs: ["Spl token program or token program 2022"]
        },
        {
          name: "associated_token_program",
          docs: ["Program to create an ATA for receiving position NFT"],
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          name: "system_program",
          docs: ["To create a new program account"],
          address: "11111111111111111111111111111111"
        },
        {
          name: "rent",
          docs: ["Sysvar for program account"],
          address: "SysvarRent111111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "init_amount_0",
          type: "u64"
        },
        {
          name: "init_amount_1",
          type: "u64"
        },
        {
          name: "open_time",
          type: "u64"
        }
      ]
    },
    {
      name: "swap_base_input",
      docs: [
        "Swap the tokens in the pool base input amount",
        "",
        "# Arguments",
        "",
        "* `ctx`- The context of accounts",
        "* `amount_in` -  input amount to transfer, output to DESTINATION is based on the exchange rate",
        "* `minimum_amount_out` -  Minimum amount of output token, prevents excessive slippage",
        ""
      ],
      discriminator: [143, 190, 90, 218, 196, 30, 51, 222],
      accounts: [
        {
          name: "payer",
          docs: ["The user performing the swap"],
          signer: true
        },
        {
          name: "authority",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  110,
                  100,
                  95,
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  95,
                  115,
                  101,
                  101,
                  100
                ]
              }
            ]
          }
        },
        {
          name: "amm_config",
          docs: ["The factory state to read protocol fees"]
        },
        {
          name: "pool_state",
          docs: [
            "The program account of the pool in which the swap will be performed"
          ],
          writable: true
        },
        {
          name: "input_token_account",
          docs: ["The user token account for input token"],
          writable: true
        },
        {
          name: "output_token_account",
          docs: ["The user token account for output token"],
          writable: true
        },
        {
          name: "input_vault",
          docs: ["The vault token account for input token"],
          writable: true
        },
        {
          name: "output_vault",
          docs: ["The vault token account for output token"],
          writable: true
        },
        {
          name: "input_token_program",
          docs: ["SPL program for input token transfers"]
        },
        {
          name: "output_token_program",
          docs: ["SPL program for output token transfers"]
        },
        {
          name: "input_token_mint",
          docs: ["The mint of input token"]
        },
        {
          name: "output_token_mint",
          docs: ["The mint of output token"]
        },
        {
          name: "observation_state",
          docs: [
            "The program account for the most recent oracle observation"
          ],
          writable: true
        }
      ],
      args: [
        {
          name: "amount_in",
          type: "u64"
        },
        {
          name: "minimum_amount_out",
          type: "u64"
        }
      ]
    },
    {
      name: "swap_base_output",
      docs: [
        "Swap the tokens in the pool base output amount",
        "",
        "# Arguments",
        "",
        "* `ctx`- The context of accounts",
        "* `max_amount_in` -  input amount prevents excessive slippage",
        "* `amount_out` -  amount of output token",
        ""
      ],
      discriminator: [55, 217, 98, 86, 163, 74, 180, 173],
      accounts: [
        {
          name: "payer",
          docs: ["The user performing the swap"],
          signer: true
        },
        {
          name: "authority",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  110,
                  100,
                  95,
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  95,
                  115,
                  101,
                  101,
                  100
                ]
              }
            ]
          }
        },
        {
          name: "amm_config",
          docs: ["The factory state to read protocol fees"]
        },
        {
          name: "pool_state",
          docs: [
            "The program account of the pool in which the swap will be performed"
          ],
          writable: true
        },
        {
          name: "input_token_account",
          docs: ["The user token account for input token"],
          writable: true
        },
        {
          name: "output_token_account",
          docs: ["The user token account for output token"],
          writable: true
        },
        {
          name: "input_vault",
          docs: ["The vault token account for input token"],
          writable: true
        },
        {
          name: "output_vault",
          docs: ["The vault token account for output token"],
          writable: true
        },
        {
          name: "input_token_program",
          docs: ["SPL program for input token transfers"]
        },
        {
          name: "output_token_program",
          docs: ["SPL program for output token transfers"]
        },
        {
          name: "input_token_mint",
          docs: ["The mint of input token"]
        },
        {
          name: "output_token_mint",
          docs: ["The mint of output token"]
        },
        {
          name: "observation_state",
          docs: [
            "The program account for the most recent oracle observation"
          ],
          writable: true
        }
      ],
      args: [
        {
          name: "max_amount_in",
          type: "u64"
        },
        {
          name: "amount_out",
          type: "u64"
        }
      ]
    },
    {
      name: "update_amm_config",
      docs: [
        "Updates the owner of the amm config",
        "Must be called by the current owner or admin",
        "",
        "# Arguments",
        "",
        "* `ctx`- The context of accounts",
        "* `trade_fee_rate`- The new trade fee rate of amm config, be set when `param` is 0",
        "* `protocol_fee_rate`- The new protocol fee rate of amm config, be set when `param` is 1",
        "* `fund_fee_rate`- The new fund fee rate of amm config, be set when `param` is 2",
        "* `new_owner`- The config's new owner, be set when `param` is 3",
        "* `new_fund_owner`- The config's new fund owner, be set when `param` is 4",
        "* `param`- The value can be 0 | 1 | 2 | 3 | 4, otherwise will report a error",
        ""
      ],
      discriminator: [49, 60, 174, 136, 154, 28, 116, 200],
      accounts: [
        {
          name: "owner",
          docs: ["The amm config owner or admin"],
          signer: true,
          address: "GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ"
        },
        {
          name: "amm_config",
          docs: ["Amm config account to be changed"],
          writable: true
        }
      ],
      args: [
        {
          name: "param",
          type: "u8"
        },
        {
          name: "value",
          type: "u64"
        }
      ]
    },
    {
      name: "update_pool_status",
      docs: [
        "Update pool status for given value",
        "",
        "# Arguments",
        "",
        "* `ctx`- The context of accounts",
        "* `status` - The value of status",
        ""
      ],
      discriminator: [130, 87, 108, 6, 46, 224, 117, 123],
      accounts: [
        {
          name: "authority",
          signer: true,
          address: "GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ"
        },
        {
          name: "pool_state",
          writable: true
        }
      ],
      args: [
        {
          name: "status",
          type: "u8"
        }
      ]
    },
    {
      name: "withdraw",
      docs: [
        "Withdraw lp for token0 and token1",
        "",
        "# Arguments",
        "",
        "* `ctx`- The context of accounts",
        "* `lp_token_amount` - Amount of pool tokens to burn. User receives an output of token a and b based on the percentage of the pool tokens that are returned.",
        "* `minimum_token_0_amount` -  Minimum amount of token 0 to receive, prevents excessive slippage",
        "* `minimum_token_1_amount` -  Minimum amount of token 1 to receive, prevents excessive slippage",
        ""
      ],
      discriminator: [183, 18, 70, 156, 148, 109, 161, 34],
      accounts: [
        {
          name: "owner",
          docs: ["Pays to mint the position"],
          signer: true
        },
        {
          name: "authority",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  110,
                  100,
                  95,
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  95,
                  115,
                  101,
                  101,
                  100
                ]
              }
            ]
          }
        },
        {
          name: "pool_state",
          docs: ["Pool state account"],
          writable: true
        },
        {
          name: "owner_lp_token",
          docs: ["Owner lp token account"],
          writable: true
        },
        {
          name: "token_0_account",
          docs: ["The token account for receive token_0,"],
          writable: true
        },
        {
          name: "token_1_account",
          docs: ["The token account for receive token_1"],
          writable: true
        },
        {
          name: "token_0_vault",
          docs: ["The address that holds pool tokens for token_0"],
          writable: true
        },
        {
          name: "token_1_vault",
          docs: ["The address that holds pool tokens for token_1"],
          writable: true
        },
        {
          name: "token_program",
          docs: ["token Program"],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "token_program_2022",
          docs: ["Token program 2022"],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          name: "vault_0_mint",
          docs: ["The mint of token_0 vault"]
        },
        {
          name: "vault_1_mint",
          docs: ["The mint of token_1 vault"]
        },
        {
          name: "lp_mint",
          docs: ["Pool lp token mint"],
          writable: true
        },
        {
          name: "memo_program",
          docs: ["memo program"],
          address: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        }
      ],
      args: [
        {
          name: "lp_token_amount",
          type: "u64"
        },
        {
          name: "minimum_token_0_amount",
          type: "u64"
        },
        {
          name: "minimum_token_1_amount",
          type: "u64"
        }
      ]
    }
  ],
  accounts: [
    {
      name: "AmmConfig",
      discriminator: [218, 244, 33, 104, 203, 203, 43, 111]
    },
    {
      name: "ObservationState",
      discriminator: [122, 174, 197, 53, 129, 9, 165, 132]
    },
    {
      name: "PoolState",
      discriminator: [247, 237, 227, 245, 215, 195, 222, 70]
    }
  ],
  events: [
    {
      name: "LpChangeEvent",
      discriminator: [121, 163, 205, 201, 57, 218, 117, 60]
    },
    {
      name: "SwapEvent",
      discriminator: [64, 198, 205, 232, 38, 8, 113, 226]
    }
  ],
  errors: [
    {
      code: 6e3,
      name: "NotApproved",
      msg: "Not approved"
    },
    {
      code: 6001,
      name: "InvalidOwner",
      msg: "Input account owner is not the program address"
    },
    {
      code: 6002,
      name: "EmptySupply",
      msg: "Input token account empty"
    },
    {
      code: 6003,
      name: "InvalidInput",
      msg: "InvalidInput"
    },
    {
      code: 6004,
      name: "IncorrectLpMint",
      msg: "Address of the provided lp token mint is incorrect"
    },
    {
      code: 6005,
      name: "ExceededSlippage",
      msg: "Exceeds desired slippage limit"
    },
    {
      code: 6006,
      name: "ZeroTradingTokens",
      msg: "Given pool token amount results in zero trading tokens"
    },
    {
      code: 6007,
      name: "NotSupportMint",
      msg: "Not support token_2022 mint extension"
    },
    {
      code: 6008,
      name: "InvalidVault",
      msg: "invaild vault"
    },
    {
      code: 6009,
      name: "InitLpAmountTooLess",
      msg: "Init lp amount is too less(Because 100 amount lp will be locked)"
    },
    {
      code: 6010,
      name: "TransferFeeCalculateNotMatch",
      msg: "TransferFee calculate not match"
    }
  ],
  types: [
    {
      name: "AmmConfig",
      docs: ["Holds the current owner of the factory"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            docs: ["Bump to identify PDA"],
            type: "u8"
          },
          {
            name: "disable_create_pool",
            docs: ["Status to control if new pool can be create"],
            type: "bool"
          },
          {
            name: "index",
            docs: ["Config index"],
            type: "u16"
          },
          {
            name: "trade_fee_rate",
            docs: [
              "The trade fee, denominated in hundredths of a bip (10^-6)"
            ],
            type: "u64"
          },
          {
            name: "protocol_fee_rate",
            docs: ["The protocol fee"],
            type: "u64"
          },
          {
            name: "fund_fee_rate",
            docs: [
              "The fund fee, denominated in hundredths of a bip (10^-6)"
            ],
            type: "u64"
          },
          {
            name: "create_pool_fee",
            docs: ["Fee for create a new pool"],
            type: "u64"
          },
          {
            name: "protocol_owner",
            docs: ["Address of the protocol fee owner"],
            type: "pubkey"
          },
          {
            name: "fund_owner",
            docs: ["Address of the fund fee owner"],
            type: "pubkey"
          },
          {
            name: "padding",
            docs: ["padding"],
            type: {
              array: ["u64", 16]
            }
          }
        ]
      }
    },
    {
      name: "LpChangeEvent",
      docs: ["Emitted when deposit and withdraw"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_id",
            type: "pubkey"
          },
          {
            name: "lp_amount_before",
            type: "u64"
          },
          {
            name: "token_0_vault_before",
            docs: ["pool vault sub trade fees"],
            type: "u64"
          },
          {
            name: "token_1_vault_before",
            docs: ["pool vault sub trade fees"],
            type: "u64"
          },
          {
            name: "token_0_amount",
            docs: ["calculate result without transfer fee"],
            type: "u64"
          },
          {
            name: "token_1_amount",
            docs: ["calculate result without transfer fee"],
            type: "u64"
          },
          {
            name: "token_0_transfer_fee",
            type: "u64"
          },
          {
            name: "token_1_transfer_fee",
            type: "u64"
          },
          {
            name: "change_type",
            type: "u8"
          }
        ]
      }
    },
    {
      name: "Observation",
      docs: ["The element of observations in ObservationState"],
      serialization: "bytemuckunsafe",
      repr: {
        kind: "c",
        packed: true
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "block_timestamp",
            docs: ["The block timestamp of the observation"],
            type: "u64"
          },
          {
            name: "cumulative_token_0_price_x32",
            docs: [
              "the cumulative of token0 price during the duration time, Q32.32, the remaining 64 bit for overflow"
            ],
            type: "u128"
          },
          {
            name: "cumulative_token_1_price_x32",
            docs: [
              "the cumulative of token1 price during the duration time, Q32.32, the remaining 64 bit for overflow"
            ],
            type: "u128"
          }
        ]
      }
    },
    {
      name: "ObservationState",
      serialization: "bytemuckunsafe",
      repr: {
        kind: "c",
        packed: true
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "initialized",
            docs: ["Whether the ObservationState is initialized"],
            type: "bool"
          },
          {
            name: "observation_index",
            docs: [
              "the most-recently updated index of the observations array"
            ],
            type: "u16"
          },
          {
            name: "pool_id",
            type: "pubkey"
          },
          {
            name: "observations",
            docs: ["observation array"],
            type: {
              array: [
                {
                  defined: {
                    name: "Observation"
                  }
                },
                100
              ]
            }
          },
          {
            name: "padding",
            docs: ["padding for feature update"],
            type: {
              array: ["u64", 4]
            }
          }
        ]
      }
    },
    {
      name: "PoolState",
      serialization: "bytemuckunsafe",
      repr: {
        kind: "c",
        packed: true
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "amm_config",
            docs: ["Which config the pool belongs"],
            type: "pubkey"
          },
          {
            name: "pool_creator",
            docs: ["pool creator"],
            type: "pubkey"
          },
          {
            name: "token_0_vault",
            docs: ["Token A"],
            type: "pubkey"
          },
          {
            name: "token_1_vault",
            docs: ["Token B"],
            type: "pubkey"
          },
          {
            name: "lp_mint",
            docs: [
              "Pool tokens are issued when A or B tokens are deposited.",
              "Pool tokens can be withdrawn back to the original A or B token."
            ],
            type: "pubkey"
          },
          {
            name: "token_0_mint",
            docs: ["Mint information for token A"],
            type: "pubkey"
          },
          {
            name: "token_1_mint",
            docs: ["Mint information for token B"],
            type: "pubkey"
          },
          {
            name: "token_0_program",
            docs: ["token_0 program"],
            type: "pubkey"
          },
          {
            name: "token_1_program",
            docs: ["token_1 program"],
            type: "pubkey"
          },
          {
            name: "observation_key",
            docs: ["observation account to store oracle data"],
            type: "pubkey"
          },
          {
            name: "auth_bump",
            type: "u8"
          },
          {
            name: "status",
            docs: [
              "Bitwise representation of the state of the pool",
              "bit0, 1: disable deposit(value is 1), 0: normal",
              "bit1, 1: disable withdraw(value is 2), 0: normal",
              "bit2, 1: disable swap(value is 4), 0: normal"
            ],
            type: "u8"
          },
          {
            name: "lp_mint_decimals",
            type: "u8"
          },
          {
            name: "mint_0_decimals",
            docs: ["mint0 and mint1 decimals"],
            type: "u8"
          },
          {
            name: "mint_1_decimals",
            type: "u8"
          },
          {
            name: "lp_supply",
            docs: ["True circulating supply without burns and lock ups"],
            type: "u64"
          },
          {
            name: "protocol_fees_token_0",
            docs: [
              "The amounts of token_0 and token_1 that are owed to the liquidity provider."
            ],
            type: "u64"
          },
          {
            name: "protocol_fees_token_1",
            type: "u64"
          },
          {
            name: "fund_fees_token_0",
            type: "u64"
          },
          {
            name: "fund_fees_token_1",
            type: "u64"
          },
          {
            name: "open_time",
            docs: ["The timestamp allowed for swap in the pool."],
            type: "u64"
          },
          {
            name: "recent_epoch",
            docs: ["recent epoch"],
            type: "u64"
          },
          {
            name: "padding",
            docs: ["padding for future updates"],
            type: {
              array: ["u64", 31]
            }
          }
        ]
      }
    },
    {
      name: "SwapEvent",
      docs: ["Emitted when swap"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_id",
            type: "pubkey"
          },
          {
            name: "input_vault_before",
            docs: ["pool vault sub trade fees"],
            type: "u64"
          },
          {
            name: "output_vault_before",
            docs: ["pool vault sub trade fees"],
            type: "u64"
          },
          {
            name: "input_amount",
            docs: ["calculate result without transfer fee"],
            type: "u64"
          },
          {
            name: "output_amount",
            docs: ["calculate result without transfer fee"],
            type: "u64"
          },
          {
            name: "input_transfer_fee",
            type: "u64"
          },
          {
            name: "output_transfer_fee",
            type: "u64"
          },
          {
            name: "base_input",
            type: "bool"
          }
        ]
      }
    }
  ]
};

// idl/ton-whales-holders.json
var ton_whales_holders_default = {
  accounts: [
    {
      discriminator: [166, 250, 46, 230, 152, 63, 140, 182],
      name: "Card"
    },
    {
      discriminator: [46, 159, 131, 37, 245, 84, 5, 9],
      name: "Root"
    }
  ],
  address: "6bES2dKy1ee13HQ4uW4ycw4Kw4od9ziZeWMyAxVySYEd",
  errors: [
    {
      code: 6e3,
      name: "IncorrectTzOffset"
    },
    {
      code: 6001,
      name: "IncorrectSeqno"
    },
    {
      code: 6002,
      name: "IncorrectTimestamp"
    },
    {
      code: 6003,
      name: "IncorrectWithdrawA"
    },
    {
      code: 6004,
      name: "IncorrectWithdrawB"
    },
    {
      code: 6005,
      name: "IncorrectTransferredA"
    },
    {
      code: 6006,
      name: "IncorrectTransferredB"
    },
    {
      code: 6007,
      name: "IncorrectBalanceA"
    },
    {
      code: 6008,
      name: "IncorrectBalanceB"
    },
    {
      code: 6009,
      name: "LimitReached"
    },
    {
      code: 6010,
      name: "IncosistentReservedBalance"
    },
    {
      code: 6011,
      name: "IncorrectBalance"
    },
    {
      code: 6012,
      name: "IncorrectNewLimits"
    },
    {
      code: 6013,
      name: "IncorrectNewSeqno"
    },
    {
      code: 6014,
      name: "TooManyPendingLimits"
    },
    {
      code: 6015,
      name: "GracefulPeriodInProgress"
    },
    {
      code: 6016,
      name: "InconsistentBalanceA"
    },
    {
      code: 6017,
      name: "InconsistentBalanceB"
    },
    {
      code: 6018,
      name: "NotWhitelisted"
    },
    {
      code: 6019,
      name: "AlreadyWhitelisted"
    },
    {
      code: 6020,
      name: "DepositAOverflow"
    },
    {
      code: 6021,
      name: "NewWithdrawnAOverflow"
    },
    {
      code: 6022,
      name: "NewWithdrawnBOverflow"
    },
    {
      code: 6023,
      name: "DepositBOverflow"
    },
    {
      code: 6024,
      name: "WithdrawnAOverflow"
    },
    {
      code: 6025,
      name: "WithdrawnBOverflow"
    },
    {
      code: 6026,
      name: "TransferredAUnderflow"
    }
  ],
  events: [
    {
      discriminator: [35, 103, 149, 246, 196, 123, 221, 99],
      name: "Refunded"
    },
    {
      discriminator: [213, 115, 105, 7, 254, 239, 150, 134],
      name: "UpdatedCard"
    }
  ],
  instructions: [
    {
      accounts: [
        {
          name: "owner",
          relations: ["root"],
          signer: true,
          writable: true
        },
        {
          name: "token_mint"
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          },
          writable: true
        },
        {
          name: "recipient_token_account"
        },
        {
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          name: "token_program"
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        }
      ],
      discriminator: [157, 211, 52, 54, 144, 81, 5, 55],
      name: "add_to_whitelist"
    },
    {
      accounts: [
        {
          name: "owner",
          relations: ["root"],
          signer: true,
          writable: true
        },
        {
          name: "treasure_authority"
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          },
          writable: true
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "treasure_authority",
          type: "pubkey"
        }
      ],
      discriminator: [165, 2, 203, 251, 150, 203, 101, 144],
      name: "assign_new_treasure_authority"
    },
    {
      accounts: [
        {
          name: "owner",
          relations: ["root"],
          signer: true,
          writable: true
        },
        {
          name: "controller"
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          },
          writable: true
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "controller",
          type: "pubkey"
        }
      ],
      discriminator: [191, 5, 46, 10, 82, 189, 89, 219],
      name: "change_controller"
    },
    {
      accounts: [
        {
          name: "owner",
          relations: ["root"],
          signer: true,
          writable: true
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          },
          writable: true
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "graceful_period",
          type: "i64"
        }
      ],
      discriminator: [145, 4, 98, 5, 20, 246, 158, 126],
      name: "change_graceful_period"
    },
    {
      accounts: [
        {
          name: "signer",
          signer: true,
          writable: true
        },
        {
          name: "authority",
          relations: ["card"],
          writable: true
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          }
        },
        {
          name: "treasure_token_account",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  101,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                kind: "account",
                path: "root"
              }
            ]
          },
          writable: true
        },
        {
          name: "card",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 97, 114, 100]
              },
              {
                kind: "account",
                path: "card_token_account"
              }
            ]
          },
          writable: true
        },
        {
          name: "card_token_account",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 97, 114, 100, 95, 116, 111, 107, 101, 110]
              },
              {
                kind: "arg",
                path: "card_seed"
              },
              {
                kind: "account",
                path: "root"
              }
            ]
          },
          writable: true
        },
        {
          name: "token_mint"
        },
        {
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          name: "token_program"
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "card_seed",
          type: {
            array: ["u8", 32]
          }
        }
      ],
      discriminator: [142, 206, 170, 182, 227, 204, 185, 115],
      name: "close_card"
    },
    {
      accounts: [
        {
          name: "owner",
          signer: true,
          writable: true
        },
        {
          name: "controller",
          writable: true
        },
        {
          name: "authority",
          relations: ["card"],
          writable: true
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          }
        },
        {
          name: "card",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 97, 114, 100]
              },
              {
                kind: "account",
                path: "card_token_account"
              }
            ]
          },
          writable: true
        },
        {
          name: "card_token_account",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 97, 114, 100, 95, 116, 111, 107, 101, 110]
              },
              {
                kind: "arg",
                path: "card_seed"
              },
              {
                kind: "account",
                path: "root"
              }
            ]
          },
          writable: true
        },
        {
          name: "token_mint"
        },
        {
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          name: "token_program"
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "card_seed",
          type: {
            array: ["u8", 32]
          }
        }
      ],
      discriminator: [199, 58, 181, 228, 23, 155, 200, 173],
      name: "delete_card"
    },
    {
      accounts: [
        {
          name: "signer",
          signer: true,
          writable: true
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          }
        },
        {
          name: "token_mint"
        },
        {
          name: "sender_token_account",
          writable: true
        },
        {
          name: "card",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 97, 114, 100]
              },
              {
                kind: "account",
                path: "card_token_account"
              }
            ]
          },
          writable: true
        },
        {
          name: "card_token_account",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 97, 114, 100, 95, 116, 111, 107, 101, 110]
              },
              {
                kind: "arg",
                path: "card_seed"
              },
              {
                kind: "account",
                path: "root"
              }
            ]
          },
          writable: true
        },
        {
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          name: "token_program"
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "card_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "amount",
          type: "u64"
        }
      ],
      discriminator: [221, 131, 111, 52, 236, 215, 120, 228],
      name: "deposit_card"
    },
    {
      accounts: [
        {
          name: "support_authority",
          signer: true,
          writable: true
        },
        {
          name: "controller",
          relations: ["root"],
          writable: true
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          }
        },
        {
          name: "token_mint"
        },
        {
          name: "card_token_account_from",
          writable: true
        },
        {
          name: "card_token_account_to",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 97, 114, 100, 95, 116, 111, 107, 101, 110]
              },
              {
                kind: "arg",
                path: "card_seed"
              },
              {
                kind: "account",
                path: "root"
              }
            ]
          },
          writable: true
        },
        {
          name: "card",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 97, 114, 100]
              },
              {
                kind: "account",
                path: "card_token_account_to"
              }
            ]
          },
          writable: true
        },
        {
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          name: "token_program"
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "card_seed",
          type: {
            array: ["u8", 32]
          }
        }
      ],
      discriminator: [158, 48, 134, 50, 85, 60, 29, 32],
      name: "fix_incorrect_deposit"
    },
    {
      accounts: [
        {
          name: "signer",
          signer: true,
          writable: true
        },
        {
          name: "token_mint"
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          },
          writable: true
        },
        {
          name: "treasure_token_account",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  101,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                kind: "account",
                path: "root"
              }
            ]
          },
          writable: true
        },
        {
          address: "11111111111111111111111111111111",
          name: "system_program"
        },
        {
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          name: "token_program"
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "controller",
          type: "pubkey"
        },
        {
          name: "treasure_authority",
          type: "pubkey"
        },
        {
          name: "graceful_period",
          type: "i64"
        }
      ],
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237],
      name: "initialize"
    },
    {
      accounts: [
        {
          name: "controller",
          relations: ["root"],
          signer: true,
          writable: true
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          }
        },
        {
          name: "card",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 97, 114, 100]
              },
              {
                kind: "account",
                path: "card_token_account"
              }
            ]
          },
          writable: true
        },
        {
          name: "token_mint"
        },
        {
          name: "authority_token_account"
        },
        {
          name: "card_token_account",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 97, 114, 100, 95, 116, 111, 107, 101, 110]
              },
              {
                kind: "arg",
                path: "card_seed"
              },
              {
                kind: "account",
                path: "root"
              }
            ]
          },
          writable: true
        },
        {
          address: "11111111111111111111111111111111",
          name: "system_program"
        },
        {
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          name: "token_program"
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "card_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "tz_offset",
          type: "i32"
        }
      ],
      discriminator: [85, 225, 118, 108, 55, 196, 187, 32],
      name: "issue_card"
    },
    {
      accounts: [
        {
          name: "owner",
          relations: ["root"],
          signer: true,
          writable: true
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          },
          writable: true
        },
        {
          address: "11111111111111111111111111111111",
          name: "system_program"
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        }
      ],
      discriminator: [8, 79, 38, 152, 201, 35, 176, 64],
      name: "migrate_to_add_support_authority"
    },
    {
      accounts: [
        {
          name: "treasure_authority",
          relations: ["root"],
          signer: true,
          writable: true
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          }
        },
        {
          name: "token_mint"
        },
        {
          name: "treasure_token_account",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  101,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                kind: "account",
                path: "root"
              }
            ]
          },
          writable: true
        },
        {
          name: "card",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 97, 114, 100]
              },
              {
                kind: "account",
                path: "card_token_account"
              }
            ]
          },
          writable: true
        },
        {
          name: "card_token_account",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 97, 114, 100, 95, 116, 111, 107, 101, 110]
              },
              {
                kind: "arg",
                path: "card_seed"
              },
              {
                kind: "account",
                path: "root"
              }
            ]
          },
          writable: true
        },
        {
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          name: "token_program"
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "card_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "amount",
          type: "u64"
        },
        {
          name: "query_id",
          type: "u64"
        }
      ],
      discriminator: [2, 96, 183, 251, 63, 208, 46, 46],
      name: "refund"
    },
    {
      accounts: [
        {
          name: "owner",
          relations: ["root"],
          signer: true,
          writable: true
        },
        {
          name: "token_mint"
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          },
          writable: true
        },
        {
          name: "recipient_token_account"
        },
        {
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          name: "token_program"
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        }
      ],
      discriminator: [7, 144, 216, 239, 243, 236, 193, 235],
      name: "remove_from_whitelist"
    },
    {
      accounts: [
        {
          name: "owner",
          relations: ["root"],
          signer: true,
          writable: true
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          }
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        }
      ],
      discriminator: [63, 65, 221, 162, 75, 79, 86, 174],
      name: "reset_whitelist"
    },
    {
      accounts: [
        {
          name: "owner",
          relations: ["root"],
          signer: true,
          writable: true
        },
        {
          name: "support_authority"
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          },
          writable: true
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        }
      ],
      discriminator: [180, 237, 50, 89, 95, 203, 215, 156],
      name: "set_support_authority"
    },
    {
      accounts: [
        {
          name: "signer",
          signer: true,
          writable: true
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          }
        },
        {
          name: "token_mint",
          writable: true
        },
        {
          name: "card",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 97, 114, 100]
              },
              {
                kind: "account",
                path: "card_token_account"
              }
            ]
          },
          writable: true
        },
        {
          name: "card_token_account",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 97, 114, 100, 95, 116, 111, 107, 101, 110]
              },
              {
                kind: "arg",
                path: "card_seed"
              },
              {
                kind: "account",
                path: "root"
              }
            ]
          }
        },
        {
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          name: "token_program"
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "card_seed",
          type: {
            array: ["u8", 32]
          }
        }
      ],
      discriminator: [29, 234, 106, 252, 50, 237, 78, 42],
      name: "sync_card_balance"
    },
    {
      accounts: [
        {
          name: "signer",
          signer: true,
          writable: true
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          }
        },
        {
          name: "token_mint"
        },
        {
          name: "authority",
          relations: ["card"]
        },
        {
          name: "card",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 97, 114, 100]
              },
              {
                kind: "account",
                path: "card_token_account"
              }
            ]
          },
          writable: true
        },
        {
          name: "card_token_account",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 97, 114, 100, 95, 116, 111, 107, 101, 110]
              },
              {
                kind: "arg",
                path: "card_seed"
              },
              {
                kind: "account",
                path: "root"
              }
            ]
          },
          writable: true
        },
        {
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          name: "token_program"
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "card_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "new_onetime",
          type: "u64"
        },
        {
          name: "new_daily",
          type: "u64"
        },
        {
          name: "new_monthly",
          type: "u64"
        },
        {
          name: "new_seqno",
          type: "u32"
        }
      ],
      discriminator: [139, 136, 98, 120, 163, 16, 216, 197],
      name: "update_card_limits"
    },
    {
      accounts: [
        {
          name: "controller",
          relations: ["root"],
          signer: true,
          writable: true
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          }
        },
        {
          name: "treasure_token_account",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  101,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                kind: "account",
                path: "root"
              }
            ]
          },
          writable: true
        },
        {
          name: "recipient_token_account",
          writable: true
        },
        {
          name: "card",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 97, 114, 100]
              },
              {
                kind: "account",
                path: "card_token_account"
              }
            ]
          },
          writable: true
        },
        {
          name: "card_token_account",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 97, 114, 100, 95, 116, 111, 107, 101, 110]
              },
              {
                kind: "arg",
                path: "card_seed"
              },
              {
                kind: "account",
                path: "root"
              }
            ]
          },
          writable: true
        },
        {
          name: "token_mint"
        },
        {
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          name: "token_program"
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "card_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "state",
          type: {
            defined: {
              name: "UpdateCardData"
            }
          }
        },
        {
          name: "limits_seqno",
          type: "u32"
        }
      ],
      discriminator: [143, 199, 250, 162, 184, 67, 241, 82],
      name: "update_card_state"
    },
    {
      accounts: [
        {
          name: "treasure_authority",
          relations: ["root"],
          signer: true,
          writable: true
        },
        {
          name: "root",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 111, 111, 116]
              },
              {
                kind: "arg",
                path: "root_seed"
              }
            ]
          }
        },
        {
          name: "treasure_token_account",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  101,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                kind: "account",
                path: "root"
              }
            ]
          },
          writable: true
        },
        {
          name: "recipient_token_account",
          writable: true
        },
        {
          name: "token_mint"
        },
        {
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          name: "token_program"
        }
      ],
      args: [
        {
          name: "root_seed",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "amount",
          type: "u64"
        }
      ],
      discriminator: [223, 238, 204, 12, 224, 1, 29, 134],
      name: "withdraw_from_treasure"
    }
  ],
  metadata: {
    description: "Created with Anchor",
    name: "holders",
    spec: "0.1.0",
    version: "0.1.0"
  },
  types: [
    {
      name: "Card",
      type: {
        fields: [
          {
            name: "bump",
            type: "u8"
          },
          {
            name: "authority",
            type: "pubkey"
          },
          {
            name: "token_account",
            type: "pubkey"
          },
          {
            name: "seed",
            type: {
              array: ["u8", 32]
            }
          },
          {
            name: "seqno",
            type: "u32"
          },
          {
            name: "last_state_at",
            type: "i64"
          },
          {
            name: "transferred_a",
            type: "u64"
          },
          {
            name: "transferred_b",
            type: "u64"
          },
          {
            name: "deposited_a",
            type: "u64"
          },
          {
            name: "deposited_b",
            type: "u64"
          },
          {
            name: "withdrawn_a",
            type: "u64"
          },
          {
            name: "withdrawn_b",
            type: "u64"
          },
          {
            name: "status",
            type: {
              defined: {
                name: "CardStatus"
              }
            }
          },
          {
            name: "deadline",
            type: "i64"
          },
          {
            name: "tz_offset",
            type: {
              defined: {
                name: "TzOffset"
              }
            }
          },
          {
            name: "limits",
            type: {
              defined: {
                name: "Limits"
              }
            }
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "CardStatus",
      repr: {
        kind: "rust"
      },
      type: {
        kind: "enum",
        variants: [
          {
            name: "Active"
          },
          {
            name: "RequestCloseA"
          },
          {
            name: "Closed"
          }
        ]
      }
    },
    {
      name: "Limits",
      type: {
        fields: [
          {
            name: "onetime",
            type: "u64"
          },
          {
            name: "daily",
            type: "u64"
          },
          {
            name: "monthly",
            type: "u64"
          },
          {
            name: "spent_daily",
            type: "u64"
          },
          {
            name: "spent_monthly",
            type: "u64"
          },
          {
            name: "daily_deadline",
            type: "i64"
          },
          {
            name: "monthly_deadline",
            type: "i64"
          },
          {
            name: "seqno",
            type: "u32"
          },
          {
            name: "pending_limits_queue",
            type: {
              defined: {
                generics: [
                  {
                    kind: "const",
                    value: "5"
                  }
                ],
                name: "OrderedList"
              }
            }
          }
        ],
        kind: "struct"
      }
    },
    {
      generics: [
        {
          kind: "const",
          name: "L",
          type: "usize"
        }
      ],
      name: "OrderedList",
      type: {
        fields: [
          {
            name: "inner",
            type: {
              vec: {
                defined: {
                  name: "PendingLimits"
                }
              }
            }
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "PendingLimits",
      type: {
        fields: [
          {
            name: "onetime",
            type: "u64"
          },
          {
            name: "daily",
            type: "u64"
          },
          {
            name: "monthly",
            type: "u64"
          },
          {
            name: "seqno",
            type: "u32"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "Refunded",
      type: {
        fields: [
          {
            name: "query_id",
            type: "u64"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "Root",
      type: {
        fields: [
          {
            name: "bump",
            type: "u8"
          },
          {
            name: "seed",
            type: {
              array: ["u8", 32]
            }
          },
          {
            name: "owner",
            type: "pubkey"
          },
          {
            name: "controller",
            type: "pubkey"
          },
          {
            name: "token_mint",
            type: "pubkey"
          },
          {
            name: "graceful_period",
            type: "i64"
          },
          {
            name: "treasure_authority",
            type: "pubkey"
          },
          {
            name: "treasure_token_account",
            type: "pubkey"
          },
          {
            name: "whitelist",
            type: {
              vec: "pubkey"
            }
          },
          {
            name: "support_authority",
            type: {
              option: "pubkey"
            }
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "TzOffset",
      type: {
        fields: [
          {
            name: "value",
            type: "i32"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "UpdateCardData",
      type: {
        fields: [
          {
            name: "seqno",
            type: "u32"
          },
          {
            name: "transferred_a",
            type: "u64"
          },
          {
            name: "transferred_b",
            type: "u64"
          },
          {
            name: "withdraw_a",
            type: "u64"
          },
          {
            name: "withdraw_b",
            type: "u64"
          },
          {
            name: "close",
            type: "bool"
          },
          {
            name: "timestamp",
            type: "i64"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "UpdatedCard",
      type: {
        fields: [
          {
            name: "authority",
            type: "pubkey"
          },
          {
            name: "token_account",
            type: "pubkey"
          },
          {
            name: "seed",
            type: {
              array: ["u8", 32]
            }
          },
          {
            name: "seqno",
            type: "u32"
          },
          {
            name: "last_state_at",
            type: "i64"
          },
          {
            name: "transferred_a",
            type: "u64"
          },
          {
            name: "transferred_b",
            type: "u64"
          },
          {
            name: "deposited_a",
            type: "u64"
          },
          {
            name: "deposited_b",
            type: "u64"
          },
          {
            name: "withdrawn_a",
            type: "u64"
          },
          {
            name: "withdrawn_b",
            type: "u64"
          },
          {
            name: "status",
            type: {
              defined: {
                name: "CardStatus"
              }
            }
          },
          {
            name: "deadline",
            type: "i64"
          },
          {
            name: "tz_offset",
            type: {
              defined: {
                name: "TzOffset"
              }
            }
          },
          {
            name: "limits",
            type: {
              defined: {
                name: "Limits"
              }
            }
          }
        ],
        kind: "struct"
      }
    }
  ]
};

// idl/magic-eden-v2.json
var magic_eden_v2_default = {
  accounts: [
    {
      name: "BuyerTradeState",
      type: {
        fields: [
          {
            name: "auctionHouseKey",
            type: "publicKey"
          },
          {
            name: "buyer",
            type: "publicKey"
          },
          {
            name: "buyerReferral",
            type: "publicKey"
          },
          {
            name: "buyerPrice",
            type: "u64"
          },
          {
            name: "tokenMint",
            type: "publicKey"
          },
          {
            name: "tokenSize",
            type: "u64"
          },
          {
            name: "bump",
            type: "u8"
          },
          {
            name: "expiry",
            type: "i64"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "SellerTradeState",
      type: {
        fields: [
          {
            name: "auctionHouseKey",
            type: "publicKey"
          },
          {
            name: "seller",
            type: "publicKey"
          },
          {
            name: "sellerReferral",
            type: "publicKey"
          },
          {
            name: "buyerPrice",
            type: "u64"
          },
          {
            name: "tokenMint",
            type: "publicKey"
          },
          {
            name: "tokenAccount",
            type: "publicKey"
          },
          {
            name: "tokenSize",
            type: "u64"
          },
          {
            name: "bump",
            type: "u8"
          },
          {
            name: "expiry",
            type: "i64"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "SellerTradeStateV2",
      type: {
        fields: [
          {
            name: "auctionHouseKey",
            type: "publicKey"
          },
          {
            name: "seller",
            type: "publicKey"
          },
          {
            name: "sellerReferral",
            type: "publicKey"
          },
          {
            name: "buyerPrice",
            type: "u64"
          },
          {
            name: "tokenMint",
            type: "publicKey"
          },
          {
            name: "tokenAccount",
            type: "publicKey"
          },
          {
            name: "tokenSize",
            type: "u64"
          },
          {
            name: "bump",
            type: "u8"
          },
          {
            name: "expiry",
            type: "i64"
          },
          {
            name: "paymentMint",
            type: "publicKey"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "AuctionHouse",
      type: {
        fields: [
          {
            name: "auctionHouseTreasury",
            type: "publicKey"
          },
          {
            name: "treasuryWithdrawalDestination",
            type: "publicKey"
          },
          {
            name: "authority",
            type: "publicKey"
          },
          {
            name: "creator",
            type: "publicKey"
          },
          {
            name: "notary",
            type: "publicKey"
          },
          {
            name: "bump",
            type: "u8"
          },
          {
            name: "treasuryBump",
            type: "u8"
          },
          {
            name: "sellerFeeBasisPoints",
            type: "u16"
          },
          {
            name: "buyerReferralBp",
            type: "u16"
          },
          {
            name: "sellerReferralBp",
            type: "u16"
          },
          {
            name: "requiresNotary",
            type: "bool"
          },
          {
            name: "nprob",
            type: "u8"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "BuyerTradeStateV2",
      type: {
        fields: [
          {
            name: "auctionHouseKey",
            type: "publicKey"
          },
          {
            name: "buyer",
            type: "publicKey"
          },
          {
            name: "buyerReferral",
            type: "publicKey"
          },
          {
            name: "buyerPrice",
            type: "u64"
          },
          {
            name: "tokenMint",
            type: "publicKey"
          },
          {
            name: "tokenSize",
            type: "u64"
          },
          {
            name: "bump",
            type: "u8"
          },
          {
            name: "expiry",
            type: "i64"
          },
          {
            name: "buyerCreatorRoyaltyBp",
            type: "u16"
          },
          {
            name: "paymentMint",
            type: "publicKey"
          }
        ],
        kind: "struct"
      }
    }
  ],
  errors: [
    {
      code: 6e3,
      msg: "PublicKeyMismatch",
      name: "PublicKeyMismatch"
    },
    {
      code: 6001,
      msg: "InvalidMintAuthority",
      name: "InvalidMintAuthority"
    },
    {
      code: 6002,
      msg: "UninitializedAccount",
      name: "UninitializedAccount"
    },
    {
      code: 6003,
      msg: "IncorrectOwner",
      name: "IncorrectOwner"
    },
    {
      code: 6004,
      msg: "PublicKeysShouldBeUnique",
      name: "PublicKeysShouldBeUnique"
    },
    {
      code: 6005,
      msg: "StatementFalse",
      name: "StatementFalse"
    },
    {
      code: 6006,
      msg: "NotRentExempt",
      name: "NotRentExempt"
    },
    {
      code: 6007,
      msg: "NumericalOverflow",
      name: "NumericalOverflow"
    },
    {
      code: 6008,
      msg: "Expected a sol account but got an spl token account instead",
      name: "ExpectedSolAccount"
    },
    {
      code: 6009,
      msg: "Cannot exchange sol for sol",
      name: "CannotExchangeSOLForSol"
    },
    {
      code: 6010,
      msg: "If paying with sol, sol wallet must be signer",
      name: "SOLWalletMustSign"
    },
    {
      code: 6011,
      msg: "Cannot take this action without auction house signing too",
      name: "CannotTakeThisActionWithoutAuctionHouseSignOff"
    },
    {
      code: 6012,
      msg: "No payer present on this txn",
      name: "NoPayerPresent"
    },
    {
      code: 6013,
      msg: "Derived key invalid",
      name: "DerivedKeyInvalid"
    },
    {
      code: 6014,
      msg: "Metadata doesn't exist",
      name: "MetadataDoesntExist"
    },
    {
      code: 6015,
      msg: "Invalid token amount",
      name: "InvalidTokenAmount"
    },
    {
      code: 6016,
      msg: "Both parties need to agree to this sale",
      name: "BothPartiesNeedToAgreeToSale"
    },
    {
      code: 6017,
      msg: "Cannot match free sales unless the auction house or seller signs off",
      name: "CannotMatchFreeSalesWithoutAuctionHouseOrSellerSignoff"
    },
    {
      code: 6018,
      msg: "This sale requires a signer",
      name: "SaleRequiresSigner"
    },
    {
      code: 6019,
      msg: "Old seller not initialized",
      name: "OldSellerNotInitialized"
    },
    {
      code: 6020,
      msg: "Seller ata cannot have a delegate set",
      name: "SellerATACannotHaveDelegate"
    },
    {
      code: 6021,
      msg: "Buyer ata cannot have a delegate set",
      name: "BuyerATACannotHaveDelegate"
    },
    {
      code: 6022,
      msg: "No valid signer present",
      name: "NoValidSignerPresent"
    },
    {
      code: 6023,
      msg: "Invalid BP",
      name: "InvalidBasisPoints"
    },
    {
      code: 6024,
      msg: "Invalid notary",
      name: "InvalidNotary"
    },
    {
      code: 6025,
      msg: "Empty trade state",
      name: "EmptyTradeState"
    },
    {
      code: 6026,
      msg: "Invalid expiry",
      name: "InvalidExpiry"
    },
    {
      code: 6027,
      msg: "Invalid price",
      name: "InvalidPrice"
    },
    {
      code: 6028,
      msg: "Invalid remainning accounts without program_as_signer",
      name: "InvalidRemainingAccountsWithoutProgramAsSigner"
    },
    {
      code: 6029,
      msg: "Invalid bump",
      name: "InvalidBump"
    },
    {
      code: 6030,
      msg: "Invalid create auction house nonce",
      name: "InvalidCreateAuctionHouseNonce"
    },
    {
      code: 6031,
      msg: "Invalid account state",
      name: "InvalidAccountState"
    },
    {
      code: 6032,
      msg: "Invalid discriminator",
      name: "InvalidDiscriminator"
    },
    {
      code: 6033,
      msg: "Invalid platform fee bp",
      name: "InvalidPlatformFeeBp"
    },
    {
      code: 6034,
      msg: "Invalid token mint",
      name: "InvalidTokenMint"
    },
    {
      code: 6035,
      msg: "Invalid token standard",
      name: "InvalidTokenStandard"
    },
    {
      code: 6036,
      msg: "Deprecated",
      name: "Deprecated"
    },
    {
      code: 6037,
      msg: "Missing remaining account",
      name: "MissingRemainingAccount"
    },
    {
      code: 6038,
      msg: "Invalid trusted program or pda",
      name: "InvalidTrustedProgramOrPDA"
    },
    {
      code: 6039,
      msg: "Invalid token program",
      name: "InvalidTokenProgram"
    }
  ],
  instructions: [
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "treasuryWithdrawalDestination"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseTreasury"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        }
      ],
      name: "withdrawFromTreasury"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: true,
          name: "payer"
        },
        {
          isMut: false,
          isSigner: false,
          name: "notary"
        },
        {
          isMut: false,
          isSigner: true,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "newAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "treasuryWithdrawalDestination"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "sellerFeeBasisPoints",
          type: {
            option: "u16"
          }
        },
        {
          name: "buyerReferralBp",
          type: {
            option: "u16"
          }
        },
        {
          name: "sellerReferralBp",
          type: {
            option: "u16"
          }
        },
        {
          name: "requiresNotary",
          type: {
            option: "bool"
          }
        },
        {
          name: "nprob",
          type: {
            option: "u8"
          }
        }
      ],
      name: "updateAuctionHouse"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: true,
          name: "payer"
        },
        {
          isMut: false,
          isSigner: false,
          name: "notary"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "treasuryWithdrawalDestination"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseTreasury"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "bump",
          type: "u8"
        },
        {
          name: "treasuryBump",
          type: "u8"
        },
        {
          name: "sellerFeeBasisPoints",
          type: "u16"
        },
        {
          name: "buyerReferralBp",
          type: "u16"
        },
        {
          name: "sellerReferralBp",
          type: "u16"
        },
        {
          name: "requiresNotary",
          type: "bool"
        },
        {
          name: "createAuctionHouseNonce",
          type: "u64"
        }
      ],
      name: "createAuctionHouse"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "wallet"
        },
        {
          isMut: false,
          isSigner: false,
          name: "notary"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "escrowPaymentBump",
          type: "u8"
        },
        {
          name: "amount",
          type: "u64"
        }
      ],
      name: "withdraw"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "wallet"
        },
        {
          isMut: false,
          isSigner: false,
          name: "notary"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "escrowPaymentBump",
          type: "u8"
        },
        {
          name: "amount",
          type: "u64"
        }
      ],
      name: "deposit"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: true,
          name: "wallet"
        },
        {
          isMut: false,
          isSigner: false,
          name: "notary"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenAta"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerTradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "sellerReferral"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ataProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "programAsSigner"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "sellerStateBump",
          type: "u8"
        },
        {
          name: "programAsSignerBump",
          type: "u8"
        },
        {
          name: "buyerPrice",
          type: "u64"
        },
        {
          name: "tokenSize",
          type: "u64"
        },
        {
          name: "sellerStateExpiry",
          type: "i64"
        }
      ],
      name: "sell"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "wallet"
        },
        {
          isMut: false,
          isSigner: false,
          name: "notary"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerTradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "sellerReferral"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        }
      ],
      args: [
        {
          name: "buyerPrice",
          type: "u64"
        },
        {
          name: "tokenSize",
          type: "u64"
        },
        {
          name: "sellerStateExpiry",
          type: "i64"
        }
      ],
      name: "cancelSell"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: true,
          name: "wallet"
        },
        {
          isMut: false,
          isSigner: false,
          name: "notary"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerTradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "buyerReferral"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "buyerStateBump",
          type: "u8"
        },
        {
          name: "escrowPaymentBump",
          type: "u8"
        },
        {
          name: "buyerPrice",
          type: "u64"
        },
        {
          name: "tokenSize",
          type: "u64"
        },
        {
          name: "buyerStateExpiry",
          type: "i64"
        }
      ],
      name: "buy"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: true,
          name: "wallet"
        },
        {
          isMut: false,
          isSigner: false,
          name: "notary"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerTradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "buyerReferral"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "buyerPrice",
          type: "u64"
        },
        {
          name: "tokenSize",
          type: "u64"
        },
        {
          name: "buyerStateExpiry",
          type: "i64"
        },
        {
          name: "buyerCreatorRoyaltyBp",
          type: "u16"
        },
        {
          name: "extraArgs",
          type: "bytes"
        }
      ],
      name: "buyV2"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "wallet"
        },
        {
          isMut: false,
          isSigner: false,
          name: "notary"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerTradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "buyerReferral"
        }
      ],
      args: [
        {
          name: "buyerPrice",
          type: "u64"
        },
        {
          name: "tokenSize",
          type: "u64"
        },
        {
          name: "buyerStateExpiry",
          type: "i64"
        }
      ],
      name: "cancelBuy"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: true,
          name: "wallet"
        },
        {
          isMut: false,
          isSigner: false,
          name: "notary"
        },
        {
          isMut: false,
          isSigner: false,
          name: "programAsSigner"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenAta"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerTradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "sellerReferral"
        },
        {
          isMut: true,
          isSigner: false,
          name: "ocpMintState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ocpPolicy"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ocpFreezeAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ocpProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "cmtProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "instructions"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "args",
          type: {
            defined: "OCPSellArgs"
          }
        }
      ],
      name: "ocpSell"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "wallet"
        },
        {
          isMut: false,
          isSigner: true,
          name: "notary"
        },
        {
          isMut: false,
          isSigner: false,
          name: "programAsSigner"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenAta"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerTradeState"
        },
        {
          isMut: true,
          isSigner: false,
          name: "ocpMintState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ocpPolicy"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ocpFreezeAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ocpProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "cmtProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "instructions"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [],
      name: "ocpCancelSell"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: true,
          name: "payer"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyer"
        },
        {
          isMut: true,
          isSigner: false,
          name: "seller"
        },
        {
          isMut: false,
          isSigner: false,
          name: "notary"
        },
        {
          isMut: false,
          isSigner: false,
          name: "programAsSigner"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerTokenAta"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerTokenAta"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseTreasury"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerTradeState"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerTradeState"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerEscrowPaymentAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerReferral"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerReferral"
        },
        {
          isMut: true,
          isSigner: false,
          name: "ocpMintState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ocpPolicy"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ocpFreezeAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ocpProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "cmtProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "instructions"
        },
        {
          isMut: false,
          isSigner: false,
          name: "associatedTokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "args",
          type: {
            defined: "OCPExecuteSaleV2Args"
          }
        }
      ],
      name: "ocpExecuteSaleV2"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "buyer"
        },
        {
          isMut: true,
          isSigner: false,
          name: "seller"
        },
        {
          isMut: false,
          isSigner: false,
          name: "notary"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerReceiptTokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseTreasury"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerTradeState"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerReferral"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerTradeState"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerReferral"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ataProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "programAsSigner"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "escrowPaymentBump",
          type: "u8"
        },
        {
          name: "programAsSignerBump",
          type: "u8"
        },
        {
          name: "buyerPrice",
          type: "u64"
        },
        {
          name: "tokenSize",
          type: "u64"
        },
        {
          name: "buyerStateExpiry",
          type: "i64"
        },
        {
          name: "sellerStateExpiry",
          type: "i64"
        },
        {
          name: "makerFeeBp",
          type: "i16"
        },
        {
          name: "takerFeeBp",
          type: "u16"
        }
      ],
      name: "executeSaleV2"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: true,
          name: "wallet"
        },
        {
          isMut: false,
          isSigner: false,
          name: "notary"
        },
        {
          isMut: false,
          isSigner: false,
          name: "programAsSigner"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: true,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerTradeState"
        },
        {
          isMut: true,
          isSigner: false,
          name: "migrationSellerTradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "sellerReferral"
        },
        {
          docs: [
            "escrow mode for init sell:        we transfer from token_account to token_ata",
            "escrow mode for change price:     token_account is the same as token_ata",
            "migration mode for change price:  token_ata is not used, because we only need token_account which is owned by program_as_signer"
          ],
          isMut: true,
          isSigner: false,
          name: "tokenAta"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMetadataProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "edition"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authorizationRulesProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authorizationRules"
        },
        {
          isMut: false,
          isSigner: false,
          name: "instructions"
        },
        {
          isMut: true,
          isSigner: false,
          name: "ownerTokenRecord"
        },
        {
          isMut: true,
          isSigner: false,
          name: "destinationTokenRecord"
        },
        {
          isMut: false,
          isSigner: false,
          name: "associatedTokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "args",
          type: {
            defined: "MIP1SellArgs"
          }
        }
      ],
      name: "mip1Sell"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: true,
          name: "payer"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyer"
        },
        {
          isMut: true,
          isSigner: false,
          name: "seller"
        },
        {
          isMut: false,
          isSigner: false,
          name: "notary"
        },
        {
          isMut: false,
          isSigner: false,
          name: "programAsSigner"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerReceiptTokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: true,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseTreasury"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerTradeState"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerTradeState"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerEscrowPaymentAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerReferral"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerReferral"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMetadataProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "edition"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authorizationRulesProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authorizationRules"
        },
        {
          isMut: true,
          isSigner: false,
          name: "ownerTokenRecord"
        },
        {
          isMut: true,
          isSigner: false,
          name: "destinationTokenRecord"
        },
        {
          isMut: false,
          isSigner: false,
          name: "instructions"
        },
        {
          isMut: false,
          isSigner: false,
          name: "associatedTokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "args",
          type: {
            defined: "MIP1ExecuteSaleV2Args"
          }
        }
      ],
      name: "mip1ExecuteSaleV2"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: true,
          name: "wallet"
        },
        {
          isMut: false,
          isSigner: true,
          name: "notary"
        },
        {
          isMut: false,
          isSigner: false,
          name: "programAsSigner"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenAta"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: true,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerTradeState"
        },
        {
          docs: ["should always be ATA of (mint, wallet)"],
          isMut: true,
          isSigner: false,
          name: "tokenAccount"
        },
        {
          docs: ["should always be ATA of (mint, program_as_signer)"],
          isMut: true,
          isSigner: false,
          name: "tokenAccountTemp"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tempTokenRecord"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMetadataProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "edition"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authorizationRulesProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authorizationRules"
        },
        {
          isMut: true,
          isSigner: false,
          name: "ownerTokenRecord"
        },
        {
          isMut: true,
          isSigner: false,
          name: "destinationTokenRecord"
        },
        {
          isMut: false,
          isSigner: false,
          name: "instructions"
        },
        {
          isMut: false,
          isSigner: false,
          name: "associatedTokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [],
      name: "mip1CancelSell"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: true,
          name: "mmmPool"
        },
        {
          isMut: true,
          isSigner: false,
          name: "to"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "args",
          type: {
            defined: "WithdrawByMMMArgs"
          }
        }
      ],
      name: "withdrawByMmm"
    }
  ],
  name: "m2",
  types: [
    {
      name: "WithdrawByMMMArgs",
      type: {
        fields: [
          {
            name: "wallet",
            type: "publicKey"
          },
          {
            name: "auctionHouse",
            type: "publicKey"
          },
          {
            name: "amount",
            type: "u64"
          },
          {
            name: "mmmPoolUuid",
            type: "publicKey"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "MIP1ExecuteSaleV2Args",
      type: {
        fields: [
          {
            name: "price",
            type: "u64"
          },
          {
            name: "makerFeeBp",
            type: "i16"
          },
          {
            name: "takerFeeBp",
            type: "u16"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "MIP1SellArgs",
      type: {
        fields: [
          {
            name: "price",
            type: "u64"
          },
          {
            name: "expiry",
            type: "i64"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "OCPExecuteSaleV2Args",
      type: {
        fields: [
          {
            name: "price",
            type: "u64"
          },
          {
            name: "makerFeeBp",
            type: "i16"
          },
          {
            name: "takerFeeBp",
            type: "u16"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "OCPSellArgs",
      type: {
        fields: [
          {
            name: "price",
            type: "u64"
          },
          {
            name: "expiry",
            type: "i64"
          }
        ],
        kind: "struct"
      }
    }
  ],
  version: "0.1.0"
};

// idl/tensor.json
var tensor_default = {
  accounts: [
    {
      name: "MarginAccount",
      type: {
        fields: [
          {
            name: "owner",
            type: "publicKey"
          },
          {
            name: "name",
            type: {
              array: ["u8", 32]
            }
          },
          {
            name: "nr",
            type: "u16"
          },
          {
            name: "bump",
            type: {
              array: ["u8", 1]
            }
          },
          {
            name: "poolsAttached",
            type: "u32"
          },
          {
            name: "reserved",
            type: {
              array: ["u8", 64]
            }
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "TSwap",
      type: {
        fields: [
          {
            name: "version",
            type: "u8"
          },
          {
            name: "bump",
            type: {
              array: ["u8", 1]
            }
          },
          {
            docs: ["@DEPRECATED, use constant above instead"],
            name: "config",
            type: {
              defined: "TSwapConfig"
            }
          },
          {
            name: "owner",
            type: "publicKey"
          },
          {
            name: "feeVault",
            type: "publicKey"
          },
          {
            name: "cosigner",
            type: "publicKey"
          }
        ],
        kind: "struct"
      }
    }
  ],
  constants: [
    {
      name: "CURRENT_TSWAP_VERSION",
      type: "u8",
      value: "1"
    },
    {
      name: "MARGIN_SIZE",
      type: {
        defined: "usize"
      },
      value: "8 + 32 + 32 + 2 + 1 + 4 + 64"
    },
    {
      name: "TSWAP_SIZE",
      type: {
        defined: "usize"
      },
      value: "8 + 1 + 1 + 2 + 32 * 3"
    }
  ],
  errors: [
    {
      code: 6016,
      msg: "bad owner",
      name: "BadOwner"
    },
    {
      code: 6027,
      msg: "bad margin account passed",
      name: "BadMargin"
    }
  ],
  instructions: [
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "tswap"
        },
        {
          isMut: false,
          isSigner: false,
          name: "feeVault"
        },
        {
          docs: [
            "We ask also for a signature just to make sure this wallet can actually sign things"
          ],
          isMut: false,
          isSigner: true,
          name: "cosigner"
        },
        {
          isMut: true,
          isSigner: true,
          name: "owner"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: true,
          name: "newOwner"
        }
      ],
      args: [
        {
          name: "config",
          type: {
            defined: "TSwapConfig"
          }
        }
      ],
      name: "initUpdateTswap"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "tswap"
        },
        {
          isMut: true,
          isSigner: false,
          name: "marginAccount"
        },
        {
          isMut: true,
          isSigner: true,
          name: "owner"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "marginNr",
          type: "u16"
        },
        {
          name: "name",
          type: {
            array: ["u8", 32]
          }
        }
      ],
      name: "initMarginAccount"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "tswap"
        },
        {
          isMut: true,
          isSigner: false,
          name: "marginAccount"
        },
        {
          isMut: true,
          isSigner: true,
          name: "owner"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [],
      name: "closeMarginAccount"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "tswap"
        },
        {
          isMut: true,
          isSigner: false,
          name: "marginAccount"
        },
        {
          isMut: true,
          isSigner: true,
          name: "owner"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "lamports",
          type: "u64"
        }
      ],
      name: "depositMarginAccount"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "tswap"
        },
        {
          isMut: true,
          isSigner: false,
          name: "marginAccount"
        },
        {
          isMut: true,
          isSigner: true,
          name: "owner"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "lamports",
          type: "u64"
        }
      ],
      name: "withdrawMarginAccount"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "marginAccount"
        },
        {
          isMut: false,
          isSigner: true,
          name: "pool"
        },
        {
          isMut: false,
          isSigner: false,
          name: "owner"
        },
        {
          isMut: true,
          isSigner: false,
          name: "destination"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "bump",
          type: "u8"
        },
        {
          name: "poolId",
          type: {
            array: ["u8", 32]
          }
        },
        {
          name: "lamports",
          type: "u64"
        }
      ],
      name: "withdrawMarginAccountCpiTamm"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "marginAccount"
        },
        {
          isMut: false,
          isSigner: true,
          name: "bidState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "owner"
        },
        {
          isMut: true,
          isSigner: false,
          name: "destination"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "bump",
          type: "u8"
        },
        {
          name: "bidId",
          type: "publicKey"
        },
        {
          name: "lamports",
          type: "u64"
        }
      ],
      name: "withdrawMarginAccountCpiTcomp"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "tswap"
        },
        {
          docs: [
            "We ask also for a signature just to make sure this wallet can actually sign things"
          ],
          isMut: false,
          isSigner: true,
          name: "cosigner"
        },
        {
          isMut: true,
          isSigner: true,
          name: "owner"
        },
        {
          isMut: true,
          isSigner: false,
          name: "destination"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "lamports",
          type: "u64"
        }
      ],
      name: "withdrawTswapFees"
    }
  ],
  name: "escrow_program",
  types: [
    {
      name: "TSwapConfig",
      type: {
        fields: [
          {
            name: "feeBps",
            type: "u16"
          }
        ],
        kind: "struct"
      }
    }
  ],
  version: "1.0.0-beta.1"
};

// idl/metaplex-auction-house.json
var metaplex_auction_house_default = {
  accounts: [
    {
      name: "BidReceipt",
      type: {
        fields: [
          {
            name: "tradeState",
            type: "publicKey"
          },
          {
            name: "bookkeeper",
            type: "publicKey"
          },
          {
            name: "auctionHouse",
            type: "publicKey"
          },
          {
            name: "buyer",
            type: "publicKey"
          },
          {
            name: "metadata",
            type: "publicKey"
          },
          {
            name: "tokenAccount",
            type: {
              option: "publicKey"
            }
          },
          {
            name: "purchaseReceipt",
            type: {
              option: "publicKey"
            }
          },
          {
            name: "price",
            type: "u64"
          },
          {
            name: "tokenSize",
            type: "u64"
          },
          {
            name: "bump",
            type: "u8"
          },
          {
            name: "tradeStateBump",
            type: "u8"
          },
          {
            name: "createdAt",
            type: "i64"
          },
          {
            name: "canceledAt",
            type: {
              option: "i64"
            }
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "ListingReceipt",
      type: {
        fields: [
          {
            name: "tradeState",
            type: "publicKey"
          },
          {
            name: "bookkeeper",
            type: "publicKey"
          },
          {
            name: "auctionHouse",
            type: "publicKey"
          },
          {
            name: "seller",
            type: "publicKey"
          },
          {
            name: "metadata",
            type: "publicKey"
          },
          {
            name: "purchaseReceipt",
            type: {
              option: "publicKey"
            }
          },
          {
            name: "price",
            type: "u64"
          },
          {
            name: "tokenSize",
            type: "u64"
          },
          {
            name: "bump",
            type: "u8"
          },
          {
            name: "tradeStateBump",
            type: "u8"
          },
          {
            name: "createdAt",
            type: "i64"
          },
          {
            name: "canceledAt",
            type: {
              option: "i64"
            }
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "PurchaseReceipt",
      type: {
        fields: [
          {
            name: "bookkeeper",
            type: "publicKey"
          },
          {
            name: "buyer",
            type: "publicKey"
          },
          {
            name: "seller",
            type: "publicKey"
          },
          {
            name: "auctionHouse",
            type: "publicKey"
          },
          {
            name: "metadata",
            type: "publicKey"
          },
          {
            name: "tokenSize",
            type: "u64"
          },
          {
            name: "price",
            type: "u64"
          },
          {
            name: "bump",
            type: "u8"
          },
          {
            name: "createdAt",
            type: "i64"
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "AuctionHouse",
      type: {
        fields: [
          {
            name: "auctionHouseFeeAccount",
            type: "publicKey"
          },
          {
            name: "auctionHouseTreasury",
            type: "publicKey"
          },
          {
            name: "treasuryWithdrawalDestination",
            type: "publicKey"
          },
          {
            name: "feeWithdrawalDestination",
            type: "publicKey"
          },
          {
            name: "treasuryMint",
            type: "publicKey"
          },
          {
            name: "authority",
            type: "publicKey"
          },
          {
            name: "creator",
            type: "publicKey"
          },
          {
            name: "bump",
            type: "u8"
          },
          {
            name: "treasuryBump",
            type: "u8"
          },
          {
            name: "feePayerBump",
            type: "u8"
          },
          {
            name: "sellerFeeBasisPoints",
            type: "u16"
          },
          {
            name: "requiresSignOff",
            type: "bool"
          },
          {
            name: "canChangeSalePrice",
            type: "bool"
          },
          {
            name: "escrowPaymentBump",
            type: "u8"
          },
          {
            name: "hasAuctioneer",
            type: "bool"
          },
          {
            name: "auctioneerAddress",
            type: "publicKey"
          },
          {
            name: "scopes",
            type: {
              array: ["bool", 7]
            }
          }
        ],
        kind: "struct"
      }
    },
    {
      name: "Auctioneer",
      type: {
        fields: [
          {
            name: "auctioneerAuthority",
            type: "publicKey"
          },
          {
            name: "auctionHouse",
            type: "publicKey"
          },
          {
            name: "bump",
            type: "u8"
          }
        ],
        kind: "struct"
      }
    }
  ],
  errors: [
    {
      code: 6e3,
      msg: "PublicKeyMismatch",
      name: "PublicKeyMismatch"
    },
    {
      code: 6001,
      msg: "InvalidMintAuthority",
      name: "InvalidMintAuthority"
    },
    {
      code: 6002,
      msg: "UninitializedAccount",
      name: "UninitializedAccount"
    },
    {
      code: 6003,
      msg: "IncorrectOwner",
      name: "IncorrectOwner"
    },
    {
      code: 6004,
      msg: "PublicKeysShouldBeUnique",
      name: "PublicKeysShouldBeUnique"
    },
    {
      code: 6005,
      msg: "StatementFalse",
      name: "StatementFalse"
    },
    {
      code: 6006,
      msg: "NotRentExempt",
      name: "NotRentExempt"
    },
    {
      code: 6007,
      msg: "NumericalOverflow",
      name: "NumericalOverflow"
    },
    {
      code: 6008,
      msg: "Expected a sol account but got an spl token account instead",
      name: "ExpectedSolAccount"
    },
    {
      code: 6009,
      msg: "Cannot exchange sol for sol",
      name: "CannotExchangeSOLForSol"
    },
    {
      code: 6010,
      msg: "If paying with sol, sol wallet must be signer",
      name: "SOLWalletMustSign"
    },
    {
      code: 6011,
      msg: "Cannot take this action without auction house signing too",
      name: "CannotTakeThisActionWithoutAuctionHouseSignOff"
    },
    {
      code: 6012,
      msg: "No payer present on this txn",
      name: "NoPayerPresent"
    },
    {
      code: 6013,
      msg: "Derived key invalid",
      name: "DerivedKeyInvalid"
    },
    {
      code: 6014,
      msg: "Metadata doesn't exist",
      name: "MetadataDoesntExist"
    },
    {
      code: 6015,
      msg: "Invalid token amount",
      name: "InvalidTokenAmount"
    },
    {
      code: 6016,
      msg: "Both parties need to agree to this sale",
      name: "BothPartiesNeedToAgreeToSale"
    },
    {
      code: 6017,
      msg: "Cannot match free sales unless the auction house or seller signs off",
      name: "CannotMatchFreeSalesWithoutAuctionHouseOrSellerSignoff"
    },
    {
      code: 6018,
      msg: "This sale requires a signer",
      name: "SaleRequiresSigner"
    },
    {
      code: 6019,
      msg: "Old seller not initialized",
      name: "OldSellerNotInitialized"
    },
    {
      code: 6020,
      msg: "Seller ata cannot have a delegate set",
      name: "SellerATACannotHaveDelegate"
    },
    {
      code: 6021,
      msg: "Buyer ata cannot have a delegate set",
      name: "BuyerATACannotHaveDelegate"
    },
    {
      code: 6022,
      msg: "No valid signer present",
      name: "NoValidSignerPresent"
    },
    {
      code: 6023,
      msg: "BP must be less than or equal to 10000",
      name: "InvalidBasisPoints"
    },
    {
      code: 6024,
      msg: "The trade state account does not exist",
      name: "TradeStateDoesntExist"
    },
    {
      code: 6025,
      msg: "The trade state is not empty",
      name: "TradeStateIsNotEmpty"
    },
    {
      code: 6026,
      msg: "The receipt is empty",
      name: "ReceiptIsEmpty"
    },
    {
      code: 6027,
      msg: "The instruction does not match",
      name: "InstructionMismatch"
    },
    {
      code: 6028,
      msg: "Invalid Auctioneer for this Auction House instance.",
      name: "InvalidAuctioneer"
    },
    {
      code: 6029,
      msg: "The Auctioneer does not have the correct scope for this action.",
      name: "MissingAuctioneerScope"
    },
    {
      code: 6030,
      msg: "Must use auctioneer handler.",
      name: "MustUseAuctioneerHandler"
    },
    {
      code: 6031,
      msg: "No Auctioneer program set.",
      name: "NoAuctioneerProgramSet"
    },
    {
      code: 6032,
      msg: "Too many scopes.",
      name: "TooManyScopes"
    },
    {
      code: 6033,
      msg: "Auction House not delegated.",
      name: "AuctionHouseNotDelegated"
    },
    {
      code: 6034,
      msg: "Bump seed not in hash map.",
      name: "BumpSeedNotInHashMap"
    },
    {
      code: 6035,
      msg: "The instruction would drain the escrow below rent exemption threshold",
      name: "EscrowUnderRentExemption"
    },
    {
      code: 6036,
      msg: "Invalid seeds or Auction House not delegated",
      name: "InvalidSeedsOrAuctionHouseNotDelegated"
    },
    {
      code: 6037,
      msg: "The buyer trade state was unable to be initialized.",
      name: "BuyerTradeStateNotValid"
    },
    {
      code: 6038,
      msg: "Partial order size and price must both be provided in a partial buy.",
      name: "MissingElementForPartialOrder"
    },
    {
      code: 6039,
      msg: "Amount of tokens available for purchase is less than the partial order amount.",
      name: "NotEnoughTokensAvailableForPurchase"
    },
    {
      code: 6040,
      msg: "Calculated partial price does not not partial price that was provided.",
      name: "PartialPriceMismatch"
    },
    {
      code: 6041,
      msg: "Auction House already delegated.",
      name: "AuctionHouseAlreadyDelegated"
    },
    {
      code: 6042,
      msg: "Auctioneer Authority Mismatch",
      name: "AuctioneerAuthorityMismatch"
    },
    {
      code: 6043,
      msg: "Insufficient funds in escrow account to purchase.",
      name: "InsufficientFunds"
    }
  ],
  instructions: [
    {
      accounts: [
        {
          isMut: false,
          isSigner: true,
          name: "authority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "feeWithdrawalDestination"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseFeeAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        }
      ],
      name: "withdrawFromFee"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "treasuryMint"
        },
        {
          isMut: false,
          isSigner: true,
          name: "authority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "treasuryWithdrawalDestination"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseTreasury"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        }
      ],
      name: "withdrawFromTreasury"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "treasuryMint"
        },
        {
          isMut: false,
          isSigner: true,
          name: "payer"
        },
        {
          isMut: false,
          isSigner: true,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "newAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "feeWithdrawalDestination"
        },
        {
          isMut: true,
          isSigner: false,
          name: "treasuryWithdrawalDestination"
        },
        {
          isMut: false,
          isSigner: false,
          name: "treasuryWithdrawalDestinationOwner"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ataProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "sellerFeeBasisPoints",
          type: {
            option: "u16"
          }
        },
        {
          name: "requiresSignOff",
          type: {
            option: "bool"
          }
        },
        {
          name: "canChangeSalePrice",
          type: {
            option: "bool"
          }
        }
      ],
      name: "updateAuctionHouse"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "treasuryMint"
        },
        {
          isMut: true,
          isSigner: true,
          name: "payer"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "feeWithdrawalDestination"
        },
        {
          isMut: true,
          isSigner: false,
          name: "treasuryWithdrawalDestination"
        },
        {
          isMut: false,
          isSigner: false,
          name: "treasuryWithdrawalDestinationOwner"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseFeeAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseTreasury"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ataProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "bump",
          type: "u8"
        },
        {
          name: "feePayerBump",
          type: "u8"
        },
        {
          name: "treasuryBump",
          type: "u8"
        },
        {
          name: "sellerFeeBasisPoints",
          type: "u16"
        },
        {
          name: "requiresSignOff",
          type: "bool"
        },
        {
          name: "canChangeSalePrice",
          type: "bool"
        }
      ],
      name: "createAuctionHouse"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: true,
          name: "wallet"
        },
        {
          isMut: true,
          isSigner: false,
          name: "paymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "transferAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "treasuryMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseFeeAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerTradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "tradeStateBump",
          type: "u8"
        },
        {
          name: "escrowPaymentBump",
          type: "u8"
        },
        {
          name: "buyerPrice",
          type: "u64"
        },
        {
          name: "tokenSize",
          type: "u64"
        }
      ],
      name: "buy"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: true,
          name: "wallet"
        },
        {
          isMut: true,
          isSigner: false,
          name: "paymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "transferAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "treasuryMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: true,
          name: "auctioneerAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseFeeAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerTradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ahAuctioneerPda"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "tradeStateBump",
          type: "u8"
        },
        {
          name: "escrowPaymentBump",
          type: "u8"
        },
        {
          name: "buyerPrice",
          type: "u64"
        },
        {
          name: "tokenSize",
          type: "u64"
        }
      ],
      name: "auctioneerBuy"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: true,
          name: "wallet"
        },
        {
          isMut: true,
          isSigner: false,
          name: "paymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "transferAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "treasuryMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseFeeAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerTradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "tradeStateBump",
          type: "u8"
        },
        {
          name: "escrowPaymentBump",
          type: "u8"
        },
        {
          name: "buyerPrice",
          type: "u64"
        },
        {
          name: "tokenSize",
          type: "u64"
        }
      ],
      name: "publicBuy"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: true,
          name: "wallet"
        },
        {
          isMut: true,
          isSigner: false,
          name: "paymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "transferAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "treasuryMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: true,
          name: "auctioneerAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseFeeAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerTradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ahAuctioneerPda"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "tradeStateBump",
          type: "u8"
        },
        {
          name: "escrowPaymentBump",
          type: "u8"
        },
        {
          name: "buyerPrice",
          type: "u64"
        },
        {
          name: "tokenSize",
          type: "u64"
        }
      ],
      name: "auctioneerPublicBuy"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "wallet"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseFeeAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        }
      ],
      args: [
        {
          name: "buyerPrice",
          type: "u64"
        },
        {
          name: "tokenSize",
          type: "u64"
        }
      ],
      name: "cancel"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "wallet"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: true,
          name: "auctioneerAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseFeeAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ahAuctioneerPda"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        }
      ],
      args: [
        {
          name: "buyerPrice",
          type: "u64"
        },
        {
          name: "tokenSize",
          type: "u64"
        }
      ],
      name: "auctioneerCancel"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: true,
          name: "wallet"
        },
        {
          isMut: true,
          isSigner: false,
          name: "paymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "transferAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "treasuryMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseFeeAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "escrowPaymentBump",
          type: "u8"
        },
        {
          name: "amount",
          type: "u64"
        }
      ],
      name: "deposit"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: true,
          name: "wallet"
        },
        {
          isMut: true,
          isSigner: false,
          name: "paymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "transferAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "treasuryMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: true,
          name: "auctioneerAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseFeeAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ahAuctioneerPda"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "escrowPaymentBump",
          type: "u8"
        },
        {
          name: "amount",
          type: "u64"
        }
      ],
      name: "auctioneerDeposit"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "buyer"
        },
        {
          isMut: true,
          isSigner: false,
          name: "seller"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: false,
          isSigner: false,
          name: "treasuryMint"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerPaymentReceiptAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerReceiptTokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseFeeAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseTreasury"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerTradeState"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerTradeState"
        },
        {
          isMut: true,
          isSigner: false,
          name: "freeTradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ataProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "programAsSigner"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "escrowPaymentBump",
          type: "u8"
        },
        {
          name: "freeTradeStateBump",
          type: "u8"
        },
        {
          name: "programAsSignerBump",
          type: "u8"
        },
        {
          name: "buyerPrice",
          type: "u64"
        },
        {
          name: "tokenSize",
          type: "u64"
        }
      ],
      name: "executeSale"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "buyer"
        },
        {
          isMut: true,
          isSigner: false,
          name: "seller"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: false,
          isSigner: false,
          name: "treasuryMint"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerPaymentReceiptAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerReceiptTokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseFeeAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseTreasury"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerTradeState"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerTradeState"
        },
        {
          isMut: true,
          isSigner: false,
          name: "freeTradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ataProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "programAsSigner"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "escrowPaymentBump",
          type: "u8"
        },
        {
          name: "freeTradeStateBump",
          type: "u8"
        },
        {
          name: "programAsSignerBump",
          type: "u8"
        },
        {
          name: "buyerPrice",
          type: "u64"
        },
        {
          name: "tokenSize",
          type: "u64"
        },
        {
          name: "partialOrderSize",
          type: {
            option: "u64"
          }
        },
        {
          name: "partialOrderPrice",
          type: {
            option: "u64"
          }
        }
      ],
      name: "executePartialSale"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "buyer"
        },
        {
          isMut: true,
          isSigner: false,
          name: "seller"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: false,
          isSigner: false,
          name: "treasuryMint"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerPaymentReceiptAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerReceiptTokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: true,
          name: "auctioneerAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseFeeAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseTreasury"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerTradeState"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerTradeState"
        },
        {
          isMut: true,
          isSigner: false,
          name: "freeTradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ahAuctioneerPda"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ataProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "programAsSigner"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "escrowPaymentBump",
          type: "u8"
        },
        {
          name: "freeTradeStateBump",
          type: "u8"
        },
        {
          name: "programAsSignerBump",
          type: "u8"
        },
        {
          name: "buyerPrice",
          type: "u64"
        },
        {
          name: "tokenSize",
          type: "u64"
        }
      ],
      name: "auctioneerExecuteSale"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "buyer"
        },
        {
          isMut: true,
          isSigner: false,
          name: "seller"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: false,
          isSigner: false,
          name: "treasuryMint"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerPaymentReceiptAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerReceiptTokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: true,
          name: "auctioneerAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseFeeAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseTreasury"
        },
        {
          isMut: true,
          isSigner: false,
          name: "buyerTradeState"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerTradeState"
        },
        {
          isMut: true,
          isSigner: false,
          name: "freeTradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ahAuctioneerPda"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ataProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "programAsSigner"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "escrowPaymentBump",
          type: "u8"
        },
        {
          name: "freeTradeStateBump",
          type: "u8"
        },
        {
          name: "programAsSignerBump",
          type: "u8"
        },
        {
          name: "buyerPrice",
          type: "u64"
        },
        {
          name: "tokenSize",
          type: "u64"
        },
        {
          name: "partialOrderSize",
          type: {
            option: "u64"
          }
        },
        {
          name: "partialOrderPrice",
          type: {
            option: "u64"
          }
        }
      ],
      name: "auctioneerExecutePartialSale"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "wallet"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseFeeAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerTradeState"
        },
        {
          isMut: true,
          isSigner: false,
          name: "freeSellerTradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "programAsSigner"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "tradeStateBump",
          type: "u8"
        },
        {
          name: "freeTradeStateBump",
          type: "u8"
        },
        {
          name: "programAsSignerBump",
          type: "u8"
        },
        {
          name: "buyerPrice",
          type: "u64"
        },
        {
          name: "tokenSize",
          type: "u64"
        }
      ],
      name: "sell"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "wallet"
        },
        {
          isMut: true,
          isSigner: false,
          name: "tokenAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "metadata"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: true,
          name: "auctioneerAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseFeeAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "sellerTradeState"
        },
        {
          isMut: true,
          isSigner: false,
          name: "freeSellerTradeState"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ahAuctioneerPda"
        },
        {
          isMut: false,
          isSigner: false,
          name: "programAsSigner"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "tradeStateBump",
          type: "u8"
        },
        {
          name: "freeTradeStateBump",
          type: "u8"
        },
        {
          name: "programAsSignerBump",
          type: "u8"
        },
        {
          name: "tokenSize",
          type: "u64"
        }
      ],
      name: "auctioneerSell"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "wallet"
        },
        {
          isMut: true,
          isSigner: false,
          name: "receiptAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "treasuryMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseFeeAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ataProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "escrowPaymentBump",
          type: "u8"
        },
        {
          name: "amount",
          type: "u64"
        }
      ],
      name: "withdraw"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: false,
          name: "wallet"
        },
        {
          isMut: true,
          isSigner: false,
          name: "receiptAccount"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "treasuryMint"
        },
        {
          isMut: false,
          isSigner: false,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: true,
          name: "auctioneerAuthority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouseFeeAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ahAuctioneerPda"
        },
        {
          isMut: false,
          isSigner: false,
          name: "tokenProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "ataProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        }
      ],
      args: [
        {
          name: "escrowPaymentBump",
          type: "u8"
        },
        {
          name: "amount",
          type: "u64"
        }
      ],
      name: "auctioneerWithdraw"
    },
    {
      accounts: [
        {
          isMut: false,
          isSigner: true,
          name: "wallet"
        },
        {
          isMut: true,
          isSigner: false,
          name: "escrowPaymentAccount"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "escrowPaymentBump",
          type: "u8"
        }
      ],
      name: "closeEscrowAccount"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: true,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctioneerAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "ahAuctioneerPda"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "scopes",
          type: {
            vec: {
              defined: "AuthorityScope"
            }
          }
        }
      ],
      name: "delegateAuctioneer"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "auctionHouse"
        },
        {
          isMut: true,
          isSigner: true,
          name: "authority"
        },
        {
          isMut: false,
          isSigner: false,
          name: "auctioneerAuthority"
        },
        {
          isMut: true,
          isSigner: false,
          name: "ahAuctioneerPda"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        }
      ],
      args: [
        {
          name: "scopes",
          type: {
            vec: {
              defined: "AuthorityScope"
            }
          }
        }
      ],
      name: "updateAuctioneer"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "receipt"
        },
        {
          isMut: true,
          isSigner: true,
          name: "bookkeeper"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        },
        {
          isMut: false,
          isSigner: false,
          name: "instruction"
        }
      ],
      args: [
        {
          name: "receiptBump",
          type: "u8"
        }
      ],
      name: "printListingReceipt"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "receipt"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "instruction"
        }
      ],
      args: [],
      name: "cancelListingReceipt"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "receipt"
        },
        {
          isMut: true,
          isSigner: true,
          name: "bookkeeper"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        },
        {
          isMut: false,
          isSigner: false,
          name: "instruction"
        }
      ],
      args: [
        {
          name: "receiptBump",
          type: "u8"
        }
      ],
      name: "printBidReceipt"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "receipt"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "instruction"
        }
      ],
      args: [],
      name: "cancelBidReceipt"
    },
    {
      accounts: [
        {
          isMut: true,
          isSigner: false,
          name: "purchaseReceipt"
        },
        {
          isMut: true,
          isSigner: false,
          name: "listingReceipt"
        },
        {
          isMut: true,
          isSigner: false,
          name: "bidReceipt"
        },
        {
          isMut: true,
          isSigner: true,
          name: "bookkeeper"
        },
        {
          isMut: false,
          isSigner: false,
          name: "systemProgram"
        },
        {
          isMut: false,
          isSigner: false,
          name: "rent"
        },
        {
          isMut: false,
          isSigner: false,
          name: "instruction"
        }
      ],
      args: [
        {
          name: "purchaseReceiptBump",
          type: "u8"
        }
      ],
      name: "printPurchaseReceipt"
    }
  ],
  name: "auction_house",
  types: [
    {
      name: "AuthorityScope",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Deposit"
          },
          {
            name: "Buy"
          },
          {
            name: "PublicBuy"
          },
          {
            name: "ExecuteSale"
          },
          {
            name: "Sell"
          },
          {
            name: "Cancel"
          },
          {
            name: "Withdraw"
          }
        ]
      }
    },
    {
      name: "BidType",
      type: {
        kind: "enum",
        variants: [
          {
            name: "PublicSale"
          },
          {
            name: "PrivateSale"
          },
          {
            name: "AuctioneerPublicSale"
          },
          {
            name: "AuctioneerPrivateSale"
          }
        ]
      }
    },
    {
      name: "ListingType",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Sell"
          },
          {
            name: "AuctioneerSell"
          }
        ]
      }
    },
    {
      name: "PurchaseType",
      type: {
        kind: "enum",
        variants: [
          {
            name: "ExecuteSale"
          },
          {
            name: "AuctioneerExecuteSale"
          }
        ]
      }
    },
    {
      name: "CancelType",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Cancel"
          },
          {
            name: "AuctioneerCancel"
          }
        ]
      }
    }
  ],
  version: "1.4.1"
};

// idl/spl-token.json
var spl_token_default = {
  kind: "rootNode",
  program: {
    kind: "programNode",
    pdas: [],
    accounts: [
      {
        kind: "accountNode",
        data: {
          kind: "structTypeNode",
          fields: [
            {
              kind: "structFieldTypeNode",
              name: "mintAuthority",
              type: {
                kind: "optionTypeNode",
                item: { kind: "publicKeyTypeNode" },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u32",
                  endian: "le"
                },
                fixed: true
              },
              docs: [
                "Optional authority used to mint new tokens. The mint authority may only",
                "be provided during mint creation. If no mint authority is present",
                "then the mint has a fixed supply and no further tokens may be minted."
              ]
            },
            {
              kind: "structFieldTypeNode",
              name: "supply",
              type: {
                kind: "numberTypeNode",
                format: "u64",
                endian: "le"
              },
              docs: ["Total supply of tokens."]
            },
            {
              kind: "structFieldTypeNode",
              name: "decimals",
              type: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              },
              docs: [
                "Number of base 10 digits to the right of the decimal place."
              ]
            },
            {
              kind: "structFieldTypeNode",
              name: "isInitialized",
              type: {
                kind: "booleanTypeNode",
                size: {
                  kind: "numberTypeNode",
                  format: "u8",
                  endian: "le"
                }
              },
              docs: ["Is `true` if this structure has been initialized."]
            },
            {
              kind: "structFieldTypeNode",
              name: "freezeAuthority",
              type: {
                kind: "optionTypeNode",
                item: { kind: "publicKeyTypeNode" },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u32",
                  endian: "le"
                },
                fixed: true
              },
              docs: ["Optional authority to freeze token accounts."]
            }
          ]
        },
        discriminators: [
          {
            kind: "sizeDiscriminatorNode",
            size: 82
          }
        ],
        name: "mint",
        docs: [],
        size: 82
      },
      {
        kind: "accountNode",
        data: {
          kind: "structTypeNode",
          fields: [
            {
              kind: "structFieldTypeNode",
              name: "mint",
              type: { kind: "publicKeyTypeNode" },
              docs: ["The mint associated with this account."]
            },
            {
              kind: "structFieldTypeNode",
              name: "owner",
              type: { kind: "publicKeyTypeNode" },
              docs: ["The owner of this account."]
            },
            {
              kind: "structFieldTypeNode",
              name: "amount",
              type: {
                kind: "numberTypeNode",
                format: "u64",
                endian: "le"
              },
              docs: ["The amount of tokens this account holds."]
            },
            {
              kind: "structFieldTypeNode",
              name: "delegate",
              type: {
                kind: "optionTypeNode",
                item: { kind: "publicKeyTypeNode" },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u32",
                  endian: "le"
                },
                fixed: true
              },
              docs: [
                "If `delegate` is `Some` then `delegated_amount` represents",
                "the amount authorized by the delegate."
              ]
            },
            {
              kind: "structFieldTypeNode",
              name: "state",
              type: { kind: "definedTypeLinkNode", name: "accountState" },
              docs: ["The account's state."]
            },
            {
              kind: "structFieldTypeNode",
              name: "isNative",
              type: {
                kind: "optionTypeNode",
                item: {
                  kind: "numberTypeNode",
                  format: "u64",
                  endian: "le"
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u32",
                  endian: "le"
                },
                fixed: true
              },
              docs: [
                "If is_native.is_some, this is a native token, and the value logs the",
                "rent-exempt reserve. An Account is required to be rent-exempt, so",
                "the value is used by the Processor to ensure that wrapped SOL",
                "accounts do not drop below this threshold."
              ]
            },
            {
              kind: "structFieldTypeNode",
              name: "delegatedAmount",
              type: {
                kind: "numberTypeNode",
                format: "u64",
                endian: "le"
              },
              docs: ["The amount delegated."]
            },
            {
              kind: "structFieldTypeNode",
              name: "closeAuthority",
              type: {
                kind: "optionTypeNode",
                item: { kind: "publicKeyTypeNode" },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u32",
                  endian: "le"
                },
                fixed: true
              },
              docs: ["Optional authority to close the account."]
            }
          ]
        },
        discriminators: [
          {
            kind: "sizeDiscriminatorNode",
            size: 165
          }
        ],
        name: "token",
        docs: [],
        size: 165
      },
      {
        kind: "accountNode",
        data: {
          kind: "structTypeNode",
          fields: [
            {
              kind: "structFieldTypeNode",
              name: "m",
              type: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              },
              docs: ["Number of signers required."]
            },
            {
              kind: "structFieldTypeNode",
              name: "n",
              type: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              },
              docs: ["Number of valid signers."]
            },
            {
              kind: "structFieldTypeNode",
              name: "isInitialized",
              type: {
                kind: "booleanTypeNode",
                size: {
                  kind: "numberTypeNode",
                  format: "u8",
                  endian: "le"
                }
              },
              docs: ["Is `true` if this structure has been initialized."]
            },
            {
              kind: "structFieldTypeNode",
              name: "signers",
              type: {
                kind: "arrayTypeNode",
                item: { kind: "publicKeyTypeNode" },
                count: { kind: "fixedCountNode", value: 11 }
              },
              docs: ["Signer public keys."]
            }
          ]
        },
        discriminators: [
          {
            kind: "sizeDiscriminatorNode",
            size: 355
          }
        ],
        name: "multisig",
        docs: [],
        size: 355
      }
    ],
    instructions: [
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["Token mint account."]
          },
          {
            kind: "instructionAccountNode",
            name: "rent",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["Rent sysvar."],
            defaultValue: {
              kind: "publicKeyValueNode",
              publicKey: "SysvarRent111111111111111111111111111111111"
            }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 0 },
            defaultValueStrategy: "omitted"
          },
          {
            kind: "instructionArgumentNode",
            name: "decimals",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: ["Number of decimals in token account amounts."]
          },
          {
            kind: "instructionArgumentNode",
            name: "mintAuthority",
            type: { kind: "publicKeyTypeNode" },
            docs: ["Minting authority."]
          },
          {
            kind: "instructionArgumentNode",
            name: "freezeAuthority",
            type: {
              kind: "optionTypeNode",
              item: { kind: "publicKeyTypeNode" },
              prefix: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              },
              fixed: false
            },
            defaultValue: {
              kind: "noneValueNode"
            },
            docs: ["Optional authority that can freeze token accounts."]
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        name: "initializeMint",
        docs: [
          "Initializes a new mint and optionally deposits all the newly minted",
          "tokens in an account.",
          "",
          "The `InitializeMint` instruction requires no signers and MUST be",
          "included within the same Transaction as the system program's",
          "`CreateAccount` instruction that creates the account being initialized.",
          "Otherwise another party can acquire ownership of the uninitialized account."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to initialize."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The mint this account will be associated with."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The new account's owner/multisignature."]
          },
          {
            kind: "instructionAccountNode",
            name: "rent",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["Rent sysvar."],
            defaultValue: {
              kind: "publicKeyValueNode",
              publicKey: "SysvarRent111111111111111111111111111111111"
            }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 1 },
            defaultValueStrategy: "omitted"
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        name: "initializeAccount",
        docs: [
          "Initializes a new account to hold tokens. If this account is associated",
          "with the native mint then the token balance of the initialized account",
          "will be equal to the amount of SOL in the account. If this account is",
          "associated with another mint, that mint must be initialized before this",
          "command can succeed.",
          "",
          "The `InitializeAccount` instruction requires no signers and MUST be",
          "included within the same Transaction as the system program's",
          "`CreateAccount` instruction that creates the account being initialized.",
          "Otherwise another party can acquire ownership of the uninitialized account."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "multisig",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The multisignature account to initialize."]
          },
          {
            kind: "instructionAccountNode",
            name: "rent",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["Rent sysvar."],
            defaultValue: {
              kind: "publicKeyValueNode",
              publicKey: "SysvarRent111111111111111111111111111111111"
            }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 2 },
            defaultValueStrategy: "omitted"
          },
          {
            kind: "instructionArgumentNode",
            name: "m",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [
              "The number of signers (M) required to validate this multisignature account."
            ]
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            value: {
              kind: "argumentValueNode",
              name: "signers"
            }
          }
        ],
        name: "initializeMultisig",
        docs: [
          "Initializes a multisignature account with N provided signers.",
          "",
          "Multisignature accounts can used in place of any single owner/delegate",
          "accounts in any token instruction that require an owner/delegate to be",
          "present. The variant field represents the number of signers (M)",
          "required to validate this multisignature account.",
          "",
          "The `InitializeMultisig` instruction requires no signers and MUST be",
          "included within the same Transaction as the system program's",
          "`CreateAccount` instruction that creates the account being initialized.",
          "Otherwise another party can acquire ownership of the uninitialized account."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "source",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The source account."]
          },
          {
            kind: "instructionAccountNode",
            name: "destination",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The destination account."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The source account's owner/delegate or its multisignature account."
            ],
            defaultValue: { kind: "identityValueNode" }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 3 },
            defaultValueStrategy: "omitted"
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            },
            docs: ["The amount of tokens to transfer."]
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            },
            isOptional: true,
            isSigner: true
          }
        ],
        name: "transfer",
        docs: [
          "Transfers tokens from one account to another either directly or via a delegate.",
          "If this account is associated with the native mint then equal amounts",
          "of SOL and Tokens will be transferred to the destination account."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "source",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The source account."]
          },
          {
            kind: "instructionAccountNode",
            name: "delegate",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The delegate."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The source account owner or its multisignature account."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 4 },
            defaultValueStrategy: "omitted"
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            },
            docs: ["The amount of tokens the delegate is approved for."]
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            },
            isOptional: true,
            isSigner: true
          }
        ],
        name: "approve",
        docs: [
          "Approves a delegate. A delegate is given the authority over tokens on",
          "behalf of the source account's owner."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "source",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The source account."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The source account owner or its multisignature."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 5 },
            defaultValueStrategy: "omitted"
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            },
            isOptional: true,
            isSigner: true
          }
        ],
        name: "revoke",
        docs: ["Revokes the delegate's authority."],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "owned",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint or account to change the authority of."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The current authority or the multisignature account of the mint or account to update."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 6 },
            defaultValueStrategy: "omitted"
          },
          {
            kind: "instructionArgumentNode",
            name: "authorityType",
            type: { kind: "definedTypeLinkNode", name: "authorityType" },
            docs: ["The type of authority to update."]
          },
          {
            kind: "instructionArgumentNode",
            name: "newAuthority",
            type: {
              kind: "optionTypeNode",
              item: { kind: "publicKeyTypeNode" },
              prefix: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              },
              fixed: false
            },
            docs: ["The new authority"]
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            },
            isOptional: true,
            isSigner: true
          }
        ],
        name: "setAuthority",
        docs: ["Sets a new authority of a mint or account."],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint account."]
          },
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to mint tokens to."]
          },
          {
            kind: "instructionAccountNode",
            name: "mintAuthority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The mint's minting authority or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 7 },
            defaultValueStrategy: "omitted"
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            },
            docs: ["The amount of new tokens to mint."]
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            },
            isOptional: true,
            isSigner: true
          }
        ],
        name: "mintTo",
        docs: [
          "Mints new tokens to an account. The native mint does not support minting."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to burn from."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The account's owner/delegate or its multisignature account."
            ],
            defaultValue: { kind: "identityValueNode" }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: ["The amount of tokens to burn."],
            defaultValue: { kind: "numberValueNode", number: 8 },
            defaultValueStrategy: "omitted"
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            },
            docs: []
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            },
            isOptional: true,
            isSigner: true
          }
        ],
        name: "burn",
        docs: [
          "Burns tokens by removing them from an account. `Burn` does not support",
          "accounts associated with the native mint, use `CloseAccount` instead."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to close."]
          },
          {
            kind: "instructionAccountNode",
            name: "destination",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The destination account."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The account's owner or its multisignature account."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 9 },
            defaultValueStrategy: "omitted"
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            },
            isOptional: true,
            isSigner: true
          }
        ],
        name: "closeAccount",
        docs: [
          "Close an account by transferring all its SOL to the destination account.",
          "Non-native accounts may only be closed if its token amount is zero."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to freeze."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The mint freeze authority or its multisignature account."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 10 },
            defaultValueStrategy: "omitted"
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            },
            isOptional: true,
            isSigner: true
          }
        ],
        name: "freezeAccount",
        docs: [
          "Freeze an Initialized account using the Mint's freeze_authority (if set)."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to thaw."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The mint freeze authority or its multisignature account."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 11 },
            defaultValueStrategy: "omitted"
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            },
            isOptional: true,
            isSigner: true
          }
        ],
        name: "thawAccount",
        docs: [
          "Thaw a Frozen account using the Mint's freeze_authority (if set)."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "source",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The source account."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "destination",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The destination account."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The source account's owner/delegate or its multisignature account."
            ],
            defaultValue: { kind: "identityValueNode" }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 12 },
            defaultValueStrategy: "omitted"
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            },
            docs: ["The amount of tokens to transfer."]
          },
          {
            kind: "instructionArgumentNode",
            name: "decimals",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [
              "Expected number of base 10 digits to the right of the decimal place."
            ]
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            },
            isOptional: true,
            isSigner: true
          }
        ],
        name: "transferChecked",
        docs: [
          "Transfers tokens from one account to another either directly or via a",
          "delegate. If this account is associated with the native mint then equal",
          "amounts of SOL and Tokens will be transferred to the destination account.",
          "",
          "This instruction differs from Transfer in that the token mint and",
          "decimals value is checked by the caller. This may be useful when",
          "creating transactions offline or within a hardware wallet."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "source",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The source account."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "delegate",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The delegate."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The source account owner or its multisignature account."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 13 },
            defaultValueStrategy: "omitted"
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            },
            docs: ["The amount of tokens the delegate is approved for."]
          },
          {
            kind: "instructionArgumentNode",
            name: "decimals",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [
              "Expected number of base 10 digits to the right of the decimal place."
            ]
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            },
            isOptional: true,
            isSigner: true
          }
        ],
        name: "approveChecked",
        docs: [
          "Approves a delegate. A delegate is given the authority over tokens on",
          "behalf of the source account's owner.",
          "",
          "This instruction differs from Approve in that the token mint and",
          "decimals value is checked by the caller. This may be useful when",
          "creating transactions offline or within a hardware wallet."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to mint tokens to."]
          },
          {
            kind: "instructionAccountNode",
            name: "mintAuthority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The mint's minting authority or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 14 },
            defaultValueStrategy: "omitted"
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            },
            docs: ["The amount of new tokens to mint."]
          },
          {
            kind: "instructionArgumentNode",
            name: "decimals",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [
              "Expected number of base 10 digits to the right of the decimal place."
            ]
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            },
            isOptional: true,
            isSigner: true
          }
        ],
        name: "mintToChecked",
        docs: [
          "Mints new tokens to an account. The native mint does not support minting.",
          "",
          "This instruction differs from MintTo in that the decimals value is",
          "checked by the caller. This may be useful when creating transactions",
          "offline or within a hardware wallet."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to burn from."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The account's owner/delegate or its multisignature account."
            ],
            defaultValue: { kind: "identityValueNode" }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 15 },
            defaultValueStrategy: "omitted"
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            },
            docs: ["The amount of tokens to burn."]
          },
          {
            kind: "instructionArgumentNode",
            name: "decimals",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [
              "Expected number of base 10 digits to the right of the decimal place."
            ]
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            },
            isOptional: true,
            isSigner: true
          }
        ],
        name: "burnChecked",
        docs: [
          "Burns tokens by removing them from an account. `BurnChecked` does not",
          "support accounts associated with the native mint, use `CloseAccount` instead.",
          "",
          "This instruction differs from Burn in that the decimals value is checked",
          "by the caller. This may be useful when creating transactions offline or",
          "within a hardware wallet."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to initialize."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The mint this account will be associated with."]
          },
          {
            kind: "instructionAccountNode",
            name: "rent",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["Rent sysvar."],
            defaultValue: {
              kind: "publicKeyValueNode",
              publicKey: "SysvarRent111111111111111111111111111111111"
            }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 16 },
            defaultValueStrategy: "omitted"
          },
          {
            kind: "instructionArgumentNode",
            name: "owner",
            type: { kind: "publicKeyTypeNode" },
            docs: ["The new account's owner/multisignature."]
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        name: "initializeAccount2",
        docs: [
          "Like InitializeAccount, but the owner pubkey is passed via instruction",
          "data rather than the accounts list. This variant may be preferable",
          "when using Cross Program Invocation from an instruction that does",
          "not need the owner's `AccountInfo` otherwise."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: [
              "The native token account to sync with its underlying lamports."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 17 },
            defaultValueStrategy: "omitted"
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        name: "syncNative",
        docs: [
          "Given a wrapped / native token account (a token account containing SOL)",
          "updates its amount field based on the account's underlying `lamports`.",
          "This is useful if a non-wrapped SOL account uses",
          "`system_instruction::transfer` to move lamports to a wrapped token",
          "account, and needs to have its token `amount` field updated."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to initialize."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The mint this account will be associated with."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 18 },
            defaultValueStrategy: "omitted"
          },
          {
            kind: "instructionArgumentNode",
            name: "owner",
            type: { kind: "publicKeyTypeNode" },
            docs: ["The new account's owner/multisignature."]
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        name: "initializeAccount3",
        docs: [
          "Like InitializeAccount2, but does not require the Rent sysvar to be provided."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "multisig",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The multisignature account to initialize."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 19 },
            defaultValueStrategy: "omitted"
          },
          {
            kind: "instructionArgumentNode",
            name: "m",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [
              "The number of signers (M) required to validate this multisignature account."
            ]
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            value: {
              kind: "argumentValueNode",
              name: "signers"
            }
          }
        ],
        name: "initializeMultisig2",
        docs: [
          "Like InitializeMultisig, but does not require the Rent sysvar to be provided."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to initialize."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 20 },
            defaultValueStrategy: "omitted"
          },
          {
            kind: "instructionArgumentNode",
            name: "decimals",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [
              "Number of base 10 digits to the right of the decimal place."
            ]
          },
          {
            kind: "instructionArgumentNode",
            name: "mintAuthority",
            type: { kind: "publicKeyTypeNode" },
            docs: ["The authority/multisignature to mint tokens."]
          },
          {
            kind: "instructionArgumentNode",
            name: "freezeAuthority",
            type: {
              kind: "optionTypeNode",
              item: { kind: "publicKeyTypeNode" },
              prefix: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              },
              fixed: false
            },
            defaultValue: {
              kind: "noneValueNode"
            },
            docs: [
              "The optional freeze authority/multisignature of the mint."
            ]
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        name: "initializeMint2",
        docs: [
          "Like [`InitializeMint`], but does not require the Rent sysvar to be provided."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to calculate for."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 21 },
            defaultValueStrategy: "omitted"
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        name: "getAccountDataSize",
        docs: [
          "Gets the required size of an account for the given mint as a",
          "little-endian `u64`.",
          "",
          "Return data can be fetched using `sol_get_return_data` and deserializing",
          "the return data as a little-endian `u64`."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to initialize."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 22 },
            defaultValueStrategy: "omitted"
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        name: "initializeImmutableOwner",
        docs: [
          "Initialize the Immutable Owner extension for the given token account",
          "",
          "Fails if the account has already been initialized, so must be called",
          "before `InitializeAccount`.",
          "",
          "No-ops in this version of the program, but is included for compatibility",
          "with the Associated Token Account program."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to calculate for."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 23 },
            defaultValueStrategy: "omitted"
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            },
            docs: ["The amount of tokens to reformat."]
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        name: "amountToUiAmount",
        docs: [
          "Convert an Amount of tokens to a UiAmount `string`, using the given",
          "mint. In this version of the program, the mint can only specify the",
          "number of decimals.",
          "",
          "Fails on an invalid mint.",
          "",
          "Return data can be fetched using `sol_get_return_data` and deserialized",
          "with `String::from_utf8`."
        ],
        optionalAccountStrategy: "programId"
      },
      {
        kind: "instructionNode",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to calculate for."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            docs: [],
            defaultValue: { kind: "numberValueNode", number: 24 },
            defaultValueStrategy: "omitted"
          },
          {
            kind: "instructionArgumentNode",
            name: "uiAmount",
            type: {
              kind: "stringTypeNode",
              encoding: "utf8"
            },
            docs: ["The ui_amount of tokens to reformat."]
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ],
        name: "uiAmountToAmount",
        docs: [
          "Convert a UiAmount of tokens to a little-endian `u64` raw Amount, using",
          "the given mint. In this version of the program, the mint can only",
          "specify the number of decimals.",
          "",
          "Return data can be fetched using `sol_get_return_data` and deserializing",
          "the return data as a little-endian `u64`."
        ],
        optionalAccountStrategy: "programId"
      }
    ],
    definedTypes: [
      {
        kind: "definedTypeNode",
        name: "accountState",
        type: {
          kind: "enumTypeNode",
          variants: [
            { kind: "enumEmptyVariantTypeNode", name: "uninitialized" },
            { kind: "enumEmptyVariantTypeNode", name: "initialized" },
            { kind: "enumEmptyVariantTypeNode", name: "frozen" }
          ],
          size: { kind: "numberTypeNode", format: "u8", endian: "le" }
        },
        docs: []
      },
      {
        kind: "definedTypeNode",
        name: "authorityType",
        type: {
          kind: "enumTypeNode",
          variants: [
            { kind: "enumEmptyVariantTypeNode", name: "mintTokens" },
            { kind: "enumEmptyVariantTypeNode", name: "freezeAccount" },
            { kind: "enumEmptyVariantTypeNode", name: "accountOwner" },
            { kind: "enumEmptyVariantTypeNode", name: "closeAccount" }
          ],
          size: { kind: "numberTypeNode", format: "u8", endian: "le" }
        },
        docs: []
      }
    ],
    errors: [
      {
        kind: "errorNode",
        name: "notRentExempt",
        code: 0,
        message: "Lamport balance below rent-exempt threshold",
        docs: ["NotRentExempt: Lamport balance below rent-exempt threshold"]
      },
      {
        kind: "errorNode",
        name: "insufficientFunds",
        code: 1,
        message: "Insufficient funds",
        docs: ["InsufficientFunds: Insufficient funds"]
      },
      {
        kind: "errorNode",
        name: "invalidMint",
        code: 2,
        message: "Invalid Mint",
        docs: ["InvalidMint: Invalid Mint"]
      },
      {
        kind: "errorNode",
        name: "mintMismatch",
        code: 3,
        message: "Account not associated with this Mint",
        docs: ["MintMismatch: Account not associated with this Mint"]
      },
      {
        kind: "errorNode",
        name: "ownerMismatch",
        code: 4,
        message: "Owner does not match",
        docs: ["OwnerMismatch: Owner does not match"]
      },
      {
        kind: "errorNode",
        name: "fixedSupply",
        code: 5,
        message: "Fixed supply",
        docs: ["FixedSupply: Fixed supply"]
      },
      {
        kind: "errorNode",
        name: "alreadyInUse",
        code: 6,
        message: "Already in use",
        docs: ["AlreadyInUse: Already in use"]
      },
      {
        kind: "errorNode",
        name: "invalidNumberOfProvidedSigners",
        code: 7,
        message: "Invalid number of provided signers",
        docs: [
          "InvalidNumberOfProvidedSigners: Invalid number of provided signers"
        ]
      },
      {
        kind: "errorNode",
        name: "invalidNumberOfRequiredSigners",
        code: 8,
        message: "Invalid number of required signers",
        docs: [
          "InvalidNumberOfRequiredSigners: Invalid number of required signers"
        ]
      },
      {
        kind: "errorNode",
        name: "uninitializedState",
        code: 9,
        message: "State is unititialized",
        docs: ["UninitializedState: State is unititialized"]
      },
      {
        kind: "errorNode",
        name: "nativeNotSupported",
        code: 10,
        message: "Instruction does not support native tokens",
        docs: [
          "NativeNotSupported: Instruction does not support native tokens"
        ]
      },
      {
        kind: "errorNode",
        name: "nonNativeHasBalance",
        code: 11,
        message: "Non-native account can only be closed if its balance is zero",
        docs: [
          "NonNativeHasBalance: Non-native account can only be closed if its balance is zero"
        ]
      },
      {
        kind: "errorNode",
        name: "invalidInstruction",
        code: 12,
        message: "Invalid instruction",
        docs: ["InvalidInstruction: Invalid instruction"]
      },
      {
        kind: "errorNode",
        name: "invalidState",
        code: 13,
        message: "State is invalid for requested operation",
        docs: ["InvalidState: State is invalid for requested operation"]
      },
      {
        kind: "errorNode",
        name: "overflow",
        code: 14,
        message: "Operation overflowed",
        docs: ["Overflow: Operation overflowed"]
      },
      {
        kind: "errorNode",
        name: "authorityTypeNotSupported",
        code: 15,
        message: "Account does not support specified authority type",
        docs: [
          "AuthorityTypeNotSupported: Account does not support specified authority type"
        ]
      },
      {
        kind: "errorNode",
        name: "mintCannotFreeze",
        code: 16,
        message: "This token mint cannot freeze accounts",
        docs: ["MintCannotFreeze: This token mint cannot freeze accounts"]
      },
      {
        kind: "errorNode",
        name: "accountFrozen",
        code: 17,
        message: "Account is frozen",
        docs: ["AccountFrozen: Account is frozen"]
      },
      {
        kind: "errorNode",
        name: "mintDecimalsMismatch",
        code: 18,
        message: "The provided decimals value different from the Mint decimals",
        docs: [
          "MintDecimalsMismatch: The provided decimals value different from the Mint decimals"
        ]
      },
      {
        kind: "errorNode",
        name: "nonNativeNotSupported",
        code: 19,
        message: "Instruction does not support non-native tokens",
        docs: [
          "NonNativeNotSupported: Instruction does not support non-native tokens"
        ]
      }
    ],
    name: "token",
    prefix: "",
    publicKey: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    version: "3.3.0",
    origin: "shank"
  },
  additionalPrograms: [
    {
      kind: "programNode",
      pdas: [
        {
          kind: "pdaNode",
          name: "associatedToken",
          seeds: [
            {
              kind: "variablePdaSeedNode",
              name: "owner",
              docs: ["The wallet address of the associated token account."],
              type: {
                kind: "publicKeyTypeNode"
              }
            },
            {
              kind: "variablePdaSeedNode",
              name: "tokenProgram",
              docs: ["The address of the token program to use."],
              type: {
                kind: "publicKeyTypeNode"
              }
            },
            {
              kind: "variablePdaSeedNode",
              name: "mint",
              docs: ["The mint address of the associated token account."],
              type: {
                kind: "publicKeyTypeNode"
              }
            }
          ]
        }
      ],
      accounts: [],
      instructions: [
        {
          kind: "instructionNode",
          accounts: [
            {
              kind: "instructionAccountNode",
              name: "payer",
              isWritable: true,
              isSigner: true,
              isOptional: false,
              docs: ["Funding account (must be a system account)."],
              defaultValue: { kind: "payerValueNode" }
            },
            {
              kind: "instructionAccountNode",
              name: "ata",
              isWritable: true,
              isSigner: false,
              isOptional: false,
              docs: ["Associated token account address to be created."],
              defaultValue: {
                kind: "pdaValueNode",
                pda: {
                  kind: "pdaLinkNode",
                  name: "associatedToken"
                },
                seeds: [
                  {
                    kind: "pdaSeedValueNode",
                    name: "owner",
                    value: {
                      kind: "accountValueNode",
                      name: "owner"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "tokenProgram",
                    value: {
                      kind: "accountValueNode",
                      name: "tokenProgram"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "mint",
                    value: {
                      kind: "accountValueNode",
                      name: "mint"
                    }
                  }
                ]
              }
            },
            {
              kind: "instructionAccountNode",
              name: "owner",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["Wallet address for the new associated token account."]
            },
            {
              kind: "instructionAccountNode",
              name: "mint",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["The token mint for the new associated token account."]
            },
            {
              kind: "instructionAccountNode",
              name: "systemProgram",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["System program."],
              defaultValue: {
                kind: "publicKeyValueNode",
                publicKey: "11111111111111111111111111111111"
              }
            },
            {
              kind: "instructionAccountNode",
              name: "tokenProgram",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["SPL Token program."],
              defaultValue: {
                kind: "publicKeyValueNode",
                publicKey: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
              }
            }
          ],
          arguments: [
            {
              kind: "instructionArgumentNode",
              name: "discriminator",
              type: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              },
              docs: [],
              defaultValue: { kind: "numberValueNode", number: 0 },
              defaultValueStrategy: "omitted"
            }
          ],
          discriminators: [
            {
              kind: "fieldDiscriminatorNode",
              name: "discriminator",
              offset: 0
            }
          ],
          name: "createAssociatedToken",
          docs: [
            "Creates an associated token account for the given wallet address and",
            "token mint Returns an error if the account exists."
          ],
          optionalAccountStrategy: "programId"
        },
        {
          kind: "instructionNode",
          accounts: [
            {
              kind: "instructionAccountNode",
              name: "payer",
              isWritable: true,
              isSigner: true,
              isOptional: false,
              docs: ["Funding account (must be a system account)."],
              defaultValue: { kind: "payerValueNode" }
            },
            {
              kind: "instructionAccountNode",
              name: "ata",
              isWritable: true,
              isSigner: false,
              isOptional: false,
              docs: ["Associated token account address to be created."],
              defaultValue: {
                kind: "pdaValueNode",
                pda: {
                  kind: "pdaLinkNode",
                  name: "associatedToken"
                },
                seeds: [
                  {
                    kind: "pdaSeedValueNode",
                    name: "owner",
                    value: {
                      kind: "accountValueNode",
                      name: "owner"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "tokenProgram",
                    value: {
                      kind: "accountValueNode",
                      name: "tokenProgram"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "mint",
                    value: {
                      kind: "accountValueNode",
                      name: "mint"
                    }
                  }
                ]
              }
            },
            {
              kind: "instructionAccountNode",
              name: "owner",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["Wallet address for the new associated token account."]
            },
            {
              kind: "instructionAccountNode",
              name: "mint",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["The token mint for the new associated token account."]
            },
            {
              kind: "instructionAccountNode",
              name: "systemProgram",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["System program."],
              defaultValue: {
                kind: "publicKeyValueNode",
                publicKey: "11111111111111111111111111111111"
              }
            },
            {
              kind: "instructionAccountNode",
              name: "tokenProgram",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["SPL Token program."],
              defaultValue: {
                kind: "publicKeyValueNode",
                publicKey: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
              }
            }
          ],
          arguments: [
            {
              kind: "instructionArgumentNode",
              name: "discriminator",
              type: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              },
              docs: [],
              defaultValue: { kind: "numberValueNode", number: 1 },
              defaultValueStrategy: "omitted"
            }
          ],
          discriminators: [
            {
              kind: "fieldDiscriminatorNode",
              name: "discriminator",
              offset: 0
            }
          ],
          name: "createAssociatedTokenIdempotent",
          docs: [
            "Creates an associated token account for the given wallet address and",
            "token mint, if it doesn't already exist. Returns an error if the",
            "account exists, but with a different owner."
          ],
          optionalAccountStrategy: "programId"
        },
        {
          kind: "instructionNode",
          accounts: [
            {
              kind: "instructionAccountNode",
              name: "nestedAssociatedAccountAddress",
              isWritable: true,
              isSigner: false,
              isOptional: false,
              docs: [
                "Nested associated token account, must be owned by `ownerAssociatedAccountAddress`."
              ],
              defaultValue: {
                kind: "pdaValueNode",
                pda: {
                  kind: "pdaLinkNode",
                  name: "associatedToken"
                },
                seeds: [
                  {
                    kind: "pdaSeedValueNode",
                    name: "owner",
                    value: {
                      kind: "accountValueNode",
                      name: "ownerAssociatedAccountAddress"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "tokenProgram",
                    value: {
                      kind: "accountValueNode",
                      name: "tokenProgram"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "mint",
                    value: {
                      kind: "accountValueNode",
                      name: "nestedTokenMintAddress"
                    }
                  }
                ]
              }
            },
            {
              kind: "instructionAccountNode",
              name: "nestedTokenMintAddress",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["Token mint for the nested associated token account."]
            },
            {
              kind: "instructionAccountNode",
              name: "destinationAssociatedAccountAddress",
              isWritable: true,
              isSigner: false,
              isOptional: false,
              docs: ["Wallet's associated token account."],
              defaultValue: {
                kind: "pdaValueNode",
                pda: {
                  kind: "pdaLinkNode",
                  name: "associatedToken"
                },
                seeds: [
                  {
                    kind: "pdaSeedValueNode",
                    name: "owner",
                    value: {
                      kind: "accountValueNode",
                      name: "walletAddress"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "tokenProgram",
                    value: {
                      kind: "accountValueNode",
                      name: "tokenProgram"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "mint",
                    value: {
                      kind: "accountValueNode",
                      name: "nestedTokenMintAddress"
                    }
                  }
                ]
              }
            },
            {
              kind: "instructionAccountNode",
              name: "ownerAssociatedAccountAddress",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: [
                "Owner associated token account address, must be owned by `walletAddress`."
              ],
              defaultValue: {
                kind: "pdaValueNode",
                pda: {
                  kind: "pdaLinkNode",
                  name: "associatedToken"
                },
                seeds: [
                  {
                    kind: "pdaSeedValueNode",
                    name: "owner",
                    value: {
                      kind: "accountValueNode",
                      name: "walletAddress"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "tokenProgram",
                    value: {
                      kind: "accountValueNode",
                      name: "tokenProgram"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "mint",
                    value: {
                      kind: "accountValueNode",
                      name: "ownerTokenMintAddress"
                    }
                  }
                ]
              }
            },
            {
              kind: "instructionAccountNode",
              name: "ownerTokenMintAddress",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["Token mint for the owner associated token account."]
            },
            {
              kind: "instructionAccountNode",
              name: "walletAddress",
              isWritable: true,
              isSigner: true,
              isOptional: false,
              docs: ["Wallet address for the owner associated token account."]
            },
            {
              kind: "instructionAccountNode",
              name: "tokenProgram",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["SPL Token program."],
              defaultValue: {
                kind: "publicKeyValueNode",
                publicKey: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
              }
            }
          ],
          arguments: [
            {
              kind: "instructionArgumentNode",
              name: "discriminator",
              type: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              },
              docs: [],
              defaultValue: { kind: "numberValueNode", number: 2 },
              defaultValueStrategy: "omitted"
            }
          ],
          discriminators: [
            {
              kind: "fieldDiscriminatorNode",
              name: "discriminator",
              offset: 0
            }
          ],
          name: "recoverNestedAssociatedToken",
          docs: [
            "Transfers from and closes a nested associated token account: an",
            "associated token account owned by an associated token account.",
            "",
            "The tokens are moved from the nested associated token account to the",
            "wallet's associated token account, and the nested account lamports are",
            "moved to the wallet.",
            "",
            "Note: Nested token accounts are an anti-pattern, and almost always",
            "created unintentionally, so this instruction should only be used to",
            "recover from errors."
          ],
          optionalAccountStrategy: "programId"
        }
      ],
      definedTypes: [],
      errors: [
        {
          kind: "errorNode",
          name: "invalidOwner",
          code: 0,
          message: "Associated token account owner does not match address derivation",
          docs: [
            "InvalidOwner: Associated token account owner does not match address derivation"
          ]
        }
      ],
      name: "associatedToken",
      prefix: "",
      publicKey: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
      version: "1.1.1",
      origin: "shank"
    }
  ],
  standard: "codama",
  version: "1.0.0"
};

// idl/token-2022.json
var token_2022_default = {
  kind: "rootNode",
  standard: "codama",
  version: "1.0.0",
  program: {
    kind: "programNode",
    name: "token-2022",
    publicKey: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    version: "3.0.2",
    origin: "shank",
    docs: [],
    accounts: [
      {
        kind: "accountNode",
        name: "mint",
        docs: [],
        data: {
          kind: "structTypeNode",
          fields: [
            {
              kind: "structFieldTypeNode",
              name: "mintAuthority",
              docs: [
                "Optional authority used to mint new tokens. The mint authority may only",
                "be provided during mint creation. If no mint authority is present",
                "then the mint has a fixed supply and no further tokens may be minted."
              ],
              type: {
                kind: "optionTypeNode",
                fixed: true,
                item: {
                  kind: "publicKeyTypeNode"
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u32",
                  endian: "le"
                }
              }
            },
            {
              kind: "structFieldTypeNode",
              name: "supply",
              docs: ["Total supply of tokens."],
              type: {
                kind: "numberTypeNode",
                format: "u64",
                endian: "le"
              }
            },
            {
              kind: "structFieldTypeNode",
              name: "decimals",
              docs: [
                "Number of base 10 digits to the right of the decimal place."
              ],
              type: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              }
            },
            {
              kind: "structFieldTypeNode",
              name: "isInitialized",
              docs: ["Is `true` if this structure has been initialized."],
              type: {
                kind: "booleanTypeNode",
                size: {
                  kind: "numberTypeNode",
                  format: "u8",
                  endian: "le"
                }
              }
            },
            {
              kind: "structFieldTypeNode",
              name: "freezeAuthority",
              docs: ["Optional authority to freeze token accounts."],
              type: {
                kind: "optionTypeNode",
                fixed: true,
                item: {
                  kind: "publicKeyTypeNode"
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u32",
                  endian: "le"
                }
              }
            },
            {
              kind: "structFieldTypeNode",
              name: "extensions",
              docs: ["The extensions activated on the mint account."],
              type: {
                kind: "remainderOptionTypeNode",
                item: {
                  kind: "hiddenPrefixTypeNode",
                  type: {
                    kind: "arrayTypeNode",
                    item: {
                      kind: "definedTypeLinkNode",
                      name: "extension"
                    },
                    count: {
                      kind: "remainderCountNode"
                    }
                  },
                  prefix: [
                    {
                      kind: "constantValueNode",
                      type: {
                        kind: "preOffsetTypeNode",
                        offset: 83,
                        strategy: "padded",
                        type: {
                          kind: "numberTypeNode",
                          format: "u8",
                          endian: "le"
                        }
                      },
                      value: {
                        kind: "numberValueNode",
                        number: 1
                      }
                    }
                  ]
                }
              }
            }
          ]
        },
        discriminators: [
          {
            kind: "sizeDiscriminatorNode",
            size: 82
          }
        ]
      },
      {
        kind: "accountNode",
        name: "token",
        docs: [],
        data: {
          kind: "structTypeNode",
          fields: [
            {
              kind: "structFieldTypeNode",
              name: "mint",
              docs: ["The mint associated with this account."],
              type: {
                kind: "publicKeyTypeNode"
              }
            },
            {
              kind: "structFieldTypeNode",
              name: "owner",
              docs: ["The owner of this account."],
              type: {
                kind: "publicKeyTypeNode"
              }
            },
            {
              kind: "structFieldTypeNode",
              name: "amount",
              docs: ["The amount of tokens this account holds."],
              type: {
                kind: "numberTypeNode",
                format: "u64",
                endian: "le"
              }
            },
            {
              kind: "structFieldTypeNode",
              name: "delegate",
              docs: [
                "If `delegate` is `Some` then `delegated_amount` represents",
                "the amount authorized by the delegate."
              ],
              type: {
                kind: "optionTypeNode",
                fixed: true,
                item: {
                  kind: "publicKeyTypeNode"
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u32",
                  endian: "le"
                }
              }
            },
            {
              kind: "structFieldTypeNode",
              name: "state",
              docs: ["The account's state."],
              type: {
                kind: "definedTypeLinkNode",
                name: "accountState"
              }
            },
            {
              kind: "structFieldTypeNode",
              name: "isNative",
              docs: [
                "If is_native.is_some, this is a native token, and the value logs the",
                "rent-exempt reserve. An Account is required to be rent-exempt, so",
                "the value is used by the Processor to ensure that wrapped SOL",
                "accounts do not drop below this threshold."
              ],
              type: {
                kind: "optionTypeNode",
                fixed: true,
                item: {
                  kind: "numberTypeNode",
                  format: "u64",
                  endian: "le"
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u32",
                  endian: "le"
                }
              }
            },
            {
              kind: "structFieldTypeNode",
              name: "delegatedAmount",
              docs: ["The amount delegated."],
              type: {
                kind: "numberTypeNode",
                format: "u64",
                endian: "le"
              }
            },
            {
              kind: "structFieldTypeNode",
              name: "closeAuthority",
              docs: ["Optional authority to close the account."],
              type: {
                kind: "optionTypeNode",
                fixed: true,
                item: {
                  kind: "publicKeyTypeNode"
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u32",
                  endian: "le"
                }
              }
            },
            {
              kind: "structFieldTypeNode",
              name: "extensions",
              docs: ["The extensions activated on the token account."],
              type: {
                kind: "remainderOptionTypeNode",
                item: {
                  kind: "hiddenPrefixTypeNode",
                  type: {
                    kind: "arrayTypeNode",
                    item: {
                      kind: "definedTypeLinkNode",
                      name: "extension"
                    },
                    count: {
                      kind: "remainderCountNode"
                    }
                  },
                  prefix: [
                    {
                      kind: "constantValueNode",
                      type: {
                        kind: "numberTypeNode",
                        format: "u8",
                        endian: "le"
                      },
                      value: {
                        kind: "numberValueNode",
                        number: 2
                      }
                    }
                  ]
                }
              }
            }
          ]
        },
        discriminators: [
          {
            kind: "sizeDiscriminatorNode",
            size: 165
          }
        ]
      },
      {
        kind: "accountNode",
        name: "multisig",
        size: 355,
        docs: [],
        data: {
          kind: "structTypeNode",
          fields: [
            {
              kind: "structFieldTypeNode",
              name: "m",
              docs: ["Number of signers required."],
              type: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              }
            },
            {
              kind: "structFieldTypeNode",
              name: "n",
              docs: ["Number of valid signers."],
              type: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              }
            },
            {
              kind: "structFieldTypeNode",
              name: "isInitialized",
              docs: ["Is `true` if this structure has been initialized."],
              type: {
                kind: "booleanTypeNode",
                size: {
                  kind: "numberTypeNode",
                  format: "u8",
                  endian: "le"
                }
              }
            },
            {
              kind: "structFieldTypeNode",
              name: "signers",
              docs: ["Signer public keys."],
              type: {
                kind: "arrayTypeNode",
                item: {
                  kind: "publicKeyTypeNode"
                },
                count: {
                  kind: "fixedCountNode",
                  value: 11
                }
              }
            }
          ]
        },
        discriminators: [
          {
            kind: "sizeDiscriminatorNode",
            size: 355
          }
        ]
      }
    ],
    instructions: [
      {
        kind: "instructionNode",
        name: "initializeMint",
        docs: [
          "Initializes a new mint and optionally deposits all the newly minted",
          "tokens in an account.",
          "",
          "The `InitializeMint` instruction requires no signers and MUST be",
          "included within the same Transaction as the system program's",
          "`CreateAccount` instruction that creates the account being initialized.",
          "Otherwise another party can acquire ownership of the uninitialized account."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["Token mint account."]
          },
          {
            kind: "instructionAccountNode",
            name: "rent",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["Rent sysvar."],
            defaultValue: {
              kind: "publicKeyValueNode",
              publicKey: "SysvarRent111111111111111111111111111111111"
            }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 0
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "decimals",
            docs: ["Number of decimals in token account amounts."],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "mintAuthority",
            docs: ["Minting authority."],
            type: {
              kind: "publicKeyTypeNode"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "freezeAuthority",
            docs: ["Optional authority that can freeze token accounts."],
            type: {
              kind: "optionTypeNode",
              fixed: false,
              item: {
                kind: "publicKeyTypeNode"
              },
              prefix: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              }
            },
            defaultValue: {
              kind: "noneValueNode"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeAccount",
        docs: [
          "Initializes a new account to hold tokens. If this account is associated",
          "with the native mint then the token balance of the initialized account",
          "will be equal to the amount of SOL in the account. If this account is",
          "associated with another mint, that mint must be initialized before this",
          "command can succeed.",
          "",
          "The `InitializeAccount` instruction requires no signers and MUST be",
          "included within the same Transaction as the system program's",
          "`CreateAccount` instruction that creates the account being initialized.",
          "Otherwise another party can acquire ownership of the uninitialized account."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to initialize."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The mint this account will be associated with."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The new account's owner/multisignature."]
          },
          {
            kind: "instructionAccountNode",
            name: "rent",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["Rent sysvar."],
            defaultValue: {
              kind: "publicKeyValueNode",
              publicKey: "SysvarRent111111111111111111111111111111111"
            }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 1
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeMultisig",
        docs: [
          "Initializes a multisignature account with N provided signers.",
          "",
          "Multisignature accounts can used in place of any single owner/delegate",
          "accounts in any token instruction that require an owner/delegate to be",
          "present. The variant field represents the number of signers (M)",
          "required to validate this multisignature account.",
          "",
          "The `InitializeMultisig` instruction requires no signers and MUST be",
          "included within the same Transaction as the system program's",
          "`CreateAccount` instruction that creates the account being initialized.",
          "Otherwise another party can acquire ownership of the uninitialized account."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "multisig",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The multisignature account to initialize."]
          },
          {
            kind: "instructionAccountNode",
            name: "rent",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["Rent sysvar."],
            defaultValue: {
              kind: "publicKeyValueNode",
              publicKey: "SysvarRent111111111111111111111111111111111"
            }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 2
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "m",
            docs: [
              "The number of signers (M) required to validate this multisignature account."
            ],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "signers"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "transfer",
        docs: [
          "Transfers tokens from one account to another either directly or via a delegate.",
          "If this account is associated with the native mint then equal amounts",
          "of SOL and Tokens will be transferred to the destination account."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "source",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The source account."]
          },
          {
            kind: "instructionAccountNode",
            name: "destination",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The destination account."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The source account's owner/delegate or its multisignature account."
            ],
            defaultValue: {
              kind: "identityValueNode"
            }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 3
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            docs: ["The amount of tokens to transfer."],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "approve",
        docs: [
          "Approves a delegate. A delegate is given the authority over tokens on",
          "behalf of the source account's owner."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "source",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The source account."]
          },
          {
            kind: "instructionAccountNode",
            name: "delegate",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The delegate."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The source account owner or its multisignature account."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 4
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            docs: ["The amount of tokens the delegate is approved for."],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "revoke",
        docs: ["Revokes the delegate's authority."],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "source",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The source account."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The source account owner or its multisignature."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 5
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "setAuthority",
        docs: ["Sets a new authority of a mint or account."],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "owned",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint or account to change the authority of."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The current authority or the multisignature account of the mint or account to update."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 6
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "authorityType",
            docs: ["The type of authority to update."],
            type: {
              kind: "definedTypeLinkNode",
              name: "authorityType"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "newAuthority",
            docs: ["The new authority"],
            type: {
              kind: "optionTypeNode",
              fixed: false,
              item: {
                kind: "publicKeyTypeNode"
              },
              prefix: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              }
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "mintTo",
        docs: [
          "Mints new tokens to an account. The native mint does not support minting."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint account."]
          },
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to mint tokens to."]
          },
          {
            kind: "instructionAccountNode",
            name: "mintAuthority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The mint's minting authority or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 7
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            docs: ["The amount of new tokens to mint."],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "burn",
        docs: [
          "Burns tokens by removing them from an account. `Burn` does not support",
          "accounts associated with the native mint, use `CloseAccount` instead."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to burn from."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The account's owner/delegate or its multisignature account."
            ],
            defaultValue: {
              kind: "identityValueNode"
            }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: ["The amount of tokens to burn."],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 8
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "closeAccount",
        docs: [
          "Close an account by transferring all its SOL to the destination account.",
          "Non-native accounts may only be closed if its token amount is zero."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to close."]
          },
          {
            kind: "instructionAccountNode",
            name: "destination",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The destination account."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The account's owner or its multisignature account."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 9
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "freezeAccount",
        docs: [
          "Freeze an Initialized account using the Mint's freeze_authority (if set)."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to freeze."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The mint freeze authority or its multisignature account."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 10
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "thawAccount",
        docs: [
          "Thaw a Frozen account using the Mint's freeze_authority (if set)."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to thaw."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The mint freeze authority or its multisignature account."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 11
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "transferChecked",
        docs: [
          "Transfers tokens from one account to another either directly or via a",
          "delegate. If this account is associated with the native mint then equal",
          "amounts of SOL and Tokens will be transferred to the destination account.",
          "",
          "This instruction differs from Transfer in that the token mint and",
          "decimals value is checked by the caller. This may be useful when",
          "creating transactions offline or within a hardware wallet."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "source",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The source account."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "destination",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The destination account."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The source account's owner/delegate or its multisignature account."
            ],
            defaultValue: {
              kind: "identityValueNode"
            }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 12
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            docs: ["The amount of tokens to transfer."],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "decimals",
            docs: [
              "Expected number of base 10 digits to the right of the decimal place."
            ],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "approveChecked",
        docs: [
          "Approves a delegate. A delegate is given the authority over tokens on",
          "behalf of the source account's owner.",
          "",
          "This instruction differs from Approve in that the token mint and",
          "decimals value is checked by the caller. This may be useful when",
          "creating transactions offline or within a hardware wallet."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "source",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The source account."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "delegate",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The delegate."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The source account owner or its multisignature account."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 13
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            docs: ["The amount of tokens the delegate is approved for."],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "decimals",
            docs: [
              "Expected number of base 10 digits to the right of the decimal place."
            ],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "mintToChecked",
        docs: [
          "Mints new tokens to an account. The native mint does not support minting.",
          "",
          "This instruction differs from MintTo in that the decimals value is",
          "checked by the caller. This may be useful when creating transactions",
          "offline or within a hardware wallet."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to mint tokens to."]
          },
          {
            kind: "instructionAccountNode",
            name: "mintAuthority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The mint's minting authority or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 14
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            docs: ["The amount of new tokens to mint."],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "decimals",
            docs: [
              "Expected number of base 10 digits to the right of the decimal place."
            ],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "burnChecked",
        docs: [
          "Burns tokens by removing them from an account. `BurnChecked` does not",
          "support accounts associated with the native mint, use `CloseAccount` instead.",
          "",
          "This instruction differs from Burn in that the decimals value is checked",
          "by the caller. This may be useful when creating transactions offline or",
          "within a hardware wallet."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to burn from."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The account's owner/delegate or its multisignature account."
            ],
            defaultValue: {
              kind: "identityValueNode"
            }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 15
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            docs: ["The amount of tokens to burn."],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "decimals",
            docs: [
              "Expected number of base 10 digits to the right of the decimal place."
            ],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeAccount2",
        docs: [
          "Like InitializeAccount, but the owner pubkey is passed via instruction",
          "data rather than the accounts list. This variant may be preferable",
          "when using Cross Program Invocation from an instruction that does",
          "not need the owner's `AccountInfo` otherwise."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to initialize."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The mint this account will be associated with."]
          },
          {
            kind: "instructionAccountNode",
            name: "rent",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["Rent sysvar."],
            defaultValue: {
              kind: "publicKeyValueNode",
              publicKey: "SysvarRent111111111111111111111111111111111"
            }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 16
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "owner",
            docs: ["The new account's owner/multisignature."],
            type: {
              kind: "publicKeyTypeNode"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "syncNative",
        docs: [
          "Given a wrapped / native token account (a token account containing SOL)",
          "updates its amount field based on the account's underlying `lamports`.",
          "This is useful if a non-wrapped SOL account uses",
          "`system_instruction::transfer` to move lamports to a wrapped token",
          "account, and needs to have its token `amount` field updated."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: [
              "The native token account to sync with its underlying lamports."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 17
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeAccount3",
        docs: [
          "Like InitializeAccount2, but does not require the Rent sysvar to be provided."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to initialize."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The mint this account will be associated with."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 18
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "owner",
            docs: ["The new account's owner/multisignature."],
            type: {
              kind: "publicKeyTypeNode"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeMultisig2",
        docs: [
          "Like InitializeMultisig, but does not require the Rent sysvar to be provided."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "multisig",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The multisignature account to initialize."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 19
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "m",
            docs: [
              "The number of signers (M) required to validate this multisignature account."
            ],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "signers"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeMint2",
        docs: [
          "Like [`InitializeMint`], but does not require the Rent sysvar to be provided."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to initialize."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 20
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "decimals",
            docs: [
              "Number of base 10 digits to the right of the decimal place."
            ],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "mintAuthority",
            docs: ["The authority/multisignature to mint tokens."],
            type: {
              kind: "publicKeyTypeNode"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "freezeAuthority",
            docs: [
              "The optional freeze authority/multisignature of the mint."
            ],
            type: {
              kind: "optionTypeNode",
              fixed: false,
              item: {
                kind: "publicKeyTypeNode"
              },
              prefix: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              }
            },
            defaultValue: {
              kind: "noneValueNode"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "getAccountDataSize",
        docs: [
          "Gets the required size of an account for the given mint as a",
          "little-endian `u64`.",
          "",
          "Return data can be fetched using `sol_get_return_data` and deserializing",
          "the return data as a little-endian `u64`."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to calculate for."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 21
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeImmutableOwner",
        docs: [
          "Initialize the Immutable Owner extension for the given token account",
          "",
          "Fails if the account has already been initialized, so must be called",
          "before `InitializeAccount`.",
          "",
          "No-ops in this version of the program, but is included for compatibility",
          "with the Associated Token Account program."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "account",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The account to initialize."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 22
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "amountToUiAmount",
        docs: [
          "Convert an Amount of tokens to a UiAmount `string`, using the given",
          "mint. In this version of the program, the mint can only specify the",
          "number of decimals.",
          "",
          "Fails on an invalid mint.",
          "",
          "Return data can be fetched using `sol_get_return_data` and deserialized",
          "with `String::from_utf8`."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to calculate for."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 23
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            docs: ["The amount of tokens to reformat."],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "uiAmountToAmount",
        docs: [
          "Convert a UiAmount of tokens to a little-endian `u64` raw Amount, using",
          "the given mint. In this version of the program, the mint can only",
          "specify the number of decimals.",
          "",
          "Return data can be fetched using `sol_get_return_data` and deserializing",
          "the return data as a little-endian `u64`."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to calculate for."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 24
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "uiAmount",
            docs: ["The ui_amount of tokens to reformat."],
            type: {
              kind: "stringTypeNode",
              encoding: "utf8"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeMintCloseAuthority",
        docs: [
          "Initialize the close account authority on a new mint.",
          "",
          "Fails if the mint has already been initialized, so must be called before `InitializeMint`.",
          "",
          "The mint must have exactly enough space allocated for the base mint (82",
          "bytes), plus 83 bytes of padding, 1 byte reserved for the account type,",
          "then space required for this extension, plus any others."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to initialize."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 25
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "closeAuthority",
            docs: [
              "Authority that must sign the `CloseAccount` instruction on a mint."
            ],
            type: {
              kind: "optionTypeNode",
              fixed: false,
              item: {
                kind: "publicKeyTypeNode"
              },
              prefix: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              }
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeTransferFeeConfig",
        docs: [
          "Initialize the transfer fee on a new mint.",
          "",
          "Fails if the mint has already been initialized, so must be called before `InitializeMint`.",
          "",
          "The mint must have exactly enough space allocated for the base mint (82",
          "bytes), plus 83 bytes of padding, 1 byte reserved for the account type,",
          "then space required for this extension, plus any others."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to initialize."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 26
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "transferFeeDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 0
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "transferFeeConfigAuthority",
            docs: ["Pubkey that may update the fees."],
            type: {
              kind: "optionTypeNode",
              fixed: false,
              item: {
                kind: "publicKeyTypeNode"
              },
              prefix: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              }
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "withdrawWithheldAuthority",
            docs: ["Withdraw instructions must be signed by this key."],
            type: {
              kind: "optionTypeNode",
              fixed: false,
              item: {
                kind: "publicKeyTypeNode"
              },
              prefix: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              }
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "transferFeeBasisPoints",
            docs: [
              "Amount of transfer collected as fees, expressed as basis points of the transfer amount."
            ],
            type: {
              kind: "numberTypeNode",
              format: "u16",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "maximumFee",
            docs: ["Maximum fee assessed on transfers."],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "transferFeeDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "transferCheckedWithFee",
        docs: [
          "Transfer, providing expected mint information and fees.",
          "",
          "This instruction succeeds if the mint has no configured transfer fee",
          "and the provided fee is 0. This allows applications to use",
          "`TransferCheckedWithFee` with any mint."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "source",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: [
              "The source account. May include the `TransferFeeAmount` extension."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: [
              "The token mint. May include the `TransferFeeConfig` extension."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "destination",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: [
              "The destination account. May include the `TransferFeeAmount` extension."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The source account's owner/delegate or its multisignature account."
            ],
            defaultValue: {
              kind: "identityValueNode"
            }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 26
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "transferFeeDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 1
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            docs: ["The amount of tokens to transfer."],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "decimals",
            docs: [
              "Expected number of base 10 digits to the right of the decimal place."
            ],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "fee",
            docs: [
              "Expected fee assessed on this transfer, calculated off-chain based",
              "on the transfer_fee_basis_points and maximum_fee of the mint. May",
              "be 0 for a mint without a configured transfer fee."
            ],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "transferFeeDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "withdrawWithheldTokensFromMint",
        docs: [
          "Transfer all withheld tokens in the mint to an account. Signed by the",
          "mint's withdraw withheld tokens authority."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: [
              "The token mint. Must include the `TransferFeeConfig` extension."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "feeReceiver",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: [
              "The fee receiver account. Must include the `TransferFeeAmount`",
              "extension associated with the provided mint."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "withdrawWithheldAuthority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The mint's `withdraw_withheld_authority` or its multisignature account."
            ],
            defaultValue: {
              kind: "identityValueNode"
            }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 26
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "transferFeeDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 2
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "transferFeeDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "withdrawWithheldTokensFromAccounts",
        docs: [
          "Transfer all withheld tokens to an account. Signed by the mint's",
          "withdraw withheld tokens authority."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: [
              "The token mint. Must include the `TransferFeeConfig` extension."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "feeReceiver",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: [
              "The fee receiver account. Must include the `TransferFeeAmount`",
              "extension associated with the provided mint."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "withdrawWithheldAuthority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The mint's `withdraw_withheld_authority` or its multisignature account."
            ],
            defaultValue: {
              kind: "identityValueNode"
            }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 26
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "transferFeeDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 3
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "numTokenAccounts",
            docs: ["Number of token accounts harvested."],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          },
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: false,
            isWritable: true,
            isSigner: false,
            docs: ["The source accounts to withdraw from."],
            value: {
              kind: "argumentValueNode",
              name: "sources"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "transferFeeDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "harvestWithheldTokensToMint",
        docs: [
          "Permissionless instruction to transfer all withheld tokens to the mint.",
          "",
          "Succeeds for frozen accounts.",
          "",
          "Accounts provided should include the `TransferFeeAmount` extension.",
          "If not, the account is skipped."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The token mint."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 26
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "transferFeeDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 4
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: false,
            isWritable: true,
            isSigner: false,
            docs: ["The source accounts to harvest from."],
            value: {
              kind: "argumentValueNode",
              name: "sources"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "transferFeeDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "setTransferFee",
        docs: [
          "Set transfer fee. Only supported for mints that include the",
          "`TransferFeeConfig` extension."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "transferFeeConfigAuthority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The mint's fee account owner or its multisignature account."
            ],
            defaultValue: {
              kind: "identityValueNode"
            }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 26
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "transferFeeDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 5
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "transferFeeBasisPoints",
            docs: [
              "Amount of transfer collected as fees, expressed as basis points of the transfer amount."
            ],
            type: {
              kind: "numberTypeNode",
              format: "u16",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "maximumFee",
            docs: ["Maximum fee assessed on transfers."],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "transferFeeDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeConfidentialTransferMint",
        docs: [
          "Initializes confidential transfers for a mint.",
          "",
          "The `ConfidentialTransferInstruction::InitializeMint` instruction",
          "requires no signers and MUST be included within the same Transaction",
          "as `TokenInstruction::InitializeMint`. Otherwise another party can",
          "initialize the configuration.",
          "",
          "The instruction fails if the `TokenInstruction::InitializeMint`",
          "instruction has already executed for the mint."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The SPL Token mint."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 27
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 0
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "authority",
            docs: [
              "Authority to modify the `ConfidentialTransferMint` configuration and to",
              "approve new accounts."
            ],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "autoApproveNewAccounts",
            docs: [
              "Determines if newly configured accounts must be approved by the",
              "`authority` before they may be used by the user."
            ],
            type: {
              kind: "booleanTypeNode",
              size: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              }
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "auditorElgamalPubkey",
            docs: [
              "New authority to decode any transfer amount in a confidential transfer."
            ],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "updateConfidentialTransferMint",
        docs: [
          "Updates the confidential transfer mint configuration for a mint.",
          "",
          "Use `TokenInstruction::SetAuthority` to update the confidential transfer",
          "mint authority."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The SPL Token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: true,
            isOptional: false,
            docs: ["Confidential transfer mint authority."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 27
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 1
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "autoApproveNewAccounts",
            docs: [
              "Determines if newly configured accounts must be approved by the",
              "`authority` before they may be used by the user."
            ],
            type: {
              kind: "booleanTypeNode",
              size: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              }
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "auditorElgamalPubkey",
            docs: [
              "New authority to decode any transfer amount in a confidential transfer."
            ],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "configureConfidentialTransferAccount",
        docs: [
          "Configures confidential transfers for a token account.",
          "",
          "The instruction fails if the confidential transfers are already",
          "configured, or if the mint was not initialized with confidential",
          "transfer support.",
          "",
          "The instruction fails if the `TokenInstruction::InitializeAccount`",
          "instruction has not yet successfully executed for the token account.",
          "",
          "Upon success, confidential and non-confidential deposits and transfers",
          "are enabled. Use the `DisableConfidentialCredits` and",
          "`DisableNonConfidentialCredits` instructions to disable.",
          "",
          "In order for this instruction to be successfully processed, it must be",
          "accompanied by the `VerifyPubkeyValidity` instruction of the",
          "`zk_elgamal_proof` program in the same transaction or the address of a",
          "context state account for the proof must be provided."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The SPL Token account."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The corresponding SPL Token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "instructionsSysvarOrContextState",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: [
              "Instructions sysvar if `VerifyPubkeyValidity` is included in",
              "the same transaction or context state account if",
              "`VerifyPubkeyValidity` is pre-verified into a context state",
              "account."
            ],
            defaultValue: {
              kind: "publicKeyValueNode",
              publicKey: "Sysvar1nstructions1111111111111111111111111"
            }
          },
          {
            kind: "instructionAccountNode",
            name: "record",
            isWritable: false,
            isSigner: false,
            isOptional: true,
            docs: [
              "(Optional) Record account if the accompanying proof is to be read from a record account."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The source account's owner/delegate or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 27
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 2
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "decryptableZeroBalance",
            docs: [
              "The decryptable balance (always 0) once the configure account succeeds."
            ],
            type: {
              kind: "definedTypeLinkNode",
              name: "decryptableBalance"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "maximumPendingBalanceCreditCounter",
            docs: [
              "The maximum number of despots and transfers that an account can receiver",
              "before the `ApplyPendingBalance` is executed"
            ],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "proofInstructionOffset",
            docs: [
              "Relative location of the `ProofInstruction::ZeroCiphertextProof`",
              "instruction to the `ConfigureAccount` instruction in the",
              "transaction. If the offset is `0`, then use a context state account",
              "for the proof."
            ],
            type: {
              kind: "numberTypeNode",
              format: "i8",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "approveConfidentialTransferAccount",
        docs: [
          "Approves a token account for confidential transfers.",
          "",
          "Approval is only required when the",
          "`ConfidentialTransferMint::approve_new_accounts` field is set in the",
          "SPL Token mint.  This instruction must be executed after the account",
          "owner configures their account for confidential transfers with",
          "`ConfidentialTransferInstruction::ConfigureAccount`."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The SPL Token account to approve."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The corresponding SPL Token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: true,
            isOptional: false,
            docs: ["Confidential transfer mint authority."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 27
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 3
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "emptyConfidentialTransferAccount",
        docs: [
          "Empty the available balance in a confidential token account.",
          "",
          "A token account that is extended for confidential transfers can only be",
          "closed if the pending and available balance ciphertexts are emptied.",
          "The pending balance can be emptied",
          "via the `ConfidentialTransferInstruction::ApplyPendingBalance`",
          "instruction. Use the `ConfidentialTransferInstruction::EmptyAccount`",
          "instruction to empty the available balance ciphertext.",
          "",
          "Note that a newly configured account is always empty, so this",
          "instruction is not required prior to account closing if no",
          "instructions beyond",
          "`ConfidentialTransferInstruction::ConfigureAccount` have affected the",
          "token account.",
          "",
          "In order for this instruction to be successfully processed, it must be",
          "accompanied by the `VerifyZeroCiphertext` instruction of the",
          "`zk_elgamal_proof` program in the same transaction or the address of a",
          "context state account for the proof must be provided."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The SPL Token account."]
          },
          {
            kind: "instructionAccountNode",
            name: "instructionsSysvarOrContextState",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: [
              "Instructions sysvar if `VerifyZeroCiphertext` is included in",
              "the same transaction or context state account if",
              "`VerifyZeroCiphertext` is pre-verified into a context state",
              "account."
            ],
            defaultValue: {
              kind: "publicKeyValueNode",
              publicKey: "Sysvar1nstructions1111111111111111111111111"
            }
          },
          {
            kind: "instructionAccountNode",
            name: "record",
            isWritable: false,
            isSigner: false,
            isOptional: true,
            docs: [
              "(Optional) Record account if the accompanying proof is to be read from a record account."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The source account's owner/delegate or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 27
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 4
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "proofInstructionOffset",
            docs: [
              "Relative location of the `ProofInstruction::VerifyCloseAccount`",
              "instruction to the `EmptyAccount` instruction in the transaction. If",
              "the offset is `0`, then use a context state account for the proof."
            ],
            type: {
              kind: "numberTypeNode",
              format: "i8",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "confidentialDeposit",
        docs: [
          "Deposit SPL Tokens into the pending balance of a confidential token",
          "account.",
          "",
          "The account owner can then invoke the `ApplyPendingBalance` instruction",
          "to roll the deposit into their available balance at a time of their",
          "choosing.",
          "",
          "Fails if the source or destination accounts are frozen.",
          "Fails if the associated mint is extended as `NonTransferable`."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The SPL Token account."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The corresponding SPL Token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The source account's owner/delegate or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 27
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 5
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            docs: ["The amount of tokens to deposit."],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "decimals",
            docs: [
              "Expected number of base 10 digits to the right of the decimal place."
            ],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "confidentialWithdraw",
        docs: [
          "Withdraw SPL Tokens from the available balance of a confidential token",
          "account.",
          "",
          "In order for this instruction to be successfully processed, it must be",
          "accompanied by the following list of `zk_elgamal_proof` program",
          "instructions:",
          "- `VerifyCiphertextCommitmentEquality`",
          "- `VerifyBatchedRangeProofU64`",
          "These instructions can be accompanied in the same transaction or can be",
          "pre-verified into a context state account, in which case, only their",
          "context state account address need to be provided.",
          "",
          "Fails if the source or destination accounts are frozen.",
          "Fails if the associated mint is extended as `NonTransferable`."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The SPL Token account."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The corresponding SPL Token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "instructionsSysvar",
            isWritable: false,
            isSigner: false,
            isOptional: true,
            docs: [
              "Instructions sysvar if at least one of the",
              "`zk_elgamal_proof` instructions are included in the same",
              "transaction."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "equalityRecord",
            isWritable: false,
            isSigner: false,
            isOptional: true,
            docs: [
              "(Optional) Equality proof record account or context state account."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "rangeRecord",
            isWritable: false,
            isSigner: false,
            isOptional: true,
            docs: [
              "(Optional) Range proof record account or context state account."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The source account's owner/delegate or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 27
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 6
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "amount",
            docs: ["The amount of tokens to withdraw."],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "decimals",
            docs: [
              "Expected number of base 10 digits to the right of the decimal place."
            ],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "newDecryptableAvailableBalance",
            docs: ["The new decryptable balance if the withdrawal succeeds."],
            type: {
              kind: "definedTypeLinkNode",
              name: "decryptableBalance"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "equalityProofInstructionOffset",
            docs: [
              "Relative location of the",
              "`ProofInstruction::VerifyCiphertextCommitmentEquality` instruction",
              "to the `Withdraw` instruction in the transaction. If the offset is",
              "`0`, then use a context state account for the proof."
            ],
            type: {
              kind: "numberTypeNode",
              format: "i8",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "rangeProofInstructionOffset",
            docs: [
              "Relative location of the `ProofInstruction::BatchedRangeProofU64`",
              "instruction to the `Withdraw` instruction in the transaction. If the",
              "offset is `0`, then use a context state account for the proof."
            ],
            type: {
              kind: "numberTypeNode",
              format: "i8",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "confidentialTransfer",
        docs: [
          "Transfer tokens confidentially.",
          "",
          "In order for this instruction to be successfully processed, it must be",
          "accompanied by the following list of `zk_elgamal_proof` program",
          "instructions:",
          "- `VerifyCiphertextCommitmentEquality`",
          "- `VerifyBatchedGroupedCiphertext3HandlesValidity`",
          "- `VerifyBatchedRangeProofU128`",
          "These instructions can be accompanied in the same transaction or can be",
          "pre-verified into a context state account, in which case, only their",
          "context state account addresses need to be provided.",
          "",
          "Fails if the associated mint is extended as `NonTransferable`."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "sourceToken",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The source SPL Token account."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The corresponding SPL Token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "destinationToken",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The destination SPL Token account."]
          },
          {
            kind: "instructionAccountNode",
            name: "instructionsSysvar",
            isWritable: false,
            isSigner: false,
            isOptional: true,
            docs: [
              "(Optional) Instructions sysvar if at least one of the",
              "`zk_elgamal_proof` instructions are included in the same",
              "transaction."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "equalityRecord",
            isWritable: false,
            isSigner: false,
            isOptional: true,
            docs: [
              "(Optional) Equality proof record account or context state account."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "ciphertextValidityRecord",
            isWritable: false,
            isSigner: false,
            isOptional: true,
            docs: [
              "(Optional) Ciphertext validity proof record account or context state account."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "rangeRecord",
            isWritable: false,
            isSigner: false,
            isOptional: true,
            docs: [
              "(Optional) Range proof record account or context state account."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The source account's owner/delegate or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 27
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 7
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "newSourceDecryptableAvailableBalance",
            docs: [
              "The new source decryptable balance if the transfer succeeds."
            ],
            type: {
              kind: "definedTypeLinkNode",
              name: "decryptableBalance"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "equalityProofInstructionOffset",
            docs: [
              "Relative location of the",
              "`ProofInstruction::VerifyCiphertextCommitmentEquality` instruction",
              "to the `Transfer` instruction in the transaction. If the offset is",
              "`0`, then use a context state account for the proof."
            ],
            type: {
              kind: "numberTypeNode",
              format: "i8",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "ciphertextValidityProofInstructionOffset",
            docs: [
              "Relative location of the",
              "`ProofInstruction::VerifyBatchedGroupedCiphertext3HandlesValidity`",
              "instruction to the `Transfer` instruction in the transaction. If the",
              "offset is `0`, then use a context state account for the proof."
            ],
            type: {
              kind: "numberTypeNode",
              format: "i8",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "rangeProofInstructionOffset",
            docs: [
              "Relative location of the `ProofInstruction::BatchedRangeProofU128Data`",
              "instruction to the `Transfer` instruction in the transaction. If the",
              "offset is `0`, then use a context state account for the proof."
            ],
            type: {
              kind: "numberTypeNode",
              format: "i8",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "applyConfidentialPendingBalance",
        docs: [
          "Applies the pending balance to the available balance, based on the",
          "history of `Deposit` and/or `Transfer` instructions.",
          "",
          "After submitting `ApplyPendingBalance`, the client should compare",
          "`ConfidentialTransferAccount::expected_pending_balance_credit_counter`",
          "with",
          "`ConfidentialTransferAccount::actual_applied_pending_balance_instructions`.  If they are",
          "equal then the",
          "`ConfidentialTransferAccount::decryptable_available_balance` is",
          "consistent with `ConfidentialTransferAccount::available_balance`. If",
          "they differ then there is more pending balance to be applied."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The SPL Token account."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The source account's owner/delegate or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 27
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 8
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "expectedPendingBalanceCreditCounter",
            docs: [
              "The expected number of pending balance credits since the last successful",
              "`ApplyPendingBalance` instruction"
            ],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "newDecryptableAvailableBalance",
            docs: [
              "The new decryptable balance if the pending balance is applied",
              "successfully"
            ],
            type: {
              kind: "definedTypeLinkNode",
              name: "decryptableBalance"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "enableConfidentialCredits",
        docs: [
          "Configure a confidential extension account to accept incoming",
          "confidential transfers."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The SPL Token account."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The source account's owner/delegate or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 27
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 9
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "disableConfidentialCredits",
        docs: [
          "Configure a confidential extension account to reject any incoming",
          "confidential transfers.",
          "",
          "If the `allow_non_confidential_credits` field is `true`, then the base",
          "account can still receive non-confidential transfers.",
          "",
          "This instruction can be used to disable confidential payments after a",
          "token account has already been extended for confidential transfers."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The SPL Token account."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The source account's owner/delegate or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 27
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 10
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "enableNonConfidentialCredits",
        docs: [
          "Configure an account with the confidential extension to accept incoming",
          "non-confidential transfers."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The SPL Token account."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The source account's owner/delegate or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 27
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 11
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "disableNonConfidentialCredits",
        docs: [
          "Configure an account with the confidential extension to reject any",
          "incoming non-confidential transfers.",
          "",
          "This instruction can be used to configure a confidential extension",
          "account to exclusively receive confidential payments."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The SPL Token account."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The source account's owner/delegate or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 27
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 12
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "confidentialTransferWithFee",
        docs: [
          "Transfer tokens confidentially with fee.",
          "",
          "In order for this instruction to be successfully processed, it must be",
          "accompanied by the following list of `zk_elgamal_proof` program",
          "instructions:",
          "- `VerifyCiphertextCommitmentEquality`",
          "- `VerifyBatchedGroupedCiphertext3HandlesValidity` (transfer amount",
          "  ciphertext)",
          "- `VerifyPercentageWithFee`",
          "- `VerifyBatchedGroupedCiphertext2HandlesValidity` (fee ciphertext)",
          "- `VerifyBatchedRangeProofU256`",
          "These instructions can be accompanied in the same transaction or can be",
          "pre-verified into a context state account, in which case, only their",
          "context state account addresses need to be provided.",
          "",
          "The same restrictions for the `Transfer` applies to",
          "`TransferWithFee`. Namely, the instruction fails if the",
          "associated mint is extended as `NonTransferable`."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "sourceToken",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The source SPL Token account."]
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The corresponding SPL Token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "destinationToken",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The destination SPL Token account."]
          },
          {
            kind: "instructionAccountNode",
            name: "instructionsSysvar",
            isWritable: false,
            isSigner: false,
            isOptional: true,
            docs: [
              "(Optional) Instructions sysvar if at least one of the",
              "`zk_elgamal_proof` instructions are included in the same",
              "transaction."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "equalityRecord",
            isWritable: false,
            isSigner: false,
            isOptional: true,
            docs: [
              "(Optional) Equality proof record account or context state account."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "transferAmountCiphertextValidityRecord",
            isWritable: false,
            isSigner: false,
            isOptional: true,
            docs: [
              "(Optional) Transfer amount ciphertext validity proof record",
              "account or context state account."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "feeSigmaRecord",
            isWritable: false,
            isSigner: false,
            isOptional: true,
            docs: [
              "(Optional) Fee sigma proof record account or context state account."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "feeCiphertextValidityRecord",
            isWritable: false,
            isSigner: false,
            isOptional: true,
            docs: [
              "(Optional) Fee ciphertext validity proof record account or context state account."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "rangeRecord",
            isWritable: false,
            isSigner: false,
            isOptional: true,
            docs: [
              "(Optional) Range proof record account or context state account."
            ]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The source account's owner/delegate or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 27
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 13
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "newSourceDecryptableAvailableBalance",
            docs: [
              "The new source decryptable balance if the transfer succeeds."
            ],
            type: {
              kind: "definedTypeLinkNode",
              name: "decryptableBalance"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "equalityProofInstructionOffset",
            docs: [
              "Relative location of the",
              "`ProofInstruction::VerifyCiphertextCommitmentEquality` instruction",
              "to the `TransferWithFee` instruction in the transaction. If the offset",
              "is `0`, then use a context state account for the proof."
            ],
            type: {
              kind: "numberTypeNode",
              format: "i8",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "transferAmountCiphertextValidityProofInstructionOffset",
            docs: [
              "Relative location of the",
              "`ProofInstruction::VerifyBatchedGroupedCiphertext3HandlesValidity`",
              "instruction to the `TransferWithFee` instruction in the transaction.",
              "If the offset is `0`, then use a context state account for the",
              "proof."
            ],
            type: {
              kind: "numberTypeNode",
              format: "i8",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "feeSigmaProofInstructionOffset",
            docs: [
              "Relative location of the `ProofInstruction::VerifyPercentageWithFee`",
              "instruction to the `TransferWithFee` instruction in the transaction.",
              "If the offset is `0`, then use a context state account for the",
              "proof."
            ],
            type: {
              kind: "numberTypeNode",
              format: "i8",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "feeCiphertextValidityProofInstructionOffset",
            docs: [
              "Relative location of the",
              "`ProofInstruction::VerifyBatchedGroupedCiphertext2HandlesValidity`",
              "instruction to the `TransferWithFee` instruction in the transaction.",
              "If the offset is `0`, then use a context state account for the",
              "proof."
            ],
            type: {
              kind: "numberTypeNode",
              format: "i8",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "rangeProofInstructionOffset",
            docs: [
              "Relative location of the `ProofInstruction::BatchedRangeProofU256Data`",
              "instruction to the `TransferWithFee` instruction in the transaction.",
              "If the offset is `0`, then use a context state account for the",
              "proof."
            ],
            type: {
              kind: "numberTypeNode",
              format: "i8",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeDefaultAccountState",
        docs: [
          "Initialize a new mint with the default state for new Accounts.",
          "",
          "Fails if the mint has already been initialized, so must be called before",
          "`InitializeMint`.",
          "",
          "The mint must have exactly enough space allocated for the base mint (82",
          "bytes), plus 83 bytes of padding, 1 byte reserved for the account type,",
          "then space required for this extension, plus any others."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 28
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "defaultAccountStateDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 0
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "state",
            docs: ["The state each new token account should start with."],
            type: {
              kind: "definedTypeLinkNode",
              name: "accountState"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "defaultAccountStateDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "updateDefaultAccountState",
        docs: [
          "Update the default state for new Accounts. Only supported for mints that",
          "include the `DefaultAccountState` extension."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "freezeAuthority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The mint freeze authority or its multisignature account."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 28
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "defaultAccountStateDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 1
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "state",
            docs: ["The state each new token account should start with."],
            type: {
              kind: "definedTypeLinkNode",
              name: "accountState"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "defaultAccountStateDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "reallocate",
        docs: [
          "Check to see if a token account is large enough for a list of",
          "ExtensionTypes, and if not, use reallocation to increase the data",
          "size."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The token account to reallocate."]
          },
          {
            kind: "instructionAccountNode",
            name: "payer",
            isWritable: true,
            isSigner: true,
            isOptional: false,
            docs: ["The payer account to fund reallocation."]
          },
          {
            kind: "instructionAccountNode",
            name: "systemProgram",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["System program for reallocation funding."],
            defaultValue: {
              kind: "publicKeyValueNode",
              publicKey: "11111111111111111111111111111111"
            }
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The account's owner or its multisignature account."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 29
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "newExtensionTypes",
            docs: [
              "New extension types to include in the reallocated account."
            ],
            type: {
              kind: "arrayTypeNode",
              item: {
                kind: "definedTypeLinkNode",
                name: "extensionType"
              },
              count: {
                kind: "remainderCountNode"
              }
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "enableMemoTransfers",
        docs: [
          "Require memos for transfers into this Account. Adds the MemoTransfer",
          "extension to the Account, if it doesn't already exist."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The token account to update."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The account's owner or its multisignature account."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 30
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "memoTransfersDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 0
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "memoTransfersDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "disableMemoTransfers",
        docs: [
          "Stop requiring memos for transfers into this Account.",
          "",
          "Implicitly initializes the extension in the case where it is not",
          "present."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The token account to update."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The account's owner or its multisignature account."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 30
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "memoTransfersDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 1
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "memoTransfersDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "createNativeMint",
        docs: [
          "Creates the native mint.",
          "",
          "This instruction only needs to be invoked once after deployment and is",
          "permissionless. Wrapped SOL (`native_mint::id()`) will not be",
          "available until this instruction is successfully executed."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "payer",
            isWritable: true,
            isSigner: true,
            isOptional: false,
            docs: ["Funding account (must be a system account)"]
          },
          {
            kind: "instructionAccountNode",
            name: "nativeMint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The native mint address"]
          },
          {
            kind: "instructionAccountNode",
            name: "systemProgram",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["System program for mint account funding"],
            defaultValue: {
              kind: "publicKeyValueNode",
              publicKey: "11111111111111111111111111111111"
            }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 31
            }
          }
        ],
        remainingAccounts: [],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeNonTransferableMint",
        docs: [
          "Initialize the non transferable extension for the given mint account",
          "",
          "Fails if the account has already been initialized, so must be called before `InitializeMint`."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint account to initialize."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 32
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeInterestBearingMint",
        docs: [
          "Initialize a new mint with the `InterestBearing` extension.",
          "",
          "Fails if the mint has already been initialized, so must be called before",
          "`InitializeMint`.",
          "",
          "The mint must have exactly enough space allocated for the base mint (82",
          "bytes), plus 83 bytes of padding, 1 byte reserved for the account type,",
          "then space required for this extension, plus any others."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to initialize."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 33
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "interestBearingMintDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 0
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "rateAuthority",
            docs: ["The public key for the account that can update the rate"],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "rate",
            docs: ["The initial interest rate"],
            type: {
              kind: "numberTypeNode",
              format: "i16",
              endian: "le"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "interestBearingMintDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "updateRateInterestBearingMint",
        docs: [
          "Update the interest rate. Only supported for mints that include the",
          "`InterestBearingConfig` extension."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "rateAuthority",
            isWritable: true,
            isSigner: "either",
            isOptional: false,
            docs: ["The mint rate authority."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 33
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "interestBearingMintDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 1
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "rate",
            docs: ["The interest rate to update."],
            type: {
              kind: "numberTypeNode",
              format: "i16",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "interestBearingMintDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "enableCpiGuard",
        docs: [
          "Lock certain token operations from taking place within CPI for this Account, namely:",
          "* Transfer and Burn must go through a delegate.",
          "* CloseAccount can only return lamports to owner.",
          "* SetAuthority can only be used to remove an existing close authority.",
          "* Approve is disallowed entirely.",
          "",
          "In addition, CPI Guard cannot be enabled or disabled via CPI."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The token account to update."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The account's owner/delegate or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 34
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "cpiGuardDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 0
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "cpiGuardDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "disableCpiGuard",
        docs: [
          "Allow all token operations to happen via CPI as normal.",
          "",
          "Implicitly initializes the extension in the case where it is not present."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "token",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The token account to update."]
          },
          {
            kind: "instructionAccountNode",
            name: "owner",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The account's owner/delegate or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 34
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "cpiGuardDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 1
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "cpiGuardDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializePermanentDelegate",
        docs: [
          "Initialize the permanent delegate on a new mint.",
          "",
          "Fails if the mint has already been initialized, so must be called before `InitializeMint`.",
          "",
          "The mint must have exactly enough space allocated for the base mint (82 bytes),",
          "plus 83 bytes of padding, 1 byte reserved for the account type,",
          "then space required for this extension, plus any others."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to initialize."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 35
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "delegate",
            docs: [
              "Authority that may sign for `Transfer`s and `Burn`s on any account"
            ],
            type: {
              kind: "publicKeyTypeNode"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeTransferHook",
        docs: [
          "Initialize a new mint with a transfer hook program.",
          "",
          "Fails if the mint has already been initialized, so must be called before `InitializeMint`.",
          "",
          "The mint must have exactly enough space allocated for the base mint (82 bytes),",
          "plus 83 bytes of padding, 1 byte reserved for the account type,",
          "then space required for this extension, plus any others."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to initialize."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 36
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "transferHookDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 0
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "authority",
            docs: [
              "The public key for the account that can update the program id"
            ],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "programId",
            docs: ["The program id that performs logic during transfers"],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "transferHookDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "updateTransferHook",
        docs: [
          "Update the transfer hook program id. Only supported for mints that",
          "include the `TransferHook` extension.",
          "",
          "Accounts expected by this instruction:",
          "",
          "  0. `[writable]` The mint.",
          "  1. `[signer]` The transfer hook authority."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The transfer hook authority."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 36
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "transferHookDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 1
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "programId",
            docs: ["The program id that performs logic during transfers"],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "transferHookDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeConfidentialTransferFee",
        docs: [
          "Initializes confidential transfer fees for a mint.",
          "",
          "The instruction must be included within the same Transaction as TokenInstruction::InitializeMint.",
          "Otherwise another party can initialize the configuration.",
          "",
          "The instruction fails if TokenInstruction::InitializeMint has already executed for the mint."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The SPL Token mint."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 37
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferFeeDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 0
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "authority",
            docs: [
              "Optional authority to set the withdraw withheld authority ElGamal key"
            ],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "withdrawWithheldAuthorityElGamalPubkey",
            docs: [
              "Withheld fees from accounts must be encrypted with this ElGamal key"
            ],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferFeeDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "withdrawWithheldTokensFromMintForConfidentialTransferFee",
        docs: [
          "Transfer all withheld confidential tokens in the mint to an account.",
          "Signed by the mint's withdraw withheld tokens authority.",
          "",
          "The withheld confidential tokens are aggregated directly into the destination available balance.",
          "",
          "Must be accompanied by the VerifyCiphertextCiphertextEquality instruction",
          "of the zk_elgamal_proof program in the same transaction or the address of",
          "a context state account for the proof must be provided."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "destination",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The fee receiver account."]
          },
          {
            kind: "instructionAccountNode",
            name: "instructionsSysvarOrContextState",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["Instructions sysvar or context state account"]
          },
          {
            kind: "instructionAccountNode",
            name: "record",
            isWritable: false,
            isSigner: false,
            isOptional: true,
            docs: ["Optional record account if proof is read from record"]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The mint's withdraw_withheld_authority"]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 37
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferFeeDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 1
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "proofInstructionOffset",
            docs: ["Proof instruction offset"],
            type: {
              kind: "numberTypeNode",
              format: "i8",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "newDecryptableAvailableBalance",
            docs: [
              "The new decryptable balance in the destination token account"
            ],
            type: {
              kind: "definedTypeLinkNode",
              name: "decryptableBalance"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferFeeDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "withdrawWithheldTokensFromAccountsForConfidentialTransferFee",
        docs: [
          "Transfer all withheld tokens to an account. Signed by the mint's withdraw withheld",
          "tokens authority. This instruction is susceptible to front-running.",
          "Use `HarvestWithheldTokensToMint` and `WithdrawWithheldTokensFromMint` as alternative.",
          "",
          "Must be accompanied by the VerifyWithdrawWithheldTokens instruction."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["The token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "destination",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The fee receiver account."]
          },
          {
            kind: "instructionAccountNode",
            name: "instructionsSysvarOrContextState",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: ["Instructions sysvar or context state account"]
          },
          {
            kind: "instructionAccountNode",
            name: "record",
            isWritable: false,
            isSigner: false,
            isOptional: true,
            docs: ["Optional record account"]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The mint's withdraw_withheld_authority"]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 37
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferFeeDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 2
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "numTokenAccounts",
            docs: ["Number of token accounts harvested"],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "proofInstructionOffset",
            docs: ["Proof instruction offset"],
            type: {
              kind: "numberTypeNode",
              format: "i8",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "newDecryptableAvailableBalance",
            docs: [
              "The new decryptable balance in the destination token account"
            ],
            type: {
              kind: "definedTypeLinkNode",
              name: "decryptableBalance"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferFeeDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "harvestWithheldTokensToMintForConfidentialTransferFee",
        docs: [
          "Permissionless instruction to transfer all withheld confidential tokens to the mint.",
          "",
          "Succeeds for frozen accounts.",
          "",
          "Accounts provided should include both the `TransferFeeAmount` and",
          "`ConfidentialTransferAccount` extension. If not, the account is skipped."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 37
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferFeeDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 3
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: false,
            isWritable: true,
            docs: ["The source accounts to harvest from"],
            value: {
              kind: "argumentValueNode",
              name: "sources"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferFeeDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "enableHarvestToMint",
        docs: [
          "Configure a confidential transfer fee mint to accept harvested confidential fees."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The confidential transfer fee authority"]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 37
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferFeeDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 4
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferFeeDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "disableHarvestToMint",
        docs: [
          "Configure a confidential transfer fee mint to reject any harvested confidential fees."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The token mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The confidential transfer fee authority"]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 37
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "confidentialTransferFeeDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 5
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "confidentialTransferFeeDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "withdrawExcessLamports",
        docs: [
          "This instruction is to be used to rescue SOLs sent to any TokenProgram",
          "owned account by sending them to any other account, leaving behind only",
          "lamports for rent exemption."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "sourceAccount",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["Account holding excess lamports."]
          },
          {
            kind: "instructionAccountNode",
            name: "destinationAccount",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["Destination account for withdrawn lamports."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The source account's owner/delegate or its multisignature account."
            ],
            defaultValue: {
              kind: "identityValueNode"
            }
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 38
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeMetadataPointer",
        docs: [
          "Initialize a new mint with a metadata pointer",
          "",
          "Fails if the mint has already been initialized, so must be called before",
          "`InitializeMint`.",
          "",
          "The mint must have exactly enough space allocated for the base mint (82",
          "bytes), plus 83 bytes of padding, 1 byte reserved for the account type,",
          "then space required for this extension, plus any others."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to initialize."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 39
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "metadataPointerDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 0
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "authority",
            docs: [
              "The public key for the account that can update the metadata address."
            ],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "metadataAddress",
            docs: ["The account address that holds the metadata."],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "metadataPointerDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "updateMetadataPointer",
        docs: [
          "Update the metadata pointer address. Only supported for mints that",
          "include the `MetadataPointer` extension."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to initialize."]
          },
          {
            kind: "instructionAccountNode",
            name: "metadataPointerAuthority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The metadata pointer authority or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 39
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "metadataPointerDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 1
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "metadataAddress",
            docs: ["The new account address that holds the metadata."],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "metadataPointerDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeGroupPointer",
        docs: [
          "Initialize a new mint with a group pointer",
          "",
          "Fails if the mint has already been initialized, so must be called before",
          "`InitializeMint`.",
          "",
          "The mint must have exactly enough space allocated for the base mint (82",
          "bytes), plus 83 bytes of padding, 1 byte reserved for the account type,",
          "then space required for this extension, plus any others."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to initialize."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 40
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "groupPointerDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 0
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "authority",
            docs: [
              "The public key for the account that can update the group address."
            ],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "groupAddress",
            docs: ["The account address that holds the group."],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "groupPointerDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "updateGroupPointer",
        docs: [
          "Update the group pointer address. Only supported for mints that",
          "include the `GroupPointer` extension."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to initialize."]
          },
          {
            kind: "instructionAccountNode",
            name: "groupPointerAuthority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The group pointer authority or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 40
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "groupPointerDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 1
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "groupAddress",
            docs: [
              "The new account address that holds the group configurations."
            ],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "groupPointerDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeGroupMemberPointer",
        docs: [
          "Initialize a new mint with a group member pointer",
          "",
          "Fails if the mint has already been initialized, so must be called before",
          "`InitializeMint`.",
          "",
          "The mint must have exactly enough space allocated for the base mint (82",
          "bytes), plus 83 bytes of padding, 1 byte reserved for the account type,",
          "then space required for this extension, plus any others."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to initialize."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 41
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "groupMemberPointerDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 0
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "authority",
            docs: [
              "The public key for the account that can update the group member address."
            ],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "memberAddress",
            docs: ["The account address that holds the member."],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "groupMemberPointerDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "updateGroupMemberPointer",
        docs: [
          "Update the group member pointer address. Only supported for mints that",
          "include the `GroupMemberPointer` extension."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to initialize."]
          },
          {
            kind: "instructionAccountNode",
            name: "groupMemberPointerAuthority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: [
              "The group member pointer authority or its multisignature account."
            ]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 41
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "groupMemberPointerDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 1
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "memberAddress",
            docs: ["The new account address that holds the member."],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "groupMemberPointerDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeScaledUiAmountMint",
        docs: [
          "Initialize a new mint with the `ScaledUiAmount` extension.",
          "",
          "Fails if the mint has already been initialized, so must be called before `InitializeMint`.",
          "",
          "The mint must have exactly enough space allocated for the base mint (82 bytes),",
          "plus 83 bytes of padding, 1 byte reserved for the account type,",
          "then space required for this extension, plus any others."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint to initialize."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 43
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "scaledUiAmountMintDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 0
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "authority",
            docs: ["The authority that can update the multiplier"],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "multiplier",
            docs: ["The initial multiplier for the scaled UI extension"],
            type: {
              kind: "numberTypeNode",
              format: "f64",
              endian: "le"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "scaledUiAmountMintDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "updateMultiplierScaledUiMint",
        docs: [
          "Update the multiplier. Only supported for mints that include the",
          "`ScaledUiAmountConfig` extension.",
          "You can set a specific timestamp for the multiplier to take effect."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: true,
            isSigner: "either",
            isOptional: false,
            docs: ["The multiplier authority."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 43
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "scaledUiAmountMintDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 1
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "multiplier",
            docs: ["The new multiplier for the scaled UI extension"],
            type: {
              kind: "numberTypeNode",
              format: "f64",
              endian: "le"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "effectiveTimestamp",
            docs: [
              "The timestamp at which the new multiplier will take effect"
            ],
            type: {
              kind: "numberTypeNode",
              format: "i64",
              endian: "le"
            }
          }
        ],
        remainingAccounts: [
          {
            kind: "instructionRemainingAccountsNode",
            isOptional: true,
            isSigner: true,
            docs: [],
            value: {
              kind: "argumentValueNode",
              name: "multiSigners"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "scaledUiAmountMintDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializePausableConfig",
        docs: [
          "Initialize a new mint with the `Pausable` extension.",
          "",
          "Fails if the mint has already been initialized, so must be called before `InitializeMint`."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 44
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "pausableDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 0
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "authority",
            docs: ["The authority that can pause and resume the mint."],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "pausableDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "pause",
        docs: ["Pause the mint.", "", "Fails if the mint is not pausable."],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The pausable authority that can pause the mint."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 44
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "pausableDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 1
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "pausableDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "resume",
        docs: ["Resume the mint.", "", "Fails if the mint is not pausable."],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: ["The mint."]
          },
          {
            kind: "instructionAccountNode",
            name: "authority",
            isWritable: false,
            isSigner: "either",
            isOptional: false,
            docs: ["The pausable authority that can resume the mint."]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 44
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "pausableDiscriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "numberTypeNode",
              format: "u8",
              endian: "le"
            },
            defaultValue: {
              kind: "numberValueNode",
              number: 2
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          },
          {
            kind: "fieldDiscriminatorNode",
            name: "pausableDiscriminator",
            offset: 1
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeTokenMetadata",
        docs: [
          "Initializes a TLV entry with the basic token-metadata fields.",
          "",
          "Assumes that the provided mint is an SPL token mint, that the metadata",
          "account is allocated and assigned to the program, and that the metadata",
          "account has enough lamports to cover the rent-exempt reserve."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "metadata",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: []
          },
          {
            kind: "instructionAccountNode",
            name: "updateAuthority",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: []
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: []
          },
          {
            kind: "instructionAccountNode",
            name: "mintAuthority",
            isWritable: false,
            isSigner: true,
            isOptional: false,
            docs: []
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "bytesTypeNode"
            },
            defaultValue: {
              kind: "bytesValueNode",
              data: "d2e11ea258b84d8d",
              encoding: "base16"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "name",
            docs: ["Longer name of the token."],
            type: {
              kind: "sizePrefixTypeNode",
              type: {
                kind: "stringTypeNode",
                encoding: "utf8"
              },
              prefix: {
                kind: "numberTypeNode",
                format: "u32",
                endian: "le"
              }
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "symbol",
            docs: ["Shortened symbol of the token."],
            type: {
              kind: "sizePrefixTypeNode",
              type: {
                kind: "stringTypeNode",
                encoding: "utf8"
              },
              prefix: {
                kind: "numberTypeNode",
                format: "u32",
                endian: "le"
              }
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "uri",
            docs: ["URI pointing to more metadata (image, video, etc.)."],
            type: {
              kind: "sizePrefixTypeNode",
              type: {
                kind: "stringTypeNode",
                encoding: "utf8"
              },
              prefix: {
                kind: "numberTypeNode",
                format: "u32",
                endian: "le"
              }
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "updateTokenMetadataField",
        docs: [
          "Updates a field in a token-metadata account.",
          "",
          "The field can be one of the required fields (name, symbol, URI), or a",
          'totally new field denoted by a "key" string.',
          "",
          "By the end of the instruction, the metadata account must be properly",
          "resized based on the new size of the TLV entry.",
          "  * If the new size is larger, the program must first reallocate to",
          "    avoid",
          "  overwriting other TLV entries.",
          "  * If the new size is smaller, the program must reallocate at the end",
          "  so that it's possible to iterate over TLV entries"
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "metadata",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: []
          },
          {
            kind: "instructionAccountNode",
            name: "updateAuthority",
            isWritable: false,
            isSigner: true,
            isOptional: false,
            docs: []
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "bytesTypeNode"
            },
            defaultValue: {
              kind: "bytesValueNode",
              data: "dde9312db5cadcc8",
              encoding: "base16"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "field",
            docs: ["Field to update in the metadata."],
            type: {
              kind: "definedTypeLinkNode",
              name: "tokenMetadataField"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "value",
            docs: ["Value to write for the field."],
            type: {
              kind: "sizePrefixTypeNode",
              type: {
                kind: "stringTypeNode",
                encoding: "utf8"
              },
              prefix: {
                kind: "numberTypeNode",
                format: "u32",
                endian: "le"
              }
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "removeTokenMetadataKey",
        docs: [
          "Removes a key-value pair in a token-metadata account.",
          "",
          "This only applies to additional fields, and not the base name / symbol /",
          "URI fields.",
          "",
          "By the end of the instruction, the metadata account must be properly",
          "resized at the end based on the new size of the TLV entry."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "metadata",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: []
          },
          {
            kind: "instructionAccountNode",
            name: "updateAuthority",
            isWritable: false,
            isSigner: true,
            isOptional: false,
            docs: []
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "bytesTypeNode"
            },
            defaultValue: {
              kind: "bytesValueNode",
              data: "ea122038598d25b5",
              encoding: "base16"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "idempotent",
            docs: [
              "If the idempotent flag is set to true, then the instruction will not",
              "error if the key does not exist"
            ],
            type: {
              kind: "booleanTypeNode",
              size: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              }
            },
            defaultValue: {
              kind: "booleanValueNode",
              boolean: false
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "key",
            docs: ["Key to remove in the additional metadata portion."],
            type: {
              kind: "sizePrefixTypeNode",
              type: {
                kind: "stringTypeNode",
                encoding: "utf8"
              },
              prefix: {
                kind: "numberTypeNode",
                format: "u32",
                endian: "le"
              }
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "updateTokenMetadataUpdateAuthority",
        docs: ["Updates the token-metadata authority."],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "metadata",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: []
          },
          {
            kind: "instructionAccountNode",
            name: "updateAuthority",
            isWritable: false,
            isSigner: true,
            isOptional: false,
            docs: []
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "bytesTypeNode"
            },
            defaultValue: {
              kind: "bytesValueNode",
              data: "d7e4a6e45464567b",
              encoding: "base16"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "newUpdateAuthority",
            docs: [
              "New authority for the token metadata, or unset if `None`"
            ],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "emitTokenMetadata",
        docs: [
          "Emits the token-metadata as return data",
          "",
          "The format of the data emitted follows exactly the `TokenMetadata`",
          "struct, but it's possible that the account data is stored in another",
          "format by the program.",
          "",
          "With this instruction, a program that implements the token-metadata",
          "interface can return `TokenMetadata` without adhering to the specific",
          "byte layout of the `TokenMetadata` struct in any accounts."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "metadata",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: []
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "bytesTypeNode"
            },
            defaultValue: {
              kind: "bytesValueNode",
              data: "faa6b4fa0d0cb846",
              encoding: "base16"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "start",
            docs: ["Start of range of data to emit"],
            type: {
              kind: "optionTypeNode",
              item: {
                kind: "numberTypeNode",
                format: "u64",
                endian: "le"
              },
              prefix: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              }
            },
            defaultValue: {
              kind: "noneValueNode"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "end",
            docs: ["End of range of data to emit"],
            type: {
              kind: "optionTypeNode",
              item: {
                kind: "numberTypeNode",
                format: "u64",
                endian: "le"
              },
              prefix: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              }
            },
            defaultValue: {
              kind: "noneValueNode"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeTokenGroup",
        docs: [
          "Initialize a new `Group`",
          "",
          "Assumes one has already initialized a mint for the group."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "group",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: []
          },
          {
            kind: "instructionAccountNode",
            name: "mint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: []
          },
          {
            kind: "instructionAccountNode",
            name: "mintAuthority",
            isWritable: false,
            isSigner: true,
            isOptional: false,
            docs: []
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "bytesTypeNode"
            },
            defaultValue: {
              kind: "bytesValueNode",
              data: "79716c2736330004",
              encoding: "base16"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "updateAuthority",
            docs: ["Update authority for the group"],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "maxSize",
            docs: ["The maximum number of group members"],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "updateTokenGroupMaxSize",
        docs: ["Update the max size of a `Group`."],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "group",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: []
          },
          {
            kind: "instructionAccountNode",
            name: "updateAuthority",
            isWritable: false,
            isSigner: true,
            isOptional: false,
            docs: []
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "bytesTypeNode"
            },
            defaultValue: {
              kind: "bytesValueNode",
              data: "6c25ab8ff81e126e",
              encoding: "base16"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "maxSize",
            docs: ["New max size for the group"],
            type: {
              kind: "numberTypeNode",
              format: "u64",
              endian: "le"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "updateTokenGroupUpdateAuthority",
        docs: ["Update the authority of a `Group`."],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "group",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: []
          },
          {
            kind: "instructionAccountNode",
            name: "updateAuthority",
            isWritable: false,
            isSigner: true,
            isOptional: false,
            docs: ["Current update authority"]
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "bytesTypeNode"
            },
            defaultValue: {
              kind: "bytesValueNode",
              data: "a1695801edddd8cb",
              encoding: "base16"
            }
          },
          {
            kind: "instructionArgumentNode",
            name: "newUpdateAuthority",
            docs: ["New authority for the group, or unset if `None`"],
            type: {
              kind: "zeroableOptionTypeNode",
              item: {
                kind: "publicKeyTypeNode"
              }
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      },
      {
        kind: "instructionNode",
        name: "initializeTokenGroupMember",
        docs: [
          "Initialize a new `Member` of a `Group`",
          "",
          "Assumes the `Group` has already been initialized,",
          "as well as the mint for the member."
        ],
        optionalAccountStrategy: "programId",
        accounts: [
          {
            kind: "instructionAccountNode",
            name: "member",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: []
          },
          {
            kind: "instructionAccountNode",
            name: "memberMint",
            isWritable: false,
            isSigner: false,
            isOptional: false,
            docs: []
          },
          {
            kind: "instructionAccountNode",
            name: "memberMintAuthority",
            isWritable: false,
            isSigner: true,
            isOptional: false,
            docs: []
          },
          {
            kind: "instructionAccountNode",
            name: "group",
            isWritable: true,
            isSigner: false,
            isOptional: false,
            docs: []
          },
          {
            kind: "instructionAccountNode",
            name: "groupUpdateAuthority",
            isWritable: false,
            isSigner: true,
            isOptional: false,
            docs: []
          }
        ],
        arguments: [
          {
            kind: "instructionArgumentNode",
            name: "discriminator",
            defaultValueStrategy: "omitted",
            docs: [],
            type: {
              kind: "bytesTypeNode"
            },
            defaultValue: {
              kind: "bytesValueNode",
              data: "9820deb0dfed7486",
              encoding: "base16"
            }
          }
        ],
        discriminators: [
          {
            kind: "fieldDiscriminatorNode",
            name: "discriminator",
            offset: 0
          }
        ]
      }
    ],
    definedTypes: [
      {
        kind: "definedTypeNode",
        name: "accountState",
        docs: [],
        type: {
          kind: "enumTypeNode",
          variants: [
            {
              kind: "enumEmptyVariantTypeNode",
              name: "uninitialized"
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "initialized"
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "frozen"
            }
          ],
          size: {
            kind: "numberTypeNode",
            format: "u8",
            endian: "le"
          }
        }
      },
      {
        kind: "definedTypeNode",
        name: "authorityType",
        docs: [],
        type: {
          kind: "enumTypeNode",
          variants: [
            {
              kind: "enumEmptyVariantTypeNode",
              name: "mintTokens"
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "freezeAccount"
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "accountOwner"
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "closeAccount"
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "transferFeeConfig"
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "withheldWithdraw"
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "closeMint"
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "interestRate"
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "permanentDelegate"
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "confidentialTransferMint"
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "transferHookProgramId"
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "confidentialTransferFeeConfig"
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "metadataPointer"
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "groupPointer"
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "groupMemberPointer"
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "scaledUiAmount"
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "pause"
            }
          ],
          size: {
            kind: "numberTypeNode",
            format: "u8",
            endian: "le"
          }
        }
      },
      {
        kind: "definedTypeNode",
        name: "transferFee",
        docs: [],
        type: {
          kind: "structTypeNode",
          fields: [
            {
              kind: "structFieldTypeNode",
              name: "epoch",
              docs: ["First epoch where the transfer fee takes effect."],
              type: {
                kind: "numberTypeNode",
                format: "u64",
                endian: "le"
              }
            },
            {
              kind: "structFieldTypeNode",
              name: "maximumFee",
              docs: [
                "Maximum fee assessed on transfers, expressed as an amount of tokens."
              ],
              type: {
                kind: "numberTypeNode",
                format: "u64",
                endian: "le"
              }
            },
            {
              kind: "structFieldTypeNode",
              name: "transferFeeBasisPoints",
              docs: [
                "Amount of transfer collected as fees, expressed as basis points of the",
                "transfer amount, ie. increments of 0.01%."
              ],
              type: {
                kind: "amountTypeNode",
                decimals: 2,
                unit: "%",
                number: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            }
          ]
        }
      },
      {
        kind: "definedTypeNode",
        name: "encryptedBalance",
        docs: ["ElGamal ciphertext containing an account balance."],
        type: {
          kind: "fixedSizeTypeNode",
          size: 64,
          type: {
            kind: "bytesTypeNode"
          }
        }
      },
      {
        kind: "definedTypeNode",
        name: "decryptableBalance",
        docs: ["Authenticated encryption containing an account balance."],
        type: {
          kind: "fixedSizeTypeNode",
          size: 36,
          type: {
            kind: "bytesTypeNode"
          }
        }
      },
      {
        kind: "definedTypeNode",
        name: "extension",
        docs: [],
        type: {
          kind: "enumTypeNode",
          variants: [
            {
              kind: "enumEmptyVariantTypeNode",
              name: "uninitialized"
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "transferFeeConfig",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "transferFeeConfigAuthority",
                      docs: ["Optional authority to set the fee."],
                      type: {
                        kind: "publicKeyTypeNode"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "withdrawWithheldAuthority",
                      docs: [
                        "Withdraw from mint instructions must be signed by this key."
                      ],
                      type: {
                        kind: "publicKeyTypeNode"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "withheldAmount",
                      docs: [
                        "Withheld transfer fee tokens that have been moved to the mint for withdrawal."
                      ],
                      type: {
                        kind: "numberTypeNode",
                        format: "u64",
                        endian: "le"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "olderTransferFee",
                      docs: [
                        "Older transfer fee, used if the current epoch < newerTransferFee.epoch."
                      ],
                      type: {
                        kind: "definedTypeLinkNode",
                        name: "transferFee"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "newerTransferFee",
                      docs: [
                        "Newer transfer fee, used if the current epoch >= newerTransferFee.epoch."
                      ],
                      type: {
                        kind: "definedTypeLinkNode",
                        name: "transferFee"
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "transferFeeAmount",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "withheldAmount",
                      docs: [
                        "Withheld transfer fee tokens that can be claimed by the fee authority."
                      ],
                      type: {
                        kind: "numberTypeNode",
                        format: "u64",
                        endian: "le"
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "mintCloseAuthority",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "closeAuthority",
                      docs: [],
                      type: {
                        kind: "publicKeyTypeNode"
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "confidentialTransferMint",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "authority",
                      docs: [
                        "Authority to modify the `ConfidentialTransferMint` configuration and to",
                        "approve new accounts (if `auto_approve_new_accounts` is true).",
                        "",
                        "The legacy Token Multisig account is not supported as the authority."
                      ],
                      type: {
                        kind: "zeroableOptionTypeNode",
                        item: {
                          kind: "publicKeyTypeNode"
                        }
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "autoApproveNewAccounts",
                      docs: [
                        "Indicate if newly configured accounts must be approved by the",
                        "`authority` before they may be used by the user.",
                        "",
                        "* If `true`, no approval is required and new accounts may be used immediately.",
                        "* If `false`, the authority must approve newly configured accounts (see",
                        "  `ConfidentialTransferInstruction::ConfigureAccount`)."
                      ],
                      type: {
                        kind: "booleanTypeNode",
                        size: {
                          kind: "numberTypeNode",
                          format: "u8",
                          endian: "le"
                        }
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "auditorElgamalPubkey",
                      docs: [
                        "Authority to decode any transfer amount in a confidential transfer."
                      ],
                      type: {
                        kind: "zeroableOptionTypeNode",
                        item: {
                          kind: "publicKeyTypeNode"
                        }
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "confidentialTransferAccount",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "approved",
                      docs: [
                        "`true` if this account has been approved for use. All confidential",
                        "transfer operations for the account will fail until approval is granted."
                      ],
                      type: {
                        kind: "booleanTypeNode",
                        size: {
                          kind: "numberTypeNode",
                          format: "u8",
                          endian: "le"
                        }
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "elgamalPubkey",
                      docs: [
                        "The public key associated with ElGamal encryption."
                      ],
                      type: {
                        kind: "publicKeyTypeNode"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "pendingBalanceLow",
                      docs: [
                        "The low 16 bits of the pending balance (encrypted by `elgamal_pubkey`)."
                      ],
                      type: {
                        kind: "definedTypeLinkNode",
                        name: "encryptedBalance"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "pendingBalanceHigh",
                      docs: [
                        "The high 32 bits of the pending balance (encrypted by `elgamal_pubkey`)."
                      ],
                      type: {
                        kind: "definedTypeLinkNode",
                        name: "encryptedBalance"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "availableBalance",
                      docs: [
                        "The available balance (encrypted by `encrypiton_pubkey`)."
                      ],
                      type: {
                        kind: "definedTypeLinkNode",
                        name: "encryptedBalance"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "decryptableAvailableBalance",
                      docs: ["The decryptable available balance."],
                      type: {
                        kind: "definedTypeLinkNode",
                        name: "decryptableBalance"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "allowConfidentialCredits",
                      docs: [
                        "If `false`, the extended account rejects any incoming confidential transfers."
                      ],
                      type: {
                        kind: "booleanTypeNode",
                        size: {
                          kind: "numberTypeNode",
                          format: "u8",
                          endian: "le"
                        }
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "allowNonConfidentialCredits",
                      docs: [
                        "If `false`, the base account rejects any incoming transfers."
                      ],
                      type: {
                        kind: "booleanTypeNode",
                        size: {
                          kind: "numberTypeNode",
                          format: "u8",
                          endian: "le"
                        }
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "pendingBalanceCreditCounter",
                      docs: [
                        "The total number of `Deposit` and `Transfer` instructions that have credited `pending_balance`."
                      ],
                      type: {
                        kind: "numberTypeNode",
                        format: "u64",
                        endian: "le"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "maximumPendingBalanceCreditCounter",
                      docs: [
                        "The maximum number of `Deposit` and `Transfer` instructions that can",
                        "credit `pending_balance` before the `ApplyPendingBalance`",
                        "instruction is executed."
                      ],
                      type: {
                        kind: "numberTypeNode",
                        format: "u64",
                        endian: "le"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "expectedPendingBalanceCreditCounter",
                      docs: [
                        "The `expected_pending_balance_credit_counter` value that was included in",
                        "the last `ApplyPendingBalance` instruction."
                      ],
                      type: {
                        kind: "numberTypeNode",
                        format: "u64",
                        endian: "le"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "actualPendingBalanceCreditCounter",
                      docs: [
                        "The actual `pending_balance_credit_counter` when the last",
                        "`ApplyPendingBalance` instruction was executed."
                      ],
                      type: {
                        kind: "numberTypeNode",
                        format: "u64",
                        endian: "le"
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "defaultAccountState",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "state",
                      docs: [],
                      type: {
                        kind: "definedTypeLinkNode",
                        name: "accountState"
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "immutableOwner",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: []
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "memoTransfer",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "requireIncomingTransferMemos",
                      docs: [
                        "Require transfers into this account to be accompanied by a memo."
                      ],
                      type: {
                        kind: "booleanTypeNode",
                        size: {
                          kind: "numberTypeNode",
                          format: "u8",
                          endian: "le"
                        }
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "nonTransferable",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: []
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "interestBearingConfig",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "rateAuthority",
                      docs: [],
                      type: {
                        kind: "publicKeyTypeNode"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "initializationTimestamp",
                      docs: [],
                      type: {
                        kind: "numberTypeNode",
                        format: "u64",
                        endian: "le"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "preUpdateAverageRate",
                      docs: [],
                      type: {
                        kind: "numberTypeNode",
                        format: "i16",
                        endian: "le"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "lastUpdateTimestamp",
                      docs: [],
                      type: {
                        kind: "numberTypeNode",
                        format: "u64",
                        endian: "le"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "currentRate",
                      docs: [],
                      type: {
                        kind: "numberTypeNode",
                        format: "i16",
                        endian: "le"
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "cpiGuard",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "lockCpi",
                      docs: [
                        "Lock certain token operations from taking place within CPI for this account."
                      ],
                      type: {
                        kind: "booleanTypeNode",
                        size: {
                          kind: "numberTypeNode",
                          format: "u8",
                          endian: "le"
                        }
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "permanentDelegate",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "delegate",
                      docs: [],
                      type: {
                        kind: "publicKeyTypeNode"
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "nonTransferableAccount",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: []
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "transferHook",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "authority",
                      docs: ["The transfer hook update authority."],
                      type: {
                        kind: "publicKeyTypeNode"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "programId",
                      docs: ["The transfer hook program account."],
                      type: {
                        kind: "publicKeyTypeNode"
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "transferHookAccount",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "transferring",
                      docs: [
                        "Whether or not this account is currently transferring tokens",
                        "True during the transfer hook cpi, otherwise false."
                      ],
                      type: {
                        kind: "booleanTypeNode",
                        size: {
                          kind: "numberTypeNode",
                          format: "u8",
                          endian: "le"
                        }
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "confidentialTransferFee",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "authority",
                      docs: [
                        "Optional authority to set the withdraw withheld authority ElGamal key."
                      ],
                      type: {
                        kind: "zeroableOptionTypeNode",
                        item: {
                          kind: "publicKeyTypeNode"
                        }
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "elgamalPubkey",
                      docs: [
                        "Withheld fees from accounts must be encrypted with this ElGamal key.",
                        "",
                        "Note that whoever holds the ElGamal private key for this ElGamal public",
                        "key has the ability to decode any withheld fee amount that are",
                        "associated with accounts. When combined with the fee parameters, the",
                        "withheld fee amounts can reveal information about transfer amounts."
                      ],
                      type: {
                        kind: "publicKeyTypeNode"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "harvestToMintEnabled",
                      docs: [
                        "If `false`, the harvest of withheld tokens to mint is rejected."
                      ],
                      type: {
                        kind: "booleanTypeNode",
                        size: {
                          kind: "numberTypeNode",
                          format: "u8",
                          endian: "le"
                        }
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "withheldAmount",
                      docs: [
                        "Withheld confidential transfer fee tokens that have been moved to the",
                        "mint for withdrawal."
                      ],
                      type: {
                        kind: "definedTypeLinkNode",
                        name: "encryptedBalance"
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "confidentialTransferFeeAmount",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "withheldAmount",
                      docs: [
                        "Amount withheld during confidential transfers, to be harvest to the mint."
                      ],
                      type: {
                        kind: "definedTypeLinkNode",
                        name: "encryptedBalance"
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "metadataPointer",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "authority",
                      docs: [
                        "Optional authority that can set the metadata address."
                      ],
                      type: {
                        kind: "zeroableOptionTypeNode",
                        item: {
                          kind: "publicKeyTypeNode"
                        }
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "metadataAddress",
                      docs: [
                        "Optional Account Address that holds the metadata."
                      ],
                      type: {
                        kind: "zeroableOptionTypeNode",
                        item: {
                          kind: "publicKeyTypeNode"
                        }
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "tokenMetadata",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "updateAuthority",
                      docs: [
                        "The authority that can sign to update the metadata."
                      ],
                      type: {
                        kind: "zeroableOptionTypeNode",
                        item: {
                          kind: "publicKeyTypeNode"
                        }
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "mint",
                      docs: [
                        "The associated mint, used to counter spoofing to be sure that metadata belongs to a particular mint."
                      ],
                      type: {
                        kind: "publicKeyTypeNode"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "name",
                      docs: ["The longer name of the token."],
                      type: {
                        kind: "sizePrefixTypeNode",
                        type: {
                          kind: "stringTypeNode",
                          encoding: "utf8"
                        },
                        prefix: {
                          kind: "numberTypeNode",
                          format: "u32",
                          endian: "le"
                        }
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "symbol",
                      docs: ["The shortened symbol for the token."],
                      type: {
                        kind: "sizePrefixTypeNode",
                        type: {
                          kind: "stringTypeNode",
                          encoding: "utf8"
                        },
                        prefix: {
                          kind: "numberTypeNode",
                          format: "u32",
                          endian: "le"
                        }
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "uri",
                      docs: ["The URI pointing to richer metadata."],
                      type: {
                        kind: "sizePrefixTypeNode",
                        type: {
                          kind: "stringTypeNode",
                          encoding: "utf8"
                        },
                        prefix: {
                          kind: "numberTypeNode",
                          format: "u32",
                          endian: "le"
                        }
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "additionalMetadata",
                      docs: [
                        "Any additional metadata about the token as key-value pairs."
                      ],
                      type: {
                        kind: "mapTypeNode",
                        key: {
                          kind: "sizePrefixTypeNode",
                          type: {
                            kind: "stringTypeNode",
                            encoding: "utf8"
                          },
                          prefix: {
                            kind: "numberTypeNode",
                            format: "u32",
                            endian: "le"
                          }
                        },
                        value: {
                          kind: "sizePrefixTypeNode",
                          type: {
                            kind: "stringTypeNode",
                            encoding: "utf8"
                          },
                          prefix: {
                            kind: "numberTypeNode",
                            format: "u32",
                            endian: "le"
                          }
                        },
                        count: {
                          kind: "prefixedCountNode",
                          prefix: {
                            kind: "numberTypeNode",
                            format: "u32",
                            endian: "le"
                          }
                        }
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "groupPointer",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "authority",
                      docs: [
                        "Optional authority that can set the group address."
                      ],
                      type: {
                        kind: "zeroableOptionTypeNode",
                        item: {
                          kind: "publicKeyTypeNode"
                        }
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "groupAddress",
                      docs: [
                        "Optional account address that holds the group."
                      ],
                      type: {
                        kind: "zeroableOptionTypeNode",
                        item: {
                          kind: "publicKeyTypeNode"
                        }
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "tokenGroup",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "updateAuthority",
                      docs: [
                        "The authority that can sign to update the group."
                      ],
                      type: {
                        kind: "zeroableOptionTypeNode",
                        item: {
                          kind: "publicKeyTypeNode"
                        }
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "mint",
                      docs: [
                        "The associated mint, used to counter spoofing to be sure that group belongs to a particular mint."
                      ],
                      type: {
                        kind: "publicKeyTypeNode"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "size",
                      docs: ["The current number of group members."],
                      type: {
                        kind: "numberTypeNode",
                        format: "u64",
                        endian: "le"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "maxSize",
                      docs: ["The maximum number of group members."],
                      type: {
                        kind: "numberTypeNode",
                        format: "u64",
                        endian: "le"
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "groupMemberPointer",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "authority",
                      docs: [
                        "Optional authority that can set the member address."
                      ],
                      type: {
                        kind: "zeroableOptionTypeNode",
                        item: {
                          kind: "publicKeyTypeNode"
                        }
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "memberAddress",
                      docs: [
                        "Optional account address that holds the member."
                      ],
                      type: {
                        kind: "zeroableOptionTypeNode",
                        item: {
                          kind: "publicKeyTypeNode"
                        }
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "tokenGroupMember",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "mint",
                      docs: [
                        "The associated mint, used to counter spoofing to be sure that member belongs to a particular mint."
                      ],
                      type: {
                        kind: "publicKeyTypeNode"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "group",
                      docs: ["The pubkey of the `TokenGroup`."],
                      type: {
                        kind: "publicKeyTypeNode"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "memberNumber",
                      docs: ["The member number."],
                      type: {
                        kind: "numberTypeNode",
                        format: "u64",
                        endian: "le"
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "confidentialMintBurn"
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "scaledUiAmountConfig",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "authority",
                      docs: [],
                      type: {
                        kind: "publicKeyTypeNode"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "multiplier",
                      docs: [],
                      type: {
                        kind: "numberTypeNode",
                        format: "f64",
                        endian: "le"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "newMultiplierEffectiveTimestamp",
                      docs: [],
                      type: {
                        kind: "numberTypeNode",
                        format: "u64",
                        endian: "le"
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "newMultiplier",
                      docs: [],
                      type: {
                        kind: "numberTypeNode",
                        format: "f64",
                        endian: "le"
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumStructVariantTypeNode",
              name: "pausableConfig",
              struct: {
                kind: "sizePrefixTypeNode",
                type: {
                  kind: "structTypeNode",
                  fields: [
                    {
                      kind: "structFieldTypeNode",
                      name: "authority",
                      docs: [],
                      type: {
                        kind: "zeroableOptionTypeNode",
                        item: {
                          kind: "publicKeyTypeNode"
                        }
                      }
                    },
                    {
                      kind: "structFieldTypeNode",
                      name: "paused",
                      docs: [],
                      type: {
                        kind: "booleanTypeNode",
                        size: {
                          kind: "numberTypeNode",
                          format: "u8",
                          endian: "le"
                        }
                      }
                    }
                  ]
                },
                prefix: {
                  kind: "numberTypeNode",
                  format: "u16",
                  endian: "le"
                }
              }
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "pausableAccount"
            }
          ],
          size: {
            kind: "numberTypeNode",
            format: "u16",
            endian: "le"
          }
        }
      },
      {
        kind: "definedTypeNode",
        name: "extensionType",
        docs: [
          "Extensions that can be applied to mints or accounts.  Mint extensions must",
          "only be applied to mint accounts, and account extensions must only be",
          "applied to token holding accounts."
        ],
        type: {
          kind: "enumTypeNode",
          variants: [
            {
              kind: "enumEmptyVariantTypeNode",
              name: "uninitialized",
              docs: [
                "Used as padding if the account size would otherwise be 355, same as a multisig"
              ]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "transferFeeConfig",
              docs: [
                "Includes transfer fee rate info and accompanying authorities to withdraw",
                "and set the fee"
              ]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "transferFeeAmount",
              docs: ["Includes withheld transfer fees"]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "mintCloseAuthority",
              docs: ["Includes an optional mint close authority"]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "confidentialTransferMint",
              docs: ["Auditor configuration for confidential transfers"]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "confidentialTransferAccount",
              docs: ["State for confidential transfers"]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "defaultAccountState",
              docs: ["Specifies the default Account::state for new Accounts"]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "immutableOwner",
              docs: [
                "Indicates that the Account owner authority cannot be changed"
              ]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "memoTransfer",
              docs: ["Require inbound transfers to have memo"]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "nonTransferable",
              docs: [
                "Indicates that the tokens from this mint can't be transferred"
              ]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "interestBearingConfig",
              docs: ["Tokens accrue interest over time,"]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "cpiGuard",
              docs: [
                "Locks privileged token operations from happening via CPI"
              ]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "permanentDelegate",
              docs: ["Includes an optional permanent delegate"]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "nonTransferableAccount",
              docs: [
                "Indicates that the tokens in this account belong to a non-transferable",
                "mint"
              ]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "transferHook",
              docs: [
                'Mint requires a CPI to a program implementing the "transfer hook"',
                "interface"
              ]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "transferHookAccount",
              docs: [
                "Indicates that the tokens in this account belong to a mint with a",
                "transfer hook"
              ]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "confidentialTransferFee",
              docs: [
                "Includes encrypted withheld fees and the encryption public that they are",
                "encrypted under"
              ]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "confidentialTransferFeeAmount",
              docs: ["Includes confidential withheld transfer fees"]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "scaledUiAmountConfig",
              docs: ["Tokens have a scaled UI amount"]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "pausableConfig",
              docs: ["Mint contains pausable configuration"]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "pausableAccount",
              docs: ["Account contains pausable configuration"]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "metadataPointer",
              docs: [
                "Mint contains a pointer to another account (or the same account) that",
                "holds metadata"
              ]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "tokenMetadata",
              docs: ["Mint contains token-metadata"]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "groupPointer",
              docs: [
                "Mint contains a pointer to another account (or the same account) that",
                "holds group configurations"
              ]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "tokenGroup",
              docs: ["Mint contains token group configurations"]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "groupMemberPointer",
              docs: [
                "Mint contains a pointer to another account (or the same account) that",
                "holds group member configurations"
              ]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "tokenGroupMember",
              docs: ["Mint contains token group member configurations"]
            }
          ],
          size: {
            kind: "numberTypeNode",
            format: "u16",
            endian: "le"
          }
        }
      },
      {
        kind: "definedTypeNode",
        name: "tokenMetadataField",
        docs: ["Fields in the metadata account, used for updating."],
        type: {
          kind: "enumTypeNode",
          variants: [
            {
              kind: "enumEmptyVariantTypeNode",
              name: "name",
              docs: ["The name field, corresponding to `TokenMetadata.name`"]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "symbol",
              docs: [
                "The symbol field, corresponding to `TokenMetadata.symbol`"
              ]
            },
            {
              kind: "enumEmptyVariantTypeNode",
              name: "uri",
              docs: ["The uri field, corresponding to `TokenMetadata.uri`"]
            },
            {
              kind: "enumTupleVariantTypeNode",
              name: "key",
              docs: [
                "A user field, whose key is given by the associated string"
              ],
              tuple: {
                kind: "tupleTypeNode",
                items: [
                  {
                    kind: "sizePrefixTypeNode",
                    type: {
                      kind: "stringTypeNode",
                      encoding: "utf8"
                    },
                    prefix: {
                      kind: "numberTypeNode",
                      format: "u32",
                      endian: "le"
                    }
                  }
                ]
              }
            }
          ],
          size: {
            kind: "numberTypeNode",
            format: "u8",
            endian: "le"
          }
        }
      }
    ],
    pdas: [],
    errors: [
      {
        kind: "errorNode",
        name: "notRentExempt",
        code: 0,
        message: "Lamport balance below rent-exempt threshold",
        docs: ["NotRentExempt: Lamport balance below rent-exempt threshold"]
      },
      {
        kind: "errorNode",
        name: "insufficientFunds",
        code: 1,
        message: "Insufficient funds",
        docs: ["InsufficientFunds: Insufficient funds"]
      },
      {
        kind: "errorNode",
        name: "invalidMint",
        code: 2,
        message: "Invalid Mint",
        docs: ["InvalidMint: Invalid Mint"]
      },
      {
        kind: "errorNode",
        name: "mintMismatch",
        code: 3,
        message: "Account not associated with this Mint",
        docs: ["MintMismatch: Account not associated with this Mint"]
      },
      {
        kind: "errorNode",
        name: "ownerMismatch",
        code: 4,
        message: "Owner does not match",
        docs: ["OwnerMismatch: Owner does not match"]
      },
      {
        kind: "errorNode",
        name: "fixedSupply",
        code: 5,
        message: "Fixed supply",
        docs: ["FixedSupply: Fixed supply"]
      },
      {
        kind: "errorNode",
        name: "alreadyInUse",
        code: 6,
        message: "Already in use",
        docs: ["AlreadyInUse: Already in use"]
      },
      {
        kind: "errorNode",
        name: "invalidNumberOfProvidedSigners",
        code: 7,
        message: "Invalid number of provided signers",
        docs: [
          "InvalidNumberOfProvidedSigners: Invalid number of provided signers"
        ]
      },
      {
        kind: "errorNode",
        name: "invalidNumberOfRequiredSigners",
        code: 8,
        message: "Invalid number of required signers",
        docs: [
          "InvalidNumberOfRequiredSigners: Invalid number of required signers"
        ]
      },
      {
        kind: "errorNode",
        name: "uninitializedState",
        code: 9,
        message: "State is unititialized",
        docs: ["UninitializedState: State is unititialized"]
      },
      {
        kind: "errorNode",
        name: "nativeNotSupported",
        code: 10,
        message: "Instruction does not support native tokens",
        docs: [
          "NativeNotSupported: Instruction does not support native tokens"
        ]
      },
      {
        kind: "errorNode",
        name: "nonNativeHasBalance",
        code: 11,
        message: "Non-native account can only be closed if its balance is zero",
        docs: [
          "NonNativeHasBalance: Non-native account can only be closed if its balance is zero"
        ]
      },
      {
        kind: "errorNode",
        name: "invalidInstruction",
        code: 12,
        message: "Invalid instruction",
        docs: ["InvalidInstruction: Invalid instruction"]
      },
      {
        kind: "errorNode",
        name: "invalidState",
        code: 13,
        message: "State is invalid for requested operation",
        docs: ["InvalidState: State is invalid for requested operation"]
      },
      {
        kind: "errorNode",
        name: "overflow",
        code: 14,
        message: "Operation overflowed",
        docs: ["Overflow: Operation overflowed"]
      },
      {
        kind: "errorNode",
        name: "authorityTypeNotSupported",
        code: 15,
        message: "Account does not support specified authority type",
        docs: [
          "AuthorityTypeNotSupported: Account does not support specified authority type"
        ]
      },
      {
        kind: "errorNode",
        name: "mintCannotFreeze",
        code: 16,
        message: "This token mint cannot freeze accounts",
        docs: ["MintCannotFreeze: This token mint cannot freeze accounts"]
      },
      {
        kind: "errorNode",
        name: "accountFrozen",
        code: 17,
        message: "Account is frozen",
        docs: ["AccountFrozen: Account is frozen"]
      },
      {
        kind: "errorNode",
        name: "mintDecimalsMismatch",
        code: 18,
        message: "The provided decimals value different from the Mint decimals",
        docs: [
          "MintDecimalsMismatch: The provided decimals value different from the Mint decimals"
        ]
      },
      {
        kind: "errorNode",
        name: "nonNativeNotSupported",
        code: 19,
        message: "Instruction does not support non-native tokens",
        docs: [
          "NonNativeNotSupported: Instruction does not support non-native tokens"
        ]
      }
    ]
  },
  additionalPrograms: [
    {
      kind: "programNode",
      name: "associatedToken",
      publicKey: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
      version: "1.1.1",
      origin: "shank",
      docs: [],
      accounts: [],
      instructions: [
        {
          kind: "instructionNode",
          accounts: [
            {
              kind: "instructionAccountNode",
              name: "payer",
              isWritable: true,
              isSigner: true,
              isOptional: false,
              docs: ["Funding account (must be a system account)."],
              defaultValue: { kind: "payerValueNode" }
            },
            {
              kind: "instructionAccountNode",
              name: "ata",
              isWritable: true,
              isSigner: false,
              isOptional: false,
              docs: ["Associated token account address to be created."],
              defaultValue: {
                kind: "pdaValueNode",
                pda: {
                  kind: "pdaLinkNode",
                  name: "associatedToken"
                },
                seeds: [
                  {
                    kind: "pdaSeedValueNode",
                    name: "owner",
                    value: {
                      kind: "accountValueNode",
                      name: "owner"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "tokenProgram",
                    value: {
                      kind: "accountValueNode",
                      name: "tokenProgram"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "mint",
                    value: {
                      kind: "accountValueNode",
                      name: "mint"
                    }
                  }
                ]
              }
            },
            {
              kind: "instructionAccountNode",
              name: "owner",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["Wallet address for the new associated token account."]
            },
            {
              kind: "instructionAccountNode",
              name: "mint",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["The token mint for the new associated token account."]
            },
            {
              kind: "instructionAccountNode",
              name: "systemProgram",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["System program."],
              defaultValue: {
                kind: "publicKeyValueNode",
                publicKey: "11111111111111111111111111111111"
              }
            },
            {
              kind: "instructionAccountNode",
              name: "tokenProgram",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["SPL Token program."],
              defaultValue: {
                kind: "publicKeyValueNode",
                publicKey: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
              }
            }
          ],
          arguments: [
            {
              kind: "instructionArgumentNode",
              name: "discriminator",
              type: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              },
              docs: [],
              defaultValue: { kind: "numberValueNode", number: 0 },
              defaultValueStrategy: "omitted"
            }
          ],
          discriminators: [
            {
              kind: "fieldDiscriminatorNode",
              name: "discriminator",
              offset: 0
            }
          ],
          name: "createAssociatedToken",
          docs: [
            "Creates an associated token account for the given wallet address and",
            "token mint Returns an error if the account exists."
          ],
          optionalAccountStrategy: "programId"
        },
        {
          kind: "instructionNode",
          accounts: [
            {
              kind: "instructionAccountNode",
              name: "payer",
              isWritable: true,
              isSigner: true,
              isOptional: false,
              docs: ["Funding account (must be a system account)."],
              defaultValue: { kind: "payerValueNode" }
            },
            {
              kind: "instructionAccountNode",
              name: "ata",
              isWritable: true,
              isSigner: false,
              isOptional: false,
              docs: ["Associated token account address to be created."],
              defaultValue: {
                kind: "pdaValueNode",
                pda: {
                  kind: "pdaLinkNode",
                  name: "associatedToken"
                },
                seeds: [
                  {
                    kind: "pdaSeedValueNode",
                    name: "owner",
                    value: {
                      kind: "accountValueNode",
                      name: "owner"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "tokenProgram",
                    value: {
                      kind: "accountValueNode",
                      name: "tokenProgram"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "mint",
                    value: {
                      kind: "accountValueNode",
                      name: "mint"
                    }
                  }
                ]
              }
            },
            {
              kind: "instructionAccountNode",
              name: "owner",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["Wallet address for the new associated token account."]
            },
            {
              kind: "instructionAccountNode",
              name: "mint",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["The token mint for the new associated token account."]
            },
            {
              kind: "instructionAccountNode",
              name: "systemProgram",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["System program."],
              defaultValue: {
                kind: "publicKeyValueNode",
                publicKey: "11111111111111111111111111111111"
              }
            },
            {
              kind: "instructionAccountNode",
              name: "tokenProgram",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["SPL Token program."],
              defaultValue: {
                kind: "publicKeyValueNode",
                publicKey: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
              }
            }
          ],
          arguments: [
            {
              kind: "instructionArgumentNode",
              name: "discriminator",
              type: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              },
              docs: [],
              defaultValue: { kind: "numberValueNode", number: 1 },
              defaultValueStrategy: "omitted"
            }
          ],
          discriminators: [
            {
              kind: "fieldDiscriminatorNode",
              name: "discriminator",
              offset: 0
            }
          ],
          name: "createAssociatedTokenIdempotent",
          docs: [
            "Creates an associated token account for the given wallet address and",
            "token mint, if it doesn't already exist. Returns an error if the",
            "account exists, but with a different owner."
          ],
          optionalAccountStrategy: "programId"
        },
        {
          kind: "instructionNode",
          accounts: [
            {
              kind: "instructionAccountNode",
              name: "nestedAssociatedAccountAddress",
              isWritable: true,
              isSigner: false,
              isOptional: false,
              docs: [
                "Nested associated token account, must be owned by `ownerAssociatedAccountAddress`."
              ],
              defaultValue: {
                kind: "pdaValueNode",
                pda: {
                  kind: "pdaLinkNode",
                  name: "associatedToken"
                },
                seeds: [
                  {
                    kind: "pdaSeedValueNode",
                    name: "owner",
                    value: {
                      kind: "accountValueNode",
                      name: "ownerAssociatedAccountAddress"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "tokenProgram",
                    value: {
                      kind: "accountValueNode",
                      name: "tokenProgram"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "mint",
                    value: {
                      kind: "accountValueNode",
                      name: "nestedTokenMintAddress"
                    }
                  }
                ]
              }
            },
            {
              kind: "instructionAccountNode",
              name: "nestedTokenMintAddress",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["Token mint for the nested associated token account."]
            },
            {
              kind: "instructionAccountNode",
              name: "destinationAssociatedAccountAddress",
              isWritable: true,
              isSigner: false,
              isOptional: false,
              docs: ["Wallet's associated token account."],
              defaultValue: {
                kind: "pdaValueNode",
                pda: {
                  kind: "pdaLinkNode",
                  name: "associatedToken"
                },
                seeds: [
                  {
                    kind: "pdaSeedValueNode",
                    name: "owner",
                    value: {
                      kind: "accountValueNode",
                      name: "walletAddress"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "tokenProgram",
                    value: {
                      kind: "accountValueNode",
                      name: "tokenProgram"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "mint",
                    value: {
                      kind: "accountValueNode",
                      name: "nestedTokenMintAddress"
                    }
                  }
                ]
              }
            },
            {
              kind: "instructionAccountNode",
              name: "ownerAssociatedAccountAddress",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: [
                "Owner associated token account address, must be owned by `walletAddress`."
              ],
              defaultValue: {
                kind: "pdaValueNode",
                pda: {
                  kind: "pdaLinkNode",
                  name: "associatedToken"
                },
                seeds: [
                  {
                    kind: "pdaSeedValueNode",
                    name: "owner",
                    value: {
                      kind: "accountValueNode",
                      name: "walletAddress"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "tokenProgram",
                    value: {
                      kind: "accountValueNode",
                      name: "tokenProgram"
                    }
                  },
                  {
                    kind: "pdaSeedValueNode",
                    name: "mint",
                    value: {
                      kind: "accountValueNode",
                      name: "ownerTokenMintAddress"
                    }
                  }
                ]
              }
            },
            {
              kind: "instructionAccountNode",
              name: "ownerTokenMintAddress",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["Token mint for the owner associated token account."]
            },
            {
              kind: "instructionAccountNode",
              name: "walletAddress",
              isWritable: true,
              isSigner: true,
              isOptional: false,
              docs: ["Wallet address for the owner associated token account."]
            },
            {
              kind: "instructionAccountNode",
              name: "tokenProgram",
              isWritable: false,
              isSigner: false,
              isOptional: false,
              docs: ["SPL Token program."],
              defaultValue: {
                kind: "publicKeyValueNode",
                publicKey: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
              }
            }
          ],
          arguments: [
            {
              kind: "instructionArgumentNode",
              name: "discriminator",
              type: {
                kind: "numberTypeNode",
                format: "u8",
                endian: "le"
              },
              docs: [],
              defaultValue: { kind: "numberValueNode", number: 2 },
              defaultValueStrategy: "omitted"
            }
          ],
          discriminators: [
            {
              kind: "fieldDiscriminatorNode",
              name: "discriminator",
              offset: 0
            }
          ],
          name: "recoverNestedAssociatedToken",
          docs: [
            "Transfers from and closes a nested associated token account: an",
            "associated token account owned by an associated token account.",
            "",
            "The tokens are moved from the nested associated token account to the",
            "wallet's associated token account, and the nested account lamports are",
            "moved to the wallet.",
            "",
            "Note: Nested token accounts are an anti-pattern, and almost always",
            "created unintentionally, so this instruction should only be used to",
            "recover from errors."
          ],
          optionalAccountStrategy: "programId"
        }
      ],
      definedTypes: [],
      pdas: [
        {
          kind: "pdaNode",
          name: "associatedToken",
          docs: [],
          seeds: [
            {
              kind: "variablePdaSeedNode",
              name: "owner",
              docs: ["The wallet address of the associated token account."],
              type: {
                kind: "publicKeyTypeNode"
              }
            },
            {
              kind: "variablePdaSeedNode",
              name: "tokenProgram",
              docs: ["The address of the token program to use."],
              type: {
                kind: "publicKeyTypeNode"
              }
            },
            {
              kind: "variablePdaSeedNode",
              name: "mint",
              docs: ["The mint address of the associated token account."],
              type: {
                kind: "publicKeyTypeNode"
              }
            }
          ]
        }
      ],
      errors: [
        {
          kind: "errorNode",
          name: "invalidOwner",
          code: 0,
          message: "Associated token account owner does not match address derivation",
          docs: [
            "InvalidOwner: Associated token account owner does not match address derivation"
          ]
        }
      ]
    }
  ]
};

// src/generated/protocols.ts
var IDL_MAP = {
  "jupiter": jupiter_default,
  "orca-whirlpools": orca_whirlpools_default,
  "raydium-amm": raydium_amm_default,
  "raydium-amm-v3": raydium_amm_v3_default,
  "raydium-cp-swap": raydium_cp_swap_default,
  "ton-whales-holders": ton_whales_holders_default,
  "magic-eden-v2": magic_eden_v2_default,
  "tensor": tensor_default,
  "metaplex-auction-house": metaplex_auction_house_default,
  "spl-token": spl_token_default,
  "token-2022": token_2022_default
};
function registerProtocol(config) {
  if (config.fetchSource === "manual") {
    if (config.idlFileName === "anchor") {
      const protocol2 = new Protocol({
        name: config.displayName,
        programId: config.programId,
        version: config.version,
        errors: ANCHOR_ERRORS,
        lastVerified: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      });
      registry.registerFramework(protocol2);
    }
    return;
  }
  const idl = IDL_MAP[config.idlFileName];
  if (!idl) {
    throw new Error(`No IDL found for ${config.idlFileName}`);
  }
  const errors = buildProtocolErrors(idl);
  let idlSource;
  if (config.fetchSource === "github") {
    if (!config.githubUrl) {
      throw new Error(`GitHub URL required for ${config.idlFileName}`);
    }
    idlSource = {
      type: "github",
      url: config.githubUrl,
      commit: "latest"
    };
  } else if (config.fetchSource === "anchor") {
    idlSource = {
      type: "on-chain",
      fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  const protocol = new Protocol({
    name: config.displayName,
    programId: config.programId,
    version: config.version,
    errors,
    idlSource,
    lastVerified: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  });
  registry.register(protocol);
}
for (const config of PROTOCOLS) {
  registerProtocol(config);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Protocol,
  registry
});
