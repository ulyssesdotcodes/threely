// graph.ts - Implementation of a functional node-based graph system with TypeScript
import { GraphPrettyPrinter, PrettyPrintOptions } from './graph-pretty-printer';

  /**
   * Interface representing a Node in the graph.
   *
   * @template T - The type of value this node computes
   */
  export interface Node<T> {
    id: string;
    compute: (...args: any[]) => T;
    dependencies: Node<any>[];
  }

  /**
   * Type definition for a curried function (kept for backward compatibility)
   */
  export type CurriedFunction<T> = (...args: any[]) => CurriedFunction<T> | T;

  let nodeIdCounter = 0;

  /**
   * Generate a unique ID for nodes
   */
  function generateUniqueId(): string {
    return `node-${++nodeIdCounter}`;
  }

  /**
   * The map function with type (A => B) => Node<A> => Node<B>
   * 
   * @param fn - Function to transform value A to value B
   * @returns A function that transforms Node<A> to Node<B>
   */
  export function map<A, B>(fn: (a: A) => B): (node: Node<A>) => Node<B> {
    return (node: Node<A>) => ({
      id: generateUniqueId(),
      compute: fn,
      dependencies: [node]
    });
  }


  /**
   * Simplified Graph class for functional execution
   */
  export class Graph {
    /**
     * Execute a node and return its computed value
     * @param node - The node to execute
     * @returns The computed value
     */
    static run<T>(node: Node<T>): T {
      // Resolve all dependencies first
      const dependencyResults = node.dependencies.map(dep => Graph.run(dep));
      
      // Call the compute function with all dependency results as arguments
      return node.compute(...dependencyResults);
    }

    /**
     * Pretty print a node and its dependencies
     */
    static prettyPrint(node: Node<any>, options?: PrettyPrintOptions): string {
      const printer = new GraphPrettyPrinter(options);
      return printer.print(node);
    }

    /**
     * Create a compact representation of a node
     */
    static compact(node: Node<any>, options?: PrettyPrintOptions): string {
      const printer = new GraphPrettyPrinter(options);
      return printer.compact(node);
    }
  }

  // Export for backward compatibility
  export { Graph as DefaultGraph };