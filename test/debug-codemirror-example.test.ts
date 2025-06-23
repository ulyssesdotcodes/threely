import { setScene, clearAll, executeDSL } from '../src/dsl';
import { sphere, box, material, mesh, translateX, rotateY, render } from '../src/dsl';
import { run } from '../src/graph';
import * as THREE from 'three';

describe('Debug CodeMirror First Example', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    setScene(scene);
    clearAll();
  });

  it('should debug the first codemirror example step by step', () => {
    console.log('=== DEBUGGING CODEMIRROR EXAMPLE ===');
    
    // The first example: mesh(sphere(), material()).translateX(1).rotateY(45).render("mySphere")
    
    // Step 1: Create sphere
    console.log('\n--- Step 1: Create sphere ---');
    const sphereNode = sphere();
    console.log('Sphere node:', sphereNode);
    console.log('Sphere value:', run(sphereNode));
    
    // Step 2: Create material  
    console.log('\n--- Step 2: Create material ---');
    const materialNode = material();
    console.log('Material node:', materialNode);
    console.log('Material value type:', typeof run(materialNode));
    console.log('Material has isMaterial:', (run(materialNode) as any).isMaterial);
    
    // Step 3: Create mesh
    console.log('\n--- Step 3: Create mesh ---');
    const meshNode = mesh(sphereNode, materialNode);
    console.log('Mesh node:', meshNode);
    const meshValue = run(meshNode);
    console.log('Mesh value:', meshValue);
    console.log('Mesh geometry:', meshValue.geometry);
    console.log('Mesh userData:', meshValue.userData);
    
    // Step 4: Apply translateX
    console.log('\n--- Step 4: Apply translateX ---');
    const translatedNode = translateX(meshNode, 1);
    console.log('Translated node:', translatedNode);
    const translatedValue = 'id' in translatedNode ? run(translatedNode) : translatedNode;
    console.log('Translated value:', translatedValue);
    console.log('Translated geometry:', translatedValue.geometry);
    console.log('Translated userData:', translatedValue.userData);
    console.log('Translated position:', translatedValue.position);
    
    // Step 5: Apply rotateY
    console.log('\n--- Step 5: Apply rotateY ---');
    const rotatedNode = rotateY(translatedNode, 45);
    console.log('Rotated node:', rotatedNode);
    const rotatedValue = 'id' in rotatedNode ? run(rotatedNode) : rotatedNode;
    console.log('Rotated value:', rotatedValue);
    console.log('Rotated geometry:', rotatedValue.geometry);
    console.log('Rotated userData:', rotatedValue.userData);
    console.log('Rotated position:', rotatedValue.position);
    console.log('Rotated rotation:', rotatedValue.rotation);
    
    // Step 6: Test the full DSL execution
    console.log('\n--- Step 6: Test DSL execution ---');
    const dslResult = executeDSL('mesh(sphere(), material()).translateX(1).rotateY(45).render("mySphere")');
    console.log('DSL result:', dslResult);
    console.log('DSL result type:', dslResult?.constructor.name);
    if (dslResult instanceof THREE.Mesh) {
      console.log('DSL result has geometry:', !!dslResult.geometry);
      console.log('DSL result has material:', !!dslResult.material);
      console.log('DSL result position:', dslResult.position);
      console.log('DSL result rotation:', dslResult.rotation);
    }
  });
});