import { Graph, createGraphNodeWrapper } from '../src/graph';

  describe('Graph Node Connection', () => {
    let graph: Graph;

    beforeEach(() => {
      graph = new Graph();
    });

    it('should connect nodes in a chain', () => {
      const fn1 = jest.fn(() => console.log('Function 1'));
      const wrappedFn1 = createGraphNodeWrapper(fn1, graph);

      // Call the first function to create the first node
      wrappedFn1();

      // Get the first node
      const nodes = graph.getAllNodes();
      expect(nodes.length).toBe(1);
      const firstNode = nodes[0];

      // Save the current node state before calling the second function
      const prevCurrentNode = graph.currentNode;

      // Create a second node and it should be connected to the first
      const fn2 = jest.fn(() => console.log('Function 2'));
      const wrappedFn2 = createGraphNodeWrapper(fn2, graph);

      // Manually set the current node to the first node before calling the second function
      graph.currentNode = firstNode;
      wrappedFn2();

      // Check that two nodes were created and connected
      const updatedNodes = graph.getAllNodes();
      expect(updatedNodes.length).toBe(2);

      // First node should have an output connection to the second node
      if (updatedNodes.length === 2) {
        expect(firstNode.outputs.size).toBe(1);
        expect(Array.from(firstNode.outputs.values())[0]).toBe(updatedNodes[1]);
      }
    });
  });