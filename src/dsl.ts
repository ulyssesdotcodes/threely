// DSL implementation for Three.js live coding environment
import * as THREE from 'three';
import { 
  translateX, 
  translateY, 
  translateZ, 
  rotateX, 
  rotateY, 
  rotateZ 
} from './three/Object3D';


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
  render: (objectName: string) => THREE.Object3D;
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
    
    render: function(objectName: string) {
      if (!currentScene) {
        console.warn('No scene available for rendering');
        return this.object;
      }

      // Check if object with this name already exists
      const existingObject = objectRegistry.get(objectName);
      
      if (existingObject) {
        // Update existing object's properties
        existingObject.position.copy(this.object.position);
        existingObject.rotation.copy(this.object.rotation);
        existingObject.scale.copy(this.object.scale);
        
        // Update geometry and material if it's a mesh
        if (existingObject instanceof THREE.Mesh && this.object instanceof THREE.Mesh) {
          existingObject.geometry.dispose(); // Clean up old geometry
          existingObject.geometry = this.object.geometry;
          
          if (existingObject.material instanceof THREE.Material) {
            existingObject.material.dispose(); // Clean up old material
          }
          existingObject.material = this.object.material;
        }
        
        console.log(`Updated existing object: ${objectName}`);
        return existingObject;
      } else {
        // Add new object to scene and registry
        currentScene.add(this.object);
        objectRegistry.set(objectName, this.object);
        console.log(`Created new object: ${objectName}`);
        return this.object;
      }
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
  clearAll,
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