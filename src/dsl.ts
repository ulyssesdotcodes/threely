// DSL implementation for Three.js live coding environment
import * as THREE from 'three';
import * as Obj3D from './three/Object3D';
import * as Mat from './three/Material';
import { Graph, Node, createNode, apply, prettyPrint } from './graph';
import { convertGraphToNodysseus } from './graph-to-nodysseus-converter';
import { NodysseusRuntime } from './nodysseus/runtime-core';
import { RefNode } from './nodysseus/types';
import { MockObject3D, MockGeometry, applyMockToObject3D, mockUtils, mockPresets, createGeometryFromMock, normalizeVector3Like, normalizeEulerLike } from './three/MockObject3D';

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
    objectRegistry.forEach((object) => {
      currentScene!.remove(object);

      // Clean up geometry and materials
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        }
      }
    });
  }
  objectRegistry.clear();
  console.log('Cleared all objects from scene and registry');
}

let chainObj3d: any = {};

chainObj3d.render = {
  chain: () => chainObj3d, 
  fn: (mockObject: any, objectName: string) => {
    console.log('🎨 Render called:', { objectName, mockObject: mockObject ? 'present' : 'null' });
    
    if (!currentScene) {
      console.warn('No scene available for rendering');
      return new THREE.Object3D();
    }

    // Handle both Node and direct MockObject3D cases
    let actualMockObject: MockObject3D;
    if (mockObject && typeof mockObject === 'object' && 'value' in mockObject && 'dependencies' in mockObject) {
      // This is a Node, execute it to get the MockObject3D
      try {
        actualMockObject = Graph.run(mockObject);
        console.log('🎨 Executed Node to get MockObject3D:', actualMockObject);
        console.log('🎨 Graph pretty print:', prettyPrint(mockObject));
      } catch (error) {
        console.warn('Failed to execute mock object node:', error);
        actualMockObject = { geometry: undefined, userData: undefined };
      }
    } else {
      // This is already a resolved MockObject3D
      actualMockObject = mockObject || { geometry: undefined, userData: undefined };
      console.log('🎨 Using resolved MockObject3D:', actualMockObject);
    }


    // Check if object already exists in the scene
    const existingObject = objectRegistry.get(objectName);

    if (existingObject) {
      // Update the existing object with mock properties
      applyMockToObject3D(existingObject, actualMockObject);
      console.log(`🎨 Updated existing object: ${objectName}`);
      return existingObject;
    } else {
      // Create a new real THREE.Object3D from the mock
      let realObject: THREE.Object3D;
      
      if (actualMockObject.geometry && actualMockObject.userData?.material) {
        // Create a mesh with geometry and material
        const geometry = createGeometryFromMock(actualMockObject.geometry);
        const material = actualMockObject.userData.material;
        realObject = new THREE.Mesh(geometry, material);
        console.log(`🎨 Created new Mesh: ${objectName}`);
      } else {
        // Create a basic Object3D
        realObject = new THREE.Object3D();
        console.log(`🎨 Created new Object3D: ${objectName}`);
      }

      // Apply all mock properties to the real object
      applyMockToObject3D(realObject, actualMockObject);

      // Add to scene and registry
      currentScene.add(realObject);
      objectRegistry.set(objectName, realObject);
      console.log(`🎨 Added ${objectName} to scene and registry`);
      return realObject;
    }
  }};


// Functional geometry creation functions that return Node<MockGeometry>
export const sphere = (radius: number = 1, widthSegments: number = 32, heightSegments: number = 16): Node<MockGeometry> =>
  createNode(mockUtils.sphereGeometry(radius, widthSegments, heightSegments), [], {});

export const box = (width: number = 1, height: number = 1, depth: number = 1): Node<MockGeometry> =>
  createNode(mockUtils.boxGeometry(width, height, depth), [], {});

export const cylinder = (radiusTop: number = 1, radiusBottom: number = 1, height: number = 1): Node<MockGeometry> =>
  createNode(mockUtils.cylinderGeometry(radiusTop, radiusBottom, height), [], {});

// Functional material creation function that returns Node<T>
export const material = (options: any = {}): Node<THREE.MeshBasicMaterial> =>
  createNode(() => {
    const defaultOptions = {
      color: 0x00ff00,
      wireframe: false
    };
    return new THREE.MeshBasicMaterial({ ...defaultOptions, ...options });
  }, [], {});

// Functional mesh creation function that returns Node<MockObject3D>
export const mesh = (geometryNode: Node<MockGeometry>, materialNode: Node<THREE.Material>): Node<MockObject3D> =>
  apply(
    (mockGeometry: MockGeometry, material: THREE.Material) => {
      // Return a mock object that will be converted to a real mesh during render
      return {
        geometry: mockGeometry,
        userData: { material }
      };
    },
    [geometryNode, materialNode],
    chainObj3d
  );

