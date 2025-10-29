# solana-idls

## 1.2.1

### Patch Changes

- Enhanced TypeScript type safety for IDL exports

  - All IDL exports now properly typed as `Idl` from `@coral-xyz/anchor`
  - Eliminates need for `as any` casting when using with parser libraries
  - Improved example patterns with specific type assertions
  - Updated documentation for peer dependency usage
  - Better IntelliSense support for transaction parser integration

## 1.2.0

### Minor Changes

- ## New Features

  ### Examples Directory

  Added three practical examples showing real-world usage patterns:

  - **Basic Usage** - Direct IDL imports and inspection
  - **Error Lookup** - Resolving error codes to human-readable messages
  - **Transaction Parsing** - Integration with DeBridge parser for semantic transaction decoding

  This makes the library immediately usable for new developers without reading extensive docs.

  ### Direct IDL Exports

  All 41 protocol IDLs are now exported as individual constants alongside their program IDs:

  ```typescript
  import { JUPITER_IDL, JUPITER_PROGRAM_ID } from "solana-idls";
  ```

  This enables direct integration with transaction parsers and custom tooling without going through the registry.

  ### Optional Peer Dependency

  Added `@coral-xyz/anchor` as an optional peer dependency for proper TypeScript types on IDL exports, while keeping the library lightweight for consumers who don't need Anchor.

  ## Developer Experience

  ### Build Improvements

  - Migrated from tsup to tsdown for better library output and smaller bundle sizes
  - Added Biome for fast linting and formatting
  - Added `prepublishOnly` hook to ensure fresh builds

  ### Documentation

  - Updated README with practical "Quick Start" showing direct IDL usage (what most developers actually need)
  - Added Examples section with links to working code
  - All examples are type-checked via workspace setup

  ## Breaking Changes

  None - fully backward compatible.

  ## Migration Guide

  No migration needed. Existing code continues to work. New IDL exports are additive features.

## 1.1.0

### Minor Changes

- Update 7 protocol IDLs to latest on-chain versions, add version tracking, and setup automated releases

  **IDL Updates:**

  - Orca Whirlpools: v0.3.6 (+9 errors)
  - Meteora DLMM: v0.10.0 (+27 errors)
  - Meteora AMM: v0.5.3 (+9 errors)
  - Meteora CP AMM: v0.1.5 (+11 errors)
  - Drift V2: v2.143.0 (+35 errors)
  - Tensor: v3.1.0 (+37 errors)
  - Metaplex Hydra: v0.4.1

  **Improvements:**

  - Added version column to README protocol table for transparency
  - Total error coverage increased from 1,786 to 1,914 (+128 errors)
  - Added `packageManager` field to package.json (pnpm@10.20.0)
  - Configured GitHub Actions workflow for automated releases with changesets
  - All IDLs verified against official on-chain/GitHub sources

  **Infrastructure:**

  - Automated CI/CD pipeline with changesets
  - GitHub Releases created automatically on publish
  - npm publishing automated via GitHub Actions

## 1.0.0

### Major Changes

- Initial standalone release - extracted from @obsidian-debug/solana-errors monorepo package

  ## Breaking Changes

  - Package renamed: `@obsidian-debug/solana-errors` → `solana-idls`
  - Now published as standalone repository (was monorepo package)
  - Users must update imports: `from "@obsidian-debug/solana-errors"` → `from "solana-idls"`

  ## Features

  - ✅ 1,786 error definitions from 41 Solana protocols
  - ✅ Error resolution API (`registry.resolve()`)
  - ✅ Instruction resolution with discriminators (`registry.resolveInstruction()`)
  - ✅ Account metadata with semantic names from IDLs
  - ✅ Program name resolution (`registry.getByProgramId()`)
  - ✅ Hierarchical fallback (program-specific → Anchor framework)
  - ✅ Full TypeScript support with immutable types
  - ✅ Zero configuration required

  ## Protocol Coverage

  - **DeFi & Swaps:** Jupiter, Raydium, Meteora, Orca, Phoenix, OpenBook, Serum (526 errors)
  - **Meme Tokens:** Pump.fun, Moonshot, Boop, Heaven, BonkSwap (222 errors)
  - **NFT Ecosystem:** Metaplex suite - Token Metadata, Candy Machine, Bubblegum, etc. (604 errors)
  - **Infrastructure:** SPL Token, Token-2022, Drift, Anchor Framework (434 errors)

  ## Improvements

  - Normalized IDL filenames for consistency (`spl-token-2022`, `magiceden-v2`)
  - Added comprehensive documentation and usage examples
  - Integrated changesets for better release management
