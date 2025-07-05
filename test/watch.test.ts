import { RefNode, Graph } from "../src/nodysseus/types";
import { NodysseusRuntime } from "../src/nodysseus/runtime-core";
import * as externalNodes from "../src/nodysseus/external-nodes";

const mockRequestAnimationFrame = jest.fn();

// Helper function to run a graph and return the result
function runGraph(graph: Graph) {
  const runtime = new NodysseusRuntime();
  return runtime.runGraphNode(graph, graph.out || "out");
}

describe("watch function", () => {
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

  it("should create an async iterable that watches node changes", async () => {
    // Create a simple var node to watch
    const varNode = runtime.varNode(10, undefined, "test-var");

    // Create a watch for this node
    const watch = runtime.createWatch<number>(varNode);

    // Get the iterator
    const iterator = watch[Symbol.asyncIterator]();

    // Change the value of the watched node
    varNode.set(20);

    // The watch should emit the new value
    const result = await iterator.next();
    expect(result.value).toBe(20);
    expect(result.done).toBeFalsy();
  });

  it("should watch changes to a frame node", async () => {
    // Create a frame extern directly through the external handler
    const externalHandler = (runtime as any).externalHandler;
    const frameVarNode = externalHandler.handleFrameExtern(
      "test-frame-node",
      true,
    );

    // Ensure the frame extern was created and requestAnimationFrame was called
    expect(mockRequestAnimationFrame).toHaveBeenCalled();
    expect(frameVarNode.value.read()).toBe(1); // Should start at 1

    // Create a watch for the frame node
    const watch = runtime.createWatch<number>(frameVarNode);
    const iterator = watch[Symbol.asyncIterator]();

    // Get the update function that was passed to requestAnimationFrame
    const updateFunction = mockRequestAnimationFrame.mock.calls[0][0];
    updateFunction();

    // The watch should emit the incremented frame value
    const watchResult = await iterator.next();
    expect(watchResult.value).toBe(2); // Frame should increment from 1 to 2
    expect(watchResult.done).toBeFalsy();
  });

  it("should handle multiple watchers on the same node", async () => {
    const varNode = runtime.varNode(5, undefined, "multi-watch-var");

    // Create two watches for the same node
    const watch1 = runtime.createWatch<number>(varNode);
    const watch2 = runtime.createWatch<number>(varNode);

    const iterator1 = watch1[Symbol.asyncIterator]();
    const iterator2 = watch2[Symbol.asyncIterator]();

    // Change the value
    varNode.set(15);

    // Both watches should emit the new value
    const [result1, result2] = await Promise.all([
      iterator1.next(),
      iterator2.next(),
    ]);

    expect(result1.value).toBe(15);
    expect(result2.value).toBe(15);
    expect(result1.done).toBeFalsy();
    expect(result2.done).toBeFalsy();
  });

  it("should remove watch callback after first emission", async () => {
    const varNode = runtime.varNode(100, undefined, "remove-watch-var");

    // Create watch
    const watch = runtime.createWatch<number>(varNode);
    const iterator = watch[Symbol.asyncIterator]();

    // First change
    varNode.set(200);
    const firstResult = await iterator.next();
    expect(firstResult.value).toBe(200);

    // The watch should have been automatically removed after first emission
    // Create a new iterator for the same watch object
    const newIterator = watch[Symbol.asyncIterator]();

    // Second change
    varNode.set(300);
    const secondResult = await newIterator.next();
    expect(secondResult.value).toBe(300);
  });

  it("should work with computed nodes (mapNode)", async () => {
    const inputVar = runtime.varNode(10, undefined, "input-var");
    const computedNode = runtime.mapNode(
      { input: inputVar },
      ({ input }: { input: number }) => input * 2,
      undefined,
      "computed-node",
    );

    // Watch the computed node
    const watch = runtime.createWatch<number>(computedNode);
    const iterator = watch[Symbol.asyncIterator]();

    // Change the input
    inputVar.set(25);

    // The watch should emit the computed result
    const result = await iterator.next();
    expect(result.value).toBe(50); // 25 * 2
    expect(result.done).toBeFalsy();
  });

  it("should integrate with frame extern for animation", async () => {
    // Create a frame extern directly
    const externalHandler = (runtime as any).externalHandler;
    const frameVarNode = externalHandler.handleFrameExtern(
      "test-frame-node-2",
      true,
    );

    // Create a computed node that doubles the frame count
    const doubledFrameNode = runtime.mapNode(
      { frame: frameVarNode },
      ({ frame }: { frame: number }) => frame * 2,
      undefined,
      "doubled-frame-node",
    );

    // Create a watch for the doubled frame value
    const watch = runtime.createWatch<number>(doubledFrameNode);
    const iterator = watch[Symbol.asyncIterator]();

    // Get the update function before clearing the mock
    const updateFunction = mockRequestAnimationFrame.mock.calls[0][0];

    // Trigger frame update
    updateFunction(); // Frame goes from 1 to 2

    // The watch should emit the doubled frame value
    const watchResult = await iterator.next();
    expect(watchResult.value).toBe(4); // 2 * 2 = 4
    expect(watchResult.done).toBeFalsy();
  });
});
