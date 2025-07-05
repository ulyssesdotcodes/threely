// Direct AST to Nodysseus Converter - Functional Programming Approach
// Eliminates the functional graph intermediate layer for better performance
import { parser } from "@lezer/javascript";
import {
  NodysseusNode,
  RefNode,
  ValueNode,
  Graph as NodysseusGraph,
  Edge,
} from "../nodysseus/types";
import { logToPanel } from "./parser";
import { UUIDTag } from "../uuid-tagging";
import { RangeSet } from "@codemirror/state";

// Types
export type DirectConversionContext = {
  dslContext: Record<string, any>; // DSL functions and variables
  nodes: Record<string, NodysseusNode>; // Accumulated Nodysseus nodes
  edges: Record<string, Edge>; // Accumulated edges
  edges_in: Record<string, Record<string, Edge>>; // Reverse lookup
  nodeCounter: number; // For generating unique IDs
  sourceCode: string; // Source for error reporting
  visitedNodes: Map<string, string>; // AST position key → node ID
  conversionLog: ConversionLogEntry[]; // Moved from class instance to context
};

export type DirectConversionResult = {
  nodeId: string;
};

export type ConversionLogEntry = {
  astNodeType: string;
  position: { from: number; to: number };
  nodysseusNodeId: string;
  nodysseusNodeType: "RefNode" | "ValueNode";
  functionResolved?: string;
  warnings?: string[];
  uuid?: string;
};

export type DirectASTToNodysseusResult = {
  graph: NodysseusGraph;
  rootNodeId: string;
  conversionLog: ConversionLogEntry[];
};

export type CallExpressionParts = {
  functionName: string;
  targetNode: any | null;
  args: any[];
};

// Core conversion function - replaces the class convert method
export function convertASTToNodysseus(
  sourceCode: string,
  ranges: RangeSet<UUIDTag>,
  dslContext?: Record<string, any>,
  startOffset: number = 0,
): DirectASTToNodysseusResult {
  const context: DirectConversionContext = {
    dslContext: dslContext || {},
    nodes: {},
    edges: {},
    edges_in: {},
    nodeCounter: 0,
    sourceCode: sourceCode.trim(),
    visitedNodes: new Map(),
    conversionLog: [],
  };

  logToPanel("🚀 Starting direct AST to Nodysseus conversion...");
  logToPanel(`📝 Source code: ${context.sourceCode}`);

  // Parse with Lezer
  const tree = parser.parse(context.sourceCode);
  logToPanel("🌳 Parsed AST with Lezer", "info", tree);

  // Convert AST directly to Nodysseus
  const rootNodeId = convertASTNode(tree.topNode, ranges, context, startOffset);
  logToPanel(`🎯 Created Nodysseus graph with root node: ${rootNodeId}`);

  // Build the complete graph
  const graph: NodysseusGraph = {
    id: `direct-nodysseus-graph-${Date.now()}`,
    out: rootNodeId,
    nodes: context.nodes,
    edges: context.edges,
    edges_in: context.edges_in,
  };

  logToPanel(
    `✅ Conversion complete: ${Object.keys(context.nodes).length} nodes, ${Object.keys(context.edges).length} edges`,
  );

  return {
    graph,
    rootNodeId,
    conversionLog: context.conversionLog,
  };
}

// Utility functions
function nodeIdFromRangeSet(
  astNode: any,
  ranges: RangeSet<UUIDTag>,
  startOffset: number = 0,
): string | null {
  let nodeRanges: { from: number; to: number; uuid: UUIDTag }[] = [];
  // Adjust the AST node positions by the start offset when searching ranges
  const adjustedFrom = astNode.from + startOffset;
  const adjustedTo = astNode.to + startOffset;

  ranges.between(adjustedFrom, adjustedTo, (from, to, uuid) => {
    // Only include ranges that overlap with our adjusted AST node
    if (!(to < adjustedFrom || from > adjustedTo)) {
      nodeRanges.push({ from, to, uuid });
    }
  });

  // Sort by range size (smallest first) to find the most specific match
  const smallestRange = nodeRanges.sort(
    (a, b) => a.to - a.from - (b.to - b.from),
  )[0];
  return smallestRange?.uuid.uuid || null;
}

