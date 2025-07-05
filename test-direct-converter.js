// Test the direct converter to see what it generates
import { generateUUIDTags, clearFunctionCallRegistry } from './src/uuid-tagging.ts';
import { DirectASTToNodysseusConverter } from './src/dsl/direct-ast-to-nodysseus-converter.ts';

const testCode = `render(mesh(sphere(), material()), "test")`;

// Mock DSL context for testing
const mockDslContext = {
  sphere: () => ({ type: 'sphere' }),
  material: () => ({ type: 'material' }),
  mesh: (geom, mat) => ({ type: 'mesh', geometry: geom, material: mat }),
  render: (obj, name) => ({ type: 'render', object: obj, name })
};

console.log('=== Testing Direct Converter ===');
console.log('Code:', testCode);

try {
  // Clear registry and generate UUIDs 
  clearFunctionCallRegistry();
  generateUUIDTags(testCode);
  
  const converter = new DirectASTToNodysseusConverter();
  const result = converter.convert(testCode, mockDslContext);
  
  console.log('\n=== Conversion Results ===');
  console.log('Root node ID:', result.rootNodeId);
  console.log('Total nodes:', Object.keys(result.graph.nodes).length);
  console.log('Total edges:', Object.keys(result.graph.edges).length);
  
  console.log('\n=== Node Details ===');
  for (const [nodeId, node] of Object.entries(result.graph.nodes)) {
    console.log(`${nodeId}:`, {
      id: node.id,
      type: node.hasOwnProperty('ref') ? 'RefNode' : 'ValueNode',
      ref: node.ref || 'N/A',
      value: typeof node.value === 'function' ? '[Function]' : JSON.stringify(node.value),
      uuid: node.uuid || 'N/A'
    });
  }
  
  console.log('\n=== Edge Details ===');
  for (const [edgeId, edge] of Object.entries(result.graph.edges)) {
    console.log(`${edgeId}: ${edge.from} -> ${edge.to} (as: ${edge.as})`);
  }
  
  console.log('\n=== Edges In (Reverse Lookup) ===');
  for (const [nodeId, edges] of Object.entries(result.graph.edges_in)) {
    console.log(`${nodeId} receives from:`, Object.keys(edges));
  }
  
  console.log('\n=== Conversion Log ===');
  result.conversionLog.forEach((entry, index) => {
    console.log(`${index + 1}. ${entry.astNodeType} (${entry.position.from}-${entry.position.to}) -> ${entry.nodysseusNodeType} (${entry.nodysseusNodeId})`);
    if (entry.functionResolved) console.log(`   Function: ${entry.functionResolved}`);
    if (entry.uuid) console.log(`   UUID: ${entry.uuid}`);
  });
  
} catch (error) {
  console.error('Conversion error:', error);
  console.error('Stack:', error.stack);
}