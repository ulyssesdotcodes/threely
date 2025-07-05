import * as BufferGeometry from "../BufferGeometry";
import { Box3, Matrix4, Quaternion, Sphere, Vector2, Vector3 } from "three";

describe("BufferGeometry", () => {
  let geometry: any;

  beforeEach(() => {
    geometry = {};
    geometry.attributes = {};
    geometry.groups = [];
    geometry.boundingBox = new Box3();
    geometry.boundingSphere = new Sphere();
    geometry.drawRange = { start: 0, count: 0 };
    geometry.userData = {};
  });

  it("getIndex should return the index attribute", () => {
    const index = BufferGeometry.setIndex(geometry, [0, 1, 2]);
    expect(BufferGeometry.getIndex(index)).toBeDefined();
  });

  it("setIndex should set the index attribute", () => {
    // Use a number array instead of Float32Array for testing
    const indexArray = [0, 1, 2];
    BufferGeometry.setIndex(geometry, indexArray);
    expect(geometry.index.array).toEqual(indexArray);
  });

  it("getIndirect should return the indirect attribute", () => {
    const indirect = {};
    BufferGeometry.setIndirect(geometry, indirect);
    expect(BufferGeometry.getIndirect(geometry)).toBe(indirect);
  });

  it("setAttribute should set an attribute", () => {
    const position = new Float32Array([0, 1, 2]);
    BufferGeometry.setAttribute(geometry, "position", { array: position });
    expect(geometry.attributes.position.array).toEqual(position);
  });

  it("getAttribute should return an attribute", () => {
    const position = new Float32Array([0, 1, 2]);
    geometry.attributes.position = { array: position };
    expect(BufferGeometry.getAttribute(geometry, "position").array).toEqual(
      position,
    );
  });

  it("deleteAttribute should delete an attribute", () => {
    geometry.attributes.position = {};
    BufferGeometry.deleteAttribute(geometry, "position");
    expect(geometry.attributes.position).toBeUndefined();
  });

  it("hasAttribute should check if an attribute exists", () => {
    geometry.attributes.position = {};
    expect(BufferGeometry.hasAttribute(geometry, "position")).toBe(true);
    expect(BufferGeometry.hasAttribute(geometry, "normal")).toBe(false);
  });

  it("addGroup should add a group", () => {
    BufferGeometry.addGroup(geometry, 0, 3);
    expect(geometry.groups.length).toBe(1);
    expect(geometry.groups[0].start).toBe(0);
    expect(geometry.groups[0].count).toBe(3);
  });

  it("clearGroups should clear all groups", () => {
    geometry.groups.push({ start: 0, count: 3 });
    BufferGeometry.clearGroups(geometry);
    expect(geometry.groups.length).toBe(0);
  });

  it("setDrawRange should set the draw range", () => {
    BufferGeometry.setDrawRange(geometry, 5, 10);
    expect(geometry.drawRange.start).toBe(5);
    expect(geometry.drawRange.count).toBe(10);
  });

  it("applyMatrix4 should apply a matrix to positions", () => {
    geometry.attributes.position = { count: 3 };
    const positionMock = {
      getX: jest.fn().mockReturnValue(1),
      getY: jest.fn().mockReturnValue(2),
      getZ: jest.fn().mockReturnValue(3),
      setXYZ: jest.fn(),
    };
    geometry.attributes.position = positionMock;

    const matrix = new Matrix4().makeTranslation(1, 2, 3);
    BufferGeometry.applyMatrix4(geometry, matrix);

    expect(positionMock.setXYZ).toHaveBeenCalledWith(
      0,
      2, // x + 1
      4, // y + 2
      6, // z + 3
    );
  });

  it("applyQuaternion should apply a quaternion to positions", () => {
    geometry.attributes.position = { count: 3 };
    const positionMock = {
      getX: jest.fn().mockReturnValue(1),
      getY: jest.fn().mockReturnValue(2),
      getZ: jest.fn().mockReturnValue(3),
      setXYZ: jest.fn(),
    };
    geometry.attributes.position = positionMock;

    const quaternion = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      Math.PI / 2,
    );
    BufferGeometry.applyQuaternion(geometry, quaternion);

    expect(positionMock.setXYZ).toHaveBeenCalledWith(
      0,
      -3, // Rotated coordinates
      1,
      2,
    );
  });

  it("rotateX should rotate positions around X axis", () => {
    geometry.attributes.position = { count: 3 };
    const positionMock = {
      getX: jest.fn().mockReturnValue(0),
      getY: jest.fn().mockReturnValue(1),
      getZ: jest.fn().mockReturnValue(0),
      setXYZ: jest.fn(),
    };
    geometry.attributes.position = positionMock;

    BufferGeometry.rotateX(geometry, Math.PI / 2);

    expect(positionMock.setXYZ).toHaveBeenCalledWith(
      0,
      0,
      -1, // Rotated coordinates
      0,
    );
  });

  it("rotateY should rotate positions around Y axis", () => {
    geometry.attributes.position = { count: 3 };
    const positionMock = {
      getX: jest.fn().mockReturnValue(1),
      getY: jest.fn().mockReturnValue(0),
      getZ: jest.fn().mockReturnValue(0),
      setXYZ: jest.fn(),
    };
    geometry.attributes.position = positionMock;

    BufferGeometry.rotateY(geometry, Math.PI / 2);

    expect(positionMock.setXYZ).toHaveBeenCalledWith(
      0,
      1,
      0,
      -0, // Rotated coordinates
    );
  });

  it("rotateZ should rotate positions around Z axis", () => {
    geometry.attributes.position = { count: 3 };
    const positionMock = {
      getX: jest.fn().mockReturnValue(0),
      getY: jest.fn().mockReturnValue(1),
      getZ: jest.fn().mockReturnValue(0),
      setXYZ: jest.fn(),
    };
    geometry.attributes.position = positionMock;

    BufferGeometry.rotateZ(geometry, Math.PI / 2);

    expect(positionMock.setXYZ).toHaveBeenCalledWith(
      0,
      -1, // Rotated coordinates
      0,
      0,
    );
  });

  it("translate should translate positions", () => {
    geometry.attributes.position = { count: 3 };
    const positionMock = {
      getX: jest.fn().mockReturnValue(0),
      getY: jest.fn().mockReturnValue(0),
      getZ: jest.fn().mockReturnValue(0),
      setXYZ: jest.fn(),
    };
    geometry.attributes.position = positionMock;

    BufferGeometry.translate(geometry, 1, 2, 3);

    expect(positionMock.setXYZ).toHaveBeenCalledWith(
      0,
      1, // Translated coordinates
      2,
      3,
    );
  });

  it("scale should scale positions", () => {
    geometry.attributes.position = { count: 3 };
    const positionMock = {
      getX: jest.fn().mockReturnValue(1),
      getY: jest.fn().mockReturnValue(2),
      getZ: jest.fn().mockReturnValue(3),
      setXYZ: jest.fn(),
    };
    geometry.attributes.position = positionMock;

    BufferGeometry.scale(geometry, 2, 2, 2);

    expect(positionMock.setXYZ).toHaveBeenCalledWith(
      0,
      2, // Scaled coordinates
      4,
      6,
    );
  });

  it("center should center the geometry", () => {
    geometry.boundingBox = new Box3(
      new Vector3(-1, -1, -1),
      new Vector3(1, 1, 1),
    );
    geometry.attributes.position = { count: 8 };
    const positionMock = {
      getX: jest.fn().mockImplementation((i: number) => (i % 2 === 0 ? -1 : 1)),
      getY: jest.fn().mockImplementation((i: number) => (i % 2 === 0 ? -1 : 1)),
      getZ: jest.fn().mockImplementation((i: number) => (i % 2 === 0 ? -1 : 1)),
      setXYZ: jest.fn(),
    };
    geometry.attributes.position = positionMock;

    BufferGeometry.center(geometry);

    expect(positionMock.setXYZ).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("setFromPoints should create geometry from points", () => {
    const points: (Vector3 | Vector2)[] = [
      new Vector3(0, 0, 0),
      new Vector3(1, 1, 1),
      new Vector2(2, 2),
    ];

    BufferGeometry.setFromPoints(geometry, points);

    expect(geometry.attributes.position.itemSize).toBe(3);
    expect((geometry.attributes.position.array as Float32Array).length).toBe(9); // 3 points * 3 coords
  });

  it("computeBoundingBox should compute bounding box", () => {
    geometry.attributes.position = { count: 3 };
    const positionMock = {
      getX: jest.fn().mockReturnValue(1),
      getY: jest.fn().mockReturnValue(2),
      getZ: jest.fn().mockReturnValue(3),
    };
    geometry.attributes.position = positionMock;

    BufferGeometry.computeBoundingBox(geometry);

    expect(geometry.boundingBox.min.x).toBeLessThanOrEqual(1);
    expect(geometry.boundingBox.max.x).toBeGreaterThanOrEqual(1);
  });

  it("computeBoundingSphere should compute bounding sphere", () => {
    geometry.attributes.position = { count: 3 };
    const positionMock = {
      getX: jest.fn().mockReturnValue(0),
      getY: jest.fn().mockReturnValue(0),
      getZ: jest.fn().mockReturnValue(0),
    };
    geometry.attributes.position = positionMock;

    BufferGeometry.computeBoundingSphere(geometry);

    expect(geometry.boundingSphere.center.x).toBeCloseTo(0);
    expect(geometry.boundingSphere.radius).toBeGreaterThanOrEqual(0);
  });

  it("clone should create a copy of the geometry", () => {
    const original = { attributes: { position: {} } };
    const clone = BufferGeometry.clone(original);

    expect(clone.attributes.position).not.toBe(original.attributes.position);
  });

  it("copy should copy properties from source to target", () => {
    const source = {
      attributes: { position: {} },
      groups: [{ start: 0, count: 3 }],
    };
    const target = {};

    BufferGeometry.copy(source, target);

    // Cast target to any for testing
    const typedTarget = target as any;
    expect(typedTarget.attributes.position).toBeDefined();
    expect(typedTarget.groups.length).toBe(1);
    expect(typedTarget.groups[0].start).toBe(0);
    expect(typedTarget.groups[0].count).toBe(3);
  });

  it("dispose should dispose of the geometry", () => {
    const disposeSpy = jest.spyOn(geometry, "dispose");
    BufferGeometry.dispose(geometry);
    expect(disposeSpy).toHaveBeenCalled();
  });
});
