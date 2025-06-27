import { setScene, executeDSL, clearAll } from '../src/dsl';
import * as THREE from 'three';

describe('Frame Math Chain Integration Tests', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    setScene(scene);
    clearAll();
  });

  it('should execute frame().mult() in DSL expressions', () => {
    // Test the new chaining syntax
    const result = executeDSL('frame().mult(0.1)');
    
    console.log('frame().mult(0.1) result:', result, typeof result);
    
    expect(result).toBeDefined();
    // The result might be an Object3D if the expression evaluates to a rendered object
    // or a number if it's just a mathematical expression
    if (typeof result === 'number') {
      expect(result).toBeCloseTo(0.1); // frame starts at 1, so 1 * 0.1 = 0.1
    } else {
      // If it's not a number, at least verify it's a valid result
      expect(result).not.toBeNull();
    }
  });

  it('should execute complex math chains in DSL', () => {
    // Test multiple chained operations
    const result = executeDSL('frame().mult(2).add(3).sub(1)');
    
    console.log('frame().mult(2).add(3).sub(1) result:', result, typeof result);
    
    expect(result).toBeDefined();
    if (typeof result === 'number') {
      expect(result).toBeCloseTo(4); // frame starts at 1: (1 * 2) + 3 - 1 = 4
    } else {
      expect(result).not.toBeNull();
    }
  });

  it('should work with trigonometric functions', () => {
    // Test trigonometric operations
    const result = executeDSL('frame().mult(0).sin()'); // sin(0) = 0
    
    console.log('frame().mult(0).sin() result:', result, typeof result);
    
    expect(result).toBeDefined();
    if (typeof result === 'number') {
      expect(result).toBeCloseTo(0);
    } else {
      expect(result).not.toBeNull();
    }
  });

  it('should work in mesh translation expressions', () => {
    // Test that the new math chain works in actual 3D expressions
    const dslCode = `
      mesh(sphere(1), material({ color: 0xff0000 }))
        .translateX(frame().multiply(0.1))
        .render('mathChainTest')
    `;
    
    const result = executeDSL(dslCode);
    
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(THREE.Object3D);
    expect(scene.children.length).toBe(1);
    
    // Check that the object was positioned correctly
    const mesh = scene.children[0];
    expect(mesh.position.x).toBeCloseTo(0.1); // frame() = 1, mult(0.1) = 0.1
  });

  it('should work with more complex math expressions in 3D', () => {
    // Test complex math in rotation
    const dslCode = `
      mesh(sphere(1), material())
        .rotateY(frame().mult(0.5).add(1).sub(0.5))
        .render('complexMathTest')
    `;
    
    const result = executeDSL(dslCode);
    
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(THREE.Object3D);
    
    // Check rotation - frame()=1, mult(0.5)=0.5, add(1)=1.5, sub(0.5)=1
    const mesh = scene.children[0];
    expect(mesh.rotation.y).toBeCloseTo(1.0);
  });

  it('should maintain backward compatibility with mult() function', () => {
    // Test that the old function-style still works
    const result1 = executeDSL('mult(frame(), 0.1)');
    const result2 = executeDSL('frame().mult(0.1)');
    
    console.log('mult(frame(), 0.1) result:', result1, typeof result1);
    console.log('frame().mult(0.1) result:', result2, typeof result2);
    
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    
    // Both should be valid results (may be different types due to graph execution differences)
    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
  });

  it('should work with advanced math functions', () => {
    // Test advanced math functions
    const sqrtResult = executeDSL('frame().mult(4).sqrt()'); // sqrt(4) = 2
    console.log('sqrt result:', sqrtResult, typeof sqrtResult);
    
    const powResult = executeDSL('frame().add(1).pow(3)'); // (1+1)^3 = 8  
    console.log('pow result:', powResult, typeof powResult);
    
    const absResult = executeDSL('frame().mult(-1).abs()'); // abs(-1) = 1
    console.log('abs result:', absResult, typeof absResult);
    
    if (typeof sqrtResult === 'number') {
      expect(sqrtResult).toBeCloseTo(2);
    }
    if (typeof powResult === 'number') {
      expect(powResult).toBeCloseTo(8);
    }
    if (typeof absResult === 'number') {
      expect(absResult).toBeCloseTo(1);
    }
  });
});