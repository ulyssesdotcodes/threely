/**
 * CodeMirror State Management for Function Call Range Sets
 * 
 * This module provides state management for tracking function calls in DSL code
 * using CodeMirror's reactive state system. It includes:
 * 
 * - State Effects for adding, removing, and clearing function call tags
 * - State Field for storing and mapping RangeSet<FunctionCallTag> through document changes
 * - Utility functions for querying and manipulating function call state
 * 
 * The implementation follows CodeMirror 6 patterns with proper:
 * - Document change mapping via Transaction.changes
 * - Immutable state updates through state effects
 * - Type-safe range operations with comprehensive error handling
 * - Integration with existing FunctionCallTag and parser systems
 */


import { 
  StateEffect, 
  StateField, 
  EditorState, 
  Transaction, 
  RangeSet,
  Extension
} from '@codemirror/state';
import { 
  FunctionCallTag, 
  FunctionCall, 
  createFunctionCallTag,
  isFunctionCallTag,
  FunctionCallRange
} from './function-call-tag';

/**
 * Configuration options for creating function call tag effects
 */
export interface FunctionTagEffectOptions {
  /** Optional document version for UUID generation */
  documentVersion?: number;
  /** Optional salt for UUID generation */
  salt?: string;
  /** Whether to clear existing tags before adding new ones */
  clearExisting?: boolean;
}

/**
 * Data structure for removing specific function call tags
 */
export interface RemoveTagData {
  /** UUID of the tag to remove */
  uuid: string;
  /** Optional function name for additional validation */
  functionName?: string;
}

/**
 * Data structure for adding new function call tags
 */
export interface AddTagData {
  /** Position in the document where the tag should be placed */
  position: number;
  /** The function call tag to add */
  tag: FunctionCallTag;
}

/**
 * State Effect for adding function call tags to the editor
 * 
 * This effect can add single or multiple tags at once. The tags will be
 * placed at their specified positions and integrated into the existing
 * RangeSet, maintaining proper ordering and handling overlaps.
 * 
 * @example
 * ```typescript
 * const effect = addFunctionTagsEffect.of([
 *   { position: 10, tag: new FunctionCallTag('uuid1', 'frame', 0) }
 * ]);
 * view.dispatch({ effects: [effect] });
 * ```
 */
export const addFunctionTagsEffect = StateEffect.define<AddTagData[]>({
  map: (tags, change) => {
    // Map tag positions through document changes
    return tags.map(({ position, tag }) => ({
      position: change.mapPos(position, 1), // Associate with following text
      tag
    })).filter(({ position }) => position >= 0); // Remove unmappable positions
  }
});

/**
 * State Effect for removing specific function call tags
 * 
 * Removes tags by UUID, providing precise control over which function
 * call markers to remove. This is useful for updating specific tags
 * when function calls are edited or deleted.
 * 
 * @example
 * ```typescript
 * const effect = removeFunctionTagsEffect.of([
 *   { uuid: 'fn-frame-a1b2c3d4', functionName: 'frame' }
 * ]);
 * view.dispatch({ effects: [effect] });
 * ```
 */
export const removeFunctionTagsEffect = StateEffect.define<RemoveTagData[]>();

/**
 * State Effect for clearing all function call tags
 * 
 * Removes all function call tags from the editor. This is useful when
 * performing a full re-analysis of the document or when clearing state
 * before applying a completely new set of tags.
 * 
 * @example
 * ```typescript
 * const effect = clearAllFunctionTagsEffect.of(null);
 * view.dispatch({ effects: [effect] });
 * ```
 */
export const clearAllFunctionTagsEffect = StateEffect.define<null>();

/**
 * State Field for storing function call tags as a RangeSet
 * 
 * This field maintains a RangeSet<FunctionCallTag> that automatically
 * maps through document changes. It handles:
 * 
 * - Mapping existing ranges through edits via Transaction.changes
 * - Applying state effects to add, remove, or clear tags
 * - Maintaining proper range ordering and avoiding overlaps
 * - Providing immutable state updates
 * 
 * The field starts with an empty RangeSet and updates reactively
 * as effects are applied and document changes occur.
 */
