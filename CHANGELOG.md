# solana-idls

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
