// Debug execution for sphere render
const { executeDSL, setScene } = require('./src/dsl');
const THREE = require('three');

// Create a scene
const scene = new THREE.Scene();
setScene(scene);

// Test code
const code = `render(mesh(sphere(1), material({color: 0xff0000})), "test-sphere")`;

console.log('🚀 Testing DSL execution...');
console.log('Code:', code);

// Execute the DSL
const result = executeDSL(code);

console.log('\n📊 Execution results:');
console.log('Result type:', typeof result);
console.log('Result constructor:', result?.constructor?.name);
console.log('Is THREE.Object3D?', result instanceof THREE.Object3D);
console.log('Result:', result);

if (result instanceof THREE.Object3D) {
  console.log('\n✅ Success! Created Object3D:');
  console.log('- Position:', result.position);
  console.log('- Rotation:', result.rotation);
  console.log('- Scale:', result.scale);
  if (result instanceof THREE.Mesh) {
    console.log('- Geometry:', result.geometry?.constructor?.name);
    console.log('- Material:', result.material?.constructor?.name);
  }
} else {
  console.log('\n❌ Failed to create Object3D');
}