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
import jupiter_v4Idl from "../../idl/jupiter-v4.json" with { type: "json" };
import jupiter_dcaIdl from "../../idl/jupiter-dca.json" with { type: "json" };
import jupiter_limitIdl from "../../idl/jupiter-limit.json" with { type: "json" };
import okx_dexIdl from "../../idl/okx-dex.json" with { type: "json" };
import orca_whirlpoolsIdl from "../../idl/orca-whirlpools.json" with { type: "json" };
import meteora_dlmmIdl from "../../idl/meteora-dlmm.json" with { type: "json" };
import meteora_ammIdl from "../../idl/meteora-amm.json" with { type: "json" };
import meteora_cp_ammIdl from "../../idl/meteora-cp-amm.json" with { type: "json" };
import meteora_dbcIdl from "../../idl/meteora-dbc.json" with { type: "json" };
import raydium_ammIdl from "../../idl/raydium-amm.json" with { type: "json" };
import raydium_amm_v3Idl from "../../idl/raydium-amm-v3.json" with { type: "json" };
import raydium_cp_swapIdl from "../../idl/raydium-cp-swap.json" with { type: "json" };
import raydium_launchpadIdl from "../../idl/raydium-launchpad.json" with { type: "json" };
import openbook_v2Idl from "../../idl/openbook-v2.json" with { type: "json" };
import serum_dexIdl from "../../idl/serum-dex.json" with { type: "json" };
import phoenixIdl from "../../idl/phoenix.json" with { type: "json" };
import pumpfun_bondingIdl from "../../idl/pumpfun-bonding.json" with { type: "json" };
import pumpswap_ammIdl from "../../idl/pumpswap-amm.json" with { type: "json" };
import moonshotIdl from "../../idl/moonshot.json" with { type: "json" };
import boopIdl from "../../idl/boop.json" with { type: "json" };
import heavenIdl from "../../idl/heaven.json" with { type: "json" };
import bonkswapIdl from "../../idl/bonkswap.json" with { type: "json" };
import aldrin_clobIdl from "../../idl/aldrin-clob.json" with { type: "json" };
import drift_v2Idl from "../../idl/drift-v2.json" with { type: "json" };
import ton_whales_holdersIdl from "../../idl/ton-whales-holders.json" with { type: "json" };
import magic_eden_v2Idl from "../../idl/magic-eden-v2.json" with { type: "json" };
import tensorIdl from "../../idl/tensor.json" with { type: "json" };
import metaplex_auction_houseIdl from "../../idl/metaplex-auction-house.json" with { type: "json" };
import metaplex_token_metadataIdl from "../../idl/metaplex-token-metadata.json" with { type: "json" };
import metaplex_bubblegumIdl from "../../idl/metaplex-bubblegum.json" with { type: "json" };
import metaplex_candy_machineIdl from "../../idl/metaplex-candy-machine.json" with { type: "json" };
import metaplex_fixed_price_saleIdl from "../../idl/metaplex-fixed-price-sale.json" with { type: "json" };
import metaplex_nft_packsIdl from "../../idl/metaplex-nft-packs.json" with { type: "json" };
import metaplex_hydraIdl from "../../idl/metaplex-hydra.json" with { type: "json" };
import metaplex_token_entanglerIdl from "../../idl/metaplex-token-entangler.json" with { type: "json" };
import metaplex_auctioneerIdl from "../../idl/metaplex-auctioneer.json" with { type: "json" };
import obric_v2Idl from "../../idl/obric-v2.json" with { type: "json" };
import spl_tokenIdl from "../../idl/spl-token.json" with { type: "json" };
import token_2022Idl from "../../idl/token-2022.json" with { type: "json" };
import spl_token_swapIdl from "../../idl/spl-token-swap.json" with { type: "json" };

/**
 * Map of IDL filename → IDL object
 */
const IDL_MAP: Record<string, unknown> = {
  "jupiter": jupiterIdl,
  "jupiter-v4": jupiter_v4Idl,
  "jupiter-dca": jupiter_dcaIdl,
  "jupiter-limit": jupiter_limitIdl,
  "okx-dex": okx_dexIdl,
  "orca-whirlpools": orca_whirlpoolsIdl,
  "meteora-dlmm": meteora_dlmmIdl,
  "meteora-amm": meteora_ammIdl,
  "meteora-cp-amm": meteora_cp_ammIdl,
  "meteora-dbc": meteora_dbcIdl,
  "raydium-amm": raydium_ammIdl,
  "raydium-amm-v3": raydium_amm_v3Idl,
  "raydium-cp-swap": raydium_cp_swapIdl,
  "raydium-launchpad": raydium_launchpadIdl,
  "openbook-v2": openbook_v2Idl,
  "serum-dex": serum_dexIdl,
  "phoenix": phoenixIdl,
  "pumpfun-bonding": pumpfun_bondingIdl,
  "pumpswap-amm": pumpswap_ammIdl,
  "moonshot": moonshotIdl,
  "boop": boopIdl,
  "heaven": heavenIdl,
  "bonkswap": bonkswapIdl,
  "aldrin-clob": aldrin_clobIdl,
  "drift-v2": drift_v2Idl,
  "ton-whales-holders": ton_whales_holdersIdl,
  "magic-eden-v2": magic_eden_v2Idl,
  "tensor": tensorIdl,
  "metaplex-auction-house": metaplex_auction_houseIdl,
  "metaplex-token-metadata": metaplex_token_metadataIdl,
  "metaplex-bubblegum": metaplex_bubblegumIdl,
  "metaplex-candy-machine": metaplex_candy_machineIdl,
  "metaplex-fixed-price-sale": metaplex_fixed_price_saleIdl,
  "metaplex-nft-packs": metaplex_nft_packsIdl,
  "metaplex-hydra": metaplex_hydraIdl,
  "metaplex-token-entangler": metaplex_token_entanglerIdl,
  "metaplex-auctioneer": metaplex_auctioneerIdl,
  "obric-v2": obric_v2Idl,
  "spl-token": spl_tokenIdl,
  "token-2022": token_2022Idl,
  "spl-token-swap": spl_token_swapIdl,
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
  } else if (config.fetchSource === "local") {
    idlSource = {
      type: "github" as const,
      url: "pre-copied from reference repository",
      commit: "N/A",
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
