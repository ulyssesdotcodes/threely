# CodeMirror Range Sets Implementation Plan

## Overview

Implement code tagging using CodeMirror Range Sets to assign stable UUIDs to function calls that persist through document edits. These UUIDs will replace the current counter-based node IDs, providing consistent identification for nodes in the Nodysseus graph regardless of text changes.

## Current State Analysis

### Existing Architecture
- **Function IDs**: Simple counter (`node-${++nodeIdCounter}`)
- **CodeMirror**: Basic setup with no Extensions or Transaction handling
- **DSL Flow**: Text → parseDSL → Functional Graph → Nodysseus Runtime
- **Position Tracking**: None - no link between source code position and node creation

### Problems to Solve
1. Function calls have unstable IDs that change between executions
2. No source position information preserved in graph nodes
3. Frame nodes use timestamp-based IDs, preventing proper caching
4. No tracking of function calls through document edits

## Implementation Strategy

### Phase 1: Range Set Foundation

#### 1.1 Define Function Call RangeValue
Create a custom RangeValue class for tagging function calls:

```typescript
class FunctionCallTag extends RangeValue {
  constructor(
    public uuid: string,
    public functionName: string,
    public callIndex: number // For multiple calls of same function
  ) { super() }

  eq(other: FunctionCallTag): boolean {
    return this.uuid === other.uuid &&
           this.functionName === other.functionName &&
           this.callIndex === other.callIndex
  }

  // Point range - represents function call location
  point = true
  
  // Survive deletions as long as call itself isn't deleted
  mapMode = MapMode.TrackDel
}
```

#### 1.2 Function Call Detection
Create parser to identify function calls in DSL code:

```typescript
interface FunctionCall {
  name: string
  start: number  // Character position in document
  end: number
  args: FunctionCall[] // Nested function calls
}

function findFunctionCalls(code: string): FunctionCall[] {
  // Parse AST to find function call nodes
  // Return positions and nesting structure
}
```

#### 1.3 UUID Generation Strategy
Create deterministic UUID system:

```typescript
function generateFunctionUUID(
  functionName: string,
  position: number,
  documentVersion: number,
  callIndex: number
): string {
  // Use position + function name + call index for deterministic UUID
  // Include document version for cache busting when needed
}
```

### Phase 2: CodeMirror Extension

#### 2.1 State Effect Definition
Define effects for managing function call tags:

```typescript
const functionTagEffect = StateEffect.define<{
  add?: Range<FunctionCallTag>[]
  remove?: Range<FunctionCallTag>[]
  clear?: boolean
}>({
  map: (value, mapping) => ({
    add: value.add?.map(range => range.map(mapping)).filter(r => r != null),
    remove: value.remove?.map(range => range.map(mapping)).filter(r => r != null),
    clear: value.clear
  })
})
```

#### 2.2 State Field for Range Set
Create state field to store function call Range Set:

```typescript
const functionTagField = StateField.define<RangeSet<FunctionCallTag>>({
  create() {
    return RangeSet.empty
  },

  update(value, tr) {
    // Map existing ranges through document changes
    value = value.map(tr.changes)
    
    // Apply effects from transactions
    for (let effect of tr.effects) {
      if (effect.is(functionTagEffect)) {
        value = value.update({
          add: effect.value.add,
          filter: effect.value.clear ? () => false : undefined
        })
      }
    }
    
    return value
  }
})
```

#### 2.3 Function Call Detection Extension
Extension that identifies and tags function calls on document changes:

```typescript
const functionCallTagger = EditorView.updateListener.of((update) => {
  if (update.docChanged) {
    const effects: StateEffect<any>[] = []
    
    // Re-analyze current code block for function calls
    const currentBlock = getCurrentCodeBlock(update.view)
    const functionCalls = findFunctionCalls(currentBlock.text)
    
    // Create new tags for all function calls
    const newTags = functionCalls.map((call, index) => {
      const uuid = generateFunctionUUID(
        call.name,
        currentBlock.start + call.start,
        update.view.state.doc.version,
        index
      )
      
      return new FunctionCallTag(uuid, call.name, index).range(
        currentBlock.start + call.start,
        currentBlock.start + call.end
      )
    })
    
    // Clear old tags and add new ones
    effects.push(functionTagEffect.of({
      clear: true,
      add: newTags
    }))
    
    // Dispatch update
    if (effects.length > 0) {
      update.view.dispatch({ effects })
    }
  }
})
```

### Phase 3: Integration with DSL System

#### 3.1 UUID Lookup Interface
Create interface to get UUIDs for function calls during execution:

```typescript
interface FunctionTagStore {
  getUUIDForCall(functionName: string, position: number): string | undefined
  getAllTagsInRange(from: number, to: number): FunctionCallTag[]
  getCurrentBlockTags(cursorPos: number): FunctionCallTag[]
}

function createTagStore(view: EditorView): FunctionTagStore {
  return {
    getUUIDForCall(functionName, position) {
      const state = view.state.field(functionTagField)
      let result: string | undefined
      
      state.between(position, position + 1, (from, to, value) => {
        if (value.functionName === functionName) {
          result = value.uuid
          return false // Stop iteration
        }
      })
      
      return result
    },
    // ... other methods
  }
}
```

#### 3.2 Enhanced Node Creation
Modify graph node creation to use UUIDs from Range Sets:

