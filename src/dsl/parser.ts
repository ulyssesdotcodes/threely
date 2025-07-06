// DSL Parser and execution engine
import * as THREE from "three";
import { parser } from "@lezer/javascript";
import { NodysseusRuntime } from "../nodysseus/runtime-core";
import {
  MockObject3D,
  applyMockToObject3D,
  createGeometryFromMock,
  mockUtils,
  mockPresets,
} from "../three/MockObject3D";
// Import object registry from pure functions
// import { getObjectRegistry } from './object3d-chain';
// Use pure functions instead of Node-based chains
import * as pureObj3d from "./pure-object3d-functions";
import * as pureMath from "./pure-math-functions";
import { convertASTToNodysseus } from "./direct-ast-to-nodysseus-converter";
import { RangeSet } from "@codemirror/state";
import {
  FunctionCallInfo,
  UUIDTag,
  generateUUIDTags,
  getUUIDFromState,
} from "../uuid-tagging";

// Global map to store function call positions and UUIDs
const functionCallUUIDs = new Map<string, string>();

// Log to the error panel at the bottom of the page
function logToPanel(
  message: string,
  type: "info" | "warn" | "error" = "info",
  ...args
): void {
  if (typeof window !== "undefined" && window.document) {
    const errorPanel = document.getElementById("error-panel");
    const errorMessages = document.getElementById("error-messages");

    if (errorPanel && errorMessages) {
      const messageDiv = document.createElement("div");
      messageDiv.className = `error-message ${type}`;

      const timestamp = new Date().toLocaleTimeString();
      const timestampSpan = document.createElement("span");
      timestampSpan.className = "error-timestamp";
      timestampSpan.textContent = `[${timestamp}]`;

      messageDiv.appendChild(timestampSpan);
      messageDiv.appendChild(document.createTextNode(` ${message}`));

      errorMessages.appendChild(messageDiv);
      errorPanel.classList.add("has-errors");

      // Auto-scroll to bottom
      errorMessages.scrollTop = errorMessages.scrollHeight;
    }
  }

  // Also log to console for debugging
  console.log(`[DSL] ${message}`, ...args);
}

// Simple hash function for browser compatibility
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// Generate deterministic UUID based on position and function name
function generateFunctionUUID(
  functionName: string,
  position: number,
  code: string,
): string {
  const key = `${functionName}:${position}:${code.length}`;
  if (!functionCallUUIDs.has(key)) {
    const hash = simpleHash(key);
    const uuid = `${hash.slice(0, 8)}-${hash.slice(8, 12) || "0000"}-${hash.slice(12, 16) || "0000"}-${hash.slice(16, 20) || "0000"}-${hash.slice(20, 32) || "000000000000"}`;
    functionCallUUIDs.set(key, uuid);
    logToPanel(
      `Generated new UUID for ${functionName} at position ${position}: ${uuid}`,
    );
  } else {
    logToPanel(
      `Reusing existing UUID for ${functionName} at position ${position}: ${functionCallUUIDs.get(key)!}`,
    );
  }
  return functionCallUUIDs.get(key)!;
}

