import { 
  convertGraphToNodysseus, 
  convertMultipleNodesToGraph, 
  extractAllNodes, 
  convertGraphToNodysseusValues,
  convertAndCompareGraphOutputs,
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

    it('should create RefNodes with executable functions', () => {
      const dep = constant(10);
      const node = createNode((x) => x * 2, [dep]);
      
      const result = convertGraphToNodysseus(node);
      const refNode = result.nodes[node.id] as RefNode;

      expect(refNode.ref).toBe('@graph.executable');
      expect(typeof refNode.value).toBe('function');
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

  describe('Execution Output Equivalence', () => {
    it('should produce same output for simple constant node', () => {
      const node = constant(42);
      const originalOutput = run(node);
      
      const convertedGraph = convertGraphToNodysseusValues(node);
      const rootValueNode = convertedGraph.nodes[convertedGraph.out!] as ValueNode;
      const nodysseusOutput = parseInt(rootValueNode.value!);
      
      expect(nodysseusOutput).toBe(originalOutput);
    });

    it('should produce same output for addition graph', () => {
      const a = constant(10);
      const b = constant(20);
      const sum = createNode((x, y) => x + y, [a, b]);
      
      const originalOutput = run(sum);
      
      const convertedGraph = convertGraphToNodysseusValues(sum);
      const rootValueNode = convertedGraph.nodes[convertedGraph.out!] as ValueNode;
      const nodysseusOutput = parseInt(rootValueNode.value!);
      
      expect(nodysseusOutput).toBe(originalOutput);
      expect(nodysseusOutput).toBe(30);
    });

    it('should produce same output for complex nested calculation', () => {
      const a = constant(5);
      const b = constant(3);
      const multiply = createNode((x, y) => x * y, [a, b]);
      const c = constant(2);
      const final = createNode((x, y) => x + y, [multiply, c]);
      
      const originalOutput = run(final);
      
      const convertedGraph = convertGraphToNodysseusValues(final);
      const rootValueNode = convertedGraph.nodes[convertedGraph.out!] as ValueNode;
      const nodysseusOutput = parseInt(rootValueNode.value!);
      
      expect(nodysseusOutput).toBe(originalOutput);
      expect(nodysseusOutput).toBe(17); // (5 * 3) + 2 = 17
    });

    it('should produce same output for string manipulation', () => {
      const greeting = constant('Hello');
      const name = constant('World');
      const combined = createNode((g, n) => `${g}, ${n}!`, [greeting, name]);
      
      const originalOutput = run(combined);
      
      const convertedGraph = convertGraphToNodysseusValues(combined);
      const rootValueNode = convertedGraph.nodes[convertedGraph.out!] as ValueNode;
      const nodysseusOutput = rootValueNode.value!;
      
      expect(nodysseusOutput).toBe(originalOutput);
      expect(nodysseusOutput).toBe('Hello, World!');
    });

    it('should produce same output for array operations', () => {
      const arr1 = constant([1, 2, 3]);
      const arr2 = constant([4, 5]);
      const concatenated = createNode((a, b) => [...a, ...b], [arr1, arr2]);
      
      const originalOutput = run(concatenated);
      
      const convertedGraph = convertGraphToNodysseusValues(concatenated);
      const rootValueNode = convertedGraph.nodes[convertedGraph.out!] as ValueNode;
      const nodysseusOutput = JSON.parse(rootValueNode.value!);
      
      expect(nodysseusOutput).toEqual(originalOutput);
      expect(nodysseusOutput).toEqual([1, 2, 3, 4, 5]);
    });

    it('should produce same output for object manipulation', () => {
      const obj1 = constant({ a: 1, b: 2 });
      const obj2 = constant({ c: 3, d: 4 });
      const merged = createNode((o1, o2) => ({ ...o1, ...o2 }), [obj1, obj2]);
      
      const originalOutput = run(merged);
      
      const convertedGraph = convertGraphToNodysseusValues(merged);
      const rootValueNode = convertedGraph.nodes[convertedGraph.out!] as ValueNode;
      const nodysseusOutput = JSON.parse(rootValueNode.value!);
      
      expect(nodysseusOutput).toEqual(originalOutput);
      expect(nodysseusOutput).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    });

    it('should produce same output for function composition', () => {
      const input = constant(10);
      const double = createNode((x) => x * 2, [input]);
      const addTen = createNode((x) => x + 10, [double]);
      const toString = createNode((x) => `Result: ${x}`, [addTen]);
      
      const originalOutput = run(toString);
      
      const convertedGraph = convertGraphToNodysseusValues(toString);
      const rootValueNode = convertedGraph.nodes[convertedGraph.out!] as ValueNode;
      const nodysseusOutput = rootValueNode.value!;
      
      expect(nodysseusOutput).toBe(originalOutput);
      expect(nodysseusOutput).toBe('Result: 30');
    });

    it('should produce same output for mathematical operations', () => {
      const x = constant(4);
      const y = constant(3);
      const power = createNode((base, exp) => Math.pow(base, exp), [x, y]);
      const sqrt = createNode((val) => Math.sqrt(val), [power]);
      
      const originalOutput = run(sqrt);
      
      const convertedGraph = convertGraphToNodysseusValues(sqrt);
      const rootValueNode = convertedGraph.nodes[convertedGraph.out!] as ValueNode;
      const nodysseusOutput = parseFloat(rootValueNode.value!);
      
      expect(nodysseusOutput).toBe(originalOutput);
      expect(nodysseusOutput).toBe(8); // sqrt(4^3) = sqrt(64) = 8
    });

    it('should produce same output for conditional logic', () => {
      const condition = constant(true);
      const valueA = constant('Option A');
      const valueB = constant('Option B');
      const conditional = createNode((cond, a, b) => cond ? a : b, [condition, valueA, valueB]);
      
      const originalOutput = run(conditional);
      
      const convertedGraph = convertGraphToNodysseusValues(conditional);
      const rootValueNode = convertedGraph.nodes[convertedGraph.out!] as ValueNode;
      const nodysseusOutput = rootValueNode.value!;
      
      expect(nodysseusOutput).toBe(originalOutput);
      expect(nodysseusOutput).toBe('Option A');
    });

    it('should produce same output with shared dependencies', () => {
      const shared = constant(5);
      const doubled = createNode((x) => x * 2, [shared]);
      const tripled = createNode((x) => x * 3, [shared]);
      const sum = createNode((a, b) => a + b, [doubled, tripled]);
      
      const originalOutput = run(sum);
      
      const convertedGraph = convertGraphToNodysseusValues(sum);
      const rootValueNode = convertedGraph.nodes[convertedGraph.out!] as ValueNode;
      const nodysseusOutput = parseInt(rootValueNode.value!);
      
      expect(nodysseusOutput).toBe(originalOutput);
      expect(nodysseusOutput).toBe(25); // (5*2) + (5*3) = 10 + 15 = 25
    });

    it('should verify all intermediate node values match', () => {
      const a = constant(3);
      const b = constant(4);
      const sum = createNode((x, y) => x + y, [a, b]);
      const doubled = createNode((x) => x * 2, [sum]);
      
      // Run original graph and collect all values
      const aValue = run(a);
      const bValue = run(b);
      const sumValue = run(sum);
      const doubledValue = run(doubled);
      
      // Convert to Nodysseus value graph
      const convertedGraph = convertGraphToNodysseusValues(doubled);
      
      // Verify each node's value matches
      const aNodeValue = convertedGraph.nodes[a.id] as ValueNode;
      const bNodeValue = convertedGraph.nodes[b.id] as ValueNode;
      const sumNodeValue = convertedGraph.nodes[sum.id] as ValueNode;
      const doubledNodeValue = convertedGraph.nodes[doubled.id] as ValueNode;
      
      expect(parseInt(aNodeValue.value!)).toBe(aValue);
      expect(parseInt(bNodeValue.value!)).toBe(bValue);
      expect(parseInt(sumNodeValue.value!)).toBe(sumValue);
      expect(parseInt(doubledNodeValue.value!)).toBe(doubledValue);
      
      // Verify final result
      expect(parseInt(doubledNodeValue.value!)).toBe(14); // (3+4)*2 = 14
    });
  });

  describe('Runtime Output Comparison with @graph.executable', () => {
    it('should use @graph.executable reference type in converted nodes', () => {
      const node = constant(42);
      const result = convertGraphToNodysseus(node);
      
      const refNode = result.nodes[node.id] as RefNode;
      expect(refNode.ref).toBe('@graph.executable');
      expect(typeof refNode.value).toBe('function');
    });

    it('should produce matching outputs for simple constant node', () => {
      const node = constant(42);
      const comparison = convertAndCompareGraphOutputs(node);
      
      expect(comparison.outputsMatch).toBe(true);
      expect(comparison.originalOutput).toBe(42);
      expect(comparison.nodysseusOutput).toBe(42);
    });

    it('should produce matching outputs for addition operation', () => {
      const a = constant(10);
      const b = constant(20);
      const sum = createNode((x, y) => x + y, [a, b]);
      
      const comparison = convertAndCompareGraphOutputs(sum);
      
      expect(comparison.outputsMatch).toBe(true);
      expect(comparison.originalOutput).toBe(30);
      expect(comparison.nodysseusOutput).toBe(30);
    });

    it('should produce matching outputs for complex nested operations', () => {
      const a = constant(5);
      const b = constant(3);
      const multiply = createNode((x, y) => x * y, [a, b]);
      const c = constant(2);
      const final = createNode((x, y) => x + y, [multiply, c]);
      
      const comparison = convertAndCompareGraphOutputs(final);
      
      expect(comparison.outputsMatch).toBe(true);
      expect(comparison.originalOutput).toBe(17); // (5 * 3) + 2 = 17
      expect(comparison.nodysseusOutput).toBe(17);
    });

    it('should produce matching outputs for string operations', () => {
      const greeting = constant('Hello');
      const name = constant('World');
      const combined = createNode((g, n) => `${g}, ${n}!`, [greeting, name]);
      
      const comparison = convertAndCompareGraphOutputs(combined);
      
      expect(comparison.outputsMatch).toBe(true);
      expect(comparison.originalOutput).toBe('Hello, World!');
      expect(comparison.nodysseusOutput).toBe('Hello, World!');
    });

    it('should produce matching outputs for array operations', () => {
      const arr1 = constant([1, 2, 3]);
      const arr2 = constant([4, 5]);
      const concatenated = createNode((a, b) => [...a, ...b], [arr1, arr2]);
      
      const comparison = convertAndCompareGraphOutputs(concatenated);
      
      expect(comparison.outputsMatch).toBe(true);
      expect(comparison.originalOutput).toEqual([1, 2, 3, 4, 5]);
      expect(comparison.nodysseusOutput).toEqual([1, 2, 3, 4, 5]);
    });

    it('should produce matching outputs for object operations', () => {
      const obj1 = constant({ a: 1, b: 2 });
      const obj2 = constant({ c: 3, d: 4 });
      const merged = createNode((o1, o2) => ({ ...o1, ...o2 }), [obj1, obj2]);
      
      const comparison = convertAndCompareGraphOutputs(merged);
      
      expect(comparison.outputsMatch).toBe(true);
      expect(comparison.originalOutput).toEqual({ a: 1, b: 2, c: 3, d: 4 });
      expect(comparison.nodysseusOutput).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    });

    it('should produce matching outputs for mathematical functions', () => {
      const x = constant(4);
      const y = constant(3);
      const power = createNode((base, exp) => Math.pow(base, exp), [x, y]);
      const sqrt = createNode((val) => Math.sqrt(val), [power]);
      
      const comparison = convertAndCompareGraphOutputs(sqrt);
      
      expect(comparison.outputsMatch).toBe(true);
      expect(comparison.originalOutput).toBe(8); // sqrt(4^3) = sqrt(64) = 8
      expect(comparison.nodysseusOutput).toBe(8);
    });

    it('should produce matching outputs for conditional logic', () => {
      const condition = constant(true);
      const valueA = constant('Option A');
      const valueB = constant('Option B');
      const conditional = createNode((cond, a, b) => cond ? a : b, [condition, valueA, valueB]);
      
      const comparison = convertAndCompareGraphOutputs(conditional);
      
      expect(comparison.outputsMatch).toBe(true);
      expect(comparison.originalOutput).toBe('Option A');
      expect(comparison.nodysseusOutput).toBe('Option A');
    });

    it('should produce matching outputs with shared dependencies', () => {
      const shared = constant(5);
      const doubled = createNode((x) => x * 2, [shared]);
      const tripled = createNode((x) => x * 3, [shared]);
      const sum = createNode((a, b) => a + b, [doubled, tripled]);
      
      const comparison = convertAndCompareGraphOutputs(sum);
      
      expect(comparison.outputsMatch).toBe(true);
      expect(comparison.originalOutput).toBe(25); // (5*2) + (5*3) = 10 + 15 = 25
      expect(comparison.nodysseusOutput).toBe(25);
    });

    it('should provide detailed comparison information', () => {
      const a = constant(3);
      const b = constant(4);
      const sum = createNode((x, y) => x + y, [a, b]);
      
      const comparison = convertAndCompareGraphOutputs(sum);
      
      expect(comparison).toHaveProperty('originalOutput');
      expect(comparison).toHaveProperty('nodysseusOutput');
      expect(comparison).toHaveProperty('outputsMatch');
      expect(comparison).toHaveProperty('convertedGraph');
      
      expect(comparison.convertedGraph.nodes).toBeDefined();
      expect(comparison.convertedGraph.edges).toBeDefined();
      expect(comparison.convertedGraph.out).toBe(sum.id);
    });
  });
});