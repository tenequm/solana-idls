/**
 * @obsidian-debug/solana-errors
 *
 * Type-safe Solana error database with IDL-based accuracy
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
