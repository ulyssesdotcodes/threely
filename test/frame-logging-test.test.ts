// Mock the external-nodes module BEFORE importing anything
jest.mock("../src/nodysseus/external-nodes", () => {
  const originalModule = jest.requireActual("../src/nodysseus/external-nodes");

  // Create the mock inside the factory
  const testMockRAF = jest.fn((callback: (time: number) => void) => {
    console.log("🎬 EXTERNAL-NODES requestAnimationFrame mock called!");
    // Store callbacks in global for testing
    if (!(global as any).__testCallbacks) (global as any).__testCallbacks = [];
    (global as any).__testCallbacks.push(callback);
    return (global as any).__testCallbacks.length;
  });

  return {
    ...originalModule,
    requestAnimationFrame: testMockRAF,
  };
});

import { setScene, executeDSL, clearAll, frame } from "../src/dsl";
import { Graph } from "../src/graph";
import { convertGraphToNodysseus } from "../src/graph-to-nodysseus-converter";
import { NodysseusRuntime } from "../src/nodysseus/runtime-core";
import * as THREE from "three";

// Set up a real requestAnimationFrame mock
let animationCallbacks: ((time: number) => void)[] = [];
const triggerAnimationFrame = () => {
  const callbacks = [...animationCallbacks];
  animationCallbacks = [];
  callbacks.forEach((cb) => cb(Date.now()));
};

// Mock requestAnimationFrame globally AND in the external-nodes module
const mockRAF = jest.fn((callback: (time: number) => void) => {
  console.log("🎬 requestAnimationFrame mock called!");
  animationCallbacks.push(callback);
  return animationCallbacks.length;
});

(global as any).requestAnimationFrame = mockRAF;
(globalThis as any).requestAnimationFrame = mockRAF;

// Mock is already set up above

describe("Frame Logging Test", () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    setScene(scene);
    clearAll();
    animationCallbacks = [];
  });

  it("should show frame updates with manual animation trigger", async () => {
    console.log("\n=== Starting Frame Test ===");

    // Test 1: Simple frame() DSL
    const result1 = executeDSL("frame()");
    console.log("Frame result 1:", result1);

    // Test 2: Trigger some animation frames to see updates
    console.log("\n=== Triggering Animation Frames ===");
    for (let i = 0; i < 3; i++) {
      console.log(`\n--- Animation Frame ${i + 1} ---`);
      triggerAnimationFrame();

      // Re-execute to see if value changes
      const result = executeDSL("frame()");
      console.log(`Frame result after ${i + 1} animation frames:`, result);
    }

    // Test 3: Create a frame with watch
    console.log("\n=== Creating Frame with Watch ===");
    const frameNode = frame();
    const nodysseusGraph = convertGraphToNodysseus(frameNode);
    const runtime = new NodysseusRuntime();

    // Get the actual frame VarNode
    const frameResult = runtime.runGraphNode(
      nodysseusGraph,
      nodysseusGraph.out!,
    );
    console.log("Initial frame result:", frameResult);

    // Find the VarNode in the runtime scope
    const frameNodeId = `${nodysseusGraph.id}/${nodysseusGraph.out}`;
    const frameVarNode = runtime.scope.get(frameNodeId);
    console.log("Frame VarNode:", {
      id: frameVarNode?.id,
      value: frameVarNode?.value?.read(),
    });

    if (frameVarNode) {
      // Create a watch
      const watch = runtime.createWatch(frameVarNode);

      let watchValue: any;
      const watchPromise = (async () => {
        const iterator = watch[Symbol.asyncIterator]();
        const result = await iterator.next();
        watchValue = result.value;
        console.log("Watch received value:", result.value);
      })();

      // Trigger animation frames to see if watch gets triggered
      console.log("\n=== Triggering Frames for Watch ===");
      console.log("Animation callbacks registered:", animationCallbacks.length);
      console.log(
        "Global test callbacks:",
        (global as any).__testCallbacks?.length || 0,
      );

      // Trigger callbacks from the external-nodes mock
      const testCallbacks = (global as any).__testCallbacks || [];
      testCallbacks.forEach((cb: any) => cb(Date.now()));
      (global as any).__testCallbacks = [];

      triggerAnimationFrame();
      console.log(
        "Animation callbacks remaining after trigger 1:",
        animationCallbacks.length,
      );
      triggerAnimationFrame();
      console.log(
        "Animation callbacks remaining after trigger 2:",
        animationCallbacks.length,
      );

      // Wait a bit for watch to trigger
      await new Promise((resolve) => setTimeout(resolve, 10));

      console.log("Final watch value:", watchValue);
    }

    expect(result1).toBe(1);
  });
});
