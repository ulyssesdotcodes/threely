import { Node } from './graph';
import { Graph } from './nodysseus/types';
/**
 * Convert a functional graph Node to Nodysseus Graph
 *
 * This converter transforms the functional graph system from graph.ts
 * into the Nodysseus graph format, preserving the computational structure
 * and dependencies while integrating with the Nodysseus runtime system.
 */
export declare const convertGraphToNodysseus: <T>(rootNode: Node<T>) => Graph;
/**
 * Convert multiple nodes to a single graph with multiple outputs
 * Useful for converting related nodes that should be grouped together
 */
export declare const convertMultipleNodesToGraph: (nodes: Node<any>[]) => Graph;
/**
 * Extract all unique nodes from a functional graph
 * Performs a depth-first traversal to collect all nodes
 */
export declare const extractAllNodes: <T>(rootNode: Node<T>) => Node<any>[];
/**
 * Convert functional graph to Nodysseus and compare outputs
 * Uses the new @graph.executable node type and validates execution equivalence
 */
export declare const convertAndCompareGraphOutputs: <T>(rootNode: Node<T>) => {
    originalOutput: T;
    nodysseusOutput: any;
    outputsMatch: boolean;
    convertedGraph: Graph;
};
