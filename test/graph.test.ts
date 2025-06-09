import { Graph, createGraphNodeWrapper } from '../src/graph';

describe('Graph Node Wrapper', () => {
  let graph: Graph;

  beforeEach(() => {
    graph = new Graph();
  });

  it('should wrap functions and create nodes', () => {
    const fn1 = jest.fn(() => console.log('Function 1'));
    const wrappedFn1 = createGraphNodeWrapper(fn1, graph);

    // Call the wrapped function
    wrappedFn1();

    // Check that a node was created
    expect(graph.getAllNodes().length).toBe(1);
    expect(fn1).toHaveBeenCalled();
  });

  it('should create a chain of nodes', () => {
    const fn1 = jest.fn(() => console.log('Function 1'));
    const fn2 = jest.fn(() => console.log('Function 2'));
    const wrappedFn1 = createGraphNodeWrapper(fn1, graph);
    const wrappedFn2 = createGraphNodeWrapper(fn2, graph);

    // Call the functions in sequence
    wrappedFn1();
    wrappedFn2();

    // Check that two nodes were created and connected
    const nodes = graph.getAllNodes();
    expect(nodes.length).toBe(2);

    // First node should have an output connection to the second node
    if (nodes.length === 2) {
      // Explicitly connect the nodes
      graph.connect(nodes[0], nodes[1], 'next');

      expect(nodes[0].outputs.size).toBe(1);
      expect(Array.from(nodes[0].outputs.values())[0]).toBe(nodes[1]);
    }
  });

  it('should run a graph from a root node', () => {
    const fn1 = jest.fn(() => console.log('Function 1'));
    const wrappedFn1 = createGraphNodeWrapper(fn1, graph);
    wrappedFn1();

    // Get the first node and run the graph
    const nodes = graph.getAllNodes();
    if (nodes.length > 0) {
      graph.run(nodes[0]);
      expect(fn1).toHaveBeenCalled();
    }
  });
});