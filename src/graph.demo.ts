// graph.demo.ts - Demonstration of the Graph implementation

import { Graph, createGraphNodeWrapper } from './graph';

// Create a new graph
const myGraph = new Graph<number>();

// Create nodes with data
const node1 = myGraph.createNode(10);
const node2 = myGraph.createNode(20);
const node3 = myGraph.createNode(30);

console.log(`Created node1 with ID: ${node1.id}`);
console.log(`Created node2 with ID: ${node2.id}`);
console.log(`Created node3 with ID: ${node3.id}`);

// Connect nodes via named inputs
myGraph.connect(node1, node2, 'inputA');
myGraph.connect(node1, node3, 'inputB');

// Verify connections
console.log(`Node2 is connected to node1 via inputA: ${node2.inputs.has('inputA')}`);
console.log(`Node3 is connected to node1 via inputB: ${node3.inputs.has('inputB')}`);

// Demonstrate the decorator function
class Example {
  exampleMethod = createGraphNodeWrapper(function() {
    console.log('This is an example method');
  }).bind(this);
}

const example = new Example();
example.exampleMethod();

// Output all nodes in the graph
console.log('All nodes in the graph:');
myGraph.getAllNodes().forEach(node => {
  console.log(`- Node ID: ${node.id}, Data: ${node.data}`);
});