export const functionTagField = StateField.define<RangeSet<FunctionCallTag>>({
  /**
   * Initial state: empty RangeSet
   */
  create(): RangeSet<FunctionCallTag> {
    return RangeSet.empty;
  },

  /**
   * Update function handles both document changes and state effects
   * 
   * @param value - Current RangeSet of function call tags
   * @param tr - Transaction containing changes and effects
   * @returns Updated RangeSet after applying changes and effects
   */
  update(value: RangeSet<FunctionCallTag>, tr: Transaction): RangeSet<FunctionCallTag> {
    // First, map existing ranges through document changes
    let newValue = value;
    if (tr.changes.empty === false) {
      newValue = value.map(tr.changes);
    }

    // Then apply any effects
    for (const effect of tr.effects) {
      if (effect.is(addFunctionTagsEffect)) {
        // Add new function call tags
        const ranges: { from: number; to: number; value: FunctionCallTag }[] = 
          effect.value.map(({ position, tag }) => ({
            from: position,
            to: position, // Point range
            value: tag
          }));
        
        // Add ranges to the RangeSet, automatically handling ordering and overlaps
        newValue = newValue.update({
          add: ranges,
          sort: true // Ensure ranges remain sorted
        });
      } 
      else if (effect.is(removeFunctionTagsEffect)) {
        // Remove specific function call tags by UUID
        const uuidsToRemove = new Set(effect.value.map(data => data.uuid));
        const rangesToRemove: { from: number; to: number }[] = [];
        
        // Collect ranges to remove
        newValue.between(0, tr.state.doc.length, (from, to, tag) => {
          if (uuidsToRemove.has(tag.uuid)) {
            rangesToRemove.push({ from, to });
          }
        });
        
        // Remove collected ranges
        if (rangesToRemove.length > 0) {
          newValue = newValue.update({
            filter: (from, to, tag) => !uuidsToRemove.has(tag.uuid)
          });
        }
      }
      else if (effect.is(clearAllFunctionTagsEffect)) {
        // Clear all function call tags
        newValue = RangeSet.empty;
      }
    }

    return newValue;
  }
});

/**
 * Gets all function call tags within a specific range of the document
 * 
 * @param state - The editor state to query
 * @param from - Start position (inclusive)
 * @param to - End position (exclusive)
 * @returns Array of FunctionCallRange objects within the specified range
 * 
 * @example
 * ```typescript
 * const tags = getFunctionTagsInRange(state, 0, 100);
 * console.log(`Found ${tags.length} function calls in first 100 characters`);
 * ```
 */
export function getFunctionTagsInRange(
  state: EditorState, 
  from: number, 
  to: number
): FunctionCallRange[] {
  const tags: FunctionCallRange[] = [];
  const rangeSet = state.field(functionTagField, false);
  
  if (!rangeSet) {
    return tags;
  }

  // Collect all tags that intersect with the specified range
  rangeSet.between(from, to, (rangeFrom, rangeTo, tag) => {
    if (isFunctionCallTag(tag)) {
      tags.push({
        from: rangeFrom,
        to: rangeTo,
        value: tag
      });
    }
  });

  return tags;
}

/**
 * Gets the function call tag at a specific position in the document
 * 
 * If multiple tags exist at the same position, returns the most recently added one.
 * 
 * @param state - The editor state to query
 * @param position - Character position to search at
 * @returns The function call tag at the position, or null if none found
 * 
 * @example
 * ```typescript
 * const tag = getFunctionTagAt(state, cursorPosition);
 * if (tag) {
 *   console.log(`Function call: ${tag.value.functionName} (${tag.value.uuid})`);
 * }
 * ```
 */
export function getFunctionTagAt(state: EditorState, position: number): FunctionCallRange | null {
  const tags = getFunctionTagsInRange(state, position, position + 1);
  
  // Return the first tag found at this position
  // Since ranges are point ranges, any tag intersecting position to position+1
  // is effectively at that position
  return tags.length > 0 ? tags[0] : null;
}

/**
 * Gets all function call tags in the entire document
 * 
 * @param state - The editor state to query
 * @returns Array of all FunctionCallRange objects in the document
 * 
 * @example
 * ```typescript
 * const allTags = getAllFunctionTags(state);
 * console.log(`Document contains ${allTags.length} function calls`);
 * for (const tag of allTags) {
 *   console.log(`${tag.value.functionName} at position ${tag.from}`);
 * }
 * ```
 */
export function getAllFunctionTags(state: EditorState): FunctionCallRange[] {
  const rangeSet = state.field(functionTagField, false);
  
  if (!rangeSet) {
    return [];
  }

  return getFunctionTagsInRange(state, 0, state.doc.length);
}

