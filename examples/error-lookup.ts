/**
 * Example: Error code lookup
 * Shows how to resolve Solana program errors
 */

import { JUPITER_IDL, RAYDIUM_AMM_IDL } from "solana-idls";

// Simulate error from transaction
const customErrorCode = 6001; // Jupiter: SlippageToleranceExceeded

// Look up error
const error = JUPITER_IDL.errors?.find((e) => e.code === customErrorCode);

if (error) {
  console.log(`\nError ${error.code}: ${error.name}`);
  console.log(`Message: ${error.msg}`);
} else {
  console.log("Error not found");
}

// Helper function for error lookup
function lookupError(idl: any, code: number) {
  const error = idl.errors?.find((e: any) => e.code === code);
  return error ? `${error.name}: ${error.msg}` : `Unknown error code ${code}`;
}

// Usage
console.log("\nJupiter 6001:", lookupError(JUPITER_IDL, 6001));
console.log("Raydium 6000:", lookupError(RAYDIUM_AMM_IDL, 6000));
console.log("Invalid 9999:", lookupError(JUPITER_IDL, 9999));
