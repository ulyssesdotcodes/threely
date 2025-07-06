// Object3D chain operations for Three.js DSL
import * as THREE from "three";
import { Graph, Node, createNode, apply } from "../graph";
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

// Export currentScene for static functions
export { currentScene };

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
}

let chainObj3d: any = {};

// Helper function for render logic
const renderLogic = (
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

    // Set graphId property on the object
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

// Helper functions to convert mixed inputs to nodes (avoids code duplication)
const convertToNodes = {
  mockObjectAndDistance: (
    objectNode: Node<MockObject3D> | MockObject3D,
    distance: Node<number> | number,
  ) => {
    const objectNodeResolved =
      objectNode &&
        typeof objectNode === "object" &&
        !("id" in objectNode) &&
        !("value" in objectNode) &&
        !("dependencies" in objectNode)
        ? createNode(objectNode, [], {})
        : (objectNode as Node<MockObject3D>);
    const distanceNode =
      typeof distance === "number" ? createNode(distance, [], {}) : distance;
    return [objectNodeResolved, distanceNode];
  },

  mockObjectAndAngle: (
    objectNode: Node<MockObject3D> | MockObject3D,
    angle: Node<number> | number,
  ) => {
    const objectNodeResolved =
      objectNode &&
        typeof objectNode === "object" &&
        !("id" in objectNode) &&
        !("value" in objectNode) &&
        !("dependencies" in objectNode)
        ? createNode(objectNode, [], {})
        : (objectNode as Node<MockObject3D>);
    const angleNode =
      typeof angle === "number" ? createNode(angle, [], {}) : angle;
    return [objectNodeResolved, angleNode];
  },

  mockObjectAndName: (
    objectNode: Node<MockObject3D> | MockObject3D,
    objectName: Node<string> | string,
  ) => {
    const objectNodeResolved =
      objectNode &&
        typeof objectNode === "object" &&
        !("id" in objectNode) &&
        !("value" in objectNode) &&
        !("dependencies" in objectNode)
        ? createNode(objectNode, [], {})
        : (objectNode as Node<MockObject3D>);
    const objectNameNode =
      typeof objectName === "string"
        ? createNode(objectName, [], {})
        : objectName;
    return [objectNodeResolved, objectNameNode];
  },
};

// Functional render function that returns Node<THREE.Object3D>
export const render = (
  objectNode: Node<MockObject3D> | MockObject3D,
  objectName: Node<string> | string,
): Node<THREE.Object3D> => {
  const [objectNodeResolved, objectNameNode] = convertToNodes.mockObjectAndName(
    objectNode,
    objectName,
  );
  return apply(
    (mockObject: MockObject3D, name: string) => renderLogic(mockObject, name),
    [objectNodeResolved, objectNameNode],
    chainObj3d,
  );
};

// Functional geometry creation functions that return Node<MockGeometry>
export const sphere = (
  radius: number = 1,
  widthSegments: number = 32,
  heightSegments: number = 16,
): Node<MockGeometry> =>
  createNode(
    mockUtils.sphereGeometry(radius, widthSegments, heightSegments),
    [],
    {},
  );

export const box = (
  width: number = 1,
  height: number = 1,
  depth: number = 1,
): Node<MockGeometry> =>
  createNode(mockUtils.boxGeometry(width, height, depth), [], {});

export const cylinder = (
  radiusTop: number = 1,
  radiusBottom: number = 1,
  height: number = 1,
): Node<MockGeometry> =>
  createNode(
    mockUtils.cylinderGeometry(radiusTop, radiusBottom, height),
    [],
    {},
  );

// Functional material creation function that returns Node<T>
export const material = (options: any = {}): Node<THREE.MeshBasicMaterial> =>
  createNode(
    () => {
      const defaultOptions = {
        color: 0x00ff00,
        wireframe: false,
      };
      return new THREE.MeshBasicMaterial({ ...defaultOptions, ...options });
    },
    [],
    {},
  );

// Functional mesh creation function that returns Node<MockObject3D>
export const mesh = (
  geometryNode: Node<MockGeometry>,
  materialNode: Node<THREE.Material>,
): Node<MockObject3D> =>
  apply(
    (mockGeometry: MockGeometry, material: THREE.Material) => {
      // Return a mock object that will be converted to a real mesh during render
      const result = {
        geometry: mockGeometry,
        userData: { material },
      };

      return result;
    },
    [geometryNode, materialNode],
    chainObj3d,
  );

// Helper function for translateX logic
const translateXLogic = (
  mockObject: MockObject3D,
  distance: number,
): MockObject3D => {
  if (!mockObject) {
    return { geometry: undefined, userData: undefined };
  }
  console.log("distance", distance)
  const currentPos = normalizeVector3Like(
    mockObject.position || { x: 0, y: 0, z: 0 },
  );
  const result = {
    geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
    userData: mockObject.userData ? { ...mockObject.userData } : undefined,
    ...mockObject,
    position: {
      x: currentPos.x + distance,
      y: currentPos.y,
      z: currentPos.z,
    },
  };

  return result;
};

// Dual-mode translateX: handles both Node inputs (DSL) and resolved values (chaining)
export const translateX = (
  objectNode: Node<MockObject3D> | MockObject3D,
  distance: Node<number> | number,
): Node<MockObject3D> => {
  console.log("distance", distance)
  const [objectNodeResolved, distanceNode] =
    convertToNodes.mockObjectAndDistance(objectNode, distance);
  return apply(
    (mockObject: MockObject3D, dist: number) =>
      translateXLogic(mockObject, dist),
    [objectNodeResolved, distanceNode],
    chainObj3d,
  );
};

const translateYLogic = (
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

export const translateY = (
  objectNode: Node<MockObject3D> | MockObject3D,
  distance: Node<number> | number,
): Node<MockObject3D> => {
  const [objectNodeResolved, distanceNode] =
    convertToNodes.mockObjectAndDistance(objectNode, distance);
  return apply(
    (mockObject: MockObject3D, dist: number) =>
      translateYLogic(mockObject, dist),
    [objectNodeResolved, distanceNode],
    chainObj3d,
  );
};

const translateZLogic = (
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

export const translateZ = (
  objectNode: Node<MockObject3D> | MockObject3D,
  distance: Node<number> | number,
): Node<MockObject3D> => {
  const [objectNodeResolved, distanceNode] =
    convertToNodes.mockObjectAndDistance(objectNode, distance);
  return apply(
    (mockObject: MockObject3D, dist: number) =>
      translateZLogic(mockObject, dist),
    [objectNodeResolved, distanceNode],
    chainObj3d,
  );
};

const rotateXLogic = (
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

export const rotateX = (
  objectNode: Node<MockObject3D> | MockObject3D,
  angle: Node<number> | number,
): Node<MockObject3D> => {
  const [objectNodeResolved, angleNode] = convertToNodes.mockObjectAndAngle(
    objectNode,
    angle,
  );
  return apply(
    (mockObject: MockObject3D, ang: number) => rotateXLogic(mockObject, ang),
    [objectNodeResolved, angleNode],
    chainObj3d,
  );
};

const rotateYLogic = (
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

export const rotateY = (
  objectNode: Node<MockObject3D> | MockObject3D,
  angle: Node<number> | number,
): Node<MockObject3D> => {
  const [objectNodeResolved, angleNode] = convertToNodes.mockObjectAndAngle(
    objectNode,
    angle,
  );
  return apply(
    (mockObject: MockObject3D, ang: number) => rotateYLogic(mockObject, ang),
    [objectNodeResolved, angleNode],
    chainObj3d,
  );
};

const rotateZLogic = (
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

export const rotateZ = (
  objectNode: Node<MockObject3D> | MockObject3D,
  angle: Node<number> | number,
): Node<MockObject3D> => {
  const [objectNodeResolved, angleNode] = convertToNodes.mockObjectAndAngle(
    objectNode,
    angle,
  );
  return apply(
    (mockObject: MockObject3D, ang: number) => rotateZLogic(mockObject, ang),
    [objectNodeResolved, angleNode],
    chainObj3d,
  );
};

// Mock object integration function
export const applyMock = (
  objectNode: Node<MockObject3D>,
  mock: MockObject3D,
): Node<MockObject3D> =>
  apply(
    (existingMock: MockObject3D) => {
      // Merge the new mock properties with the existing mock
      return {
        ...existingMock,
        ...mock,
        // Special handling for userData to merge instead of replace
        userData: {
          ...existingMock.userData,
          ...mock.userData,
        },
      };
    },
    [objectNode],
    chainObj3d,
  );

// Set up the chain object after all functions are defined - directly use logic functions
chainObj3d.render = {
  fn: (
    objectNode: Node<MockObject3D> | MockObject3D,
    objectName: Node<string> | string,
  ) => {
    const [objectNodeResolved, objectNameNode] =
      convertToNodes.mockObjectAndName(objectNode, objectName);
    return apply(
      (mockObject: MockObject3D, name: string) => renderLogic(mockObject, name),
      [objectNodeResolved, objectNameNode],
      chainObj3d,
    );
  },
  chain: () => chainObj3d,
};

chainObj3d.translateX = {
  fn: (
    objectNode: Node<MockObject3D> | MockObject3D,
    distance: Node<number> | number,
  ) => {
    const [objectNodeResolved, distanceNode] =
      convertToNodes.mockObjectAndDistance(objectNode, distance);
    return apply(
      (mockObject: MockObject3D, dist: number) =>
        translateXLogic(mockObject, dist),
      [objectNodeResolved, distanceNode],
      chainObj3d,
    );
  },
  chain: () => chainObj3d,
};

chainObj3d.translateY = {
  fn: (
    objectNode: Node<MockObject3D> | MockObject3D,
    distance: Node<number> | number,
  ) => {
    const [objectNodeResolved, distanceNode] =
      convertToNodes.mockObjectAndDistance(objectNode, distance);
    return apply(
      (mockObject: MockObject3D, dist: number) =>
        translateYLogic(mockObject, dist),
      [objectNodeResolved, distanceNode],
      chainObj3d,
    );
  },
  chain: () => chainObj3d,
};

chainObj3d.translateZ = {
  fn: (
    objectNode: Node<MockObject3D> | MockObject3D,
    distance: Node<number> | number,
  ) => {
    const [objectNodeResolved, distanceNode] =
      convertToNodes.mockObjectAndDistance(objectNode, distance);
    return apply(
      (mockObject: MockObject3D, dist: number) =>
        translateZLogic(mockObject, dist),
      [objectNodeResolved, distanceNode],
      chainObj3d,
    );
  },
  chain: () => chainObj3d,
};

chainObj3d.rotateX = {
  fn: (
    objectNode: Node<MockObject3D> | MockObject3D,
    angle: Node<number> | number,
  ) => {
    const [objectNodeResolved, angleNode] = convertToNodes.mockObjectAndAngle(
      objectNode,
      angle,
    );
    return apply(
      (mockObject: MockObject3D, ang: number) => rotateXLogic(mockObject, ang),
      [objectNodeResolved, angleNode],
      chainObj3d,
    );
  },
  chain: () => chainObj3d,
};

chainObj3d.rotateY = {
  fn: (
    objectNode: Node<MockObject3D> | MockObject3D,
    angle: Node<number> | number,
  ) => {
    const [objectNodeResolved, angleNode] = convertToNodes.mockObjectAndAngle(
      objectNode,
      angle,
    );
    return apply(
      (mockObject: MockObject3D, ang: number) => rotateYLogic(mockObject, ang),
      [objectNodeResolved, angleNode],
      chainObj3d,
    );
  },
  chain: () => chainObj3d,
};

chainObj3d.rotateZ = {
  fn: (
    objectNode: Node<MockObject3D> | MockObject3D,
    angle: Node<number> | number,
  ) => {
    const [objectNodeResolved, angleNode] = convertToNodes.mockObjectAndAngle(
      objectNode,
      angle,
    );
    return apply(
      (mockObject: MockObject3D, ang: number) => rotateZLogic(mockObject, ang),
      [objectNodeResolved, angleNode],
      chainObj3d,
    );
  },
  chain: () => chainObj3d,
};

chainObj3d.applyMock = { fn: applyMock, chain: () => chainObj3d };

export { chainObj3d };
