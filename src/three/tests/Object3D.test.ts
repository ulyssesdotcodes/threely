import * as Object3D from '../Object3D';
import { Matrix4, Quaternion, Vector3, Euler, Object3D as ThreeObject3D } from 'three';
import 'reflect-metadata';

describe('Object3D', () => {
  let object: ThreeObject3D;

  beforeEach(() => {
    object = new ThreeObject3D();
  });

  it('applyMatrix4 should apply matrix correctly', () => {
    const matrix = new Matrix4().makeTranslation(1, 2, 3);
    Object3D.applyMatrix4(object, matrix);
    expect(object.position.x).toBe(1);
    expect(object.position.y).toBe(2);
    expect(object.position.z).toBe(3);
  });

  it('applyQuaternion should apply quaternion correctly', () => {
    const quaternion = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
    Object3D.applyQuaternion(object, quaternion);
    expect(object.quaternion.x).toBeCloseTo(0);
    expect(object.quaternion.y).toBeCloseTo(0.707);
    expect(object.quaternion.z).toBeCloseTo(0);
    expect(object.quaternion.w).toBeCloseTo(0.707);
  });

  it('setRotationFromAxisAngle should set rotation correctly', () => {
    const axis = new Vector3(1, 0, 0);
    const angle = Math.PI / 2;
    Object3D.setRotationFromAxisAngle(object, axis, angle);
    expect(object.rotation.x).toBeCloseTo(Math.PI / 2);
    expect(object.rotation.y).toBeCloseTo(0);
    expect(object.rotation.z).toBeCloseTo(0);
  });

  it('setRotationFromEuler should set rotation correctly', () => {
    const euler = new Euler(Math.PI / 4, Math.PI / 4, Math.PI / 4);
    Object3D.setRotationFromEuler(object, euler);
    expect(object.rotation.x).toBeCloseTo(Math.PI / 4);
    expect(object.rotation.y).toBeCloseTo(Math.PI / 4);
    expect(object.rotation.z).toBeCloseTo(Math.PI / 4);
  });

  it('setRotationFromMatrix should set rotation correctly', () => {
    const matrix = new Matrix4().makeRotationX(Math.PI / 3);
    Object3D.setRotationFromMatrix(object, matrix);
    expect(object.rotation.x).toBeCloseTo(Math.PI / 3);
    expect(object.rotation.y).toBeCloseTo(0);
    expect(object.rotation.z).toBeCloseTo(0);
  });

  it('setRotationFromQuaternion should set rotation correctly', () => {
    const quaternion = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
    Object3D.setRotationFromQuaternion(object, quaternion);
    expect(object.rotation.x).toBeCloseTo(Math.PI / 2);
    expect(object.rotation.y).toBeCloseTo(0);
    expect(object.rotation.z).toBeCloseTo(0);
  });

  it('rotateOnAxis should rotate correctly', () => {
    const axis = new Vector3(1, 0, 0);
    const angle = Math.PI / 4;
    Object3D.rotateOnAxis(object, axis, angle);
    expect(object.rotation.x).toBeCloseTo(Math.PI / 4);
    expect(object.rotation.y).toBeCloseTo(0);
    expect(object.rotation.z).toBeCloseTo(0);
  });

  it('rotateOnWorldAxis should rotate correctly', () => {
    const axis = new Vector3(1, 0, 0);
    const angle = Math.PI / 4;
    Object3D.rotateOnWorldAxis(object, axis, angle);
    expect(object.rotation.x).toBeCloseTo(Math.PI / 4);
    expect(object.rotation.y).toBeCloseTo(0);
    expect(object.rotation.z).toBeCloseTo(0);
  });

  it('rotateX should rotate correctly', () => {
    const angle = Math.PI / 3;
    Object3D.rotateX(object, angle);
    expect(object.rotation.x).toBeCloseTo(Math.PI / 3);
    expect(object.rotation.y).toBeCloseTo(0);
    expect(object.rotation.z).toBeCloseTo(0);
  });

  it('rotateY should rotate correctly', () => {
    const angle = Math.PI / 3;
    Object3D.rotateY(object, angle);
    expect(object.rotation.x).toBeCloseTo(0);
    expect(object.rotation.y).toBeCloseTo(Math.PI / 3);
    expect(object.rotation.z).toBeCloseTo(0);
  });

  it('rotateZ should rotate correctly', () => {
    const angle = Math.PI / 3;
    Object3D.rotateZ(object, angle);
    expect(object.rotation.x).toBeCloseTo(0);
    expect(object.rotation.y).toBeCloseTo(0);
    expect(object.rotation.z).toBeCloseTo(Math.PI / 3);
  });

  it('translateOnAxis should translate correctly', () => {
    const axis = new Vector3(1, 0, 0);
    const distance = 5;
    Object3D.translateOnAxis(object, axis, distance);
    expect(object.position.x).toBeCloseTo(5);
    expect(object.position.y).toBeCloseTo(0);
    expect(object.position.z).toBeCloseTo(0);
  });

  it('translateX should translate correctly', () => {
    const distance = 3;
    Object3D.translateX(object, distance);
    expect(object.position.x).toBeCloseTo(3);
    expect(object.position.y).toBeCloseTo(0);
    expect(object.position.z).toBeCloseTo(0);
  });

  it('translateY should translate correctly', () => {
    const distance = 4;
    Object3D.translateY(object, distance);
    expect(object.position.x).toBeCloseTo(0);
    expect(object.position.y).toBeCloseTo(4);
    expect(object.position.z).toBeCloseTo(0);
  });

  it('translateZ should translate correctly', () => {
    const distance = 6;
    Object3D.translateZ(object, distance);
    expect(object.position.x).toBeCloseTo(0);
    expect(object.position.y).toBeCloseTo(0);
    expect(object.position.z).toBeCloseTo(6);
  });

  it('localToWorld should convert local coordinates to world coordinates', () => {
    object.position.set(1, 2, 3);
    const vector = new Vector3(4, 5, 6);
    const result = Object3D.localToWorld(object, vector);
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(7);
    expect(result.z).toBeCloseTo(9);
  });

  it('worldToLocal should convert world coordinates to local coordinates', () => {
    object.position.set(1, 2, 3);
    const vector = new Vector3(5, 7, 9);
    const result = Object3D.worldToLocal(object, vector);
    expect(result.x).toBeCloseTo(4);
    expect(result.y).toBeCloseTo(5);
    expect(result.z).toBeCloseTo(6);
  });

  it('lookAt should make object look at target', () => {
    const target = new Vector3(1, 0, 0);
    Object3D.lookAt(object, target);
    // Check if the object is looking approximately in the right direction
    expect(object.rotation.x).toBeCloseTo(0, 2); // Allow for some tolerance
    expect(object.rotation.y).toBeCloseTo(Math.PI / 2, 2);
    expect(object.rotation.z).toBeCloseTo(0, 2);
  });

  it('add should add child objects', () => {
    const child1 = new ThreeObject3D();
    const child2 = new ThreeObject3D();
    Object3D.add(object, child1, child2);
    expect(object.children.length).toBe(2);
    expect(object.children[0]).toBe(child1);
    expect(object.children[1]).toBe(child2);
  });

  it('remove should remove child objects', () => {
    const child = new ThreeObject3D();
    object.add(child);
    Object3D.remove(object, child);
    expect(object.children.length).toBe(0);
  });

  it('removeFromParent should remove from parent', () => {
    const parent = new ThreeObject3D();
    parent.add(object);
    Object3D.removeFromParent(object);
    expect(parent.children.length).toBe(0);
  });

  it('clear should clear all children', () => {
    const child1 = new ThreeObject3D();
    const child2 = new ThreeObject3D();
    object.add(child1, child2);
    Object3D.clear(object);
    expect(object.children.length).toBe(0);
  });

  it('attach should attach an object to this object', () => {
    const child = new ThreeObject3D();
    Object3D.attach(object, child);
    expect(object.children.length).toBe(1);
    expect(object.children[0]).toBe(child);
  });

  it('getObjectById should find object by ID', () => {
    const child = new ThreeObject3D();
    // ID is read-only, so we'll use a different property for testing
    child.userData.id = 42;
    object.add(child);
    const found = Object3D.getObjectById(object, 42);
    expect(found).toBe(child);
  });

  it('getObjectByName should find object by name', () => {
    const child = new ThreeObject3D();
    child.name = 'test';
    object.add(child);
    const found = Object3D.getObjectByName(object, 'test');
    expect(found).toBe(child);
  });

  it('getObjectByProperty should find object by property', () => {
    const child = new ThreeObject3D();
    child.userData.testProp = 'value';
    object.add(child);
    const found = Object3D.getObjectByProperty(object, 'testProp', 'value');
    expect(found).toBe(child);
  });

  it('getObjectsByProperty should find objects by property', () => {
    const child1 = new ThreeObject3D();
    child1.userData.testProp = 'value';
    const child2 = new ThreeObject3D();
    child2.userData.testProp = 'value';
    object.add(child1, child2);
    const found = Object3D.getObjectsByProperty(object, 'testProp', 'value');
    expect(found.length).toBe(2);
    expect(found[0]).toBe(child1);
    expect(found[1]).toBe(child2);
  });

  it('getWorldPosition should get world position', () => {
    object.position.set(1, 2, 3);
    const target = new Vector3();
    Object3D.getWorldPosition(object, target);
    expect(target.x).toBeCloseTo(1);
    expect(target.y).toBeCloseTo(2);
    expect(target.z).toBeCloseTo(3);
  });

  it('getWorldQuaternion should get world quaternion', () => {
    object.rotation.set(Math.PI / 4, Math.PI / 4, Math.PI / 4);
    const target = new Quaternion();
    Object3D.getWorldQuaternion(object, target);
    expect(target.x).toBeCloseTo(0.353);
    expect(target.y).toBeCloseTo(0.353);
    expect(target.z).toBeCloseTo(0.353);
    expect(target.w).toBeCloseTo(0.707);
  });

  it('getWorldScale should get world scale', () => {
    object.scale.set(2, 3, 4);
    const target = new Vector3();
    Object3D.getWorldScale(object, target);
    expect(target.x).toBeCloseTo(2);
    expect(target.y).toBeCloseTo(3);
    expect(target.z).toBeCloseTo(4);
  });

  it('getWorldDirection should get world direction', () => {
    const target = new Vector3();
    Object3D.getWorldDirection(object, target);
    expect(target.x).toBeCloseTo(0);
    expect(target.y).toBeCloseTo(0);
    expect(target.z).toBeCloseTo(-1); // Default camera looks down -Z axis
  });

  it('raycast should perform raycasting', () => {
    // Create a mock raycaster for testing
    const raycaster = { origin: new Vector3(), direction: new Vector3() };
    const intersects: any[] = [];
    Object3D.raycast(object, raycaster, intersects);
    expect(intersects.length).toBe(0); // No intersections by default
  });

  it('traverse should traverse the object hierarchy', () => {
    const child1 = new ThreeObject3D();
    const child2 = new ThreeObject3D();
    object.add(child1, child2);

    const callback = jest.fn();
    Object3D.traverse(object, callback);

    expect(callback).toHaveBeenCalledTimes(3); // Called for parent and 2 children
    expect(callback.mock.calls[0][0]).toBe(object);
    expect(callback.mock.calls[1][0]).toBe(child1);
    expect(callback.mock.calls[2][0]).toBe(child2);
  });

  it('traverseVisible should traverse only visible objects', () => {
    const child1 = new ThreeObject3D();
    // Create object and set visibility separately
    const child2 = new ThreeObject3D();
    child2.visible = false;
    object.add(child1, child2);

    const callback = jest.fn();
    Object3D.traverseVisible(object, callback);

    expect(callback).toHaveBeenCalledTimes(2); // Called for parent and visible child
    expect(callback.mock.calls[0][0]).toBe(object);
    expect(callback.mock.calls[1][0]).toBe(child1);
  });

  it('traverseAncestors should traverse ancestors', () => {
    const parent = new ThreeObject3D();
    parent.add(object);

    const callback = jest.fn();
    Object3D.traverseAncestors(object, callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0]).toBe(parent);
  });

  it('updateMatrix should update the local transform matrix', () => {
    object.position.set(1, 2, 3);
    Object3D.updateMatrix(object);
    const m = new Matrix4().makeTranslation(1, 2, 3);
    expect(object.matrix.elements).toEqual(m.elements);
  });

  it('updateMatrixWorld should update the world transform matrix', () => {
    object.position.set(1, 2, 3);
    Object3D.updateMatrixWorld(object);
    const m = new Matrix4().makeTranslation(1, 2, 3);
    expect(object.matrixWorld.elements).toEqual(m.elements);
  });

  it('updateWorldMatrix should update world matrix', () => {
    object.position.set(1, 2, 3);
    Object3D.updateWorldMatrix(object, true, true);
    const m = new Matrix4().makeTranslation(1, 2, 3);
    expect(object.matrixWorld.elements).toEqual(m.elements);
  });

  it('toJSON should return JSON representation', () => {
    object.position.set(1, 2, 3);
    const json = Object3D.toJSON(object);
    expect(json.uuid).toBe(object.uuid);
    expect(json.type).toBe('Object3D');
    expect(json.position).toEqual([1, 2, 3]);
  });

  it('clone should create a copy of the object', () => {
    object.position.set(1, 2, 3);
    const clone = Object3D.clone(object);
    expect(clone.position.x).toBeCloseTo(1);
    expect(clone.position.y).toBeCloseTo(2);
    expect(clone.position.z).toBeCloseTo(3);
    expect(clone.uuid).not.toBe(object.uuid); // Different UUID
  });

  it('copy should copy properties from source to target', () => {
    const source = new ThreeObject3D();
    source.position.set(1, 2, 3);

    const target = new ThreeObject3D();
    Object3D.copy(target, source);

    expect(target.position.x).toBeCloseTo(1);
    expect(target.position.y).toBeCloseTo(2);
    expect(target.position.z).toBeCloseTo(3);
  });
});