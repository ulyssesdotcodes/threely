// graph.ts - Implementation of a functional node-based graph system with TypeScript
import { GraphPrettyPrinter, PrettyPrintOptions } from './graph-pretty-printer';

// Import RefNode type for external node references
import { RefNode } from './nodysseus/types';

/**
 * Type representing a Node in the graph.
 *
 * @template T - The type of value this node produces
 */
export type Node<T> = {
  readonly id: string;
  readonly value: ((...args: any[]) => T) | RefNode | T;
  readonly dependencies: readonly Node<any>[];
  readonly graphId?: string;
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
 * Create a new node with the given value and dependencies
 */
export const createNode = <T>(
  value: ((...args: any[]) => T) | RefNode | T,
  dependencies: readonly Node<any>[] = [],
  chain: Record<string,  {fn: (...args: any[]) => any, chain: () => any}> = {},
  graphId?: string
): Node<T> => (new Proxy({
  id: generateUniqueId(),
  value,
  dependencies,
  ...(graphId && { graphId })
}, {
  get(target, p, receiver) {
    if(target[p]) return target[p]
    if(chain[p as any]) {
      return (...args) => {
        args = args.map(a => a.id ? a : constant(a));
        return createNode(chain[p as any].fn, [target, ...args], chain[p as any].chain())
      }
    }
  }
}));

/**
 * Execute a node and return its computed value
 * @param node - The node to execute
 * @returns The computed value
 */
export const run = <T>(node: Node<T>): T => {
  // Handle different value types
  if (typeof node.value === 'function') {
    // Function value: resolve dependencies and call function
    const dependencyResults = node.dependencies.map(dep => run(dep));
    return (node.value as (...args: any[]) => T)(...dependencyResults);
  } else if (typeof node.value === 'object' && node.value !== null && 'ref' in node.value) {
    // RefNode value: this should be handled by the Nodysseus runtime
    // For now, throw an error since we can't execute RefNodes directly in the functional graph
    throw new Error(`Cannot execute RefNode '${(node.value as RefNode).ref}' in functional graph. Use NodysseusRuntime instead.`);
  } else {
    // Constant value: return as-is
    return node.value as T;
  }
};

/**
 * The map function with type (A => B) => Node<A> => Node<B>
 * 
 * @param fn - Function to transform value A to value B
 * @returns A function that transforms Node<A> to Node<B>
 */
export const map = <A, B>(fn: (a: A) => B, chain) => (node: Node<A>): Node<B> =>
  createNode(fn, [node], chain);

/**
 * Apply a function with multiple arguments to multiple nodes
 * @param fn - Function to apply
 * @param nodes - Array of nodes providing arguments
 * @returns New node that applies the function to resolved dependencies
 */
export const apply = <T>(
  fn: (...args: any[]) => T,
  nodes: readonly Node<any>[],
  chain?: any,
  graphId?: string
): Node<T> => createNode(fn, nodes, chain, graphId);

/**
 * Create a constant node (no dependencies)
 * @param value - The constant value
 * @returns Node that always returns the constant value
 */
export const constant = <T>(value: T): Node<T> => 
  createNode(value, [], {});

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