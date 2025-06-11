import * as Camera from '../Camera';
import { Vector3 } from '../Vector3';

describe('Camera', () => {
  it('should be defined', () => {
    expect(Camera).toBeDefined();
  });

  describe('getWorldDirection', () => {
    it('should return the world direction vector', () => {
      const target: Vector3 = { x: 0, y: 0, z: -1 };
      const result = Camera.getWorldDirection(target);
      expect(result).toEqual(target);
    });
  });
});