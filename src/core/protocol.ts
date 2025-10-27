/**
 * Protocol class representing a Solana program's error database
 */

import type { ErrorInfo, ProtocolMetadata } from "./types";

export interface ProtocolConfig {
  name: string;
  programId: string;
  version: string;
  errors: Record<number, Omit<ErrorInfo, "source">>;
  idlSource?: ProtocolMetadata["idlSource"];
  lastVerified?: string;
}

export class Protocol {
  readonly name: string;
  readonly programId: string;
  readonly version: string;
  private readonly errors: Record<number, Omit<ErrorInfo, "source">>;
  private readonly metadata: ProtocolMetadata;

  constructor(config: ProtocolConfig) {
    this.name = config.name;
    this.programId = config.programId;
    this.version = config.version;
    this.errors = config.errors;

    this.metadata = {
      name: config.name,
      programId: config.programId,
      version: config.version,
      ...(config.idlSource && { idlSource: config.idlSource }),
      lastVerified: config.lastVerified,
    };
  }

  /**
   * Get error by code (without source metadata)
   * Source is added by registry during resolution
   */
  getError(code: number): Omit<ErrorInfo, "source"> | null {
    return this.errors[code] ?? null;
  }

  /**
   * Get all errors for this protocol (without source metadata)
   */
  getAllErrors(): readonly Omit<ErrorInfo, "source">[] {
    return Object.values(this.errors);
  }

  /**
   * Get protocol metadata
   */
  getMetadata(): ProtocolMetadata {
    return this.metadata;
  }

  /**
   * Get error count
   */
  getErrorCount(): number {
    return Object.keys(this.errors).length;
  }

  /**
   * Check if protocol has a specific error code
   */
  hasError(code: number): boolean {
    return code in this.errors;
  }

  /**
   * Search errors by name or description (without source metadata)
   */
  searchErrors(query: string): Omit<ErrorInfo, "source">[] {
    const lowerQuery = query.toLowerCase();
    return Object.values(this.errors).filter(
      (error) =>
        error.name.toLowerCase().includes(lowerQuery) ||
        error.description.toLowerCase().includes(lowerQuery)
    );
  }
}
