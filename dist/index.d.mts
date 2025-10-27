/**
 * Core type definitions for Solana error database
 *
 * Uses `type` instead of `interface` following 2025 TypeScript best practices
 */
/**
 * Raw error definition from IDL
 * Supports both Anchor format (msg) and Solana Program format (message, docs)
 * @see https://www.anchor-lang.com/docs/idl-spec
 */
type IdlError = {
    readonly code: number;
    readonly name: string;
    readonly msg?: string;
    readonly message?: string;
    readonly docs?: string[];
};
/**
 * Error source provenance for tracking where an error originated
 *
 * - program-specific: Error unique to a specific program (Jupiter, Orca, etc.)
 * - anchor-framework: Anchor framework error that applies to any Anchor program
 * - token-program: SPL Token or Token-2022 program error
 */
type ErrorSource = {
    readonly type: "program-specific";
    readonly programId: string;
    readonly programName: string;
} | {
    readonly type: "anchor-framework";
    readonly programId: string;
} | {
    readonly type: "token-program";
    readonly programId: string;
    readonly programName: string;
};
/**
 * Error information extracted directly from IDL
 * No interpretation or enhancement - pure data from source
 */
type ErrorInfo = {
    readonly code: number;
    readonly name: string;
    readonly description: string;
    readonly docs?: readonly string[];
    readonly source: ErrorSource;
};
/**
 * IDL source provenance for tracking where errors came from
 */
type IdlSource = {
    readonly type: "on-chain";
    readonly fetchedAt: string;
} | {
    readonly type: "github";
    readonly url: string;
    readonly commit: string;
} | {
    readonly type: "npm";
    readonly package: string;
    readonly version: string;
};
/**
 * Protocol metadata for provenance tracking
 */
type ProtocolMetadata = {
    readonly name: string;
    readonly programId: string;
    readonly version: string;
    readonly idlSource?: IdlSource;
    readonly lastVerified?: string;
};

/**
 * Protocol class representing a Solana program's error database
 */

interface ProtocolConfig {
    name: string;
    programId: string;
    version: string;
    errors: Record<number, Omit<ErrorInfo, "source">>;
    idlSource?: ProtocolMetadata["idlSource"];
    lastVerified?: string;
}
declare class Protocol {
    readonly name: string;
    readonly programId: string;
    readonly version: string;
    private readonly errors;
    private readonly metadata;
    constructor(config: ProtocolConfig);
    /**
     * Get error by code (without source metadata)
     * Source is added by registry during resolution
     */
    getError(code: number): Omit<ErrorInfo, "source"> | null;
    /**
     * Get all errors for this protocol (without source metadata)
     */
    getAllErrors(): readonly Omit<ErrorInfo, "source">[];
    /**
     * Get protocol metadata
     */
    getMetadata(): ProtocolMetadata;
    /**
     * Get error count
     */
    getErrorCount(): number;
    /**
     * Check if protocol has a specific error code
     */
    hasError(code: number): boolean;
    /**
     * Search errors by name or description (without source metadata)
     */
    searchErrors(query: string): Omit<ErrorInfo, "source">[];
}

/**
 * Global protocol registry for error resolution
 */

declare class ProtocolRegistry {
    private readonly protocols;
    private readonly programIdIndex;
    private frameworkProtocol;
    /**
     * Register a protocol in the registry
     */
    register(protocol: Protocol): void;
    /**
     * Register a framework protocol that provides fallback error resolution
     * Framework protocols (like Anchor) apply to any program and are checked
     * after program-specific lookups fail
     */
    registerFramework(protocol: Protocol): void;
    /**
     * Resolve error by program ID and error code
     * Uses hierarchical resolution:
     * 1. Program-specific lookup (Jupiter, Orca, SPL Token, etc.)
     * 2. Framework fallback (Anchor errors)
     *
     * Enriches errors with source metadata for transparency
     */
    resolve(programId: string, code: number): ErrorInfo | null;
    /**
     * Get protocol by name
     */
    getByName(name: string): Protocol | null;
    /**
     * Get protocol by program ID
     */
    getByProgramId(programId: string): Protocol | null;
    /**
     * List all registered protocols
     */
    listAll(): readonly Protocol[];
    /**
     * Get all protocol metadata
     */
    listMetadata(): readonly ProtocolMetadata[];
    /**
     * Search errors across all protocols (returns errors without source metadata)
     */
    search(query: string): Array<{
        protocol: Protocol;
        error: Omit<ErrorInfo, "source">;
    }>;
    /**
     * Get total error count across all protocols
     */
    getTotalErrorCount(): number;
    /**
     * Clear all registered protocols (useful for testing)
     */
    clear(): void;
}
/**
 * Global singleton registry instance
 */
declare const registry: ProtocolRegistry;

export { type ErrorInfo, type IdlError, Protocol, type ProtocolMetadata, registry };
