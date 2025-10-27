# @obsidian-debug/solana-errors

> Type-safe Solana error database extracted from program IDLs

[![npm version](https://img.shields.io/npm/v/@obsidian-debug/solana-errors.svg)](https://www.npmjs.com/package/@obsidian-debug/solana-errors)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Maps Solana program error codes to human-readable names and descriptions. All errors are extracted directly from official IDLs for 100% accuracy.

## Features

- **IDL-based accuracy** - Extracted directly from official program IDLs
- **Type-safe** - Full TypeScript support with immutable types
- **Zero config** - Works out of the box
- **Hierarchical resolution** - Program-specific errors + Anchor framework fallback
- **Easy maintenance** - Single config file, auto-generated code

## Protocol Coverage

| Ecosystem | Protocol / App | Program ID | Errors |
| --------- | -------------- | ---------- | ------ |
| Pump.fun | Bonding Curve | [`6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`](https://orb.helius.dev/address/6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P/history?cluster=mainnet-beta) | 43 |
| Pump.fun | PumpSwap AMM | [`pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA`](https://orb.helius.dev/address/pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA/history?cluster=mainnet-beta) | 41 |
| Jupiter | Swap Aggregator V6 | [`JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`](https://orb.helius.dev/address/JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4/history?cluster=mainnet-beta) | 18 |
| Jupiter | Swap Aggregator V4 | [`JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB`](https://orb.helius.dev/address/JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB/history?cluster=mainnet-beta) | 10 |
| Jupiter | DCA | [`DCA265Vj8a9CEuX1eb1LWRnDT7uK6q1xMipnNyatn23M`](https://orb.helius.dev/address/DCA265Vj8a9CEuX1eb1LWRnDT7uK6q1xMipnNyatn23M/history?cluster=mainnet-beta) | 47 |
| Jupiter | Limit Order | [`jupoNjAxXgZ4rjzxzPMP4oxduvQsQtZzyknqvzYNrNu`](https://orb.helius.dev/address/jupoNjAxXgZ4rjzxzPMP4oxduvQsQtZzyknqvzYNrNu/history?cluster=mainnet-beta) | 17 |
| OKX | DEX Router V2 | [`6m2CDdhRgxpH4WjvdzxAYbGxwdGUz5MziiL5jek2kBma`](https://orb.helius.dev/address/6m2CDdhRgxpH4WjvdzxAYbGxwdGUz5MziiL5jek2kBma/history?cluster=mainnet-beta) | 75 |
| Orca | Whirlpool (CLMM) | [`whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc`](https://orb.helius.dev/address/whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc/history?cluster=mainnet-beta) | 56 |
| Meteora | DLMM | [`LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`](https://orb.helius.dev/address/LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo/history?cluster=mainnet-beta) | 59 |
| Meteora | AMM Pools | [`Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB`](https://orb.helius.dev/address/Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB/history?cluster=mainnet-beta) | 45 |
| Meteora | CP AMM (DAMM V2) | [`cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`](https://orb.helius.dev/address/cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG/history?cluster=mainnet-beta) | 42 |
| Meteora | Dynamic Bonding | [`dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`](https://orb.helius.dev/address/dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN/history?cluster=mainnet-beta) | 49 |
| Raydium | AMM V4 | [`675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8`](https://orb.helius.dev/address/675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8/history?cluster=mainnet-beta) | 57 |
| Raydium | CLMM V3 | [`CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK`](https://orb.helius.dev/address/CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK/history?cluster=mainnet-beta) | 45 |
| Raydium | CP Swap | [`CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C`](https://orb.helius.dev/address/CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C/history?cluster=mainnet-beta) | 11 |
| Raydium | Launchpad | [`LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj`](https://orb.helius.dev/address/LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj/history?cluster=mainnet-beta) | 21 |
| OpenBook | V2 CLOB | [`opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb`](https://orb.helius.dev/address/opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb/history?cluster=mainnet-beta) | 43 |
| Serum | DEX V3 | [`9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin`](https://orb.helius.dev/address/9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin/history?cluster=mainnet-beta) | 0 |
| Phoenix | On-chain CLOB | [`PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY`](https://orb.helius.dev/address/PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY/history?cluster=mainnet-beta) | 26 |
| BonkSwap | AMM | [`BSwp6bEBihVLdqJRKGgzjcGLHkcTuzmSo1TQkHepzH8p`](https://orb.helius.dev/address/BSwp6bEBihVLdqJRKGgzjcGLHkcTuzmSo1TQkHepzH8p/history?cluster=mainnet-beta) | 16 |
| Aldrin | V2 CLOB | [`CURVGoZn8zycx6FXwwevgBTB2gVvdbGTEpvMJDbgs2t4`](https://orb.helius.dev/address/CURVGoZn8zycx6FXwwevgBTB2gVvdbGTEpvMJDbgs2t4/history?cluster=mainnet-beta) | 0 |
| Moonshot | Token Launch | [`MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG`](https://orb.helius.dev/address/MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG/history?cluster=mainnet-beta) | 31 |
| Boop | Meme Platform | [`boop8hVGQGqehUK2iVEMEnMrL5RbjywRzHKBmBE7ry4`](https://orb.helius.dev/address/boop8hVGQGqehUK2iVEMEnMrL5RbjywRzHKBmBE7ry4/history?cluster=mainnet-beta) | 37 |
| Heaven | DEX | [`HEAVENoP2qxoeuF8Dj2oT1GHEnu49U5mJYkdeC8BAX2o`](https://orb.helius.dev/address/HEAVENoP2qxoeuF8Dj2oT1GHEnu49U5mJYkdeC8BAX2o/history?cluster=mainnet-beta) | 54 |
| Drift | V2 Perpetual | [`dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH`](https://orb.helius.dev/address/dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH/history?cluster=mainnet-beta) | 309 |
| Obric | V2 | [`obriQD1zbpyLz95G5n7nJe6a4DPjpFwa5XYPoNm113y`](https://orb.helius.dev/address/obriQD1zbpyLz95G5n7nJe6a4DPjpFwa5XYPoNm113y/history?cluster=mainnet-beta) | 22 |
| TON Whales | Holders | [`6bES2dKy1ee13HQ4uW4ycw4Kw4od9ziZeWMyAxVySYEd`](https://orb.helius.dev/address/6bES2dKy1ee13HQ4uW4ycw4Kw4od9ziZeWMyAxVySYEd/history?cluster=mainnet-beta) | 27 |
| Magic Eden | Marketplace V2 | [`M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K`](https://orb.helius.dev/address/M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K/history?cluster=mainnet-beta) | 40 |
| Tensor | NFT AMM | [`TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN`](https://orb.helius.dev/address/TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN/history?cluster=mainnet-beta) | 2 |
| Metaplex | Token Metadata | [`metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`](https://orb.helius.dev/address/metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s/history?cluster=mainnet-beta) | 201 |
| Metaplex | Candy Machine | [`cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ`](https://orb.helius.dev/address/cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ/history?cluster=mainnet-beta) | 52 |
| Metaplex | Fixed Price Sale | [`SaLeTjyUa5wXHnGuewUSyJ5JWZaHwz3TxqUntCE9czo`](https://orb.helius.dev/address/SaLeTjyUa5wXHnGuewUSyJ5JWZaHwz3TxqUntCE9czo/history?cluster=mainnet-beta) | 46 |
| Metaplex | Auction House | [`hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk`](https://orb.helius.dev/address/hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk/history?cluster=mainnet-beta) | 44 |
| Metaplex | Bubblegum (cNFT) | [`BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY`](https://orb.helius.dev/address/BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY/history?cluster=mainnet-beta) | 40 |
| Metaplex | NFT Packs | [`packFeFNZzMfD9aVWL7QbGz1WcU7R9zpf6pvNsw2BLu`](https://orb.helius.dev/address/packFeFNZzMfD9aVWL7QbGz1WcU7R9zpf6pvNsw2BLu/history?cluster=mainnet-beta) | 40 |
| Metaplex | Hydra | [`hyDQ4Nz1eYyegS6JfenyKwKzYxRsCWCriYSAjtzP4Vg`](https://orb.helius.dev/address/hyDQ4Nz1eYyegS6JfenyKwKzYxRsCWCriYSAjtzP4Vg/history?cluster=mainnet-beta) | 25 |
| Metaplex | Token Entangler | [`qntmGodpGkrM42mN68VCZHXnKqDCT8rdY23wFcXCLPd`](https://orb.helius.dev/address/qntmGodpGkrM42mN68VCZHXnKqDCT8rdY23wFcXCLPd/history?cluster=mainnet-beta) | 16 |
| Metaplex | Auctioneer | [`neer8g6yJq2mQM6KbnViEDAD4gr3gRZyMMf4F2p3MEh`](https://orb.helius.dev/address/neer8g6yJq2mQM6KbnViEDAD4gr3gRZyMMf4F2p3MEh/history?cluster=mainnet-beta) | 10 |
| Solana | SPL Token | [`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`](https://orb.helius.dev/address/TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA/history?cluster=mainnet-beta) | 20 |
| Solana | Token-2022 | [`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`](https://orb.helius.dev/address/TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb/history?cluster=mainnet-beta) | 20 |
| Solana | SPL Token Swap | [`SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8`](https://orb.helius.dev/address/SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8/history?cluster=mainnet-beta) | 29 |
| Anchor | Framework | `*` (any Anchor program) | 59 |

**Total**: 41 protocols, **1,786 error definitions**

## Installation

```bash
npm install @obsidian-debug/solana-errors
```

## Quick Start

```typescript
import { registry } from '@obsidian-debug/solana-errors';

// Resolve error by program ID and error code
const error = registry.resolve(
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  6001
);

if (error) {
  console.log(`${error.name}: ${error.description}`);
  // Output: "SlippageToleranceExceeded: Slippage tolerance exceeded"
}
```

## API

### `registry.resolve(programId: string, errorCode: number)`

Resolve an error by program ID and error code. Returns enriched error with source metadata.

```typescript
const error = registry.resolve(
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  6000
);
// {
//   code: 6000,
//   name: "InvalidEnum",
//   description: "Enum value could not be converted",
//   source: { type: "program-specific", programId: "whir...", programName: "Orca Whirlpools" }
// }
```

**Hierarchical resolution**:
1. Program-specific errors (Jupiter, Orca, SPL Token, etc.)
2. Anchor framework errors (fallback for any Anchor program)

### `registry.getByProgramId(programId: string)`

Get protocol instance for a program ID.

```typescript
const protocol = registry.getByProgramId(
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'
);

console.log(protocol.name); // "Raydium AMM V4"
console.log(protocol.getErrorCount()); // 57
```

### `registry.search(query: string)`

Search errors across all protocols.

```typescript
const results = registry.search('slippage');
results.forEach(({ protocol, error }) => {
  console.log(`[${protocol.name}] ${error.name}`);
});
```

## Usage Example

```typescript
import { Connection } from '@solana/web3.js';
import { registry } from '@obsidian-debug/solana-errors';

async function debugTransaction(signature: string) {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0
  });

  if (tx?.meta?.err && 'InstructionError' in tx.meta.err) {
    const [index, error] = tx.meta.err.InstructionError;

    if ('Custom' in error) {
      const errorCode = error.Custom;
      const programId = tx.transaction.message.staticAccountKeys[
        tx.transaction.message.compiledInstructions[index].programIdIndex
      ].toBase58();

      const errorInfo = registry.resolve(programId, errorCode);

      if (errorInfo) {
        console.log(`Error in instruction ${index}:`);
        console.log(`  Program: ${errorInfo.source.programName}`);
        console.log(`  Error: ${errorInfo.name} (${errorInfo.code})`);
        console.log(`  Description: ${errorInfo.description}`);
      }
    }
  }
}
```

## Types

```typescript
type ErrorInfo = {
  readonly code: number;
  readonly name: string;
  readonly description: string;
  readonly source: ErrorSource;
};

type ErrorSource =
  | { type: "program-specific"; programId: string; programName: string }
  | { type: "anchor-framework"; programId: string }
  | { type: "token-program"; programId: string; programName: string };
```

## Development

### Adding New Protocols

1. Edit `src/protocols.config.ts`:

```typescript
export const PROTOCOLS = [
  // ... existing protocols
  {
    idlFileName: "my-protocol",
    programId: "YourProgramID...",
    fetchSource: "github", // "github", "anchor", or "local"
    githubUrl: "https://raw.githubusercontent.com/.../idl.json", // Required for "github"
    displayName: "My Protocol",
    version: "1.0.0",
  },
] as const;
```

**Fetch Source Options**:
- `"github"` - Fetch from GitHub URL during generation
- `"anchor"` - Fetch from on-chain using Anchor CLI
- `"local"` - Use pre-copied IDL from `idl/` directory (no fetching)
- `"manual"` - Manually defined errors in TypeScript code (no IDL file)

2. For local IDLs, copy the file first:

```bash
cp /path/to/source/idl.json idl/my-protocol.json
```

3. Run generation:

```bash
pnpm generate  # Fetches/validates IDLs and auto-generates registration code
pnpm build     # Build package
```

### Scripts

```bash
pnpm generate          # Fetch IDLs and generate code
pnpm generate --force  # Re-fetch all IDLs
pnpm build            # Build package
pnpm type-check       # Type check
```

## Architecture

```
src/
├── core/
│   ├── types.ts          # Type definitions
│   ├── protocol.ts       # Protocol class
│   ├── registry.ts       # Global registry with hierarchical resolution
│   └── builder.ts        # IDL → ErrorInfo conversion
├── protocols.config.ts   # 👈 Single source of truth
├── generated/
│   └── protocols.ts      # Auto-generated (don't edit)
└── index.ts              # Public API

scripts/generate.ts       # IDL fetching + code generation
idl/*.json               # Downloaded IDL files
```

**Design principles**:
- Single source of truth (`protocols.config.ts`)
- Auto-generated registration code
- Immutable data structures
- Type-safe interfaces


## References:
1. https://github.com/pinax-network/substreams-solana-idls
2. https://github.com/bitquery/solana-idl-lib
3. https://github.com/FixedLocally/sandwich-finder/blob/89e85f09e2d5ee0b23aeaef7a7ad9bb8cc7edca7/sandwich-finder/src/events/addresses.rs#L25
4. https://github.com/duneanalytics/spellbook/blob/3677f6bedbc30dc2b1024db6572ab1fc20973c32/dbt_subprojects/solana/models/jupiter/jupiter_solana_aggregator_swaps.sql
5. https://github.com/okxlabs/DEX-Router-Solana-V1/blob/ab251be839ce1ccd311eaffaee47eddb86f6d239/programs/dex-solana/src/constants.rs#L342

## Contributing

1. Fork the repo
2. Add protocol to `src/protocols.config.ts`
3. Run `pnpm generate && pnpm build`
4. Create pull request

Ensure IDLs are from official sources (GitHub or on-chain).

## License

MIT © [Obsidian Debug Team]
