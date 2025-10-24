/**
 * Common Solana error patterns and scenarios
 * Used to provide additional context and debugging tips for frequently encountered errors
 */

export interface ErrorPattern {
  keywords: string[];
  category: string;
  likelyReason: string;
  quickFix: string;
  severity: "critical" | "high" | "medium" | "low";
}

/**
 * Common error patterns extracted from real-world Solana debugging scenarios
 * Sources: Community reports, Stack Exchange, developer blogs
 */
export const ERROR_PATTERNS: ErrorPattern[] = [
  // Resource & Compute Errors
  {
    keywords: ["compute", "budget", "exceeded", "units"],
    category: "Resource Limits",
    likelyReason:
      "Transaction consumed more than 200k compute units (default limit). Heavy CPIs, large loops, or complex account processing exceeded the budget.",
    quickFix:
      "Add ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }) before your instruction. For heavy operations, consider splitting into multiple transactions.",
    severity: "high",
  },
  {
    keywords: ["transaction", "too", "large", "1232", "bytes"],
    category: "Transaction Size",
    likelyReason:
      "Transaction exceeds 1232-byte limit, typically from too many accounts or large instruction data.",
    quickFix:
      "Use Address Lookup Tables (ALTs) to compress account addresses, or split the operation across multiple transactions with a progress PDA.",
    severity: "high",
  },
  {
    keywords: ["account", "data", "too", "small", "space", "insufficient"],
    category: "Account Space",
    likelyReason:
      "Account doesn't have enough allocated space for the data being written. Initial allocation was too small or realloc is needed.",
    quickFix:
      "Calculate required space: 8 (discriminator) + struct_size + future_padding. Use realloc instruction if supported, or recreate account with correct space.",
    severity: "medium",
  },

  // Timing & Blockhash Errors
  {
    keywords: ["blockhash", "not", "found", "expired", "recent"],
    category: "Transaction Timing",
    likelyReason:
      "Transaction used a blockhash that's >150 blocks old (~90 seconds). Slow signing, network delays, or retry without refresh caused expiration.",
    quickFix:
      "Fetch fresh blockhash immediately before sending: await connection.getLatestBlockhash(). For batching, implement just-in-time blockhash refresh.",
    severity: "high",
  },
  {
    keywords: ["account", "in", "use", "locked", "concurrent"],
    category: "Concurrency",
    likelyReason:
      "Account is locked by another in-flight transaction during high network activity. Multiple transactions targeting same account.",
    quickFix:
      "Implement exponential backoff retry (100ms, 200ms, 400ms). For parallel operations, use different accounts or serialize writes.",
    severity: "medium",
  },

  // PDA & Seeds Errors
  {
    keywords: ["seeds", "constraint", "violated", "pda", "derivation"],
    category: "PDA Derivation",
    likelyReason:
      "Seeds used to derive PDA don't match on-chain account. Common causes: wrong seed order, incorrect bump, or seed value mismatch.",
    quickFix:
      "Centralize PDA derivation in helper function. Verify: 1) Seed order matches program, 2) Bump is stored/used correctly, 3) Seed values are exact.",
    severity: "critical",
  },
  {
    keywords: ["invalid", "seeds", "max", "length", "exceeded"],
    category: "PDA Seeds",
    likelyReason:
      "Total seed length exceeds 32 bytes per seed, or PDA derivation produces invalid address (rare).",
    quickFix:
      "Use hashed values for long seeds: sha256(long_string).slice(0,32). Verify seeds total ≤32 bytes each.",
    severity: "medium",
  },

  // Signature & Authority Errors
  {
    keywords: ["missing", "required", "signature", "signer"],
    category: "Signatures",
    likelyReason:
      "Required signer didn't sign transaction. Either user account or PDA authority missing from signers list.",
    quickFix:
      "For user: mark account as signer in instruction. For PDA: use CpiContext::new_with_signer() with correct seeds and bump.",
    severity: "critical",
  },
  {
    keywords: ["signature", "verification", "failed"],
    category: "Signatures",
    likelyReason:
      "Invalid signature or signer/account mismatch. Serialization issue or wrong keypair used.",
    quickFix:
      "Verify correct keypair is signing. Check transaction was built with proper fee payer and signers array.",
    severity: "critical",
  },

  // Account & Ownership Errors
  {
    keywords: ["account", "not", "found", "does", "not", "exist"],
    category: "Account Existence",
    likelyReason:
      "Referenced account doesn't exist on-chain. Common in DeFi when Associated Token Accounts (ATA) haven't been created yet.",
    quickFix:
      "Check account exists with connection.getAccountInfo(). For token accounts, create ATA first with createAssociatedTokenAccountInstruction().",
    severity: "high",
  },
  {
    keywords: ["owner", "mismatch", "illegal", "owner", "incorrect", "owner"],
    category: "Account Ownership",
    likelyReason:
      "Account owner doesn't match instruction expectations. Wrong program owns the account or token account belongs to different mint.",
    quickFix:
      "Validate account ownership before CPI: require_keys_eq!(account.owner, expected_program). For tokens, verify mint matches expected token.",
    severity: "high",
  },
  {
    keywords: ["discriminator", "mismatch", "wrong", "account", "type"],
    category: "Account Type",
    likelyReason:
      "8-byte discriminator doesn't match expected account type. Wrong PDA or account passed to instruction.",
    quickFix:
      "Verify correct PDA derivation and that account matches expected struct type. Check seeds produce correct address.",
    severity: "high",
  },

  // Rent & Funding Errors
  {
    keywords: ["rent", "exempt", "insufficient", "lamports"],
    category: "Rent Exemption",
    likelyReason:
      "Account doesn't have enough lamports to be rent-exempt for its size. Calculation was wrong or account needs top-up after realloc.",
    quickFix:
      "Calculate exact rent: await connection.getMinimumBalanceForRentExemption(space). For realloc, transfer additional lamports to cover new size.",
    severity: "medium",
  },
  {
    keywords: ["insufficient", "funds", "balance", "too", "low"],
    category: "Insufficient Funds",
    likelyReason:
      "Account lacks lamports/tokens for operation. Could be fee payer, user wallet, or liquidity pool.",
    quickFix:
      "Check balances: connection.getBalance() for SOL, getTokenAccountBalance() for tokens. For pools, verify sufficient liquidity for trade size.",
    severity: "high",
  },

  // DeFi-Specific Errors
  {
    keywords: ["slippage", "exceeded", "tolerance", "price", "impact"],
    category: "DeFi - Slippage",
    likelyReason:
      "Actual swap output fell below minimum specified. Price moved during transaction submission or volatility exceeded tolerance.",
    quickFix:
      "Increase slippage tolerance: 0.5-1% for volatile pairs, 0.1-0.3% for stablecoins. Or split large trades to reduce price impact.",
    severity: "medium",
  },
  {
    keywords: ["liquidity", "insufficient", "pool", "empty"],
    category: "DeFi - Liquidity",
    likelyReason:
      "Pool doesn't have enough tokens for requested trade size. Low liquidity or large trade relative to pool depth.",
    quickFix:
      "Reduce trade size or use aggregator (Jupiter, 1inch) to route through multiple pools. Check pool reserves before trading.",
    severity: "medium",
  },
  {
    keywords: ["swap", "route", "not", "available", "path"],
    category: "DeFi - Routing",
    likelyReason:
      "No viable swap route found for token pair. Exotic tokens or fragmented liquidity across DEXes.",
    quickFix:
      "Use Jupiter aggregator for best routing. For new tokens, verify pools exist on Raydium/Orca. Consider multi-hop: TOKEN → SOL → TARGET.",
    severity: "low",
  },

  // CPI & Instruction Errors
  {
    keywords: ["cpi", "depth", "exceeded", "call", "chain"],
    category: "CPI Depth",
    likelyReason:
      "Cross-program invocation nesting exceeded 4 levels. Too many nested CPIs in instruction execution.",
    quickFix:
      "Simplify program architecture: reduce CPI chain depth. Or split complex flow into multiple user-signed transactions.",
    severity: "medium",
  },
  {
    keywords: ["instruction", "data", "invalid", "deserialize", "format"],
    category: "Instruction Format",
    likelyReason:
      "Instruction data format is wrong, serialization mismatch, or program interface version mismatch between client and deployed program.",
    quickFix:
      "Regenerate types from current IDL: anchor build && anchor idl update. Verify client SDK version matches deployed program.",
    severity: "high",
  },

  // Priority & Network Errors
  {
    keywords: ["priority", "fee", "too", "low", "congestion"],
    category: "Network Congestion",
    likelyReason:
      "Priority fee below current market rate during network congestion. Transaction getting dropped or delayed.",
    quickFix:
      "Increase priority fee: ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }). Use dynamic fee estimation from recent blocks.",
    severity: "low",
  },
];