/**
 * Helper function to create effects for adding function call tags from parsed function calls
 * 
 * This utility function bridges the gap between the AST parser (which produces FunctionCall objects)
 * and the state management system (which uses StateEffects). It handles:
 * 
 * - UUID generation for each function call
 * - Call index calculation for multiple calls of the same function
 * - Proper tag creation with position mapping
 * - Optional clearing of existing tags
 * 
 * @param functionCalls - Array of parsed function calls from AST
 * @param options - Configuration options for tag creation and UUID generation
 * @returns Array of StateEffect objects ready for dispatch
 * 
 * @example
 * ```typescript
 * // Parse function calls from code
 * const calls = findFunctionCalls(code);
 * 
 * // Create effects for adding tags
 * const effects = createFunctionTagEffects(calls, {
 *   documentVersion: 1,
 *   clearExisting: true
 * });
 * 
 * // Apply to editor
 * view.dispatch({ effects });
 * ```
 */
export function createFunctionTagEffects(
  functionCalls: FunctionCall[], 
  options: FunctionTagEffectOptions = {}
): StateEffect<any>[] {
  const effects: StateEffect<any>[] = [];
  
  // Clear existing tags if requested
  if (options.clearExisting) {
    effects.push(clearAllFunctionTagsEffect.of(null));
  }

  if (functionCalls.length === 0) {
    return effects;
  }

  // Count function calls by name to assign proper call indices
  const callCounts = new Map<string, number>();
  const tagsToAdd: AddTagData[] = [];

  // Process each function call, including nested ones
  const processCall = (call: FunctionCall) => {
    const functionName = call.name;
    const currentCount = callCounts.get(functionName) || 0;
    callCounts.set(functionName, currentCount + 1);

    // Create tag for this function call
    const tag = createFunctionCallTag(
      functionName,
      call.start,
      currentCount,
      options.documentVersion
    );

    tagsToAdd.push({
      position: call.start,
      tag
    });

    // Process nested function calls in arguments
    for (const argCall of call.args) {
      processCall(argCall);
    }
  };

  // Process all function calls
  for (const call of functionCalls) {
    processCall(call);
  }

  // Add the tags if we have any
  if (tagsToAdd.length > 0) {
    effects.push(addFunctionTagsEffect.of(tagsToAdd));
  }

  return effects;
}

/**
 * Convenience function to get the current function tag field value
 * 
 * @param state - The editor state to query
 * @returns The current RangeSet of function call tags, or empty set if field not present
 */
export function getFunctionTagField(state: EditorState): RangeSet<FunctionCallTag> {
  const rangeSet = state.field(functionTagField, false);
  return rangeSet || RangeSet.empty;
}

/**
 * Creates a function tag field extension for use in editor configuration
 * 
 * This extension can be added to an EditorState to enable function call tag tracking.
 * 
 * @returns Extension containing the function tag field
 * 
 * @example
 * ```typescript
 * const state = EditorState.create({
 *   doc: code,
 *   extensions: [
 *     basicSetup,
 *     javascript(),
 *     functionTagExtension()
 *   ]
 * });
 * ```
 */
export function functionTagExtension(): Extension {
  return functionTagField;
}

/**
 * Type guard to check if a StateEffect is a function tag effect
 * 
 * @param effect - StateEffect to check
 * @returns true if the effect is one of the function tag effects
 */
export function isFunctionTagEffect(effect: StateEffect<any>): boolean {
  return effect.is(addFunctionTagsEffect) || 
         effect.is(removeFunctionTagsEffect) || 
         effect.is(clearAllFunctionTagsEffect);
}

/**
 * Utility function to count function calls by name in the current state
 * 
 * @param state - The editor state to analyze
 * @returns Map of function names to their occurrence counts
 * 
 * @example
 * ```typescript
 * const counts = countFunctionCallsByName(state);
 * console.log(`Document has ${counts.get('frame') || 0} frame() calls`);
 * ```
 */
export function countFunctionCallsByName(state: EditorState): Map<string, number> {
  const counts = new Map<string, number>();
  const tags = getAllFunctionTags(state);
  
  for (const tag of tags) {
    const functionName = tag.value.functionName;
    counts.set(functionName, (counts.get(functionName) || 0) + 1);
  }
  
  return counts;
}

/**
 * Gets function call tags for a specific function name
 * 
 * @param state - The editor state to query
 * @param functionName - Name of the function to find
 * @returns Array of FunctionCallRange objects for the specified function
 * 
 * @example
 * ```typescript
 * const frameCalls = getFunctionTagsByName(state, 'frame');
 * console.log(`Found ${frameCalls.length} frame() calls`);
 * ```
 */
export function getFunctionTagsByName(state: EditorState, functionName: string): FunctionCallRange[] {
  const allTags = getAllFunctionTags(state);
  return allTags.filter(tag => tag.value.functionName === functionName);
}