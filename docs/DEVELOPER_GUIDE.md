# Threely Developer Guide

**Quick reference for picking up development on any section of the codebase.**

## 🏗️ Architecture Overview

### Core Systems
- **DSL (Domain Specific Language)** - Custom 3D object creation language (`src/dsl.ts`)
- **Nodysseus Runtime** - Reactive graph execution system (`src/nodysseus/runtime-core.ts`)
- **Chain Objects** - Proxy-based fluent APIs for 3D transforms and math operations
- **CodeMirror Integration** - Live coding editor with text block execution (`src/editor.ts`, `src/codemirror.ts`)
- **Mock Objects** - Intermediate 3D representations before THREE.js conversion (`src/three/MockObject3D.ts`)

### Key Files Map
```
src/
├── dsl.ts                      # 🎯 Main DSL implementation, chain objects, math functions
├── editor.ts                   # 🎨 UI components (Run button, Vim toggle, editor setup)
├── codemirror.ts              # ⌨️  CodeMirror integration, Ctrl+Enter handling
├── graph.ts                   # 📊 Node-based computation graph with Proxy chaining
├── graph-to-nodysseus-converter.ts # 🔄 Converts functional graphs to Nodysseus format
├── text_utils.ts              # 📝 Text block detection (double newline separation)
├── nodysseus/
│   ├── runtime-core.ts        # ⚡ Reactive execution engine
│   ├── external-nodes.ts      # 🔌 External node handlers (frame, JavaScript, etc.)
│   └── types.ts               # 📋 Type definitions for Nodysseus system
└── three/
    └── MockObject3D.ts        # 🎭 Mock 3D objects and THREE.js conversion
```

## 🔗 Chain System Architecture

### Proxy-Based Chaining (graph.ts:39-54)
```typescript
createNode = <T>(value, dependencies, chain) => (new Proxy({
  id: generateUniqueId(),
  value, dependencies
}, {
  get(target, property) {
    if (chain[property]) {
      return (...args) => {
        args = args.map(a => a.id ? a : constant(a));
        return createNode(chain[property].fn, [target, ...args], chain[property].chain())
      }
    }
  }
}));
```

### Chain Objects
- **chainObj3d** - 3D transformations (translateX, rotateY, render, etc.)
- **chainMath** - Mathematical operations (multiply, add, sin, cos, etc.)

### Chain Setup Pattern
```typescript
chainMath.multiply = { fn: multiply, chain: () => chainMath };
chainMath.sin = { fn: mathSin, chain: () => chainMath };
```

## 🎯 DSL System (src/dsl.ts)

### Core Functions
```typescript
// Geometry creation
sphere(radius?, widthSegments?, heightSegments?) → Node<MockGeometry>
box(width?, height?, depth?) → Node<MockGeometry>
material(options?) → Node<THREE.Material>
mesh(geometry, material) → Node<MockObject3D>

// Animation
frame() → Node<number> (with chainMath)

// 3D Transformations (dual-mode: Node or direct MockObject3D)
translateX(object, distance) → Node<MockObject3D> | MockObject3D
rotateY(object, angle) → Node<MockObject3D> | MockObject3D

// Math Operations (both function and chain style)
multiply(a, b) → Node<number>
frame().multiply(0.1) → Node<number>
```

### Transform Logic Pattern (CRITICAL - prevents reference sharing bugs)
```typescript
const translateXLogic = (mockObject: MockObject3D, distance: number): MockObject3D => {
  if (!mockObject) return { geometry: undefined, userData: undefined };
  
  return {
    // DEEP COPY to prevent reference sharing
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    userData: mockObject.userData ? { ...mockObject.userData } : undefined,
    ...mockObject,
    position: {
      x: currentPos.x + distance,
      y: currentPos.y, z: currentPos.z
    }
  };
};
```

### Math Chain Functions (35+ functions)
```typescript
// Basic: multiply, add, subtract, divide
// Trig: sin, cos, tan, asin, acos, atan, atan2
// Log: log, log10, log2, exp, sqrt, cbrt
// Utility: abs, round, floor, ceil, sign, min, max
```

## 🎨 UI System (src/editor.ts)

### Component Creation Pattern
```typescript
export function createRunButton(): HTMLElement {
  const button = document.createElement('button');
  button.className = 'run-button';
  button.innerHTML = `<svg>...</svg><span>Run</span>`;
  
  button.addEventListener('click', () => {
    const view = getCurrentEditorView();
    const blockInfo = getBlockAtCursor(view);
    if (blockInfo?.block) {
      executeDSL(blockInfo.block.trim());
    }
  });
  
  return button;
}
```

### UI Components
- **Run Button** (`right: 140px`) - Green button with play icon, executes current block
- **Vim Toggle** (`right: 20px`) - Checkbox for Vim mode, persists to localStorage
- **CodeMirror Editor** - Full-screen transparent overlay with backdrop-filter

### Styling Pattern
- Fixed positioning with high z-index (1000)
- Backdrop blur: `backdrop-filter: blur(4px)`
- Hover effects with transform and shadow
- System font stack for consistency

## ⚡ Execution Flow

### Code Execution (Ctrl+Enter / Run Button)
1. `getCurrentEditorView()` - Get CodeMirror instance
2. `getBlockAtCursor()` - Find text block at cursor
3. `getTextBlockAtPosition()` - Extract block (separated by `\n\n`)
4. `executeDSL()` - Parse and execute DSL code
5. Scene updates with rendered objects

