import { Object3D, Vector3, Euler, Quaternion, Mesh, SphereGeometry, BoxGeometry, CylinderGeometry } from 'three';
import {
  MockObject3D,
  MockGeometry,
  applyMockToObject3D,
  mockUtils,
  mockPresets,
  normalizeVector3Like,
  normalizeEulerLike,
  normalizeQuaternionLike,
  validateNumber,
  createGeometryFromMock,
} from '../src/three/MockObject3D';

describe('MockObject3D', () => {
  let object3D: Object3D;

  beforeEach(() => {
    object3D = new Object3D();
  });

  describe('Type Normalization', () => {
    describe('normalizeVector3Like', () => {
      it('should normalize array to object', () => {
        const result = normalizeVector3Like([1, 2, 3]);
        expect(result).toEqual({ x: 1, y: 2, z: 3 });
      });

      it('should normalize Vector3 to object', () => {
        const vector = new Vector3(4, 5, 6);
        const result = normalizeVector3Like(vector);
        expect(result).toEqual({ x: 4, y: 5, z: 6 });
      });

      it('should pass through object format', () => {
        const input = { x: 7, y: 8, z: 9 };
        const result = normalizeVector3Like(input);
        expect(result).toEqual(input);
      });
    });

    describe('normalizeEulerLike', () => {
      it('should normalize array to object', () => {
        const result = normalizeEulerLike([0.1, 0.2, 0.3]);
        expect(result).toEqual({ x: 0.1, y: 0.2, z: 0.3 });
      });

      it('should normalize Euler to object', () => {
        const euler = new Euler(0.4, 0.5, 0.6, 'YXZ');
        const result = normalizeEulerLike(euler);
        expect(result).toEqual({ x: 0.4, y: 0.5, z: 0.6, order: 'YXZ' });
      });

      it('should pass through object format', () => {
        const input = { x: 0.7, y: 0.8, z: 0.9, order: 'ZYX' };
        const result = normalizeEulerLike(input);
        expect(result).toEqual(input);
      });
    });

    describe('normalizeQuaternionLike', () => {
      it('should normalize array to object', () => {
        const result = normalizeQuaternionLike([0.1, 0.2, 0.3, 0.4]);
        expect(result).toEqual({ x: 0.1, y: 0.2, z: 0.3, w: 0.4 });
      });

      it('should normalize Quaternion to object', () => {
        const quat = new Quaternion(0.5, 0.6, 0.7, 0.8);
        const result = normalizeQuaternionLike(quat);
        expect(result).toEqual({ x: 0.5, y: 0.6, z: 0.7, w: 0.8 });
      });

      it('should pass through object format', () => {
        const input = { x: 0.1, y: 0.2, z: 0.3, w: 0.4 };
        const result = normalizeQuaternionLike(input);
        expect(result).toEqual(input);
      });
    });
  });

  describe('Validation', () => {
    describe('validateNumber', () => {
      it('should validate finite numbers', () => {
        expect(validateNumber(5)).toBe(true);
        expect(validateNumber(0)).toBe(true);
        expect(validateNumber(-10)).toBe(true);
      });

      it('should reject infinite and NaN values', () => {
        expect(validateNumber(Infinity)).toBe(false);
        expect(validateNumber(-Infinity)).toBe(false);
        expect(validateNumber(NaN)).toBe(false);
      });

      it('should validate range constraints', () => {
        expect(validateNumber(5, 0, 10)).toBe(true);
        expect(validateNumber(-1, 0, 10)).toBe(false);
        expect(validateNumber(15, 0, 10)).toBe(false);
      });
    });
  });

  describe('Mock Utilities', () => {
    describe('mockUtils.position', () => {
      it('should create position object', () => {
        const pos = mockUtils.position(1, 2, 3);
        expect(pos).toEqual({ x: 1, y: 2, z: 3 });
      });
    });

    describe('mockUtils.rotation', () => {
      it('should convert degrees to radians', () => {
        const rot = normalizeEulerLike(mockUtils.rotation(90, 180, 270));
        expect(rot.x).toBeCloseTo(Math.PI / 2);
        expect(rot.y).toBeCloseTo(Math.PI);
        expect(rot.z).toBeCloseTo(3 * Math.PI / 2);
      });
    });

    describe('mockUtils.rotationRad', () => {
      it('should keep radians as-is', () => {
        const rot = mockUtils.rotationRad(0.5, 1.0, 1.5);
        expect(rot).toEqual({ x: 0.5, y: 1.0, z: 1.5 });
      });
    });

    describe('mockUtils.scale', () => {
      it('should create uniform scale', () => {
        const scale = mockUtils.scale(2);
        expect(scale).toEqual({ x: 2, y: 2, z: 2 });
      });
    });

    describe('mockUtils.scaleXYZ', () => {
      it('should create non-uniform scale', () => {
        const scale = mockUtils.scaleXYZ(1, 2, 3);
        expect(scale).toEqual({ x: 1, y: 2, z: 3 });
      });
    });

    describe('mockUtils.quaternionFromAxisAngle', () => {
      it('should create quaternion from axis-angle', () => {
        const quat = normalizeQuaternionLike(mockUtils.quaternionFromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 2));
        expect(quat.y).toBeCloseTo(Math.sin(Math.PI / 4));
        expect(quat.w).toBeCloseTo(Math.cos(Math.PI / 4));
      });
    });
  });

  describe('applyMockToObject3D', () => {
    it('should apply position from array', () => {
      const mock: MockObject3D = { position: [1, 2, 3] };
      applyMockToObject3D(object3D, mock);
      expect(object3D.position.x).toBe(1);
      expect(object3D.position.y).toBe(2);
      expect(object3D.position.z).toBe(3);
    });

    it('should apply position from Vector3', () => {
      const mock: MockObject3D = { position: new Vector3(4, 5, 6) };
      applyMockToObject3D(object3D, mock);
      expect(object3D.position.x).toBe(4);
      expect(object3D.position.y).toBe(5);
      expect(object3D.position.z).toBe(6);
    });

    it('should apply position from object', () => {
      const mock: MockObject3D = { position: { x: 7, y: 8, z: 9 } };
      applyMockToObject3D(object3D, mock);
      expect(object3D.position.x).toBe(7);
      expect(object3D.position.y).toBe(8);
      expect(object3D.position.z).toBe(9);
    });

    it('should apply rotation from array', () => {
      const mock: MockObject3D = { rotation: [0.1, 0.2, 0.3] };
      applyMockToObject3D(object3D, mock);
      expect(object3D.rotation.x).toBeCloseTo(0.1);
      expect(object3D.rotation.y).toBeCloseTo(0.2);
      expect(object3D.rotation.z).toBeCloseTo(0.3);
    });

    it('should apply rotation with custom order', () => {
      const mock: MockObject3D = { rotation: { x: 0.1, y: 0.2, z: 0.3, order: 'YXZ' } };
      applyMockToObject3D(object3D, mock);
      expect(object3D.rotation.order).toBe('YXZ');
    });

    it('should apply scale from uniform value', () => {
      const mock: MockObject3D = { scale: mockUtils.scale(2) };
      applyMockToObject3D(object3D, mock);
      expect(object3D.scale.x).toBe(2);
      expect(object3D.scale.y).toBe(2);
      expect(object3D.scale.z).toBe(2);
    });

    it('should apply quaternion', () => {
      const mock: MockObject3D = { quaternion: [0.1, 0.2, 0.3, 0.9] };
      applyMockToObject3D(object3D, mock);
      expect(object3D.quaternion.x).toBeCloseTo(0.1);
      expect(object3D.quaternion.y).toBeCloseTo(0.2);
      expect(object3D.quaternion.z).toBeCloseTo(0.3);
      expect(object3D.quaternion.w).toBeCloseTo(0.9);
    });

    it('should prioritize rotation over quaternion', () => {
      const mock: MockObject3D = {
        rotation: [0.5, 0.6, 0.7],
        quaternion: [0.1, 0.2, 0.3, 0.9]
      };
      applyMockToObject3D(object3D, mock);
      // Should use rotation, not quaternion
      expect(object3D.rotation.x).toBeCloseTo(0.5);
      expect(object3D.rotation.y).toBeCloseTo(0.6);
      expect(object3D.rotation.z).toBeCloseTo(0.7);
    });

    it('should apply boolean properties', () => {
      const mock: MockObject3D = {
        visible: false,
        castShadow: true,
        receiveShadow: true,
        matrixAutoUpdate: false,
      };
      applyMockToObject3D(object3D, mock);
      expect(object3D.visible).toBe(false);
      expect(object3D.castShadow).toBe(true);
      expect(object3D.receiveShadow).toBe(true);
      expect(object3D.matrixAutoUpdate).toBe(false);
    });

    it('should apply string properties', () => {
      const mock: MockObject3D = { name: 'test-object' };
      applyMockToObject3D(object3D, mock);
      expect(object3D.name).toBe('test-object');
    });

    it('should merge userData', () => {
      object3D.userData = { existing: 'value' };
      const mock: MockObject3D = { userData: { new: 'data', other: 123 } };
      applyMockToObject3D(object3D, mock);
      expect(object3D.userData).toEqual({
        existing: 'value',
        new: 'data',
        other: 123,
      });
    });

    it('should apply renderOrder', () => {
      const mock: MockObject3D = { renderOrder: 5 };
      applyMockToObject3D(object3D, mock);
      expect(object3D.renderOrder).toBe(5);
    });

    it('should handle partial mocks', () => {
      const mock: MockObject3D = { position: [1, 2, 3] };
      applyMockToObject3D(object3D, mock);
      // Only position should be changed
      expect(object3D.position.x).toBe(1);
      expect(object3D.visible).toBe(true); // default unchanged
    });

    it('should validate scale minimum values', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mock: MockObject3D = { scale: [0, 0.5, 1] }; // x=0 should be invalid
      applyMockToObject3D(object3D, mock);
      expect(consoleSpy).toHaveBeenCalled();
      // Scale should remain unchanged due to validation failure
      expect(object3D.scale.x).toBe(1); // default scale
      consoleSpy.mockRestore();
    });

    it('should validate against infinite values', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mock: MockObject3D = { position: [Infinity, 2, 3] };
      applyMockToObject3D(object3D, mock);
      expect(consoleSpy).toHaveBeenCalled();
      // Position should remain unchanged
      expect(object3D.position.x).toBe(0); // default position
      consoleSpy.mockRestore();
    });
  });

  describe('Mock Presets', () => {
    it('should create hidden preset', () => {
      const mock = mockPresets.hidden();
      expect(mock).toEqual({ visible: false });
    });

    it('should create origin preset', () => {
      const mock = mockPresets.origin();
      expect(mock.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(mock.rotation).toEqual({ x: 0, y: 0, z: 0 });
      expect(mock.scale).toEqual({ x: 1, y: 1, z: 1 });
    });

    it('should create large preset', () => {
      const mock = mockPresets.large(3);
      expect(mock.scale).toEqual({ x: 3, y: 3, z: 3 });
    });

    it('should create small preset', () => {
      const mock = mockPresets.small(0.2);
      expect(mock.scale).toEqual({ x: 0.2, y: 0.2, z: 0.2 });
    });

    it('should create elevated preset', () => {
      const mock = mockPresets.elevated(5);
      expect(mock.position).toEqual({ x: 0, y: 5, z: 0 });
    });
  });

  describe('Mock Geometry', () => {
    describe('mockUtils geometry functions', () => {
      it('should create sphere geometry mock', () => {
        const geom = mockUtils.sphereGeometry(2, 16, 8);
        expect(geom).toEqual({
          type: 'sphere',
          radius: 2,
          widthSegments: 16,
          heightSegments: 8,
        });
      });

      it('should create box geometry mock', () => {
        const geom = mockUtils.boxGeometry(1, 2, 3);
        expect(geom).toEqual({
          type: 'box',
          width: 1,
          height: 2,
          depth: 3,
        });
      });

      it('should create cylinder geometry mock', () => {
        const geom = mockUtils.cylinderGeometry(1, 2, 3, 16);
        expect(geom).toEqual({
          type: 'cylinder',
          radiusTop: 1,
          radiusBottom: 2,
          height: 3,
          radialSegments: 16,
        });
      });

      it('should use default values for geometry mocks', () => {
        const sphere = mockUtils.sphereGeometry();
        expect(sphere.radius).toBe(1);
        expect(sphere.widthSegments).toBe(32);
        expect(sphere.heightSegments).toBe(16);

        const box = mockUtils.boxGeometry();
        expect(box.width).toBe(1);
        expect(box.height).toBe(1);
        expect(box.depth).toBe(1);

        const cylinder = mockUtils.cylinderGeometry();
        expect(cylinder.radiusTop).toBe(1);
        expect(cylinder.radiusBottom).toBe(1);
        expect(cylinder.height).toBe(1);
        expect(cylinder.radialSegments).toBe(32);
      });
    });

    describe('createGeometryFromMock', () => {
      it('should create SphereGeometry from mock', () => {
        const mock: MockGeometry = { type: 'sphere', radius: 2, widthSegments: 16, heightSegments: 8 };
        const geometry = createGeometryFromMock(mock);
        
        expect(geometry).toBeInstanceOf(SphereGeometry);
        // Note: Three.js geometries don't expose their parameters directly, 
        // so we test by checking it was created without errors
      });

      it('should create BoxGeometry from mock', () => {
        const mock: MockGeometry = { type: 'box', width: 1, height: 2, depth: 3 };
        const geometry = createGeometryFromMock(mock);
        
        expect(geometry).toBeInstanceOf(BoxGeometry);
      });

      it('should create CylinderGeometry from mock', () => {
        const mock: MockGeometry = { type: 'cylinder', radiusTop: 1, radiusBottom: 2, height: 3 };
        const geometry = createGeometryFromMock(mock);
        
        expect(geometry).toBeInstanceOf(CylinderGeometry);
      });

      it('should use default values when parameters not specified', () => {
        const sphereMock: MockGeometry = { type: 'sphere' };
        const boxMock: MockGeometry = { type: 'box' };
        const cylinderMock: MockGeometry = { type: 'cylinder' };

        expect(() => createGeometryFromMock(sphereMock)).not.toThrow();
        expect(() => createGeometryFromMock(boxMock)).not.toThrow();
        expect(() => createGeometryFromMock(cylinderMock)).not.toThrow();
      });
    });

    describe('geometry application via applyMockToObject3D', () => {
      let mesh: Mesh;

      beforeEach(() => {
        mesh = new Mesh();
      });

      it('should apply sphere geometry to mesh', () => {
        const mock: MockObject3D = {
          geometry: { type: 'sphere', radius: 2 }
        };

        const oldGeometry = mesh.geometry;
        applyMockToObject3D(mesh, mock);

        expect(mesh.geometry).toBeInstanceOf(SphereGeometry);
        expect(mesh.geometry).not.toBe(oldGeometry);
      });

      it('should apply box geometry to mesh', () => {
        const mock: MockObject3D = {
          geometry: { type: 'box', width: 2, height: 3, depth: 4 }
        };

        applyMockToObject3D(mesh, mock);
        expect(mesh.geometry).toBeInstanceOf(BoxGeometry);
      });

      it('should apply cylinder geometry to mesh', () => {
        const mock: MockObject3D = {
          geometry: { type: 'cylinder', radiusTop: 1, radiusBottom: 2, height: 3 }
        };

        applyMockToObject3D(mesh, mock);
        expect(mesh.geometry).toBeInstanceOf(CylinderGeometry);
      });

      it('should not apply geometry to non-Mesh objects', () => {
        const mock: MockObject3D = {
          geometry: { type: 'sphere', radius: 2 }
        };

        const obj = new Object3D();
        expect(() => applyMockToObject3D(obj, mock)).not.toThrow();
        // Object3D doesn't have a geometry property, so nothing should happen
      });

      it('should dispose old geometry when applying new one', () => {
        const oldGeometry = mesh.geometry;
        const disposeSpy = jest.spyOn(oldGeometry, 'dispose');

        const mock: MockObject3D = {
          geometry: { type: 'sphere', radius: 2 }
        };

        applyMockToObject3D(mesh, mock);
        expect(disposeSpy).toHaveBeenCalled();
      });

      it('should combine geometry with other properties', () => {
        const mock: MockObject3D = {
          geometry: { type: 'box', width: 2, height: 2, depth: 2 },
          position: { x: 1, y: 2, z: 3 },
          visible: false
        };

        applyMockToObject3D(mesh, mock);

        expect(mesh.geometry).toBeInstanceOf(BoxGeometry);
        expect(mesh.position.x).toBe(1);
        expect(mesh.position.y).toBe(2);
        expect(mesh.position.z).toBe(3);
        expect(mesh.visible).toBe(false);
      });

      it('should update material when specified in userData', () => {
        const oldMaterial = mesh.material;
        const newMaterial = new (require('three')).MeshBasicMaterial({ color: 0xff0000 });
        
        const mock: MockObject3D = {
          userData: { material: newMaterial }
        };

        applyMockToObject3D(mesh, mock);

        expect(mesh.material).toBe(newMaterial);
        expect(mesh.material).not.toBe(oldMaterial);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should chain multiple mock applications', () => {
      const mock1: MockObject3D = { position: [1, 2, 3] };
      const mock2: MockObject3D = { scale: mockUtils.scale(2) };
      const mock3: MockObject3D = { visible: false };

      applyMockToObject3D(object3D, mock1);
      applyMockToObject3D(object3D, mock2);
      applyMockToObject3D(object3D, mock3);

      expect(object3D.position.x).toBe(1);
      expect(object3D.scale.x).toBe(2);
      expect(object3D.visible).toBe(false);
    });

    it('should work with real Three.js transformations', () => {
      const mock: MockObject3D = {
        position: [5, 10, 15],
        rotation: mockUtils.rotation(90, 0, 0), // 90 degrees around X
        scale: mockUtils.scale(2),
      };

      applyMockToObject3D(object3D, mock);

      // Verify transformations work correctly
      object3D.updateMatrixWorld();
      
      expect(object3D.position.x).toBe(5);
      expect(object3D.rotation.x).toBeCloseTo(Math.PI / 2);
      expect(object3D.scale.x).toBe(2);
    });

    it('should preserve existing properties not in mock', () => {
      // Set up object with initial state
      object3D.position.set(1, 1, 1);
      object3D.name = 'initial-name';
      object3D.userData = { initial: 'data' };

      // Apply partial mock
      const mock: MockObject3D = { scale: mockUtils.scale(2) };
      applyMockToObject3D(object3D, mock);

      // Original properties should be preserved
      expect(object3D.position.x).toBe(1);
      expect(object3D.name).toBe('initial-name');
      expect(object3D.userData.initial).toBe('data');
      // New property should be applied
      expect(object3D.scale.x).toBe(2);
    });
  });
});