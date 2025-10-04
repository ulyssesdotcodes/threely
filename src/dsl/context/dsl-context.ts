// DSL Context creation and management - extracted from parser.ts
import * as THREE from "three/webgpu";
import { Graph } from "../../graph";
import { MockObject3D, mockUtils, mockPresets } from "../../three/MockObject3D";
import * as obj3dChain from "../object3d-chain";
import * as mathChain from "../math-chain";
import { setRendererForChain } from "../object3d-chain";
import { computeInit } from "../compute/compute-init";
import { pointsFromNodes } from "../compute/points-renderer";

// Default renderer for backward compatibility
let defaultRenderer: any = null;

// Create a DSL context with all the functional versions
export function createDslContext(renderer?: any): any {
  return {
    // Object3D functions
    sphere: obj3dChain.sphere,
    box: obj3dChain.box,
    cylinder: obj3dChain.cylinder,
    material: obj3dChain.material,
    mesh: obj3dChain.mesh,
    translateX: obj3dChain.translateX,
    translateY: obj3dChain.translateY,
    translateZ: obj3dChain.translateZ,
    rotateX: obj3dChain.rotateX,
    rotateY: obj3dChain.rotateY,
    rotateZ: obj3dChain.rotateZ,
    applyMock: obj3dChain.applyMock,
    render: obj3dChain.render,

    // Math functions
    frame: mathChain.frame,
    mult: mathChain.mult,
    add: mathChain.add,
    sub: mathChain.sub,
    div: mathChain.div,
    mathAbs: mathChain.mathAbs,
    mathAcos: mathChain.mathAcos,
    mathAcosh: mathChain.mathAcosh,
    mathAsin: mathChain.mathAsin,
    mathAsinh: mathChain.mathAsinh,
    mathAtan: mathChain.mathAtan,
    mathAtan2: mathChain.mathAtan2,
    mathAtanh: mathChain.mathAtanh,
    mathCbrt: mathChain.mathCbrt,
    mathCeil: mathChain.mathCeil,
    mathClz32: mathChain.mathClz32,
    mathCos: mathChain.mathCos,
    mathCosh: mathChain.mathCosh,
    mathExp: mathChain.mathExp,
    mathExpm1: mathChain.mathExpm1,
    mathFloor: mathChain.mathFloor,
    mathFround: mathChain.mathFround,
    mathHypot: mathChain.mathHypot,
    mathImul: mathChain.mathImul,
    mathLog: mathChain.mathLog,
    mathLog10: mathChain.mathLog10,
    mathLog1p: mathChain.mathLog1p,
    mathLog2: mathChain.mathLog2,
    mathMax: mathChain.mathMax,
    mathMin: mathChain.mathMin,
    mathPow: mathChain.mathPow,
    mathRandom: mathChain.mathRandom,
    mathRound: mathChain.mathRound,
    mathSign: mathChain.mathSign,
    mathSin: mathChain.mathSin,
    mathSinh: mathChain.mathSinh,
    mathSqrt: mathChain.mathSqrt,
    mathTan: mathChain.mathTan,
    mathTanh: mathChain.mathTanh,
    mathTrunc: mathChain.mathTrunc,

    // Utilities
    mockUtils,
    mockPresets,
    clearAll: obj3dChain.clearAll,
    Graph,
    Math,
    console,
    THREE,

    // Compute functions
    computeInit,
    pointsFromNodes,

    // Renderer (if provided)
    ...(renderer && { renderer }),
  };
}

// Set renderer for DSL context
export function setRenderer(renderer: any): void {
  defaultRenderer = renderer;
  setRendererForChain(renderer);
}

// Get default renderer
export function getDefaultRenderer(): any {
  return defaultRenderer;
}

// Create default context for backward compatibility - this is no longer mutated directly
export const defaultDslContext = createDslContext();
