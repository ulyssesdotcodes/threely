// Main library exports for npm publishing
export { parseDSL, executeDSL, dslContext, setScene, getObjectRegistry, clearAll } from './dsl';
// Deprecated: Graph system replaced by direct AST to Nodysseus conversion
// export { Graph, Node, createNode, map, apply } from './graph';
// export type { Node as ThreelyNode } from './graph';
export * as THREE from 'three';