function generateNodeId(context: DirectConversionContext): string {
  return `node-${++context.nodeCounter}`;
}

function getNodeText(astNode: any, context: DirectConversionContext): string {
  return context.sourceCode.slice(astNode.from, astNode.to);
}

function logConversion(
  astNode: any,
  nodeId: string,
  nodeType: "RefNode" | "ValueNode",
  context: DirectConversionContext,
  functionResolved?: string,
  warnings?: string[],
  uuid?: string,
): void {
  context.conversionLog.push({
    astNodeType: astNode.name,
    position: { from: astNode.from, to: astNode.to },
    nodysseusNodeId: nodeId,
    nodysseusNodeType: nodeType,
    functionResolved,
    warnings,
    uuid,
  });
}

// Node creation functions
function createValueNode(
  nodeId: string,
  value: any,
  context: DirectConversionContext,
  uuid?: string,
): void {
  console.log(
    `📦 Creating ValueNode ${nodeId}: ${typeof value} = ${JSON.stringify(value)}`,
  );

  const valueNode: ValueNode = {
    id: nodeId,
    value: value,
    ...(uuid && { uuid }),
  };

  context.nodes[nodeId] = valueNode;
}

function createRefNode(
  nodeId: string,
  ref: string,
  value: any,
  context: DirectConversionContext,
  uuid?: string,
): void {
  const refNode: RefNode = {
    id: nodeId,
    ref,
    value,
    ...(uuid && { uuid }),
  };

  context.nodes[nodeId] = refNode;
}

function createExecutableRefNode(
  nodeId: string,
  fn: Function,
  dependencyNodeIds: string[],
  context: DirectConversionContext,
  uuid?: string,
): void {
  // Create the RefNode
  const refNode: RefNode = {
    id: nodeId,
    ref: "@graph.executable",
    value: fn,
    ...(uuid && { uuid }),
  };

  context.nodes[nodeId] = refNode;

  // Create edges for dependencies (avoid self-referential edges)
  console.log(
    `   Creating ${dependencyNodeIds.length} edges for ${fn.name || "unknown"} (${nodeId})`,
  );
  dependencyNodeIds.forEach((depNodeId, index) => {
    if (depNodeId !== nodeId) {
      console.log(`     EDGE: ${depNodeId} --arg${index}--> ${nodeId}`);
      createEdge(depNodeId, nodeId, `arg${index}`, context);
    } else {
      console.log(`     SKIP: self-referential edge for ${nodeId}`);
    }
  });
}

function createEdge(
  fromNodeId: string,
  toNodeId: string,
  as: string,
  context: DirectConversionContext,
): void {
  const edgeId = `${fromNodeId}_to_${toNodeId}_as_${as}`;
  const edge: Edge = { from: fromNodeId, to: toNodeId, as };

  context.edges[edgeId] = edge;

  // Update edges_in reverse lookup
  if (!context.edges_in[toNodeId]) {
    context.edges_in[toNodeId] = {};
  }
  context.edges_in[toNodeId][fromNodeId] = edge;
}

