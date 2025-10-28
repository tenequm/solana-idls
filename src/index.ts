/**
 * solana-idls
 *
 * Type-safe Solana IDL database with error, instruction, and account resolution
 *
 * @packageDocumentation
 */

// Import protocols (triggers auto-registration from config)
import "./generated/protocols";

// Re-export Protocol and registry
export { Protocol } from "./core/protocol";
export { registry } from "./core/registry";
// Re-export types
export type { ErrorInfo, IdlError, ProtocolMetadata } from "./core/types";
