/**
 * Example: Using solana-idls with @debridge-finance/solana-transaction-parser
 */

import { Connection } from "@solana/web3.js";
import {
  SolanaParser,
  convertLegacyIdlToV30,
} from "@debridge-finance/solana-transaction-parser";
import {
  JUPITER_IDL,
  JUPITER_PROGRAM_ID,
  ORCA_WHIRLPOOLS_IDL,
  ORCA_WHIRLPOOLS_PROGRAM_ID,
} from "solana-idls";

// Initialize parser with IDLs
const parser = new SolanaParser([
  {
    idl: convertLegacyIdlToV30(JUPITER_IDL as any, JUPITER_PROGRAM_ID),
    programId: JUPITER_PROGRAM_ID,
  },
  {
    idl: convertLegacyIdlToV30(
      ORCA_WHIRLPOOLS_IDL as any,
      ORCA_WHIRLPOOLS_PROGRAM_ID
    ),
    programId: ORCA_WHIRLPOOLS_PROGRAM_ID,
  },
]);

const connection = new Connection("https://api.mainnet-beta.solana.com");

// Example Jupiter swap transaction
const signature =
  "4ZidatPKRyKPYHaEG9gLMBWu7pWPYpV42SSD5hEpEA3GUXPcph8o9Gdu3SYjRuzFC6cCK43GziuK2rJkMPVPac1";

async function main() {
  const parsed = await parser.parseTransactionByHash(connection, signature);

  if (!parsed) {
    console.log("Transaction not found");
    return;
  }

  console.log(`\nParsed ${parsed.length} instructions:\n`);

  parsed.forEach((ix, i) => {
    console.log(
      `${i + 1}. ${ix.name.padEnd(32)} ${ix.programId.toString().slice(0, 12)}...`
    );
  });

  // Show Jupiter route details
  const jupiterRoute = parsed.find((ix) => ix.name === "route");
  if (jupiterRoute && "args" in jupiterRoute) {
    const args = jupiterRoute.args as any;
    console.log(`\nJupiter route: ${args.route_plan.length} swap step(s)`);
  }
}

main().catch(console.error);