// Main conversion function
export function convertASTNode(
  astNode: any,
  ranges: RangeSet<UUIDTag>,
  context: DirectConversionContext,
  startOffset: number = 0,
  nodeText?: string,
): string {
  const nodeKey = `${astNode.from}-${astNode.to}`;
  const actualNodeText = nodeText || getNodeText(astNode, context);

  // Check if already converted
  if (context.visitedNodes.has(nodeKey)) {
    return context.visitedNodes.get(nodeKey)!;
  }

  logToPanel(
    `🔍 Converting AST node: ${astNode.name} (${astNode.from}-${astNode.to})`,
  );

  let nodeId: string;

  switch (astNode.name) {
    case "Script":
    case "ExpressionStatement":
      // Don't cache wrapper nodes - just return child result directly
      return convertFirstChild(
        astNode,
        ranges,
        context,
        startOffset,
        actualNodeText,
      );

    case "CallExpression":
      nodeId = convertCallExpression(
        astNode,
        ranges,
        context,
        startOffset,
        actualNodeText,
      );
      break;

    case "MemberExpression":
      nodeId = convertMemberExpression(
        astNode,
        ranges,
        context,
        startOffset,
        actualNodeText,
      );
      break;

    case "VariableName":
      nodeId = convertVariableName(
        astNode,
        ranges,
        context,
        startOffset,
        actualNodeText,
      );
      break;

    case "Number":
      nodeId = convertNumber(
        astNode,
        ranges,
        context,
        startOffset,
        actualNodeText,
      );
      break;

    case "String":
      nodeId = convertString(
        astNode,
        ranges,
        context,
        startOffset,
        actualNodeText,
      );
      break;

    case "ObjectExpression":
      nodeId = convertObjectExpression(
        astNode,
        ranges,
        context,
        startOffset,
        actualNodeText,
      );
      break;

    default:
      logToPanel(`⚠️ Unknown AST node type: ${astNode.name}`, "warn");
      // Don't cache unknown wrapper nodes either
      return convertFirstChild(
        astNode,
        ranges,
        context,
        startOffset,
        actualNodeText,
      );
  }

  context.visitedNodes.set(nodeKey, nodeId);
  return nodeId;
}

// Conversion helper functions
function convertFirstChild(
  astNode: any,
  ranges: RangeSet<UUIDTag>,
  context: DirectConversionContext,
  startOffset: number = 0,
  nodeText?: string,
): string {
  if (astNode.firstChild) {
    return convertASTNode(
      astNode.firstChild,
      ranges,
      context,
      startOffset,
      nodeText,
    );
  }

  // Fallback to null constant
  const nodeId = generateNodeId(context);
  logToPanel(
    `⚠️ No child found for ${astNode.name}, creating null constant`,
    "warn",
  );

  createValueNode(nodeId, null, context);
  return nodeId;
}

function convertCallExpression(
  astNode: any,
  ranges: RangeSet<UUIDTag>,
  context: DirectConversionContext,
  startOffset: number = 0,
  nodeText?: string,
): string {
  // Check if this is part of a method chain
  if (isMethodChain(astNode, context)) {
    return convertMethodChain(astNode, ranges, context, startOffset, nodeText);
  } else {
    return convertSingleCall(astNode, ranges, context, startOffset, nodeText);
  }
}

function isMethodChain(
  astNode: any,
  context: DirectConversionContext,
): boolean {
  const { targetNode } = extractCallExpressionParts(astNode, context);
  // If target is a CallExpression, this is method chaining
  return targetNode && targetNode.name === "CallExpression";
}

function extractChainCalls(
  astNode: any,
  context: DirectConversionContext,
): any[] {
  const calls: any[] = [];
  let currentNode = astNode;

  // Walk up the chain from outermost to innermost
  while (currentNode && currentNode.name === "CallExpression") {
    calls.unshift(currentNode); // Add to beginning for proper order
    const { targetNode } = extractCallExpressionParts(currentNode, context);
    currentNode = targetNode;
  }

  return calls;
}

