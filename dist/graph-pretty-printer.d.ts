import { Node } from './graph';
/**
 * Options for pretty printing the graph
 */
export type PrettyPrintOptions = {
    /** Show node IDs in the output */
    readonly showIds?: boolean;
    /** Maximum depth to traverse (prevents infinite loops) */
    readonly maxDepth?: number;
    /** Custom node label function */
    readonly nodeLabel?: (node: Node<any>) => string;
    /** Include dependency count */
    readonly showDependencyCount?: boolean;
};
/**
 * Pretty printer for graph visualization
 */
export declare class GraphPrettyPrinter {
    private visited;
    private options;
    constructor(options?: PrettyPrintOptions);
    /**
     * Default node label generator
     */
    private defaultNodeLabel;
    /**
     * Pretty print a single node with its dependencies
     */
    print(node: Node<any>, depth?: number): string;
    /**
     * Print multiple nodes as a forest
     */
    printForest(nodes: Node<any>[]): string;
    /**
     * Create a compact one-line representation
     */
    compact(node: Node<any>): string;
}
