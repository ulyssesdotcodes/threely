# AST to Nodysseus Conversion Analysis

## Issue Description
The DSL code `render(mesh(sphere(), material()), "test")` is being converted to a Nodysseus graph where all edges point to the same node instead of creating a proper hierarchical structure.

## Expected vs Actual Structure

### Expected Graph Structure:
```
Node1 (sphere function) -> Node3 (mesh function) -> Node5 (render function)
Node2 (material function) -> Node3 (mesh function)
Node4 ("test" string) -> Node5 (render function)
```

### Likely Actual Structure:
```
Node1 (sphere function) -> Node5 (render function)
Node2 (material function) -> Node5 (render function)  
Node3 (mesh function) -> Node5 (render function)
Node4 ("test" string) -> Node5 (render function)
```

## Root Cause Analysis

### Potential Issues Identified:

1. **UUID Generation Timing**: The `generateUUIDTags` function must be called before conversion to populate the `functionCallRegistry`. If this step is missed, `getUUIDAtPosition` returns null and falls back to `generateNodeId`.

2. **Node ID Generation**: The fallback `generateNodeId` uses a simple counter that might not be unique across conversion sessions or might be reset.

3. **Argument Processing**: In `convertCallExpression`, arguments are processed recursively:
   ```typescript
   const argNodeIds = args.map((arg: any) => this.convertASTNode(arg, context));
   ```
   If there's an issue in the recursive conversion, all arguments might resolve to the same node ID.

4. **Position Key Collisions**: The `visitedNodes` map uses `${astNode.from}-${astNode.to}` as keys. If different AST node types have the same position range, they would return the same converted node ID.

5. **Context State Management**: The `DirectConversionContext` shares state across all conversions. If there's improper cleanup or state corruption, nodes might interfere with each other.

## Most Likely Culprit: Argument Resolution

Looking at the AST structure:
```
CallExpression (0-42): render(...)
  VariableName (0-6): "render"
  ArgList (6-42): "(mesh(...), "test")"
    CallExpression (7-33): mesh(...)
    String (35-41): "test"
```

The `extractCallExpressionParts` method should correctly identify:
- `functionName = "render"`
- `args = [CallExpression(7-33), String(35-41)]`

Then `convertCallExpression` calls:
```typescript
const argNodeIds = args.map((arg: any) => this.convertASTNode(arg, context));
```

This should recursively convert:
1. `CallExpression(7-33)` → converts to mesh node
2. `String(35-41)` → converts to string value node

But if there's an issue in the recursive conversion (like the mesh CallExpression not properly processing its own arguments), all arguments might collapse to the same node.

## Investigation Steps

1. **Add Debug Logging**: Add detailed logging to track node ID generation and argument processing
2. **Check UUID Registry**: Verify that `generateUUIDTags` is called and populates the registry correctly
3. **Trace Recursive Calls**: Follow the recursive `convertASTNode` calls to see where the hierarchy breaks down
4. **Verify Edge Creation**: Ensure that `createEdge` is called with correct `from` and `to` node IDs

## Fix Strategy

The issue is likely in the argument processing recursion. Each CallExpression should create its own unique node and then create edges from its argument nodes to itself. If this recursion is broken, all nodes end up connecting to the root node instead of their immediate parent.

Key areas to check:
1. `convertCallExpression` argument processing
2. `convertASTNode` recursive calls
3. `visitedNodes` key generation
4. Edge creation in `createExecutableRefNode`