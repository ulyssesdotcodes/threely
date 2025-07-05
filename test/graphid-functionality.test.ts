// graphid-functionality.test.ts - Test for new graphId functionality
import { Node, createNode, apply } from "../src/graph";
import { convertGraphToNodysseus } from "../src/graph-to-nodysseus-converter";
import { render } from "../src/dsl";

describe("GraphId Functionality", () => {
  describe("Node interface with graphId", () => {
    test("should create node with graphId", () => {
      const node = createNode(42, [], {}, "test-graph-id");
      expect(node.graphId).toBe("test-graph-id");
    });

    test("should create node without graphId", () => {
      const node = createNode(42);
      expect(node.graphId).toBeUndefined();
    });

    test("should pass graphId through apply function", () => {
      const constantNode = createNode(5);
      const appliedNode = apply(
        (x: number) => x * 2,
        [constantNode],
        {},
        "applied-graph-id",
      );
      expect(appliedNode.graphId).toBe("applied-graph-id");
    });
  });

  describe("convertGraphToNodysseus with graphId", () => {
    test("should use root node graphId when available", () => {
      const rootNode = createNode(42, [], {}, "root-graph-id");
      const graph = convertGraphToNodysseus(rootNode);
      expect(graph.id).toBe("root-graph-id");
    });

    test("should prefer root node graphId over parameter graphId", () => {
      const rootNode = createNode(42, [], {}, "root-graph-id");
      const graph = convertGraphToNodysseus(rootNode, "parameter-graph-id");
      expect(graph.id).toBe("root-graph-id");
    });

    test("should fall back to parameter graphId when root node has no graphId", () => {
      const rootNode = createNode(42);
      const graph = convertGraphToNodysseus(rootNode, "parameter-graph-id");
      expect(graph.id).toBe("parameter-graph-id");
    });

    test("should fall back to timestamp when no graphId is provided", () => {
      const rootNode = createNode(42);
      const graph = convertGraphToNodysseus(rootNode);
      expect(graph.id).toMatch(/^functional-graph-\d+$/);
    });
  });

  describe("render function with graphId", () => {
    test("should set graphId on rendered node", () => {
      // Create a mock object node
      const mockObjectNode = createNode({
        geometry: undefined,
        userData: undefined,
      });

      const renderedNode = render(mockObjectNode, "test-object-name");
      expect(renderedNode.graphId).toBe("test-object-name");
    });

    test("should create nodysseus graph with object name as ID", () => {
      // Create a mock object node
      const mockObjectNode = createNode({
        geometry: undefined,
        userData: undefined,
      });

      const renderedNode = render(mockObjectNode, "my-cool-object");
      const graph = convertGraphToNodysseus(renderedNode);
      expect(graph.id).toBe("my-cool-object");
    });
  });

  describe("Integration test", () => {
    test("should properly flow graphId from render through to nodysseus graph", () => {
      // Create a simple node chain
      const constantNode = createNode(5);
      const doubledNode = apply((x: number) => x * 2, [constantNode]);
      const mockObjectNode = apply(
        (x: number) => ({
          geometry: undefined,
          userData: undefined,
          value: x,
        }),
        [doubledNode],
      );

      // Render with a specific name
      const renderedNode = render(mockObjectNode, "final-object");

      // Check that the rendered node has the correct graphId
      expect(renderedNode.graphId).toBe("final-object");

      // Convert to nodysseus and check the graph ID
      const graph = convertGraphToNodysseus(renderedNode);
      expect(graph.id).toBe("final-object");

      // Verify the graph structure is intact
      expect(graph.out).toBeDefined();
      expect(Object.keys(graph.nodes).length).toBeGreaterThan(0);
    });
  });
});
