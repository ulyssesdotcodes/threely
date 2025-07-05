import { RefNode, Graph } from "../src/nodysseus/types";
import { NodysseusRuntime } from "../src/nodysseus/runtime-core";
import * as externalNodes from "../src/nodysseus/external-nodes";

const mockRequestAnimationFrame = jest.fn();

// Helper function to run a graph and return the result
function runGraph(graph: Graph) {
  const runtime = new NodysseusRuntime();
  return runtime.runGraphNode(graph, graph.out || "out");
}

describe("Watch System Comprehensive Tests", () => {
  let runtime: NodysseusRuntime;

  beforeEach(() => {
    runtime = new NodysseusRuntime();
    // Mock the requestAnimationFrame function for frame extern
    jest
      .spyOn(externalNodes, "requestAnimationFrame")
      .mockImplementation(mockRequestAnimationFrame);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic watch functionality with varNodes and mapNodes", () => {
    it("should watch changes to a single varNode", async () => {
      // Create a varNode with initial value
      const varNode = runtime.varNode(10, undefined, "test-var-1");

      // Create a watch for this node
      const watch = runtime.createWatch<number>(varNode);
      const iterator = watch[Symbol.asyncIterator]();

      // Change the value
      varNode.set(20);

      // The watch should emit the new value
      const result = await iterator.next();
      expect(result.value).toBe(20);
      expect(result.done).toBeFalsy();
    });

    it("should watch changes to a mapNode that sums two varNodes", async () => {
      // Create two varNodes with initial values
      const var1 = runtime.varNode(10, undefined, "var1");
      const var2 = runtime.varNode(20, undefined, "var2");

      // Create a mapNode that sums both varNodes
      const sumNode = runtime.mapNode(
        { a: var1, b: var2 },
        ({ a, b }: { a: number; b: number }) => a + b,
        undefined,
        "sum-node",
      );

      // Create a watch for the sum node
      const watch = runtime.createWatch<number>(sumNode);
      const iterator = watch[Symbol.asyncIterator]();

      // Change the first variable
      var1.set(15);

      // The watch should emit the new computed value
      const result = await iterator.next();
      expect(result.value).toBe(35); // 15 + 20
      expect(result.done).toBeFalsy();
    });

    it("should trigger watch when either input varNode changes", async () => {
      const var1 = runtime.varNode(10, undefined, "var1-multi");
      const var2 = runtime.varNode(20, undefined, "var2-multi");

      const sumNode = runtime.mapNode(
        { a: var1, b: var2 },
        ({ a, b }: { a: number; b: number }) => a + b,
        undefined,
        "sum-node-multi",
      );

      // Test changing var1
      const watch1 = runtime.createWatch<number>(sumNode);
      const iterator1 = watch1[Symbol.asyncIterator]();

      var1.set(25);
      const result1 = await iterator1.next();
      expect(result1.value).toBe(45); // 25 + 20

      // Test changing var2
      const watch2 = runtime.createWatch<number>(sumNode);
      const iterator2 = watch2[Symbol.asyncIterator]();

      var2.set(30);
      const result2 = await iterator2.next();
      expect(result2.value).toBe(55); // 25 + 30
    });
  });

  describe("Sequential updates and async iterator behavior", () => {
    it("should handle multiple sequential updates correctly", async () => {
      const varNode = runtime.varNode(5, undefined, "seq-var");
      const doubleNode = runtime.mapNode(
        { input: varNode },
        ({ input }: { input: number }) => input * 2,
        undefined,
        "double-node",
      );

      const watch = runtime.createWatch<number>(doubleNode);
      const iterator = watch[Symbol.asyncIterator]();

      // First update
      varNode.set(10);
      const result1 = await iterator.next();
      expect(result1.value).toBe(20);

      // Create a new iterator for the next update
      const newIterator = watch[Symbol.asyncIterator]();

      // Second update
      varNode.set(15);
      const result2 = await newIterator.next();
      expect(result2.value).toBe(30);

      // Third update with another new iterator
      const thirdIterator = watch[Symbol.asyncIterator]();
      varNode.set(20);
      const result3 = await thirdIterator.next();
      expect(result3.value).toBe(40);
    });

    it("should wait for actual changes in next() calls", async () => {
      const varNode = runtime.varNode(100, undefined, "wait-var");
      const watch = runtime.createWatch<number>(varNode);
      const iterator = watch[Symbol.asyncIterator]();

      // Change the value immediately (watch systems typically require immediate changes)
      varNode.set(200);

      // This should get the changed value
      const result = await iterator.next();
      expect(result.value).toBe(200);
    });
  });

  describe("Complex mapNode scenarios", () => {
    it("should work with complex computation in mapNode", async () => {
      const x = runtime.varNode(2, undefined, "x");
      const y = runtime.varNode(3, undefined, "y");
      const z = runtime.varNode(4, undefined, "z");

      // Create a mapNode that computes (x * y) + z
      const complexNode = runtime.mapNode(
        { x, y, z },
        ({ x, y, z }: { x: number; y: number; z: number }) => x * y + z,
        undefined,
        "complex-node",
      );

      const watch = runtime.createWatch<number>(complexNode);
      const iterator = watch[Symbol.asyncIterator]();

      // Change x
      x.set(5);
      const result = await iterator.next();
      expect(result.value).toBe(19); // (5 * 3) + 4

      // Test another variable change
      const newIterator = watch[Symbol.asyncIterator]();
      y.set(6);
      const result2 = await newIterator.next();
      expect(result2.value).toBe(34); // (5 * 6) + 4
    });

    it("should handle nested mapNodes", async () => {
      const a = runtime.varNode(2, undefined, "a");
      const b = runtime.varNode(3, undefined, "b");

      // First level: multiply a and b
      const multiplyNode = runtime.mapNode(
        { a, b },
        ({ a, b }: { a: number; b: number }) => a * b,
        undefined,
        "multiply-node",
      );

      // Second level: square the result
      const squareNode = runtime.mapNode(
        { input: multiplyNode },
        ({ input }: { input: number }) => input * input,
        undefined,
        "square-node",
      );

      const watch = runtime.createWatch<number>(squareNode);
      const iterator = watch[Symbol.asyncIterator]();

      // Change a
      a.set(3);
      const result = await iterator.next();
      expect(result.value).toBe(81); // (3 * 3)^2 = 81
    });
  });

  describe("Multiple watchers and edge cases", () => {
    it("should handle multiple watchers on the same mapNode sequentially", async () => {
      const varNode = runtime.varNode(10, undefined, "multi-watch-var");
      const doubleNode = runtime.mapNode(
        { input: varNode },
        ({ input }: { input: number }) => input * 2,
        undefined,
        "multi-watch-double",
      );

      // Test first watcher
      const watch1 = runtime.createWatch<number>(doubleNode);
      const iterator1 = watch1[Symbol.asyncIterator]();

      varNode.set(25);
      const result1 = await iterator1.next();
      expect(result1.value).toBe(50);
      expect(result1.done).toBeFalsy();

      // Test second watcher after first completes
      const watch2 = runtime.createWatch<number>(doubleNode);
      const iterator2 = watch2[Symbol.asyncIterator]();

      varNode.set(30);
      const result2 = await iterator2.next();
      expect(result2.value).toBe(60);
      expect(result2.done).toBeFalsy();
    });

    it("should handle watch cleanup after first emission", async () => {
      const varNode = runtime.varNode(1, undefined, "cleanup-var");
      const watch = runtime.createWatch<number>(varNode);

      // First iteration
      const iterator1 = watch[Symbol.asyncIterator]();
      varNode.set(2);
      const result1 = await iterator1.next();
      expect(result1.value).toBe(2);

      // Second iteration with new iterator
      const iterator2 = watch[Symbol.asyncIterator]();
      varNode.set(3);
      const result2 = await iterator2.next();
      expect(result2.value).toBe(3);

      // Third iteration
      const iterator3 = watch[Symbol.asyncIterator]();
      varNode.set(4);
      const result3 = await iterator3.next();
      expect(result3.value).toBe(4);
    });

    it("should handle same value updates (no unnecessary triggers)", async () => {
      const varNode = runtime.varNode(10, undefined, "same-value-var");
      const watch = runtime.createWatch<number>(varNode);
      const iterator = watch[Symbol.asyncIterator]();

      // Set the same value (should not trigger)
      varNode.set(10);

      // Set a different value (should trigger)
      varNode.set(20);

      const result = await iterator.next();
      expect(result.value).toBe(20);
    });
  });

  describe("Integration with external nodes", () => {
    it("should work with frame extern nodes", async () => {
      // Create a frame extern directly through the external handler
      const externalHandler = (runtime as any).externalHandler;
      const frameVarNode = externalHandler.handleFrameExtern(
        "test-frame-watch",
        true,
      );

      // Create a mapNode that doubles the frame count
      const doubledFrameNode = runtime.mapNode(
        { frame: frameVarNode },
        ({ frame }: { frame: number }) => frame * 2,
        undefined,
        "doubled-frame-watch",
      );

      // Create a watch for the doubled frame value
      const watch = runtime.createWatch<number>(doubledFrameNode);
      const iterator = watch[Symbol.asyncIterator]();

      // Get the update function from the mock
      const updateFunction = mockRequestAnimationFrame.mock.calls[0][0];

      // Trigger frame update
      updateFunction(); // Frame goes from 1 to 2

      // The watch should emit the doubled frame value
      const result = await iterator.next();
      expect(result.value).toBe(4); // 2 * 2 = 4
      expect(result.done).toBeFalsy();
    });

    it("should handle frame extern with additional computation", async () => {
      const externalHandler = (runtime as any).externalHandler;
      const frameVarNode = externalHandler.handleFrameExtern(
        "test-frame-complex",
        true,
      );

      // Create additional varNodes
      const multiplier = runtime.varNode(3, undefined, "multiplier");
      const offset = runtime.varNode(5, undefined, "offset");

      // Create a complex mapNode: (frame * multiplier) + offset
      const complexFrameNode = runtime.mapNode(
        { frame: frameVarNode, mult: multiplier, off: offset },
        ({ frame, mult, off }: { frame: number; mult: number; off: number }) =>
          frame * mult + off,
        undefined,
        "complex-frame-node",
      );

      const watch = runtime.createWatch<number>(complexFrameNode);
      const iterator = watch[Symbol.asyncIterator]();

      // Trigger frame update
      const updateFunction = mockRequestAnimationFrame.mock.calls[0][0];
      updateFunction(); // Frame goes from 1 to 2

      const result = await iterator.next();
      expect(result.value).toBe(11); // (2 * 3) + 5 = 11

      // Test changing multiplier
      const newIterator = watch[Symbol.asyncIterator]();
      multiplier.set(4);
      const result2 = await newIterator.next();
      expect(result2.value).toBe(13); // (2 * 4) + 5 = 13
    });
  });

  describe("Error handling and edge cases", () => {
    it("should handle TypeScript type safety in mapNode functions", async () => {
      const stringVar = runtime.varNode("hello", undefined, "string-var");
      const numberVar = runtime.varNode(42, undefined, "number-var");

      // Create a mapNode with explicit typing
      const combinedNode = runtime.mapNode<
        string,
        { str: string; num: number }
      >(
        { str: stringVar, num: numberVar },
        ({ str, num }: { str: string; num: number }) => `${str}-${num}`,
        undefined,
        "combined-node",
      );

      const watch = runtime.createWatch<string>(combinedNode);
      const iterator = watch[Symbol.asyncIterator]();

      stringVar.set("world");
      const result = await iterator.next();
      expect(result.value).toBe("world-42");
    });

    it("should handle mapNode with custom comparison function", async () => {
      const varNode = runtime.varNode(5, undefined, "custom-compare-var");

      // Create a mapNode that returns an object
      const objectNode = runtime.mapNode(
        { input: varNode },
        ({ input }: { input: number }) => ({
          value: input,
          doubled: input * 2,
        }),
        // Custom comparison function
        (prev, next) => prev.input !== next.input,
        "object-node",
      );

      const watch = runtime.createWatch<{ value: number; doubled: number }>(
        objectNode,
      );
      const iterator = watch[Symbol.asyncIterator]();

      varNode.set(10);
      const result = await iterator.next();
      expect(result.value).toEqual({ value: 10, doubled: 20 });
    });
  });

  describe("Performance and stress tests", () => {
    it("should handle rapid sequential updates", async () => {
      const varNode = runtime.varNode(0, undefined, "rapid-var");
      const incrementNode = runtime.mapNode(
        { input: varNode },
        ({ input }: { input: number }) => input + 1,
        undefined,
        "increment-node",
      );

      const watch = runtime.createWatch<number>(incrementNode);
      const iterator = watch[Symbol.asyncIterator]();

      // Rapid updates
      varNode.set(1);
      const result = await iterator.next();
      expect(result.value).toBe(2);

      // Verify the system can handle multiple rapid updates
      for (let i = 2; i < 10; i++) {
        const newIterator = watch[Symbol.asyncIterator]();
        varNode.set(i);
        const result = await newIterator.next();
        expect(result.value).toBe(i + 1);
      }
    });
  });
});
