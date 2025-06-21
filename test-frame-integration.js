// Test the frame function integration
import { frame } from './dist/dsl.js';
import { convertGraphToNodysseus } from './dist/graph-to-nodysseus-converter.js';
import { NodysseusRuntime } from './dist/nodysseus/runtime-core.js';

console.log('Testing frame function integration...');

try {
  // Create frame node
  const frameNode = frame();
  console.log('✓ Frame node created:', frameNode.id);
  console.log('✓ Frame node value type:', typeof frameNode.value);
  console.log('✓ Frame node value:', frameNode.value);
  
  // Convert to Nodysseus
  const nodysseusGraph = convertGraphToNodysseus(frameNode);
  console.log('✓ Converted to Nodysseus graph:', nodysseusGraph.id);
  console.log('✓ Graph nodes:', Object.keys(nodysseusGraph.nodes));
  
  // Check the converted node
  const convertedNode = nodysseusGraph.nodes[frameNode.id];
  console.log('✓ Converted node ref:', convertedNode.ref);
  
  // Run with Nodysseus runtime
  const runtime = new NodysseusRuntime();
  const result = runtime.runGraphNode(nodysseusGraph, frameNode.id);
  console.log('✓ Runtime execution result:', result);
  console.log('✓ Frame value:', result.value.read());
  
} catch (error) {
  console.error('✗ Error:', error);
}