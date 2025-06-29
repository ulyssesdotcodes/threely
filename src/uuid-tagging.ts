// UUID-based function call tagging for CodeMirror and Lezer correlation
import { RangeSet, RangeValue, ChangeDesc, StateField, StateEffect, EditorState, Transaction } from "@codemirror/state";
import { EditorView, ViewPlugin } from "@codemirror/view";
import { parser } from "@lezer/javascript";
import { v4 as uuid } from "uuid";

// RangeValue for UUID-tagged function calls
export class UUIDTag extends RangeValue {
  constructor(public uuid: string, public functionName: string) {
    super();
  }

  eq(other: UUIDTag): boolean {
    return this.uuid === other.uuid && this.functionName === other.functionName;
  }
}

// Store mapping between text positions and UUIDs
export interface FunctionCallInfo {
  uuid: string;
  functionName: string;
  from: number;
  to: number;
  astNodeType: string;
}

// StateEffect for updating the UUID RangeSet
export const setUUIDRangeSet = StateEffect.define<RangeSet<UUIDTag>>();

// StateField for maintaining the UUID RangeSet
export const uuidRangeSetField = StateField.define<RangeSet<UUIDTag>>({
  create() {
    return RangeSet.empty;
  },
  
  update(value, tr) {
    // Check for explicit UUID RangeSet updates
    for (let effect of tr.effects) {
      if (effect.is(setUUIDRangeSet)) {
        return effect.value;
      }
    }
    
    // Map existing ranges through document changes
    if (tr.docChanged) {
      return value.map(tr.changes);
    }
    
    return value;
  }
});

// Global registry for function call UUIDs
const functionCallRegistry = new Map<string, FunctionCallInfo>();

export function getFunctionCallRegistry(): Map<string, FunctionCallInfo> {
  return functionCallRegistry;
}

export function clearFunctionCallRegistry(): void {
  functionCallRegistry.clear();
}

// Generate UUID tags for function calls in the given text
export function generateUUIDTags(text: string): {
  rangeSet: RangeSet<UUIDTag>;
  functionCalls: FunctionCallInfo[];
} {
  const functionCalls: FunctionCallInfo[] = [];
  const ranges: { from: number; to: number; value: UUIDTag }[] = [];
  
  // Parse with Lezer to identify function calls
  const tree = parser.parse(text);
  
  // Walk the tree to find CallExpression nodes
  tree.cursor().iterate((node) => {
    if (node.name === 'CallExpression') {
      const callText = text.slice(node.from, node.to);
      
      // Extract function name from the call expression
      const funcNameMatch = callText.match(/^(\w+)/);
      if (funcNameMatch) {
        const functionName = funcNameMatch[1];
        const callUuid = uuid();
        
        const functionCall: FunctionCallInfo = {
          uuid: callUuid,
          functionName,
          from: node.from,
          to: node.to,
          astNodeType: node.name
        };
        
        functionCalls.push(functionCall);
        functionCallRegistry.set(callUuid, functionCall);
        
        // Create UUID tag for this function call
        const uuidTag = new UUIDTag(callUuid, functionName);
        
        ranges.push({
          from: node.from,
          to: node.to,
          value: uuidTag
        });
      }
    }
  });
  
  // Create RangeSet from the ranges
  const rangeSet = RangeSet.of(ranges.map(r => r.value.range(r.from, r.to)));
  
  return { rangeSet, functionCalls };
}

// Get UUID for a function call at a specific position
export function getUUIDAtPosition(position: number): string | null {
  for (const [uuid, info] of functionCallRegistry) {
    if (position >= info.from && position <= info.to) {
      return uuid;
    }
  }
  return null;
}

// Get UUID from RangeSet at a specific position
export function getUUIDFromRangeSet(rangeSet: RangeSet<UUIDTag>, position: number): string | null {
  let foundUuid: string | null = null;
  
  rangeSet.between(position, position, (from, to, value) => {
    if (position >= from && position <= to) {
      foundUuid = value.uuid;
      return false; // Stop iteration
    }
  });
  
  return foundUuid;
}

// Get UUID from editor state at a specific position
export function getUUIDFromState(state: EditorState, position: number): string | null {
  const rangeSet = state.field(uuidRangeSetField, false);
  if (!rangeSet) return null;
  return getUUIDFromRangeSet(rangeSet, position);
}

// Get function call info by UUID
export function getFunctionCallByUUID(uuid: string): FunctionCallInfo | null {
  return functionCallRegistry.get(uuid) || null;
}

// Get all UUIDs for a given function name
export function getUUIDsForFunction(functionName: string): string[] {
  const uuids: string[] = [];
  for (const [uuid, info] of functionCallRegistry) {
    if (info.functionName === functionName) {
      uuids.push(uuid);
    }
  }
  return uuids;
}

// ViewPlugin to automatically update UUID RangeSet when document changes significantly
export const uuidRangeSetPlugin = ViewPlugin.fromClass(class {
   lastDocText: string = '';
  
  constructor(view: EditorView) {
    this.lastDocText = view.state.doc.toString();
  }
  
  update(update: any) {
    const currentDocText = update.state.doc.toString();
    
    // Only regenerate UUIDs if the document content has changed significantly
    // or if we don't have a UUID RangeSet yet
    if (this.shouldRegenerateUUIDs(update, currentDocText)) {
      this.regenerateUUIDs(update.view, currentDocText);
      this.lastDocText = currentDocText;
    }
  }
  
   shouldRegenerateUUIDs(update: any, currentDocText: string): boolean {
    // Regenerate if:
    // 1. The document changed and text is different
    // 2. There's no existing UUID RangeSet
    // 3. The change was substantial (not just whitespace)
    
    if (!update.docChanged) return false;
    
    const hasExistingRangeSet = update.state.field(uuidRangeSetField, false) && 
                               !update.state.field(uuidRangeSetField, false).size;
    
    if (!hasExistingRangeSet) return true;
    
    // Check if this was a substantial change
    const textChanged = this.lastDocText !== currentDocText;
    const hasNewFunctionCalls = /\w+\s*\(/.test(currentDocText) && textChanged;
    
    return hasNewFunctionCalls;
  }
  
   regenerateUUIDs(view: EditorView, text: string) {
    clearFunctionCallRegistry();
    const { rangeSet } = generateUUIDTags(text);
    
    view.dispatch({
      effects: setUUIDRangeSet.of(rangeSet)
    });
  }
});

// Helper function to create UUID-enabled editor state
export function createUUIDEnabledState(content: string, baseExtensions: any[] = []): EditorState {
  const { rangeSet } = generateUUIDTags(content);
  
  return EditorState.create({
    doc: content,
    extensions: [
      ...baseExtensions,
      uuidRangeSetField,
      uuidRangeSetPlugin,
      setUUIDRangeSet.of(rangeSet)
    ]
  });
}

// Helper function to update existing state with UUID tags
export function updateStateWithUUIDs(state: EditorState): Transaction {
  const content = state.doc.toString();
  clearFunctionCallRegistry();
  const { rangeSet } = generateUUIDTags(content);
  
  return state.update({
    effects: setUUIDRangeSet.of(rangeSet)
  });
}

// CSS for UUID-tagged functions
export const uuidTaggingCSS = `
.uuid-tagged-function {
  position: relative;
}

.uuid-tagged-function::after {
  content: attr(data-function);
  position: absolute;
  top: -20px;
  left: 0;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 1000;
}

.uuid-tagged-function:hover::after {
  opacity: 1;
}

/* Debug mode - show UUIDs */
.debug-uuids .uuid-tagged-function::after {
  content: attr(data-uuid);
  opacity: 0.7;
}
`;