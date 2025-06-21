// Main library exports for npm publishing
export { parseDSL, executeDSL, dslContext, setScene, getObjectRegistry, clearAll } from './dsl';
export { Graph, Node, createNode, map, apply } from './graph';
export * as THREE from 'three';

// Re-export useful types and utilities
export type { Node as ThreelyNode } from './graph';