/**
 * Protocol Configuration - Single Source of Truth
 *
 * This file defines all supported protocols for the error database.
 * When you add a new protocol here, run `pnpm generate` to:
 * 1. Fetch the IDL (from GitHub or on-chain via Anchor CLI)
 * 2. Auto-generate protocol registration code
 *
 * That's it! No other files need to be edited.
 */

export type FetchSource = "anchor" | "github" | "manual";

export type ProtocolType = "program" | "framework" | "token-program";

export type ProtocolConfig = {
  /**
   * IDL filename (without .json extension)
   * Used to determine idl/{idlFileName}.json path
   */
  readonly idlFileName: string;

  /**
   * On-chain program address (base58)
   * Use "*" for framework errors that apply to any program
   */
  readonly programId: string;

  /**
   * Protocol type for error source tracking
   * - "program": Program-specific errors (Jupiter, Orca, etc.)
   * - "framework": Framework errors (Anchor) that apply to multiple programs
   * - "token-program": Token program errors (SPL Token, Token-2022)
   */
  readonly type?: ProtocolType;

  /**
   * How to fetch the IDL
   * - "anchor": Fetch from on-chain using anchor CLI
   * - "github": Fetch from GitHub raw URL
   * - "manual": Manually defined errors (no IDL file)
   */
  readonly fetchSource: FetchSource;

  /**
   * GitHub raw URL (required if fetchSource is "github")
   */
  readonly githubUrl?: string;

  /**
   * Human-readable protocol name
   */
  readonly displayName: string;

  /**
   * Protocol version
   */
  readonly version: string;

  /**
   * Additional notes (optional)
   */
  readonly notes?: string;
};

/**
 * All supported protocols
 *
 * Order doesn't matter - registry handles lookups by program ID
 */
export const PROTOCOLS: readonly ProtocolConfig[] = [
  // ============================================================================
  // Jupiter Aggregator
  // ============================================================================
  {
    idlFileName: "jupiter",
    programId: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    fetchSource: "github",
    githubUrl:
      "https://raw.githubusercontent.com/jup-ag/jupiter-cpi-swap-example/b0c59b7ac537c47e9502391d83f8926ffffa412e/cpi-swap-program/idls/jupiter_aggregator.json",
    displayName: "Jupiter Aggregator v6",
    version: "0.1.0",
  },

  // ============================================================================
  // Orca Whirlpools
  // ============================================================================
  {
    idlFileName: "orca-whirlpools",
    programId: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    fetchSource: "anchor",
    displayName: "Orca Whirlpools",
    version: "1.0.0",
  },

  // ============================================================================
  // Raydium DEX Protocols
  // ============================================================================
  {
    idlFileName: "raydium-amm",
    programId: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    fetchSource: "github",
    githubUrl:
      "https://raw.githubusercontent.com/raydium-io/raydium-idl/refs/heads/master/raydium_amm/idl.json",
    displayName: "Raydium AMM V4",
    version: "0.1.0",
    notes: "Traditional constant product AMM",
  },
  {
    idlFileName: "raydium-amm-v3",
    programId: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
    fetchSource: "github",
    githubUrl:
      "https://raw.githubusercontent.com/raydium-io/raydium-idl/refs/heads/master/raydium_clmm/amm_v3.json",
    displayName: "Raydium AMM V3 (CLMM)",
    version: "0.1.0",
    notes: "Concentrated liquidity market maker",
  },
  {
    idlFileName: "raydium-cp-swap",
    programId: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
    fetchSource: "github",
    githubUrl:
      "https://raw.githubusercontent.com/raydium-io/raydium-idl/refs/heads/master/raydium_cpmm/raydium_cp_swap.json",
    displayName: "Raydium CP Swap",
    version: "0.1.0",
    notes: "Constant product swap",
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
    notes: "TON whales holders program, 27 errors",
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
    notes: "Leading Solana NFT marketplace",
  },
  {
    idlFileName: "tensor",
    programId: "TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN",
    fetchSource: "anchor",
    displayName: "Tensor",
    version: "1.0.0",
    notes: "NFT marketplace and AMM",
  },
  {
    idlFileName: "metaplex-auction-house",
    programId: "hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk",
    fetchSource: "anchor",
    displayName: "Metaplex Auction House",
    version: "1.0.0",
    notes: "Metaplex NFT marketplace protocol",
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
    notes: "Framework errors that apply to any Anchor program",
  },

  // ============================================================================
  // Token Programs
  // ============================================================================
  {
    idlFileName: "spl-token",
    programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    type: "token-program",
    fetchSource: "github",
    githubUrl:
      "https://raw.githubusercontent.com/solana-program/token/refs/heads/main/program/idl.json",
    displayName: "SPL Token Program",
    version: "1.0.0",
    notes: "Native Solana token standard",
  },
  {
    idlFileName: "token-2022",
    programId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    type: "token-program",
    fetchSource: "github",
    githubUrl:
      "https://raw.githubusercontent.com/solana-program/token-2022/refs/heads/main/interface/idl.json",
    displayName: "Token-2022 Program",
    version: "1.0.0",
    notes: "Extended token program with additional features",
  },
] as const;

/**
 * Get all protocols that need IDL fetching (excludes manual protocols)
 */
export function getFetchableProtocols(): readonly ProtocolConfig[] {
  return PROTOCOLS.filter((p) => p.fetchSource !== "manual");
}
