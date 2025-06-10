import { Graph, createCurriedFunction } from '../src/graph';

describe('Graph Currying', () => {
  let graph: Graph;

  beforeEach(() => {
    graph = new Graph();
  });

  it('should demonstrate currying with chain x.y(2).z(w()) equivalent to z(y(x(), 2), w())', () => {
    // Create functions that will be used in the currying pattern
    const xFunc = createCurriedFunction(() => 3); // Regular function returning 3
    const yFunc = createCurriedFunction((input: number, param: number) => input * param);
    const zFunc = createCurriedFunction((input: number, wResult: number) => input + wResult);
    const wFunc = createCurriedFunction(() => 5);

    // Create nodes for each function
    const xNodeCurry = graph.createNode(xFunc); // Node with curried xFunc
    const yNodeCurry = graph.createNode(yFunc); // Node with curried yFunc

    // For zNodeCurry, we need to create a function that demonstrates the currying pattern
    // This function will take an input (result of y), then another function (w) and apply them
    const zNodeCurry = graph.createNode(createCurriedFunction((input: Function, wResultFunc: Function) => {
      const param2 = 2; // This is the '2' in x.y(2).z(w())
      const intermediateResult = input(param2); // Equivalent to y(x(), 2)
      return zFunc(intermediateResult, wResultFunc());
    }));

    const wNodeCurry = graph.createNode(wFunc);

    // Connect the nodes
    graph.connect(xNodeCurry, yNodeCurry, 'next');
    graph.connect(yNodeCurry, zNodeCurry, 'next');

    // Run the curried chain: x.y(2).z(w())
    const curryingResult = (graph.run(zNodeCurry) as Function)(wNodeCurry.data as Function);

    // The expected result is:
    // 1. x() = 3
    // 2. y(x(), 2) = y(3, 2) = 6
    // 3. z(y(x(), 2), w()) = z(6, 5) = 11
    expect(curryingResult).toBe(11);
  });
});