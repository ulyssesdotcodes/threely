// Test static evaluation
import * as THREE from 'three';
import { executeDSL } from '../src/dsl/parser';
import { setScene } from '../src/dsl/object3d-chain';

describe('Static Evaluation Test', () => {
  beforeEach(() => {
    // Set up a scene
    const scene = new THREE.Scene();
    setScene(scene);
  });

  test('should evaluate static code without frame calls', () => {
    console.log('=== Testing static evaluation ===');
    
    const code = 'mesh(sphere(), material()).translateX(1).rotateY(45).render("mySphere")';
    console.log('Testing code:', code);
    
    const result = executeDSL(code);
    console.log('Result type:', typeof result);
    console.log('Result:', result);
    console.log('Is THREE.Object3D?', result instanceof THREE.Object3D);
    
    // The result should be a THREE.Object3D when using static evaluation
    expect(result).toBeDefined();
    expect(result instanceof THREE.Object3D).toBe(true);
  });
});