import { Node, run } from './graph';
import { Graph, RefNode, Edge, NodysseusNode, ValueNode } from './nodysseus/types';
import { NodysseusRuntime } from './nodysseus/runtime-core';

/**
 * Convert a functional graph Node to Nodysseus Graph
 * 
 * This converter transforms the functional graph system from graph.ts
 * into the Nodysseus graph format, preserving the computational structure
 * and dependencies while integrating with the Nodysseus runtime system.
 */
export const convertGraphToNodysseus = <T>(rootNode: Node<T>, graphId?: string): Graph => {
  const visitedNodes = new Map<string, NodysseusNode>();
  const edges: Record<string, Edge> = {};
  
  const convertNode = (node: Node<any>): string => {
    if (visitedNodes.has(node.id)) {
      return node.id;
    }

    // Convert dependencies first (depth-first traversal)
    const dependencyIds = node.dependencies.map(dep => convertNode(dep));

    let nodysseusNode: NodysseusNode;

    // Handle different value types
    if (typeof node.value === 'function') {
      // Function value: create RefNode for executable function
      nodysseusNode = {
        id: node.id,
        ref: "@graph.executable",
        value: node.value // Store the actual function
      } as RefNode;
    } else if (typeof node.value === 'object' && node.value !== null && 'ref' in node.value) {
      // RefNode value: use it directly with the node's ID
      const refNodeValue = node.value as RefNode;
      nodysseusNode = {
        id: node.id,
        ref: refNodeValue.ref,
        value: refNodeValue.value
      } as RefNode;
    } else {
      // Constant value: create ValueNode
      nodysseusNode = {
        id: node.id,
        value: node.value
      } as ValueNode;
    }

    visitedNodes.set(node.id, nodysseusNode);

    // Create edges for dependencies - edge.as represents argument position
    dependencyIds.forEach((depId, index) => {
      const edgeId = `${depId}->${node.id}`;
      edges[edgeId] = {
        from: depId,
        to: node.id,
        as: `arg${index}` // Maps to function parameter position
      };
    });

    return node.id;
  };

  // Start conversion from root node
  const rootId = convertNode(rootNode);

  // Build the complete Graph structure
  return {
    id: rootNode.graphId || graphId || `functional-graph-${Date.now()}`,
    out: rootId, // Root node is the graph output
    nodes: Object.fromEntries(visitedNodes),
    edges,
    edges_in: buildEdgesIn(edges)
  };
};

/**
 * Build the edges_in structure for efficient dependency lookup
 * Maps each node to its incoming edges organized by source node
 */
const buildEdgesIn = (edges: Record<string, Edge>): Record<string, Record<string, Edge>> => {
  const edgesIn: Record<string, Record<string, Edge>> = {};
  
  Object.values(edges).forEach(edge => {
    if (!edgesIn[edge.to]) {
      edgesIn[edge.to] = {};
    }
    edgesIn[edge.to][edge.from] = edge;
  });
  
  return edgesIn;
};

/**
 * Convert multiple nodes to a single graph with multiple outputs
 * Useful for converting related nodes that should be grouped together
 */
export const convertMultipleNodesToGraph = (nodes: Node<any>[]): Graph => {
  const visitedNodes = new Map<string, NodysseusNode>();
  const edges: Record<string, Edge> = {};
  const outputIds: string[] = [];

  const convertNode = (node: Node<any>): string => {
    if (visitedNodes.has(node.id)) {
      return node.id;
    }

    const dependencyIds = node.dependencies.map(dep => convertNode(dep));

    const refNode: RefNode = {
      id: node.id,
      ref: "@graph.functional",
      value: typeof node.value === 'function' ? node.value.toString() : String(node.value)
    };

    visitedNodes.set(node.id, refNode);

    dependencyIds.forEach((depId, index) => {
      const edgeId = `${depId}->${node.id}`;
      edges[edgeId] = {
        from: depId,
        to: node.id,
        as: `arg${index}`
      };
    });

    return node.id;
  };

  // Convert all nodes
  nodes.forEach(node => {
    outputIds.push(convertNode(node));
  });

  return {
    id: `multi-functional-graph-${Date.now()}`,
    out: outputIds[0], // Use first node as primary output
    nodes: Object.fromEntries(visitedNodes),
    edges,
    edges_in: buildEdgesIn(edges),
    description: `Converted graph with ${nodes.length} output nodes`
  };
};

/**
 * Extract all unique nodes from a functional graph
 * Performs a depth-first traversal to collect all nodes
 */
export const extractAllNodes = <T>(rootNode: Node<T>): Node<any>[] => {
  const visited = new Set<string>();
  const nodes: Node<any>[] = [];

  const traverse = (node: Node<any>) => {
    if (visited.has(node.id)) return;
    
    visited.add(node.id);
    nodes.push(node);
    
    node.dependencies.forEach(dep => traverse(dep));
  };

  traverse(rootNode);
  return nodes;
};

/**
 * Convert functional graph to Nodysseus and compare outputs
 * Uses the new @graph.executable node type and validates execution equivalence
 */
export const convertAndCompareGraphOutputs = <T>(rootNode: Node<T>): {
  originalOutput: T;
  nodysseusOutput: any;
  outputsMatch: boolean;
  convertedGraph: Graph;
} => {
  // Get original output
  const originalOutput = run(rootNode);
  
  // Convert to Nodysseus graph using @graph.executable nodes
  const convertedGraph = convertGraphToNodysseus(rootNode);
  
  // Create runtime and execute Nodysseus graph
  const runtime = new NodysseusRuntime();
  let nodysseusOutput: any;
  let outputsMatch = false;
  
  try {
    // Use runGraphNode to execute the converted graph directly
    nodysseusOutput = runtime.runGraphNode(convertedGraph, convertedGraph.out!);
    
    // Note: The runtime may return complex node structures instead of computed values
    // This is expected behavior for the current Nodysseus runtime implementation
    
    // Compare outputs with deep equality for objects/arrays
    if (typeof originalOutput === 'object' && originalOutput !== null) {
      outputsMatch = JSON.stringify(originalOutput) === JSON.stringify(nodysseusOutput);
    } else {
      outputsMatch = originalOutput === nodysseusOutput;
    }
  } catch (error) {
    console.error('Error running Nodysseus graph:', error);
    nodysseusOutput = undefined;
    outputsMatch = false;
  }
  
  return {
    originalOutput,
    nodysseusOutput,
    outputsMatch,
    convertedGraph
  };
};