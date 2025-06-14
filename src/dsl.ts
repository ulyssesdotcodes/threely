// DSL implementation for Three.js live coding environment
import * as THREE from 'three';
import {
  translateX as translateXObj,
  translateY as translateYObj,
  translateZ as translateZObj,
  rotateX as rotateXObj,
  rotateY as rotateYObj,
  rotateZ as rotateZObj
} from './three/Object3D';
import { Graph, Node, map, createNode, apply } from './graph';

// Scene reference for adding rendered objects
let currentScene: THREE.Scene | null = null;

// Object registry to track named objects for updates
const objectRegistry = new Map<string, THREE.Object3D>();


export function setScene(scene: THREE.Scene) {
  currentScene = scene;
}

export function getObjectRegistry() {
  return objectRegistry;
}

// Utility function to clear all objects from the scene and registry
export function clearAll() {
  if (currentScene) {
    for (const [, object] of objectRegistry) {
      currentScene.remove(object);

      // Clean up geometry and materials
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        }
      }
    }
  }
  objectRegistry.clear();
  console.log('Cleared all objects from scene and registry');
}

// Functional geometry creation functions that return Node<T>
export const sphere = (radius: number = 1, widthSegments: number = 32, heightSegments: number = 16): Node<THREE.SphereGeometry> =>
  createNode(() => new THREE.SphereGeometry(radius, widthSegments, heightSegments));

export const box = (width: number = 1, height: number = 1, depth: number = 1): Node<THREE.BoxGeometry> =>
  createNode(() => new THREE.BoxGeometry(width, height, depth));

export const cylinder = (radiusTop: number = 1, radiusBottom: number = 1, height: number = 1): Node<THREE.CylinderGeometry> =>
  createNode(() => new THREE.CylinderGeometry(radiusTop, radiusBottom, height));

// Functional material creation function that returns Node<T>
export const material = (options: any = {}): Node<THREE.MeshBasicMaterial> =>
  createNode(() => {
    const defaultOptions = {
      color: 0x00ff00,
      wireframe: false
    };
    return new THREE.MeshBasicMaterial({ ...defaultOptions, ...options });
  });

// Functional mesh creation function that returns Node<T>
export const mesh = (geometryNode: Node<THREE.BufferGeometry>, materialNode: Node<THREE.Material>): Node<THREE.Mesh> =>
  apply(
    (geometry: THREE.BufferGeometry, material: THREE.Material) => new THREE.Mesh(geometry, material),
    [geometryNode, materialNode]
  );

// Transform functions that work with Node<Object3D>
export const translateX = <T extends THREE.Object3D>(node: Node<T>, distance: number): Node<T> =>
  map((obj: T) => {
    translateXObj(obj, distance);
    return obj;
  })(node);

export const translateY = <T extends THREE.Object3D>(node: Node<T>, distance: number): Node<T> =>
  map((obj: T) => {
    translateYObj(obj, distance);
    return obj;
  })(node);

export const translateZ = <T extends THREE.Object3D>(node: Node<T>, distance: number): Node<T> =>
  map((obj: T) => {
    translateZObj(obj, distance);
    return obj;
  })(node);

export const rotateX = <T extends THREE.Object3D>(node: Node<T>, angle: number): Node<T> =>
  map((obj: T) => {
    rotateXObj(obj, angle);
    return obj;
  })(node);

export const rotateY = <T extends THREE.Object3D>(node: Node<T>, angle: number): Node<T> =>
  map((obj: T) => {
    rotateYObj(obj, angle);
    return obj;
  })(node);

export const rotateZ = <T extends THREE.Object3D>(node: Node<T>, angle: number): Node<T> =>
  map((obj: T) => {
    rotateZObj(obj, angle);
    return obj;
  })(node);

// Functional render function that works with Node<Object3D>
export const render = <T extends THREE.Object3D>(node: Node<T>, objectName: string): Node<T> =>
  map((object: T) => {
    if (!currentScene) {
      console.warn('No scene available for rendering');
      return object;
    }

    const existingObject = objectRegistry.get(objectName);

    if (existingObject) {
      existingObject.position.copy(object.position);
      existingObject.rotation.copy(object.rotation);
      existingObject.scale.copy(object.scale);

      if (existingObject instanceof THREE.Mesh && object instanceof THREE.Mesh) {
        existingObject.geometry.dispose();
        existingObject.geometry = object.geometry;

        if (existingObject.material instanceof THREE.Material) {
          existingObject.material.dispose();
        }
        existingObject.material = object.material;
      }

      console.log(`Updated existing object: ${objectName}`);
      return existingObject as T;
    } else {
      currentScene.add(object);
      objectRegistry.set(objectName, object);
      console.log(`Created new object: ${objectName}`);
      return object;
    }
  })(node);

// Create a DSL context with all the functional versions
export const dslContext = {
  sphere,
  box,
  cylinder,
  material,
  mesh,
  translateX,
  translateY,
  translateZ,
  rotateX,
  rotateY,
  rotateZ,
  render,
  clearAll,
  Graph,
  Math,
  console
};

// Simple DSL parser that evaluates code with functional context
export function parseDSL(code: string): any {
  try {
    // Create a function that has access to the DSL context
    const func = new Function(...Object.keys(dslContext), `return ${code}`);
    
    // Execute the function and return the result (which could be a Node<T>)
    return func(...Object.values(dslContext));
  } catch (error) {
    console.error('DSL parsing error:', error);
    return null;
  }
}

// Execute DSL code and run the graph if the result is a Node
export function executeDSL(code: string): THREE.Object3D | null {
  try {
    const result = parseDSL(code);
    
    // If the result is a Node, execute it using Graph.run
    if (result && typeof result === 'object' && 'compute' in result) {
      const computed = Graph.run(result);
      return computed instanceof THREE.Object3D ? computed : null;
    }
    
    // Otherwise return the result if it's already an Object3D
    return result instanceof THREE.Object3D ? result : null;
  } catch (error) {
    console.error('DSL execution error:', error);
    return null;
  }
}