import { Vector3, Euler, Quaternion, Object3D, Mesh, SphereGeometry, BoxGeometry, CylinderGeometry, BufferGeometry, Material } from 'three';

/**
 * Flexible vector-like type that can be a Vector3, array, or individual values
 */
export type Vector3Like = Vector3 | [number, number, number] | { x: number; y: number; z: number };

/**
 * Flexible rotation type that can be an Euler, array, or individual values
 */
export type EulerLike = Euler | [number, number, number] | { x: number; y: number; z: number; order?: string };

/**
 * Flexible quaternion type that can be a Quaternion, array, or individual values
 */
export type QuaternionLike = Quaternion | [number, number, number, number] | { x: number; y: number; z: number; w: number };

/**
 * Mock geometry specifications for different geometry types
 */
export type MockSphereGeometry = {
  type: 'sphere';
  radius?: number;
  widthSegments?: number;
  heightSegments?: number;
};

export type MockBoxGeometry = {
  type: 'box';
  width?: number;
  height?: number;
  depth?: number;
};

export type MockCylinderGeometry = {
  type: 'cylinder';
  radiusTop?: number;
  radiusBottom?: number;
  height?: number;
  radialSegments?: number;
};

/**
 * Union type for all mock geometry types
 */
export type MockGeometry = MockSphereGeometry | MockBoxGeometry | MockCylinderGeometry;

/**
 * Mock Object3D interface with all optional properties
 * Allows partial specification of 3D object properties for testing and prototyping
 */
export type MockObject3D = {
  /** Position in 3D space */
  position?: Vector3Like;
  /** Rotation using Euler angles */
  rotation?: EulerLike;
  /** Scale along X, Y, Z axes */
  scale?: Vector3Like;
  /** Rotation using quaternion (alternative to Euler) */
  quaternion?: QuaternionLike;
  /** Whether the object is visible */
  visible?: boolean;
  /** Object name/identifier */
  name?: string;
  /** Custom user data */
  userData?: any;
  /** Whether the object casts shadows */
  castShadow?: boolean;
  /** Whether the object receives shadows */
  receiveShadow?: boolean;
  /** Render order for transparency sorting */
  renderOrder?: number;
  /** Whether matrices should be updated automatically */
  matrixAutoUpdate?: boolean;
  /** Mock geometry specification for mesh objects */
  geometry?: MockGeometry;
};

/**
 * Utility functions for creating common mock property patterns
 */
export const mockUtils = {
  /**
   * Create a position vector from individual values
   */
  position: (x: number, y: number, z: number): Vector3Like => ({ x, y, z }),

  /**
   * Create a rotation from individual values in degrees (converted to radians)
   */
  rotation: (x: number, y: number, z: number): EulerLike => ({
    x: (x * Math.PI) / 180,
    y: (y * Math.PI) / 180,
    z: (z * Math.PI) / 180,
  }),

  /**
   * Create a rotation from individual values in radians
   */
  rotationRad: (x: number, y: number, z: number): EulerLike => ({ x, y, z }),

  /**
   * Create a uniform scale (same value for all axes)
   */
  scale: (factor: number): Vector3Like => ({ x: factor, y: factor, z: factor }),

  /**
   * Create a non-uniform scale
   */
  scaleXYZ: (x: number, y: number, z: number): Vector3Like => ({ x, y, z }),

  /**
   * Create a quaternion from axis-angle representation
   */
  quaternionFromAxisAngle: (axis: Vector3Like, angle: number): QuaternionLike => {
    const axisVector = normalizeVector3Like(axis);
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);
    return {
      x: axisVector.x * s,
      y: axisVector.y * s,
      z: axisVector.z * s,
      w: Math.cos(halfAngle),
    };
  },

  /**
   * Create a mock sphere geometry
   */
  sphereGeometry: (radius: number = 1, widthSegments: number = 32, heightSegments: number = 16): MockSphereGeometry => ({
    type: 'sphere',
    radius,
    widthSegments,
    heightSegments,
  }),

  /**
   * Create a mock box geometry
   */
  boxGeometry: (width: number = 1, height: number = 1, depth: number = 1): MockBoxGeometry => ({
    type: 'box',
    width,
    height,
    depth,
  }),

  /**
   * Create a mock cylinder geometry
   */
  cylinderGeometry: (radiusTop: number = 1, radiusBottom: number = 1, height: number = 1, radialSegments: number = 32): MockCylinderGeometry => ({
    type: 'cylinder',
    radiusTop,
    radiusBottom,
    height,
    radialSegments,
  }),
};

/**
 * Normalize a Vector3Like to a consistent { x, y, z } format
 */
export function normalizeVector3Like(vector: Vector3Like): { x: number; y: number; z: number } {
  if (Array.isArray(vector)) {
    return { x: vector[0], y: vector[1], z: vector[2] };
  }
  if (vector instanceof Vector3) {
    return { x: vector.x, y: vector.y, z: vector.z };
  }
  return vector;
}

/**
 * Normalize an EulerLike to a consistent { x, y, z, order? } format
 */
export function normalizeEulerLike(euler: EulerLike): { x: number; y: number; z: number; order?: string } {
  if (Array.isArray(euler)) {
    return { x: euler[0], y: euler[1], z: euler[2] };
  }
  if (euler instanceof Euler) {
    return { x: euler.x, y: euler.y, z: euler.z, order: euler.order };
  }
  return euler;
}

/**
 * Normalize a QuaternionLike to a consistent { x, y, z, w } format
 */
export function normalizeQuaternionLike(quaternion: QuaternionLike): { x: number; y: number; z: number; w: number } {
  if (Array.isArray(quaternion)) {
    return { x: quaternion[0], y: quaternion[1], z: quaternion[2], w: quaternion[3] };
  }
  if (quaternion instanceof Quaternion) {
    return { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w };
  }
  return quaternion;
}

