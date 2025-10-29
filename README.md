# solana-idls

> 📺 **See it in action:** [Obsidian Debug](https://soldebug.dev) uses this library to resolve Solana transaction errors in real-time.

> Type-safe Solana IDL database with error, instruction, and account resolution

[![npm version](https://img.shields.io/npm/v/solana-idls.svg)](https://www.npmjs.com/package/solana-idls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Comprehensive Solana IDL database providing error codes, instruction names, and account metadata from 41+ protocols. All data extracted directly from official IDLs for 100% accuracy.

## Features

- **1,914 errors** from 41 Solana protocols
- **Error resolution** - Map error codes to names and descriptions
- **Instruction resolution** - Discriminator → instruction name + account metadata
- **Program identification** - Program ID → protocol name
- **Hierarchical fallback** - Program-specific errors + Anchor framework
- **Type-safe** - Full TypeScript support
- **Zero config** - Works out of the box

## Protocol Coverage

| Ecosystem | Protocol / App | Program ID | Version | Errors |
| --------- | -------------- | ---------- | ------- | ------ |
| Pump.fun | Bonding Curve | [`6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`](https://orb.helius.dev/address/6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P/history?cluster=mainnet-beta) | 0.1.0 | 43 |
| Pump.fun | PumpSwap AMM | [`pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA`](https://orb.helius.dev/address/pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA/history?cluster=mainnet-beta) | 0.1.0 | 41 |
| Jupiter | Swap Aggregator V6 | [`JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`](https://orb.helius.dev/address/JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4/history?cluster=mainnet-beta) | 0.1.0 | 18 |
| Jupiter | Swap Aggregator V4 | [`JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB`](https://orb.helius.dev/address/JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB/history?cluster=mainnet-beta) | 0.1.0 | 10 |
| Jupiter | DCA | [`DCA265Vj8a9CEuX1eb1LWRnDT7uK6q1xMipnNyatn23M`](https://orb.helius.dev/address/DCA265Vj8a9CEuX1eb1LWRnDT7uK6q1xMipnNyatn23M/history?cluster=mainnet-beta) | 0.1.0 | 47 |
| Jupiter | Limit Order | [`jupoNjAxXgZ4rjzxzPMP4oxduvQsQtZzyknqvzYNrNu`](https://orb.helius.dev/address/jupoNjAxXgZ4rjzxzPMP4oxduvQsQtZzyknqvzYNrNu/history?cluster=mainnet-beta) | 0.1.0 | 17 |
| OKX | DEX Router V2 | [`6m2CDdhRgxpH4WjvdzxAYbGxwdGUz5MziiL5jek2kBma`](https://orb.helius.dev/address/6m2CDdhRgxpH4WjvdzxAYbGxwdGUz5MziiL5jek2kBma/history?cluster=mainnet-beta) | 0.1.0 | 75 |
| Orca | Whirlpool (CLMM) | [`whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc`](https://orb.helius.dev/address/whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc/history?cluster=mainnet-beta) | 0.3.6 | 65 |
| Meteora | DLMM | [`LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`](https://orb.helius.dev/address/LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo/history?cluster=mainnet-beta) | 0.10.0 | 86 |
| Meteora | AMM Pools | [`Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB`](https://orb.helius.dev/address/Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB/history?cluster=mainnet-beta) | 0.5.3 | 54 |
| Meteora | CP AMM (DAMM V2) | [`cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`](https://orb.helius.dev/address/cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG/history?cluster=mainnet-beta) | 0.1.5 | 53 |
| Meteora | Dynamic Bonding | [`dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`](https://orb.helius.dev/address/dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN/history?cluster=mainnet-beta) | 0.1.6 | 49 |
| Raydium | AMM V4 | [`675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8`](https://orb.helius.dev/address/675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8/history?cluster=mainnet-beta) | 0.1.0 | 57 |
| Raydium | CLMM V3 | [`CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK`](https://orb.helius.dev/address/CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK/history?cluster=mainnet-beta) | 0.1.0 | 45 |
| Raydium | CP Swap | [`CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C`](https://orb.helius.dev/address/CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C/history?cluster=mainnet-beta) | 0.1.0 | 11 |
| Raydium | Launchpad | [`LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj`](https://orb.helius.dev/address/LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj/history?cluster=mainnet-beta) | 0.2.0 | 21 |
| OpenBook | V2 CLOB | [`opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb`](https://orb.helius.dev/address/opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb/history?cluster=mainnet-beta) | 0.1.0 | 43 |
| Serum | DEX V3 | [`9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin`](https://orb.helius.dev/address/9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin/history?cluster=mainnet-beta) | 0.0.0 | 0 |
| Phoenix | On-chain CLOB | [`PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY`](https://orb.helius.dev/address/PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY/history?cluster=mainnet-beta) | 0.2.4 | 26 |
| BonkSwap | AMM | [`BSwp6bEBihVLdqJRKGgzjcGLHkcTuzmSo1TQkHepzH8p`](https://orb.helius.dev/address/BSwp6bEBihVLdqJRKGgzjcGLHkcTuzmSo1TQkHepzH8p/history?cluster=mainnet-beta) | 0.1.1 | 16 |
| Aldrin | V2 CLOB | [`CURVGoZn8zycx6FXwwevgBTB2gVvdbGTEpvMJDbgs2t4`](https://orb.helius.dev/address/CURVGoZn8zycx6FXwwevgBTB2gVvdbGTEpvMJDbgs2t4/history?cluster=mainnet-beta) | 0.0.0 | 0 |
| Moonshot | Token Launch | [`MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG`](https://orb.helius.dev/address/MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG/history?cluster=mainnet-beta) | 0.1.0 | 31 |
| Boop | Meme Platform | [`boop8hVGQGqehUK2iVEMEnMrL5RbjywRzHKBmBE7ry4`](https://orb.helius.dev/address/boop8hVGQGqehUK2iVEMEnMrL5RbjywRzHKBmBE7ry4/history?cluster=mainnet-beta) | 0.3.0 | 37 |
| Heaven | DEX | [`HEAVENoP2qxoeuF8Dj2oT1GHEnu49U5mJYkdeC8BAX2o`](https://orb.helius.dev/address/HEAVENoP2qxoeuF8Dj2oT1GHEnu49U5mJYkdeC8BAX2o/history?cluster=mainnet-beta) | 0.2.0 | 54 |
| Drift | V2 Perpetual | [`dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH`](https://orb.helius.dev/address/dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH/history?cluster=mainnet-beta) | 2.143.0 | 344 |
| Obric | V2 | [`obriQD1zbpyLz95G5n7nJe6a4DPjpFwa5XYPoNm113y`](https://orb.helius.dev/address/obriQD1zbpyLz95G5n7nJe6a4DPjpFwa5XYPoNm113y/history?cluster=mainnet-beta) | 0.1.0 | 22 |
| TON Whales | Holders | [`6bES2dKy1ee13HQ4uW4ycw4Kw4od9ziZeWMyAxVySYEd`](https://orb.helius.dev/address/6bES2dKy1ee13HQ4uW4ycw4Kw4od9ziZeWMyAxVySYEd/history?cluster=mainnet-beta) | 1.0.0 | 27 |
| Magic Eden | Marketplace V2 | [`M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K`](https://orb.helius.dev/address/M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K/history?cluster=mainnet-beta) | 0.1.0 | 40 |
| Tensor | NFT AMM | [`TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN`](https://orb.helius.dev/address/TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN/history?cluster=mainnet-beta) | 3.1.0 | 39 |
| Metaplex | Token Metadata | [`metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`](https://orb.helius.dev/address/metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s/history?cluster=mainnet-beta) | 1.14.0 | 201 |
| Metaplex | Candy Machine | [`cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ`](https://orb.helius.dev/address/cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ/history?cluster=mainnet-beta) | 4.6.0 | 52 |
| Metaplex | Fixed Price Sale | [`SaLeTjyUa5wXHnGuewUSyJ5JWZaHwz3TxqUntCE9czo`](https://orb.helius.dev/address/SaLeTjyUa5wXHnGuewUSyJ5JWZaHwz3TxqUntCE9czo/history?cluster=mainnet-beta) | 0.4.0 | 46 |
| Metaplex | Auction House | [`hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk`](https://orb.helius.dev/address/hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk/history?cluster=mainnet-beta) | 1.0.0 | 44 |
| Metaplex | Bubblegum (cNFT) | [`BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY`](https://orb.helius.dev/address/BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY/history?cluster=mainnet-beta) | 0.12.0 | 40 |
| Metaplex | NFT Packs | [`packFeFNZzMfD9aVWL7QbGz1WcU7R9zpf6pvNsw2BLu`](https://orb.helius.dev/address/packFeFNZzMfD9aVWL7QbGz1WcU7R9zpf6pvNsw2BLu/history?cluster=mainnet-beta) | 0.1.0 | 40 |
| Metaplex | Hydra | [`hyDQ4Nz1eYyegS6JfenyKwKzYxRsCWCriYSAjtzP4Vg`](https://orb.helius.dev/address/hyDQ4Nz1eYyegS6JfenyKwKzYxRsCWCriYSAjtzP4Vg/history?cluster=mainnet-beta) | 0.4.1 | 25 |
| Metaplex | Token Entangler | [`qntmGodpGkrM42mN68VCZHXnKqDCT8rdY23wFcXCLPd`](https://orb.helius.dev/address/qntmGodpGkrM42mN68VCZHXnKqDCT8rdY23wFcXCLPd/history?cluster=mainnet-beta) | 0.2.0 | 16 |
| Metaplex | Auctioneer | [`neer8g6yJq2mQM6KbnViEDAD4gr3gRZyMMf4F2p3MEh`](https://orb.helius.dev/address/neer8g6yJq2mQM6KbnViEDAD4gr3gRZyMMf4F2p3MEh/history?cluster=mainnet-beta) | 0.2.1 | 10 |
| Solana | SPL Token | [`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`](https://orb.helius.dev/address/TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA/history?cluster=mainnet-beta) | 1.0.0 | 20 |
| Solana | Token-2022 | [`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`](https://orb.helius.dev/address/TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb/history?cluster=mainnet-beta) | 1.0.0 | 20 |
| Solana | SPL Token Swap | [`SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8`](https://orb.helius.dev/address/SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8/history?cluster=mainnet-beta) | 3.0.0 | 29 |
| Anchor | Framework | `*` (any Anchor program) | 0.30.1 | 59 |

**Total**: 41 protocols, **1,914 error definitions**

## Installation

```bash
npm install solana-idls
```

## Quick Start

```typescript
import { registry } from 'solana-idls';

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
import { registry } from 'solana-idls';

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

### Releasing

```bash
# 1. Create changeset (or manually create .changeset/*.md file)
pnpm changeset

# 2. Update version and generate CHANGELOG
pnpm changeset version

# 3. Build and publish to npm (creates git tags)
pnpm build

# 4. Commit version changes
git add -A && git commit -m "chore: version packages"

# 5. Publish changeset
pnpm changeset publish

# 6. Push version commit
git push --follow-tags

# 7. Create GitHub release with auto-generated notes
gh release create "v$(node -p "require('./package.json').version")" --generate-notes
```

## Contributing

1. Fork the repo: https://github.com/tenequm/solana-idls
2. Add protocol to `src/protocols.config.ts`
3. Run `pnpm generate && pnpm build`
4. Create pull request

Ensure IDLs are from official sources (GitHub or on-chain).

## License

MIT © [Obsidian Debug Team]
