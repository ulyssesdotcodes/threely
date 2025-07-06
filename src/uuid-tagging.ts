// UUID-based function call tagging for CodeMirror and Lezer correlation
import {
  RangeSet,
  RangeValue,
  ChangeDesc,
  StateField,
  StateEffect,
  EditorState,
  Transaction,
} from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { parser } from "@lezer/javascript";
import { v4 as uuid } from "uuid";

// RangeValue for UUID-tagged function calls
export class UUIDTag extends RangeValue {
  constructor(
    public uuid: string,
    public functionName: string,
  ) {
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
    if (value.size === 0) {
      return generateUUIDTags(tr.state.doc.toString()).rangeSet;
    }
    // Map existing ranges through document changes
    if (tr.docChanged) {
      return value.map(tr.changes);
    }

    // Apply any explicit range set updates
    for (let effect of tr.effects) {
      if (effect.is(setUUIDRangeSet)) {
        return effect.value;
      }
    }

    return value;
  },
});

// Generate UUID tags for function calls and constants in the given text
export function generateUUIDTags(
  text: string,
  existingRangeSet?: RangeSet<UUIDTag>,
): {
  rangeSet: RangeSet<UUIDTag>;
  functionCalls: FunctionCallInfo[];
} {
  const functionCalls: FunctionCallInfo[] = [];
  const ranges: { from: number; to: number; value: UUIDTag }[] = [];

  // Helper function to find existing UUID at a position
  const findExistingUUID = (
    from: number,
    to: number,
    nodeText: string,
  ): string | null => {
    if (!existingRangeSet) return null;

    let foundUuid: string | null = null;

    existingRangeSet.between(from, to, (rangeFrom, rangeTo, value) => {
      // Check if this range matches our node position and content
      if (
        rangeFrom === from &&
        rangeTo === to &&
        value.functionName === nodeText
      ) {
        foundUuid = value.uuid;
        return false; // Stop iteration
      }
    });

    return foundUuid;
  };

  // Parse with Lezer to identify function calls and constants
  const tree = parser.parse(text);

  // Walk the tree to find all node types the converter processes
  tree.cursor().iterate((node) => {
    if (node.name === "CallExpression") {
      const nameNode =
        node.node.getChild("MemberExpression")?.getChild("PropertyName") ??
        node.node.getChild("VariableName");
      const functionName = text.slice(nameNode!.from, nameNode!.to);

      // Try to find existing UUID first
      const existingUuid = findExistingUUID(
        nameNode!.from,
        nameNode!.to,
        functionName,
      );
      const callUuid = existingUuid || uuid();

      // Extract function name from the call expression
      const functionCall: FunctionCallInfo = {
        uuid: callUuid,
        functionName,
        from: nameNode!.from,
        to: nameNode!.to,
        astNodeType: node.name,
      };

      functionCalls.push(functionCall);

      // Create UUID tag for this function call
      const uuidTag = new UUIDTag(callUuid, functionName);

      ranges.push({
        from: nameNode!.from,
        to: nameNode!.to,
        value: uuidTag,
      });
    } else if (
      node.name === "Number" ||
      node.name === "String" ||
      node.name === "ObjectExpression"
    ) {
      const nodeText = text.slice(node.from, node.to);

      // Try to find existing UUID first
      const existingUuid = findExistingUUID(node.from, node.to, nodeText);
      const nodeUuid = existingUuid || uuid();

      // Create function call info
      const functionCall: FunctionCallInfo = {
        uuid: nodeUuid,
        functionName: nodeText,
        from: node.from,
        to: node.to,
        astNodeType: node.name,
      };

      functionCalls.push(functionCall);

      // Create UUID tag for this node
      const uuidTag = new UUIDTag(nodeUuid, nodeText);

      ranges.push({
        from: node.from,
        to: node.to,
        value: uuidTag,
      });
    }
  });

  // Create RangeSet from the ranges
  const rangeSet = RangeSet.of(
    ranges
      .sort((ra, rb) => ra.from - rb.from)
      .map((r) => r.value.range(r.from, r.to)),
  );

  return { rangeSet, functionCalls };
}

// Get UUID from RangeSet at a specific position
export function getUUIDFromRangeSet(
  rangeSet: RangeSet<UUIDTag>,
  position: number,
): string | null {
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
export function getUUIDFromState(
  state: EditorState,
  position: number,
): string | null {
  const rangeSet = state.field(uuidRangeSetField, false);
  if (!rangeSet) return null;
  return getUUIDFromRangeSet(rangeSet, position);
}

// Helper function to create UUID-enabled editor state
export function createUUIDEnabledState(
  content: string,
  baseExtensions: any[] = [],
): EditorState {
  const { rangeSet } = generateUUIDTags(content);

  return EditorState.create({
    doc: content,
    extensions: [
      ...baseExtensions,
      uuidRangeSetField,
      setUUIDRangeSet.of(rangeSet),
    ],
  });
}

// Helper function to update existing state with UUID tags
export function updateStateWithUUIDs(state: EditorState): Transaction {
  const content = state.doc.toString();
  const { rangeSet } = generateUUIDTags(content);

  return state.update({
    effects: setUUIDRangeSet.of(rangeSet),
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
