// nodysseus-pretty-printer.test.ts - Tests for Nodysseus graph pretty printing
import { 
  NodysseusPrettyPrinter, 
  prettyPrint, 
  compact,
  type NodysseusPrettyPrintOptions 
} from '../src/nodysseus-pretty-printer';
import { Graph, RefNode, ValueNode, Edge } from '../src/nodysseus/types';

describe('NodysseusPrettyPrinter', () => {
  // Helper function to create a simple test graph
  const createTestGraph = (): Graph => {
    const sphereNode: RefNode = {
      id: 'sphere-1',
      ref: '@graph.executable',
      value: () => 'sphere geometry'
    };

    const radiusNode: ValueNode = {
      id: 'radius-1',
      value: '1.5'
    };

    const materialNode: RefNode = {
      id: 'material-1', 
      ref: '@graph.executable',
      value: () => 'basic material'
    };

    const meshNode: RefNode = {
      id: 'mesh-1',
      ref: '@graph.executable',
      value: () => 'mesh object'
    };

    const edges: Record<string, Edge> = {
      'radius-1->sphere-1': { from: 'radius-1', to: 'sphere-1', as: 'arg0' },
      'sphere-1->mesh-1': { from: 'sphere-1', to: 'mesh-1', as: 'arg0' },
      'material-1->mesh-1': { from: 'material-1', to: 'mesh-1', as: 'arg1' }
    };

    const edges_in = {
      'sphere-1': { 'radius-1': edges['radius-1->sphere-1'] },
      'mesh-1': { 
        'sphere-1': edges['sphere-1->mesh-1'],
        'material-1': edges['material-1->mesh-1']
      }
    };

    return {
      id: 'test-graph',
      name: 'Test Graph',
      description: 'A simple test graph for pretty printing',
      out: 'mesh-1',
      nodes: {
        'sphere-1': sphereNode,
        'radius-1': radiusNode,
        'material-1': materialNode,
        'mesh-1': meshNode
      },
      edges,
      edges_in
    };
  };

  const createFrameGraph = (): Graph => {
    const frameNode: RefNode = {
      id: 'frame-1',
      ref: 'extern.frame'
    };

    return {
      id: 'frame-graph',
      out: 'frame-1',
      nodes: { 'frame-1': frameNode },
      edges: {},
      edges_in: {}
    };
  };

  describe('Constructor and Options', () => {
    test('should create printer with default options', () => {
      const printer = new NodysseusPrettyPrinter();
      expect(printer).toBeInstanceOf(NodysseusPrettyPrinter);
    });

    test('should accept custom options', () => {
      const options: NodysseusPrettyPrintOptions = {
        showIds: false,
        showTypes: false,
        maxDepth: 5
      };
      const printer = new NodysseusPrettyPrinter(options);
      expect(printer).toBeInstanceOf(NodysseusPrettyPrinter);
    });
  });

  describe('Node Label Generation', () => {
    test('should generate labels for RefNodes', () => {
      const printer = new NodysseusPrettyPrinter();
      const graph = createFrameGraph();
      const output = printer.print(graph);
      
      expect(output).toContain('frame');
      expect(output).toContain('RefNode');
    });

    test('should generate labels for ValueNodes', () => {
      const printer = new NodysseusPrettyPrinter();
      const graph = createTestGraph();
      const output = printer.print(graph);
      
      expect(output).toContain('1.5');
    });

    test('should handle custom node labeling', () => {
      const customLabel = (node: any) => `CUSTOM-${node.id}`;
      const printer = new NodysseusPrettyPrinter({ nodeLabel: customLabel });
      const graph = createTestGraph();
      const output = printer.print(graph);
      
      expect(output).toContain('CUSTOM-mesh-1');
      expect(output).toContain('CUSTOM-sphere-1');
    });
  });

  describe('Pretty Print Output', () => {
    test('should display graph metadata', () => {
      const printer = new NodysseusPrettyPrinter();
      const graph = createTestGraph();
      const output = printer.print(graph);
      
      expect(output).toContain('Graph: test-graph');
      expect(output).toContain('Name: Test Graph');
      expect(output).toContain('Description: A simple test graph');
      expect(output).toContain('Nodes: 4, Edges: 3');
    });

    test('should show tree structure with edges', () => {
      const printer = new NodysseusPrettyPrinter();
      const graph = createTestGraph();
      const output = printer.print(graph);
      
      expect(output).toContain('Output:');
      expect(output).toContain('arg0:');
      expect(output).toContain('arg1:');
      expect(output).toMatch(/[├└]─/); // Tree connectors
    });

    test('should handle graphs without output node', () => {
      const graph = createTestGraph();
      delete graph.out;
      
      const printer = new NodysseusPrettyPrinter();
      const output = printer.print(graph);
      
      expect(output).toContain('All Nodes:');
    });

    test('should respect showIds option', () => {
      const graph = createTestGraph();
      
      const withIds = new NodysseusPrettyPrinter({ showIds: true });
      const withoutIds = new NodysseusPrettyPrinter({ showIds: false });
      
      expect(withIds.print(graph)).toContain('[mesh-1]');
      expect(withoutIds.print(graph)).not.toContain('[mesh-1]');
    });

    test('should respect showTypes option', () => {
      const graph = createTestGraph();
      
      const withTypes = new NodysseusPrettyPrinter({ showTypes: true });
      const withoutTypes = new NodysseusPrettyPrinter({ showTypes: false });
      
      expect(withTypes.print(graph)).toContain('(RefNode)');
      expect(withoutTypes.print(graph)).not.toContain('(RefNode)');
    });
  });

  describe('Compact Representation', () => {
    test('should generate compact output', () => {
      const printer = new NodysseusPrettyPrinter();
      const graph = createTestGraph();
      const output = printer.compact(graph);
      
      expect(output).toMatch(/\w+\([^)]*\)/); // Should have function-like format
      expect(output).not.toContain('\n'); // Should be single line
    });

    test('should handle simple nodes without dependencies', () => {
      const printer = new NodysseusPrettyPrinter();
      const graph = createFrameGraph();
      const output = printer.compact(graph);
      
      expect(output).toBe('frame');
    });

    test('should handle missing output node', () => {
      const graph = createTestGraph();
      delete graph.out;
      
      const printer = new NodysseusPrettyPrinter();
      const output = printer.compact(graph);
      
      expect(output).toContain('4 nodes');
    });
  });

  describe('Circular Reference Handling', () => {
    test('should detect and handle circular references', () => {
      const graph = createTestGraph();
      // Create a circular reference
      graph.edges['mesh-1->sphere-1'] = { from: 'mesh-1', to: 'sphere-1', as: 'arg1' };
      graph.edges_in!['sphere-1']['mesh-1'] = graph.edges['mesh-1->sphere-1'];
      
      const printer = new NodysseusPrettyPrinter();
      const output = printer.print(graph);
      
      expect(output).toContain('circular');
    });
  });

  describe('Functional API', () => {
    test('prettyPrint function should work', () => {
      const graph = createTestGraph();
      const output = prettyPrint(graph);
      
      expect(output).toContain('Graph: test-graph');
      expect(typeof output).toBe('string');
    });

    test('compact function should work', () => {
      const graph = createTestGraph();
      const output = compact(graph);
      
      expect(typeof output).toBe('string');
      expect(output.length).toBeGreaterThan(0);
    });

    test('should accept options in functional API', () => {
      const graph = createTestGraph();
      const output = prettyPrint(graph, { showIds: false });
      
      expect(output).not.toContain('[mesh-1]');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty graphs', () => {
      const emptyGraph: Graph = {
        id: 'empty',
        nodes: {},
        edges: {},
        edges_in: {}
      };
      
      const printer = new NodysseusPrettyPrinter();
      const output = printer.print(emptyGraph);
      
      expect(output).toContain('Nodes: 0, Edges: 0');
    });

    test('should handle missing nodes', () => {
      const graph = createTestGraph();
      graph.out = 'nonexistent-node';
      
      const printer = new NodysseusPrettyPrinter();
      const output = printer.print(graph);
      
      expect(output).toContain('[MISSING NODE: nonexistent-node]');
    });

    test('should respect max depth', () => {
      const printer = new NodysseusPrettyPrinter({ maxDepth: 1 });
      const graph = createTestGraph();
      const output = printer.print(graph);
      
      expect(output).toContain('max depth reached');
    });

    test('should handle long string values', () => {
      const graph: Graph = {
        id: 'string-test',
        out: 'long-string',
        nodes: {
          'long-string': {
            id: 'long-string',
            value: 'This is a very long string that should be truncated in the output'
          }
        },
        edges: {},
        edges_in: {}
      };
      
      const printer = new NodysseusPrettyPrinter();
      const output = printer.print(graph);
      
      expect(output).toContain('...');
    });
  });
});