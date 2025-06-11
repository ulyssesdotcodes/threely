export interface MaterialParameters {
  alphaHash?: boolean;
  alphaTest?: number;
  alphaToCoverage?: boolean;
  blendAlpha?: number;
  blendColor?: any; // ColorRepresentation
  blendDst?: any; // BlendingDstFactor
  blendDstAlpha?: number;
  blendEquation?: any; // BlendingEquation
  blendEquationAlpha?: number;
  blending?: any; // Blending
  blendSrc?: any; // BlendingSrcFactor | BlendingDstFactor
  blendSrcAlpha?: number;
  clipIntersection?: boolean;
  clippingPlanes?: any[]; // Plane[]
  clipShadows?: boolean;
  colorWrite?: boolean;
  defines?: any;
  depthFunc?: any; // DepthModes
  depthTest?: boolean;
  depthWrite?: boolean;
  name?: string;
  opacity?: number;
  polygonOffset?: boolean;
  polygonOffsetFactor?: number;
  polygonOffsetUnits?: number;
  precision?: "highp" | "mediump" | "lowp" | null;
  premultipliedAlpha?: boolean;
  forceSinglePass?: boolean;
  allowOverride?: boolean;
  dithering?: boolean;
  side?: any; // Side
  shadowSide?: any; // Side
  toneMapped?: boolean;
  transparent?: boolean;
  vertexColors?: boolean;
  visible?: boolean;
  format?: any; // PixelFormat
  stencilWrite?: boolean;
  stencilFunc?: any; // StencilFunc
  stencilRef?: number;
  stencilWriteMask?: number;
  stencilFuncMask?: number;
  stencilFail?: any; // StencilOp
  stencilZFail?: any; // StencilOp
  stencilZPass?: any; // StencilOp
  userData?: Record<string, any>;
}

export interface MaterialJSON {
  metadata: { version: number; type: string; generator: string };
  uuid: string;
  type: string;
  name?: string;
  color?: number;
  roughness?: number;
  metalness?: number;
  sheen?: number;
  sheenColor?: number;
  sheenRoughness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  specular?: number;
  specularIntensity?: number;
  specularColor?: number;
  shininess?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  clearcoatMap?: string;
  clearcoatRoughnessMap?: string;
  clearcoatNormalMap?: string;
  clearcoatNormalScale?: any; // Vector2Tuple
  dispersion?: number;
  iridescence?: number;
  iridescenceIOR?: number;
  iridescenceThicknessRange?: number;
  iridescenceMap?: string;
  iridescenceThicknessMap?: string;
  anisotropy?: number;
  anisotropyRotation?: number;
  anisotropyMap?: string;
  map?: string;
  matcap?: string;
  alphaMap?: string;
  lightMap?: string;
  lightMapIntensity?: number;
  aoMap?: string;
  aoMapIntensity?: number;
  bumpMap?: string;
  bumpScale?: number;
  normalMap?: string;
  normalMapType?: any; // NormalMapTypes
  normalScale?: any; // Vector2Tuple
  displacementMap?: string;
  displacementScale?: number;
  displacementBias?: number;
  roughnessMap?: string;
  metalnessMap?: string;
  emissiveMap?: string;
  specularMap?: string;
  specularIntensityMap?: string;
  specularColorMap?: string;
  envMap?: string;
  combine?: any; // Combine
  envMapRotation?: any; // EulerTuple
  envMapIntensity?: number;
  reflectivity?: number;
  refractionRatio?: number;
  gradientMap?: string;
  transmission?: number;
  transmissionMap?: string;
  thickness?: number;
  thicknessMap?: string;
  attenuationDistance?: number;
  attenuationColor?: number;
  size?: number;
  shadowSide?: number;
  sizeAttenuation?: boolean;
  blending?: any; // Blending
  side?: any; // Side
  vertexColors?: boolean;
  opacity?: number;
  transparent?: boolean;
  blendSrc?: any; // BlendingSrcFactor
  blendDst?: any; // BlendingDstFactor
  blendEquation?: any; // BlendingEquation
  blendSrcAlpha?: number | null;
  blendDstAlpha?: number | null;
  blendEquationAlpha?: number | null;
  blendColor?: number;
  blendAlpha?: number;
  depthFunc?: any; // DepthModes
  depthTest?: boolean;
  depthWrite?: boolean;
  colorWrite?: boolean;
  stencilWriteMask?: number;
  stencilFunc?: any; // StencilFunc
  stencilRef?: number;
  stencilFuncMask?: number;
  stencilFail?: any; // StencilOp
  stencilZFail?: any; // StencilOp
  stencilZPass?: any; // StencilOp
  stencilWrite?: boolean;
  rotation?: number;
  polygonOffset?: boolean;
  polygonOffsetFactor?: number;
  polygonOffsetUnits?: number;
  linewidth?: number;
  dashSize?: number;
  gapSize?: number;
  scale?: number;
  dithering?: boolean;
  alphaTest?: number;
  alphaHash?: boolean;
  alphaToCoverage?: boolean;
  premultipliedAlpha?: boolean;
  forceSinglePass?: boolean;
  wireframe?: boolean;
  wireframeLinewidth?: number;
  wireframeLinecap?: string;
  wireframeLinejoin?: string;
  flatShading?: boolean;
  visible?: boolean;
  toneMapped?: boolean;
  fog?: boolean;
  userData?: Record<string, unknown>;
  textures?: Array<any>; // Omit<TextureJSON, "metadata">
  images?: any[]; // SourceJSON[]
}

/**
 * Functions corresponding to Material class methods
 */

export function onBeforeRender(
  renderer: any, // WebGLRenderer
  scene: any, // Scene
  camera: any, // Camera
  geometry: any, // BufferGeometry
  object: any, // Object3D
  group: any, // Group
): void {
  // Implementation would go here
}

export function onBeforeCompile(
  parameters: any, // WebGLProgramParametersWithUniforms
  renderer: any, // WebGLRenderer
): void {
  // Implementation would go here
}

export function customProgramCacheKey(): string {
  return ""; // Placeholder implementation
}

export function setValues(values: MaterialParameters): void {
  // Implementation would go here
}

export function toJSON(meta?: any): MaterialJSON {
  return {} as MaterialJSON; // Placeholder implementation
}

export function clone(): any {
  return {}; // Placeholder implementation
}

export function copy(source: any): any {
  return {}; // Placeholder implementation
}

export function dispose(): void {
  // Implementation would go here
}

export function setNeedsUpdate(value: boolean): void {
  // Implementation would go here
// Export all functions for use in other modules
}