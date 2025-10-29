# solana-idls

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
