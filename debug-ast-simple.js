// Simple debug script to analyze AST structure
import { parser } from "@lezer/javascript";

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