// Generic transform operation factory to reduce code duplication
import { Node } from "../../graph";
import {
  MockObject3D,
  normalizeVector3Like,
  normalizeEulerLike,
} from "../../three/MockObject3D";
import { apply } from "../../graph";
import { chainObj3d } from "../object3d-chain";

// Generic node converter for transform operations
function convertToNodes<T>(
  objectNode: Node<MockObject3D> | MockObject3D,
  value: Node<T> | T,
): [Node<MockObject3D>, Node<T>] {
  const objectNodeResolved =
    objectNode &&
    typeof objectNode === "object" &&
    !("id" in objectNode) &&
    !("value" in objectNode) &&
    !("dependencies" in objectNode)
      ? createNode(objectNode, [], {})
      : (objectNode as Node<MockObject3D>);

  const valueNode =
    typeof value === "number" ? createNode(value, [], {}) : value;

  return [objectNodeResolved, valueNode as Node<T>];
}

// Import createNode from graph (we'll need to add this import)
import { createNode } from "../../graph";

// Transform operation types
type TransformAxis = "x" | "y" | "z";
type TransformType = "translate" | "rotate";

// Generic transform logic factory
function createTransformLogic(
  transformType: TransformType,
  axis: TransformAxis,
) {
  return (mockObject: MockObject3D, value: number): MockObject3D => {
    if (!mockObject) {
      return { geometry: undefined, userData: undefined };
    }

    if (transformType === "translate") {
      const currentPos = normalizeVector3Like(
        mockObject.position || { x: 0, y: 0, z: 0 },
      );
      return {
        geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
        userData: mockObject.userData ? { ...mockObject.userData } : undefined,
        ...mockObject,
        position: {
          x: axis === "x" ? currentPos.x + value : currentPos.x,
          y: axis === "y" ? currentPos.y + value : currentPos.y,
          z: axis === "z" ? currentPos.z + value : currentPos.z,
        },
      };
    } else if (transformType === "rotate") {
      const currentRot = normalizeEulerLike(
        mockObject.rotation || { x: 0, y: 0, z: 0 },
      );
      return {
        geometry: mockObject.geometry ? { ...mockObject.geometry } : undefined,
        userData: mockObject.userData ? { ...mockObject.userData } : undefined,
        ...mockObject,
        rotation: {
          x: axis === "x" ? currentRot.x + value : currentRot.x,
          y: axis === "y" ? currentRot.y + value : currentRot.y,
          z: axis === "z" ? currentRot.z + value : currentRot.z,
        },
      };
    }

    return mockObject;
  };
}

// Generic transform operation factory
export function createTransformOperation(
  transformType: TransformType,
  axis: TransformAxis,
  operationName: string,
) {
  const transformLogic = createTransformLogic(transformType, axis);

  return (
    objectNode: Node<MockObject3D> | MockObject3D,
    value: Node<number> | number,
  ): Node<MockObject3D> => {
    const [objectNodeResolved, valueNode] = convertToNodes(objectNode, value);
    return apply(
      (mockObject: MockObject3D, val: number) =>
        transformLogic(mockObject, val),
      [objectNodeResolved, valueNode],
      chainObj3d,
    );
  };
}

// Factory functions for each transform type
export const createTranslateOperation = (axis: TransformAxis) =>
  createTransformOperation("translate", axis, `translate${axis.toUpperCase()}`);

export const createRotateOperation = (axis: TransformAxis) =>
  createTransformOperation("rotate", axis, `rotate${axis.toUpperCase()}`);

// Pre-created transform operations
export const translateX = createTranslateOperation("x");
export const translateY = createTranslateOperation("y");
export const translateZ = createTranslateOperation("z");

export const rotateX = createRotateOperation("x");
export const rotateY = createRotateOperation("y");
export const rotateZ = createRotateOperation("z");
