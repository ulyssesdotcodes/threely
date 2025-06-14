// Test the new simple node system
import { Node, constNode, map, runNode } from './types.js';

// Example: Create a node system that transforms numbers
// Node<number> -> Node<string> -> Node<number>

// 1. Create a constant node with value 42
const numberNode: Node<number> = constNode(42);

// 2. Transform it to a string using map
const stringNode: Node<string> = map((n: number) => `The number is ${n}`)(numberNode);

// 3. Transform it back to a number (length of the string)
const lengthNode: Node<number> = map((s: string) => s.length)(stringNode);

// 4. Run the nodes
console.log('Number node:', runNode(numberNode)); // 42
console.log('String node:', runNode(stringNode)); // "The number is 42"
console.log('Length node:', runNode(lengthNode)); // 16

// Example showing how the function is stored on Node<B> when transforming Node<A> -> Node<B>
console.log('Dependencies:');
console.log('numberNode dependencies:', numberNode.dependencies.length); // 0 (constant)
console.log('stringNode dependencies:', stringNode.dependencies.length); // 1 (depends on numberNode)
console.log('lengthNode dependencies:', lengthNode.dependencies.length); // 1 (depends on stringNode)

export { numberNode, stringNode, lengthNode };