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
}

// Setter functions for Material properties

export function alphaHash(material: any, value: boolean): void {
  material.alphaHash = value;
}

export function alphaTest(material: any, value: number): void {
  material.alphaTest = value;
}

export function alphaToCoverage(material: any, value: boolean): void {
  material.alphaToCoverage = value;
}

export function blendAlpha(material: any, value: number): void {
  material.blendAlpha = value;
}

export function blendColor(material: any, value: any): void { // ColorRepresentation
  material.blendColor = value;
}

export function blendDst(material: any, value: any): void { // BlendingDstFactor
  material.blendDst = value;
}

export function blendDstAlpha(material: any, value: number): void {
  material.blendDstAlpha = value;
}

export function blendEquation(material: any, value: any): void { // BlendingEquation
  material.blendEquation = value;
}

export function blendEquationAlpha(material: any, value: number): void {
  material.blendEquationAlpha = value;
}

export function blending(material: any, value: any): void { // Blending
  material.blending = value;
}

export function blendSrc(material: any, value: any): void { // BlendingSrcFactor | BlendingDstFactor
  material.blendSrc = value;
}

export function blendSrcAlpha(material: any, value: number): void {
  material.blendSrcAlpha = value;
}

export function clipIntersection(material: any, value: boolean): void {
  material.clipIntersection = value;
}

export function clippingPlanes(material: any, value: any[]): void { // Plane[]
  material.clippingPlanes = value;
}

export function clipShadows(material: any, value: boolean): void {
  material.clipShadows = value;
}

export function colorWrite(material: any, value: boolean): void {
  material.colorWrite = value;
}

export function defines(material: any, value: any): void {
  material.defines = value;
}

export function depthFunc(material: any, value: any): void { // DepthModes
  material.depthFunc = value;
}

export function depthTest(material: any, value: boolean): void {
  material.depthTest = value;
}

export function depthWrite(material: any, value: boolean): void {
  material.depthWrite = value;
}

export function name(material: any, value: string): void {
  material.name = value;
}

export function opacity(material: any, value: number): void {
  material.opacity = value;
}

export function polygonOffset(material: any, value: boolean): void {
  material.polygonOffset = value;
}

export function polygonOffsetFactor(material: any, value: number): void {
  material.polygonOffsetFactor = value;
}

export function polygonOffsetUnits(material: any, value: number): void {
  material.polygonOffsetUnits = value;
}

export function precision(material: any, value: "highp" | "mediump" | "lowp" | null): void {
  material.precision = value;
}

export function premultipliedAlpha(material: any, value: boolean): void {
  material.premultipliedAlpha = value;
}

export function forceSinglePass(material: any, value: boolean): void {
  material.forceSinglePass = value;
}

export function allowOverride(material: any, value: boolean): void {
  material.allowOverride = value;
}

export function dithering(material: any, value: boolean): void {
  material.dithering = value;
}

export function side(material: any, value: any): void { // Side
  material.side = value;
}

export function shadowSide(material: any, value: any): void { // Side
  material.shadowSide = value;
}

export function toneMapped(material: any, value: boolean): void {
  material.toneMapped = value;
}

export function transparent(material: any, value: boolean): void {
  material.transparent = value;
}

export function vertexColors(material: any, value: boolean): void {
  material.vertexColors = value;
}

export function visible(material: any, value: boolean): void {
  material.visible = value;
}

export function format(material: any, value: any): void { // PixelFormat
  material.format = value;
}

export function stencilWrite(material: any, value: boolean): void {
  material.stencilWrite = value;
}

export function stencilFunc(material: any, value: any): void { // StencilFunc
  material.stencilFunc = value;
}

export function stencilRef(material: any, value: number): void {
  material.stencilRef = value;
}

export function stencilWriteMask(material: any, value: number): void {
  material.stencilWriteMask = value;
}

export function stencilFuncMask(material: any, value: number): void {
  material.stencilFuncMask = value;
}

export function stencilFail(material: any, value: any): void { // StencilOp
  material.stencilFail = value;
}

export function stencilZFail(material: any, value: any): void { // StencilOp
  material.stencilZFail = value;
}

export function stencilZPass(material: any, value: any): void { // StencilOp
  material.stencilZPass = value;
}

export function userData(material: any, value: Record<string, any>): void {
  material.userData = value;
}

// JSON-specific properties

export function color(material: any, value: number): void {
  material.color = value;
}

export function roughness(material: any, value: number): void {
  material.roughness = value;
}

export function metalness(material: any, value: number): void {
  material.metalness = value;
}

export function sheen(material: any, value: number): void {
  material.sheen = value;
}

export function sheenColor(material: any, value: number): void {
  material.sheenColor = value;
}

export function sheenRoughness(material: any, value: number): void {
  material.sheenRoughness = value;
}

export function emissive(material: any, value: number): void {
  material.emissive = value;
}

export function emissiveIntensity(material: any, value: number): void {
  material.emissiveIntensity = value;
}

export function specular(material: any, value: number): void {
  material.specular = value;
}

export function specularIntensity(material: any, value: number): void {
  material.specularIntensity = value;
}

export function specularColor(material: any, value: number): void {
  material.specularColor = value;
}

export function shininess(material: any, value: number): void {
  material.shininess = value;
}

export function clearcoat(material: any, value: number): void {
  material.clearcoat = value;
}

export function clearcoatRoughness(material: any, value: number): void {
  material.clearcoatRoughness = value;
}

