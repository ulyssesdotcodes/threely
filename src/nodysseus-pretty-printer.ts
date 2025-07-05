// nodysseus-pretty-printer.ts - Pretty printing functionality for Nodysseus graph visualization
import {
  Graph,
  NodysseusNode,
  Edge,
  RefNode,
  ValueNode,
  GraphNode,
  isNodeRef,
  isNodeValue,
  isNodeGraph,
} from "./nodysseus/types";

/**
 * Options for pretty printing Nodysseus graphs
 */
export type NodysseusPrettyPrintOptions = {
  /** Show node IDs in the output */
  readonly showIds?: boolean;
  /** Maximum depth to traverse (prevents infinite loops) */
  readonly maxDepth?: number;
  /** Custom node label function */
  readonly nodeLabel?: (node: NodysseusNode) => string;
  /** Show edge information */
  readonly showEdges?: boolean;
  /** Show node types */
  readonly showTypes?: boolean;
};

/**
 * Pretty printer for Nodysseus graph visualization
 */
export class NodysseusPrettyPrinter {
  private visited = new Set<string>();
  private options: Required<NodysseusPrettyPrintOptions>;

  constructor(options: NodysseusPrettyPrintOptions = {}) {
    this.options = {
      showIds: options.showIds ?? true,
      maxDepth: options.maxDepth ?? 10,
      nodeLabel: options.nodeLabel ?? this.defaultNodeLabel.bind(this),
      showEdges: options.showEdges ?? true,
      showTypes: options.showTypes ?? true,
    };
  }

  /**
   * Default node label generator
   */
  private defaultNodeLabel(node: NodysseusNode): string {
    if (isNodeRef(node)) {
      // Handle external references
      if (node.ref === "extern.frame") return "frame";
      if (node.ref === "@graph.executable") return "exec";
      if (node.ref === "@graph.functional") return "func";

      // Try to extract meaningful info from function values
      if (typeof node.value === "function") {
        const functionStr = node.value.toString();
        if (functionStr.includes("SphereGeometry")) return "sphere";
        if (functionStr.includes("BoxGeometry")) return "box";
        if (functionStr.includes("CylinderGeometry")) return "cylinder";
        if (functionStr.includes("MeshBasicMaterial")) return "material";
        if (functionStr.includes("THREE.Mesh")) return "mesh";
        if (functionStr.includes("translateX")) return "translateX";
        if (functionStr.includes("translateY")) return "translateY";
        if (functionStr.includes("translateZ")) return "translateZ";
        if (functionStr.includes("rotateX")) return "rotateX";
        if (functionStr.includes("rotateY")) return "rotateY";
        if (functionStr.includes("rotateZ")) return "rotateZ";
        if (functionStr.includes("scale")) return "scale";
        return "function";
      }

      return node.ref;
    }

    if (isNodeValue(node)) {
      const value = node.value;
      if (typeof value === "string") {
        return value.length > 20
          ? `"${value.substring(0, 17)}..."`
          : `"${value}"`;
      }
      return value || "value";
    }

    if (isNodeGraph(node)) {
      return "subgraph";
    }

    return "unknown";
  }

  /**
   * Get node type string
   */
  private getNodeType(node: NodysseusNode): string {
    if (isNodeRef(node)) return "RefNode";
    if (isNodeValue(node)) return "ValueNode";
    if (isNodeGraph(node)) return "GraphNode";
    return "Unknown";
  }

  /**
   * Pretty print a Nodysseus graph starting from the output node
   */
  print(graph: Graph): string {
    this.visited.clear();

    const lines: string[] = [];
    lines.push(`Graph: ${graph.id}`);
    if (graph.name) lines.push(`Name: ${graph.name}`);
    if (graph.description) lines.push(`Description: ${graph.description}`);

    const nodeCount = Object.keys(graph.nodes).length;
    const edgeCount = Object.keys(graph.edges).length;
    lines.push(`Nodes: ${nodeCount}, Edges: ${edgeCount}`);

    if (graph.out) {
      lines.push("");
      lines.push("Output:");
      lines.push(this.printNode(graph, graph.out, "", 0));
    } else {
      lines.push("");
      lines.push("All Nodes:");
      Object.keys(graph.nodes).forEach((nodeId) => {
        lines.push(this.printNode(graph, nodeId, "", 0));
      });
    }

    return lines.join("\n");
  }

