import { setScene, executeDSL, clearAll } from '../src/dsl';
import * as THREE from 'three';

describe('Test Final Fix', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    setScene(scene);
    clearAll();
  });

  it('should work with chained transformations', () => {
    const result = executeDSL('mesh(sphere(), material()).translateX(1).render("testSphere")');
    
    expect(result).toBeInstanceOf(THREE.Mesh);
    expect(result!.position.x).toBe(1);
    expect(scene.children).toHaveLength(1);
  });

  it('should work with multiple chained transformations', () => {
    const result = executeDSL('mesh(sphere(), material()).translateX(2).translateY(3).rotateZ(1.5).render("testSphere")');
    
    expect(result).toBeInstanceOf(THREE.Mesh);
    expect(result!.position.x).toBe(2);
    expect(result!.position.y).toBe(3);
    expect(result!.rotation.z).toBe(1.5);
  });

  it('should work with all the example code patterns', () => {
    // Test the patterns from codemirror.ts
    const results = [
      executeDSL('mesh(sphere(), material()).translateX(1).rotateY(45).render("mySphere")'),
      executeDSL('mesh(box(2, 1, 1), material({color: 0xff0000})).translateX(-3).render("redBox")'),
      executeDSL('mesh(cylinder(), material({color: 0x0000ff, wireframe: true})).translateX(3).render("blueCylinder")')
    ];

    results.forEach(result => {
      expect(result).toBeInstanceOf(THREE.Mesh);
    });
    
    expect(scene.children).toHaveLength(3);
  });
});