// Frame counter function that returns a Node with extern.frame RefNode
export const frame = (): Node<any> => {
  const frameRefNode: RefNode = {
    id: `frame-${Date.now()}`,
    ref: 'extern.frame'
  };
  
  return createNode(frameRefNode, [], chainObj3d);
};



// Helper function for translateX logic
const translateXLogic = (mockObject: MockObject3D, distance: number): MockObject3D => {
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  const currentPos = normalizeVector3Like(mockObject.position || { x: 0, y: 0, z: 0 });
  return {
    geometry: mockObject.geometry,
    userData: mockObject.userData,
    ...mockObject,
    position: {
      x: currentPos.x + distance,
      y: currentPos.y,
      z: currentPos.z
    }
  };
};

// Dual-mode translateX: handles both Node inputs (DSL) and resolved values (chaining)
export const translateX = (objectNode: Node<MockObject3D> | MockObject3D, distance: number): Node<MockObject3D> | MockObject3D => {
  // Check if first argument is a resolved MockObject3D (from chaining execution)
  if (objectNode && typeof objectNode === 'object' && !('id' in objectNode) && !('value' in objectNode) && !('dependencies' in objectNode)) {
    // Direct execution with resolved value - return transformed MockObject3D
    return translateXLogic(objectNode as MockObject3D, distance);
  } else {
    // Node-based execution - return Node that will transform the MockObject3D
    return apply((mockObject: MockObject3D) => translateXLogic(mockObject, distance), [objectNode as Node<MockObject3D>], chainObj3d);
  }
};

const translateYLogic = (mockObject: MockObject3D, distance: number): MockObject3D => {
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  const currentPos = normalizeVector3Like(mockObject.position || { x: 0, y: 0, z: 0 });
  return {
    geometry: mockObject.geometry,
    userData: mockObject.userData,
    ...mockObject,
    position: {
      x: currentPos.x,
      y: currentPos.y + distance,
      z: currentPos.z
    }
  };
};

export const translateY = (objectNode: Node<MockObject3D> | MockObject3D, distance: number): Node<MockObject3D> | MockObject3D => {
  if (objectNode && typeof objectNode === 'object' && !('id' in objectNode) && !('value' in objectNode) && !('dependencies' in objectNode)) {
    return translateYLogic(objectNode as MockObject3D, distance);
  } else {
    return apply((mockObject: MockObject3D) => translateYLogic(mockObject, distance), [objectNode as Node<MockObject3D>], chainObj3d);
  }
};

const translateZLogic = (mockObject: MockObject3D, distance: number): MockObject3D => {
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  const currentPos = normalizeVector3Like(mockObject.position || { x: 0, y: 0, z: 0 });
  return {
    geometry: mockObject.geometry,
    userData: mockObject.userData,
    ...mockObject,
    position: {
      x: currentPos.x,
      y: currentPos.y,
      z: currentPos.z + distance
    }
  };
};

export const translateZ = (objectNode: Node<MockObject3D> | MockObject3D, distance: number): Node<MockObject3D> | MockObject3D => {
  if (objectNode && typeof objectNode === 'object' && !('id' in objectNode) && !('value' in objectNode) && !('dependencies' in objectNode)) {
    return translateZLogic(objectNode as MockObject3D, distance);
  } else {
    return apply((mockObject: MockObject3D) => translateZLogic(mockObject, distance), [objectNode as Node<MockObject3D>], chainObj3d);
  }
};

const rotateXLogic = (mockObject: MockObject3D, angle: number): MockObject3D => {
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  const currentRot = normalizeEulerLike(mockObject.rotation || { x: 0, y: 0, z: 0 });
  return {
    geometry: mockObject.geometry,
    userData: mockObject.userData,
    ...mockObject,
    rotation: {
      x: currentRot.x + angle,
      y: currentRot.y,
      z: currentRot.z
    }
  };
};

export const rotateX = (objectNode: Node<MockObject3D> | MockObject3D, angle: number): Node<MockObject3D> | MockObject3D => {
  if (objectNode && typeof objectNode === 'object' && !('id' in objectNode) && !('value' in objectNode) && !('dependencies' in objectNode)) {
    return rotateXLogic(objectNode as MockObject3D, angle);
  } else {
    return apply((mockObject: MockObject3D) => rotateXLogic(mockObject, angle), [objectNode as Node<MockObject3D>], chainObj3d);
  }
};

const rotateYLogic = (mockObject: MockObject3D, angle: number): MockObject3D => {
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  const currentRot = normalizeEulerLike(mockObject.rotation || { x: 0, y: 0, z: 0 });
  return {
    geometry: mockObject.geometry,
    userData: mockObject.userData,
    ...mockObject,
    rotation: {
      x: currentRot.x,
      y: currentRot.y + angle,
      z: currentRot.z
    }
  };
};

