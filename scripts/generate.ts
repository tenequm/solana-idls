#!/usr/bin/env tsx
/**
 * Unified Generation Script
 *
 * Fetches IDLs and generates protocols.ts in one command.
 * Run: pnpm generate [--force]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { $, chalk } from "zx";
import {
  getIdlBasedProtocols,
  type ProtocolConfig,
} from "../src/protocols.config";

// Enable verbose mode for debugging
$.verbose = false;

// ============================================================================
// Configuration
// ============================================================================

const ROOT_DIR = path.resolve(__dirname, "..");
const IDL_DIR = path.join(ROOT_DIR, "idl");
const GENERATED_DIR = path.join(ROOT_DIR, "src", "generated");
const OUTPUT_FILE = path.join(GENERATED_DIR, "protocols.ts");
const FORCE = process.argv.includes("--force");

const STATUS_DISPLAY = {
  success: { icon: chalk.green("✓"), color: chalk.green },
  skipped: { icon: chalk.blue("⊘"), color: chalk.blue },
  failed: { icon: chalk.red("✗"), color: chalk.red },
} as const;

// ============================================================================
// Types
// ============================================================================

interface FetchResult {
  program: ProtocolConfig;
  status: "success" | "skipped" | "failed";
  message: string;
  errorCount?: number;
}

// ============================================================================
// IDL Utilities
// ============================================================================

function ensureIdlDirectory(): void {
  if (!fs.existsSync(IDL_DIR)) {
    fs.mkdirSync(IDL_DIR, { recursive: true });
  }
}

function getIdlPath(idlFileName: string): string {
  return path.join(IDL_DIR, `${idlFileName}.json`);
}

function validateIdl(idlPath: string): { valid: boolean; errorCount: number } {
  try {
    const content = fs.readFileSync(idlPath, "utf8");
    const idl = JSON.parse(content);

    // Check for Solana Program format (.program.errors)
    if (idl.program?.errors && Array.isArray(idl.program.errors)) {
      return { valid: true, errorCount: idl.program.errors.length };
    }

    // Check for standard Anchor format (.errors)
    if (idl.errors && Array.isArray(idl.errors)) {
      return { valid: true, errorCount: idl.errors.length };
    }

    return { valid: false, errorCount: 0 };
  } catch {
    return { valid: false, errorCount: 0 };
  }
}

function filesAreIdentical(path1: string, path2: string): boolean {
  try {
    const content1 = fs.readFileSync(path1, "utf8");
    const content2 = fs.readFileSync(path2, "utf8");

    // Parse and compare JSON to ignore formatting differences
    const json1 = JSON.parse(content1);
    const json2 = JSON.parse(content2);

    return JSON.stringify(json1) === JSON.stringify(json2);
  } catch {
    return false;
  }
}

// ============================================================================
// IDL Fetchers
// ============================================================================

async function fetchFromAnchor(program: ProtocolConfig): Promise<FetchResult> {
  const idlPath = getIdlPath(program.idlFileName);
  const tempPath = `${idlPath}.tmp`;

  try {
    // Check if we should skip
    if (!FORCE && fs.existsSync(idlPath)) {
      const validation = validateIdl(idlPath);
      if (validation.valid) {
        return {
          program,
          status: "skipped",
          message: "Already exists (use --force to re-fetch)",
          errorCount: validation.errorCount,
        };
      }
    }

    // Fetch IDL using Anchor CLI
    await $`anchor idl fetch ${program.programId} -o ${tempPath}`;

    // Validate fetched IDL
    const validation = validateIdl(tempPath);
    if (!validation.valid) {
      fs.unlinkSync(tempPath);
      return {
        program,
        status: "failed",
        message: "Invalid IDL structure (no errors array)",
      };
    }

    // Check if content changed
    if (fs.existsSync(idlPath) && filesAreIdentical(idlPath, tempPath)) {
      fs.unlinkSync(tempPath);
      return {
        program,
        status: "skipped",
        message: "No changes detected",
        errorCount: validation.errorCount,
      };
    }

    // Move temp file to final location
    fs.renameSync(tempPath, idlPath);

    return {
      program,
      status: "success",
      message: "Fetched from blockchain",
      errorCount: validation.errorCount,
    };
  } catch (error) {
    // Clean up temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    return {
      program,
      status: "failed",
      message: `Anchor CLI failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

function validateLocal(program: ProtocolConfig): FetchResult {
  const idlPath = getIdlPath(program.idlFileName);

  if (!fs.existsSync(idlPath)) {
    return {
      program,
      status: "failed",
      message: "IDL file not found (must be copied manually to idl/ directory)",
    };
  }

  const validation = validateIdl(idlPath);
  if (!validation.valid) {
    return {
      program,
      status: "failed",
      message: "Invalid IDL structure (no errors array)",
    };
  }

  return {
    program,
    status: "success",
    message: "Using local IDL",
    errorCount: validation.errorCount,
  };
}

async function fetchFromGitHub(program: ProtocolConfig): Promise<FetchResult> {
  if (!program.githubUrl) {
    return {
      program,
      status: "failed",
      message: "Missing githubUrl in config",
    };
  }

  const idlPath = getIdlPath(program.idlFileName);
  const tempPath = `${idlPath}.tmp`;

  try {
    // Check if we should skip
    if (!FORCE && fs.existsSync(idlPath)) {
      const validation = validateIdl(idlPath);
      if (validation.valid) {
        return {
          program,
          status: "skipped",
          message: "Already exists (use --force to re-fetch)",
          errorCount: validation.errorCount,
        };
      }
    }

    // Fetch IDL using curl
    await $`curl -L -s ${program.githubUrl} -o ${tempPath}`;

    // Validate fetched IDL
    const validation = validateIdl(tempPath);
    if (!validation.valid) {
      fs.unlinkSync(tempPath);
      return {
        program,
        status: "failed",
        message: "Invalid IDL structure (no errors array)",
      };
    }

    // Check if content changed
    if (fs.existsSync(idlPath) && filesAreIdentical(idlPath, tempPath)) {
      fs.unlinkSync(tempPath);
      return {
        program,
        status: "skipped",
        message: "No changes detected",
        errorCount: validation.errorCount,
      };
    }

    // Move temp file to final location
    fs.renameSync(tempPath, idlPath);

    return {
      program,
      status: "success",
      message: "Fetched from GitHub",
      errorCount: validation.errorCount,
    };
  } catch (error) {
    // Clean up temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    return {
      program,
      status: "failed",
      message: `GitHub fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// ============================================================================
// Code Generation
// ============================================================================

function generateProtocolsFile(): string {
  const imports: string[] = [];
  const idlMapEntries: string[] = [];

  const protocols = getIdlBasedProtocols();

  // Generate imports and IDL map entries
  for (const protocol of protocols) {
    const varName = `${protocol.idlFileName.replace(/-/g, "_")}Idl`;
    imports.push(
      `import ${varName} from "../../idl/${protocol.idlFileName}.json" with { type: "json" };`
    );
    idlMapEntries.push(`  "${protocol.idlFileName}": ${varName},`);
  }

  return `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 *
 * Generated from protocols.config.ts
 * Run \`pnpm generate\` to regenerate
 */

