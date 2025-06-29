# Threely Project Notes

## 📖 Comprehensive Documentation
**For complete development reference, see: [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)**

The Developer Guide contains everything needed to quickly pick up development on any section of the codebase:
- Architecture overview and file map
- Chain system implementation details  
- DSL system and math functions
- UI components and styling patterns
- Execution flow and reactive runtime
- Testing patterns and debugging solutions
- Common issues and development workflow

## 🚀 Quick Reference

### Core Architecture
- **DSL** (`src/dsl.ts`) - Custom 3D language with chain objects
- **Nodysseus Runtime** (`src/nodysseus/runtime-core.ts`) - Reactive graph execution
- **UI System** (`src/editor.ts`) - Run button, Vim toggle, CodeMirror integration
- **Chain Objects** - Proxy-based fluent APIs (chainObj3d, chainMath)

### Key Patterns
- **Transform functions MUST deep copy** - `geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined`
- **Watch MockObject3D inputs** - Not the final THREE.Object3D outputs
- **Chain setup pattern** - `chainMath.sin = { fn: mathSin, chain: () => chainMath }`
- **Dual-mode functions** - Handle both Node<T> and primitive inputs

### Testing
- **Math chains**: `(frameNode as any).multiply(0.1)` syntax for TypeScript
- **External nodes**: Mock `requestAnimationFrame` from `external-nodes.ts`
- **DSL integration**: `executeDSL()` may return Node or computed value
- **Compilation Check**: Don't use npm run build to test compilation. Use the connected IDE, npm run test, or npx tsc --noEmit

## Advanced Debugging Strategies

### Test-Driven Debugging
- Run specific failing tests first: `npm test -- --testNamePattern="exact test name"`
- Use tests to isolate issues before implementing fixes
- Verify fixes don't break related functionality

### Complex System Debugging
- For runtime/execution issues: trace data flow through conversion pipeline
- For NaN values: check for premature execution of RefNodes or unresolved dependencies
- For double execution: verify conversion flags and pipeline flow
- For type mismatches: ensure proper type guards and conversion logic

### Multi-File Fix Management
- Identify root cause before making changes across files
- Test individual fixes in isolation when possible
- Use git diff to verify only necessary changes are made

### Critical Fixes Applied
- ✅ **Reference sharing bug** - Deep copy in transform logic functions
- ✅ **Watch target bug** - Watch MockObject3D input to render, not final output
- ✅ **Math chaining** - Complete JavaScript Math library as chainable operations
- ✅ **UI consistency** - Run button with proper styling and event handling

# DSL and Parser Development

## Core Systems
- **Lezer Parser**: JavaScript AST parsing with `@lezer/javascript`
- **Functional Graph System**: Node-based computation graphs (`src/graph.ts`)
- **Nodysseus Runtime**: Graph execution engine (`src/nodysseus/runtime-core.ts`)
- **DSL Context**: Chain objects for math and 3D operations

## Key Patterns
- Chain objects use proxy-based method interception for fluent APIs
- RefNodes (like `extern.frame`) require runtime execution, not direct evaluation
- Transform functions MUST deep copy: `geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined`
- Watch MockObject3D inputs, not final THREE.Object3D outputs

## Debugging DSL Issues
- Use specific test patterns: `npm test -- --testNamePattern="specific test"`
- Check for premature execution of RefNodes in graph conversion
- Verify object literal parsing with `ObjectExpression` AST nodes
- Watch for NaN values in frame-based math operations

# Code Cleanup and Refactoring

## Cleanup Priorities
1. Remove debug console.log statements and verbose comments
2. Simplify conditional logic and remove redundant checks
3. Consolidate similar code patterns
4. Remove unused parameters and dead code paths

## Cleanup Process
1. Use `git diff` to track changes and verify minimal impact
2. Test functionality after each cleanup step
3. Preserve all functional behavior while improving readability
4. Focus on making code more concise, not just shorter

## What NOT to Clean Up
- Functional logic that affects behavior
- Type definitions and interfaces
- Error handling and validation
- Domain-specific comments explaining complex algorithms