// Direct AST to Nodysseus parser (eliminates functional graph layer)
// Returns the Nodysseus graph for execution by executeDSL
export function parseDSLWithLezer(
  code: string,
  dslContext: any,
  ranges: RangeSet<UUIDTag> = RangeSet.empty,
  startOffset: number = 0,
) {
  console.log("parse", ranges);
  try {
    console.log(
      "🚀 PARSER: Using direct AST to Nodysseus converter for code:",
      code,
    );
    logToPanel("🚀 Using direct AST to Nodysseus converter...");

    const cleanCode = code.trim();
    logToPanel(`📝 Input code: ${cleanCode}`);

    // Generate UUID tags for function calls before conversion
    // generateUUIDTags(cleanCode);

    // Use the direct converter with pure functions (no functional graph layer)
    const conversionResult = convertASTToNodysseus(
      cleanCode,
      ranges,
      dslContext,
      startOffset,
    );

    logToPanel(
      `🎯 Direct conversion result: ${conversionResult.conversionLog.length} nodes converted`,
    );
    logToPanel(`📊 Root node: ${conversionResult.rootNodeId}`);

    // LOG THE COMPLETE GRAPH OBJECT
    console.log("🔍 COMPLETE NODYSSEUS GRAPH OBJECT:");
    console.log("📊 GRAPH SUMMARY:");
    console.log(
      `   Nodes: ${Object.keys(conversionResult.graph.nodes).length}`,
    );
    console.log(
      `   Edges: ${Object.keys(conversionResult.graph.edges).length}`,
    );
    console.log(`   Root: ${conversionResult.rootNodeId}`);

    console.log("📝 NODE DETAILS:");
    Object.entries(conversionResult.graph.nodes).forEach(([id, node]) => {
      const type = "ref" in node ? "RefNode" : "ValueNode";
      const ref = "ref" in node ? node.ref : undefined;
      const valueDesc =
        typeof node.value === "function"
          ? `[Function: ${node.value.name}]`
          : JSON.stringify(node.value).substring(0, 50);
      console.log(`   ${id}: ${type} ${ref ? `(${ref})` : ""} = ${valueDesc}`);
    });

    console.log("🔗 EDGE STRUCTURE:");
    Object.entries(conversionResult.graph.edges_in || {}).forEach(
      ([nodeId, edges]) => {
        const deps = Object.keys(edges);
        console.log(`   ${nodeId} ← [${deps.join(", ")}]`);
      },
    );

    console.log("Raw graph object:", conversionResult.graph);

    // Log conversion details
    conversionResult.conversionLog.forEach((entry) => {
      const warnings = entry.warnings ? ` (${entry.warnings.join(", ")})` : "";
      logToPanel(
        `  🔗 ${entry.astNodeType} -> ${entry.nodysseusNodeType} (${entry.nodysseusNodeId})${warnings} ${entry.nodeText}`,
      );
    });

    // Return the graph for execution by executeDSL
    return conversionResult;
  } catch (error) {
    logToPanel(`❌ Direct conversion error: ${error}`, "error");
    console.error("Direct conversion error:", error);
    return null;
  }
}

// Important that this isn't created every time executeDSL is called!
const runtime = new NodysseusRuntime();

// Shared frame watching setup logic
function setupFrameWatching(
  graph: any,
  rootNodeId: string,
  finalComputed: any,
  objectRegistry: Map<string, any>,
): void {
  // Set up watching for any object in the registry, regardless of frame usage
  if (finalComputed instanceof THREE.Object3D) {
    // Get the object name from the rendered object's graphId property
    const objectName = (finalComputed as any).graphId;
    const renderNodeId = rootNodeId;
    const renderInputEdges = graph.edges_in?.[renderNodeId];

    console.log("Setting up watch for object:", objectName);
    console.log("Object in registry?", objectRegistry.has(objectName));

    if (renderInputEdges && objectName) {
      // Find the edge that represents the first argument (the MockObject3D)
      let mockObjectNodeId: string | null = null;
      for (const [fromNodeId, edge] of Object.entries(renderInputEdges)) {
        if (
          edge &&
          typeof edge === "object" &&
          "as" in edge &&
          edge.as === "arg0"
        ) {
          mockObjectNodeId = fromNodeId;
          break;
        }
      }

      console.log("mockobj", mockObjectNodeId);
      if (mockObjectNodeId) {
        const scopeKey = graph.id + "/" + mockObjectNodeId;
        const nodeToWatch = runtime.scope.get(scopeKey);
        console.log("watch?", nodeToWatch, objectRegistry.has(objectName));

        if (nodeToWatch && objectRegistry.has(objectName)) {
          runtime.stopWatch(nodeToWatch);
          const watch = runtime.createWatch<MockObject3D>(nodeToWatch);

          // Start watching for frame updates
          (async () => {
            try {
              for await (const updatedValue of watch) {
                const existingObject = objectRegistry.get(objectName);
                if (existingObject) {
                  applyMockToObject3D(existingObject, updatedValue);
                } else {
                  break;
                }
              }
            } catch (error) {
              console.warn("Watch loop error:", error);
            }
          })();
        }
      }
    }
  }
}