/**
 * Create Three.js geometry from mock geometry specification
 */
export function createGeometryFromMock(mock: MockGeometry): BufferGeometry {
  switch (mock.type) {
    case 'sphere':
      return new SphereGeometry(
        mock.radius ?? 1,
        mock.widthSegments ?? 32,
        mock.heightSegments ?? 16
      );
    case 'box':
      return new BoxGeometry(
        mock.width ?? 1,
        mock.height ?? 1,
        mock.depth ?? 1
      );
    case 'cylinder':
      return new CylinderGeometry(
        mock.radiusTop ?? 1,
        mock.radiusBottom ?? 1,
        mock.height ?? 1,
        mock.radialSegments ?? 32
      );
    default:
      // @ts-ignore - exhaustiveness check
      throw new Error(`Unknown geometry type: ${mock.type}`);
  }
}

/**
 * Validate that a number is within a reasonable range
 */
export function validateNumber(value: number, min?: number, max?: number, name?: string): boolean {
  if (!isFinite(value)) {
    console.warn(`Invalid ${name || 'number'}: ${value} (not finite)`);
    return false;
  }
  if (min !== undefined && value < min) {
    console.warn(`Invalid ${name || 'number'}: ${value} < ${min}`);
    return false;
  }
  if (max !== undefined && value > max) {
    console.warn(`Invalid ${name || 'number'}: ${value} > ${max}`);
    return false;
  }
  return true;
}

/**
 * Apply a MockObject3D to a live Three.js Object3D
 * Safely updates only the specified properties
 */
export function applyMockToObject3D(object: Object3D, mock: MockObject3D): Object3D {
  // Apply position
  if (mock.position !== undefined) {
    const pos = normalizeVector3Like(mock.position);
    if (validateNumber(pos.x, undefined, undefined, 'position.x') &&
        validateNumber(pos.y, undefined, undefined, 'position.y') &&
        validateNumber(pos.z, undefined, undefined, 'position.z')) {
      object.position.set(pos.x, pos.y, pos.z);
    }
  }

  // Apply rotation (Euler takes precedence over quaternion if both are specified)
  if (mock.rotation !== undefined) {
    const rot = normalizeEulerLike(mock.rotation);
    if (validateNumber(rot.x, undefined, undefined, 'rotation.x') &&
        validateNumber(rot.y, undefined, undefined, 'rotation.y') &&
        validateNumber(rot.z, undefined, undefined, 'rotation.z')) {
      object.rotation.set(rot.x, rot.y, rot.z);
      if (rot.order) {
        object.rotation.order = rot.order as any; // Cast needed for Three.js EulerOrder type
      }
    }
  } else if (mock.quaternion !== undefined) {
    const quat = normalizeQuaternionLike(mock.quaternion);
    if (validateNumber(quat.x, undefined, undefined, 'quaternion.x') &&
        validateNumber(quat.y, undefined, undefined, 'quaternion.y') &&
        validateNumber(quat.z, undefined, undefined, 'quaternion.z') &&
        validateNumber(quat.w, undefined, undefined, 'quaternion.w')) {
      object.quaternion.set(quat.x, quat.y, quat.z, quat.w);
    }
  }

  // Apply scale
  if (mock.scale !== undefined) {
    const scale = normalizeVector3Like(mock.scale);
    if (validateNumber(scale.x, 0.001, undefined, 'scale.x') &&
        validateNumber(scale.y, 0.001, undefined, 'scale.y') &&
        validateNumber(scale.z, 0.001, undefined, 'scale.z')) {
      object.scale.set(scale.x, scale.y, scale.z);
    }
  }

  // Apply simple boolean and primitive properties
  if (mock.visible !== undefined) {
    object.visible = mock.visible;
  }

  if (mock.name !== undefined) {
    object.name = mock.name;
  }

  if (mock.userData !== undefined) {
    object.userData = { ...object.userData, ...mock.userData };
  }

  if (mock.castShadow !== undefined) {
    object.castShadow = mock.castShadow;
  }

  if (mock.receiveShadow !== undefined) {
    object.receiveShadow = mock.receiveShadow;
  }

  if (mock.renderOrder !== undefined && validateNumber(mock.renderOrder, 0, undefined, 'renderOrder')) {
    object.renderOrder = mock.renderOrder;
  }

  if (mock.matrixAutoUpdate !== undefined) {
    object.matrixAutoUpdate = mock.matrixAutoUpdate;
  }

  // Apply geometry if specified and object is a Mesh
  if (mock.geometry !== undefined && object instanceof Mesh) {
    // Dispose old geometry
    object.geometry.dispose();
    
    // Create and assign new geometry
    object.geometry = createGeometryFromMock(mock.geometry);
  }

  // Apply material if specified in userData and object is a Mesh
  if (mock.userData?.material !== undefined && object instanceof Mesh) {
    // Dispose old material if it's a Material
    if (object.material instanceof Material) {
      object.material.dispose();
    }
    
    // Assign new material
    object.material = mock.userData.material;
  }

  return object;
}

/**
 * Create a mock object with common presets
 */
export const mockPresets = {
  /** Hidden object */
  hidden: (): MockObject3D => ({ visible: false }),

  /** Object at origin with default properties */
  origin: (): MockObject3D => ({ 
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  }),

  /** Scaled up object */
  large: (factor: number = 2): MockObject3D => ({ scale: mockUtils.scale(factor) }),

  /** Scaled down object */
  small: (factor: number = 0.5): MockObject3D => ({ scale: mockUtils.scale(factor) }),

  /** Object positioned above ground */
  elevated: (height: number = 1): MockObject3D => ({ position: { x: 0, y: height, z: 0 } }),
};