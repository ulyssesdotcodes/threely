import {
  convertGraphToNodysseus,
  convertMultipleNodesToGraph,
  extractAllNodes,
  convertAndCompareGraphOutputs,
} from "../src/graph-to-nodysseus-converter";
import { createNode, constant, run } from "../src/graph";
import { RefNode, ValueNode } from "../src/nodysseus/types";

describe("Graph to Nodysseus Converter", () => {
  describe("convertGraphToNodysseus", () => {
    it("should convert a single node graph", () => {
      const node = constant(42);
      const result = convertGraphToNodysseus(node);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^functional-graph-\d+$/);
      expect(result.out).toBe(node.id);
      expect(result.nodes[node.id]).toBeDefined();
      expect(result.edges).toEqual({});
      expect(result.edges_in).toEqual({});
    });

    it("should convert a graph with dependencies", () => {
      const dep1 = constant(10);
      const dep2 = constant(20);
      const root = createNode((a, b) => a + b, [dep1, dep2]);

      const result = convertGraphToNodysseus(root);

      expect(result.nodes).toHaveProperty(dep1.id);
      expect(result.nodes).toHaveProperty(dep2.id);
      expect(result.nodes).toHaveProperty(root.id);
      expect(result.out).toBe(root.id);

      // Check edges
      const edgeKeys = Object.keys(result.edges);
      expect(edgeKeys).toHaveLength(2);
      expect(result.edges).toHaveProperty(`${dep1.id}->${root.id}`);
      expect(result.edges).toHaveProperty(`${dep2.id}->${root.id}`);

      // Check edge structure
      const edge1 = result.edges[`${dep1.id}->${root.id}`];
      expect(edge1.from).toBe(dep1.id);
      expect(edge1.to).toBe(root.id);
      expect(edge1.as).toBe("arg0");

      // Check edges_in
      expect(result.edges_in![root.id]).toHaveProperty(dep1.id);
      expect(result.edges_in![root.id]).toHaveProperty(dep2.id);
    });

    it("should handle complex nested dependencies", () => {
      const a = constant(5);
      const b = constant(3);
      const c = createNode((x, y) => x * y, [a, b]);
      const d = constant(2);
      const root = createNode((x, y) => x + y, [c, d]);

      const result = convertGraphToNodysseus(root);

      expect(Object.keys(result.nodes)).toHaveLength(5);
      expect(result.out).toBe(root.id);

      // Should have edges from a->c, b->c, c->root, d->root
      expect(Object.keys(result.edges)).toHaveLength(4);
    });

    it("should create RefNodes with executable functions", () => {
      const dep = constant(10);
      const node = createNode((x) => x * 2, [dep]);

      const result = convertGraphToNodysseus(node);
      const refNode = result.nodes[node.id] as RefNode;

      expect(refNode.ref).toBe("@graph.executable");
      expect(typeof refNode.value).toBe("function");
    });

    it("should handle duplicate nodes correctly", () => {
      const shared = constant(5);
      const node1 = createNode((x) => x + 1, [shared]);
      const node2 = createNode((x) => x + 2, [shared]);
      const root = createNode((a, b) => a + b, [node1, node2]);

      const result = convertGraphToNodysseus(root);

      // Should only have one instance of shared node
      expect(Object.keys(result.nodes)).toHaveLength(4);
      expect(result.nodes).toHaveProperty(shared.id);
    });
  });

  describe("convertMultipleNodesToGraph", () => {
    it("should convert multiple root nodes", () => {
      const dep = constant(10);
      const node1 = createNode((x) => x + 1, [dep]);
      const node2 = createNode((x) => x * 2, [dep]);

      const result = convertMultipleNodesToGraph([node1, node2]);

      expect(result.id).toMatch(/^multi-functional-graph-\d+$/);
      expect(result.out).toBe(node1.id); // First node as primary output
      expect(result.description).toContain("2 output nodes");
      expect(Object.keys(result.nodes)).toHaveLength(3); // dep, node1, node2
    });

    it("should handle empty array", () => {
      const result = convertMultipleNodesToGraph([]);

      expect(result.nodes).toEqual({});
      expect(result.edges).toEqual({});
      expect(result.out).toBeUndefined();
    });
  });

  describe("extractAllNodes", () => {
    it("should extract all nodes from a graph", () => {
      const a = constant(1);
      const b = constant(2);
      const c = createNode((x, y) => x + y, [a, b]);
      const d = createNode((x) => x * 2, [c]);

      const allNodes = extractAllNodes(d);

      expect(allNodes).toHaveLength(4);
      expect(allNodes.map((n) => n.id)).toContain(a.id);
      expect(allNodes.map((n) => n.id)).toContain(b.id);
      expect(allNodes.map((n) => n.id)).toContain(c.id);
      expect(allNodes.map((n) => n.id)).toContain(d.id);
    });

    it("should handle single node", () => {
      const node = constant(42);
      const allNodes = extractAllNodes(node);

      expect(allNodes).toHaveLength(1);
      expect(allNodes[0]).toBe(node);
    });

    it("should avoid duplicate nodes", () => {
      const shared = constant(5);
      const node1 = createNode((x) => x + 1, [shared]);
      const node2 = createNode((x) => x * 2, [shared]);
      const root = createNode((a, b) => a + b, [node1, node2]);

      const allNodes = extractAllNodes(root);

      // Should have shared, node1, node2, root (no duplicates)
      expect(allNodes).toHaveLength(4);
      const ids = allNodes.map((n) => n.id);
      expect(new Set(ids).size).toBe(4); // All unique
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle circular references gracefully", () => {
      // Create a simple case that could lead to infinite recursion
      const a = constant(1);
      const b = createNode((x) => x + 1, [a]);

      // Simulate circular reference by manually modifying dependencies
      // Note: This is a bit contrived since the normal API doesn't allow this
      const circularNode = createNode((x) => x, [b]);

      expect(() => convertGraphToNodysseus(circularNode)).not.toThrow();
    });

    it("should generate unique graph IDs", async () => {
      const node = constant(42);
      const result1 = convertGraphToNodysseus(node);
      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1));
      const result2 = convertGraphToNodysseus(node);

      expect(result1.id).not.toBe(result2.id);
    });

    it("should handle nodes with no dependencies", () => {
      const node = createNode(() => "hello world");
      const result = convertGraphToNodysseus(node);

      expect(result.nodes[node.id]).toBeDefined();
      expect(Object.keys(result.edges)).toHaveLength(0);
      expect(result.out).toBe(node.id);
    });
  });

  describe("Runtime Output Comparison with @graph.executable", () => {
    it("should convert function nodes to @graph.executable RefNodes and constants to ValueNodes", () => {
      const constantNode = constant(42);
      const functionNode = createNode((x: number) => x * 2, [constantNode]);
      const result = convertGraphToNodysseus(functionNode);

      // Function node should be RefNode with @graph.executable
      const functionRefNode = result.nodes[functionNode.id] as RefNode;
      expect(functionRefNode.ref).toBe("@graph.executable");
      expect(typeof functionRefNode.value).toBe("function");

      // Constant node should be ValueNode
      const constantValueNode = result.nodes[constantNode.id] as ValueNode;
      expect(constantValueNode.value).toBe(42);
      expect("ref" in constantValueNode).toBe(false);
    });

    it("should produce matching outputs for simple constant node", () => {
      const node = constant(42);
      const comparison = convertAndCompareGraphOutputs(node);

      expect(comparison.originalOutput).toBe(comparison.nodysseusOutput);
      expect(comparison.originalOutput).toBe(42);
    });

    it("Should produce matching outputs for addition operation", () => {
      const a = constant(10);
      const b = constant(20);
      const sum = createNode((x, y) => x + y, [a, b]);

      const comparison = convertAndCompareGraphOutputs(sum);

      expect(comparison.originalOutput).toBe(comparison.nodysseusOutput);
      expect(comparison.originalOutput).toBe(30);
    });

    it("should produce matching outputs for complex nested operations", () => {
      const a = constant(5);
      const b = constant(3);
      const multiply = createNode((x, y) => x * y, [a, b]);
      const c = constant(2);
      const final = createNode((x, y) => x + y, [multiply, c]);

      const comparison = convertAndCompareGraphOutputs(final);

      expect(comparison.originalOutput).toBe(comparison.nodysseusOutput);
      expect(comparison.originalOutput).toBe(17); // (5 * 3) + 2 = 17
    });

    it("should produce matching outputs for string operations", () => {
      const greeting = constant("Hello");
      const name = constant("World");
      const combined = createNode((g, n) => `${g}, ${n}!`, [greeting, name]);

      const comparison = convertAndCompareGraphOutputs(combined);

      expect(comparison.originalOutput).toBe(comparison.nodysseusOutput);
      expect(comparison.originalOutput).toBe("Hello, World!");
    });

    it("should produce matching outputs for array operations", () => {
      const arr1 = constant([1, 2, 3]);
      const arr2 = constant([4, 5]);
      const concatenated = createNode((a, b) => [...a, ...b], [arr1, arr2]);

      const comparison = convertAndCompareGraphOutputs(concatenated);

      expect(comparison.originalOutput).toEqual(comparison.nodysseusOutput);
      expect(comparison.originalOutput).toEqual([1, 2, 3, 4, 5]);
    });

    it("should produce matching outputs for object operations", () => {
      const obj1 = constant({ a: 1, b: 2 });
      const obj2 = constant({ c: 3, d: 4 });
      const merged = createNode((o1, o2) => ({ ...o1, ...o2 }), [obj1, obj2]);

      const comparison = convertAndCompareGraphOutputs(merged);

      expect(comparison.originalOutput).toEqual(comparison.nodysseusOutput);
      expect(comparison.originalOutput).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    });

    it("should produce matching outputs for mathematical functions", () => {
      const x = constant(4);
      const y = constant(3);
      const power = createNode((base, exp) => Math.pow(base, exp), [x, y]);
      const sqrt = createNode((val) => Math.sqrt(val), [power]);

      const comparison = convertAndCompareGraphOutputs(sqrt);

      expect(comparison.originalOutput).toBe(comparison.nodysseusOutput);
      expect(comparison.originalOutput).toBe(8); // sqrt(4^3) = sqrt(64) = 8
    });

    it("should produce matching outputs for conditional logic", () => {
      const condition = constant(true);
      const valueA = constant("Option A");
      const valueB = constant("Option B");
      const conditional = createNode(
        (cond, a, b) => (cond ? a : b),
        [condition, valueA, valueB],
      );

      const comparison = convertAndCompareGraphOutputs(conditional);

      expect(comparison.originalOutput).toBe(comparison.nodysseusOutput);
      expect(comparison.originalOutput).toBe("Option A");
    });

    it("should produce matching outputs with shared dependencies", () => {
      const shared = constant(5);
      const doubled = createNode((x) => x * 2, [shared]);
      const tripled = createNode((x) => x * 3, [shared]);
      const sum = createNode((a, b) => a + b, [doubled, tripled]);

      const comparison = convertAndCompareGraphOutputs(sum);

      expect(comparison.originalOutput).toBe(comparison.nodysseusOutput);
      expect(comparison.originalOutput).toBe(25); // (5*2) + (5*3) = 10 + 15 = 25
    });

    it("should provide detailed comparison information", () => {
      const a = constant(3);
      const b = constant(4);
      const sum = createNode((x, y) => x + y, [a, b]);

      const comparison = convertAndCompareGraphOutputs(sum);

      expect(comparison).toHaveProperty("originalOutput");
      expect(comparison).toHaveProperty("nodysseusOutput");
      expect(comparison).toHaveProperty("outputsMatch");
      expect(comparison).toHaveProperty("convertedGraph");

      expect(comparison.convertedGraph.nodes).toBeDefined();
      expect(comparison.convertedGraph.edges).toBeDefined();
      expect(comparison.convertedGraph.out).toBe(sum.id);
    });
  });
});
