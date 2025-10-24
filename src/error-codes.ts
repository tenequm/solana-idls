/**
 * Comprehensive Solana and program-specific error code mappings
 * Used to translate hex error codes into human-readable names and descriptions
 *
 * Sources:
 * - Anchor Framework: https://github.com/coral-xyz/anchor
 * - Solana Runtime: https://github.com/solana-labs/solana
 * - Raydium AMM: https://github.com/raydium-io/raydium-amm
 * - Metaplex: https://github.com/metaplex-foundation
 */

export interface ErrorInfo {
  name: string;
  description: string;
  category?: string;
  debugTip?: string;
}

/**
 * Common Solana runtime/builtin errors
 */
export const SOLANA_ERRORS: Record<number, ErrorInfo> = {
  0: { name: "Success", description: "Operation completed successfully" },
  1: {
    name: "CustomZero",
    description: "Custom program error (check program logs for details)",
  },
  2: { name: "InvalidArgument", description: "Invalid instruction arguments" },
  3: {
    name: "InvalidInstructionData",
    description: "Invalid instruction data contents",
  },
  4: {
    name: "InvalidAccountData",
    description: "Invalid account data contents",
  },
  5: {
    name: "AccountDataTooSmall",
    description: "Account data insufficient size for operation",
  },
  6: {
    name: "InsufficientFunds",
    description: "Account balance too low for operation",
  },
  7: {
    name: "IncorrectProgramId",
    description: "Account lacks expected program ID",
  },
  8: {
    name: "MissingRequiredSignature",
    description: "Required signature absent from transaction",
  },
  9: {
    name: "AccountAlreadyInitialized",
    description: "Account already initialized, cannot reinitialize",
  },
  10: {
    name: "UninitializedAccount",
    description: "Account not yet initialized",
  },
  11: {
    name: "NotEnoughAccountKeys",
    description: "Insufficient account keys provided to instruction",
  },
  12: {
    name: "AccountBorrowFailed",
    description: "Account borrow failed (internal Solana error)",
  },
  13: {
    name: "MaxSeedLengthExceeded",
    description: "Seed too long for PDA address derivation (max 32 bytes)",
  },
  14: {
    name: "InvalidSeeds",
    description: "Seeds don't produce valid address for PDA derivation",
  },
};

/**
 * Anchor Framework errors (100-5000 range)
 * Most common errors for Anchor-based programs
 */
