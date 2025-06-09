// Graph Demo
  import { createGraphNodeWrapper, Graph } from './graph';

  // Create some functions that will be used in the graph
  const function1 = (input: number) => {
    console.log(`Function 1 received: ${input}`);
    return input * 2;
  };

  const function2 = (input: number) => {
    console.log(`Function 2 received: ${input}`);
    return input + 5;
  };

  // Create a graph instance
  const graph = new Graph();

  // Create wrapped functions that create graph nodes using the same graph instance
  const wrappedFunction1 = createGraphNodeWrapper(function1, graph);
  const wrappedFunction2 = createGraphNodeWrapper(function2, graph);

  // Run the chain of functions with an initial value of 3
  const result = wrappedFunction2(wrappedFunction1(3));

  console.log(`Final result: ${result}`); // Should be (3*2)+5 = 11

  // Test for node inputs being passed as parameters to data function
  console.log("\n--- Testing Node Inputs as Parameters ---");

  // Create a chain of nodes x => y => z where z's data function receives the result of y(x()) as its parameter
  const xNode = graph.createNode();
  const yNode = graph.createNode((input: number) => {
    console.log(`y node received input: ${input}`);
    return input * 2;
  });
  const zNode = graph.createNode((input: number) => {
    console.log(`z node received input: ${input}`);
    return input + 5;
  });

  // Connect the nodes
  graph.connect(xNode, yNode, 'next');
  graph.connect(yNode, zNode, 'next');

  // Set initial value for xNode
  (xNode.data as Function) = () => 3;

  // Run the chain and get the result from zNode
  const finalResult = graph.run(zNode);
  console.log(`Final result of z node: ${finalResult}`); // Should be (3*2)+5 = 11

  // Test currying functionality
  console.log("\n--- Testing Currying Functionality ---");

  // Create a function that demonstrates the currying pattern x.y(2).z(w())
  const xFunc = () => 3;
  const yFunc = (input: number, param: number) => input * param;
  const zFunc = (input: number, wResult: number) => input + wResult;
  const wFunc = () => 5;

  // Create nodes for each function
  const xNodeCurry = graph.createNode(xFunc);
  const yNodeCurry = graph.createNode((input: number) => {
    return (param: number) => yFunc(input, param);
  });
  const zNodeCurry = graph.createNode((input: Function) => {
    const param2 = 2; // This is the '2' in x.y(2).z(w())
    const intermediateResult = input(param2); // Equivalent to y(x(), 2)
    return (wResultFunc: Function) => zFunc(intermediateResult, wResultFunc());
  });
  const wNodeCurry = graph.createNode(wFunc);

  // Connect the nodes
  graph.connect(xNodeCurry, yNodeCurry, 'next');
  graph.connect(yNodeCurry, zNodeCurry, 'next');

  // Run the curried chain: x.y(2).z(w())
  const curryingResult = (graph.run(zNodeCurry) as Function)(wNodeCurry.data as Function);
  console.log(`Currying result: ${curryingResult}`); // Should be z(y(x(), 2), w()) = z(6, 5) = 11