  /**
   * Print a compact representation of the graph
   */
  compact(graph: Graph): string {
    if (!graph.out) return `Graph(${Object.keys(graph.nodes).length} nodes)`;

    this.visited.clear();
    return this.compactNode(graph, graph.out);
  }

  /**
   * Recursively print a node and its dependencies
   */
  private printNode(
    graph: Graph,
    nodeId: string,
    prefix: string,
    depth: number,
  ): string {
    if (depth > this.options.maxDepth) {
      return `${prefix}... (max depth reached)`;
    }

    const node = graph.nodes[nodeId];
    if (!node) {
      return `${prefix}[MISSING NODE: ${nodeId}]`;
    }

    if (this.visited.has(nodeId)) {
      return `${prefix}↪ ${this.formatNodeHeader(node)} (circular)`;
    }

    this.visited.add(nodeId);

    const lines: string[] = [];
    lines.push(`${prefix}${this.formatNodeHeader(node)}`);

    // Show incoming edges if enabled
    if (this.options.showEdges && graph.edges_in?.[nodeId]) {
      const edgesIn = Object.values(graph.edges_in[nodeId]);
      edgesIn.forEach((edge, index) => {
        const isLast = index === edgesIn.length - 1;
        const childPrefix = prefix + (isLast ? "└─ " : "├─ ");
        const nextPrefix = prefix + (isLast ? "   " : "│  ");

        lines.push(`${prefix}${isLast ? "└─" : "├─"} ${edge.as}:`);
        lines.push(this.printNode(graph, edge.from, nextPrefix, depth + 1));
      });
    }

    return lines.join("\n");
  }

  /**
   * Generate compact representation of a node
   */
  private compactNode(graph: Graph, nodeId: string): string {
    const node = graph.nodes[nodeId];
    if (!node) return `[MISSING:${nodeId}]`;

    if (this.visited.has(nodeId)) {
      return `[↪${this.options.nodeLabel(node)}]`;
    }

    this.visited.add(nodeId);

    const label = this.options.nodeLabel(node);

    // If no dependencies, return just the label
    const edgesIn = graph.edges_in?.[nodeId];
    if (!edgesIn || Object.keys(edgesIn).length === 0) {
      return label;
    }

    // Build compact representation with dependencies
    const deps = Object.values(edgesIn)
      .sort((a, b) => a.as.localeCompare(b.as))
      .map((edge) => this.compactNode(graph, edge.from));

    return `${label}(${deps.join(", ")})`;
  }

  /**
   * Format the node header with ID, type, and label
   */
  private formatNodeHeader(node: NodysseusNode): string {
    const parts: string[] = [];

    if (this.options.showIds) {
      parts.push(`[${node.id}]`);
    }

    if (this.options.showTypes) {
      parts.push(`(${this.getNodeType(node)})`);
    }

    parts.push(this.options.nodeLabel(node));

    if (node.name && node.name !== node.id) {
      parts.push(`"${node.name}"`);
    }

    return parts.join(" ");
  }
}

/**
 * Pretty print a Nodysseus graph with default options
 */
export const prettyPrint = (
  graph: Graph,
  options?: NodysseusPrettyPrintOptions,
): string => {
  return new NodysseusPrettyPrinter(options).print(graph);
};

/**
 * Generate a compact representation of a Nodysseus graph
 */
export const compact = (
  graph: Graph,
  options?: NodysseusPrettyPrintOptions,
): string => {
  return new NodysseusPrettyPrinter(options).compact(graph);
};

// Note: Graph extension methods can be added separately if needed