export const ANCHOR_ERRORS: Record<number, ErrorInfo> = {
  // Instruction errors (100-103)
  100: {
    name: "InstructionMissing",
    description: "8 byte instruction identifier not provided",
    category: "Instruction",
    debugTip: "Ensure instruction data includes discriminator",
  },
  101: {
    name: "InstructionFallbackNotFound",
    description: "Fallback functions are not supported",
    category: "Instruction",
  },
  102: {
    name: "InstructionDidNotDeserialize",
    description: "The program could not deserialize the given instruction",
    category: "Instruction",
    debugTip: "Verify instruction format matches IDL definition",
  },
  103: {
    name: "InstructionDidNotSerialize",
    description: "The program could not serialize the given instruction",
    category: "Instruction",
  },

  // IDL Instruction errors (1000-1001)
  1000: {
    name: "IdlInstructionStub",
    description: "The program was compiled without IDL instructions",
    category: "IDL",
  },
  1001: {
    name: "IdlInstructionInvalidProgram",
    description: "Invalid program given to the IDL instruction",
    category: "IDL",
  },

  // Constraint errors (2000-2019)
  2000: {
    name: "ConstraintMut",
    description: "A mut constraint was violated",
    category: "Constraint",
    debugTip: "Account must be marked as mutable in instruction",
  },
  2001: {
    name: "ConstraintHasOne",
    description: "A has_one constraint was violated",
    category: "Constraint",
    debugTip: "Check that account relationship fields match",
  },
  2002: {
    name: "ConstraintSigner",
    description: "A signer constraint was violated",
    category: "Constraint",
    debugTip: "Account must sign the transaction",
  },
  2003: {
    name: "ConstraintRaw",
    description: "A raw constraint was violated",
    category: "Constraint",
  },
  2004: {
    name: "ConstraintOwner",
    description: "An owner constraint was violated",
    category: "Constraint",
    debugTip: "Account owner doesn't match expected program",
  },
  2005: {
    name: "ConstraintRentExempt",
    description: "A rent exemption constraint was violated",
    category: "Constraint",
    debugTip: "Account needs more lamports to be rent-exempt",
  },
  2006: {
    name: "ConstraintSeeds",
    description: "A seeds constraint was violated",
    category: "Constraint",
    debugTip: "PDA seeds don't match - verify seed order, values, and bump",
  },
  2007: {
    name: "ConstraintExecutable",
    description: "An executable constraint was violated",
    category: "Constraint",
  },
  2008: {
    name: "ConstraintState",
    description: "A state constraint was violated",
    category: "Constraint",
  },
  2009: {
    name: "ConstraintAssociated",
    description: "An associated constraint was violated",
    category: "Constraint",
  },
  2010: {
    name: "ConstraintAssociatedInit",
    description: "An associated init constraint was violated",
    category: "Constraint",
  },
  2011: {
    name: "ConstraintClose",
    description: "A close constraint was violated",
    category: "Constraint",
  },
  2012: {
    name: "ConstraintAddress",
    description: "An address constraint was violated",
    category: "Constraint",
    debugTip: "Account address doesn't match expected value",
  },
  2013: {
    name: "ConstraintZero",
    description: "Expected zero account discriminant",
    category: "Constraint",
  },
  2014: {
    name: "ConstraintTokenMint",
    description: "A token mint constraint was violated",
    category: "Constraint",
  },
  2015: {
    name: "ConstraintTokenOwner",
    description: "A token owner constraint was violated",
    category: "Constraint",
  },
  2016: {
    name: "ConstraintMintMintAuthority",
    description: "A mint mint authority constraint was violated",
    category: "Constraint",
  },
  2017: {
    name: "ConstraintMintFreezeAuthority",
    description: "A mint freeze authority constraint was violated",
    category: "Constraint",
  },
  2018: {
    name: "ConstraintMintDecimals",
    description: "A mint decimals constraint was violated",
    category: "Constraint",
  },
  2019: {
    name: "ConstraintSpace",
    description: "A space constraint was violated",
    category: "Constraint",
    debugTip: "Account doesn't have enough space allocated",
  },

  // Account errors (3000-3014)
  3000: {
    name: "AccountDiscriminatorAlreadySet",
    description: "The account discriminator was already set on this account",
    category: "Account",
  },
  3001: {
    name: "AccountDiscriminatorNotFound",
    description: "No 8 byte discriminator was found on the account",
    category: "Account",
  },
  3002: {
    name: "AccountDiscriminatorMismatch",
    description: "8 byte discriminator did not match what was expected",
    category: "Account",
    debugTip: "Wrong account type passed - verify you're passing correct PDA",
  },
  3003: {
    name: "AccountDidNotDeserialize",
    description: "Failed to deserialize the account",
    category: "Account",
    debugTip: "Account data format doesn't match expected struct",
  },
  3004: {
    name: "AccountDidNotSerialize",
    description: "Failed to serialize the account",
    category: "Account",
  },
  3005: {
    name: "AccountNotEnoughKeys",
    description: "Not enough account keys given to the instruction",
    category: "Account",
  },
  3006: {
    name: "AccountNotMutable",
    description: "The given account is not mutable",
    category: "Account",
    debugTip: "Account must be writable for this operation",
  },
  3007: {
    name: "AccountNotProgramOwned",
    description: "The given account is not owned by the executing program",
    category: "Account",
  },
  3008: {
    name: "InvalidProgramId",
    description: "Program ID was not as expected",
    category: "Account",
  },
  3009: {
    name: "InvalidProgramExecutable",
    description: "Program account is not executable",
    category: "Account",
  },
  3010: {
    name: "AccountNotSigner",
    description: "The given account did not sign",
    category: "Account",
    debugTip: "Account must be a signer for this transaction",
  },
  3011: {
    name: "AccountNotSystemOwned",
    description: "The given account is not owned by the system program",
    category: "Account",
  },
  3012: {
    name: "AccountNotInitialized",
    description: "The program expected this account to be already initialized",
    category: "Account",
    debugTip: "Account must be initialized before use",
  },
  3013: {
    name: "AccountNotProgramData",
    description: "The given account is not a program data account",
    category: "Account",
  },
  3014: {
    name: "AccountNotAssociatedTokenAccount",
    description: "The given account is not the associated token account",
    category: "Account",
  },

  // State errors (4000)
  4000: {
    name: "StateInvalidAddress",
    description: "The given state account does not have the correct address",
    category: "State",
  },

  // Deprecated (5000)
  5000: {
    name: "Deprecated",
    description:
      "The API being used is deprecated and should no longer be used",
    category: "Deprecated",
  },
};

/**
 * Raydium AMM V4 error codes
 * Source: https://github.com/raydium-io/raydium-amm/blob/master/program/src/error.rs
 */
