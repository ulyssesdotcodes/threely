// graph.test.ts - Unit tests for the Graph implementation

import { Graph, Node, createGraphNodeWrapper } from '../src/graph';

declare const describe: (name: string, callback: () => void) => void;
declare const it: (name: string, callback: () => void) => void;
declare const beforeEach: (callback: () => void) => void;
declare const expect: (value: any) => {
  toBe(expected: any): boolean;
  toBeDefined(): boolean;
  toHaveBeenCalledWith(...args: any[]): boolean;
};

// Test suite for Graph class
describe('Graph', () => {
  let graph: Graph<number>;

  beforeEach(() => {
    graph = new Graph<number>();
  });

  // Test node creation
  it('should create a node with a unique ID', () => {
    const node = graph.createNode(10);
    expect(node).toBeDefined();
    expect(node.id).toBeDefined();
    expect(node.inputs.size).toBe(0);
    expect(node.outputs.size).toBe(0);
  });

  // Test node connection
  it('should connect nodes via named inputs', () => {
    const node1 = graph.createNode(10);
    const node2 = graph.createNode(20);

    graph.connect(node1, node2, 'input1');

    expect(node2.inputs.has('input1')).toBe(true);
    expect(node2.inputs.get('input1')!).toBe(node1);
    expect(node1.outputs.has('input1')).toBe(true);
    expect(node1.outputs.get('input1')!).toBe(node2);
  });

  // Test duplicate connection warning
  it('should warn when connecting to an already connected input', () => {
    const node1 = graph.createNode(10);
    const node2 = graph.createNode(20);

    console.warn = jest.fn();

    graph.connect(node1, node2, 'input1');
    graph.connect(node1, node2, 'input1'); // This should trigger a warning

    // Check if the warning was called with the expected message
    const warnArgs = (console.warn as any).mock.calls[0][0];
    expect(typeof warnArgs === 'string' && warnArgs.includes('already has a connection')).toBe(true);
  });

  // Test getting a node by ID
  it('should retrieve a node by its ID', () => {
    const node = graph.createNode(10);
    const retrievedNode = graph.getNode(node.id);

    expect(retrievedNode!.id).toBe(node.id);
  });

});

// Test suite for createGraphNodeWrapper function
describe('createGraphNodeWrapper', () => {
  it('should wrap a function and create a node with a unique ID', () => {
    const originalFunction = jest.fn(() => 'original result');
    const wrappedFunction = createGraphNodeWrapper(originalFunction);

    console.log = jest.fn();

    const result = wrappedFunction();

    // Check if the log was called with an ID
    const logArgs = (console.log as any).mock.calls[0][0];
    expect(typeof logArgs === 'string' && logArgs.includes('Node created with ID:')).toBe(true);
    // Check if the original function was called
    expect((originalFunction as any).mock.calls.length > 0).toBe(true);
    expect(result).toBe('original result');
  });
});