### DSL Execution Pipeline (src/dsl.ts:578-745)
```typescript
executeDSL(code) {
  const result = parseDSL(code);  // Parse with Function constructor
  
  if (isNode(result)) {
    const nodysseusGraph = convertGraphToNodysseus(result);
    const finalComputed = runtime.runGraphNode(nodysseusGraph, nodysseusGraph.out);
    
    // Set up reactive watch for frame() animations
    if (graphContainsFrame && finalComputed instanceof THREE.Object3D) {
      // Watch MockObject3D input to render function (NOT final output)
      const watch = runtime.createWatch<MockObject3D>(mockObjectNode);
      // Apply updates to existing scene object
    }
    
    return finalComputed;
  }
}
```

### Frame Animation System
- `extern.frame` - Auto-incrementing counter using requestAnimationFrame
- Starts at 1, increments each frame
- Watch system monitors MockObject3D inputs for reactive updates
- **Key Fix**: Watch the input to render function, not the final THREE.Object3D output

## 🔧 Nodysseus Runtime (src/nodysseus/)

### Core Execution (`runtime-core.ts:625-754`)
```typescript
runNode(node) {
  const current = node.value?.read();
  
  if (isMapNode(node) || isBindNode(node)) {
    // Calculate inputs recursively
    const inputs = Object.keys(node.inputs).map(key => 
      this.runNode(this.scope.get(node.inputs[key]))
    );
    
    // Execute node function with inputs
    const result = node.fn(inputs);
    node.value.write(result);
    
    // Notify watchers
    this.watches.get(node.id)?.forEach(fn => fn(result));
    
    return result;
  }
  
  return current;
}
```

### External Nodes (`external-nodes.ts`)
- **extern.frame** - Animation counter with requestAnimationFrame
- **@graph.executable** - Function execution nodes
- **@js.script** - JavaScript code execution

### Watch System
```typescript
createWatch<T>(node): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]: () => ({
      next: () => new Promise(resolve => {
        const watch = (value: T) => {
          // Remove self from watchers and resolve
          resolve({ value });
        };
        this.addWatchFn(node, watch);
      })
    })
  };
}
```

## 🎭 Mock Object System (src/three/MockObject3D.ts)

### Mock Types
```typescript
type MockGeometry = MockSphereGeometry | MockBoxGeometry | MockCylinderGeometry;
type MockObject3D = {
  geometry?: MockGeometry;
  userData?: any;
  position?: Vector3Like;
  rotation?: EulerLike;
  scale?: Vector3Like;
  // ... other THREE.js properties
};
```

### Conversion Pipeline
```typescript
createGeometryFromMock(mock: MockGeometry): BufferGeometry {
  switch (mock.type) {
    case 'sphere': return new SphereGeometry(mock.radius, ...);
    case 'box': return new BoxGeometry(mock.width, ...);
    // ...
  }
}

applyMockToObject3D(object: Object3D, mock: MockObject3D) {
  // Apply position, rotation, scale, materials, etc.
  // Creates real THREE.js geometry from mock specifications
}
```

## 🧪 Testing Patterns

### Math Chain Testing
```typescript
it('should allow chaining', () => {
  const result = (frameNode as any).multiply(0.1).add(5).sin();
  expect(result.id).toBeDefined(); // Returns Node, not computed value
});
```

### DSL Integration Testing
```typescript
it('should execute DSL', () => {
  const result = executeDSL('frame().multiply(0.1)');
  // May return Node or computed value depending on context
});
```

### External Node Testing
```typescript
// Mock requestAnimationFrame for frame extern testing
jest.spyOn(externalNodes, 'requestAnimationFrame').mockImplementation(mockRAF);
```

## 🚨 Common Issues & Solutions

### Reference Sharing Bug (RESOLVED)
**Problem**: Transform functions shared geometry references, causing mutations
**Solution**: Deep copy geometry and userData in transform logic functions
```typescript
// ❌ Wrong: geometry: mockObject.geometry  
// ✅ Right: geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined
```

### Watch Target Bug (RESOLVED)
**Problem**: Watching final THREE.Object3D instead of MockObject3D input
**Solution**: Watch the MockObject3D node that feeds into render function
```typescript
// Find render function input (MockObject3D node)
const mockObjectNodeId = findRenderInputNode(renderNodeId, 'arg0');
const nodeToWatch = runtime.scope.get(scopeKey);
```

### Node vs Value Execution
**Issue**: Chain methods return Node objects, executeDSL may return computed values
**Pattern**: Chain maintains reactivity, executeDSL resolves for immediate use

## 🔄 Development Workflow

### Adding New Chain Functions
1. Create function that works with Node<T> and primitive inputs
2. Add to appropriate chain object (chainObj3d or chainMath)
3. Export in dslContext for DSL parser access
4. Test both function-style and chain-style usage

### Adding UI Components
1. Create component function in `src/editor.ts`
2. Add to `setupEditorUI()` initialization
3. Include CSS in style block with consistent patterns
4. Handle events with proper cleanup

### Debugging Reactive Issues
1. Add logging to track node value flow
2. Check if mutations occur in transform functions
3. Verify watch targets are correct nodes
4. Use `runtime.runNode()` to inspect current values

## 📦 Build & Development

### Key Scripts
```bash
npm run build        # Build with esbuild
npm test            # Run Jest tests
npm test -- --testNamePattern="pattern"  # Specific tests
npx tsc --noEmit    # TypeScript checking
```

### File Watching
- esbuild serves on port 8081 during development
- Hot reload for code changes
- Scene state persists between reloads via localStorage

This guide provides everything needed to quickly understand and contribute to any part of the Threely codebase. The chain system, reactive runtime, and UI components work together to create a powerful live coding environment for 3D graphics.