import { buildProtocolErrors, buildProtocolInstructions } from "../core/builder";
import { Protocol } from "../core/protocol";
import { registry } from "../core/registry";
import type { IdlSource } from "../core/types";
import { PROTOCOLS } from "../protocols.config";
import { ANCHOR_ERRORS } from "../protocols/manual";

// ============================================================================
// IDL Imports (auto-generated)
// ============================================================================

${imports.join("\n")}

/**
 * Map of IDL filename → IDL object
 */
const IDL_MAP: Record<string, unknown> = {
${idlMapEntries.join("\n")}
};

// ============================================================================
// Auto-Registration
// ============================================================================

/**
 * Register a single protocol from IDL
 */
function registerProtocol(config: typeof PROTOCOLS[number]): void {
  // Handle manual protocols
  if (config.fetchSource === "manual") {
    if (config.idlFileName === "anchor") {
      const protocol = new Protocol({
        name: config.displayName,
        programId: config.programId,
        version: config.version,
        errors: ANCHOR_ERRORS,
        lastVerified: new Date().toISOString().split("T")[0],
      });

      // Register as framework (provides fallback resolution)
      registry.registerFramework(protocol);
    }
    return;
  }

  // Handle IDL-based protocols
  const idl = IDL_MAP[config.idlFileName];
  if (!idl) {
    throw new Error(\`No IDL found for \${config.idlFileName}\`);
  }
  const errors = buildProtocolErrors(idl);
  const instructions = buildProtocolInstructions(idl);

  // Determine IDL source
  let idlSource: IdlSource | undefined;
  if (config.fetchSource === "github") {
    if (!config.githubUrl) {
      throw new Error(\`GitHub URL required for \${config.idlFileName}\`);
    }
    idlSource = {
      type: "github" as const,
      url: config.githubUrl,
      commit: "latest",
    };
  } else if (config.fetchSource === "anchor") {
    idlSource = {
      type: "on-chain" as const,
      fetchedAt: new Date().toISOString(),
    };
  } else if (config.fetchSource === "local") {
    idlSource = {
      type: "github" as const,
      url: "pre-copied from reference repository",
      commit: "N/A",
    };
  }

  const protocol = new Protocol({
    name: config.displayName,
    programId: config.programId,
    version: config.version,
    errors,
    instructions,
    idlSource,
    lastVerified: new Date().toISOString().split("T")[0],
  });

  registry.register(protocol);
}

/**
 * Register all protocols from config
 * Framework protocols (Anchor) are registered first to provide fallback
 */
for (const config of PROTOCOLS) {
  registerProtocol(config);
}
`;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log(chalk.bold("\n🔨 Protocol Generation & Sync\n"));

  if (FORCE) {
    console.log(chalk.yellow("⚠️  Force mode enabled - re-fetching all IDLs\n"));
  }

  // Step 1: Fetch/Validate IDLs
  console.log(chalk.bold("📥 Step 1: Fetching/Validating IDLs\n"));

  const protocols = getIdlBasedProtocols();
  console.log(
    `📋 Found ${protocols.length} protocols from ${chalk.cyan("protocols.config.ts")}\n`
  );

  // Ensure IDL directory exists
  ensureIdlDirectory();

  // Fetch IDLs
  const results: FetchResult[] = [];

  for (const program of protocols) {
    console.log(chalk.bold(`Processing: ${program.displayName}`));
    console.log(`  Program ID: ${chalk.dim(program.programId)}`);
    console.log(`  Source: ${chalk.dim(program.fetchSource)}`);

    let result: FetchResult;

    if (program.fetchSource === "anchor") {
      result = await fetchFromAnchor(program);
    } else if (program.fetchSource === "github") {
      result = await fetchFromGitHub(program);
    } else if (program.fetchSource === "local") {
      result = validateLocal(program);
    } else {
      result = {
        program,
        status: "failed",
        message: `Unknown source: ${program.fetchSource}`,
      };
    }

    results.push(result);

    // Print result
    const { icon, color } = STATUS_DISPLAY[result.status];
    console.log(
      `  ${icon} ${color(result.message)}${result.errorCount ? chalk.dim(` (${result.errorCount} errors)`) : ""}`
    );
    console.log();
  }

  // Print IDL fetch summary
  const successCount = results.filter((r) => r.status === "success").length;
  const skippedCount = results.filter((r) => r.status === "skipped").length;
  const failedCount = results.filter((r) => r.status === "failed").length;
  const totalErrors = results.reduce((sum, r) => sum + (r.errorCount || 0), 0);

  console.log(chalk.bold("═".repeat(60)));
  console.log(chalk.bold("IDL Fetch Summary"));
  console.log(chalk.bold("═".repeat(60)));
  console.log(`${chalk.green("✓ Success")}: ${successCount}`);
  console.log(`${chalk.blue("⊘ Skipped")}: ${skippedCount}`);
  console.log(`${chalk.red("✗ Failed")}: ${failedCount}`);
  console.log(`${chalk.cyan("📊 Total Errors")}: ${totalErrors}`);
  console.log(chalk.bold("═".repeat(60)));
  console.log();

  // Exit if any fetches failed
  if (failedCount > 0) {
    console.log(
      chalk.red(`⚠️  ${failedCount} fetch(es) failed. Cannot continue.\n`)
    );
    process.exit(1);
  }

  // Step 2: Generate protocols.ts
  console.log(chalk.bold("⚡ Step 2: Generating protocols.ts\n"));

  // Ensure generated directory exists
  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
  }

  const content = generateProtocolsFile();
  fs.writeFileSync(OUTPUT_FILE, content, "utf8");

  console.log(
    `✅ Generated ${chalk.cyan(path.relative(ROOT_DIR, OUTPUT_FILE))}`
  );
  console.log();

  console.log(chalk.green.bold("✨ All done! Library is ready to use.\n"));
}

main().catch((error) => {
  console.error(chalk.red("\n💥 Fatal error:"), error);
  process.exit(1);
});
