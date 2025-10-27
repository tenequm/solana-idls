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

## Supported Programs

| Protocol | Errors | Source |
|----------|--------|--------|
| [Jupiter Aggregator v6](https://jup.ag) | 18 | GitHub IDL |
| [Orca Whirlpools](https://www.orca.so) | 56 | On-chain IDL |
| [Raydium AMM V4](https://raydium.io) | 57 | GitHub IDL |
| [Raydium AMM V3 (CLMM)](https://raydium.io) | 45 | GitHub IDL |
| [Raydium CP Swap](https://raydium.io) | 11 | GitHub IDL |
| [TON Whales Holders](https://solscan.io/account/6bES2dKy1ee13HQ4uW4ycw4Kw4od9ziZeWMyAxVySYEd) | 27 | On-chain IDL |
| [Magic Eden V2](https://magiceden.io) | 40 | On-chain IDL |
| [Tensor](https://tensor.trade) | 2 | On-chain IDL |
| [Metaplex Auction House](https://www.metaplex.com) | 44 | On-chain IDL |
| [SPL Token Program](https://spl.solana.com/token) | 20 | GitHub IDL |
| [Token-2022 Program](https://spl.solana.com/token-2022) | 20 | GitHub IDL |
| **+ Anchor Framework** | **59** | Manual |
| **Total** | **399** | — |

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
    fetchSource: "github", // or "anchor" for on-chain
    githubUrl: "https://raw.githubusercontent.com/.../idl.json",
    displayName: "My Protocol",
    version: "1.0.0",
  },
] as const;
```

2. Run generation:

```bash
pnpm generate  # Fetches IDL and auto-generates registration code
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

## Contributing

1. Fork the repo
2. Add protocol to `src/protocols.config.ts`
3. Run `pnpm generate && pnpm build`
4. Create pull request

Ensure IDLs are from official sources (GitHub or on-chain).

## License

MIT © [Obsidian Debug Team]
