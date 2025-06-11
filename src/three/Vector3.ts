export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vector3Like {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function set(v: Vector3, x: number, y: number, z: number): void {
  v.x = x;
  v.y = y;
  v.z = z;
}

export function setScalar(v: Vector3, scalar: number): void {
  v.x = scalar;
  v.y = scalar;
  v.z = scalar;
}

export function setX(v: Vector3, x: number): void {
  v.x = x;
}

export function setY(v: Vector3, y: number): void {
  v.y = y;
}

export function setZ(v: Vector3, z: number): void {
  v.z = z;
}

export function setComponent(v: Vector3, index: number, value: number): void {
  switch (index) {
    case 0:
      v.x = value;
      break;
    case 1:
      v.y = value;
      break;
    case 2:
      v.z = value;
      break;
    default:
      throw new Error('Index out of range');
  }
}

export function getComponent(v: Vector3, index: number): number {
  switch (index) {
    case 0:
      return v.x;
    case 1:
      return v.y;
    case 2:
      return v.z;
    default:
      throw new Error('Index out of range');
  }
}

export function clone(v: Vector3): Vector3 {
  return { x: v.x, y: v.y, z: v.z };
}

export function copy(dest: Vector3, src: Vector3Like): void {
  dest.x = src.x;
  dest.y = src.y;
  dest.z = src.z;
}

export function add(dest: Vector3, v: Vector3Like): void {
  dest.x += v.x;
  dest.y += v.y;
  dest.z += v.z;
}

export function addScalar(v: Vector3, s: number): void {
  v.x += s;
  v.y += s;
  v.z += s;
}

export function addVectors(dest: Vector3, a: Vector3Like, b: Vector3Like): void {
  dest.x = a.x + b.x;
  dest.y = a.y + b.y;
  dest.z = a.z + b.z;
}

export function addScaledVector(v: Vector3, vector: Vector3, s: number): void {
  v.x += vector.x * s;
  v.y += vector.y * s;
  v.z += vector.z * s;
}

export function sub(dest: Vector3, a: Vector3Like): void {
  dest.x -= a.x;
  dest.y -= a.y;
  dest.z -= a.z;
}

export function subScalar(v: Vector3, s: number): void {
  v.x -= s;
  v.y -= s;
  v.z -= s;
}

export function subVectors(dest: Vector3, a: Vector3Like, b: Vector3Like): void {
  dest.x = a.x - b.x;
  dest.y = a.y - b.y;
  dest.z = a.z - b.z;
}

export function multiply(v: Vector3, vector: Vector3Like): void {
  v.x *= vector.x;
  v.y *= vector.y;
  v.z *= vector.z;
}

export function multiplyScalar(v: Vector3, s: number): void {
  v.x *= s;
  v.y *= s;
  v.z *= s;
}

export function multiplyVectors(dest: Vector3, a: Vector3Like, b: Vector3Like): void {
  dest.x = a.x * b.x;
  dest.y = a.y * b.y;
  dest.z = a.z * b.z;
}

// Note: The following methods require additional types or imports that are not available in this context
// and would need to be implemented with proper type definitions:
// applyEuler, applyAxisAngle, applyMatrix3, applyNormalMatrix, applyMatrix4, applyQuaternion,
// project, unproject, transformDirection

export function divide(v: Vector3, vector: Vector3Like): void {
  v.x /= vector.x;
  v.y /= vector.y;
  v.z /= vector.z;
}

export function divideScalar(v: Vector3, s: number): void {
  if (s !== 0) {
    const invS = 1 / s;
    v.x *= invS;
    v.y *= invS;
    v.z *= invS;
  } else {
    v.x = 0;
    v.y = 0;
    v.z = 0;
  }
}

export function min(v: Vector3, vector: Vector3Like): void {
  if (vector.x < v.x) v.x = vector.x;
  if (vector.y < v.y) v.y = vector.y;
  if (vector.z < v.z) v.z = vector.z;
}

export function max(v: Vector3, vector: Vector3Like): void {
  if (vector.x > v.x) v.x = vector.x;
  if (vector.y > v.y) v.y = vector.y;
  if (vector.z > v.z) v.z = vector.z;
}

export function clamp(v: Vector3, min: Vector3Like, max: Vector3Like): void {
  if (v.x < min.x) v.x = min.x;
  if (v.y < min.y) v.y = min.y;
  if (v.z < min.z) v.z = min.z;

  if (v.x > max.x) v.x = max.x;
  if (v.y > max.y) v.y = max.y;
  if (v.z > max.z) v.z = max.z;
}

export function clampScalar(v: Vector3, min: number, max: number): void {
  if (v.x < min) v.x = min;
  if (v.y < min) v.y = min;
  if (v.z < min) v.z = min;

  if (v.x > max) v.x = max;
  if (v.y > max) v.y = max;
  if (v.z > max) v.z = max;
}

export function clampLength(v: Vector3, min: number, max: number): void {
  const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (length < min) {
    multiplyScalar(v, min / length);
  } else if (length > max) {
    multiplyScalar(v, max / length);
  }
}

export function floor(v: Vector3): void {
  v.x = Math.floor(v.x);
  v.y = Math.floor(v.y);
  v.z = Math.floor(v.z);
}

export function ceil(v: Vector3): void {
  v.x = Math.ceil(v.x);
  v.y = Math.ceil(v.y);
  v.z = Math.ceil(v.z);
}

export function round(v: Vector3): void {
  v.x = Math.round(v.x);
  v.y = Math.round(v.y);
  v.z = Math.round(v.z);
}

export function roundToZero(v: Vector3): void {
  v.x = v.x < 0 ? Math.ceil(v.x) : Math.floor(v.x);
  v.y = v.y < 0 ? Math.ceil(v.y) : Math.floor(v.y);
  v.z = v.z < 0 ? Math.ceil(v.z) : Math.floor(v.z);
}

export function negate(v: Vector3): void {
  v.x = -v.x;
  v.y = -v.y;
  v.z = -v.z;
}

export function dot(a: Vector3Like, b: Vector3Like): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function lengthSq(v: Vector3): number {
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

export function length(v: Vector3): number {
  return Math.sqrt(lengthSq(v));
}

export function manhattanLength(v: Vector3): number {
  return Math.abs(v.x) + Math.abs(v.y) + Math.abs(v.z);
}

export function normalize(v: Vector3): void {
  const l = length(v);
  if (l !== 0) {
    v.x /= l;
    v.y /= l;
    v.z /= l;
  }
}

export function setLength(v: Vector3, len: number): void {
  normalize(v);
  multiplyScalar(v, len);
}

export function lerp(dest: Vector3, target: Vector3Like, alpha: number): void {
  dest.x += (target.x - dest.x) * alpha;
  dest.y += (target.y - dest.y) * alpha;
  dest.z += (target.z - dest.z) * alpha;
}

export function lerpVectors(dest: Vector3, v1: Vector3Like, v2: Vector3Like, alpha: number): void {
  dest.x = v1.x + (v2.x - v1.x) * alpha;
  dest.y = v1.y + (v2.y - v1.y) * alpha;
  dest.z = v1.z + (v2.z - v1.z) * alpha;
}

export function cross(dest: Vector3, a: Vector3Like): void {
  const x = dest.y * a.z - dest.z * a.y;
  const y = dest.z * a.x - dest.x * a.z;
  const z = dest.x * a.y - dest.y * a.x;
  dest.x = x;
  dest.y = y;
  dest.z = z;
}

export function crossVectors(dest: Vector3, a: Vector3Like, b: Vector3Like): void {
  dest.x = a.y * b.z - a.z * b.y;
  dest.y = a.z * b.x - a.x * b.z;
  dest.z = a.x * b.y - a.y * b.x;
}

export function projectOnVector(dest: Vector3, vector: Vector3): void {
  const scalar = dot(dest, vector) / lengthSq(vector);
  multiplyScalar(dest, scalar);
}

export function projectOnPlane(dest: Vector3, planeNormal: Vector3): void {
  projectOnVector(dest, planeNormal);
  sub(dest, planeNormal);
}

export function reflect(dest: Vector3, normal: Vector3Like): void {
  const scalar = dot(dest, normal) * 2;
  dest.x -= scalar * normal.x;
  dest.y -= scalar * normal.y;
  dest.z -= scalar * normal.z;
}

export function angleTo(a: Vector3, b: Vector3): number {
  const theta = dot(a, b) / (Math.sqrt(lengthSq(a)) * Math.sqrt(lengthSq(b)));
  if (theta < -1.0) return Math.PI;
  else if (theta > 1.0) return 0.0;
  else return Math.acos(theta);
}

export function distanceTo(a: Vector3, b: Vector3Like): number {
  const x = a.x - b.x;
  const y = a.y - b.y;
  const z = a.z - b.z;
  return Math.sqrt(x * x + y * y + z * z);
}

export function distanceToSquared(a: Vector3, b: Vector3Like): number {
  const x = a.x - b.x;
  const y = a.y - b.y;
  const z = a.z - b.z;
  return x * x + y * y + z * z;
}

export function manhattanDistanceTo(a: Vector3, b: Vector3Like): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
}

// Note: The following methods require additional types or imports that are not available in this context
// and would need to be implemented with proper type definitions:
// setFromSpherical, setFromSphericalCoords, setFromCylindrical, setFromCylindricalCoords,
// setFromMatrixPosition, setFromMatrixScale, setFromMatrixColumn, setFromMatrix3Column,
// setFromEuler, setFromColor

export function equals(a: Vector3Like, b: Vector3Like): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

export function fromArray(v: Vector3, array: number[], offset?: number): void {
  if (offset === undefined) offset = 0;
  v.x = array[offset];
  v.y = array[offset + 1];
  v.z = array[offset + 2];
}

export function toArray(v: Vector3, array?: number[], offset?: number): number[] {
  if (array === undefined) array = [];
  if (offset === undefined) offset = 0;
  array[offset] = v.x;
  array[offset + 1] = v.y;
  array[offset + 2] = v.z;
  return array;
}

// Note: The following methods require additional types or imports that are not available in this context
// and would need to be implemented with proper type definitions:
// fromBufferAttribute, random, randomDirection

export function cloneVector3(v: Vector3): Vector3 {
  return { x: v.x, y: v.y, z: v.z };
}