// Trace DSL execution to understand graph structure
import { executeDSL, setScene, clearAll } from './src/dsl/index.ts';
import { Graph } from './src/graph.ts';
import * as THREE from 'three';

// Mock console.log to capture conversion logs
const originalLog = console.log;
const logs = [];
console.log = (...args) => {
  logs.push(args.join(' '));
  originalLog(...args);
};

// Set up scene
const scene = new THREE.Scene();
setScene(scene);
clearAll();

console.log('=== EXECUTING EXAMPLE DSL ===');
const dslCode = 'mesh(sphere(), material()).translateX(1).rotateY(45).render("mySphere")';
console.log('DSL Code:', dslCode);

const result = executeDSL(dslCode);

console.log('=== RESULT ===');
console.log('Result type:', result?.constructor?.name);
if (result) {
  console.log('Position:', result.position);
  console.log('Rotation:', result.rotation);
  console.log('Graph ID:', result.graphId);
}

console.log('=== CAPTURED LOGS ===');
logs.filter(log => log.includes('Converting') || log.includes('node') || log.includes('graph')).forEach(log => {
  console.log(log);
});