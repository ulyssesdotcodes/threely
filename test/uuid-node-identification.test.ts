// Tests for UUID-based node identification system
import { convertASTToNodysseus } from "../src/dsl/direct-ast-to-nodysseus-converter";
import { generateUUIDTags } from "../src/uuid-tagging";

describe("UUID-based Node Identification", () => {
  it("should assign UUIDs to all nodes when available", () => {
    const code = "sphere(1)";
    const { rangeSet } = generateUUIDTags(code);

    const result = convertASTToNodysseus(code, rangeSet);

    // Every node should have a UUID
    Object.values(result.graph.nodes).forEach((node) => {
      expect(node.id).toBeDefined();
      expect(typeof node.id).toBe("string");
      expect(node.id.length).toBeGreaterThan(0);
    });
  });

  it("should generate fallback IDs when no UUID range found", () => {
    const code = "sphere(1)";
    // Use empty range set to force fallback ID generation
    const emptyRangeSet = generateUUIDTags("").rangeSet;

    const result = convertASTToNodysseus(code, emptyRangeSet);

    // Should still have node IDs (fallback)
    Object.values(result.graph.nodes).forEach((node) => {
      expect(node.id).toBeDefined();
      expect(typeof node.id).toBe("string");
      // Fallback IDs should start with "fallback-"
      if (node.id.startsWith("fallback-")) {
        expect(node.id).toMatch(/^fallback-\d+-\d+-/);
      }
    });
  });

  it("should preserve UUID metadata in nodes", () => {
    const code = "sphere(1)";
    const { rangeSet } = generateUUIDTags(code);

    const result = convertASTToNodysseus(code, rangeSet);

    // At least some nodes should have UUID metadata
    const nodesWithUUIDs = Object.values(result.graph.nodes).filter(
      (node) => "uuid" in node && node.uuid,
    );

    expect(nodesWithUUIDs.length).toBeGreaterThan(0);
  });

  it("should use consistent IDs for the same AST positions", () => {
    const code = "sphere(1)";
    const { rangeSet } = generateUUIDTags(code);

    const result1 = convertASTToNodysseus(code, rangeSet);
    const result2 = convertASTToNodysseus(code, rangeSet);

    // Node IDs should be consistent between conversions
    const nodeIds1 = Object.keys(result1.graph.nodes).sort();
    const nodeIds2 = Object.keys(result2.graph.nodes).sort();

    expect(nodeIds1).toEqual(nodeIds2);
  });

  // Snapshot tests for UUID generation
  describe("UUID Generation Snapshots", () => {
    it("should generate consistent UUIDs for simple function calls", () => {
      const code = "sphere(1)";
      const { rangeSet, functionCalls } = generateUUIDTags(code);

      expect(functionCalls).toMatchSnapshot();
    });

    it("should generate consistent UUIDs for math expressions", () => {
      const code = "Math.sin(3.14 / 2)";
      const { rangeSet, functionCalls } = generateUUIDTags(code);

      expect(functionCalls).toMatchSnapshot();
    });

    it("should generate consistent UUIDs for object expressions", () => {
      const code = "{ x: 1, y: 2, z: 3 }";
      const { rangeSet, functionCalls } = generateUUIDTags(code);

      expect(functionCalls).toMatchSnapshot();
    });

    it("should generate consistent UUIDs for chained method calls", () => {
      const code = "sphere(1).translateX(2).rotateY(0.5)";
      const { rangeSet, functionCalls } = generateUUIDTags(code);

      expect(functionCalls).toMatchSnapshot();
    });
  });

  // Snapshot tests for AST to Nodysseus conversion
  describe("AST to Nodysseus Conversion Snapshots", () => {
    it("should convert simple function calls consistently", () => {
      const code = "sphere(1)";
      const { rangeSet } = generateUUIDTags(code);
      const result = convertASTToNodysseus(code, rangeSet);

      expect(result.graph).toMatchSnapshot();
    });

    it("should convert math expressions consistently", () => {
      const code = "Math.sin(3.14 / 2)";
      const { rangeSet } = generateUUIDTags(code);
      const result = convertASTToNodysseus(code, rangeSet);

      expect(result.graph).toMatchSnapshot();
    });

    it("should convert object expressions consistently", () => {
      const code = "{ x: 1, y: 2, z: 3 }";
      const { rangeSet } = generateUUIDTags(code);
      const result = convertASTToNodysseus(code, rangeSet);

      expect(result.graph).toMatchSnapshot();
    });

    it("should convert chained method calls consistently", () => {
      const code = "sphere(1).translateX(2).rotateY(0.5)";
      const { rangeSet } = generateUUIDTags(code);
      const result = convertASTToNodysseus(code, rangeSet);

      expect(result.graph).toMatchSnapshot();
    });

    it("should convert complex nested expressions consistently", () => {
      const code =
        "box({ x: Math.sin(frame), y: 2, z: 3 }).translateX(frame * 0.1)";
      const { rangeSet } = generateUUIDTags(code);
      const result = convertASTToNodysseus(code, rangeSet);

      expect(result.graph).toMatchSnapshot();
    });
  });
});
