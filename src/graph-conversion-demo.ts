import { createNode, constant, apply, Graph } from "./graph";
import {
  convertGraphToNodysseus,
  extractAllNodes,
} from "./graph-to-nodysseus-converter";
import { isNodeRef } from "./nodysseus/types";

/**
 * Demo script showing how to convert functional graphs to Nodysseus format
 *
 * This demonstrates:
 * 1. Creating a functional graph with dependencies
 * 2. Converting it to Nodysseus format
 * 3. Inspecting the resulting structure
 */

// Create a simple functional graph: add(mul(2, 3), 5)
const num2 = constant(2);
const num3 = constant(3);
const num5 = constant(5);

const multiply = apply((a: number, b: number) => a * b, [num2, num3]);
const add = apply((a: number, b: number) => a + b, [multiply, num5]);

// Execute original functional graph
console.log("Original functional graph result:", Graph.run(add)); // Should be 11

// Convert to Nodysseus format
const nodysseusGraph = convertGraphToNodysseus(add);

console.log("\n=== Converted Nodysseus Graph ===");
console.log("Graph ID:", nodysseusGraph.id);
console.log("Output node:", nodysseusGraph.out);
console.log("Total nodes:", Object.keys(nodysseusGraph.nodes).length);
console.log("Total edges:", Object.keys(nodysseusGraph.edges).length);

console.log("\n=== Nodes ===");
Object.entries(nodysseusGraph.nodes).forEach(([id, node]) => {
  const ref = isNodeRef(node) ? node.ref : "N/A";
  const value = node.value?.toString().substring(0, 50) || "undefined";
  console.log(`${id}: ref="${ref}" value="${value}..."`);
});

console.log("\n=== Edges ===");
Object.entries(nodysseusGraph.edges).forEach(([id, edge]) => {
  console.log(`${id}: ${edge.from} -> ${edge.to} (as: ${edge.as})`);
});

console.log("\n=== Edges In Structure ===");
Object.entries(nodysseusGraph.edges_in || {}).forEach(
  ([nodeId, incomingEdges]) => {
    console.log(`${nodeId} <- [${Object.keys(incomingEdges).join(", ")}]`);
  },
);

// Verify all nodes were captured
const allNodes = extractAllNodes(add);
console.log("\n=== Node Extraction Verification ===");
console.log("Original graph nodes:", allNodes.length);
console.log("Converted graph nodes:", Object.keys(nodysseusGraph.nodes).length);
console.log(
  "All nodes captured:",
  allNodes.length === Object.keys(nodysseusGraph.nodes).length,
);

// Show the dependency structure
console.log("\n=== Dependency Analysis ===");
allNodes.forEach((node) => {
  const deps = node.dependencies.length;
  const type = deps === 0 ? "leaf" : deps === 1 ? "transform" : "combinator";
  console.log(`${node.id}: ${type} (${deps} dependencies)`);
});

export { nodysseusGraph, add };