export const RAYDIUM_AMM_ERRORS: Record<number, ErrorInfo> = {
  0: {
    name: "AlreadyInUse",
    description: "Account cannot be initialized as it's already in use",
  },
  1: {
    name: "InvalidProgramAddress",
    description: "Program address provided doesn't match generated value",
  },
  2: {
    name: "ExpectedMint",
    description: "Token state deserialization didn't return Mint type",
  },
  3: {
    name: "ExpectedAccount",
    description: "Token state deserialization didn't return Account type",
  },
  4: {
    name: "InvalidCoinVault",
    description: "Coin vault doesn't match AmmInfo value",
  },
  5: {
    name: "InvalidPCVault",
    description: "PC vault doesn't match AmmInfo value",
  },
  6: {
    name: "InvalidTokenLP",
    description: "Token LP doesn't match AmmInfo value",
  },
  7: {
    name: "InvalidDestTokenCoin",
    description: "Destination token coin doesn't match WithdrawTokenInfo",
  },
  8: {
    name: "InvalidDestTokenPC",
    description: "Destination token PC doesn't match AmmInfo value",
  },
  9: {
    name: "InvalidPoolMint",
    description: "Pool mint doesn't match AmmInfo value",
  },
  10: {
    name: "InvalidOpenOrders",
    description: "Open orders doesn't match AmmInfo value",
  },
  11: {
    name: "InvalidMarket",
    description: "Market doesn't match AmmInfo value",
  },
  12: {
    name: "InvalidMarketProgram",
    description: "Market program doesn't match AmmInfo value",
  },
  13: {
    name: "InvalidTargetOrders",
    description: "Target orders doesn't match AmmInfo value",
  },
  14: { name: "AccountNeedWriteable", description: "Account must be writable" },
  15: { name: "AccountNeedReadOnly", description: "Account must be read-only" },
  16: {
    name: "InvalidCoinMint",
    description: "Token coin mint doesn't match coin mint key",
  },
  17: {
    name: "InvalidPCMint",
    description: "Token PC mint doesn't match PC mint key",
  },
  18: {
    name: "InvalidOwner",
    description: "Input owner not set to program-generated address",
  },
  19: {
    name: "InvalidSupply",
    description: "Initialized pool had non-zero supply",
  },
  20: {
    name: "InvalidDelegate",
    description: "Initialized token has a delegate",
  },
  21: {
    name: "InvalidSignAccount",
    description: "Sign account validation failed",
  },
  22: { name: "InvalidStatus", description: "AMM status is invalid" },
  23: {
    name: "InvalidInstruction",
    description: "Invalid instruction number provided",
  },
  24: {
    name: "WrongAccountsNumber",
    description: "Account count doesn't match expectations",
  },
  25: {
    name: "InvalidTargetAccountOwner",
    description: "Target account owner doesn't match program",
  },
  26: {
    name: "InvalidTargetOwner",
    description: "Saved owner doesn't match AMM pool",
  },
  27: {
    name: "InvalidAmmAccountOwner",
    description: "AMM account owner doesn't match program",
  },
  28: { name: "InvalidParamsSet", description: "Parameter set is invalid" },
  29: { name: "InvalidInput", description: "Input parameters are invalid" },
  30: {
    name: "ExceededSlippage",
    description: "Instruction exceeds desired slippage limit",
    category: "Slippage Protection",
    debugTip:
      "Increase slippage tolerance or wait for more favorable market conditions",
  },
  31: {
    name: "CalculationExRateFailure",
    description: "Exchange rate calculation failed",
  },
  32: {
    name: "CheckedSubOverflow",
    description: "Subtraction overflow occurred",
  },
  33: { name: "CheckedAddOverflow", description: "Addition overflow occurred" },
  34: {
    name: "CheckedMulOverflow",
    description: "Multiplication overflow occurred",
  },
  35: { name: "CheckedDivOverflow", description: "Division overflow occurred" },
  36: { name: "CheckedEmptyFunds", description: "Fund balance is empty" },
  37: { name: "CalcPnlError", description: "PnL calculation error" },
  38: {
    name: "InvalidSplTokenProgram",
    description: "SPL Token program is invalid",
    category: "Account Validation",
    debugTip: "Ensure you're using the correct SPL Token program ID",
  },
  39: { name: "TakePnlError", description: "PnL withdrawal error" },
  40: {
    name: "InsufficientFunds",
    description: "Insufficient funds available in pool or account",
    category: "Token Balance",
    debugTip:
      "Check token account balances and ensure sufficient funds for the swap",
  },
  41: {
    name: "ConversionFailure",
    description: "Conversion to u64 failed with overflow/underflow",
  },
  42: {
    name: "InvalidUserToken",
    description: "User token input doesn't match AMM",
  },
  43: {
    name: "InvalidSrmMint",
    description: "SRM token mint doesn't match PC mint",
  },
  44: {
    name: "InvalidSrmToken",
    description: "SRM token doesn't match program value",
  },
  45: { name: "TooManyOpenOrders", description: "Excessive open orders count" },
  46: {
    name: "OrderAtSlotIsPlaced",
    description: "Order already placed at slot",
  },
  47: {
    name: "InvalidSysProgramAddress",
    description: "System program address is invalid",
  },
  48: {
    name: "InvalidFee",
    description: "Fee doesn't match program owner constraints",
  },
  49: {
    name: "RepeatCreateAmm",
    description: "Duplicate AMM creation for market",
  },
  50: { name: "NotAllowZeroLP", description: "Zero LP amount not permitted" },
  51: {
    name: "InvalidCloseAuthority",
    description: "Token account has close authority",
  },
  52: {
    name: "InvalidFreezeAuthority",
    description: "Pool token mint has freeze authority",
  },
  53: {
    name: "InvalidReferPCMint",
    description: "Referrer PC wallet mint doesn't match",
  },
  54: {
    name: "InvalidConfigAccount",
    description: "Config account is invalid",
  },
  55: {
    name: "RepeatCreateConfigAccount",
    description: "Duplicate config account creation",
  },
  56: {
    name: "MarketLotSizeIsTooLarge",
    description: "Market lot size exceeds limits",
  },
  57: {
    name: "InitLpAmountTooLess",
    description: "Initial LP amount insufficient (10^decimals locked)",
  },
  58: {
    name: "UnknownAmmError",
    description: "Unspecified AMM error occurred",
  },
};

