import { setScene, clearAll, sphere, box, material, mesh, translateX } from '../src/dsl';
import { run } from '../src/graph';
import * as THREE from 'three';

describe('Debug Chain System', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    setScene(scene);
    clearAll();
  });

  it('should debug step by step', () => {
    console.log('=== DEBUG CHAIN TEST ===');
    
    // Test the pure function approach
    const meshNode = mesh(sphere(), material());
    console.log('Mesh node value:', run(meshNode));
    
    const transformedNode = translateX(meshNode, 1);
    console.log('Transformed node:', transformedNode);
    console.log('Transformed value:', run(transformedNode));
    console.log('Transformed value type:', typeof run(transformedNode));
  });
});