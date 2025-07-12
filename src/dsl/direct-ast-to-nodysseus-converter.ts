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
  nodeText: string;
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

  // Parse with Lezer
  const tree = parser.parse(context.sourceCode);

  // Convert AST directly to Nodysseus
  const rootNodeId = convertASTNode(tree.topNode, ranges, context, startOffset);

  // Build the complete graph
  const graph: NodysseusGraph = {
    id: `direct-nodysseus-graph-${rootNodeId}`,
    out: rootNodeId,
    nodes: context.nodes,
    edges: context.edges,
    edges_in: context.edges_in,
  };

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
  context?: DirectConversionContext,
): string {
  let nodeRanges: { from: number; to: number; uuid: UUIDTag }[] = [];
  // Adjust the AST node positions by the start offset when searching ranges
  const adjustedFrom = astNode.from + startOffset;
  const adjustedTo = astNode.to + startOffset;

  ranges.between(adjustedFrom, adjustedTo, (from, to, uuid) => {
    // Only include ranges that overlap with our adjusted AST node
    // if (!(to < adjustedFrom || from > adjustedTo)) {
    nodeRanges.push({ from, to, uuid });
    // }
  });

  // Sort by range size (smallest first) to find the most specific match
  const smallestRange = nodeRanges.sort(
    (a, b) => a.to - a.from - (b.to - b.from),
  )[0];

  if (smallestRange?.uuid.uuid) {
    return smallestRange.uuid.uuid;
  }

  // If no UUID found, generate one based on position and content
  const nodeText =
    context?.sourceCode?.slice(astNode.from, astNode.to) ||
    `${astNode.from}-${astNode.to}`;
  const fallbackId = `fallback-${astNode.from}-${astNode.to}-${nodeText.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20)}`;
  return fallbackId;
}

function getNodeText(astNode: any, context: DirectConversionContext): string {
  return context.sourceCode.slice(astNode.from, astNode.to);
}

function getArrowFunctionParameter(
  arrowFunctionNode: any,
  context: DirectConversionContext,
): any | null {
  // Find the parameter (before the "=>")
  let child = arrowFunctionNode.firstChild;

  while (child) {
    if (child.name === "=>" || getNodeText(child, context) === "=>") {
      break;
    }
    if (child.name === "VariableName" || child.name === "ParamList") {
      return child;
    }
    child = child.nextSibling;
  }

  return null;
}

function getFunctionBody(
  arrowFunctionNode: any,
  context: DirectConversionContext,
): any | null {
  // Find the function body (after the "=>")
  let child = arrowFunctionNode.firstChild;
  let foundArrow = false;

  while (child) {
    if (foundArrow && child.name !== "=>") {
      return child;
    }
    if (child.name === "=>" || getNodeText(child, context) === "=>") {
      foundArrow = true;
    }
    child = child.nextSibling;
  }

  return null;
}