/**
 * SPL Token Program error codes
 * Source: https://docs.rs/spl-token/latest/spl_token/error/enum.TokenError.html
 * Used by the standard Token Program (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)
 */
export const SPL_TOKEN_ERRORS: Record<number, ErrorInfo> = {
  0: {
    name: "NotRentExempt",
    description: "Lamport balance below rent-exempt threshold",
    category: "Token Account",
    debugTip: "Ensure account has enough SOL to be rent-exempt for its size",
  },
  1: {
    name: "InsufficientFunds",
    description: "Insufficient funds for the operation requested",
    category: "Token Balance",
    debugTip: "Check token account balance before attempting transfer",
  },
  2: {
    name: "InvalidMint",
    description: "Invalid Mint",
    category: "Token Mint",
    debugTip: "Verify mint account is initialized and valid",
  },
  3: {
    name: "MintMismatch",
    description: "Account not associated with this Mint",
    category: "Token Account",
    debugTip: "Ensure token account matches the expected mint address",
  },
  4: {
    name: "OwnerMismatch",
    description: "Owner does not match",
    category: "Token Account",
    debugTip: "Verify the token account owner matches expected authority",
  },
  5: {
    name: "FixedSupply",
    description: "Fixed supply - new tokens cannot be minted",
    category: "Token Mint",
    debugTip: "Mint authority has been revoked, supply is fixed",
  },
  6: {
    name: "AlreadyInUse",
    description:
      "Account cannot be initialized because it is already being used",
    category: "Token Account",
    debugTip: "Use a different account address or close existing account first",
  },
  7: {
    name: "InvalidNumberOfProvidedSigners",
    description: "Invalid number of provided signers",
    category: "Token Authority",
    debugTip: "Check multisig configuration and provided signatures",
  },
  8: {
    name: "InvalidNumberOfRequiredSigners",
    description: "Invalid number of required signers",
    category: "Token Authority",
    debugTip: "Multisig requires 1-11 signers",
  },
  9: {
    name: "UninitializedState",
    description: "State is uninitialized",
    category: "Token Account",
    debugTip:
      "Initialize account before use with InitializeAccount instruction",
  },
  10: {
    name: "NativeNotSupported",
    description: "Instruction does not support native tokens",
    category: "Token Operation",
    debugTip: "Use wrapped SOL (wSOL) token account instead of native SOL",
  },
  11: {
    name: "NonNativeHasBalance",
    description: "Non-native account can only be closed if its balance is zero",
    category: "Token Account",
    debugTip: "Transfer all tokens out before closing account",
  },
  12: {
    name: "InvalidInstruction",
    description: "Invalid instruction",
    category: "Token Operation",
    debugTip: "Verify instruction data format matches Token Program interface",
  },
  13: {
    name: "InvalidState",
    description: "State is invalid for requested operation",
    category: "Token Account",
    debugTip: "Check account state before performing operation",
  },
  14: {
    name: "Overflow",
    description: "Operation overflowed",
    category: "Token Amount",
    debugTip: "Amount calculation exceeded maximum value (u64::MAX)",
  },
  15: {
    name: "AuthorityTypeNotSupported",
    description: "Account does not support specified authority type",
    category: "Token Authority",
    debugTip: "Use correct authority type for operation",
  },
  16: {
    name: "MintCannotFreeze",
    description: "This token mint cannot freeze accounts",
    category: "Token Mint",
    debugTip: "Mint was not created with freeze authority",
  },
  17: {
    name: "AccountFrozen",
    description: "Account is frozen",
    category: "Token Account",
    debugTip: "Account must be unfrozen by freeze authority before use",
  },
  18: {
    name: "MintDecimalsMismatch",
    description: "The provided decimals value different from the Mint decimals",
    category: "Token Mint",
    debugTip: "Ensure decimals match mint configuration",
  },
  19: {
    name: "NonNativeNotSupported",
    description: "Instruction does not support non-native tokens",
    category: "Token Operation",
    debugTip: "Operation only works with native SOL, not token accounts",
  },
};