export function clearcoatMap(material: any, value: string): void {
  material.clearcoatMap = value;
}

export function clearcoatRoughnessMap(material: any, value: string): void {
  material.clearcoatRoughnessMap = value;
}

export function clearcoatNormalMap(material: any, value: string): void {
  material.clearcoatNormalMap = value;
}

export function clearcoatNormalScale(material: any, value: any): void { // Vector2Tuple
  material.clearcoatNormalScale = value;
}

export function dispersion(material: any, value: number): void {
  material.dispersion = value;
}

export function iridescence(material: any, value: number): void {
  material.iridescence = value;
}

export function iridescenceIOR(material: any, value: number): void {
  material.iridescenceIOR = value;
}

export function iridescenceThicknessRange(material: any, value: number): void {
  material.iridescenceThicknessRange = value;
}

export function iridescenceMap(material: any, value: string): void {
  material.iridescenceMap = value;
}

export function iridescenceThicknessMap(material: any, value: string): void {
  material.iridescenceThicknessMap = value;
}

export function anisotropy(material: any, value: number): void {
  material.anisotropy = value;
}

export function anisotropyRotation(material: any, value: number): void {
  material.anisotropyRotation = value;
}

export function anisotropyMap(material: any, value: string): void {
  material.anisotropyMap = value;
}

export function map(material: any, value: string): void {
  material.map = value;
}

export function matcap(material: any, value: string): void {
  material.matcap = value;
}

export function alphaMap(material: any, value: string): void {
  material.alphaMap = value;
}

export function lightMap(material: any, value: string): void {
  material.lightMap = value;
}

export function lightMapIntensity(material: any, value: number): void {
  material.lightMapIntensity = value;
}

export function aoMap(material: any, value: string): void {
  material.aoMap = value;
}

export function aoMapIntensity(material: any, value: number): void {
  material.aoMapIntensity = value;
}

export function bumpMap(material: any, value: string): void {
  material.bumpMap = value;
}

export function bumpScale(material: any, value: number): void {
  material.bumpScale = value;
}

export function normalMap(material: any, value: string): void {
  material.normalMap = value;
}

export function normalMapType(material: any, value: any): void { // NormalMapTypes
  material.normalMapType = value;
}

export function normalScale(material: any, value: any): void { // Vector2Tuple
  material.normalScale = value;
}

export function displacementMap(material: any, value: string): void {
  material.displacementMap = value;
}

export function displacementScale(material: any, value: number): void {
  material.displacementScale = value;
}

export function displacementBias(material: any, value: number): void {
  material.displacementBias = value;
}

export function roughnessMap(material: any, value: string): void {
  material.roughnessMap = value;
}

export function metalnessMap(material: any, value: string): void {
  material.metalnessMap = value;
}

export function emissiveMap(material: any, value: string): void {
  material.emissiveMap = value;
}

export function specularMap(material: any, value: string): void {
  material.specularMap = value;
}

export function specularIntensityMap(material: any, value: string): void {
  material.specularIntensityMap = value;
}

export function specularColorMap(material: any, value: string): void {
  material.specularColorMap = value;
}

export function envMap(material: any, value: string): void {
  material.envMap = value;
}

export function combine(material: any, value: any): void { // Combine
  material.combine = value;
}

export function envMapRotation(material: any, value: any): void { // EulerTuple
  material.envMapRotation = value;
}

export function envMapIntensity(material: any, value: number): void {
  material.envMapIntensity = value;
}

export function reflectivity(material: any, value: number): void {
  material.reflectivity = value;
}

export function refractionRatio(material: any, value: number): void {
  material.refractionRatio = value;
}

export function gradientMap(material: any, value: string): void {
  material.gradientMap = value;
}

export function transmission(material: any, value: number): void {
  material.transmission = value;
}

export function transmissionMap(material: any, value: string): void {
  material.transmissionMap = value;
}

export function thickness(material: any, value: number): void {
  material.thickness = value;
}

export function thicknessMap(material: any, value: string): void {
  material.thicknessMap = value;
}

export function attenuationDistance(material: any, value: number): void {
  material.attenuationDistance = value;
}

export function attenuationColor(material: any, value: number): void {
  material.attenuationColor = value;
}

export function size(material: any, value: number): void {
  material.size = value;
}

export function shadowSideNumber(material: any, value: number): void {
  material.shadowSide = value;
}

export function sizeAttenuation(material: any, value: boolean): void {
  material.sizeAttenuation = value;
}

export function rotation(material: any, value: number): void {
  material.rotation = value;
}

export function linewidth(material: any, value: number): void {
  material.linewidth = value;
}

export function dashSize(material: any, value: number): void {
  material.dashSize = value;
}

export function gapSize(material: any, value: number): void {
  material.gapSize = value;
}

export function scale(material: any, value: number): void {
  material.scale = value;
}

export function wireframe(material: any, value: boolean): void {
  material.wireframe = value;
}

export function wireframeLinewidth(material: any, value: number): void {
  material.wireframeLinewidth = value;
}

export function wireframeLinecap(material: any, value: string): void {
  material.wireframeLinecap = value;
}

export function wireframeLinejoin(material: any, value: string): void {
  material.wireframeLinejoin = value;
}

export function flatShading(material: any, value: boolean): void {
  material.flatShading = value;
}

export function fog(material: any, value: boolean): void {
  material.fog = value;
}