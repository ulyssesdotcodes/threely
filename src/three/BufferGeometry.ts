import {
  BufferAttribute,
  Box3,
  Matrix4,
  Quaternion,
  Sphere,
  Vector2,
  Vector3,
  EventDispatcher,
  GLBufferAttribute,
  InterleavedBufferAttribute,
} from "three";

export interface BufferGeometryJSON {
  metadata?: { version: number; type: string; generator: string };
  uuid: string;
  type: string;
  name?: string;
  userData?: Record<string, unknown>;
  data?: {
    attributes: Record<string, any>;
    index?: { type: string; array: number[] };
    morphAttributes?: Record<string, any[]>;
    morphTargetsRelative?: boolean;
    groups?: GeometryGroup[];
    boundingSphere?: { center: Vector3Tuple; radius: number };
  };
}

export type Vector3Tuple = [number, number, number];

export interface GeometryGroup {
  start: number;
  count: number;
  materialIndex?: number | undefined;
}

/**
 * Functions corresponding to BufferGeometry methods
 */
export function getIndex(geometry: any): any {
  const index = geometry.index;
  return geometry;
}

export function setIndex(
  geometry: any,
  index: BufferAttribute | number[] | null,
): any {
  if (Array.isArray(index)) {
    geometry.index = new BufferAttribute(new Float32Array(index), 1);
  } else {
    geometry.index = index;
  }
  return geometry;
}

export function setIndirect(geometry: any, indirect: any | null): any {
  geometry.indirect = indirect;
  return geometry;
}

export function getIndirect(geometry: any): any {
  const indirect = geometry.indirect;
  return geometry;
}

export function setAttribute<K extends keyof any>(
  geometry: any,
  name: K,
  attribute: any,
): any {
  geometry.attributes[name] = attribute;
  return geometry;
}

export function getAttribute<K extends keyof any>(geometry: any, name: K): any {
  const attribute = geometry.attributes[name];
  return geometry;
}

export function deleteAttribute(geometry: any, name: string): any {
  delete geometry.attributes[name];
  return geometry;
}

export function hasAttribute(geometry: any, name: string): any {
  const result = name in geometry.attributes;
  return geometry;
}

export function addGroup(
  geometry: any,
  start: number,
  count: number,
  materialIndex?: number,
): any {
  geometry.groups.push({ start, count, materialIndex });
  return geometry;
}

export function clearGroups(geometry: any): any {
  geometry.groups = [];
  return geometry;
}

export function setDrawRange(
  geometry: any,
  start: number,
  count: number,
): void {
  geometry.drawRange = { start, count };
}

export function applyMatrix4(geometry: any, matrix: Matrix4): any {
  const position = geometry.attributes.position;
  if (position) {
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);

      const v = new Vector3(x, y, z).applyMatrix4(matrix);

      position.setXYZ(i, v.x, v.y, v.z);
    }
  }
  return geometry;
}

export function applyQuaternion(geometry: any, quaternion: Quaternion): any {
  const position = geometry.attributes.position;
  if (position) {
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);

      const v = new Vector3(x, y, z).applyQuaternion(quaternion);

      position.setXYZ(i, v.x, v.y, v.z);
    }
  }
  return geometry;
}

export function rotateX(geometry: any, angle: number): any {
  const matrix = new Matrix4().makeRotationX(angle);
  return applyMatrix4(geometry, matrix);
}

export function rotateY(geometry: any, angle: number): any {
  const matrix = new Matrix4().makeRotationY(angle);
  return applyMatrix4(geometry, matrix);
}

export function rotateZ(geometry: any, angle: number): any {
  const matrix = new Matrix4().makeRotationZ(angle);
  return applyMatrix4(geometry, matrix);
}

export function translate(geometry: any, x: number, y: number, z: number): any {
  const position = geometry.attributes.position;
  if (position) {
    for (let i = 0; i < position.count; i++) {
      const px = position.getX(i);
      const py = position.getY(i);
      const pz = position.getZ(i);

      position.setXYZ(i, px + x, py + y, pz + z);
    }
  }
  return geometry;
}

export function scale(geometry: any, x: number, y: number, z: number): any {
  const position = geometry.attributes.position;
  if (position) {
    for (let i = 0; i < position.count; i++) {
      const px = position.getX(i);
      const py = position.getY(i);
      const pz = position.getZ(i);

      position.setXYZ(i, px * x, py * y, pz * z);
    }
  }
  return geometry;
}

export function lookAt(geometry: any, vector: Vector3): any {
  // This is a simplified implementation
  const position = new Vector3();
  if (geometry.attributes.position) {
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      position.set(
        geometry.attributes.position.getX(i),
        geometry.attributes.position.getY(i),
        geometry.attributes.position.getZ(i),
      );
      position.sub(vector);
    }
  }
  return geometry;
}

export function center(geometry: any): any {
  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }

  const offset = new Vector3();
  const bbox = geometry.boundingBox;

  if (bbox) {
    offset.addVectors(bbox.min, bbox.max).multiplyScalar(-0.5);

    const position = geometry.attributes.position;
    if (position) {
      for (let i = 0; i < position.count; i++) {
        position.setXYZ(
          i,
          position.getX(i) + offset.x,
          position.getY(i) + offset.y,
          position.getZ(i) + offset.z,
        );
      }
    }
  }

  return geometry;
}