/**
 * Metaplex Candy Machine error codes
 * Source: https://github.com/metaplex-foundation/mpl-core-candy-machine
 */
export const METAPLEX_CANDY_MACHINE_ERRORS: Record<number, ErrorInfo> = {
  0: {
    name: "IncorrectOwner",
    description: "Account does not have correct owner",
  },
  1: { name: "Uninitialized", description: "Account is not initialized" },
  2: { name: "MintMismatch", description: "Mint Mismatch" },
  3: {
    name: "IndexGreaterThanLength",
    description: "Index greater than length",
  },
  4: {
    name: "NumericalOverflowError",
    description: "Numerical overflow error",
  },
  5: {
    name: "TooManyCreators",
    description: "Up to 4 creators allowed (candy machine is one)",
  },
  6: { name: "CandyMachineEmpty", description: "Candy machine is empty" },
  7: {
    name: "HiddenSettingsDoNotHaveConfigLines",
    description: "Hidden URIs use single hash instead of config lines",
  },
  8: {
    name: "CannotChangeNumberOfLines",
    description: "Cannot modify lines unless hidden config",
  },
  9: {
    name: "CannotSwitchToHiddenSettings",
    description: "Cannot switch when items available > 0",
  },
  10: {
    name: "IncorrectCollectionAuthority",
    description: "Incorrect collection NFT authority",
  },
  11: {
    name: "MetadataAccountMustBeEmpty",
    description: "Metadata account must be empty to mint",
  },
  12: {
    name: "NoChangingCollectionDuringMint",
    description: "Cannot modify collection after minting begins",
  },
  13: {
    name: "ExceededLengthError",
    description: "Value longer than expected maximum value",
  },
  14: {
    name: "MissingConfigLinesSettings",
    description: "Missing config lines settings",
  },
  15: {
    name: "CannotIncreaseLength",
    description: "Cannot increase the length in config lines",
  },
  16: {
    name: "CannotSwitchFromHiddenSettings",
    description: "Cannot switch from hidden settings",
  },
  17: {
    name: "CannotChangeSequentialIndexGeneration",
    description: "Cannot modify after minting begins",
  },
  18: {
    name: "CollectionKeyMismatch",
    description: "Collection public key mismatch",
  },
  19: {
    name: "CouldNotRetrieveConfigLineData",
    description: "Could not retrieve config line data",
  },
  20: {
    name: "NotFullyLoaded",
    description: "Not all config lines were added",
  },
};

/**
 * Metaplex MPL Core error codes
 * Source: https://github.com/metaplex-foundation/mpl-core
 */
export const MPL_CORE_ERRORS: Record<number, ErrorInfo> = {
  0: { name: "InvalidSystemProgram", description: "Invalid System Program" },
  1: {
    name: "DeserializationError",
    description: "Error deserializing account",
  },
  2: { name: "SerializationError", description: "Error serializing account" },
  3: { name: "PluginsNotInitialized", description: "Plugins not initialized" },
  4: { name: "PluginNotFound", description: "Plugin not found" },
  5: { name: "NumericalOverflow", description: "Numerical Overflow" },
  6: { name: "IncorrectAccount", description: "Incorrect account" },
  7: { name: "IncorrectAssetHash", description: "Incorrect asset hash" },
  8: { name: "InvalidPlugin", description: "Invalid Plugin" },
  9: { name: "InvalidAuthority", description: "Invalid Authority" },
  10: { name: "AssetIsFrozen", description: "Cannot transfer a frozen asset" },
  11: {
    name: "MissingCompressionProof",
    description: "Missing compression proof",
  },
  12: {
    name: "CannotMigrateMasterWithSupply",
    description: "Cannot migrate a master edition used for prints",
  },
  13: {
    name: "CannotMigratePrints",
    description: "Cannot migrate a print edition",
  },
  14: {
    name: "CannotBurnCollection",
    description: "Cannot burn a collection NFT",
  },
  15: { name: "PluginAlreadyExists", description: "Plugin already exists" },
  16: { name: "NumericalOverflowError", description: "Numerical overflow" },
  17: { name: "AlreadyCompressed", description: "Already compressed account" },
  18: {
    name: "AlreadyDecompressed",
    description: "Already decompressed account",
  },
  19: {
    name: "InvalidCollection",
    description: "Invalid Collection passed in",
  },
  20: {
    name: "MissingUpdateAuthority",
    description: "Missing update authority",
  },
};

/**
 * Orca Whirlpools error codes
 * Source: https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/errors.rs
 * Used by Orca's concentrated liquidity AMM (Whirlpools program)
 */
