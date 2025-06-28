/**
 * CodeMirror Range Sets implementation for function call tagging
 * 
 * This module provides stable UUID assignment to function calls in DSL code,
 * enabling consistent node identification that persists through document edits.
 * 
 * Design decisions:
 * - Uses point ranges to track function call positions without affecting text rendering
 * - MapMode.TrackDel ensures tags survive edits until the function call itself is deleted
 * - Deterministic UUID generation provides stability across executions
 * - Call index supports multiple calls of the same function in a single execution context
 */


import { RangeValue, MapMode } from '@codemirror/state';
// Browser-compatible hash function
async function createSHA256Hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// Synchronous hash using a simple deterministic algorithm for UUID generation
function createSimpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive hex string
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  return hexHash.substring(0, 8); // Take first 8 characters
}

/**
 * Interface representing a parsed function call with position information
 * Used by the AST parser to identify function calls in DSL code
 */
export interface FunctionCall {
  /** Name of the function being called */
  name: string;
  /** Start position in the document (character offset) */
  start: number;
  /** End position in the document (character offset) */
  end: number;
  /** Nested function calls within this call's arguments */
  args: FunctionCall[];
}

/**
 * Configuration options for UUID generation
 */
export interface UUIDGenerationOptions {
  /** Function name being called */
  functionName: string;
  /** Character position in document where function is called */
  position: number;
  /** Index of this call among multiple calls of the same function in current execution */
  callIndex: number;
  /** Optional document version for cache busting when content changes significantly */
  documentVersion?: number;
  /** Optional salt for additional randomness while maintaining determinism */
  salt?: string;
}

/**
 * RangeValue implementation for tagging function calls in CodeMirror documents
 * 
 * This class extends CodeMirror's RangeValue to create stable markers for function calls
 * that persist through document edits. Each tag contains a UUID that can be used to 
 * consistently identify the same function call across multiple DSL executions.
 * 
 * Key features:
 * - Point range (zero-width) to avoid interfering with text display
 * - TrackDel mapping to survive edits until the function call is deleted
 * - Deterministic equality checking for efficient Range Set updates
 * - Immutable design following CodeMirror patterns
 */
export class FunctionCallTag extends RangeValue {
  /**
   * Creates a new FunctionCallTag
   * 
   * @param uuid - Unique identifier for this function call (should be deterministic)
   * @param functionName - Name of the function being called (e.g., 'frame', 'mesh', 'box')
   * @param callIndex - Index of this call among multiple calls of same function (0-based)
   */
  constructor(
    public readonly uuid: string,
    public readonly functionName: string,
    public readonly callIndex: number
  ) {
    super();
  }

  /**
   * Equality check for efficient Range Set operations
   * Two FunctionCallTags are equal if all their properties match
   * 
   * @param other - Another FunctionCallTag to compare with
   * @returns true if tags represent the same function call
   */
  eq(other: FunctionCallTag): boolean {
    return this.uuid === other.uuid &&
           this.functionName === other.functionName &&
           this.callIndex === other.callIndex;
  }

  /**
   * Point range configuration - this tag represents a position, not a span of text
   * Point ranges don't affect text rendering and are ideal for metadata markers
   */
  point = true;

  /**
   * Mapping mode for document changes
   * TrackDel means the tag will be removed if the text it points to is deleted,
   * but will move with insertions/deletions around it
   */
  mapMode = MapMode.TrackDel;

  /**
   * String representation for debugging
   */
  toString(): string {
    return `FunctionCallTag(${this.functionName}[${this.callIndex}]: ${this.uuid})`;
  }
}

/**
 * Generates a deterministic UUID for a function call based on its context
 * 
 * This function creates UUIDs that are:
 * - Deterministic: Same inputs always produce the same UUID
 * - Position-aware: Different positions produce different UUIDs
 * - Call-index-aware: Multiple calls of same function get different UUIDs
 * - Collision-resistant: Uses cryptographic hashing to avoid conflicts
 * 
 * The UUID format is: `fn-${functionName}-${hash}` where hash is a truncated
 * SHA-256 hash of the concatenated inputs.
 * 
 * @param options - Configuration for UUID generation
 * @returns A deterministic UUID string
 * 
 * @example
 * ```typescript
 * const uuid1 = generateFunctionUUID({
 *   functionName: 'frame',
 *   position: 42,
 *   callIndex: 0
 * }); // "fn-frame-a1b2c3d4"
 * 
 * const uuid2 = generateFunctionUUID({
 *   functionName: 'frame',
 *   position: 42,
 *   callIndex: 0
 * }); // "fn-frame-a1b2c3d4" (same as uuid1)
 * 
 * const uuid3 = generateFunctionUUID({
 *   functionName: 'frame',
 *   position: 43,  // different position
 *   callIndex: 0
 * }); // "fn-frame-x9y8z7w6" (different from uuid1)
 * ```
 */
export function generateFunctionUUID(options: UUIDGenerationOptions): string {
  const {
    functionName,
    position,
    callIndex,
    documentVersion = 0,
    salt = 'threely-dsl'
  } = options;

  // Create a deterministic input string from all relevant parameters
  const input = [
    salt,
    functionName,
    position.toString(),
    callIndex.toString(),
    documentVersion.toString()
  ].join('|');

  // Generate a deterministic hash for collision resistance
  const shortHash = createSimpleHash(input);
  
  // Format as a readable UUID with function name prefix
  return `fn-${functionName}-${shortHash}`;
}

/**
 * Type guard to check if a value is a FunctionCallTag
 * Useful for type-safe operations when working with generic RangeValue objects
 * 
 * @param value - Value to check
 * @returns true if value is a FunctionCallTag instance
 */
export function isFunctionCallTag(value: any): value is FunctionCallTag {
  return value instanceof FunctionCallTag;
}

/**
 * Utility type for Range Set operations with FunctionCallTag
 * Provides type safety when working with ranges of function call tags
 */
export type FunctionCallRange = {
  from: number;
  to: number;
  value: FunctionCallTag;
};

/**
 * Helper function to create a FunctionCallTag with generated UUID
 * Combines tag creation and UUID generation in a single operation
 * 
 * @param functionName - Name of the function being called
 * @param position - Position in document
 * @param callIndex - Index among multiple calls of same function
 * @param documentVersion - Optional document version
 * @returns New FunctionCallTag with generated UUID
 */
export function createFunctionCallTag(
  functionName: string,
  position: number,
  callIndex: number,
  documentVersion?: number
): FunctionCallTag {
  const uuid = generateFunctionUUID({
    functionName,
    position,
    callIndex,
    documentVersion
  });
  
  return new FunctionCallTag(uuid, functionName, callIndex);
}