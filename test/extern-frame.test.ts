import { RefNode, Graph } from "../src/nodysseus/types";
import { NodysseusRuntime } from "../src/nodysseus/runtime-core";
import * as externalNodes from "../src/nodysseus/external-nodes";

const mockRequestAnimationFrame = jest.fn();

// Helper function to run a graph and return the result
function runGraph(graph: Graph) {
  const runtime = new NodysseusRuntime();
  return runtime.runGraphNode(graph, graph.out || "out");
}

describe("extern.frame", () => {
  beforeEach(() => {
    // Mock the requestAnimationFrame function
    jest
      .spyOn(externalNodes, "requestAnimationFrame")
      .mockImplementation(mockRequestAnimationFrame);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create a frame counter that increments", () => {
    const frameNode: RefNode = {
      id: "frame-node",
      ref: "extern.frame",
    };

    const graph: Graph = {
      id: "test-graph",
      out: "frame-node",
      nodes: {
        "frame-node": frameNode,
      },
      edges: {},
      edges_in: {},
    };

    const result = runGraph(graph);

    // Should create a varNode with initial value 1
    expect(result.value.read()).toBe(1);

    // Should schedule animation frame updates
    expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(typeof mockRequestAnimationFrame.mock.calls[0][0]).toBe("function");
  });

  it("should increment frame counter when update function is called", () => {
    const frameNode: RefNode = {
      id: "frame-node",
      ref: "extern.frame",
    };

    const graph: Graph = {
      id: "test-graph",
      out: "frame-node",
      nodes: {
        "frame-node": frameNode,
      },
      edges: {},
      edges_in: {},
    };

    const result = runGraph(graph);

    // Get the initial value
    expect(result.value.read()).toBe(1);

    // Get the update function passed to requestAnimationFrame
    const updateFunction = mockRequestAnimationFrame.mock.calls[0][0];

    // Clear the mock to check subsequent calls
    mockRequestAnimationFrame.mockClear();

    // Call the update function
    updateFunction();

    // Value should have incremented
    expect(result.value.read()).toBe(2);

    // Should schedule another frame
    expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it("should continue incrementing on subsequent frame updates", () => {
    const frameNode: RefNode = {
      id: "frame-node",
      ref: "extern.frame",
    };

    const graph: Graph = {
      id: "test-graph",
      out: "frame-node",
      nodes: {
        "frame-node": frameNode,
      },
      edges: {},
      edges_in: {},
    };

    const result = runGraph(graph);

    expect(result.value.read()).toBe(1);

    // Get and call the update function multiple times
    const updateFunction = mockRequestAnimationFrame.mock.calls[0][0];

    updateFunction();
    expect(result.value.read()).toBe(2);

    updateFunction();
    expect(result.value.read()).toBe(3);

    updateFunction();
    expect(result.value.read()).toBe(4);
  });

  it("should work in a graph that uses the frame value", () => {
    const frameNode: RefNode = {
      id: "frame-node",
      ref: "extern.frame",
    };

    const doubleFrameNode: RefNode = {
      id: "double-frame",
      ref: "@graph.executable",
      value: (frameCount: number) => frameCount * 2,
    };

    const graph: Graph = {
      id: "test-graph",
      out: "double-frame",
      nodes: {
        "frame-node": frameNode,
        "double-frame": doubleFrameNode,
      },
      edges: {
        "frame-node->double-frame": {
          from: "frame-node",
          to: "double-frame",
          as: "arg0",
        },
      },
      edges_in: {
        "double-frame": {
          "frame-node->double-frame": {
            from: "frame-node",
            to: "double-frame",
            as: "arg0",
          },
        },
      },
    };

    const result = runGraph(graph);

    // Initial value should be frame * 2 = 1 * 2 = 2
    expect(result.value.read()).toBe(2);

    // Trigger frame update
    const updateFunction = mockRequestAnimationFrame.mock.calls[0][0];
    updateFunction();

    // After increment, should be 2 * 2 = 4
    expect(result.value.read()).toBe(4);
  });
});