export const ORCA_WHIRLPOOLS_ERRORS: Record<number, ErrorInfo> = {
  6000: {
    name: "InvalidEnum",
    description: "Enum value could not be converted",
    category: "Input Validation",
  },
  6001: {
    name: "InvalidStartTick",
    description: "Invalid start tick index provided",
    category: "Tick Management",
    debugTip: "Verify tick index is within valid range for pool tick spacing",
  },
  6002: {
    name: "TickArrayExistInPool",
    description: "Tick-array already exists in this whirlpool",
    category: "Tick Management",
  },
  6003: {
    name: "TickArrayIndexOutofBounds",
    description: "Attempt to search for a tick-array failed",
    category: "Tick Management",
    debugTip: "Ensure tick array covers the price range needed",
  },
  6004: {
    name: "InvalidTickSpacing",
    description: "Tick-spacing is not supported",
    category: "Pool Configuration",
    debugTip: "Use supported tick spacing: 1, 8, 64, or 128",
  },
  6005: {
    name: "ClosePositionNotEmpty",
    description: "Position is not empty - cannot be closed",
    category: "Position Management",
    debugTip: "Remove all liquidity from position before closing",
  },
  6006: {
    name: "DivideByZero",
    description: "Unable to divide by zero",
    category: "Math Error",
  },
  6007: {
    name: "NumberCastError",
    description: "Unable to cast number into BigInt",
    category: "Math Error",
  },
  6008: {
    name: "NumberDownCastError",
    description: "Unable to down cast number",
    category: "Math Error",
  },
  6009: {
    name: "TickNotFound",
    description: "Tick not found within tick array",
    category: "Tick Management",
  },
  6010: {
    name: "InvalidTickIndex",
    description:
      "Provided tick index is either out of bounds or uninitializable",
    category: "Tick Management",
  },
  6011: {
    name: "SqrtPriceOutOfBounds",
    description: "Provided sqrt price out of bounds",
    category: "Price Calculation",
  },
  6012: {
    name: "LiquidityZero",
    description: "Liquidity amount must be greater than zero",
    category: "Liquidity Management",
    debugTip: "Provide non-zero liquidity amount",
  },
  6013: {
    name: "LiquidityTooHigh",
    description: "Liquidity amount must be less than i64::MAX",
    category: "Liquidity Management",
  },
  6014: {
    name: "LiquidityOverflow",
    description: "Liquidity overflow",
    category: "Liquidity Management",
  },
  6015: {
    name: "LiquidityUnderflow",
    description: "Liquidity underflow",
    category: "Liquidity Management",
  },
  6016: {
    name: "LiquidityNetError",
    description: "Tick liquidity net underflowed or overflowed",
    category: "Liquidity Management",
  },
  6017: {
    name: "TokenMaxExceeded",
    description: "Exceeded token max",
    category: "Slippage Protection",
    debugTip: "Increase max token amount or reduce liquidity/swap size",
  },
  6018: {
    name: "TokenMinSubceeded",
    description: "Did not meet token min",
    category: "Slippage Protection",
    debugTip: "Decrease min token amount or increase slippage tolerance",
  },
  6019: {
    name: "MissingOrInvalidDelegate",
    description: "Position token account has a missing or invalid delegate",
    category: "Position Management",
  },
  6020: {
    name: "InvalidPositionTokenAmount",
    description: "Position token amount must be 1",
    category: "Position Management",
  },
  6021: {
    name: "InvalidTimestampConversion",
    description: "Timestamp should be convertible from i64 to u64",
    category: "Timestamp",
  },
  6022: {
    name: "InvalidTimestamp",
    description: "Timestamp should be greater than the last updated timestamp",
    category: "Timestamp",
  },
  6023: {
    name: "InvalidTickArraySequence",
    description: "Invalid tick array sequence provided for instruction",
    category: "Tick Management",
    debugTip: "Provide tick arrays in correct order covering swap range",
  },
  6024: {
    name: "InvalidTokenMintOrder",
    description: "Token Mint in wrong order",
    category: "Pool Configuration",
    debugTip: "Ensure tokenA < tokenB in public key ordering",
  },
  6025: {
    name: "RewardNotInitialized",
    description: "Reward not initialized",
    category: "Rewards",
  },
  6026: {
    name: "InvalidRewardIndex",
    description: "Invalid reward index",
    category: "Rewards",
    debugTip: "Reward index must be 0, 1, or 2",
  },
  6027: {
    name: "RewardVaultAmountInsufficient",
    description:
      "Reward vault requires amount to support emissions for at least one day",
    category: "Rewards",
  },
  6028: {
    name: "FeeRateMaxExceeded",
    description: "Exceeded max fee rate",
    category: "Pool Configuration",
  },
  6029: {
    name: "ProtocolFeeRateMaxExceeded",
    description: "Exceeded max protocol fee rate",
    category: "Pool Configuration",
  },
  6030: {
    name: "MultiplicationShiftRightOverflow",
    description: "Multiplication with shift right overflow",
    category: "Math Error",
  },
  6031: {
    name: "MulDivOverflow",
    description: "Muldiv overflow",
    category: "Math Error",
  },
  6032: {
    name: "MulDivInvalidInput",
    description: "Invalid div_u256 input",
    category: "Math Error",
  },
  6033: {
    name: "MultiplicationOverflow",
    description: "Multiplication overflow",
    category: "Math Error",
  },
  6034: {
    name: "InvalidSqrtPriceLimitDirection",
    description:
      "Provided SqrtPriceLimit not in the same direction as the swap",
    category: "Swap",
    debugTip: "Price limit must be in direction of swap",
  },
  6035: {
    name: "ZeroTradableAmount",
    description: "There are no tradable amount to swap",
    category: "Swap",
  },
  6036: {
    name: "AmountOutBelowMinimum",
    description: "Amount out below minimum threshold",
    category: "Slippage Protection",
    debugTip: "Increase slippage tolerance or reduce swap amount",
  },
  6037: {
    name: "AmountInAboveMaximum",
    description: "Amount in above maximum threshold",
    category: "Slippage Protection",
  },
  6038: {
    name: "TickArraySequenceInvalidIndex",
    description: "Invalid index for tick array sequence",
    category: "Tick Management",
  },
  6039: {
    name: "AmountCalcOverflow",
    description: "Amount calculated overflows",
    category: "Math Error",
  },
  6040: {
    name: "AmountRemainingOverflow",
    description: "Amount remaining overflows",
    category: "Math Error",
  },
  6041: {
    name: "InvalidIntermediaryMint",
    description: "Invalid intermediary mint",
    category: "Multi-hop Swap",
  },
  6042: {
    name: "DuplicateTwoHopPool",
    description: "Duplicate two hop pool",
    category: "Multi-hop Swap",
  },
  6043: {
    name: "InvalidBundleIndex",
    description: "Bundle index is out of bounds",
    category: "Position Bundle",
  },
  6044: {
    name: "BundledPositionAlreadyOpened",
    description: "Position has already been opened",
    category: "Position Bundle",
  },
  6045: {
    name: "BundledPositionAlreadyClosed",
    description: "Position has already been closed",
    category: "Position Bundle",
  },
  6046: {
    name: "PositionBundleNotDeletable",
    description: "Unable to delete PositionBundle with open positions",
    category: "Position Bundle",
    debugTip: "Close all bundled positions before deleting bundle",
  },
  6047: {
    name: "UnsupportedTokenMint",
    description: "Token mint has unsupported attributes",
    category: "Token Extensions",
  },
  6048: {
    name: "RemainingAccountsInvalidSlice",
    description: "Invalid remaining accounts",
    category: "Account Validation",
  },
  6049: {
    name: "RemainingAccountsInsufficient",
    description: "Insufficient remaining accounts",
    category: "Account Validation",
  },
  6050: {
    name: "NoExtraAccountsForTransferHook",
    description: "Unable to call transfer hook without extra accounts",
    category: "Token Extensions",
  },
  6051: {
    name: "IntermediateTokenAmountMismatch",
    description: "Output and input amount mismatch",
    category: "Multi-hop Swap",
  },
  6052: {
    name: "TransferFeeCalculationError",
    description: "Transfer fee calculation failed",
    category: "Token Extensions",
  },
  6053: {
    name: "RemainingAccountsDuplicatedAccountsType",
    description: "Same accounts type is provided more than once",
    category: "Account Validation",
  },
  6054: {
    name: "FullRangeOnlyPool",
    description: "This whirlpool only supports full-range positions",
    category: "Pool Configuration",
  },
  6055: {
    name: "TooManySupplementalTickArrays",
    description: "Too many supplemental tick arrays provided",
    category: "Tick Management",
  },
  6056: {
    name: "DifferentWhirlpoolTickArrayAccount",
    description: "TickArray account for different whirlpool provided",
    category: "Tick Management",
  },
  6057: {
    name: "PartialFillError",
    description: "Trade resulted in partial fill",
    category: "Swap",
    debugTip: "Provide adequate tick arrays or adjust amount",
  },
  6058: {
    name: "PositionNotLockable",
    description: "Position is not lockable",
    category: "Position Management",
  },
  6059: {
    name: "OperationNotAllowedOnLockedPosition",
    description: "Operation not allowed on locked position",
    category: "Position Management",
  },
  6060: {
    name: "SameTickRangeNotAllowed",
    description: "Cannot reset position range with same tick range",
    category: "Position Management",
  },
  6061: {
    name: "InvalidAdaptiveFeeConstants",
    description: "Invalid adaptive fee constants",
    category: "Pool Configuration",
  },
  6062: {
    name: "InvalidFeeTierIndex",
    description: "Invalid fee tier index",
    category: "Pool Configuration",
  },
  6063: {
    name: "InvalidTradeEnableTimestamp",
    description: "Invalid trade enable timestamp",
    category: "Pool Configuration",
  },
  6064: {
    name: "TradeIsNotEnabled",
    description: "Trade is not enabled yet",
    category: "Pool Configuration",
  },
  6065: {
    name: "RentCalculationError",
    description: "Rent calculation error",
    category: "Account Management",
  },
  6066: {
    name: "FeatureIsNotEnabled",
    description: "Feature is not enabled",
    category: "Pool Configuration",
  },
  6067: {
    name: "PositionWithTokenExtensionsRequired",
    description:
      "This whirlpool only supports open_position_with_token_extensions instruction",
    category: "Token Extensions",
  },
};

