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