function logConversion(
  astNode: any,
  nodeId: string,
  nodeType: "RefNode" | "ValueNode",
  nodeText: string,
  context: DirectConversionContext,
  functionResolved?: string,
  warnings?: string[],
  uuid?: string,
): void {
  context.conversionLog.push({
    astNodeType: astNode.name,
    nodeText,
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
  dependencyNodeIds.forEach((depNodeId, index) => {
    if (depNodeId !== nodeId) {
      createEdge(depNodeId, nodeId, `arg${index}`, context);
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

    case "UnaryExpression":
      nodeId = convertUnaryExpression(
        astNode,
        ranges,
        context,
        startOffset,
        actualNodeText,
      );
      break;

    default:
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
  const nodeId = nodeIdFromRangeSet(astNode, ranges, startOffset, context);

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

  const nameNode = astNode.node.getChild("VariableName");

  const nodeId = nodeIdFromRangeSet(astNode, ranges, startOffset, context);
  const uuid = nodeId;

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
    }
  }

  if (!dslFunction) {
    logConversion(
      astNode,
      nodeId,
      "RefNode",
      getNodeText(astNode, context),
      context,
      functionName,
      ["Function not found in DSL context"],
      uuid,
    );

    // Create error RefNode
    createRefNode(
      nodeId,
      "@error.unknown_function",
      functionName,
      context,
      uuid,
    );
    return nodeId;
  }

  // Convert arguments to nodes
  const argNodeIds = args.map((arg: any, index: number) => {
    const argNodeId = convertASTNode(arg, ranges, context, startOffset);
    return argNodeId;
  });

  // Build dependencies array
  const dependencyNodeIds: string[] = [];

  if (targetNode) {
    // Method call: target object result is first argument
    const targetNodeId = convertASTNode(
      targetNode,
      ranges,
      context,
      startOffset,
    );
    dependencyNodeIds.push(targetNodeId);
    dependencyNodeIds.push(...argNodeIds);
  } else {
    // Function call: just the arguments
    dependencyNodeIds.push(...argNodeIds);
  }

  // Check if this is a special function that returns a RefNode directly (like frame)
  if (resolvedFunctionName === "frame" || dslFunction.name === "frame") {
    // Handle frame function specially - create RefNode directly
    const frameResult = dslFunction(uuid);
    logConversion(
      astNode,
      nodeId,
      "RefNode",
      getNodeText(astNode, context),
      context,
      resolvedFunctionName,
      undefined,
      uuid,
    );
    createRefNode(nodeId, frameResult.ref, frameResult, context, uuid);
  } else if (
    resolvedFunctionName === "feedback" ||
    dslFunction.name === "feedback"
  ) {
    // Handle feedback function specially - convert the function argument to nodes
    logConversion(
      astNode,
      nodeId,
      "RefNode",
      getNodeText(astNode, context),
      context,
      resolvedFunctionName,
      undefined,
      uuid,
    );

    // Convert the function argument (second argument) to nodes
    let transformNodeId: string = "";
    let functionParameterName: string = "";

    if (args.length >= 2) {
      const functionArg = args[1];
      // Extract function body from arrow function and convert to nodes
      if (functionArg.name === "ArrowFunction") {
        // Get the parameter name from the arrow function
        const paramNode = getArrowFunctionParameter(functionArg, context);
        if (paramNode) {
          functionParameterName = getNodeText(paramNode, context);
        }

        const functionBody = getFunctionBody(functionArg, context);
        if (functionBody) {
          // Create a sub-context for the function conversion
          const functionContext: DirectConversionContext = {
            ...context,
            nodes: { ...context.nodes },
            edges: { ...context.edges },
            edges_in: { ...context.edges_in },
            visitedNodes: new Map(context.visitedNodes),
          };

          // Convert the function body to nodes
          const { RangeSet } = require("@codemirror/state");
          transformNodeId = convertASTNode(
            functionBody,
            RangeSet.empty,
            functionContext,
            0,
          );

          // Merge the function nodes back into main context
          Object.assign(context.nodes, functionContext.nodes);
          Object.assign(context.edges, functionContext.edges);
          Object.assign(context.edges_in, functionContext.edges_in);
        }
      }
    }

    // Create extern.feedback RefNode with metadata about the transform
    createRefNode(
      nodeId,
      "extern.feedback",
      JSON.stringify({
        transformNodeId,
        parameterName: functionParameterName,
      }),
      context,
      uuid,
    );

    // Create edges for dependencies
    // First dependency is the input value
    if (dependencyNodeIds.length > 0) {
      createEdge(dependencyNodeIds[0], nodeId, "value", context);
    }

    // Connect the transform node if we have one
    if (transformNodeId) {
      createEdge(transformNodeId, nodeId, "transform", context);
    }
  } else {
    // Create the executable RefNode for this individual function call
    logConversion(
      astNode,
      nodeId,
      "RefNode",
      getNodeText(astNode, context),
      context,
      resolvedFunctionName,
      undefined,
      uuid,
    );
    createExecutableRefNode(
      nodeId,
      dslFunction,
      dependencyNodeIds,
      context,
      uuid,
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

  let previousNodeId: string | null = null;
  let currentNodeId: string = "";

  // Process each call in the chain sequentially
  for (let i = 0; i < chainCalls.length; i++) {
    const callNode = chainCalls[i];
    const { functionName, args } = extractCallExpressionParts(
      callNode,
      context,
    );

    const nameNode =
      callNode.node.getChild("MemberExpression")?.getChild("PropertyName") ??
      callNode.node.getChild("VariableName");
    currentNodeId = nodeIdFromRangeSet(nameNode, ranges, startOffset, context);
    const uuid = currentNodeId;

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
      }
    }

    if (!dslFunction) {
      logConversion(
        callNode,
        currentNodeId,
        "RefNode",
        getNodeText(astNode, context),
        context,
        functionName,
        ["Function not found in DSL context"],
        uuid,
      );

      // Create error RefNode
      createRefNode(
        currentNodeId,
        "@error.unknown_function",
        functionName,
        context,
        uuid,
      );
      continue;
    }

    // Convert arguments to nodes
    const argNodeIds = args.map((arg: any, index: number) => {
      const argNodeId = convertASTNode(arg, ranges, context, startOffset);
      return argNodeId;
    });

    // Build dependencies array for this step
    const dependencyNodeIds: string[] = [];

    if (previousNodeId) {
      // Method call in chain: previous result is first dependency
      dependencyNodeIds.push(previousNodeId);
      dependencyNodeIds.push(...argNodeIds);
    } else {
      // First call in chain: just the arguments
      dependencyNodeIds.push(...argNodeIds);
    }

    // Check if this is a special function that returns a RefNode directly (like frame)
    if (resolvedFunctionName === "frame" || dslFunction.name === "frame") {
      // Handle frame function specially - create RefNode directly
      const frameResult = dslFunction(uuid);
      logConversion(
        callNode,
        currentNodeId,
        "RefNode",
        getNodeText(astNode, context),
        context,
        resolvedFunctionName,
        undefined,
        uuid,
      );
      createRefNode(currentNodeId, frameResult.ref, frameResult, context, uuid);
    } else {
      // Create the executable RefNode for this individual function call
      logConversion(
        callNode,
        currentNodeId,
        "RefNode",
        getNodeText(astNode, context),
        context,
        resolvedFunctionName,
        undefined,
        uuid,
      );
      createExecutableRefNode(
        currentNodeId,
        dslFunction,
        dependencyNodeIds,
        context,
        uuid,
      );
    }

    // Update for next iteration
    previousNodeId = currentNodeId;
  }

  return currentNodeId;
}

function convertMemberExpression(
  astNode: any,
  ranges: RangeSet<UUIDTag>,
  context: DirectConversionContext,
  startOffset: number = 0,
  nodeText?: string,
): string {
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
  const nodeId = nodeIdFromRangeSet(astNode, ranges, startOffset, context);
  const uuid = nodeId;
  const variableName = nodeText || getNodeText(astNode, context);

  const dslValue = context.dslContext[variableName];

  if (dslValue !== undefined) {
    if (typeof dslValue === "function") {
      // Function reference
      logConversion(
        astNode,
        nodeId,
        "RefNode",
        getNodeText(astNode, context),
        context,
        variableName,
        undefined,
        uuid,
      );
      createRefNode(nodeId, "@dsl.function", dslValue, context, uuid);
    } else {
      // Constant value
      logConversion(
        astNode,
        nodeId,
        "ValueNode",
        getNodeText(astNode, context),
        context,
        variableName,
        undefined,
        uuid,
      );
      createValueNode(nodeId, dslValue, context, uuid);
    }
  } else {
    logConversion(
      astNode,
      nodeId,
      "ValueNode",
      getNodeText(astNode, context),
      context,
      variableName,
      ["Variable not found in DSL context"],
      uuid,
    );
    createValueNode(nodeId, variableName, context, uuid);
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
  const nodeId = nodeIdFromRangeSet(astNode, ranges, startOffset, context);
  const uuid = nodeId;
  const numberText = nodeText || getNodeText(astNode, context);
  const numberValue = parseFloat(numberText);

  logConversion(
    astNode,
    nodeId,
    "ValueNode",
    getNodeText(astNode, context),
    context,
    undefined,
    undefined,
    uuid,
  );

  createValueNode(nodeId, numberValue, context, uuid);
  return nodeId;
}

function convertUnaryExpression(
  astNode: any,
  ranges: RangeSet<UUIDTag>,
  context: DirectConversionContext,
  startOffset: number = 0,
  nodeText?: string,
): string {
  const nodeId = nodeIdFromRangeSet(astNode, ranges, startOffset, context);
  const uuid = nodeId;
  const unaryText = getNodeText(astNode, context);
  const value = eval(unaryText);

  logConversion(
    astNode,
    nodeId,
    "ValueNode",
    getNodeText(astNode, context),
    context,
    undefined,
    undefined,
    uuid,
  );

  createValueNode(nodeId, value, context, uuid);
  return nodeId;
}

function convertString(
  astNode: any,
  ranges: RangeSet<UUIDTag>,
  context: DirectConversionContext,
  startOffset: number = 0,
  nodeText?: string,
): string {
  const nodeId = nodeIdFromRangeSet(astNode, ranges, startOffset, context);
  const uuid = nodeId;
  const stringText = nodeText || getNodeText(astNode, context);
  const stringValue = stringText.slice(1, -1); // Remove quotes

  logConversion(
    astNode,
    nodeId,
    "ValueNode",
    getNodeText(astNode, context),
    context,
    undefined,
    undefined,
    uuid,
  );

  createValueNode(nodeId, stringValue, context, uuid);
  return nodeId;
}

function convertObjectExpression(
  astNode: any,
  ranges: RangeSet<UUIDTag>,
  context: DirectConversionContext,
  startOffset: number = 0,
  nodeText?: string,
): string {
  const nodeId = nodeIdFromRangeSet(astNode, ranges, startOffset, context);
  const uuid = nodeId;
  const objectValue: any = {};

  let child = astNode.firstChild;
  while (child) {
    console.log("obj child", getNodeText(child, context));
    if (child.name === "Property") {
      let propertyKey = getNodeText(
        child.getChild("PropertyDefinition"),
        context,
      );
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
        } else if (propChild.name === "BooleanLiteral") {
          const boolText = getNodeText(propChild, context);
          objectValue[propertyKey] = boolText === "true";
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
    getNodeText(astNode, context),
    context,
    undefined,
    undefined,
    uuid,
  );
  console.log("final objectValue", objectValue);
  createValueNode(nodeId, objectValue, context, uuid);
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
