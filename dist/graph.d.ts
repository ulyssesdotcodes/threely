import { PrettyPrintOptions } from './graph-pretty-printer';
/**
 * Type representing a Node in the graph.
 *
 * @template T - The type of value this node computes
 */
export type Node<T> = {
    readonly id: string;
    readonly compute: (...args: any[]) => T;
    readonly dependencies: readonly Node<any>[];
};
/**
 * Type definition for a curried function (kept for backward compatibility)
 */
export type CurriedFunction<T> = (...args: any[]) => CurriedFunction<T> | T;
/**
 * Create a new node with the given compute function and dependencies
 */
export declare const createNode: <T>(compute: (...args: any[]) => T, dependencies?: readonly Node<any>[]) => Node<T>;
/**
 * Execute a node and return its computed value
 * @param node - The node to execute
 * @returns The computed value
 */
export declare const run: <T>(node: Node<T>) => T;
/**
 * The map function with type (A => B) => Node<A> => Node<B>
 *
 * @param fn - Function to transform value A to value B
 * @returns A function that transforms Node<A> to Node<B>
 */
export declare const map: <A, B>(fn: (a: A) => B) => (node: Node<A>) => Node<B>;
/**
 * Apply a function with multiple arguments to multiple nodes
 * @param fn - Function to apply
 * @param nodes - Array of nodes providing arguments
 * @returns New node that applies the function to resolved dependencies
 */
export declare const apply: <T>(fn: (...args: any[]) => T, nodes: readonly Node<any>[]) => Node<T>;
/**
 * Create a constant node (no dependencies)
 * @param value - The constant value
 * @returns Node that always returns the constant value
 */
export declare const constant: <T>(value: T) => Node<T>;
/**
 * Compose two nodes: f(g(x))
 * @param f - Outer function node
 * @param g - Inner function node
 * @returns Composed node
 */
export declare const compose: <A, B, C>(f: (b: B) => C, g: (a: A) => B) => (node: Node<A>) => Node<C>;
/**
 * Pretty print a node and its dependencies
 */
export declare const prettyPrint: (node: Node<any>, options?: PrettyPrintOptions) => string;
/**
 * Create a compact representation of a node
 */
export declare const compact: (node: Node<any>, options?: PrettyPrintOptions) => string;
export declare class Graph {
    static run: <T>(node: Node<T>) => T;
    static prettyPrint: (node: Node<any>, options?: PrettyPrintOptions) => string;
    static compact: (node: Node<any>, options?: PrettyPrintOptions) => string;
}
export { Graph as DefaultGraph };
