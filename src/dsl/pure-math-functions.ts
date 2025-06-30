// Pure Math Functions - No Node dependencies
// These functions return primitive values and computation functions for direct Nodysseus conversion

import { RefNode } from '../nodysseus/types';

// Basic arithmetic operations - return computation functions
export const mult = (a: number, b: number): number => a * b;
export const add = (a: number, b: number): number => a + b;
export const sub = (a: number, b: number): number => a - b;
export const div = (a: number, b: number): number => a / b;

// Frame function - returns RefNode for external frame reference
export const frame = (uuid?: string): RefNode => ({
  id: uuid || `frame-${Date.now()}`,
  ref: 'extern.frame'
});

// Math library functions - pure computation functions
export const mathAbs = (val: number): number => Math.abs(val);
export const mathAcos = (val: number): number => Math.acos(val);
export const mathAcosh = (val: number): number => Math.acosh(val);
export const mathAsin = (val: number): number => Math.asin(val);
export const mathAsinh = (val: number): number => Math.asinh(val);
export const mathAtan = (val: number): number => Math.atan(val);
export const mathAtan2 = (y: number, x: number): number => Math.atan2(y, x);
export const mathAtanh = (val: number): number => Math.atanh(val);
export const mathCbrt = (val: number): number => Math.cbrt(val);
export const mathCeil = (val: number): number => Math.ceil(val);
export const mathClz32 = (val: number): number => Math.clz32(val);
export const mathCos = (val: number): number => Math.cos(val);
export const mathCosh = (val: number): number => Math.cosh(val);
export const mathExp = (val: number): number => Math.exp(val);
export const mathExpm1 = (val: number): number => Math.expm1(val);
export const mathFloor = (val: number): number => Math.floor(val);
export const mathFround = (val: number): number => Math.fround(val);
export const mathHypot = (val: number, ...args: number[]): number => Math.hypot(val, ...args);
export const mathImul = (a: number, b: number): number => Math.imul(a, b);
export const mathLog = (val: number): number => Math.log(val);
export const mathLog10 = (val: number): number => Math.log10(val);
export const mathLog1p = (val: number): number => Math.log1p(val);
export const mathLog2 = (val: number): number => Math.log2(val);
export const mathMax = (val: number, ...args: number[]): number => Math.max(val, ...args);
export const mathMin = (val: number, ...args: number[]): number => Math.min(val, ...args);
export const mathPow = (base: number, exponent: number): number => Math.pow(base, exponent);
export const mathRandom = (): number => Math.random();
export const mathRound = (val: number): number => Math.round(val);
export const mathSign = (val: number): number => Math.sign(val);
export const mathSin = (val: number): number => Math.sin(val);
export const mathSinh = (val: number): number => Math.sinh(val);
export const mathSqrt = (val: number): number => Math.sqrt(val);
export const mathTan = (val: number): number => Math.tan(val);
export const mathTanh = (val: number): number => Math.tanh(val);
export const mathTrunc = (val: number): number => Math.trunc(val);

// Chain object for method resolution - stores function references
export const chainMath = {
  mult: { fn: mult, chain: () => chainMath },
  add: { fn: add, chain: () => chainMath },
  sub: { fn: sub, chain: () => chainMath },
  div: { fn: div, chain: () => chainMath },
  
  // Math functions with short names for chaining
  abs: { fn: mathAbs, chain: () => chainMath },
  acos: { fn: mathAcos, chain: () => chainMath },
  acosh: { fn: mathAcosh, chain: () => chainMath },
  asin: { fn: mathAsin, chain: () => chainMath },
  asinh: { fn: mathAsinh, chain: () => chainMath },
  atan: { fn: mathAtan, chain: () => chainMath },
  atan2: { fn: mathAtan2, chain: () => chainMath },
  atanh: { fn: mathAtanh, chain: () => chainMath },
  cbrt: { fn: mathCbrt, chain: () => chainMath },
  ceil: { fn: mathCeil, chain: () => chainMath },
  clz32: { fn: mathClz32, chain: () => chainMath },
  cos: { fn: mathCos, chain: () => chainMath },
  cosh: { fn: mathCosh, chain: () => chainMath },
  exp: { fn: mathExp, chain: () => chainMath },
  expm1: { fn: mathExpm1, chain: () => chainMath },
  floor: { fn: mathFloor, chain: () => chainMath },
  fround: { fn: mathFround, chain: () => chainMath },
  hypot: { fn: mathHypot, chain: () => chainMath },
  imul: { fn: mathImul, chain: () => chainMath },
  log: { fn: mathLog, chain: () => chainMath },
  log10: { fn: mathLog10, chain: () => chainMath },
  log1p: { fn: mathLog1p, chain: () => chainMath },
  log2: { fn: mathLog2, chain: () => chainMath },
  max: { fn: mathMax, chain: () => chainMath },
  min: { fn: mathMin, chain: () => chainMath },
  pow: { fn: mathPow, chain: () => chainMath },
  random: { fn: mathRandom, chain: () => chainMath },
  round: { fn: mathRound, chain: () => chainMath },
  sign: { fn: mathSign, chain: () => chainMath },
  sin: { fn: mathSin, chain: () => chainMath },
  sinh: { fn: mathSinh, chain: () => chainMath },
  sqrt: { fn: mathSqrt, chain: () => chainMath },
  tan: { fn: mathTan, chain: () => chainMath },
  tanh: { fn: mathTanh, chain: () => chainMath },
  trunc: { fn: mathTrunc, chain: () => chainMath }
};