// Main DSL exports - combines all chain types and utilities
import { Graph } from '../graph';
import { MockObject3D, mockUtils, mockPresets } from '../three/MockObject3D';

// Object3D chain exports
export {
  // Scene management
  setScene,
  getObjectRegistry,
  clearAll,
  
  // Geometry creation
  sphere,
  box,
  cylinder,
  material,
  mesh,
  
  // Transforms
  translateX,
  translateY,
  translateZ,
  rotateX,
  rotateY,
  rotateZ,
  applyMock,
  
  // Rendering
  render,
  
  // Chain object
  chainObj3d
} from './object3d-chain';

// Math chain exports
export {
  // Basic operations
  mult,
  add,
  sub,
  div,
  frame,
  
  // Math functions
  mathAbs,
  mathAcos,
  mathAcosh,
  mathAsin,
  mathAsinh,
  mathAtan,
  mathAtan2,
  mathAtanh,
  mathCbrt,
  mathCeil,
  mathClz32,
  mathCos,
  mathCosh,
  mathExp,
  mathExpm1,
  mathFloor,
  mathFround,
  mathHypot,
  mathImul,
  mathLog,
  mathLog10,
  mathLog1p,
  mathLog2,
  mathMax,
  mathMin,
  mathPow,
  mathRandom,
  mathRound,
  mathSign,
  mathSin,
  mathSinh,
  mathSqrt,
  mathTan,
  mathTanh,
  mathTrunc,
  
  // Chain object
  chainMath
} from './math-chain';

// Parser exports
export {
  parseDSL,
  executeDSL,
  logToPanel,
  dslContext
} from './parser';

// Re-export utilities
export { MockObject3D, mockUtils, mockPresets };

// Import individual functions for context
import {
  sphere,
  box,
  cylinder,
  material,
  mesh,
  translateX,
  translateY,
  translateZ,
  rotateX,
  rotateY,
  rotateZ,
  applyMock,
  render,
  clearAll
} from './object3d-chain';

import {
  mult,
  add,
  sub,
  div,
  frame,
  mathAbs,
  mathAcos,
  mathAcosh,
  mathAsin,
  mathAsinh,
  mathAtan,
  mathAtan2,
  mathAtanh,
  mathCbrt,
  mathCeil,
  mathClz32,
  mathCos,
  mathCosh,
  mathExp,
  mathExpm1,
  mathFloor,
  mathFround,
  mathHypot,
  mathImul,
  mathLog,
  mathLog10,
  mathLog1p,
  mathLog2,
  mathMax,
  mathMin,
  mathPow,
  mathRandom,
  mathRound,
  mathSign,
  mathSin,
  mathSinh,
  mathSqrt,
  mathTan,
  mathTanh,
  mathTrunc
} from './math-chain';