export const rotateY = (objectNode: Node<MockObject3D> | MockObject3D, angle: number): Node<MockObject3D> | MockObject3D => {
  if (objectNode && typeof objectNode === 'object' && !('id' in objectNode) && !('value' in objectNode) && !('dependencies' in objectNode)) {
    return rotateYLogic(objectNode as MockObject3D, angle);
  } else {
    return apply((mockObject: MockObject3D) => rotateYLogic(mockObject, angle), [objectNode as Node<MockObject3D>], chainObj3d);
  }
};

const rotateZLogic = (mockObject: MockObject3D, angle: number): MockObject3D => {
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  const currentRot = normalizeEulerLike(mockObject.rotation || { x: 0, y: 0, z: 0 });
  return {
    geometry: mockObject.geometry,
    userData: mockObject.userData,
    ...mockObject,
    rotation: {
      x: currentRot.x,
      y: currentRot.y,
      z: currentRot.z + angle
    }
  };
};

export const rotateZ = (objectNode: Node<MockObject3D> | MockObject3D, angle: number): Node<MockObject3D> | MockObject3D => {
  if (objectNode && typeof objectNode === 'object' && !('id' in objectNode) && !('value' in objectNode) && !('dependencies' in objectNode)) {
    return rotateZLogic(objectNode as MockObject3D, angle);
  } else {
    return apply((mockObject: MockObject3D) => rotateZLogic(mockObject, angle), [objectNode as Node<MockObject3D>], chainObj3d);
  }
};


// Mock object integration function 
export const applyMock = (objectNode: Node<MockObject3D>, mock: MockObject3D): Node<MockObject3D> =>
  apply((existingMock: MockObject3D) => {
    // Merge the new mock properties with the existing mock
    return {
      ...existingMock,
      ...mock,
      // Special handling for userData to merge instead of replace
      userData: {
        ...existingMock.userData,
        ...mock.userData
      }
    };
  }, [objectNode], chainObj3d);

// Export mock utilities for direct use in DSL
export { MockObject3D, mockUtils, mockPresets };

// Set up the chain object after all functions are defined
chainObj3d.translateX = { fn: translateX, chain: () => chainObj3d };
chainObj3d.translateY = { fn: translateY, chain: () => chainObj3d };
chainObj3d.translateZ = { fn: translateZ, chain: () => chainObj3d };
chainObj3d.rotateX = { fn: rotateX, chain: () => chainObj3d };
chainObj3d.rotateY = { fn: rotateY, chain: () => chainObj3d };
chainObj3d.rotateZ = { fn: rotateZ, chain: () => chainObj3d };
chainObj3d.applyMock = { fn: applyMock, chain: () => chainObj3d };

// Create a DSL context with all the functional versions
export const dslContext = {
  sphere,
  box,
  cylinder,
  material,
  mesh,
  frame,
  translateX,
  translateY,
  translateZ,
  rotateX,
  rotateY,
  rotateZ,
  applyMock,
  mockUtils,
  mockPresets,
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

// Important that this isn't created every time executeDSL is called!
const runtime = new NodysseusRuntime();

// Execute DSL code and run the graph if the result is a Node
export function executeDSL(code: string): THREE.Object3D | null {
  try {
    const result = parseDSL(code);
    
    // If the result is a Node, try direct Graph.run execution first
    if (result && typeof result === 'object' && 'value' in result && 'dependencies' in result) {
      // Convert the graph to Nodysseus format
      console.log(result);
      const nodysseusGraph = convertGraphToNodysseus(result);
      // Grab the name and use it as the graph id so that it caches.
      nodysseusGraph.id = result.dependencies[1].value;
      console.log(nodysseusGraph);
      
      // Re-execute with the named graph
      const finalComputed = runtime.runGraphNode(nodysseusGraph, nodysseusGraph.out!);
      return finalComputed;
    }
    
    // Otherwise return the result if it's already an Object3D or MockObject3D
    if (result instanceof THREE.Object3D) {
      return result;
    }
    
    // If it's a MockObject3D, convert it to a real Object3D
    if (result && typeof result === 'object' && 'geometry' in result) {
      let realObject: THREE.Object3D;
      if (result.geometry && result.userData?.material) {
        const geometry = createGeometryFromMock(result.geometry);
        const material = result.userData.material;
        realObject = new THREE.Mesh(geometry, material);
      } else {
        realObject = new THREE.Object3D();
      }
      applyMockToObject3D(realObject, result);
      return realObject;
    }
    
    return null;
  } catch (error) {
    console.error('DSL execution error:', error);
    return null;
  }
}