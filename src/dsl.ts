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
let chainMath: any = {};

// Helper function for render logic
const renderLogic = (mockObject: MockObject3D, objectName: string): THREE.Object3D => {
  console.log('🎨 Render called:', { objectName, mockObject: mockObject ? 'present' : 'null' });
  
  if (!currentScene) {
    console.warn('No scene available for rendering');
    const emptyObject = new THREE.Object3D();
    (emptyObject as any).graphId = objectName;
    return emptyObject;
  }

  const actualMockObject = mockObject || { geometry: undefined, userData: undefined };
  console.log('🎨 Using MockObject3D:', actualMockObject);

  // Check if object already exists in the scene
  const existingObject = objectRegistry.get(objectName);

  if (existingObject) {
    // Update the existing object with mock properties
    applyMockToObject3D(existingObject, actualMockObject);
    
    // Set graphId property on the object
    (existingObject as any).graphId = objectName;
    
    console.log(`🎨 Updated existing object: ${objectName}`);
    return existingObject;
  } else {
    // Create a new real THREE.Object3D from the mock
    let realObject: THREE.Object3D;

    console.log("actmockobj", actualMockObject)
    
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
    
    // Set graphId property on the object
    (realObject as any).graphId = objectName;
    
    console.log(`🎨 Added ${objectName} to scene and registry`);
    return realObject;
  }
};

// Functional render function that returns Node<THREE.Object3D>
export const render = (objectNode: Node<MockObject3D> | MockObject3D, objectName: Node<string> | string): Node<THREE.Object3D> => {
  const [objectNodeResolved, objectNameNode] = convertToNodes.mockObjectAndName(objectNode, objectName);
  return apply((mockObject: MockObject3D, name: string) => renderLogic(mockObject, name), [objectNodeResolved, objectNameNode], chainObj3d);
};

chainObj3d.render = {
  fn: (objectNode: Node<MockObject3D> | MockObject3D, objectName: Node<string> | string) => {
    console.log("render input", objectNode, objectName)
    const [objectNodeResolved, objectNameNode] = convertToNodes.mockObjectAndName(objectNode, objectName);
    return apply((mockObject: MockObject3D, name: string) => renderLogic(mockObject, name), [objectNodeResolved, objectNameNode], chainObj3d);
  },
  chain: () => chainObj3d
};


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
      console.log(`📎 mesh function called with:`, { mockGeometry, material });
      if (mockGeometry) {
        console.log(`📎 Input mockGeometry type:`, mockGeometry.type);
        console.log(`📎 Input mockGeometry constructor:`, mockGeometry.constructor?.name);
      }
      
      // Return a mock object that will be converted to a real mesh during render
      const result = {
        geometry: mockGeometry,
        userData: { material }
      };
      
      console.log(`📎 mesh result:`, result);
      if (result.geometry) {
        console.log(`📎 Result geometry type:`, result.geometry.type);
        console.log(`📎 Result geometry constructor:`, result.geometry.constructor?.name);
      }
      return result;
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
  
  return createNode(frameRefNode, [], chainMath);
};



// Helper function for translateX logic
const translateXLogic = (mockObject: MockObject3D, distance: number): MockObject3D => {
  console.log(`📦 translateXLogic called with:`, { mockObject, distance });
  if (mockObject && mockObject.geometry) {
    console.log(`📦 Input geometry type:`, mockObject.geometry.type);
    console.log(`📦 Input geometry constructor:`, mockObject.geometry.constructor?.name);
  }
  
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  const currentPos = normalizeVector3Like(mockObject.position || { x: 0, y: 0, z: 0 });
  const result = {
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    userData: mockObject.userData ? { ...mockObject.userData } : undefined,
    ...mockObject,
    position: {
      x: currentPos.x + distance,
      y: currentPos.y,
      z: currentPos.z
    }
  };
  
  console.log(`📦 translateXLogic result:`, result);
  if (result.geometry) {
    console.log(`📦 Result geometry type:`, result.geometry.type);
    console.log(`📦 Result geometry constructor:`, result.geometry.constructor?.name);
  }
  return result;
};