/**
 * Jupiter Aggregator error codes
 * Source: https://dev.jup.ag/docs/swap/common-errors
 * Used by Jupiter swap aggregator (v1, v4, v6)
 */
export const JUPITER_ERRORS: Record<number, ErrorInfo> = {
  6001: {
    name: "SlippageToleranceExceeded",
    description:
      "Slippage tolerance exceeded - actual price differs from expected",
    category: "Slippage",
    debugTip: "Increase slippage tolerance or use dynamicSlippage parameter",
  },
  6008: {
    name: "NotEnoughAccountKeys",
    description: "Not enough account keys provided for swap",
    category: "Account Validation",
    debugTip:
      "Ensure all required accounts are included - avoid modifying swap transactions",
  },
  6014: {
    name: "IncorrectTokenProgramID",
    description: "Incorrect token program ID",
    category: "Token Program",
    debugTip: "Occurs with Token2022 tokens when collecting platform fees",
  },
  6017: {
    name: "ExactOutAmountNotMatched",
    description: "Exact output amount not matched - pricing tolerance exceeded",
    category: "Slippage",
    debugTip: "Similar to slippage error - increase tolerance or adjust amount",
  },
  6024: {
    name: "InsufficientFunds",
    description: "Insufficient funds for swap, fees, or rent",
    category: "Balance",
    debugTip:
      "Ensure account has enough balance for swap amount + transaction fees + rent",
  },
  6025: {
    name: "InvalidTokenAccount",
    description: "Token account is uninitialized or invalid",
    category: "Token Account",
    debugTip: "Verify token account exists and is properly initialized",
  },
};

