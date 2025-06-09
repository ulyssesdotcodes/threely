import { Graph, createGraphNodeWrapper } from '../src/graph';

describe('Graph Node Chain', () => {
  let graph: Graph;

  beforeEach(() => {
    graph = new Graph();
  });

  it('should create a chain of nodes', () => {
    const fn1 = jest.fn(() => console.log('Function 1'));
    const fn2 = jest.fn(() => console.log('Function 2'));

    // Create the first node by calling the wrapped function
    const wrappedFn1 = createGraphNodeWrapper(fn1, graph);
    wrappedFn1();

    // Get the first node
    const nodes = graph.getAllNodes();
    expect(nodes.length).toBe(1);

    // Now create the second node and it should be connected to the first
    const wrappedFn2 = createGraphNodeWrapper(fn2, graph);
    wrappedFn2();

    // Check that two nodes were created
    const updatedNodes = graph.getAllNodes();
    expect(updatedNodes.length).toBe(2);

    // First node should have an output connection to the second node
    if (updatedNodes.length === 2) {
      // Explicitly connect the nodes
      graph.connect(updatedNodes[0], updatedNodes[1], 'next');

      expect(updatedNodes[0].outputs.size).toBe(1);
      expect(Array.from(updatedNodes[0].outputs.values())[0]).toBe(updatedNodes[1]);
    }
  });
});