// Dual-mode translateX: handles both Node inputs (DSL) and resolved values (chaining)
export const translateX = (objectNode: Node<MockObject3D> | MockObject3D, distance: Node<number> | number): Node<MockObject3D> => {
  const [objectNodeResolved, distanceNode] = convertToNodes.mockObjectAndDistance(objectNode, distance);
  return apply((mockObject: MockObject3D, dist: number) => translateXLogic(mockObject, dist), [objectNodeResolved, distanceNode], chainObj3d);
};

const translateYLogic = (mockObject: MockObject3D, distance: number): MockObject3D => {
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  const currentPos = normalizeVector3Like(mockObject.position || { x: 0, y: 0, z: 0 });
  return {
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    userData: mockObject.userData ? { ...mockObject.userData } : undefined,
    ...mockObject,
    position: {
      x: currentPos.x,
      y: currentPos.y + distance,
      z: currentPos.z
    }
  };
};

export const translateY = (objectNode: Node<MockObject3D> | MockObject3D, distance: Node<number> | number): Node<MockObject3D> => {
  const [objectNodeResolved, distanceNode] = convertToNodes.mockObjectAndDistance(objectNode, distance);
  return apply((mockObject: MockObject3D, dist: number) => translateYLogic(mockObject, dist), [objectNodeResolved, distanceNode], chainObj3d);
};

const translateZLogic = (mockObject: MockObject3D, distance: number): MockObject3D => {
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  const currentPos = normalizeVector3Like(mockObject.position || { x: 0, y: 0, z: 0 });
  return {
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    userData: mockObject.userData ? { ...mockObject.userData } : undefined,
    ...mockObject,
    position: {
      x: currentPos.x,
      y: currentPos.y,
      z: currentPos.z + distance
    }
  };
};

export const translateZ = (objectNode: Node<MockObject3D> | MockObject3D, distance: Node<number> | number): Node<MockObject3D> => {
  const [objectNodeResolved, distanceNode] = convertToNodes.mockObjectAndDistance(objectNode, distance);
  return apply((mockObject: MockObject3D, dist: number) => translateZLogic(mockObject, dist), [objectNodeResolved, distanceNode], chainObj3d);
};

const rotateXLogic = (mockObject: MockObject3D, angle: number): MockObject3D => {
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  const currentRot = normalizeEulerLike(mockObject.rotation || { x: 0, y: 0, z: 0 });
  return {
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    userData: mockObject.userData ? { ...mockObject.userData } : undefined,
    ...mockObject,
    rotation: {
      x: currentRot.x + angle,
      y: currentRot.y,
      z: currentRot.z
    }
  };
};

export const rotateX = (objectNode: Node<MockObject3D> | MockObject3D, angle: Node<number> | number): Node<MockObject3D> => {
  const [objectNodeResolved, angleNode] = convertToNodes.mockObjectAndAngle(objectNode, angle);
  return apply((mockObject: MockObject3D, ang: number) => rotateXLogic(mockObject, ang), [objectNodeResolved, angleNode], chainObj3d);
};

const rotateYLogic = (mockObject: MockObject3D, angle: number): MockObject3D => {
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  const currentRot = normalizeEulerLike(mockObject.rotation || { x: 0, y: 0, z: 0 });
  return {
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    userData: mockObject.userData ? { ...mockObject.userData } : undefined,
    ...mockObject,
    rotation: {
      x: currentRot.x,
      y: currentRot.y + angle,
      z: currentRot.z
    }
  };
};

