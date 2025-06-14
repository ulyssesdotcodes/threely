// graph.ts - Implementation of a functional node-based graph system with TypeScript
import { GraphPrettyPrinter, PrettyPrintOptions } from './graph-pretty-printer';

/**
 * Type representing a Node in the graph.
 *
 * @template T - The type of value this node computes
 */
export type Node<T> = {
  readonly id: string;
  readonly compute: (...args: any[]) => T;
  readonly dependencies: readonly Node<any>[];
}

/**
 * Type definition for a curried function (kept for backward compatibility)
 */
export type CurriedFunction<T> = (...args: any[]) => CurriedFunction<T> | T;

let nodeIdCounter = 0;

/**
 * Generate a unique ID for nodes
 */
const generateUniqueId = (): string => `node-${++nodeIdCounter}`;

/**
 * Create a new node with the given compute function and dependencies
 */
export const createNode = <T>(
  compute: (...args: any[]) => T,
  dependencies: readonly Node<any>[] = []
): Node<T> => ({
  id: generateUniqueId(),
  compute,
  dependencies
});

/**
 * Execute a node and return its computed value
 * @param node - The node to execute
 * @returns The computed value
 */
export const run = <T>(node: Node<T>): T => {
  // Resolve all dependencies first
  const dependencyResults = node.dependencies.map(dep => run(dep));
  
  // Call the compute function with all dependency results as arguments
  return node.compute(...dependencyResults);
};

/**
 * The map function with type (A => B) => Node<A> => Node<B>
 * 
 * @param fn - Function to transform value A to value B
 * @returns A function that transforms Node<A> to Node<B>
 */
export const map = <A, B>(fn: (a: A) => B) => (node: Node<A>): Node<B> =>
  createNode(fn, [node]);

/**
 * Apply a function with multiple arguments to multiple nodes
 * @param fn - Function to apply
 * @param nodes - Array of nodes providing arguments
 * @returns New node that applies the function to resolved dependencies
 */
export const apply = <T>(
  fn: (...args: any[]) => T,
  nodes: readonly Node<any>[]
): Node<T> => createNode(fn, nodes);

/**
 * Create a constant node (no dependencies)
 * @param value - The constant value
 * @returns Node that always returns the constant value
 */
export const constant = <T>(value: T): Node<T> => 
  createNode(() => value, []);

/**
 * Compose two nodes: f(g(x))
 * @param f - Outer function node
 * @param g - Inner function node  
 * @returns Composed node
 */
export const compose = <A, B, C>(
  f: (b: B) => C,
  g: (a: A) => B
) => (node: Node<A>): Node<C> =>
  createNode(f, [map(g)(node)]);

/**
 * Pretty print a node and its dependencies
 */
export const prettyPrint = (node: Node<any>, options?: PrettyPrintOptions): string => {
  const printer = new GraphPrettyPrinter(options);
  return printer.print(node);
};

/**
 * Create a compact representation of a node
 */
export const compact = (node: Node<any>, options?: PrettyPrintOptions): string => {
  const printer = new GraphPrettyPrinter(options);
  return printer.compact(node);
};

// Legacy class-based API for backward compatibility
export class Graph {
  static run = run;
  static prettyPrint = prettyPrint;
  static compact = compact;
}

// Export for backward compatibility
export { Graph as DefaultGraph };