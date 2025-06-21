// DSL implementation for Three.js live coding environment
import * as THREE from 'three';
import * as Obj3D from './three/Object3D';
import * as Mat from './three/Material';
import { Graph, Node,  createNode, apply } from './graph';
import { convertGraphToNodysseus } from './graph-to-nodysseus-converter';
import { NodysseusRuntime } from './nodysseus/runtime-core';

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

let chainObj3d = Object.fromEntries(Object.entries(Obj3D).map(([k, v]) => [k, {
  fn: v,
  chain: () => chainObj3d
}]))

chainObj3d.render = {chain: () => chainObj3d, fn: (object: THREE.Object3D, objectName: string) => {
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
      return existingObject;
    } else {
      currentScene.add(object);
      objectRegistry.set(objectName, object);
      console.log(`Created new object: ${objectName}`);
      return object;
    }
  }};
let chainMat = Object.fromEntries(Object.entries(Mat).map(([k, v]) => [k, {
  fn: v,
  chain: () => chainMat
}]))

// Functional geometry creation functions that return Node<T>
export const sphere = (radius: number = 1, widthSegments: number = 32, heightSegments: number = 16): Node<THREE.SphereGeometry> =>
  createNode(() => new THREE.SphereGeometry(radius, widthSegments, heightSegments), [], chainObj3d);

export const box = (width: number = 1, height: number = 1, depth: number = 1): Node<THREE.BoxGeometry> =>
  createNode(() => new THREE.BoxGeometry(width, height, depth), [], chainObj3d);

export const cylinder = (radiusTop: number = 1, radiusBottom: number = 1, height: number = 1): Node<THREE.CylinderGeometry> =>
  createNode(() => new THREE.CylinderGeometry(radiusTop, radiusBottom, height), [], chainObj3d);

// Functional material creation function that returns Node<T>
export const material = (options: any = {}): Node<THREE.MeshBasicMaterial> =>
  createNode(() => {
    const defaultOptions = {
      color: 0x00ff00,
      wireframe: false
    };
    return new THREE.MeshBasicMaterial({ ...defaultOptions, ...options });
  }, [], chainMat);

// Functional mesh creation function that returns Node<T>
export const mesh = (geometryNode: Node<THREE.BufferGeometry>, materialNode: Node<THREE.Material>): Node<THREE.Mesh> =>
  apply(
    (geometry: THREE.BufferGeometry, material: THREE.Material) => new THREE.Mesh(geometry, material),
    [geometryNode, materialNode],
    chainObj3d
  );



// Create a DSL context with all the functional versions
export const dslContext = {
  sphere,
  box,
  cylinder,
  material,
  mesh,
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

const watches = {};

// Execute DSL code and run the graph if the result is a Node
export function executeDSL(code: string): THREE.Object3D | null {
  try {
    const result = parseDSL(code);
    
    // If the result is a Node, execute it using NodysseusRuntime and runGraph
    if (result && typeof result === 'object' && 'compute' in result) {
      // Convert the graph to Nodysseus format
      const nodysseusGraph = convertGraphToNodysseus(result);
      
      // Create runtime and execute
      const runtime = new NodysseusRuntime();
      const computed = runtime.runGraphNode(nodysseusGraph, nodysseusGraph.out!);
      if(computed instanceof THREE.Object3D){
        watches[computed.name] = (value) => {console.log(value)};
       
      }
      return computed instanceof THREE.Object3D ? computed : null;
    }
    
    // Otherwise return the result if it's already an Object3D
    return result instanceof THREE.Object3D ? result : null;
  } catch (error) {
    console.error('DSL execution error:', error);
    return null;
  }
}