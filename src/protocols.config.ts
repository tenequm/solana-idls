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

export type FetchSource = "anchor" | "github" | "manual" | "local";

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
   * - "local": IDL file pre-copied to idl/ directory (no fetching needed)
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
  {
    idlFileName: "jupiter-v4",
    programId: "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB",
    fetchSource: "local",
    displayName: "Jupiter Aggregator v4",
    version: "0.1.0",
    notes: "Legacy aggregator version, still active",
  },
  {
    idlFileName: "jupiter-dca",
    programId: "DCA265Vj8a9CEuX1eb1LWRnDT7uK6q1xMipnNyatn23M",
    fetchSource: "local",
    displayName: "Jupiter DCA",
    version: "0.1.0",
    notes: "Dollar-cost averaging program",
  },
  {
    idlFileName: "jupiter-limit",
    programId: "jupoNjAxXgZ4rjzxzPMP4oxduvQsQtZzyknqvzYNrNu",
    fetchSource: "local",
    displayName: "Jupiter Limit Order",
    version: "0.1.0",
    notes: "Limit order program",
  },

  // ============================================================================
  // OKX DEX
  // ============================================================================
  {
    idlFileName: "okx-dex",
    programId: "6m2CDdhRgxpH4WjvdzxAYbGxwdGUz5MziiL5jek2kBma",
    fetchSource: "local",
    displayName: "OKX DEX Aggregation Router V2",
    version: "0.1.0",
    notes: "OKX DEX aggregation router",
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
  // Meteora Protocols
  // ============================================================================
  {
    idlFileName: "meteora-dlmm",
    programId: "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
    fetchSource: "local",
    displayName: "Meteora DLMM",
    version: "0.5.1",
    notes: "Dynamic liquidity market maker",
  },
  {
    idlFileName: "meteora-amm",
    programId: "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB",
    fetchSource: "local",
    displayName: "Meteora AMM",
    version: "0.4.12",
    notes: "Automated market maker pools",
  },
  {
    idlFileName: "meteora-cp-amm",
    programId: "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG",
    fetchSource: "local",
    displayName: "Meteora CP AMM (DAMM V2)",
    version: "0.1.1",
    notes: "Constant product AMM / Dynamic AMM V2",
  },
  {
    idlFileName: "meteora-dbc",
    programId: "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN",
    fetchSource: "local",
    displayName: "Meteora Dynamic Bonding Curve",
    version: "0.1.6",
    notes: "Dynamic bonding curve for token launches",
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
  {
    idlFileName: "raydium-launchpad",
    programId: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
    fetchSource: "local",
    displayName: "Raydium Launchpad",
    version: "0.2.0",
    notes: "Token launchpad platform",
  },

  // ============================================================================
  // OpenBook / Serum
  // ============================================================================
  {
    idlFileName: "openbook-v2",
    programId: "opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb",
    fetchSource: "local",
    displayName: "OpenBook V2",
    version: "0.1.0",
    notes: "On-chain central limit order book (Serum successor)",
  },
  {
    idlFileName: "serum-dex",
    programId: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    fetchSource: "local",
    displayName: "Serum DEX V3",
    version: "0.0.0",
    notes: "Legacy on-chain CLOB (deprecated)",
  },

  // ============================================================================
  // Phoenix CLOB
  // ============================================================================
  {
    idlFileName: "phoenix",
    programId: "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY",
    fetchSource: "local",
    displayName: "Phoenix",
    version: "0.2.4",
    notes: "On-chain central limit order book",
  },

  // ============================================================================
  // Pump.fun
  // ============================================================================
  {
    idlFileName: "pumpfun-bonding",
    programId: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
    fetchSource: "local",
    displayName: "Pump.fun Bonding Curve",
    version: "0.1.0",
    notes: "Meme token bonding curve launches",
  },
  {
    idlFileName: "pumpswap-amm",
    programId: "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
    fetchSource: "local",
    displayName: "PumpSwap AMM",
    version: "0.1.0",
    notes: "Pump.fun ecosystem AMM",
  },
  {
    idlFileName: "moonshot",
    programId: "MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG",
    fetchSource: "local",
    displayName: "Moonshot",
    version: "0.1.0",
    notes: "Token launch platform",
  },
  {
    idlFileName: "boop",
    programId: "boop8hVGQGqehUK2iVEMEnMrL5RbjywRzHKBmBE7ry4",
    fetchSource: "local",
    displayName: "Boop",
    version: "0.3.0",
    notes: "Meme token platform",
  },
  {
    idlFileName: "heaven",
    programId: "HEAVENoP2qxoeuF8Dj2oT1GHEnu49U5mJYkdeC8BAX2o",
    fetchSource: "local",
    displayName: "Heaven DEX",
    version: "0.2.0",
    notes: "Decentralized exchange (deprecated)",
  },

  // ============================================================================
  // BonkSwap
  // ============================================================================
  {
    idlFileName: "bonkswap",
    programId: "BSwp6bEBihVLdqJRKGgzjcGLHkcTuzmSo1TQkHepzH8p",
    fetchSource: "local",
    displayName: "BonkSwap",
    version: "0.1.1",
    notes: "Bonk ecosystem AMM",
  },

  // ============================================================================
  // Aldrin
  // ============================================================================
  {
    idlFileName: "aldrin-clob",
    programId: "CURVGoZn8zycx6FXwwevgBTB2gVvdbGTEpvMJDbgs2t4",
    fetchSource: "local",
    displayName: "Aldrin V2 CLOB",
    version: "0.0.0",
    notes: "Aldrin central limit order book V2",
  },

  // ============================================================================
  // Drift Protocol
  // ============================================================================
  {
    idlFileName: "drift-v2",
    programId: "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH",
    fetchSource: "local",
    displayName: "Drift V2",
    version: "2.106.0",
    notes: "Perpetuals and derivatives platform",
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
  {
    idlFileName: "metaplex-token-metadata",
    programId: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
    type: "token-program",
    fetchSource: "local",
    displayName: "Metaplex Token Metadata",
    version: "1.14.0",
    notes: "Core NFT metadata standard",
  },
  {
    idlFileName: "metaplex-bubblegum",
    programId: "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY",
    fetchSource: "local",
    displayName: "Metaplex Bubblegum",
    version: "0.12.0",
    notes: "Compressed NFTs (cNFTs)",
  },
  {
    idlFileName: "metaplex-candy-machine",
    programId: "cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ",
    fetchSource: "local",
    displayName: "Metaplex Candy Machine",
    version: "4.6.0",
    notes: "NFT minting and distribution",
  },
  {
    idlFileName: "metaplex-fixed-price-sale",
    programId: "SaLeTjyUa5wXHnGuewUSyJ5JWZaHwz3TxqUntCE9czo",
    fetchSource: "local",
    displayName: "Metaplex Fixed Price Sale",
    version: "0.4.0",
    notes: "Fixed-price NFT sales",
  },
  {
    idlFileName: "metaplex-nft-packs",
    programId: "packFeFNZzMfD9aVWL7QbGz1WcU7R9zpf6pvNsw2BLu",
    fetchSource: "local",
    displayName: "Metaplex NFT Packs",
    version: "0.1.0",
    notes: "NFT pack creation and distribution",
  },
  {
    idlFileName: "metaplex-hydra",
    programId: "hyDQ4Nz1eYyegS6JfenyKwKzYxRsCWCriYSAjtzP4Vg",
    fetchSource: "local",
    displayName: "Metaplex Hydra",
    version: "0.3.0",
    notes: "Fanout wallet distribution",
  },
  {
    idlFileName: "metaplex-token-entangler",
    programId: "qntmGodpGkrM42mN68VCZHXnKqDCT8rdY23wFcXCLPd",
    fetchSource: "local",
    displayName: "Metaplex Token Entangler",
    version: "0.2.0",
    notes: "NFT swapping and entanglement",
  },
  {
    idlFileName: "metaplex-auctioneer",
    programId: "neer8g6yJq2mQM6KbnViEDAD4gr3gRZyMMf4F2p3MEh",
    fetchSource: "local",
    displayName: "Metaplex Auctioneer",
    version: "0.2.1",
    notes: "Auction house authority delegation",
  },

  // ============================================================================
  // Other Protocols
  // ============================================================================
  {
    idlFileName: "obric-v2",
    programId: "obriQD1zbpyLz95G5n7nJe6a4DPjpFwa5XYPoNm113y",
    fetchSource: "local",
    displayName: "Obric V2",
    version: "0.1.0",
    notes: "Obric Solana V2 protocol",
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
  {
    idlFileName: "spl-token-swap",
    programId: "SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8",
    fetchSource: "local",
    displayName: "SPL Token Swap",
    version: "3.0.0",
    notes: "Official SPL token swap program",
  },
] as const;

/**
 * Get all protocols that need IDL fetching (excludes manual and local protocols)
 */
export function getFetchableProtocols(): readonly ProtocolConfig[] {
  return PROTOCOLS.filter(
    (p) => p.fetchSource !== "manual" && p.fetchSource !== "local"
  );
}

/**
 * Get all protocols that have IDL files (excludes only manual protocols)
 * Used for code generation
 */
export function getIdlBasedProtocols(): readonly ProtocolConfig[] {
  return PROTOCOLS.filter((p) => p.fetchSource !== "manual");
}
