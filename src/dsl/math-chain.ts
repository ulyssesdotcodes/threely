// Math chain operations for DSL
import { Node, createNode, apply } from "../graph";
import { RefNode } from "../nodysseus/types";

let chainMath: any = {};

// Mathematical operation functions that work with Nodes
export const mult = (
  a: Node<number> | number,
  b: Node<number> | number,
): Node<number> => {
  const nodeA = typeof a === "number" ? createNode(a, [], {}) : a;
  const nodeB = typeof b === "number" ? createNode(b, [], {}) : b;
  return apply((valA: number, valB: number) => valA * valB, [nodeA, nodeB], {});
};

export const add = (
  a: Node<number> | number,
  b: Node<number> | number,
): Node<number> => {
  const nodeA = typeof a === "number" ? createNode(a, [], {}) : a;
  const nodeB = typeof b === "number" ? createNode(b, [], {}) : b;
  return apply((valA: number, valB: number) => valA + valB, [nodeA, nodeB], {});
};

export const sub = (
  a: Node<number> | number,
  b: Node<number> | number,
): Node<number> => {
  const nodeA = typeof a === "number" ? createNode(a, [], {}) : a;
  const nodeB = typeof b === "number" ? createNode(b, [], {}) : b;
  return apply((valA: number, valB: number) => valA - valB, [nodeA, nodeB], {});
};

export const div = (
  a: Node<number> | number,
  b: Node<number> | number,
): Node<number> => {
  const nodeA = typeof a === "number" ? createNode(a, [], {}) : a;
  const nodeB = typeof b === "number" ? createNode(b, [], {}) : b;
  return apply((valA: number, valB: number) => valA / valB, [nodeA, nodeB], {});
};

// Frame counter function that returns a Node with extern.frame RefNode
export const frame = (uuid?: string): Node<any> => {
  const frameRefNode: RefNode = {
    id: uuid || `frame-${Date.now()}`,
    ref: "extern.frame",
  };

  return createNode(frameRefNode, [], chainMath);
};

// Mathematical chain functions - these work with both Node<number> and number inputs
const mathChainFunction = (
  mathFn: (value: number, ...args: number[]) => number,
  fnName: string,
) => {
  return (
    valueNode: Node<number> | number,
    ...args: (Node<number> | number)[]
  ): Node<number> => {
    const valueNodeResolved =
      typeof valueNode === "number" ? createNode(valueNode, [], {}) : valueNode;
    const argsResolved = args.map((arg) =>
      typeof arg === "number" ? createNode(arg, [], {}) : arg,
    );

    if (argsResolved.length === 0) {
      return apply(
        (val: number) => mathFn(val),
        [valueNodeResolved],
        chainMath,
      );
    } else if (argsResolved.length === 1) {
      return apply(
        (val: number, arg1: number) => mathFn(val, arg1),
        [valueNodeResolved, argsResolved[0]],
        chainMath,
      );
    } else if (argsResolved.length === 2) {
      return apply(
        (val: number, arg1: number, arg2: number) => mathFn(val, arg1, arg2),
        [valueNodeResolved, argsResolved[0], argsResolved[1]],
        chainMath,
      );
    } else {
      return apply(
        (val: number, ...argVals: number[]) => mathFn(val, ...argVals),
        [valueNodeResolved, ...argsResolved],
        chainMath,
      );
    }
  };
};

