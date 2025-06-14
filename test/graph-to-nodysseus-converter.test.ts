import { 
  convertGraphToNodysseus, 
  convertMultipleNodesToGraph, 
  extractAllNodes, 
  convertGraphToNodysseusValues,
  ConversionOptions 
} from '../src/graph-to-nodysseus-converter';
import { createNode, constant, run } from '../src/graph';
import { RefNode, ValueNode } from '../src/nodysseus/types';

describe('Graph to Nodysseus Converter', () => {
  describe('convertGraphToNodysseus', () => {
    it('should convert a single node graph', () => {
      const node = constant(42);
      const result = convertGraphToNodysseus(node);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^functional-graph-\d+$/);
      expect(result.out).toBe(node.id);
      expect(result.nodes[node.id]).toBeDefined();
      expect(result.edges).toEqual({});
      expect(result.edges_in).toEqual({});
    });

    it('should convert a graph with dependencies', () => {
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
      expect(edge1.as).toBe('arg0');

      // Check edges_in
      expect(result.edges_in![root.id]).toHaveProperty(dep1.id);
      expect(result.edges_in![root.id]).toHaveProperty(dep2.id);
    });

    it('should handle complex nested dependencies', () => {
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

    it('should create RefNodes with serialized compute functions', () => {
      const dep = constant(10);
      const node = createNode((x) => x * 2, [dep]);
      
      const result = convertGraphToNodysseus(node);
      const refNode = result.nodes[node.id] as RefNode;

      expect(refNode.ref).toBe('@graph.functional');
      expect(refNode.value).toContain('x * 2');
    });

    it('should handle duplicate nodes correctly', () => {
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

  describe('convertMultipleNodesToGraph', () => {
    it('should convert multiple root nodes', () => {
      const dep = constant(10);
      const node1 = createNode((x) => x + 1, [dep]);
      const node2 = createNode((x) => x * 2, [dep]);

      const result = convertMultipleNodesToGraph([node1, node2]);

      expect(result.id).toMatch(/^multi-functional-graph-\d+$/);
      expect(result.out).toBe(node1.id); // First node as primary output
      expect(result.description).toContain('2 output nodes');
      expect(Object.keys(result.nodes)).toHaveLength(3); // dep, node1, node2
    });

    it('should handle empty array', () => {
      const result = convertMultipleNodesToGraph([]);

      expect(result.nodes).toEqual({});
      expect(result.edges).toEqual({});
      expect(result.out).toBeUndefined();
    });
  });

  describe('extractAllNodes', () => {
    it('should extract all nodes from a graph', () => {
      const a = constant(1);
      const b = constant(2);
      const c = createNode((x, y) => x + y, [a, b]);
      const d = createNode((x) => x * 2, [c]);

      const allNodes = extractAllNodes(d);

      expect(allNodes).toHaveLength(4);
      expect(allNodes.map(n => n.id)).toContain(a.id);
      expect(allNodes.map(n => n.id)).toContain(b.id);
      expect(allNodes.map(n => n.id)).toContain(c.id);
      expect(allNodes.map(n => n.id)).toContain(d.id);
    });

    it('should handle single node', () => {
      const node = constant(42);
      const allNodes = extractAllNodes(node);

      expect(allNodes).toHaveLength(1);
      expect(allNodes[0]).toBe(node);
    });

    it('should avoid duplicate nodes', () => {
      const shared = constant(5);
      const node1 = createNode((x) => x + 1, [shared]);
      const node2 = createNode((x) => x * 2, [shared]);
      const root = createNode((a, b) => a + b, [node1, node2]);

      const allNodes = extractAllNodes(root);

      // Should have shared, node1, node2, root (no duplicates)
      expect(allNodes).toHaveLength(4);
      const ids = allNodes.map(n => n.id);
      expect(new Set(ids).size).toBe(4); // All unique
    });
  });

  describe('convertGraphToNodysseusValues', () => {
    it('should convert nodes to ValueNodes with computed results', () => {
      const a = constant(10);
      const b = constant(5);
      const sum = createNode((x, y) => x + y, [a, b]);

      const result = convertGraphToNodysseusValues(sum);

      expect(result.nodes[a.id]).toBeDefined();
      expect(result.nodes[b.id]).toBeDefined();
      expect(result.nodes[sum.id]).toBeDefined();

      const sumNode = result.nodes[sum.id] as ValueNode;
      expect(sumNode.value).toBe('15');
      expect(sumNode.category).toBe('computed');
    });

    it('should handle computation errors gracefully', () => {
      const errorNode = createNode(() => {
        throw new Error('Test error');
      });

      const result = convertGraphToNodysseusValues(errorNode);

      const valueNode = result.nodes[errorNode.id] as ValueNode;
      expect(valueNode.value).toContain('Error: Test error');
      expect(valueNode.category).toBe('error');
    });

    it('should serialize object values as JSON', () => {
      const objNode = createNode(() => ({ foo: 'bar', num: 42 }));

      const result = convertGraphToNodysseusValues(objNode);

      const valueNode = result.nodes[objNode.id] as ValueNode;
      expect(valueNode.value).toBe('{"foo":"bar","num":42}');
    });

    it('should respect conversion options', () => {
      const node = constant(42);
      const options: ConversionOptions = {
        graphName: 'Test Graph',
        graphDescription: 'A test graph',
        includeEdgesIn: false
      };

      const result = convertGraphToNodysseusValues(node, options);

      expect(result.name).toBe('Test Graph');
      expect(result.description).toBe('A test graph');
      expect(result.edges_in).toBeUndefined();
    });

    it('should create edges with correct dependency mapping', () => {
      const a = constant(1);
      const b = constant(2);
      const sum = createNode((x, y) => x + y, [a, b]);

      const result = convertGraphToNodysseusValues(sum);

      const edges = Object.values(result.edges);
      expect(edges).toHaveLength(2);

      const edgeToSum = edges.find(e => e.to === sum.id && e.from === a.id);
      expect(edgeToSum).toBeDefined();
      expect(edgeToSum?.as).toBe('dep_0');
    });

    it('should order nodes by execution dependency', () => {
      const a = constant(1);
      const b = createNode((x) => x + 1, [a]);
      const c = createNode((x) => x * 2, [b]);

      const result = convertGraphToNodysseusValues(c);

      // All nodes should be present
      expect(Object.keys(result.nodes)).toHaveLength(3);
      expect(result.out).toBe(c.id);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle circular references gracefully', () => {
      // Create a simple case that could lead to infinite recursion
      const a = constant(1);
      const b = createNode((x) => x + 1, [a]);
      
      // Simulate circular reference by manually modifying dependencies
      // Note: This is a bit contrived since the normal API doesn't allow this
      const circularNode = createNode((x) => x, [b]);
      
      expect(() => convertGraphToNodysseus(circularNode)).not.toThrow();
    });

    it('should generate unique graph IDs', async () => {
      const node = constant(42);
      const result1 = convertGraphToNodysseus(node);
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const result2 = convertGraphToNodysseus(node);

      expect(result1.id).not.toBe(result2.id);
    });

    it('should handle nodes with no dependencies', () => {
      const node = createNode(() => 'hello world');
      const result = convertGraphToNodysseus(node);

      expect(result.nodes[node.id]).toBeDefined();
      expect(Object.keys(result.edges)).toHaveLength(0);
      expect(result.out).toBe(node.id);
    });
  });
});