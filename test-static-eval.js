// Quick test of static evaluation
const { executeDSL } = require('./src/dsl/parser.ts');
const { setScene } = require('./src/dsl/object3d-chain.ts');
const THREE = require('three');

// Set up a scene
const scene = new THREE.Scene();
setScene(scene);

// Test the main example
const code = 'mesh(sphere(), material()).translateX(1).rotateY(45).render("mySphere")';
console.log('Testing code:', code);

try {
  const result = executeDSL(code);
  console.log('Result type:', typeof result);
  console.log('Result:', result);
  console.log('Is THREE.Object3D?', result instanceof THREE.Object3D);
} catch (error) {
  console.error('Error:', error);
}