function convertSingleCall(
  astNode: any,
  ranges: RangeSet<UUIDTag>,
  context: DirectConversionContext,
  startOffset: number = 0,
  nodeText?: string,
): string {
  // Extract the parts of this specific call expression
  const { functionName, targetNode, args } = extractCallExpressionParts(
    astNode,
    context,
  );

  const uuid = nodeIdFromRangeSet(astNode, ranges, startOffset);
  const nodeId = uuid || generateNodeId(context);

  console.log(
    `🔧 SINGLE CALL: ${functionName} at ${astNode.from}-${astNode.to}, nodeId: ${nodeId}`,
  );
  console.log(
    `   args: ${args.length}, targetNode: ${targetNode ? "YES" : "NO"}`,
  );

  // Look up function in DSL context or chain context
  let dslFunction = context.dslContext[functionName];
  let resolvedFunctionName = functionName;

  // If it's a method call (has targetNode), try chain context
  if (!dslFunction && targetNode) {
    const chainContext = getChainContext(functionName, context);
    if (
      chainContext &&
      chainContext[functionName] &&
      chainContext[functionName].fn
    ) {
      dslFunction = chainContext[functionName].fn;
      resolvedFunctionName = dslFunction.name || functionName;
      logToPanel(
        `🔗 Resolved chain method ${functionName} to ${resolvedFunctionName}`,
      );
    }
  }

  if (!dslFunction) {
    logToPanel(
      `❌ Function '${functionName}' not found in DSL context`,
      "error",
    );
    logConversion(
      astNode,
      nodeId,
      "RefNode",
      context,
      functionName,
      ["Function not found in DSL context"],
      uuid || undefined,
    );

    // Create error RefNode
    createRefNode(
      nodeId,
      "@error.unknown_function",
      functionName,
      context,
      uuid || undefined,
    );
    return nodeId;
  }

  // Convert arguments to nodes
  console.log(`   Converting ${args.length} arguments for ${functionName}...`);
  const argNodeIds = args.map((arg: any, index: number) => {
    const argNodeId = convertASTNode(arg, ranges, context, startOffset);
    console.log(
      `     arg${index}: ${arg.name} (${arg.from}-${arg.to}) → ${argNodeId}`,
    );
    return argNodeId;
  });

  // Build dependencies array
  const dependencyNodeIds: string[] = [];

  if (targetNode) {
    // Method call: target object result is first argument
    console.log(`   Processing method call ${functionName} with target`);
    const targetNodeId = convertASTNode(
      targetNode,
      ranges,
      context,
      startOffset,
    );
    console.log(
      `     target: ${targetNode.name} (${targetNode.from}-${targetNode.to}) → ${targetNodeId}`,
    );
    dependencyNodeIds.push(targetNodeId);
    dependencyNodeIds.push(...argNodeIds);
  } else {
    // Function call: just the arguments
    console.log(`   Processing function call ${functionName}`);
    dependencyNodeIds.push(...argNodeIds);
  }

  console.log(
    `   ${functionName} dependencies: [${dependencyNodeIds.join(", ")}]`,
  );

  // Check if this is a special function that returns a RefNode directly (like frame)
  if (resolvedFunctionName === "frame" || dslFunction.name === "frame") {
    // Handle frame function specially - create RefNode directly
    const frameResult = dslFunction(uuid);
    logConversion(
      astNode,
      nodeId,
      "RefNode",
      context,
      resolvedFunctionName,
      undefined,
      uuid || undefined,
    );
    createRefNode(
      nodeId,
      frameResult.ref,
      frameResult,
      context,
      uuid || undefined,
    );
  } else {
    // Create the executable RefNode for this individual function call
    logConversion(
      astNode,
      nodeId,
      "RefNode",
      context,
      resolvedFunctionName,
      undefined,
      uuid || undefined,
    );
    createExecutableRefNode(
      nodeId,
      dslFunction,
      dependencyNodeIds,
      context,
      uuid || undefined,
    );
  }

  return nodeId;
}

