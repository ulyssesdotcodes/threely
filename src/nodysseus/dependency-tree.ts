// Main dependency tree module - simplified and split into multiple files

// Re-export all types
export * from "./node-types";

// Re-export constructors and utilities
export * from "./node-constructors";

// Re-export external node handler
export * from "./external-nodes";

// Re-export main runtime
export { NodysseusRuntime } from "./runtime-core";

// Legacy exports for compatibility
export { NodysseusRuntime as default } from "./runtime-core";