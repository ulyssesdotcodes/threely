import { Matrix4 } from "three";
import { Quaternion } from "three";
import { Vector3 } from "three";
import { Euler } from "three";
import { Object3D, Raycaster, Intersection } from "three";

export function applyMatrix4(object: Object3D, matrix: Matrix4): Object3D {
  object.applyMatrix4(matrix);
  return object;
}

export function applyQuaternion(object: Object3D, quaternion: Quaternion): Object3D {
  return object.applyQuaternion(quaternion);
}

export function setRotationFromAxisAngle(object: Object3D, axis: Vector3, angle: number): Object3D {
  object.setRotationFromAxisAngle(axis, angle);
  return object;
}

export function setRotationFromEuler(object: Object3D, euler: Euler): Object3D {
  object.setRotationFromEuler(euler);
  return object;
}

export function setRotationFromMatrix(object: Object3D, m: Matrix4): Object3D {
  object.setRotationFromMatrix(m);
  return object;
}

export function setRotationFromQuaternion(object: Object3D, q: Quaternion): Object3D {
  object.setRotationFromQuaternion(q);
  return object;
}

export function rotateOnAxis(object: Object3D, axis: Vector3, angle: number): Object3D {
  return object.rotateOnAxis(axis, angle);
}

export function rotateOnWorldAxis(object: Object3D, axis: Vector3, angle: number): Object3D {
  return object.rotateOnWorldAxis(axis, angle);
}

export function rotateX(object: Object3D, angle: number): Object3D {
  return object.rotateX(angle);
}

export function rotateY(object: Object3D, angle: number): Object3D {
  return object.rotateY(angle);
}

export function rotateZ(object: Object3D, angle: number): Object3D {
  return object.rotateZ(angle);
}

export function translateOnAxis(object: Object3D, axis: Vector3, distance: number): Object3D {
  return object.translateOnAxis(axis, distance);
}

export function translateX(object: Object3D, distance: number): Object3D {
  return object.translateX(distance);
}

export function translateY(object: Object3D, distance: number): Object3D {
  return object.translateY(distance);
}

export function translateZ(object: Object3D, distance: number): Object3D {
  return object.translateZ(distance);
}

export function localToWorld(object: Object3D, vector: Vector3): Vector3 {
  return object.localToWorld(vector);
}

export function worldToLocal(object: Object3D, vector: Vector3): Vector3 {
  return object.worldToLocal(vector);
}

export function lookAt(object: Object3D, vector: Vector3): void;
export function lookAt(object: Object3D, x: number, y: number, z: number): void;
export function lookAt(object: Object3D, ...args: any[]): Object3D {
  if (args.length === 1 && args[0] instanceof Vector3) {
    object.lookAt(args[0]);
  } else if (args.length === 3) {
    object.lookAt(args[0], args[1], args[2]);
  }
  return object;
}

export function add(object: Object3D, ...objects: Object3D[]): Object3D {
  objects.forEach(obj => object.add(obj));
  return object;
}

export function remove(object: Object3D, ...objects: Object3D[]): Object3D {
  objects.forEach(obj => object.remove(obj));
  return object;
}

export function removeFromParent(object: Object3D): Object3D {
  return object.removeFromParent();
}

export function clear(object: Object3D): Object3D {
  return object.clear();
}

export function attach(object: Object3D, child: Object3D): Object3D {
  return object.attach(child);
}

export function getObjectById(object: Object3D, id: number): Object3D | undefined {
  return object.getObjectById(id);
}

export function getObjectByName(object: Object3D, name: string): Object3D | undefined {
  return object.getObjectByName(name);
}

export function getObjectByProperty(object: Object3D, name: string, value: any): Object3D | undefined {
  return object.getObjectByProperty(name, value);
}

export function getObjectsByProperty(object: Object3D, name: string, value: any, optionalTarget?: Object3D[]): Object3D[] {
  return object.getObjectsByProperty(name, value, optionalTarget);
}

export function getWorldPosition(object: Object3D, target: Vector3): Vector3 {
  return object.getWorldPosition(target);
}

export function getWorldQuaternion(object: Object3D, target: Quaternion): Quaternion {
  return object.getWorldQuaternion(target);
}

export function getWorldScale(object: Object3D, target: Vector3): Vector3 {
  return object.getWorldScale(target);
}

export function getWorldDirection(object: Object3D, target: Vector3): Vector3 {
  return object.getWorldDirection(target);
}

export function raycast(object: Object3D, raycaster: Raycaster, intersects: Intersection[]): Object3D {
  object.raycast(raycaster, intersects);
  return object;
}

export function traverse(object: Object3D, callback: (object: Object3D) => any): void {
  object.traverse(callback);
}

export function traverseVisible(object: Object3D, callback: (object: Object3D) => any): void {
  object.traverseVisible(callback);
}

export function traverseAncestors(object: Object3D, callback: (object: Object3D) => any): void {
  object.traverseAncestors(callback);
}

export function updateMatrix(object: Object3D): Object3D {
  object.updateMatrix();
  return object;
}

export function updateMatrixWorld(object: Object3D, force?: boolean): Object3D {
  object.updateMatrixWorld(force);
  return object;
}

export function updateWorldMatrix(object: Object3D, updateParents: boolean, updateChildren: boolean): Object3D {
  object.updateWorldMatrix(updateParents, updateChildren);
  return object;
}

export function toJSON(object: Object3D): Object3D {
  object.toJSON();
  return object;
}

export function clone(object: Object3D, recursive?: boolean): Object3D {
  const cloned = object.clone(recursive);
  return cloned;
}

export function copy(object: Object3D, source: Object3D, recursive?: boolean): Object3D {
  const copied = object.copy(source, recursive);
  return copied;
}