function convertMethodChain(
  astNode: any,
  ranges: RangeSet<UUIDTag>,
  context: DirectConversionContext,
  startOffset: number = 0,
  nodeText?: string,
): string {
  const chainCalls = extractChainCalls(astNode, context);
  console.log(
    `🔗 METHOD CHAIN: Processing ${chainCalls.length} calls in chain`,
  );

  let previousNodeId: string | null = null;
  let currentNodeId: string = "";

  // Process each call in the chain sequentially
  for (let i = 0; i < chainCalls.length; i++) {
    const callNode = chainCalls[i];
    const { functionName, args } = extractCallExpressionParts(
      callNode,
      context,
    );

    const uuid = nodeIdFromRangeSet(callNode, ranges, startOffset);
    currentNodeId = uuid || generateNodeId(context);

    console.log(
      `🔗 CHAIN STEP ${i + 1}: ${functionName} at ${callNode.from}-${callNode.to}, nodeId: ${currentNodeId}`,
    );

    // Look up function in DSL context or chain context
    let dslFunction = context.dslContext[functionName];
    let resolvedFunctionName = functionName;

    // If it's not the first call in chain, try chain context
    if (!dslFunction && i > 0) {
      const chainContext = getChainContext(functionName, context);
      if (
        chainContext &&
        chainContext[functionName] &&
        chainContext[functionName].fn
      ) {
        dslFunction = chainContext[functionName].fn;
        resolvedFunctionName = dslFunction.name || functionName;
        logToPanel(
          `🔗 Resolved chain method ${functionName} to ${resolvedFunctionName}`,
        );
      }
    }

    if (!dslFunction) {
      logToPanel(
        `❌ Function '${functionName}' not found in DSL context`,
        "error",
      );
      logConversion(
        callNode,
        currentNodeId,
        "RefNode",
        context,
        functionName,
        ["Function not found in DSL context"],
        uuid || undefined,
      );

      // Create error RefNode
      createRefNode(
        currentNodeId,
        "@error.unknown_function",
        functionName,
        context,
        uuid || undefined,
      );
      continue;
    }

    // Convert arguments to nodes
    console.log(
      `   Converting ${args.length} arguments for ${functionName}...`,
    );
    const argNodeIds = args.map((arg: any, index: number) => {
      const argNodeId = convertASTNode(arg, ranges, context, startOffset);
      console.log(
        `     arg${index}: ${arg.name} (${arg.from}-${arg.to}) → ${argNodeId}`,
      );
      return argNodeId;
    });

    // Build dependencies array for this step
    const dependencyNodeIds: string[] = [];

    if (previousNodeId) {
      // Method call in chain: previous result is first dependency
      console.log(
        `   Chain method ${functionName} depends on previous: ${previousNodeId}`,
      );
      dependencyNodeIds.push(previousNodeId);
      dependencyNodeIds.push(...argNodeIds);
    } else {
      // First call in chain: just the arguments
      console.log(`   First call ${functionName} in chain`);
      dependencyNodeIds.push(...argNodeIds);
    }

    console.log(
      `   ${functionName} dependencies: [${dependencyNodeIds.join(", ")}]`,
    );

    // Check if this is a special function that returns a RefNode directly (like frame)
    if (resolvedFunctionName === "frame" || dslFunction.name === "frame") {
      // Handle frame function specially - create RefNode directly
      const frameResult = dslFunction(uuid);
      logConversion(
        callNode,
        currentNodeId,
        "RefNode",
        context,
        resolvedFunctionName,
        undefined,
        uuid || undefined,
      );
      createRefNode(
        currentNodeId,
        frameResult.ref,
        frameResult,
        context,
        uuid || undefined,
      );
    } else {
      // Create the executable RefNode for this individual function call
      logConversion(
        callNode,
        currentNodeId,
        "RefNode",
        context,
        resolvedFunctionName,
        undefined,
        uuid || undefined,
      );
      createExecutableRefNode(
        currentNodeId,
        dslFunction,
        dependencyNodeIds,
        context,
        uuid || undefined,
      );
    }

    // Update for next iteration
    previousNodeId = currentNodeId;
  }

  console.log(`🔗 METHOD CHAIN COMPLETE: Final node ${currentNodeId}`);
  return currentNodeId;
}

