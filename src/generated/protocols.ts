/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 *
 * Generated from protocols.config.ts
 * Run `pnpm generate` to regenerate
 */

import { buildProtocolErrors } from "../core/builder";
import { Protocol } from "../core/protocol";
import { registry } from "../core/registry";
import type { IdlSource } from "../core/types";
import { PROTOCOLS } from "../protocols.config";
import { ANCHOR_ERRORS } from "../protocols/manual";

// ============================================================================
// IDL Imports (auto-generated)
// ============================================================================

import jupiterIdl from "../../idl/jupiter.json" with { type: "json" };
import orca_whirlpoolsIdl from "../../idl/orca-whirlpools.json" with { type: "json" };
import raydium_ammIdl from "../../idl/raydium-amm.json" with { type: "json" };
import raydium_amm_v3Idl from "../../idl/raydium-amm-v3.json" with { type: "json" };
import raydium_cp_swapIdl from "../../idl/raydium-cp-swap.json" with { type: "json" };
import ton_whales_holdersIdl from "../../idl/ton-whales-holders.json" with { type: "json" };
import magic_eden_v2Idl from "../../idl/magic-eden-v2.json" with { type: "json" };
import tensorIdl from "../../idl/tensor.json" with { type: "json" };
import metaplex_auction_houseIdl from "../../idl/metaplex-auction-house.json" with { type: "json" };
import spl_tokenIdl from "../../idl/spl-token.json" with { type: "json" };
import token_2022Idl from "../../idl/token-2022.json" with { type: "json" };

/**
 * Map of IDL filename → IDL object
 */
const IDL_MAP: Record<string, unknown> = {
  "jupiter": jupiterIdl,
  "orca-whirlpools": orca_whirlpoolsIdl,
  "raydium-amm": raydium_ammIdl,
  "raydium-amm-v3": raydium_amm_v3Idl,
  "raydium-cp-swap": raydium_cp_swapIdl,
  "ton-whales-holders": ton_whales_holdersIdl,
  "magic-eden-v2": magic_eden_v2Idl,
  "tensor": tensorIdl,
  "metaplex-auction-house": metaplex_auction_houseIdl,
  "spl-token": spl_tokenIdl,
  "token-2022": token_2022Idl,
};

// ============================================================================
// Auto-Registration
// ============================================================================

/**
 * Register a single protocol from IDL
 */
function registerProtocol(config: typeof PROTOCOLS[number]): void {
  // Handle manual protocols
  if (config.fetchSource === "manual") {
    if (config.idlFileName === "anchor") {
      const protocol = new Protocol({
        name: config.displayName,
        programId: config.programId,
        version: config.version,
        errors: ANCHOR_ERRORS,
        lastVerified: new Date().toISOString().split("T")[0],
      });

      // Register as framework (provides fallback resolution)
      registry.registerFramework(protocol);
    }
    return;
  }

  // Handle IDL-based protocols
  const idl = IDL_MAP[config.idlFileName];
  if (!idl) {
    throw new Error(`No IDL found for ${config.idlFileName}`);
  }
  const errors = buildProtocolErrors(idl);

  // Determine IDL source
  let idlSource: IdlSource | undefined;
  if (config.fetchSource === "github") {
    if (!config.githubUrl) {
      throw new Error(`GitHub URL required for ${config.idlFileName}`);
    }
    idlSource = {
      type: "github" as const,
      url: config.githubUrl,
      commit: "latest",
    };
  } else if (config.fetchSource === "anchor") {
    idlSource = {
      type: "on-chain" as const,
      fetchedAt: new Date().toISOString(),
    };
  }

  const protocol = new Protocol({
    name: config.displayName,
    programId: config.programId,
    version: config.version,
    errors,
    idlSource,
    lastVerified: new Date().toISOString().split("T")[0],
  });

  registry.register(protocol);
}

/**
 * Register all protocols from config
 * Framework protocols (Anchor) are registered first to provide fallback
 */
for (const config of PROTOCOLS) {
  registerProtocol(config);
}
