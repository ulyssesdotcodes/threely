# Threely Project Notes

## Architecture
- **Nodysseus runtime system** - Core reactive node graph system with `NodysseusRuntime` class
- **External node handlers** - `ExternalNodeHandler` class manages external node types like `extern.frame`
- **Watch system** - `createWatch()` method creates async iterables for observing node value changes

## Testing Patterns
- **Helper functions** - `runGraph(graph)` helper simplifies graph execution in tests
- **External node testing** - Use `runtime.externalHandler.handleFrameExtern()` directly rather than full graph execution
- **Mock patterns** - Mock `requestAnimationFrame` from `external-nodes.ts` for frame extern testing

## Key Components
- **Frame extern** (`extern.frame`) - Auto-incrementing counter using requestAnimationFrame, starts at 1
- **VarNode vs MapNode** - VarNodes are simple values, MapNodes have `cachedInputs` and dependency tracking
- **Graph structure** - `edges_in` object maps node IDs to their input edge objects (not simple strings)

## Code Conventions
- TypeScript with explicit parameter types in mapNode functions
- External node refs: use `ref: 'extern.frame'` directly (handled by `ExternalNodeHandler`)
- Test files use Jest with async/await patterns for watch testing