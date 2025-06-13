// DSL implementation for Three.js live coding environment
import * as THREE from 'three';
import { Graph, createGraphNodeWrapper } from './graph';
import { 
  translateX, 
  translateY, 
  translateZ, 
  rotateX, 
  rotateY, 
  rotateZ 
} from './three/Object3D';

// Global graph instance for the DSL
export const dslGraph = new Graph<THREE.Object3D>();

// Scene reference for adding rendered objects
let currentScene: THREE.Scene | null = null;

export function setScene(scene: THREE.Scene) {
  currentScene = scene;
}

// Basic geometry creation functions
export function sphere(radius: number = 1, widthSegments: number = 32, heightSegments: number = 16): THREE.SphereGeometry {
  return new THREE.SphereGeometry(radius, widthSegments, heightSegments);
}

export function box(width: number = 1, height: number = 1, depth: number = 1): THREE.BoxGeometry {
  return new THREE.BoxGeometry(width, height, depth);
}

export function cylinder(radiusTop: number = 1, radiusBottom: number = 1, height: number = 1): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(radiusTop, radiusBottom, height);
}

// Basic material creation function
export function material(options: any = {}): THREE.MeshBasicMaterial {
  const defaultOptions = {
    color: 0x00ff00,
    wireframe: false
  };
  return new THREE.MeshBasicMaterial({ ...defaultOptions, ...options });
}

// Mesh creation function
export function mesh(geometry: THREE.BufferGeometry, materialObj: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(geometry, materialObj);
}

// Chainable wrapper for Three.js objects
export interface ChainableThreeObject {
  object: THREE.Object3D;
  translateX: (distance: number) => ChainableThreeObject;
  translateY: (distance: number) => ChainableThreeObject;
  translateZ: (distance: number) => ChainableThreeObject;
  rotateX: (angle: number) => ChainableThreeObject;
  rotateY: (angle: number) => ChainableThreeObject;
  rotateZ: (angle: number) => ChainableThreeObject;
  render: () => THREE.Object3D;
}

// Create a chainable wrapper for Three.js objects
export function createChainableObject(obj: THREE.Object3D): ChainableThreeObject {
  return {
    object: obj,
    
    translateX: function(distance: number) {
      translateX(this.object, distance);
      return this;
    },
    
    translateY: function(distance: number) {
      translateY(this.object, distance);
      return this;
    },
    
    translateZ: function(distance: number) {
      translateZ(this.object, distance);
      return this;
    },
    
    rotateX: function(angle: number) {
      rotateX(this.object, angle * Math.PI / 180); // Convert degrees to radians
      return this;
    },
    
    rotateY: function(angle: number) {
      rotateY(this.object, angle * Math.PI / 180); // Convert degrees to radians
      return this;
    },
    
    rotateZ: function(angle: number) {
      rotateZ(this.object, angle * Math.PI / 180); // Convert degrees to radians
      return this;
    },
    
    render: function() {
      if (currentScene) {
        currentScene.add(this.object);
      }
      return this.object;
    }
  };
}

// Enhanced mesh function that returns a chainable object
export function meshChainable(geometry: THREE.BufferGeometry, materialObj: THREE.Material): ChainableThreeObject {
  const meshObj = new THREE.Mesh(geometry, materialObj);
  return createChainableObject(meshObj);
}

// Create a DSL context with all the functions available
export const dslContext = {
  sphere,
  box,
  cylinder,
  material,
  mesh: meshChainable,
  Math,
  console
};

// Simple DSL parser and executor
export function parseDSL(code: string): any {
  try {
    // Create a function that has access to the DSL context
    const func = new Function(...Object.keys(dslContext), `return ${code}`);
    return func(...Object.values(dslContext));
  } catch (error) {
    console.error('DSL parsing error:', error);
    return null;
  }
}

// Execute DSL code and return the result
export function executeDSL(code: string): THREE.Object3D | null {
  try {
    const result = parseDSL(code);
    return result instanceof THREE.Object3D ? result : null;
  } catch (error) {
    console.error('DSL execution error:', error);
    return null;
  }
}