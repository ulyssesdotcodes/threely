import * as Material from '../Material';

describe('Material', () => {
  it('onBeforeRender should be defined', () => {
    expect(Material.onBeforeRender).toBeDefined();
  });

  it('onBeforeCompile should be defined', () => {
    expect(Material.onBeforeCompile).toBeDefined();
  });

  it('customProgramCacheKey should return a string', () => {
    const key = Material.customProgramCacheKey();
    expect(typeof key).toBe('string');
  });

  it('setValues should be defined', () => {
    expect(Material.setValues).toBeDefined();
  });

  it('toJSON should return an object with metadata', () => {
    const json = Material.toJSON();
    expect(json.metadata).toBeDefined();
    expect(json.uuid).toBeDefined();
    expect(json.type).toBeDefined();
  });

  it('clone should return a new material instance', () => {
    const clone = Material.clone();
    expect(clone).toEqual({});
  });

  it('copy should copy properties from source to target', () => {
    const source = {};
    const target = Material.copy(source);
    expect(target).toEqual({});
  });

  it('dispose should be defined', () => {
    expect(Material.dispose).toBeDefined();
  });

  it('setNeedsUpdate should be defined', () => {
    expect(Material.setNeedsUpdate).toBeDefined();
  });
});