export function setFromPoints(
  geometry: any,
  points: (Vector3 | Vector2)[],
): any {
  const positions = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if ("x" in point && "y" in point && "z" in point) {
      positions.set([point.x, point.y, point.z], i * 3);
    } else {
      positions.set([point.x, point.y, 0], i * 3);
    }
  }
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  return geometry;
}

export function computeBoundingBox(geometry: any): void {
  geometry.boundingBox = new Box3();
  const position = geometry.attributes.position;

  if (position) {
    const bbox = geometry.boundingBox;
    bbox.makeEmpty();

    for (let i = 0; i < position.count; i++) {
      bbox.expandByPoint(
        new Vector3(position.getX(i), position.getY(i), position.getZ(i)),
      );
    }
  }
}

export function computeBoundingSphere(geometry: any): void {
  geometry.boundingSphere = new Sphere();
  const position = geometry.attributes.position;

  if (position) {
    const center = new Vector3();
    let radiusSq = 0;

    for (let i = 0; i < position.count; i++) {
      const vertex = new Vector3(
        position.getX(i),
        position.getY(i),
        position.getZ(i),
      );

      center.add(vertex);
      const distanceSq = center.distanceToSquared(vertex);
      if (distanceSq > radiusSq) {
        radiusSq = distanceSq;
      }
    }

    center.divideScalar(position.count);

    geometry.boundingSphere.center.copy(center);
    geometry.boundingSphere.radius = Math.sqrt(radiusSq);
  }
}

export function computeTangents(geometry: any): void {
  // Simplified implementation
  if (
    !geometry.index ||
    !geometry.attributes.position ||
    !geometry.attributes.normal ||
    !geometry.attributes.uv
  ) {
    return;
  }

  const tan1 = new Vector3();
  const tan2 = new Vector3();

  for (let i = 0; i < geometry.index.count; i += 3) {
    const a = geometry.index.getX(i);
    const b = geometry.index.getX(i + 1);
    const c = geometry.index.getX(i + 2);

    const v1 = new Vector3().fromBufferAttribute(
      geometry.attributes.position,
      a,
    );
    const v2 = new Vector3().fromBufferAttribute(
      geometry.attributes.position,
      b,
    );
    const v3 = new Vector3().fromBufferAttribute(
      geometry.attributes.position,
      c,
    );

    const uv1 = new Vector2().fromBufferAttribute(geometry.attributes.uv, a);
    const uv2 = new Vector2().fromBufferAttribute(geometry.attributes.uv, b);
    const uv3 = new Vector2().fromBufferAttribute(geometry.attributes.uv, c);

    const x1 = v2.x - v1.x;
    const x2 = v3.x - v1.x;
    const y1 = v2.y - v1.y;
    const y2 = v3.y - v1.y;
    const z1 = v2.z - v1.z;
    const z2 = v3.z - v1.z;

    const s1 = uv2.x - uv1.x;
    const s2 = uv3.x - uv1.x;
    const t1 = uv2.y - uv1.y;
    const t2 = uv3.y - uv1.y;

    const r = 1.0 / (s1 * t2 - s2 * t1);
    tan1.set(
      (t2 * x1 - t1 * x2) * r,
      (t2 * y1 - t1 * y2) * r,
      (t2 * z1 - t1 * z2) * r,
    );
    tan2.set(
      (s1 * x2 - s2 * x1) * r,
      (s1 * y2 - s2 * y1) * r,
      (s1 * z2 - s2 * z1) * r,
    );

    // Add tangents to vertices
    geometry.attributes.tangent.setXYZ(a, tan1.x, tan1.y, tan1.z);
    geometry.attributes.tangent.setXYZ(b, tan2.x, tan2.y, tan2.z);
    geometry.attributes.tangent.setXYZ(c, tan2.x, tan2.y, tan2.z);
  }
}

