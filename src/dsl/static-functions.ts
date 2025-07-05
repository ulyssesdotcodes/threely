// Static versions of DSL functions that return actual values instead of Nodes
import * as THREE from "three";
import {
  MockObject3D,
  MockGeometry,
  mockUtils,
  applyMockToObject3D,
  createGeometryFromMock,
  normalizeVector3Like,
  normalizeEulerLike,
} from "../three/MockObject3D";
import { getObjectRegistry } from "./object3d-chain";

// Static geometry creation functions
export const staticSphere = (
  radius: number = 1,
  widthSegments: number = 32,
  heightSegments: number = 16,
): MockGeometry =>
  mockUtils.sphereGeometry(radius, widthSegments, heightSegments);

export const staticBox = (
  width: number = 1,
  height: number = 1,
  depth: number = 1,
): MockGeometry => mockUtils.boxGeometry(width, height, depth);

export const staticCylinder = (
  radiusTop: number = 1,
  radiusBottom: number = 1,
  height: number = 1,
): MockGeometry => mockUtils.cylinderGeometry(radiusTop, radiusBottom, height);

// Static material creation function
export const staticMaterial = (options: any = {}): THREE.MeshBasicMaterial => {
  const defaultOptions = {
    color: 0x00ff00,
    wireframe: false,
  };
  return new THREE.MeshBasicMaterial({ ...defaultOptions, ...options });
};

// Static mesh creation function
export const staticMesh = (
  geometry: MockGeometry,
  material: THREE.Material,
): MockObject3D => {
  return {
    geometry: geometry,
    userData: { material },
  };
};

// Static transformation functions
export const staticTranslateX = (
  mockObject: MockObject3D,
  distance: number,
): MockObject3D => {
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  console.log("distance", distance);
  const currentPos = normalizeVector3Like(
    mockObject.position || { x: 0, y: 0, z: 0 },
  );
  return {
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    userData: mockObject.userData ? { ...mockObject.userData } : undefined,
    ...mockObject,
    position: {
      x: currentPos.x + distance,
      y: currentPos.y,
      z: currentPos.z,
    },
  };
};

export const staticTranslateY = (
  mockObject: MockObject3D,
  distance: number,
): MockObject3D => {
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  const currentPos = normalizeVector3Like(
    mockObject.position || { x: 0, y: 0, z: 0 },
  );
  return {
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    userData: mockObject.userData ? { ...mockObject.userData } : undefined,
    ...mockObject,
    position: {
      x: currentPos.x,
      y: currentPos.y + distance,
      z: currentPos.z,
    },
  };
};

export const staticTranslateZ = (
  mockObject: MockObject3D,
  distance: number,
): MockObject3D => {
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  const currentPos = normalizeVector3Like(
    mockObject.position || { x: 0, y: 0, z: 0 },
  );
  return {
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    userData: mockObject.userData ? { ...mockObject.userData } : undefined,
    ...mockObject,
    position: {
      x: currentPos.x,
      y: currentPos.y,
      z: currentPos.z + distance,
    },
  };
};

export const staticRotateX = (
  mockObject: MockObject3D,
  angle: number,
): MockObject3D => {
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  const currentRot = normalizeEulerLike(
    mockObject.rotation || { x: 0, y: 0, z: 0 },
  );
  return {
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    userData: mockObject.userData ? { ...mockObject.userData } : undefined,
    ...mockObject,
    rotation: {
      x: currentRot.x + angle,
      y: currentRot.y,
      z: currentRot.z,
    },
  };
};

export const staticRotateY = (
  mockObject: MockObject3D,
  angle: number,
): MockObject3D => {
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  const currentRot = normalizeEulerLike(
    mockObject.rotation || { x: 0, y: 0, z: 0 },
  );
  return {
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    userData: mockObject.userData ? { ...mockObject.userData } : undefined,
    ...mockObject,
    rotation: {
      x: currentRot.x,
      y: currentRot.y + angle,
      z: currentRot.z,
    },
  };
};

export const staticRotateZ = (
  mockObject: MockObject3D,
  angle: number,
): MockObject3D => {
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  const currentRot = normalizeEulerLike(
    mockObject.rotation || { x: 0, y: 0, z: 0 },
  );
  return {
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    userData: mockObject.userData ? { ...mockObject.userData } : undefined,
    ...mockObject,
    rotation: {
      x: currentRot.x,
      y: currentRot.y,
      z: currentRot.z + angle,
    },
  };
};

// Static render function
export const staticRender = (
  mockObject: MockObject3D,
  objectName: string,
): THREE.Object3D => {
  // Get the current scene from the registry system
  const objectRegistry = getObjectRegistry();

  // Check if object already exists in the scene
  const existingObject = objectRegistry.get(objectName);

  if (existingObject) {
    // Update the existing object with mock properties
    applyMockToObject3D(existingObject, mockObject);
    (existingObject as any).graphId = objectName;
    return existingObject;
  } else {
    // Create a new real THREE.Object3D from the mock
    let realObject: THREE.Object3D;

    if (mockObject.geometry && mockObject.userData?.material) {
      // Create a mesh with geometry and material
      const geometry = createGeometryFromMock(mockObject.geometry);
      const material = mockObject.userData.material;
      realObject = new THREE.Mesh(geometry, material);
    } else {
      // Create a basic Object3D
      realObject = new THREE.Object3D();
    }

    // Apply all mock properties to the real object
    applyMockToObject3D(realObject, mockObject);

    // Add to registry (scene addition is now handled via the static currentScene check in the object3d-chain)
    objectRegistry.set(objectName, realObject);
    (realObject as any).graphId = objectName;

    // Need to also add to scene if there is one
    try {
      const { currentScene } = require("./object3d-chain");
      if (currentScene) {
        currentScene.add(realObject);
      }
    } catch (e) {
      // Scene not available, continue without it
    }

    return realObject;
  }
};

// Math functions that return actual values
export const staticMult = (a: number, b: number): number => a * b;
export const staticAdd = (a: number, b: number): number => a + b;
export const staticSub = (a: number, b: number): number => a - b;
export const staticDiv = (a: number, b: number): number => a / b;

// Static math functions
export const staticMathSin = (val: number): number => Math.sin(val);
export const staticMathCos = (val: number): number => Math.cos(val);
export const staticMathSqrt = (val: number): number => Math.sqrt(val);
export const staticMathRandom = (): number => Math.random();