// Execute DSL code and run the graph if the result is a Node
// Create a DSL context with pure function versions (no Node dependencies)
const defaultDslContext = {
  // Object3D functions - pure functions that return primitive values
  sphere: pureObj3d.sphere,
  box: pureObj3d.box,
  cylinder: pureObj3d.cylinder,
  material: pureObj3d.material,
  mesh: pureObj3d.mesh,
  translateX: pureObj3d.translateX,
  translateY: pureObj3d.translateY,
  translateZ: pureObj3d.translateZ,
  rotateX: pureObj3d.rotateX,
  rotateY: pureObj3d.rotateY,
  rotateZ: pureObj3d.rotateZ,
  applyMock: pureObj3d.applyMock,
  render: pureObj3d.render,

  // Math functions - pure functions that return primitive values
  frame: pureMath.frame,
  mult: pureMath.mult,
  add: pureMath.add,
  sub: pureMath.sub,
  div: pureMath.div,
  mathAbs: pureMath.mathAbs,
  mathAcos: pureMath.mathAcos,
  mathAcosh: pureMath.mathAcosh,
  mathAsin: pureMath.mathAsin,
  mathAsinh: pureMath.mathAsinh,
  mathAtan: pureMath.mathAtan,
  mathAtan2: pureMath.mathAtan2,
  mathAtanh: pureMath.mathAtanh,
  mathCbrt: pureMath.mathCbrt,
  mathCeil: pureMath.mathCeil,
  mathClz32: pureMath.mathClz32,
  mathCos: pureMath.mathCos,
  mathCosh: pureMath.mathCosh,
  mathExp: pureMath.mathExp,
  mathExpm1: pureMath.mathExpm1,
  mathFloor: pureMath.mathFloor,
  mathFround: pureMath.mathFround,
  mathHypot: pureMath.mathHypot,
  mathImul: pureMath.mathImul,
  mathLog: pureMath.mathLog,
  mathLog10: pureMath.mathLog10,
  mathLog1p: pureMath.mathLog1p,
  mathLog2: pureMath.mathLog2,
  mathMax: pureMath.mathMax,
  mathMin: pureMath.mathMin,
  mathPow: pureMath.mathPow,
  mathRandom: pureMath.mathRandom,
  mathRound: pureMath.mathRound,
  mathSign: pureMath.mathSign,
  mathSin: pureMath.mathSin,
  mathSinh: pureMath.mathSinh,
  mathSqrt: pureMath.mathSqrt,
  mathTan: pureMath.mathTan,
  mathTanh: pureMath.mathTanh,
  mathTrunc: pureMath.mathTrunc,

  // Chain objects for method resolution
  chainMath: pureMath.chainMath,
  chainObj3d: pureObj3d.chainObj3d,

  // Utilities
  mockUtils,
  mockPresets,
  clearAll: pureObj3d.clearAll,
  Math,
  console,
};

export function executeDSL(
  code: string,
  ranges: RangeSet<UUIDTag> = RangeSet.empty,
  dslContextParam?: any,
  startOffset: number = 0,
): THREE.Object3D | number | string | boolean | null {
  try {
    const contextToUse = dslContextParam || defaultDslContext;

    // Parse with Lezer converter (returns conversion result with graph)
    const conversionResult = parseDSLWithLezer(
      code,
      contextToUse,
      ranges,
      startOffset,
    );

    if (!conversionResult) {
      return null;
    }

    const objectRegistry = pureObj3d.getObjectRegistry();

    // Execute the Nodysseus graph
    console.log("\n🚀 EXECUTING NODYSSEUS GRAPH...");
    console.log(
      "About to execute graph with root node:",
      conversionResult.rootNodeId,
    );

    let finalComputed;
    try {
      finalComputed = runtime.runGraphNode(
        conversionResult.graph,
        conversionResult.rootNodeId,
      );
      console.log("✅ Graph execution completed successfully");
      console.log("🎯 EXECUTION RESULT ANALYSIS:");
      console.log("   Type:", typeof finalComputed);
      console.log("   Constructor:", finalComputed?.constructor?.name);
      console.log(
        "   Is THREE.Object3D:",
        finalComputed instanceof THREE.Object3D,
      );
      console.log("   Has geometry:", finalComputed?.geometry ? "YES" : "NO");
      console.log("   Has material:", finalComputed?.material ? "YES" : "NO");
      console.log("   Position:", finalComputed?.position);
      console.log("   Full result:", finalComputed);
    } catch (error) {
      console.error("❌ ERROR during graph execution:", error);
      console.error("Stack trace:", (error as Error).stack);
      throw error;
    }

    // Set up frame watching if needed
    setupFrameWatching(
      conversionResult.graph,
      conversionResult.rootNodeId,
      finalComputed,
      objectRegistry,
    );

    return finalComputed;
  } catch (error) {
    console.error("DSL execution error:", error);
    return null;
  }
}

// Export logToPanel for use in other modules
export { logToPanel };

// Export dslContext for external use
export { defaultDslContext as dslContext };
