// Math chain operation factory to reduce code duplication
import { Node } from "../../graph";
import { apply, createNode } from "../../graph";

// Type for math chain proxy object
export type MathChainProxy = {
  [key: string]: {
    fn: (...args: any[]) => Node<number>;
    chain: () => MathChainProxy;
  };
} & {
  [key: string]: (...args: any[]) => MathChainProxy;
};

// Generic math operation factory
export function createMathOperation(
  mathFunction: (...args: number[]) => number,
  operationName: string,
  chainProxy: MathChainProxy,
): (...args: (Node<number> | number)[]) => Node<number> {
  return (...args: (Node<number> | number)[]): Node<number> => {
    // Convert all arguments to nodes
    const nodeArgs = args.map((arg) =>
      typeof arg === "number" ? createNode(arg, [], {}) : arg,
    ) as Node<number>[];

    return apply(
      (...values: number[]) => mathFunction(...values),
      nodeArgs,
      chainProxy,
    );
  };
}

// Factory to create math chain entries
export function createMathChainEntry(
  mathFunction: (...args: number[]) => number,
  operationName: string,
  chainProxy: MathChainProxy,
) {
  const operation = createMathOperation(
    mathFunction,
    operationName,
    chainProxy,
  );

  return {
    fn: operation,
    chain: () => chainProxy,
  };
}

// Helper to create multiple math operations at once
export function createMathOperations(
  operations: Record<string, (...args: number[]) => number>,
  chainProxy: MathChainProxy,
): Record<
  string,
  { fn: (...args: any[]) => Node<number>; chain: () => MathChainProxy }
> {
  const result: Record<
    string,
    { fn: (...args: any[]) => Node<number>; chain: () => MathChainProxy }
  > = {};

  for (const [name, mathFn] of Object.entries(operations)) {
    result[name] = createMathChainEntry(mathFn, name, chainProxy);
  }

  return result;
}

// Standard Math object operations
export const mathOperations = {
  // Basic operations
  abs: Math.abs,
  acos: Math.acos,
  acosh: Math.acosh,
  asin: Math.asin,
  asinh: Math.asinh,
  atan: Math.atan,
  atan2: Math.atan2,
  atanh: Math.atanh,
  cbrt: Math.cbrt,
  ceil: Math.ceil,
  clz32: Math.clz32,
  cos: Math.cos,
  cosh: Math.cosh,
  exp: Math.exp,
  expm1: Math.expm1,
  floor: Math.floor,
  fround: Math.fround,
  hypot: Math.hypot,
  imul: Math.imul,
  log: Math.log,
  log10: Math.log10,
  log1p: Math.log1p,
  log2: Math.log2,
  max: Math.max,
  min: Math.min,
  pow: Math.pow,
  random: Math.random,
  round: Math.round,
  sign: Math.sign,
  sin: Math.sin,
  sinh: Math.sinh,
  sqrt: Math.sqrt,
  tan: Math.tan,
  tanh: Math.tanh,
  trunc: Math.trunc,

  // Custom basic operations
  mult: (a: number, b: number) => a * b,
  add: (a: number, b: number) => a + b,
  sub: (a: number, b: number) => a - b,
  div: (a: number, b: number) => a / b,
};