export function computeVertexNormals(geometry: any): void {
  if (!geometry.index) {
    // Non-indexed geometry
    const normals: Vector3[] = [];
    for (let i = 0; i < geometry.attributes.position.count; i += 3) {
      const a = new Vector3().fromBufferAttribute(
        geometry.attributes.position,
        i,
      );
      const b = new Vector3().fromBufferAttribute(
        geometry.attributes.position,
        i + 1,
      );
      const c = new Vector3().fromBufferAttribute(
        geometry.attributes.position,
        i + 2,
      );

      const cb = new Vector3().subVectors(c, b);
      const ab = new Vector3().subVectors(a, b);
      const normal = new Vector3().crossVectors(cb, ab).normalize();

      normals.push(normal.clone());
    }

    const flatNormals: number[] = [];
    for (const normal of normals) {
      flatNormals.push(normal.x, normal.y, normal.z);
    }

    geometry.setAttribute(
      "normal",
      new BufferAttribute(new Float32Array(flatNormals), 3),
    );
  } else {
    // Indexed geometry
    const normals: { [key: number]: Vector3 } = {};
    for (let i = 0; i < geometry.index.count; i += 3) {
      const a = geometry.index.getX(i);
      const b = geometry.index.getX(i + 1);
      const c = geometry.index.getX(i + 2);

      const vA = new Vector3().fromBufferAttribute(
        geometry.attributes.position,
        a,
      );
      const vB = new Vector3().fromBufferAttribute(
        geometry.attributes.position,
        b,
      );
      const vC = new Vector3().fromBufferAttribute(
        geometry.attributes.position,
        c,
      );

      const cb = new Vector3().subVectors(vC, vB);
      const ab = new Vector3().subVectors(vA, vB);
      const normal = new Vector3().crossVectors(cb, ab).normalize();

      if (!normals[a]) normals[a] = new Vector3(0, 0, 0);
      if (!normals[b]) normals[b] = new Vector3(0, 0, 0);
      if (!normals[c]) normals[c] = new Vector3(0, 0, 0);

      normals[a].add(normal);
      normals[b].add(normal);
      normals[c].add(normal);
    }

    const flatNormals: number[] = [];
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      if (normals[i]) {
        normals[i].normalize();
        flatNormals.push(normals[i].x, normals[i].y, normals[i].z);
      } else {
        flatNormals.push(0, 0, 0);
      }
    }

    geometry.setAttribute(
      "normal",
      new BufferAttribute(new Float32Array(flatNormals), 3),
    );
  }
}

export function normalizeNormals(geometry: any): void {
  const normals = geometry.attributes.normal;
  if (normals) {
    for (let i = 0; i < normals.count; i++) {
      const x = normals.getX(i);
      const y = normals.getY(i);
      const z = normals.getZ(i);

      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        normals.setXYZ(i, x / length, y / length, z / length);
      }
    }
  }
}

export function toNonIndexed(geometry: any): any {
  const newGeometry = geometry.clone();

  if (geometry.index) {
    const position = geometry.attributes.position;
    const indices = geometry.index.array;

    const nonIndexedPositions = new Float32Array(position.count * 3);
    for (let i = 0; i < indices.length; i++) {
      const index = indices[i];
      nonIndexedPositions.set(
        [position.getX(index), position.getY(index), position.getZ(index)],
        i * 3,
      );
    }

    newGeometry.setAttribute(
      "position",
      new BufferAttribute(nonIndexedPositions, 3),
    );
    newGeometry.index = null;
  }

  return newGeometry;
}

export function toJSON(geometry: any): BufferGeometryJSON {
  const output = {
    metadata: {
      version: 1,
      type: "BufferGeometry",
      generator: "BufferGeometry.toJSON",
    },
    uuid: geometry.uuid || "",
    type: geometry.type || "",
  } as BufferGeometryJSON;

  if (geometry.name) {
    output.name = geometry.name;
  }

  if (geometry.userData && Object.keys(geometry.userData).length > 0) {
    output.userData = geometry.userData;
  }

  const position = geometry.attributes.position;
  if (position) {
    output.data = output.data || { attributes: {} };

    const array = position.array;
    let type = "Float32Array";
    if (array.constructor === Float32Array) {
      type = "Float32Array";
    } else if (array.constructor === Int32Array) {
      type = "Int32Array";
    }

    output.data.attributes.position = {
      itemSize: position.itemSize,
      type: type,
      array: Array.from(array),
    };
  }

  return output;
}

export function clone(geometry: any): any {
  const newGeometry: any = {};
  Object.assign(newGeometry, geometry);

  if (geometry.attributes) {
    newGeometry.attributes = {};
    for (const key in geometry.attributes) {
      const attribute = geometry.attributes[key];
      if (attribute.clone) {
        newGeometry.attributes[key] = attribute.clone();
      } else {
        newGeometry.attributes[key] = { ...attribute };
      }
    }
  }

  return newGeometry;
}

export function copy(source: any, target?: any): any {
  if (!target) {
    target = {};
  }

  target.name = source.name;

  if (source.attributes) {
    target.attributes = {};
    for (const key in source.attributes) {
      const attribute = source.attributes[key];
      target.attributes[key] = attribute.clone
        ? attribute.clone()
        : { ...attribute };
    }
  }

  if (source.index) {
    target.index = source.index.clone
      ? source.index.clone()
      : { ...source.index };
  }

  target.morphAttributes = JSON.parse(
    JSON.stringify(source.morphAttributes || {}),
  );
  target.morphTargetsRelative = source.morphTargetsRelative;

  target.groups = source.groups ? [...source.groups] : [];

  if (source.boundingBox) {
    target.boundingBox = source.boundingBox.clone
      ? source.boundingBox.clone()
      : { ...source.boundingBox };
  }

  if (source.boundingSphere) {
    target.boundingSphere = source.boundingSphere.clone
      ? source.boundingSphere.clone()
      : { ...source.boundingSphere };
  }

  target.drawRange = { ...source.drawRange };

  target.userData = JSON.parse(JSON.stringify(source.userData || {}));

  return target;
}

export function dispose(geometry: any): any {
  geometry.dispose();
  return geometry;
}
