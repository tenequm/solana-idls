# @obsidian-debug/solana-errors

> Comprehensive Solana error code database covering runtime, Anchor, and popular programs

[![npm version](https://img.shields.io/npm/v/@obsidian-debug/solana-errors.svg)](https://www.npmjs.com/package/@obsidian-debug/solana-errors)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

A comprehensive, type-safe error code database for Solana development. This package provides human-readable error names, descriptions, and debugging tips for:

- **Solana Runtime Errors**: Core blockchain errors
- **Anchor Framework**: All Anchor program errors (100-6000 range)
- **Popular Programs**: Raydium, Jupiter, Orca, Metaplex, SPL Token
- **Error Patterns**: Common scenarios with debugging tips

## Installation

```bash
npm install @obsidian-debug/solana-errors
# or
pnpm add @obsidian-debug/solana-errors
# or
yarn add @obsidian-debug/solana-errors
```

## Quick Start

```typescript
import { resolveErrorCode, matchErrorPattern } from '@obsidian-debug/solana-errors';

// Resolve a numeric error code
const error = resolveErrorCode(2006, 'Anchor');
console.log(error);
// {
//   name: 'AccountNotInitialized',
//   description: 'The program expected this account to be already initialized',
//   category: 'Account',
//   debugTip: 'Verify account initialization order'
// }

// Match error text to common patterns
const pattern = matchErrorPattern('compute budget exceeded');
console.log(pattern);
// {
//   category: 'Resource Limits',
//   likelyReason: 'Transaction consumed more than 200k compute units...',
//   quickFix: 'Add ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 })',
//   severity: 'high'
// }
```

## Features

### 🎯 Comprehensive Coverage

- **1000+ error codes** mapped across Solana ecosystem
- Covers Anchor, Raydium, Jupiter, Orca, Metaplex, and more
- Regular updates as new programs emerge

### 🔍 Smart Error Resolution

```typescript
import { resolveErrorCode, PROGRAM_ERROR_CODES } from '@obsidian-debug/solana-errors';

// Resolve by program and code
const anchorError = resolveErrorCode(2006, 'Anchor');
const raydiumError = resolveErrorCode(1, 'Raydium');

// Or access directly
const allAnchorErrors = PROGRAM_ERROR_CODES.Anchor;
```

### 🛠️ Pattern Matching

```typescript
import { matchErrorPattern, getCategoryDebugTips } from '@obsidian-debug/solana-errors';

// Match error text
const pattern = matchErrorPattern('blockhash not found');
console.log(pattern.quickFix);

// Get all tips for a category
const tips = getCategoryDebugTips('Resource Limits');
```

### ✅ Signature Validation

```typescript
import { isValidSignature } from '@obsidian-debug/solana-errors';

const valid = isValidSignature('5KxR...abc'); // true/false
```

## API Reference

### Core Functions

#### `resolveErrorCode(code: number, programType?: string): ErrorInfo | null`

Resolves a numeric error code to detailed error information.

**Parameters:**
- `code`: The numeric error code
- `programType`: Optional program identifier ('Anchor', 'Raydium', 'Jupiter', etc.)

**Returns:** ErrorInfo object or null if not found

```typescript
const error = resolveErrorCode(3012);
// {
//   name: 'ConstraintMut',
//   description: 'A mut constraint was violated',
//   category: 'Constraint',
//   debugTip: 'Check account is passed as mutable'
// }
```

#### `matchErrorPattern(errorText: string): ErrorPattern | null`

Matches error text against common patterns.

**Parameters:**
- `errorText`: The error message text

**Returns:** ErrorPattern object or null

```typescript
const pattern = matchErrorPattern('transaction too large');
console.log(pattern.severity); // 'high'
```

#### `getCategoryDebugTips(category: string): string[]`

Gets all debugging tips for a specific error category.

### Type Definitions

```typescript
interface ErrorInfo {
  name: string;
  description: string;
  category?: string;
  debugTip?: string;
}

interface ErrorPattern {
  keywords: string[];
  category: string;
  likelyReason: string;
  quickFix: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}
```

### Exported Constants

```typescript
import {
  SOLANA_ERRORS,          // Core Solana runtime errors
  ANCHOR_ERRORS,          // Anchor Framework errors
  RAYDIUM_AMM_ERRORS,     // Raydium AMM errors
  SPL_TOKEN_ERRORS,       // SPL Token program errors
  JUPITER_ERRORS,         // Jupiter aggregator errors
  ORCA_WHIRLPOOLS_ERRORS, // Orca Whirlpools errors
  METAPLEX_CANDY_MACHINE_ERRORS, // Metaplex Candy Machine
  MPL_CORE_ERRORS,        // Metaplex Core errors
  ERROR_PATTERNS,         // Common error patterns
  PROGRAM_ERROR_CODES     // All programs combined
} from '@obsidian-debug/solana-errors';
```

## Usage Examples

### Transaction Error Debugging

```typescript
import { resolveErrorCode, matchErrorPattern } from '@obsidian-debug/solana-errors';

async function debugTransaction(signature: string) {
  const tx = await connection.getTransaction(signature);

  if (tx?.meta?.err) {
    const errorCode = extractErrorCode(tx.meta.err);
    const errorInfo = resolveErrorCode(errorCode);

    console.log(`Error: ${errorInfo.name}`);
    console.log(`Tip: ${errorInfo.debugTip}`);

    // Also check for pattern matches
    const pattern = matchErrorPattern(tx.meta.logMessages?.join(' '));
    if (pattern) {
      console.log(`Quick Fix: ${pattern.quickFix}`);
    }
  }
}
```

### Custom Error Handler

```typescript
import { resolveErrorCode, ERROR_PATTERNS } from '@obsidian-debug/solana-errors';

class SolanaErrorHandler {
  static format(error: any): string {
    const code = this.extractCode(error);
    const info = resolveErrorCode(code);

    if (info) {
      return `${info.name}: ${info.description}\n💡 ${info.debugTip}`;
    }

    return error.toString();
  }

  static getSuggestions(errorText: string): string[] {
    return ERROR_PATTERNS
      .filter(p => p.keywords.some(k => errorText.includes(k)))
      .map(p => p.quickFix);
  }
}
```

### IDE Integration

```typescript
import { ANCHOR_ERRORS } from '@obsidian-debug/solana-errors';

// Generate autocomplete data
const anchorErrorList = Object.entries(ANCHOR_ERRORS).map(([code, info]) => ({
  code: Number(code),
  label: info.name,
  documentation: `${info.description}\n\n${info.debugTip || ''}`
}));
```

## Coverage

| Category | Count | Examples |
|----------|-------|----------|
| Solana Runtime | 15 | InsufficientFunds, InvalidAccountData |
| Anchor Framework | 50+ | ConstraintMut, AccountNotInitialized |
| Raydium AMM | 20+ | InvalidOwner, InvalidAccountOwner |
| Jupiter | 10+ | SlippageExceeded, InvalidRoute |
| Orca Whirlpools | 15+ | InvalidSqrtPriceLimitDirection |
| Metaplex | 30+ | CandyMachineEmpty, InvalidMintAuthority |
| SPL Token | 25+ | InsufficientFunds, OwnerMismatch |

## Contributing

We welcome contributions! This database grows with the Solana ecosystem.

### Adding New Errors

1. Fork the repository
2. Add error codes to appropriate file in `src/`
3. Follow the `ErrorInfo` interface
4. Submit a pull request

### Updating Patterns

Found a common error scenario not covered? Add it to `error-patterns.ts`:

```typescript
{
  keywords: ['your', 'error', 'keywords'],
  category: 'Category Name',
  likelyReason: 'Why this happens...',
  quickFix: 'How to fix it...',
  severity: 'high'
}
```

## Development

```bash
# Clone the repo
git clone https://github.com/tenequm/obsidian-protocol

# Install dependencies
pnpm install

# Build the package
pnpm --filter @obsidian-debug/solana-errors build

# Run type checks
pnpm --filter @obsidian-debug/solana-errors type-check
```

## License

MIT © [Obsidian Debug Team]

## Acknowledgments

- Error data sourced from official documentation:
  - [Anchor Framework](https://github.com/coral-xyz/anchor)
  - [Solana Labs](https://github.com/solana-labs/solana)
  - [Raydium](https://github.com/raydium-io/raydium-amm)
  - [Jupiter](https://station.jup.ag/)
  - [Orca](https://github.com/orca-so/whirlpools)
  - [Metaplex](https://github.com/metaplex-foundation)

## Related Projects

- [Obsidian Debug](https://github.com/tenequm/obsidian-protocol) - AI-powered Solana transaction debugger
- [Solana Cookbook](https://solanacookbook.com/) - Developer resources for Solana

---

**Built for the Solana community** 🌊

Issues? [Report them here](https://github.com/tenequm/obsidian-protocol/issues)
