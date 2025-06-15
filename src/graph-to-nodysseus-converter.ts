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
export const convertGraphToNodysseus = <T>(rootNode: Node<T>): Graph => {
  const visitedNodes = new Map<string, NodysseusNode>();
  const edges: Record<string, Edge> = {};
  
  const convertNode = (node: Node<any>): string => {
    if (visitedNodes.has(node.id)) {
      return node.id;
    }

    // Convert dependencies first (depth-first traversal)
    const dependencyIds = node.dependencies.map(dep => convertNode(dep));

    // Create RefNode for executable function with actual function as value
    const refNode: RefNode = {
      id: node.id,
      ref: "@graph.executable",
      value: node.compute // Store the actual function, not just its string representation
    };

    visitedNodes.set(node.id, refNode);

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
    id: `functional-graph-${Date.now()}`,
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
      value: node.compute.toString()
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

// ===== VALUE-BASED CONVERSION APPROACH =====

export type ConversionOptions = {
  graphName?: string;
  graphDescription?: string;
  includeEdgesIn?: boolean;
};

/**
 * Convert a functional graph to Nodysseus Graph using value-based approach
 * Executes nodes and stores results as ValueNodes for data visualization
 */
export const convertGraphToNodysseusValues = (
  rootNode: Node<any>, 
  options: ConversionOptions = {}
): Graph => {
  // 1. Traverse the graph to collect all nodes in execution order
  const allNodes = traverseGraphNodesInOrder(rootNode);
  
  // 2. Convert each node to a ValueNode by executing it
  const valueNodes = allNodes.map(convertNodeToValue);
  
  // 3. Create edges from dependencies
  const edges = createEdgesFromDependencies(allNodes);
  
  // 4. Assemble the complete Nodysseus Graph
  return assembleValueBasedGraph(valueNodes, edges, options);
};

const traverseGraphNodesInOrder = (rootNode: Node<any>): Node<any>[] => {
  const visited = new Set<string>();
  const nodes: { node: Node<any>; order: number }[] = [];
  let order = 0;

  const traverse = (node: Node<any>): void => {
    if (visited.has(node.id)) {
      return;
    }
    
    visited.add(node.id);
    
    // Traverse dependencies first (DFS)
    for (const dep of node.dependencies) {
      traverse(dep);
    }
    
    // Add current node after dependencies
    nodes.push({ node, order: order++ });
  };

  traverse(rootNode);
  
  // Return nodes sorted by execution order
  return nodes
    .sort((a, b) => a.order - b.order)
    .map(item => item.node);
};

const inferNodeName = (node: Node<any>): string => {
  const funcStr = node.compute.toString();
  
  // Try to extract meaningful name from function
  if (funcStr.includes('return') && funcStr.length < 100) {
    const returnMatch = funcStr.match(/return\s+(.+?)[;\}]/);
    if (returnMatch) {
      return returnMatch[1].trim().substring(0, 20);
    }
  }
  
  // Fallback to function signature
  const firstLine = funcStr.split('\n')[0];
  if (firstLine.length < 30) {
    return firstLine;
  }
  
  return `node_${node.id}`;
};

const convertNodeToValue = (node: Node<any>): ValueNode => {
  try {
    const computedValue = run(node);
    const serializedValue = typeof computedValue === 'object' 
      ? JSON.stringify(computedValue) 
      : String(computedValue);
    
    return {
      id: node.id,
      value: serializedValue,
      name: inferNodeName(node),
      category: 'computed'
    };
  } catch (error) {
    return {
      id: node.id,
      value: `Error: ${error}`,
      name: inferNodeName(node),
      category: 'error'
    };
  }
};

const createEdgesFromDependencies = (nodes: Node<any>[]): Record<string, Edge> => {
  const edges: Record<string, Edge> = {};
  
  for (const node of nodes) {
    node.dependencies.forEach((dep, index) => {
      const edgeId = `${dep.id}_to_${node.id}_${index}`;
      edges[edgeId] = {
        from: dep.id,
        to: node.id,
        as: `dep_${index}`
      };
    });
  }
  
  return edges;
};

const createValueBasedEdgesIn = (edges: Record<string, Edge>): Record<string, Record<string, Edge>> => {
  const edgesIn: Record<string, Record<string, Edge>> = {};
  
  for (const [edgeId, edge] of Object.entries(edges)) {
    if (!edgesIn[edge.to]) {
      edgesIn[edge.to] = {};
    }
    edgesIn[edge.to][edgeId] = edge;
  }
  
  return edgesIn;
};

let valueGraphIdCounter = 0;
const generateValueGraphId = (): string => `value_graph_${++valueGraphIdCounter}`;

const assembleValueBasedGraph = (
  valueNodes: ValueNode[], 
  edges: Record<string, Edge>,
  options: ConversionOptions = {}
): Graph => {
  const nodes: Record<string, ValueNode> = {};
  valueNodes.forEach(node => {
    nodes[node.id] = node;
  });

  const graph: Graph = {
    id: generateValueGraphId(),
    name: options.graphName,
    description: options.graphDescription,
    nodes,
    edges,
    out: valueNodes[valueNodes.length - 1]?.id // Last node is usually the root
  };

  if (options.includeEdgesIn !== false) {
    graph.edges_in = createValueBasedEdgesIn(edges);
  }

  return graph;
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
    // Get the bound node and run it with "value" output type
    const boundNode = runtime.fromNode(convertedGraph, convertedGraph.out!);
    nodysseusOutput = runtime.run(boundNode);
    
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