/**
 * Map program addresses to their error code dictionaries
 */
export const PROGRAM_ERROR_CODES: Record<string, Record<number, ErrorInfo>> = {
  // SPL Token Program
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: SPL_TOKEN_ERRORS,

  // Raydium AMM versions
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": RAYDIUM_AMM_ERRORS, // V4
  "27haf8L6oxUeXrHrgEgsexjSY5hbVUWEmvv9Nyxg8vQv": RAYDIUM_AMM_ERRORS, // V3
  RVKd61ztZW9GUwhRbbLoYVRE5Xf1B2tVscKqwZqXgEr: RAYDIUM_AMM_ERRORS, // V2

  // Orca Whirlpools
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: ORCA_WHIRLPOOLS_ERRORS,

  // Jupiter Aggregator versions
  JUP6i4ozu5ydDCnLiMogSckDPpbtr7BJ4FtzYWkb5Rk: JUPITER_ERRORS, // v1
  JUP2jxvXaqu7NQY1GmNF4m1vodw12LVXYxbFL2uJvfo: JUPITER_ERRORS, // v2
  JUP3c2Uh3WA4Ng34tw6kPd2G4C5BB21Xo36Je1s32Ph: JUPITER_ERRORS, // v3
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: JUPITER_ERRORS, // v4

  // Metaplex programs
  CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR: METAPLEX_CANDY_MACHINE_ERRORS,
  CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d: MPL_CORE_ERRORS,
};

/**
 * Resolve an error code to a human-readable name and description
 * Enhanced to support Anchor errors and provide categorization
 */
export function resolveErrorCode(
  programId: string | undefined,
  errorCode: number
): ErrorInfo | null {
  // 1. Try program-specific errors first
  if (programId && PROGRAM_ERROR_CODES[programId]) {
    const programErrors = PROGRAM_ERROR_CODES[programId];
    if (programErrors[errorCode]) {
      return programErrors[errorCode];
    }
  }

  // 2. Check if it's an Anchor framework error (100-5000 range)
  if (errorCode >= 100 && errorCode <= 5000 && ANCHOR_ERRORS[errorCode]) {
    return {
      ...ANCHOR_ERRORS[errorCode],
      category: ANCHOR_ERRORS[errorCode].category || "Anchor Framework",
    };
  }

  // 3. Fall back to common Solana builtin errors
  if (SOLANA_ERRORS[errorCode]) {
    return {
      ...SOLANA_ERRORS[errorCode],
      category: "Solana System",
    };
  }

  // 4. Unknown error
  return null;
}
