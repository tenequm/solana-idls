/**
 * Protocol class representing a Solana program's error and instruction database
 */

import type { ErrorInfo, InstructionInfo, ProtocolMetadata } from "./types";

export interface ProtocolConfig {
  name: string;
  programId: string;
  version: string;
  errors: Record<number, Omit<ErrorInfo, "source">>;
  instructions?: Record<string, InstructionInfo>; // Keyed by discriminator (hex) or "pos:N"
  idlSource?: ProtocolMetadata["idlSource"];
  lastVerified?: string;
}

export class Protocol {
  readonly name: string;
  readonly programId: string;
  readonly version: string;
  private readonly errors: Record<number, Omit<ErrorInfo, "source">>;
  private readonly instructions: Record<string, InstructionInfo>;
  private readonly metadata: ProtocolMetadata;

  constructor(config: ProtocolConfig) {
    this.name = config.name;
    this.programId = config.programId;
    this.version = config.version;
    this.errors = config.errors;
    this.instructions = config.instructions ?? {};

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

  // ============================================================================
  // Instruction Methods
  // ============================================================================

  /**
   * Get instruction by discriminator (for modern Anchor programs)
   *
   * @param discriminator - 8-byte discriminator as Buffer, Uint8Array, number array, or hex string
   * @returns Instruction info or null if not found
   */
  getInstruction(
    discriminator: Buffer | Uint8Array | number[] | string
  ): InstructionInfo | null {
    const key =
      typeof discriminator === "string"
        ? discriminator
        : Buffer.from(discriminator).toString("hex");
    return this.instructions[key] ?? null;
  }

  /**
   * Get instruction by position (for old Anchor programs without discriminators)
   *
   * @param position - Instruction index in the IDL
   * @returns Instruction info or null if not found
   */
  getInstructionByPosition(position: number): InstructionInfo | null {
    return this.instructions[`pos:${position}`] ?? null;
  }

  /**
   * Get all instructions for this protocol
   */
  getAllInstructions(): readonly InstructionInfo[] {
    // Deduplicate: same instruction may have both discriminator and position keys
    const seen = new Set<string>();
    return Object.values(this.instructions).filter((inst) => {
      if (seen.has(inst.name)) {
        return false;
      }
      seen.add(inst.name);
      return true;
    });
  }

  /**
   * Get instruction count
   */
  getInstructionCount(): number {
    return this.getAllInstructions().length;
  }

  /**
   * Check if protocol has instruction data
   */
  hasInstructions(): boolean {
    return Object.keys(this.instructions).length > 0;
  }

  /**
   * Search instructions by name
   */
  searchInstructions(query: string): InstructionInfo[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllInstructions().filter((inst) =>
      inst.name.toLowerCase().includes(lowerQuery)
    );
  }
}