function convertMemberExpression(
  astNode: any,
  ranges: RangeSet<UUIDTag>,
  context: DirectConversionContext,
  startOffset: number = 0,
  nodeText?: string,
): string {
  logToPanel(
    `🔗 Member expression: ${nodeText || getNodeText(astNode, context)}`,
  );

  // Find the property name and object
  let propertyName = "";
  let objectNode = null;

  let child = astNode.firstChild;
  while (child) {
    if (child.name === "PropertyName") {
      propertyName = getNodeText(child, context);
    } else if (child.name !== ".") {
      objectNode = child;
    }
    child = child.nextSibling;
  }

  if (objectNode) {
    const baseNodeId = convertASTNode(objectNode, ranges, context, startOffset);
    logToPanel(`🔗 Member access: ${propertyName} on node ${baseNodeId}`);
    return baseNodeId; // Return the base node; property access handled by parent CallExpression
  }

  return convertFirstChild(astNode, ranges, context, startOffset, nodeText);
}

function convertVariableName(
  astNode: any,
  ranges: RangeSet<UUIDTag>,
  context: DirectConversionContext,
  startOffset: number = 0,
  nodeText?: string,
): string {
  const uuid = nodeIdFromRangeSet(astNode, ranges, startOffset);
  const nodeId = uuid || generateNodeId(context);
  const variableName = nodeText || getNodeText(astNode, context);

  logToPanel(`🏷️ Converting variable: ${variableName}`);

  const dslValue = context.dslContext[variableName];

  if (dslValue !== undefined) {
    if (typeof dslValue === "function") {
      // Function reference
      logConversion(
        astNode,
        nodeId,
        "RefNode",
        context,
        variableName,
        undefined,
        uuid || undefined,
      );
      createRefNode(
        nodeId,
        "@dsl.function",
        dslValue,
        context,
        uuid || undefined,
      );
    } else {
      // Constant value
      logConversion(
        astNode,
        nodeId,
        "ValueNode",
        context,
        variableName,
        undefined,
        uuid || undefined,
      );
      createValueNode(nodeId, dslValue, context, uuid || undefined);
    }
  } else {
    logToPanel(
      `⚠️ Variable '${variableName}' not found in DSL context`,
      "warn",
    );
    logConversion(
      astNode,
      nodeId,
      "ValueNode",
      context,
      variableName,
      ["Variable not found in DSL context"],
      uuid || undefined,
    );
    createValueNode(nodeId, variableName, context, uuid || undefined);
  }

  return nodeId;
}

function convertNumber(
  astNode: any,
  ranges: RangeSet<UUIDTag>,
  context: DirectConversionContext,
  startOffset: number = 0,
  nodeText?: string,
): string {
  const uuid = nodeIdFromRangeSet(astNode, ranges, startOffset);
  const nodeId = uuid || generateNodeId(context);
  const numberText = nodeText || getNodeText(astNode, context);
  const numberValue = parseFloat(numberText);

  logToPanel(`🔢 Converting number: ${numberValue}`);
  logConversion(
    astNode,
    nodeId,
    "ValueNode",
    context,
    undefined,
    undefined,
    uuid || undefined,
  );

  createValueNode(nodeId, numberValue, context, uuid || undefined);
  return nodeId;
}

function convertString(
  astNode: any,
  ranges: RangeSet<UUIDTag>,
  context: DirectConversionContext,
  startOffset: number = 0,
  nodeText?: string,
): string {
  const uuid = nodeIdFromRangeSet(astNode, ranges, startOffset);
  const nodeId = uuid || generateNodeId(context);
  const stringText = nodeText || getNodeText(astNode, context);
  const stringValue = stringText.slice(1, -1); // Remove quotes

  logToPanel(`📝 Converting string: "${stringValue}"`);
  logConversion(
    astNode,
    nodeId,
    "ValueNode",
    context,
    undefined,
    undefined,
    uuid || undefined,
  );

  createValueNode(nodeId, stringValue, context, uuid || undefined);
  return nodeId;
}

