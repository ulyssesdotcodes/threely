import { setScene, executeDSL, clearAll, frame, render } from '../src/dsl';
import { Graph } from '../src/graph';
import { convertGraphToNodysseus } from '../src/graph-to-nodysseus-converter';
import { NodysseusRuntime } from '../src/nodysseus/runtime-core';
import * as THREE from 'three';

// Global array to track callbacks - declared at module level
let mockCallbacks: ((time: number) => void)[] = [];

// Mock the entire module to ensure our requestAnimationFrame mock is used
jest.mock('../src/nodysseus/external-nodes', () => {
  const originalModule = jest.requireActual('../src/nodysseus/external-nodes');
  
  return {
    ...originalModule,
    requestAnimationFrame: jest.fn((callback: (time: number) => void) => {
      // Access the module-level mockCallbacks array
      (global as any).__testCallbacks = (global as any).__testCallbacks || [];
      (global as any).__testCallbacks.push(callback);
      return (global as any).__testCallbacks.length;
    })
  };
});

// Helper to trigger animation frame callbacks
const triggerAnimationFrame = () => {
  const callbacks = [...((global as any).__testCallbacks || [])];
  (global as any).__testCallbacks = [];
  callbacks.forEach(callback => callback(Date.now()));
};

// Also set up global requestAnimationFrame
(global as any).requestAnimationFrame = jest.fn((callback: (time: number) => void) => {
  (global as any).__testCallbacks = (global as any).__testCallbacks || [];
  (global as any).__testCallbacks.push(callback);
  return (global as any).__testCallbacks.length;
});

describe('Frame Watch System Diagnosis', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    setScene(scene);
    clearAll();
    // Clear mock callbacks
    (global as any).__testCallbacks = [];
  });

  it('should handle frame extern directly with Nodysseus runtime', async () => {
    const frameNode = frame();
    console.log('Frame node created:', frameNode);

    // Convert to Nodysseus and execute
    const nodysseusGraph = convertGraphToNodysseus(frameNode);
    console.log('Nodysseus graph:', JSON.stringify(nodysseusGraph, null, 2));

    const runtime = new NodysseusRuntime();
    
    // Execute and get the frame value
    const frameValue1 = runtime.runGraphNode(nodysseusGraph, nodysseusGraph.out!);
    console.log('Initial frame value:', frameValue1);

    // Check how many callbacks were registered
    console.log('Number of callbacks registered:', (global as any).__testCallbacks?.length || 0);
    
    // Trigger a few animation frames and check if value changes
    for (let i = 0; i < 5; i++) {
      triggerAnimationFrame();
      const frameValue = runtime.runGraphNode(nodysseusGraph, nodysseusGraph.out!);
      console.log(`Frame value after triggering ${i + 1} animation frames:`, frameValue);
      // Check the actual value inside the VarNode
      if (frameValue && frameValue.value) {
        console.log(`  Internal value: ${frameValue.value.read()}`);
      }
    }
  });

  it('should test frame with watch system integration', async () => {
    // Create a DSL expression that uses frame
    const code = 'frame()';
    console.log('Testing DSL code:', code);

    const result = executeDSL(code);
    console.log('ExecuteDSL result:', result);

    // Check if the frame is updating
    expect(result).toBeDefined();
  });

  it('should test frame with dependent nodes (like position)', async () => {
    // Test frame being used to drive position updates
    const code = 'mesh(sphere(), material()).translateX(Math.sin(frame() * 0.1)).render("animatedSphere")';
    console.log('Testing animated DSL code:', code);

    const result = executeDSL(code);
    console.log('Animated object result:', result);

    if (result) {
      console.log('Initial position:', result.position.x);
      
      // Wait a bit and check if position changes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Execute again to see if position changed
      const result2 = executeDSL(code);
      if (result2) {
        console.log('Position after delay:', result2.position.x);
        // The position should be different if frame is updating
      }
    }

    expect(result).toBeInstanceOf(THREE.Object3D);
  });

  it('should test frame updates through runtime execution', async () => {
    const frameNode = frame();
    const nodysseusGraph = convertGraphToNodysseus(frameNode);
    const runtime = new NodysseusRuntime();
    
    // Execute the frame node and see if it creates a proper var node
    const frameResult = runtime.runGraphNode(nodysseusGraph, nodysseusGraph.out!);
    console.log('Frame result type:', typeof frameResult);
    console.log('Frame result value:', frameResult);

    // Check if it's a number (the frame value)
    expect(typeof frameResult).toBe('number');
    expect(frameResult).toBeGreaterThanOrEqual(1);
  });
});