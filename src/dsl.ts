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
import { Graph, Node, map } from './graph';

// Scene reference for adding rendered objects
let currentScene: THREE.Scene | null = null;

// Object registry to track named objects for updates
const objectRegistry = new Map<string, THREE.Object3D>();

// Helper function to generate unique node IDs
let nodeIdCounter = 0;
function generateNodeId(): string {
  return `dsl-node-${++nodeIdCounter}`;
}

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
export function sphere(radius: number = 1, widthSegments: number = 32, heightSegments: number = 16): Node<THREE.SphereGeometry> {
  return {
    id: generateNodeId(),
    compute: () => new THREE.SphereGeometry(radius, widthSegments, heightSegments),
    dependencies: []
  };
}

export function box(width: number = 1, height: number = 1, depth: number = 1): Node<THREE.BoxGeometry> {
  return {
    id: generateNodeId(),
    compute: () => new THREE.BoxGeometry(width, height, depth),
    dependencies: []
  };
}

export function cylinder(radiusTop: number = 1, radiusBottom: number = 1, height: number = 1): Node<THREE.CylinderGeometry> {
  return {
    id: generateNodeId(),
    compute: () => new THREE.CylinderGeometry(radiusTop, radiusBottom, height),
    dependencies: []
  };
}

// Functional material creation function that returns Node<T>
export function material(options: any = {}): Node<THREE.MeshBasicMaterial> {
  return {
    id: generateNodeId(),
    compute: () => {
      const defaultOptions = {
        color: 0x00ff00,
        wireframe: false
      };
      return new THREE.MeshBasicMaterial({ ...defaultOptions, ...options });
    },
    dependencies: []
  };
}

// Functional mesh creation function that returns Node<T>
export function mesh(geometryNode: Node<THREE.BufferGeometry>, materialNode: Node<THREE.Material>): Node<THREE.Mesh> {
  return {
    id: generateNodeId(),
    compute: (geometry: THREE.BufferGeometry, material: THREE.Material) => new THREE.Mesh(geometry, material),
    dependencies: [geometryNode, materialNode]
  };
}

// Transform functions that work with Node<Object3D>
export function translateX<T extends THREE.Object3D>(node: Node<T>, distance: number): Node<T> {
  return {
    id: generateNodeId(),
    compute: (obj: T) => {
      translateXObj(obj, distance);
      return obj;
    },
    dependencies: [node]
  };
}

export function translateY<T extends THREE.Object3D>(node: Node<T>, distance: number): Node<T> {
  return {
    id: generateNodeId(),
    compute: (obj: T) => {
      translateYObj(obj, distance);
      return obj;
    },
    dependencies: [node]
  };
}

export function translateZ<T extends THREE.Object3D>(node: Node<T>, distance: number): Node<T> {
  return {
    id: generateNodeId(),
    compute: (obj: T) => {
      translateZObj(obj, distance);
      return obj;
    },
    dependencies: [node]
  };
}

export function rotateX<T extends THREE.Object3D>(node: Node<T>, angle: number): Node<T> {
  return {
    id: generateNodeId(),
    compute: (obj: T) => {
      rotateXObj(obj, angle);
      return obj;
    },
    dependencies: [node]
  };
}

export function rotateY<T extends THREE.Object3D>(node: Node<T>, angle: number): Node<T> {
  return {
    id: generateNodeId(),
    compute: (obj: T) => {
      rotateYObj(obj, angle);
      return obj;
    },
    dependencies: [node]
  };
}

export function rotateZ<T extends THREE.Object3D>(node: Node<T>, angle: number): Node<T> {
  return {
    id: generateNodeId(),
    compute: (obj: T) => {
      rotateZObj(obj, angle);
      return obj;
    },
    dependencies: [node]
  };
}

// Functional render function that works with Node<Object3D>
export function render<T extends THREE.Object3D>(node: Node<T>, objectName: string): Node<T> {
  return {
    id: generateNodeId(),
    compute: (object: T) => {
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
    },
    dependencies: [node]
  };
}

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