function convertObjectExpression(
  astNode: any,
  ranges: RangeSet<UUIDTag>,
  context: DirectConversionContext,
  startOffset: number = 0,
  nodeText?: string,
): string {
  const uuid = nodeIdFromRangeSet(astNode, ranges, startOffset);
  const nodeId = uuid || generateNodeId(context);
  const objectValue: any = {};

  let child = astNode.firstChild;
  while (child) {
    if (child.name === "Property") {
      let propertyKey = "";
      let propChild = child.firstChild;

      while (propChild) {
        if (propChild.name === "PropertyName") {
          propertyKey = getNodeText(propChild, context);
        } else if (propChild.name === "Number") {
          const nodeText = getNodeText(propChild, context);
          const intValue = parseInt(nodeText);
          objectValue[propertyKey] = Number.isNaN(intValue)
            ? parseFloat(nodeText)
            : intValue;
        } else if (propChild.name === "String") {
          objectValue[propertyKey] = getNodeText(propChild, context).slice(
            1,
            -1,
          );
        }
        propChild = propChild.nextSibling;
      }
    }
    child = child.nextSibling;
  }

  logConversion(
    astNode,
    nodeId,
    "ValueNode",
    context,
    undefined,
    undefined,
    uuid || undefined,
  );
  console.log("objectValue", objectValue);
  createValueNode(nodeId, objectValue, context, uuid || undefined);
  return nodeId;
}

function extractCallExpressionParts(
  astNode: any,
  context: DirectConversionContext,
): CallExpressionParts {
  let functionName = "";
  let targetNode = null;
  const args: any[] = [];

  let child = astNode.firstChild;
  while (child) {
    if (child.name === "VariableName") {
      functionName = getNodeText(child, context);
    } else if (child.name === "MemberExpression") {
      targetNode = child.firstChild;
      let memberChild = child.firstChild;
      while (memberChild) {
        if (memberChild.name === "PropertyName") {
          functionName = getNodeText(memberChild, context);
          break;
        }
        memberChild = memberChild.nextSibling;
      }
    } else if (child.name === "ArgList") {
      let argChild = child.firstChild;
      while (argChild) {
        if (
          argChild.name !== "(" &&
          argChild.name !== ")" &&
          argChild.name !== ","
        ) {
          args.push(argChild);
        }
        argChild = argChild.nextSibling;
      }
    }

    child = child.nextSibling;
  }

  console.log("gotargs", args);
  return { functionName, targetNode, args };
}

function getChainContext(
  functionName: string,
  context: DirectConversionContext,
): any {
  const mathChainMethods = [
    "mult",
    "add",
    "sub",
    "div",
    "abs",
    "acos",
    "acosh",
    "asin",
    "asinh",
    "atan",
    "atan2",
    "atanh",
    "cbrt",
    "ceil",
    "clz32",
    "cos",
    "cosh",
    "exp",
    "expm1",
    "floor",
    "fround",
    "hypot",
    "imul",
    "log",
    "log10",
    "log1p",
    "log2",
    "max",
    "min",
    "pow",
    "random",
    "round",
    "sign",
    "sin",
    "sinh",
    "sqrt",
    "tan",
    "tanh",
    "trunc",
  ];
  const obj3dChainMethods = [
    "translateX",
    "translateY",
    "translateZ",
    "rotateX",
    "rotateY",
    "rotateZ",
    "render",
  ];

  if (mathChainMethods.includes(functionName)) {
    return context.dslContext["chainMath"] || {};
  } else if (obj3dChainMethods.includes(functionName)) {
    return context.dslContext["chainObj3d"] || {};
  }

  return {};
}