export const rotateY = (objectNode: Node<MockObject3D> | MockObject3D, angle: Node<number> | number): Node<MockObject3D> => {
  const [objectNodeResolved, angleNode] = convertToNodes.mockObjectAndAngle(objectNode, angle);
  return apply((mockObject: MockObject3D, ang: number) => rotateYLogic(mockObject, ang), [objectNodeResolved, angleNode], chainObj3d);
};

const rotateZLogic = (mockObject: MockObject3D, angle: number): MockObject3D => {
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  const currentRot = normalizeEulerLike(mockObject.rotation || { x: 0, y: 0, z: 0 });
  return {
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    userData: mockObject.userData ? { ...mockObject.userData } : undefined,
    ...mockObject,
    rotation: {
      x: currentRot.x,
      y: currentRot.y,
      z: currentRot.z + angle
    }
  };
};

export const rotateZ = (objectNode: Node<MockObject3D> | MockObject3D, angle: Node<number> | number): Node<MockObject3D> => {
  const [objectNodeResolved, angleNode] = convertToNodes.mockObjectAndAngle(objectNode, angle);
  return apply((mockObject: MockObject3D, ang: number) => rotateZLogic(mockObject, ang), [objectNodeResolved, angleNode], chainObj3d);
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

// Mathematical operation functions that work with Nodes
export const multiply = (a: Node<number> | number, b: Node<number> | number): Node<number> => {
  console.log("mult", a, b);
  const nodeA = typeof a === 'number' ? createNode(a, [], {}) : a;
  const nodeB = typeof b === 'number' ? createNode(b, [], {}) : b;
  return apply((valA: number, valB: number) => valA * valB, [nodeA, nodeB], {});
};

export const add = (a: Node<number> | number, b: Node<number> | number): Node<number> => {
  const nodeA = typeof a === 'number' ? createNode(a, [], {}) : a;
  const nodeB = typeof b === 'number' ? createNode(b, [], {}) : b;
  return apply((valA: number, valB: number) => valA + valB, [nodeA, nodeB], {});
};

export const subtract = (a: Node<number> | number, b: Node<number> | number): Node<number> => {
  const nodeA = typeof a === 'number' ? createNode(a, [], {}) : a;
  const nodeB = typeof b === 'number' ? createNode(b, [], {}) : b;
  return apply((valA: number, valB: number) => valA - valB, [nodeA, nodeB], {});
};

export const divide = (a: Node<number> | number, b: Node<number> | number): Node<number> => {
  const nodeA = typeof a === 'number' ? createNode(a, [], {}) : a;
  const nodeB = typeof b === 'number' ? createNode(b, [], {}) : b;
  return apply((valA: number, valB: number) => valA / valB, [nodeA, nodeB], {});
};

// Mathematical chain functions - these work with both Node<number> and number inputs
const mathChainFunction = (mathFn: (value: number, ...args: number[]) => number, fnName: string) => {
  return (valueNode: Node<number> | number, ...args: (Node<number> | number)[]): Node<number> => {
    const valueNodeResolved = typeof valueNode === 'number' ? createNode(valueNode, [], {}) : valueNode;
    const argsResolved = args.map(arg => typeof arg === 'number' ? createNode(arg, [], {}) : arg);
    
    if (argsResolved.length === 0) {
      return apply((val: number) => mathFn(val), [valueNodeResolved], chainMath);
    } else if (argsResolved.length === 1) {
      return apply((val: number, arg1: number) => mathFn(val, arg1), [valueNodeResolved, argsResolved[0]], chainMath);
    } else if (argsResolved.length === 2) {
      return apply((val: number, arg1: number, arg2: number) => mathFn(val, arg1, arg2), [valueNodeResolved, argsResolved[0], argsResolved[1]], chainMath);
    } else {
      return apply((val: number, ...argVals: number[]) => mathFn(val, ...argVals), [valueNodeResolved, ...argsResolved], chainMath);
    }
  };
};

// Math functions that take the number as first argument and return a Node<number>
export const mathAbs = mathChainFunction((val) => Math.abs(val), 'abs');
export const mathAcos = mathChainFunction((val) => Math.acos(val), 'acos');
export const mathAcosh = mathChainFunction((val) => Math.acosh(val), 'acosh');
export const mathAsin = mathChainFunction((val) => Math.asin(val), 'asin');
export const mathAsinh = mathChainFunction((val) => Math.asinh(val), 'asinh');
export const mathAtan = mathChainFunction((val) => Math.atan(val), 'atan');
export const mathAtan2 = mathChainFunction((y, x) => Math.atan2(y, x), 'atan2');
export const mathAtanh = mathChainFunction((val) => Math.atanh(val), 'atanh');
export const mathCbrt = mathChainFunction((val) => Math.cbrt(val), 'cbrt');
export const mathCeil = mathChainFunction((val) => Math.ceil(val), 'ceil');
export const mathClz32 = mathChainFunction((val) => Math.clz32(val), 'clz32');
export const mathCos = mathChainFunction((val) => Math.cos(val), 'cos');
export const mathCosh = mathChainFunction((val) => Math.cosh(val), 'cosh');
export const mathExp = mathChainFunction((val) => Math.exp(val), 'exp');
export const mathExpm1 = mathChainFunction((val) => Math.expm1(val), 'expm1');
export const mathFloor = mathChainFunction((val) => Math.floor(val), 'floor');
export const mathFround = mathChainFunction((val) => Math.fround(val), 'fround');
export const mathHypot = mathChainFunction((val, ...args) => Math.hypot(val, ...args), 'hypot');
export const mathImul = mathChainFunction((a, b) => Math.imul(a, b), 'imul');
export const mathLog = mathChainFunction((val) => Math.log(val), 'log');
export const mathLog10 = mathChainFunction((val) => Math.log10(val), 'log10');
export const mathLog1p = mathChainFunction((val) => Math.log1p(val), 'log1p');
export const mathLog2 = mathChainFunction((val) => Math.log2(val), 'log2');
export const mathMax = mathChainFunction((val, ...args) => Math.max(val, ...args), 'max');
export const mathMin = mathChainFunction((val, ...args) => Math.min(val, ...args), 'min');
export const mathPow = mathChainFunction((base, exponent) => Math.pow(base, exponent), 'pow');
export const mathRandom = () => createNode(Math.random(), [], chainMath);
export const mathRound = mathChainFunction((val) => Math.round(val), 'round');
export const mathSign = mathChainFunction((val) => Math.sign(val), 'sign');
export const mathSin = mathChainFunction((val) => Math.sin(val), 'sin');
export const mathSinh = mathChainFunction((val) => Math.sinh(val), 'sinh');
export const mathSqrt = mathChainFunction((val) => Math.sqrt(val), 'sqrt');
export const mathTan = mathChainFunction((val) => Math.tan(val), 'tan');
export const mathTanh = mathChainFunction((val) => Math.tanh(val), 'tanh');
export const mathTrunc = mathChainFunction((val) => Math.trunc(val), 'trunc');

// Export mock utilities for direct use in DSL
export { MockObject3D, mockUtils, mockPresets };

// Helper functions to convert mixed inputs to nodes (avoids code duplication)
const convertToNodes = {
  mockObjectAndDistance: (objectNode: Node<MockObject3D> | MockObject3D, distance: Node<number> | number) => {
    const objectNodeResolved = (objectNode && typeof objectNode === 'object' && !('id' in objectNode) && !('value' in objectNode) && !('dependencies' in objectNode)) 
      ? createNode(objectNode, [], {}) 
      : objectNode as Node<MockObject3D>;
    const distanceNode = typeof distance === 'number' ? createNode(distance, [], {}) : distance;
    return [objectNodeResolved, distanceNode];
  },
  
  mockObjectAndAngle: (objectNode: Node<MockObject3D> | MockObject3D, angle: Node<number> | number) => {
    const objectNodeResolved = (objectNode && typeof objectNode === 'object' && !('id' in objectNode) && !('value' in objectNode) && !('dependencies' in objectNode)) 
      ? createNode(objectNode, [], {}) 
      : objectNode as Node<MockObject3D>;
    const angleNode = typeof angle === 'number' ? createNode(angle, [], {}) : angle;
    return [objectNodeResolved, angleNode];
  },
  
  mockObjectAndName: (objectNode: Node<MockObject3D> | MockObject3D, objectName: Node<string> | string) => {
    const objectNodeResolved = (objectNode && typeof objectNode === 'object' && !('id' in objectNode) && !('value' in objectNode) && !('dependencies' in objectNode)) 
      ? createNode(objectNode, [], {}) 
      : objectNode as Node<MockObject3D>;
    const objectNameNode = typeof objectName === 'string' ? createNode(objectName, [], {}) : objectName;
    return [objectNodeResolved, objectNameNode];
  },
  
  twoNumbers: (a: Node<number> | number, b: Node<number> | number) => {
    const nodeA = typeof a === 'number' ? createNode(a, [], {}) : a;
    const nodeB = typeof b === 'number' ? createNode(b, [], {}) : b;
    return [nodeA, nodeB];
  }
};

// Set up the chain object after all functions are defined - directly use logic functions
chainObj3d.translateX = { 
  fn: (objectNode: Node<MockObject3D> | MockObject3D, distance: Node<number> | number) => {
    const [objectNodeResolved, distanceNode] = convertToNodes.mockObjectAndDistance(objectNode, distance);
    return apply((mockObject: MockObject3D, dist: number) => translateXLogic(mockObject, dist), [objectNodeResolved, distanceNode], chainObj3d);
  }, 
  chain: () => chainObj3d 
};

chainObj3d.translateY = { 
  fn: (objectNode: Node<MockObject3D> | MockObject3D, distance: Node<number> | number) => {
    const [objectNodeResolved, distanceNode] = convertToNodes.mockObjectAndDistance(objectNode, distance);
    return apply((mockObject: MockObject3D, dist: number) => translateYLogic(mockObject, dist), [objectNodeResolved, distanceNode], chainObj3d);
  }, 
  chain: () => chainObj3d 
};

chainObj3d.translateZ = { 
  fn: (objectNode: Node<MockObject3D> | MockObject3D, distance: Node<number> | number) => {
    const [objectNodeResolved, distanceNode] = convertToNodes.mockObjectAndDistance(objectNode, distance);
    return apply((mockObject: MockObject3D, dist: number) => translateZLogic(mockObject, dist), [objectNodeResolved, distanceNode], chainObj3d);
  }, 
  chain: () => chainObj3d 
};

chainObj3d.rotateX = { 
  fn: (objectNode: Node<MockObject3D> | MockObject3D, angle: Node<number> | number) => {
    const [objectNodeResolved, angleNode] = convertToNodes.mockObjectAndAngle(objectNode, angle);
    return apply((mockObject: MockObject3D, ang: number) => rotateXLogic(mockObject, ang), [objectNodeResolved, angleNode], chainObj3d);
  }, 
  chain: () => chainObj3d 
};

chainObj3d.rotateY = { 
  fn: (objectNode: Node<MockObject3D> | MockObject3D, angle: Node<number> | number) => {
    const [objectNodeResolved, angleNode] = convertToNodes.mockObjectAndAngle(objectNode, angle);
    return apply((mockObject: MockObject3D, ang: number) => rotateYLogic(mockObject, ang), [objectNodeResolved, angleNode], chainObj3d);
  }, 
  chain: () => chainObj3d 
};

chainObj3d.rotateZ = { 
  fn: (objectNode: Node<MockObject3D> | MockObject3D, angle: Node<number> | number) => {
    const [objectNodeResolved, angleNode] = convertToNodes.mockObjectAndAngle(objectNode, angle);
    return apply((mockObject: MockObject3D, ang: number) => rotateZLogic(mockObject, ang), [objectNodeResolved, angleNode], chainObj3d);
  }, 
  chain: () => chainObj3d 
};

chainObj3d.applyMock = { fn: applyMock, chain: () => chainObj3d };

// Set up the mathematical chain object
chainMath.multiply = { fn: multiply, chain: () => chainMath };
chainMath.add = { fn: add, chain: () => chainMath };
chainMath.subtract = { fn: subtract, chain: () => chainMath };
chainMath.divide = { fn: divide, chain: () => chainMath };
chainMath.abs = { fn: mathAbs, chain: () => chainMath };
chainMath.acos = { fn: mathAcos, chain: () => chainMath };
chainMath.acosh = { fn: mathAcosh, chain: () => chainMath };
chainMath.asin = { fn: mathAsin, chain: () => chainMath };
chainMath.asinh = { fn: mathAsinh, chain: () => chainMath };
chainMath.atan = { fn: mathAtan, chain: () => chainMath };
chainMath.atan2 = { fn: mathAtan2, chain: () => chainMath };
chainMath.atanh = { fn: mathAtanh, chain: () => chainMath };
chainMath.cbrt = { fn: mathCbrt, chain: () => chainMath };
chainMath.ceil = { fn: mathCeil, chain: () => chainMath };
chainMath.clz32 = { fn: mathClz32, chain: () => chainMath };
chainMath.cos = { fn: mathCos, chain: () => chainMath };
chainMath.cosh = { fn: mathCosh, chain: () => chainMath };
chainMath.exp = { fn: mathExp, chain: () => chainMath };
chainMath.expm1 = { fn: mathExpm1, chain: () => chainMath };
chainMath.floor = { fn: mathFloor, chain: () => chainMath };
chainMath.fround = { fn: mathFround, chain: () => chainMath };
chainMath.hypot = { fn: mathHypot, chain: () => chainMath };
chainMath.imul = { fn: mathImul, chain: () => chainMath };
chainMath.log = { fn: mathLog, chain: () => chainMath };
chainMath.log10 = { fn: mathLog10, chain: () => chainMath };
chainMath.log1p = { fn: mathLog1p, chain: () => chainMath };
chainMath.log2 = { fn: mathLog2, chain: () => chainMath };
chainMath.max = { fn: mathMax, chain: () => chainMath };
chainMath.min = { fn: mathMin, chain: () => chainMath };
chainMath.pow = { fn: mathPow, chain: () => chainMath };
chainMath.round = { fn: mathRound, chain: () => chainMath };
chainMath.sign = { fn: mathSign, chain: () => chainMath };
chainMath.sin = { fn: mathSin, chain: () => chainMath };
chainMath.sinh = { fn: mathSinh, chain: () => chainMath };
chainMath.sqrt = { fn: mathSqrt, chain: () => chainMath };
chainMath.tan = { fn: mathTan, chain: () => chainMath };
chainMath.tanh = { fn: mathTanh, chain: () => chainMath };
chainMath.trunc = { fn: mathTrunc, chain: () => chainMath };

// render function is now exported above

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
  render,
  multiply,
  add,
  subtract,
  divide,
  // Math functions
  mathAbs,
  mathAcos,
  mathAcosh,
  mathAsin,
  mathAsinh,
  mathAtan,
  mathAtan2,
  mathAtanh,
  mathCbrt,
  mathCeil,
  mathClz32,
  mathCos,
  mathCosh,
  mathExp,
  mathExpm1,
  mathFloor,
  mathFround,
  mathHypot,
  mathImul,
  mathLog,
  mathLog10,
  mathLog1p,
  mathLog2,
  mathMax,
  mathMin,
  mathPow,
  mathRandom,
  mathRound,
  mathSign,
  mathSin,
  mathSinh,
  mathSqrt,
  mathTan,
  mathTanh,
  mathTrunc,
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
    // Clean up the code by trimming whitespace and handling multiline expressions
    const cleanCode = code.trim();
    
    // Create a function that has access to the DSL context
    const func = new Function(...Object.keys(dslContext), `return ${cleanCode}`);
    
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
      console.log("res", result);
      const nodysseusGraph = convertGraphToNodysseus(result);
      // Grab the name and use it as the graph id so that it caches.
      if (result.dependencies && result.dependencies.length > 1 && result.dependencies[1] && result.dependencies[1].value) {
        nodysseusGraph.id = result.dependencies[1].value;
      } else {
        // Fallback to generating a unique ID if dependencies[1].value is not available
        nodysseusGraph.id = nodysseusGraph.id || `graph-${Date.now()}`;
      }
      console.log(nodysseusGraph);
      
      // Re-execute with the named graph
      const finalComputed = runtime.runGraphNode(nodysseusGraph, nodysseusGraph.out!);
      console.log("finalComputed", finalComputed)
      
      // Set up watch for frame updates only if graph contains frame nodes AND results in a rendered object
        const objectName = nodysseusGraph.id;
        
        // Find the node that produces MockObject3D (input to the render function)
        // The render function is the final node, so we need to find its input
        const renderNodeId = nodysseusGraph.out!;
        const renderNode = nodysseusGraph.nodes[renderNodeId];
        
        console.log(`📊 WATCH SETUP - Object: ${objectName}`);
        console.log(`📊 Render node ID: ${renderNodeId}`);
        console.log(`📊 Render node:`, renderNode);
        console.log(`📊 Graph edges_in:`, nodysseusGraph.edges_in);
        
        // Find the input edge to the render node (should be the MockObject3D)
        const renderInputEdges = nodysseusGraph.edges_in?.[renderNodeId];
        if (renderInputEdges) {
          const inputEdgeKeys = Object.keys(renderInputEdges);
          console.log(`📊 Render input edges:`, inputEdgeKeys);
          
          // Find the edge that represents the first argument (the MockObject3D)
          let mockObjectNodeId: string | null = null;
          for (const [fromNodeId, edge] of Object.entries(renderInputEdges)) {
            console.log(`📊 Edge from ${fromNodeId}:`, edge);
            if (edge.as === 'arg0') { // First argument should be the MockObject3D
              mockObjectNodeId = fromNodeId;
              break;
            }
          }
          
          if (mockObjectNodeId) {
            const scopeKey = nodysseusGraph.id + "/" + mockObjectNodeId;
            const nodeToWatch = runtime.scope.get(scopeKey);
            
            console.log(`📊 Found MockObject3D node ID: ${mockObjectNodeId}`);
            console.log(`📊 ScopeKey: ${scopeKey}`);
            console.log(`📊 nodeToWatch exists:`, !!nodeToWatch);
            console.log(`📊 object in registry:`, objectRegistry.has(objectName));
            
            if (nodeToWatch && objectRegistry.has(objectName)) {
              const watch = runtime.createWatch<MockObject3D>(nodeToWatch);
              
              // Get the initial value directly from the node to compare
              const initialNodeValue = runtime.runNode(nodeToWatch);
              console.log(`📊 INITIAL NODE VALUE:`, initialNodeValue);
              if (initialNodeValue && initialNodeValue.geometry) {
                console.log(`📊 INITIAL geometry type:`, initialNodeValue.geometry.type);
                console.log(`📊 INITIAL geometry constructor:`, initialNodeValue.geometry.constructor?.name);
                console.log(`📊 INITIAL geometry object:`, initialNodeValue.geometry);
              }
              
              // Start watching for frame updates
              (async () => {
                try {
                  let watchIteration = 0;
                  for await (const updatedValue of watch) {
                    watchIteration++;
                    console.log(`\n=== WATCH CALLBACK #${watchIteration} - Object: ${objectName} ===`);
                    console.log(`🔄 updatedValue type:`, typeof updatedValue);
                    console.log(`🔄 updatedValue:`, updatedValue);
                    console.log(`🔄 updatedValue === initialNodeValue:`, updatedValue === initialNodeValue);
                    
                    // Check if the updatedValue is the same object reference as the initial value
                    if (updatedValue === initialNodeValue) {
                      console.log(`⚠️  SAME OBJECT REFERENCE - checking for mutation`);
                    }
                    
                    if (updatedValue && updatedValue.geometry) {
                      console.log(`🔄 updatedValue.geometry type:`, typeof updatedValue.geometry);
                      console.log(`🔄 updatedValue.geometry:`, updatedValue.geometry);
                      console.log(`🔄 updatedValue.geometry constructor:`, updatedValue.geometry.constructor?.name);
                      
                      // Check if this is a mock geometry or a real THREE.js geometry
                      if ((updatedValue.geometry as any).type) {
                        console.log(`🔄 geometry.type:`, (updatedValue.geometry as any).type);
                        if ((updatedValue.geometry as any).type === 'sphere' || (updatedValue.geometry as any).type === 'box' || (updatedValue.geometry as any).type === 'cylinder') {
                          console.log(`✅ WATCH: Mock geometry detected - this is GOOD`);
                        } else if ((updatedValue.geometry as any).type === 'SphereGeometry' || (updatedValue.geometry as any).type === 'BoxGeometry') {
                          console.log(`❌ WATCH: Real THREE.js geometry detected - this is the MUTATION!`);
                          console.log(`❌ MUTATION DETECTED! Stack trace:`);
                          console.trace();
                        }
                      }
                    }
                    
                    // Also check the node value directly from the runtime
                    const currentNodeValue = runtime.runNode(nodeToWatch);
                    console.log(`🔄 currentNodeValue from runtime:`, currentNodeValue);
                    if (currentNodeValue !== updatedValue) {
                      console.log(`⚠️  DIFFERENT VALUES: watch gave us one thing, runtime.runNode gave us another`);
                    }
                    
                    const existingObject = objectRegistry.get(objectName);
                    if (existingObject && currentScene) {
                      console.log(`🔄 Applying updated value to existing object ${objectName}`);
                      applyMockToObject3D(existingObject, updatedValue);
                    } else {
                      console.log(`🔄 Breaking watch loop - object no longer in registry`);
                      // Break the watch loop if object is no longer in registry
                      break;
                    }
                    console.log(`=== END WATCH CALLBACK #${watchIteration} ===\n`);
                  }
                } catch (error) {
                  console.warn('Watch loop error:', error);
                }
              })();
            } else {
              console.log(`⚠️  Cannot set up watch - nodeToWatch: ${!!nodeToWatch}, objectInRegistry: ${objectRegistry.has(objectName)}`);
            }
          } else {
            console.log(`⚠️  Could not find MockObject3D input node for render function`);
          }
        } else {
          console.log(`⚠️  Render node has no input edges`);
        }
      
      return finalComputed;
    }
    
    // Otherwise return the result if it's already an Object3D or MockObject3D
    if (result instanceof THREE.Object3D) {
      return result;
    }
    
    // If it's a MockObject3D, convert it to a real Object3D
    if (result && typeof result === 'object' && 'geometry' in result) {
      let realObject: THREE.Object3D;
      console.log("result?", result)
      if (result.geometry && result.userData?.material) {
        const geometry = createGeometryFromMock(result.geometry);
        const material = result.userData.material;
        realObject = new THREE.Mesh(geometry, material);
      } else {
        realObject = new THREE.Object3D();
      }
      console.log("realObject", realObject)
      applyMockToObject3D(realObject, result);
      return realObject;
    }
    
    return null;
  } catch (error) {
    console.error('DSL execution error:', error);
    return null;
  }
}