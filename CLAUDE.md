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

### Critical Fixes Applied
- ✅ **Reference sharing bug** - Deep copy in transform logic functions
- ✅ **Watch target bug** - Watch MockObject3D input to render, not final output
- ✅ **Math chaining** - Complete JavaScript Math library as chainable operations
- ✅ **UI consistency** - Run button with proper styling and event handling