// Math functions that take the number as first argument and return a Node<number>
export const mathAbs = mathChainFunction((val) => Math.abs(val), "abs");
export const mathAcos = mathChainFunction((val) => Math.acos(val), "acos");
export const mathAcosh = mathChainFunction((val) => Math.acosh(val), "acosh");
export const mathAsin = mathChainFunction((val) => Math.asin(val), "asin");
export const mathAsinh = mathChainFunction((val) => Math.asinh(val), "asinh");
export const mathAtan = mathChainFunction((val) => Math.atan(val), "atan");
export const mathAtan2 = mathChainFunction((y, x) => Math.atan2(y, x), "atan2");
export const mathAtanh = mathChainFunction((val) => Math.atanh(val), "atanh");
export const mathCbrt = mathChainFunction((val) => Math.cbrt(val), "cbrt");
export const mathCeil = mathChainFunction((val) => Math.ceil(val), "ceil");
export const mathClz32 = mathChainFunction((val) => Math.clz32(val), "clz32");
export const mathCos = mathChainFunction((val) => Math.cos(val), "cos");
export const mathCosh = mathChainFunction((val) => Math.cosh(val), "cosh");
export const mathExp = mathChainFunction((val) => Math.exp(val), "exp");
export const mathExpm1 = mathChainFunction((val) => Math.expm1(val), "expm1");
export const mathFloor = mathChainFunction((val) => Math.floor(val), "floor");
export const mathFround = mathChainFunction(
  (val) => Math.fround(val),
  "fround",
);
export const mathHypot = mathChainFunction(
  (val, ...args) => Math.hypot(val, ...args),
  "hypot",
);
export const mathImul = mathChainFunction((a, b) => Math.imul(a, b), "imul");
export const mathLog = mathChainFunction((val) => Math.log(val), "log");
export const mathLog10 = mathChainFunction((val) => Math.log10(val), "log10");
export const mathLog1p = mathChainFunction((val) => Math.log1p(val), "log1p");
export const mathLog2 = mathChainFunction((val) => Math.log2(val), "log2");
export const mathMax = mathChainFunction(
  (val, ...args) => Math.max(val, ...args),
  "max",
);
export const mathMin = mathChainFunction(
  (val, ...args) => Math.min(val, ...args),
  "min",
);
export const mathPow = mathChainFunction(
  (base, exponent) => Math.pow(base, exponent),
  "pow",
);
export const mathRandom = () => createNode(Math.random(), [], chainMath);
export const mathRound = mathChainFunction((val) => Math.round(val), "round");
export const mathSign = mathChainFunction((val) => Math.sign(val), "sign");
export const mathSin = mathChainFunction((val) => Math.sin(val), "sin");
export const mathSinh = mathChainFunction((val) => Math.sinh(val), "sinh");
export const mathSqrt = mathChainFunction((val) => Math.sqrt(val), "sqrt");
export const mathTan = mathChainFunction((val) => Math.tan(val), "tan");
export const mathTanh = mathChainFunction((val) => Math.tanh(val), "tanh");
export const mathTrunc = mathChainFunction((val) => Math.trunc(val), "trunc");

// Set up the mathematical chain object
chainMath.mult = { fn: mult, chain: () => chainMath };
chainMath.add = { fn: add, chain: () => chainMath };
chainMath.sub = { fn: sub, chain: () => chainMath };
chainMath.div = { fn: div, chain: () => chainMath };
chainMath.abs = { fn: mathAbs, chain: () => chainMath };
chainMath.acos = { fn: mathAcos, chain: () => chainMath };
chainMath.acosh = { fn: mathAcosh, chain: () => chainMath };
chainMath.asin = { fn: mathAsin, chain: () => chainMath };
chainMath.asinh = { fn: mathAsinh, chain: () => chainMath };
chainMath.atan = { fn: mathAtan, chain: () => chainMath };
chainMath.atan2 = { fn: mathAtan2, chain: () => chainMath };
chainMath.atanh = { fn: mathAtanh, chain: () => chainMath };
chainMath.cbrt = { fn: mathCbrt, chain: () => chainMath };
chainMath.ceil = { fn: mathCeil, chain: () => chainMath };
chainMath.clz32 = { fn: mathClz32, chain: () => chainMath };
chainMath.cos = { fn: mathCos, chain: () => chainMath };
chainMath.cosh = { fn: mathCosh, chain: () => chainMath };
chainMath.exp = { fn: mathExp, chain: () => chainMath };
chainMath.expm1 = { fn: mathExpm1, chain: () => chainMath };
chainMath.floor = { fn: mathFloor, chain: () => chainMath };
chainMath.fround = { fn: mathFround, chain: () => chainMath };
chainMath.hypot = { fn: mathHypot, chain: () => chainMath };
chainMath.imul = { fn: mathImul, chain: () => chainMath };
chainMath.log = { fn: mathLog, chain: () => chainMath };
chainMath.log10 = { fn: mathLog10, chain: () => chainMath };
chainMath.log1p = { fn: mathLog1p, chain: () => chainMath };
chainMath.log2 = { fn: mathLog2, chain: () => chainMath };
chainMath.max = { fn: mathMax, chain: () => chainMath };
chainMath.min = { fn: mathMin, chain: () => chainMath };
chainMath.pow = { fn: mathPow, chain: () => chainMath };
chainMath.round = { fn: mathRound, chain: () => chainMath };
chainMath.sign = { fn: mathSign, chain: () => chainMath };
chainMath.sin = { fn: mathSin, chain: () => chainMath };
chainMath.sinh = { fn: mathSinh, chain: () => chainMath };
chainMath.sqrt = { fn: mathSqrt, chain: () => chainMath };
chainMath.tan = { fn: mathTan, chain: () => chainMath };
chainMath.tanh = { fn: mathTanh, chain: () => chainMath };
chainMath.trunc = { fn: mathTrunc, chain: () => chainMath };

export { chainMath };
