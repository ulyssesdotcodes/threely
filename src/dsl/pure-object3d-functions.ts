// Pure Object3D Functions - No Node dependencies
// These functions return primitive values and computation functions for direct Nodysseus conversion

import * as THREE from "three";
import {
  MockObject3D,
  MockGeometry,
  applyMockToObject3D,
  mockUtils,
  createGeometryFromMock,
  normalizeVector3Like,
  normalizeEulerLike,
} from "../three/MockObject3D";

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

export function clearAll() {
  if (currentScene) {
    objectRegistry.forEach((object) => {
      currentScene!.remove(object);
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        }
      }
    });
  }
  objectRegistry.clear();
}

// Pure geometry creation functions - return MockGeometry directly
export const sphere = (
  radius: number = 1,
  widthSegments: number = 32,
  heightSegments: number = 16,
): MockGeometry =>
  mockUtils.sphereGeometry(radius, widthSegments, heightSegments);

export const box = (
  width: number = 1,
  height: number = 1,
  depth: number = 1,
): MockGeometry => mockUtils.boxGeometry(width, height, depth);

export const cylinder = (
  radiusTop: number = 1,
  radiusBottom: number = 1,
  height: number = 1,
): MockGeometry => mockUtils.cylinderGeometry(radiusTop, radiusBottom, height);

// Pure material creation function - returns computation function
export const material = (options: any = {}): THREE.MeshBasicMaterial => {
  const defaultOptions = {
    color: 0x00ff00,
    wireframe: false,
  };
  return new THREE.MeshBasicMaterial({ ...defaultOptions, ...options });
};

// Pure mesh creation function - returns MockObject3D
export const mesh = (
  mockGeometry: MockGeometry,
  material: THREE.Material,
): MockObject3D => ({
  geometry: { ...mockGeometry }, // Deep copy to avoid reference sharing
  userData: { material },
});

// Pure transform functions - return computation functions that modify MockObject3D
export const translateX = (
  mockObject: MockObject3D,
  distance: number,
): MockObject3D => {
  console.log("distance", distance)
  const currentPos = normalizeVector3Like(
    mockObject.position || { x: 0, y: 0, z: 0 },
  );
  return {
    ...mockObject,
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    position: {
      x: currentPos.x + distance,
      y: currentPos.y,
      z: currentPos.z,
    },
  };
};

export const translateY = (
  mockObject: MockObject3D,
  distance: number,
): MockObject3D => {
  const currentPos = normalizeVector3Like(
    mockObject.position || { x: 0, y: 0, z: 0 },
  );
  return {
    ...mockObject,
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    position: {
      x: currentPos.x,
      y: currentPos.y + distance,
      z: currentPos.z,
    },
  };
};

export const translateZ = (
  mockObject: MockObject3D,
  distance: number,
): MockObject3D => {
  const currentPos = normalizeVector3Like(
    mockObject.position || { x: 0, y: 0, z: 0 },
  );
  return {
    ...mockObject,
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    position: {
      x: currentPos.x,
      y: currentPos.y,
      z: currentPos.z + distance,
    },
  };
};

export const rotateX = (
  mockObject: MockObject3D,
  angle: number,
): MockObject3D => {
  const currentRot = normalizeEulerLike(
    mockObject.rotation || { x: 0, y: 0, z: 0 },
  );
  return {
    ...mockObject,
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    rotation: {
      x: currentRot.x + angle,
      y: currentRot.y,
      z: currentRot.z,
    },
  };
};

export const rotateY = (
  mockObject: MockObject3D,
  angle: number,
): MockObject3D => {
  const currentRot = normalizeEulerLike(
    mockObject.rotation || { x: 0, y: 0, z: 0 },
  );
  return {
    ...mockObject,
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    rotation: {
      x: currentRot.x,
      y: currentRot.y + angle,
      z: currentRot.z,
    },
  };
};

export const rotateZ = (
  mockObject: MockObject3D,
  angle: number,
): MockObject3D => {
  const currentRot = normalizeEulerLike(
    mockObject.rotation || { x: 0, y: 0, z: 0 },
  );
  return {
    ...mockObject,
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    rotation: {
      x: currentRot.x,
      y: currentRot.y,
      z: currentRot.z + angle,
    },
  };
};

// Utility for applying mock properties to existing object
export const applyMock = (mockObject: MockObject3D): MockObject3D => mockObject;

// Pure render function - returns computation function that creates THREE.Object3D
export const render = (
  mockObject: MockObject3D,
  objectName: string,
): THREE.Object3D => {
  if (!currentScene) {
    console.warn("No scene available for rendering");
    const emptyObject = new THREE.Object3D();
    (emptyObject as any).graphId = objectName;
    return emptyObject;
  }

  const actualMockObject = mockObject || {
    geometry: undefined,
    userData: undefined,
  };

  // Check if object already exists in the scene
  const existingObject = objectRegistry.get(objectName);

  if (existingObject) {
    // Update the existing object with mock properties
    applyMockToObject3D(existingObject, actualMockObject);
    (existingObject as any).graphId = objectName;
    return existingObject;
  } else {
    // Create a new real THREE.Object3D from the mock
    let realObject: THREE.Object3D;

    if (actualMockObject.geometry && actualMockObject.userData?.material) {
      // Create a mesh with geometry and material
      const geometry = createGeometryFromMock(actualMockObject.geometry);
      const material = actualMockObject.userData.material;
      realObject = new THREE.Mesh(geometry, material);
    } else {
      // Create a basic Object3D
      realObject = new THREE.Object3D();
    }

    // Apply all mock properties to the real object
    applyMockToObject3D(realObject, actualMockObject);

    // Add to scene and registry
    currentScene.add(realObject);
    objectRegistry.set(objectName, realObject);

    // Set graphId property on the object
    (realObject as any).graphId = objectName;
    return realObject;
  }
};

// Chain object for method resolution - stores function references
export const chainObj3d = {
  translateX: { fn: translateX, chain: () => chainObj3d },
  translateY: { fn: translateY, chain: () => chainObj3d },
  translateZ: { fn: translateZ, chain: () => chainObj3d },
  rotateX: { fn: rotateX, chain: () => chainObj3d },
  rotateY: { fn: rotateY, chain: () => chainObj3d },
  rotateZ: { fn: rotateZ, chain: () => chainObj3d },
  render: { fn: render, chain: () => chainObj3d },
};
