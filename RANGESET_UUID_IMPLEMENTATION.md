# RangeSet-Based UUID Correlation System

## Overview
Successfully migrated from CodeMirror Decorations to RangeSet for UUID-based function call tracking. This provides better performance and automatic mapping through document changes.

## Key Components

### 1. **Core RangeSet Implementation** (`src/uuid-tagging.ts`)

#### UUIDTag RangeValue
```typescript
class UUIDTag extends RangeValue {
  constructor(public uuid: string, public functionName: string)
  eq(other: UUIDTag): boolean
}
```

#### StateField for UUID Management
```typescript
export const uuidRangeSetField = StateField.define<RangeSet<UUIDTag>>({
  create() { return RangeSet.empty; },
  update(value, tr) {
    // Handle explicit updates and automatic mapping through changes
    for (let effect of tr.effects) {
      if (effect.is(setUUIDRangeSet)) return effect.value;
    }
    if (tr.docChanged) return value.map(tr.changes); // Auto-map through changes
    return value;
  }
});
```

#### StateEffect for Updates
```typescript
export const setUUIDRangeSet = StateEffect.define<RangeSet<UUIDTag>>();
```

### 2. **Automatic UUID Management**

#### ViewPlugin for Document Change Handling
```typescript
export const uuidRangeSetPlugin = ViewPlugin.fromClass(class {
  update(update: any) {
    if (this.shouldRegenerateUUIDs(update, currentDocText)) {
      this.regenerateUUIDs(update.view, currentDocText);
    }
  }
  
  private shouldRegenerateUUIDs(): boolean {
    // Regenerate when substantial changes occur (new function calls)
    return hasNewFunctionCalls && textChanged;
  }
});
```

### 3. **Position-Based UUID Lookup**

#### RangeSet Query Functions
```typescript
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

export function getUUIDFromState(state: EditorState, position: number): string | null {
  const rangeSet = state.field(uuidRangeSetField, false);
  if (!rangeSet) return null;
  return getUUIDFromRangeSet(rangeSet, position);
}
```

### 4. **CodeMirror Integration** (`src/codemirror.ts`)

#### Editor State Creation
```typescript
export function createEditorState(content: string = defaultContent): EditorState {
  const { rangeSet } = generateUUIDTags(content);
  
  const state = EditorState.create({
    extensions: [
      // ... other extensions
      uuidRangeSetField,     // Add UUID field
      uuidRangeSetPlugin,    // Add auto-update plugin
    ],
  });
  
  // Apply initial UUID RangeSet
  return state.update({
    effects: setUUIDRangeSet.of(rangeSet)
  }).state;
}
```

### 5. **Lezer Integration** (Unchanged)
The Lezer converter continues to use `getUUIDAtPosition()` which works with the registry populated by `generateUUIDTags()`.

## Key Benefits

### ✅ **Automatic Mapping**
- RangeSet automatically maps UUID positions through document changes
- No manual position tracking required
- UUIDs follow their associated code as text is inserted/deleted

### ✅ **Performance**
- RangeSet is more efficient than Decorations for position tracking
- No DOM elements created for UUID tags
- Efficient range queries with `.between()` method

### ✅ **State Management**
- UUIDs are part of editor state
- Transactions properly handle UUID updates
- ViewPlugin automatically regenerates when needed

### ✅ **Type Safety**
- Full TypeScript support
- Proper RangeValue inheritance
- StateEffect/StateField typing

## Testing

### Range Mapping Test
```typescript
test('should map RangeSet through document changes', () => {
  // Create state with UUID at position 0
  const state = createStateWithUUIDs('sphere()');
  
  // Insert text at beginning
  const changedState = state.update({
    changes: { from: 0, insert: 'let x = ' }
  }).state;
  
  // UUID should now be at position 8
  const mappedUuid = getUUIDFromRangeSet(changedState.field(uuidRangeSetField), 8);
  expect(mappedUuid).toBe(originalUuid);
});
```

## Usage Pattern

1. **Editor Setup**: Create state with `uuidRangeSetField` and `uuidRangeSetPlugin`
2. **UUID Generation**: Call `generateUUIDTags()` to create RangeSet
3. **State Update**: Apply RangeSet with `setUUIDRangeSet.of(rangeSet)` 
4. **Auto-Mapping**: ViewPlugin handles document changes automatically
5. **UUID Lookup**: Use `getUUIDFromState(state, position)` to find UUIDs

## Integration Points

- **CodeMirror**: Editor state management and position tracking
- **Lezer**: AST parsing continues to use registry-based UUID lookup  
- **Nodysseus**: UUID propagation through graph conversion unchanged
- **Testing**: Comprehensive test coverage for mapping behavior

The system now provides robust, performance-optimized UUID correlation that automatically adapts to document changes while maintaining full integration with the existing Lezer/Nodysseus pipeline.