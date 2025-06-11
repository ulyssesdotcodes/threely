import * as Vector3 from '../Vector3';

describe('Vector3', () => {
  let vector: Vector3.Vector3;

  beforeEach(() => {
    vector = { x: 0, y: 0, z: 0 };
  });

  it('set should set vector components', () => {
    Vector3.set(vector, 1, 2, 3);
    expect(vector.x).toBe(1);
    expect(vector.y).toBe(2);
    expect(vector.z).toBe(3);
  });

  it('setScalar should set all components to scalar value', () => {
    Vector3.setScalar(vector, 5);
    expect(vector.x).toBe(5);
    expect(vector.y).toBe(5);
    expect(vector.z).toBe(5);
  });

  it('setX should set x component', () => {
    Vector3.setX(vector, 10);
    expect(vector.x).toBe(10);
    expect(vector.y).toBe(0);
    expect(vector.z).toBe(0);
  });

  it('setY should set y component', () => {
    Vector3.setY(vector, 20);
    expect(vector.x).toBe(0);
    expect(vector.y).toBe(20);
    expect(vector.z).toBe(0);
  });

  it('setZ should set z component', () => {
    Vector3.setZ(vector, 30);
    expect(vector.x).toBe(0);
    expect(vector.y).toBe(0);
    expect(vector.z).toBe(30);
  });

  it('setComponent should set component by index', () => {
    Vector3.setComponent(vector, 0, 10);
    Vector3.setComponent(vector, 1, 20);
    Vector3.setComponent(vector, 2, 30);
    expect(vector.x).toBe(10);
    expect(vector.y).toBe(20);
    expect(vector.z).toBe(30);
  });

  it('getComponent should get component by index', () => {
    vector = { x: 10, y: 20, z: 30 };
    expect(Vector3.getComponent(vector, 0)).toBe(10);
    expect(Vector3.getComponent(vector, 1)).toBe(20);
    expect(Vector3.getComponent(vector, 2)).toBe(30);
  });

  it('clone should create a copy of the vector', () => {
    const original = { x: 1, y: 2, z: 3 };
    const clone = Vector3.clone(original);
    expect(clone.x).toBe(1);
    expect(clone.y).toBe(2);
    expect(clone.z).toBe(3);
  });

  it('copy should copy vector components', () => {
    const source = { x: 4, y: 5, z: 6 };
    Vector3.copy(vector, source);
    expect(vector.x).toBe(4);
    expect(vector.y).toBe(5);
    expect(vector.z).toBe(6);
  });

  it('add should add vector components', () => {
    const v = { x: 1, y: 2, z: 3 };
    Vector3.add(vector, v);
    expect(vector.x).toBe(1);
    expect(vector.y).toBe(2);
    expect(vector.z).toBe(3);
  });

  it('addScalar should add scalar to each component', () => {
    Vector3.addScalar(vector, 5);
    expect(vector.x).toBe(5);
    expect(vector.y).toBe(5);
    expect(vector.z).toBe(5);
  });

  it('addVectors should add two vectors', () => {
    const a = { x: 1, y: 2, z: 3 };
    const b = { x: 4, y: 5, z: 6 };
    Vector3.addVectors(vector, a, b);
    expect(vector.x).toBe(5);
    expect(vector.y).toBe(7);
    expect(vector.z).toBe(9);
  });

  it('addScaledVector should add scaled vector', () => {
    const v = { x: 1, y: 2, z: 3 };
    Vector3.addScaledVector(vector, v, 5);
    expect(vector.x).toBe(5);
    expect(vector.y).toBe(10);
    expect(vector.z).toBe(15);
  });

  it('sub should subtract vector components', () => {
    const v = { x: 1, y: 2, z: 3 };
    Vector3.sub(vector, v);
    expect(vector.x).toBe(-1);
    expect(vector.y).toBe(-2);
    expect(vector.z).toBe(-3);
  });

  it('subScalar should subtract scalar from each component', () => {
    vector = { x: 5, y: 5, z: 5 };
    Vector3.subScalar(vector, 2);
    expect(vector.x).toBe(3);
    expect(vector.y).toBe(3);
    expect(vector.z).toBe(3);
  });

  it('subVectors should subtract two vectors', () => {
    const a = { x: 5, y: 5, z: 5 };
    const b = { x: 1, y: 2, z: 3 };
    Vector3.subVectors(vector, a, b);
    expect(vector.x).toBe(4);
    expect(vector.y).toBe(3);
    expect(vector.z).toBe(2);
  });

  it('multiply should multiply vector components', () => {
    const v = { x: 2, y: 2, z: 2 };
    Vector3.multiply(vector, v);
    expect(vector.x).toBe(0);
    expect(vector.y).toBe(0);
    expect(vector.z).toBe(0);
  });

  it('multiplyScalar should multiply each component by scalar', () => {
    Vector3.multiplyScalar(vector, 5);
    expect(vector.x).toBe(0);
    expect(vector.y).toBe(0);
    expect(vector.z).toBe(0);
  });

  it('multiplyVectors should multiply two vectors component-wise', () => {
    const a = { x: 2, y: 2, z: 2 };
    const b = { x: 3, y: 3, z: 3 };
    Vector3.multiplyVectors(vector, a, b);
    expect(vector.x).toBe(6);
    expect(vector.y).toBe(6);
    expect(vector.z).toBe(6);
  });

  it('divide should divide vector components', () => {
    const v = { x: 2, y: 2, z: 2 };
    Vector3.divide(vector, v);
    expect(vector.x).toBe(0);
    expect(vector.y).toBe(0);
    expect(vector.z).toBe(0);
  });

  it('divideScalar should divide each component by scalar', () => {
    vector = { x: 10, y: 10, z: 10 };
    Vector3.divideScalar(vector, 2);
    expect(vector.x).toBe(5);
    expect(vector.y).toBe(5);
    expect(vector.z).toBe(5);
  });

  it('min should set component to minimum value', () => {
    const v = { x: -1, y: -2, z: -3 };
    Vector3.min(vector, v);
    expect(vector.x).toBe(-1);
    expect(vector.y).toBe(-2);
    expect(vector.z).toBe(-3);
  });

  it('max should set component to maximum value', () => {
    const v = { x: 5, y: 6, z: 7 };
    Vector3.max(vector, v);
    expect(vector.x).toBe(5);
    expect(vector.y).toBe(6);
    expect(vector.z).toBe(7);
  });

  it('clamp should clamp vector components', () => {
    const min = { x: 0, y: 0, z: 0 };
    const max = { x: 10, y: 10, z: 10 };
    Vector3.clamp(vector, min, max);
    expect(vector.x).toBe(0);
    expect(vector.y).toBe(0);
    expect(vector.z).toBe(0);
  });

  it('clampScalar should clamp vector components to scalar range', () => {
    vector = { x: -5, y: 15, z: 25 };
    Vector3.clampScalar(vector, 0, 10);
    expect(vector.x).toBe(0);
    expect(vector.y).toBe(10);
    expect(vector.z).toBe(10);
  });

  it('clampLength should clamp vector length', () => {
    vector = { x: 5, y: 0, z: 0 };
    Vector3.clampLength(vector, 1, 10);
    expect(Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z)).toBeCloseTo(5);
  });

  it('floor should round down vector components', () => {
    vector = { x: 1.7, y: 2.3, z: 3.9 };
    Vector3.floor(vector);
    expect(Math.floor(vector.x)).toBe(1);
    expect(Math.floor(vector.y)).toBe(2);
    expect(Math.floor(vector.z)).toBe(3);
  });

  it('ceil should round up vector components', () => {
    vector = { x: 1.1, y: 2.2, z: 3.3 };
    Vector3.ceil(vector);
    expect(Math.ceil(vector.x)).toBe(2);
    expect(Math.ceil(vector.y)).toBe(3);
    expect(Math.ceil(vector.z)).toBe(4);
  });

  it('round should round vector components', () => {
    vector = { x: 1.5, y: 2.6, z: 3.7 };
    Vector3.round(vector);
    expect(Math.round(vector.x)).toBe(2);
    expect(Math.round(vector.y)).toBe(3);
    expect(Math.round(vector.z)).toBe(4);
  });

  it('roundToZero should round towards zero', () => {
    vector = { x: -1.7, y: 2.3, z: 3.9 };
    Vector3.roundToZero(vector);
    expect(Math.ceil(vector.x)).toBe(-1);
    expect(Math.floor(vector.y)).toBe(2);
    expect(Math.floor(vector.z)).toBe(3);
  });

  it('negate should negate vector components', () => {
    vector = { x: 1, y: -2, z: 3 };
    Vector3.negate(vector);
    expect(vector.x).toBe(-1);
    expect(vector.y).toBe(2);
    expect(vector.z).toBe(-3);
  });

  it('dot should calculate dot product', () => {
    const a = { x: 1, y: 2, z: 3 };
    const b = { x: 4, y: 5, z: 6 };
    const result = Vector3.dot(a, b);
    expect(result).toBe(32); // 1*4 + 2*5 + 3*6
  });

  it('lengthSq should calculate squared length', () => {
    vector = { x: 1, y: 2, z: 3 };
    const result = Vector3.lengthSq(vector);
    expect(result).toBe(14); // 1^2 + 2^2 + 3^2
  });

  it('length should calculate length', () => {
    vector = { x: 1, y: 2, z: 3 };
    const result = Vector3.length(vector);
    expect(result).toBeCloseTo(3.7416573867739413); // sqrt(1^2 + 2^2 + 3^2)
  });

  it('manhattanLength should calculate Manhattan length', () => {
    vector = { x: 1, y: -2, z: 3 };
    const result = Vector3.manhattanLength(vector);
    expect(result).toBe(6); // |1| + |-2| + |3|
  });

  it('normalize should normalize the vector', () => {
    vector = { x: 1, y: 2, z: 3 };
    Vector3.normalize(vector);
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    expect(length).toBeCloseTo(1); // Normalized vector should have length of 1
  });

  it('setLength should set the vector length', () => {
    vector = { x: 1, y: 2, z: 3 };
    Vector3.setLength(vector, 5);
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    expect(length).toBeCloseTo(5); // Vector should have length of 5
  });

  it('lerp should linearly interpolate', () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 10, y: 10, z: 10 };
    Vector3.lerp(vector, b, 0.5);
    expect(vector.x).toBeCloseTo(5);
    expect(vector.y).toBeCloseTo(5);
    expect(vector.z).toBeCloseTo(5);
  });

  it('lerpVectors should linearly interpolate two vectors', () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 10, y: 10, z: 10 };
    Vector3.lerpVectors(vector, a, b, 0.5);
    expect(vector.x).toBeCloseTo(5);
    expect(vector.y).toBeCloseTo(5);
    expect(vector.z).toBeCloseTo(5);
  });

  it('cross should calculate cross product', () => {
    const a = { x: 1, y: 0, z: 0 };
    const b = { x: 0, y: 1, z: 0 };
    Vector3.cross(vector, a);
    expect(vector.x).toBeCloseTo(0);
    expect(vector.y).toBeCloseTo(0);
    expect(vector.z).toBeCloseTo(1); // Cross product of X and Y axes is Z axis
  });

  it('crossVectors should calculate cross product of two vectors', () => {
    const a = { x: 1, y: 0, z: 0 };
    const b = { x: 0, y: 1, z: 0 };
    Vector3.crossVectors(vector, a, b);
    expect(vector.x).toBeCloseTo(0);
    expect(vector.y).toBeCloseTo(0);
    expect(vector.z).toBeCloseTo(1); // Cross product of X and Y axes is Z axis
  });

  it('projectOnVector should project vector onto another vector', () => {
    const v = { x: 2, y: 0, z: 0 };
    Vector3.projectOnVector(vector, v);
    expect(vector.x).toBeCloseTo(0); // Projected onto X axis
    expect(vector.y).toBeCloseTo(0);
    expect(vector.z).toBeCloseTo(0);
  });

  it('projectOnPlane should project vector onto a plane', () => {
    const planeNormal = { x: 0, y: 1, z: 0 };
    Vector3.projectOnPlane(vector, planeNormal);
    expect(vector.x).toBeCloseTo(0); // Projected onto XY plane
    expect(vector.y).toBeCloseTo(0);
    expect(vector.z).toBeCloseTo(0);
  });

  it('reflect should reflect vector across a normal', () => {
    const normal = { x: 1, y: 0, z: 0 };
    Vector3.reflect(vector, normal);
    expect(vector.x).toBeCloseTo(-1); // Reflected across X axis
    expect(vector.y).toBeCloseTo(0);
    expect(vector.z).toBeCloseTo(0);
  });

  it('angleTo should calculate angle between two vectors', () => {
    const a = { x: 1, y: 0, z: 0 };
    const b = { x: 0, y: 1, z: 0 };
    const angle = Vector3.angleTo(a, b);
    expect(angle).toBeCloseTo(Math.PI / 2); // 90 degrees between X and Y axes
  });

  it('distanceTo should calculate distance to another vector', () => {
    const a = { x: 1, y: 0, z: 0 };
    const b = { x: 0, y: 1, z: 0 };
    const distance = Vector3.distanceTo(a, b);
    expect(distance).toBeCloseTo(Math.SQRT2); // Distance between points (1,0) and (0,1)
  });

  it('distanceToSquared should calculate squared distance to another vector', () => {
    const a = { x: 1, y: 0, z: 0 };
    const b = { x: 0, y: 1, z: 0 };
    const distance = Vector3.distanceToSquared(a, b);
    expect(distance).toBeCloseTo(2); // Squared distance between points (1,0) and (0,1)
  });

  it('manhattanDistanceTo should calculate Manhattan distance to another vector', () => {
    const a = { x: 1, y: -2, z: 3 };
    const b = { x: 4, y: 5, z: 6 };
    const distance = Vector3.manhattanDistanceTo(a, b);
    expect(distance).toBe(12); // |4-1| + |5+2| + |6-3|
  });

  it('equals should check vector equality', () => {
    const a = { x: 1, y: 2, z: 3 };
    const b = { x: 1, y: 2, z: 3 };
    expect(Vector3.equals(a, b)).toBe(true);
  });

  it('fromArray should set vector components from array', () => {
    Vector3.fromArray(vector, [1, 2, 3]);
    expect(vector.x).toBe(1);
    expect(vector.y).toBe(2);
    expect(vector.z).toBe(3);
  });

  it('toArray should convert vector to array', () => {
    vector = { x: 1, y: 2, z: 3 };
    const array = Vector3.toArray(vector);
    expect(array[0]).toBe(1);
    expect(array[1]).toBe(2);
    expect(array[2]).toBe(3);
  });

  it('cloneVector3 should create a copy of the vector', () => {
    const original = { x: 1, y: 2, z: 3 };
    const clone = Vector3.cloneVector3(original);
    expect(clone.x).toBe(1);
    expect(clone.y).toBe(2);
    expect(clone.z).toBe(3);
  });
});