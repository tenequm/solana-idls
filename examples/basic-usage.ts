/**
 * Example: Basic IDL usage
 * Shows how to access IDL data directly
 */

import { JUPITER_IDL, JUPITER_PROGRAM_ID, RAYDIUM_AMM_IDL } from "solana-idls";

console.log("Jupiter Program:", JUPITER_PROGRAM_ID);
console.log("Version:", JUPITER_IDL.metadata.version);
console.log("Instructions:", JUPITER_IDL.instructions.length);
console.log("Errors:", JUPITER_IDL.errors?.length || 0);

// Access specific instruction
const routeInstruction = JUPITER_IDL.instructions.find(
  (ix) => ix.name === "route"
);
console.log("\nRoute instruction:", {
  name: routeInstruction?.name,
  accounts: routeInstruction?.accounts.length,
  args: routeInstruction?.args.length,
});

// Check errors
const firstError = RAYDIUM_AMM_IDL.errors?.[0];
console.log("\nRaydium AMM first error:", {
  code: firstError?.code,
  name: firstError?.name,
  msg: firstError?.msg,
});