/**
 * Match error logs against known patterns
 * Returns the most relevant pattern based on keyword matching
 */
export function matchErrorPattern(errorText: string): ErrorPattern | null {
  const lowerText = errorText.toLowerCase();
  let bestMatch: { pattern: ErrorPattern; score: number } | null = null;

  for (const pattern of ERROR_PATTERNS) {
    let matchCount = 0;
    for (const keyword of pattern.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    // Calculate match score (percentage of keywords matched)
    const score = matchCount / pattern.keywords.length;

    // Require at least 50% of keywords to match
    if (score >= 0.5 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { pattern, score };
    }
  }

  return bestMatch?.pattern || null;
}

/**
 * Get debugging tips based on error category
 */
export function getCategoryDebugTips(category: string): string[] {
  const tips: Record<string, string[]> = {
    "Anchor Framework": [
      "Check account constraints in #[account(...)] macro",
      "Verify PDA derivation seeds match program logic",
      "Ensure all required signers are included",
    ],
    Constraint: [
      "Review has_one, seeds, and signer constraints",
      "Validate account relationships in instruction",
      "Check mut requirements match actual usage",
    ],
    Account: [
      "Verify account discriminator matches expected type",
      "Check account ownership and initialization status",
      "Ensure correct account ordering in instruction",
    ],
    "Resource Limits": [
      "Profile compute usage with transaction logs",
      "Add ComputeBudgetProgram instructions",
      "Consider splitting heavy operations",
    ],
    "PDA Derivation": [
      "Centralize PDA logic in helper functions",
      "Log seed values to verify correctness",
      "Store and reuse bump seeds",
    ],
  };

  return tips[category] || [];
}
