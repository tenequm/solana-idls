/**
 * Global protocol registry for error resolution
 */

import type { Protocol } from "./protocol";
import type { ErrorInfo, ProtocolMetadata } from "./types";

class ProtocolRegistry {
  private readonly protocols = new Map<string, Protocol>();
  private readonly programIdIndex = new Map<string, Protocol>();
  private frameworkProtocol: Protocol | null = null;

  /**
   * Register a protocol in the registry
   */
  register(protocol: Protocol): void {
    this.protocols.set(protocol.name, protocol);
    this.programIdIndex.set(protocol.programId, protocol);
  }

  /**
   * Register a framework protocol that provides fallback error resolution
   * Framework protocols (like Anchor) apply to any program and are checked
   * after program-specific lookups fail
   */
  registerFramework(protocol: Protocol): void {
    this.frameworkProtocol = protocol;
    this.protocols.set(protocol.name, protocol);
  }

  /**
   * Resolve error by program ID and error code
   * Uses hierarchical resolution:
   * 1. Program-specific lookup (Jupiter, Orca, SPL Token, etc.)
   * 2. Framework fallback (Anchor errors)
   *
   * Enriches errors with source metadata for transparency
   */
  resolve(programId: string, code: number): ErrorInfo | null {
    // Priority 1: Program-specific lookup
    const protocol = this.programIdIndex.get(programId);
    if (protocol) {
      const error = protocol.getError(code);
      if (error) {
        // Enrich with source metadata based on protocol type
        const metadata = protocol.getMetadata();

        // Determine error source type
        if (
          metadata.name === "SPL Token Program" ||
          metadata.name === "Token-2022 Program"
        ) {
          return {
            ...error,
            source: {
              type: "token-program",
              programId,
              programName: metadata.name,
            },
          };
        }

        return {
          ...error,
          source: {
            type: "program-specific",
            programId,
            programName: metadata.name,
          },
        };
      }
    }

    // Priority 2: Framework fallback (Anchor)
    if (this.frameworkProtocol) {
      const frameworkError = this.frameworkProtocol.getError(code);
      if (frameworkError) {
        return {
          ...frameworkError,
          source: {
            type: "anchor-framework",
            programId,
          },
        };
      }
    }

    return null;
  }

  /**
   * Get protocol by name
   */
  getByName(name: string): Protocol | null {
    return this.protocols.get(name) ?? null;
  }

  /**
   * Get protocol by program ID
   */
  getByProgramId(programId: string): Protocol | null {
    return this.programIdIndex.get(programId) ?? null;
  }

  /**
   * List all registered protocols
   */
  listAll(): readonly Protocol[] {
    return Array.from(this.protocols.values());
  }

  /**
   * Get all protocol metadata
   */
  listMetadata(): readonly ProtocolMetadata[] {
    return Array.from(this.protocols.values()).map((p) => p.getMetadata());
  }

  /**
   * Search errors across all protocols (returns errors without source metadata)
   */
  search(
    query: string
  ): Array<{ protocol: Protocol; error: Omit<ErrorInfo, "source"> }> {
    const results: Array<{
      protocol: Protocol;
      error: Omit<ErrorInfo, "source">;
    }> = [];

    for (const protocol of this.protocols.values()) {
      const errors = protocol.searchErrors(query);
      for (const error of errors) {
        results.push({ protocol, error });
      }
    }

    return results;
  }

  /**
   * Get total error count across all protocols
   */
  getTotalErrorCount(): number {
    return Array.from(this.protocols.values()).reduce(
      (sum, p) => sum + p.getErrorCount(),
      0
    );
  }

  /**
   * Clear all registered protocols (useful for testing)
   */
  clear(): void {
    this.protocols.clear();
    this.programIdIndex.clear();
  }
}

/**
 * Global singleton registry instance
 */
export const registry = new ProtocolRegistry();