```typescript
// In graph.ts - modify createNode function
export const createNode = <T>(
  value: any,
  dependencies: Node<any>[] = [],
  chain: any = null,
  sourceInfo?: { functionName: string, position: number, tagStore?: FunctionTagStore }
): Node<T> => {
  let nodeId: string
  
  if (sourceInfo?.tagStore) {
    // Try to get UUID from Range Set
    const uuid = sourceInfo.tagStore.getUUIDForCall(
      sourceInfo.functionName,
      sourceInfo.position
    )
    nodeId = uuid || generateUniqueId() // Fallback to counter
  } else {
    nodeId = generateUniqueId() // Existing behavior
  }

  return {
    id: nodeId,
    value,
    dependencies,
    chain
  }
}
```

#### 3.3 DSL Function Enhancement
Enhance DSL functions to pass source information:

```typescript
// Example for frame() function
export const frame = (tagStore?: FunctionTagStore, position?: number): Node<any> => {
  const frameRefNode: RefNode = {
    id: tagStore?.getUUIDForCall('frame', position || 0) || 'frame-default',
    ref: 'extern.frame'
  };
  
  return createNode(frameRefNode, [], chainMath, {
    functionName: 'frame',
    position: position || 0,
    tagStore
  });
};
```

### Phase 4: Execution Context Integration

#### 4.1 Enhanced parseDSL Function
Modify parseDSL to provide source context to DSL functions:

```typescript
export function parseDSL(code: string, view?: EditorView): any {
  const tagStore = view ? createTagStore(view) : undefined
  
  // Create enhanced context with position-aware functions
  const enhancedContext = {
    ...createDSLContext(),
    // Override functions to include position information
    frame: () => frame(tagStore, getCurrentPosition()),
    mesh: (geo: any, mat: any) => mesh(geo, mat, tagStore, getCurrentPosition()),
    // ... other functions
  }
  
  // Parse and execute with enhanced context
  const fn = new Function(...Object.keys(enhancedContext), code);
  return fn(...Object.values(enhancedContext));
}
```

#### 4.2 Position Tracking During Execution
Track current position during DSL execution:

```typescript
class ExecutionContext {
  private currentPosition = 0
  private tagStore?: FunctionTagStore
  
  constructor(tagStore?: FunctionTagStore) {
    this.tagStore = tagStore
  }
  
  withPosition<T>(position: number, fn: () => T): T {
    const oldPos = this.currentPosition
    this.currentPosition = position
    try {
      return fn()
    } finally {
      this.currentPosition = oldPos
    }
  }
  
  getCurrentUUID(functionName: string): string | undefined {
    return this.tagStore?.getUUIDForCall(functionName, this.currentPosition)
  }
}
```

### Phase 5: Testing Strategy

#### 5.1 Unit Tests for Range Sets
- Test FunctionCallTag creation and equality
- Test Range Set updates and mapping through changes
- Test UUID generation and determinism

#### 5.2 Integration Tests for Extension
- Test function call detection in various DSL patterns
- Test Range Set updates when code changes
- Test position tracking through edits

#### 5.3 End-to-End Tests
- Test stable node IDs across executions
- Test frame counter persistence with same UUID
- Test nested function call tagging

#### 5.4 Performance Tests
- Measure Range Set update performance on large documents
- Test memory usage with many tagged function calls
- Benchmark function call detection on complex DSL code

## Implementation Order

### Milestone 1: Foundation (Phase 1)
1. Create FunctionCallTag RangeValue class
2. Implement function call detection parser
3. Create UUID generation system
4. Write unit tests for core components

### Milestone 2: CodeMirror Integration (Phase 2)
1. Implement State Effect and State Field
2. Create function call detection Extension
3. Add Range Set debugging utilities
4. Write integration tests for Extension

### Milestone 3: DSL Integration (Phase 3)
1. Create FunctionTagStore interface
2. Enhance node creation system
3. Update DSL functions to use UUIDs
4. Write tests for UUID lookup and usage

### Milestone 4: Execution Integration (Phase 4)
1. Enhance parseDSL with position context
2. Create ExecutionContext for position tracking
3. Update executeDSL flow
4. Write end-to-end tests

### Milestone 5: Optimization and Polish (Phase 5)
1. Performance optimization
2. Error handling and edge cases
3. Documentation and examples
4. Final integration testing

## Success Criteria

1. **Stable Node IDs**: Function calls receive consistent UUIDs across executions
2. **Position Tracking**: UUIDs survive document edits via Range Set mapping
3. **Frame Persistence**: frame() calls maintain same UUID, enabling proper caching
4. **Performance**: No noticeable slowdown in editor responsiveness
5. **Compatibility**: Existing DSL code continues to work without modification
6. **Testability**: Comprehensive test coverage for all components

## Technical Risks and Mitigations

### Risk 1: Performance Impact
**Issue**: Range Set updates on every keystroke could impact editor performance
**Mitigation**: 
- Only analyze current code block, not entire document
- Debounce Range Set updates
- Use efficient function call detection algorithm

### Risk 2: Complex Nested Function Calls
**Issue**: Difficult to accurately parse and position complex DSL expressions
**Mitigation**:
- Start with simple function call patterns
- Incrementally add support for more complex cases
- Provide fallback to counter-based IDs for unparseable cases

### Risk 3: UUID Collision or Instability
**Issue**: Generated UUIDs might collide or change unexpectedly
**Mitigation**:
- Use crypto-quality randomness for UUID base
- Include position and content hash in UUID generation
- Add UUID validation and collision detection

### Risk 4: Integration Complexity
**Issue**: Deep integration with existing DSL and graph systems
**Mitigation**:
- Implement incrementally with backward compatibility
- Use feature flags for gradual rollout
- Extensive testing of existing functionality

This plan provides a structured approach to implementing code tagging with Range Sets while maintaining system stability and performance.