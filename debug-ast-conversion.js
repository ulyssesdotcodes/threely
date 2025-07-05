// Debug script to analyze AST to Nodysseus conversion
const { parser } = require("@lezer/javascript");
const { DirectASTToNodysseusConverter } = require('./dist/src/dsl/direct-ast-to-nodysseus-converter.js');

const testCode = `render(mesh(sphere(), material()), "test")`;

console.log('=== AST Analysis ===');
console.log('Code:', testCode);

// Parse with Lezer
const tree = parser.parse(testCode);
console.log('\n=== Lezer AST Structure ===');

function walkAST(node, depth = 0) {
  const indent = '  '.repeat(depth);
  const nodeText = testCode.slice(node.from, node.to);
  console.log(`${indent}${node.name} (${node.from}-${node.to}): "${nodeText}"`);
  
  if (node.firstChild) {
    let child = node.firstChild;
    do {
      walkAST(child, depth + 1);
      child = child.nextSibling;
    } while (child);
  }
}

walkAST(tree.topNode);

console.log('\n=== Expected Nodysseus Structure ===');
console.log('1. sphere() -> RefNode with sphere function (no dependencies)');
console.log('2. material() -> RefNode with material function (no dependencies)');
console.log('3. mesh(sphere(), material()) -> RefNode with mesh function, edges from sphere and material nodes');
console.log('4. "test" -> ValueNode with string value');
console.log('5. render(mesh(...), "test") -> RefNode with render function, edges from mesh and string nodes');

// Mock DSL context for testing
const mockDslContext = {
  sphere: () => ({ type: 'sphere' }),
  material: () => ({ type: 'material' }),
  mesh: (geom, mat) => ({ type: 'mesh', geometry: geom, material: mat }),
  render: (obj, name) => ({ type: 'render', object: obj, name })
};

console.log('\n=== Direct Conversion Test ===');
try {
  const converter = new DirectASTToNodysseusConverter();
  const result = converter.convert(testCode, mockDslContext);
  
  console.log('Root node ID:', result.rootNodeId);
  console.log('Total nodes:', Object.keys(result.graph.nodes).length);
  console.log('Total edges:', Object.keys(result.graph.edges).length);
  
  console.log('\n=== Node Details ===');
  for (const [nodeId, node] of Object.entries(result.graph.nodes)) {
    console.log(`${nodeId}: ${node.id} (${node.ref || 'value'}) - ${JSON.stringify(node.value || 'no value')}`);
  }
  
  console.log('\n=== Edge Details ===');
  for (const [edgeId, edge] of Object.entries(result.graph.edges)) {
    console.log(`${edgeId}: ${edge.from} -> ${edge.to} (as: ${edge.as})`);
  }
  
  console.log('\n=== Conversion Log ===');
  result.conversionLog.forEach(entry => {
    console.log(`${entry.astNodeType} (${entry.position.from}-${entry.position.to}) -> ${entry.nodysseusNodeType} (${entry.nodysseusNodeId})`);
  });
  
} catch (error) {
  console.error('Conversion error:', error);
}