import { createNode, constant, run } from "../src/graph";
import { RefNode } from "../src/nodysseus/types";

describe("Graph with Mixed Value Types", () => {
  it("should handle nodes with function values (existing behavior)", () => {
    const a = constant(5);
    const b = constant(3);
    const sum = createNode((x: number, y: number) => x + y, [a, b]);

    expect(typeof sum.value).toBe("function");
    expect(sum.dependencies).toEqual([a, b]);

    const result = run(sum);
    expect(result).toBe(8);
  });

  it("should handle nodes with RefNode values", () => {
    const frameRefNode: RefNode = {
      id: "test-frame",
      ref: "extern.frame",
    };

    const frameNode = createNode(frameRefNode, []);

    expect(frameNode.value).toEqual(frameRefNode);
    expect(frameNode.dependencies).toEqual([]);
    expect(typeof frameNode.value).toBe("object");
    expect((frameNode.value as RefNode).ref).toBe("extern.frame");
  });

  it("should handle nodes with constant values", () => {
    const constNode = constant(42);

    expect(constNode.value).toBe(42);
    expect(constNode.dependencies).toEqual([]);

    const result = run(constNode);
    expect(result).toBe(42);
  });

  it("should handle mixed node types in dependencies", () => {
    const frameRefNode: RefNode = {
      id: "test-frame",
      ref: "extern.frame",
    };

    const frameNode = createNode(frameRefNode, []);
    const multiplier = constant(2);

    // Node that takes frame value and multiplies it
    const scaledFrame = createNode(
      (frame: number, mult: number) => frame * mult,
      [frameNode, multiplier],
    );

    expect(typeof scaledFrame.value).toBe("function");
    expect(scaledFrame.dependencies).toEqual([frameNode, multiplier]);
  });

  it("should distinguish between function values and RefNode values", () => {
    const functionNode = createNode((x: number) => x * 2, [constant(5)]);
    const refNode = createNode(
      { id: "test", ref: "extern.test" } as RefNode,
      [],
    );

    expect(typeof functionNode.value).toBe("function");
    expect(typeof refNode.value).toBe("object");
    expect((refNode.value as RefNode).ref).toBe("extern.test");
  });
});

describe("Frame Function", () => {
  it("should create a node with extern.frame RefNode", () => {
    // This will be implemented after we update the graph system
    const frameNode = createNode({ ref: "extern.frame" } as RefNode, []);

    expect((frameNode.value as RefNode).ref).toBe("extern.frame");
    expect(frameNode.dependencies).toEqual([]);
  });
});
