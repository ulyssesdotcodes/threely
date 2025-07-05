// Direct AST to Nodysseus Converter
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

interface DirectConversionContext {
  dslContext: Record<string, any>; // DSL functions and variables
  nodes: Record<string, NodysseusNode>; // Accumulated Nodysseus nodes
  edges: Record<string, Edge>; // Accumulated edges
  edges_in: Record<string, Record<string, Edge>>; // Reverse lookup
  nodeCounter: number; // For generating unique IDs
  sourceCode: string; // Source for error reporting
  visitedNodes: Map<string, string>; // AST position key → node ID
}

interface DirectConversionResult {
  nodeId: string;
}

interface ConversionLogEntry {
  astNodeType: string;
  position: { from: number; to: number };
  nodysseusNodeId: string;
  nodysseusNodeType: "RefNode" | "ValueNode";
  functionResolved?: string;
  warnings?: string[];
  uuid?: string;
}

export interface DirectASTToNodysseusResult {
  graph: NodysseusGraph;
  rootNodeId: string;
  conversionLog: ConversionLogEntry[];
}

export class DirectASTToNodysseusConverter {
  private conversionLog: ConversionLogEntry[] = [];

  /**
   * Convert source code directly to Nodysseus graph, bypassing functional graph
   */
  convert(
    sourceCode: string,
    ranges: RangeSet<UUIDTag>,
    dslContext?: Record<string, any>,
  ): DirectASTToNodysseusResult {
    const context: DirectConversionContext = {
      dslContext: dslContext || {},
      nodes: {},
      edges: {},
      edges_in: {},
      nodeCounter: 0,
      sourceCode: sourceCode.trim(),
      visitedNodes: new Map(),
    };

    logToPanel("🚀 Starting direct AST to Nodysseus conversion...");
    logToPanel(`📝 Source code: ${context.sourceCode}`);

    // UUID registry removed

    // Parse with Lezer
    const tree = parser.parse(context.sourceCode);
    logToPanel("🌳 Parsed AST with Lezer", "info", tree);

    // Convert AST directly to Nodysseus
    const rootNodeId = this.convertASTNode(tree.topNode, ranges, context);
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
      conversionLog: this.conversionLog,
    };
  }

  private nodeIdFromRangeSet(
    astNode: any,
    ranges: RangeSet<UUIDTag>,
  ): string | null {
    let nodeRanges: { from: number; to: number; uuid: UUIDTag }[] = [];
    ranges.between(astNode.from, astNode.to, (from, to, uuid) => {
      // Only include ranges that overlap with our AST node
      if (!(to < astNode.from || from > astNode.to)) {
        nodeRanges.push({ from, to, uuid });
      }
    });

    // Sort by range size (smallest first) to find the most specific match
    const smallestRange = nodeRanges.sort(
      (a, b) => a.to - a.from - (b.to - b.from),
    )[0];
    return smallestRange?.uuid.uuid || null;
  }

  /**
   * Convert AST node directly to Nodysseus node
   */
  private convertASTNode(
    astNode: any,
    ranges: RangeSet<UUIDTag>,
    context: DirectConversionContext,
  ): string {
    const nodeKey = `${astNode.from}-${astNode.to}`;
    const nodeText = this.getNodeText(astNode, context);

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
        return this.convertFirstChild(astNode, ranges, context);

      case "CallExpression":
        nodeId = this.convertCallExpression(astNode, ranges, context);
        break;

      case "MemberExpression":
        nodeId = this.convertMemberExpression(astNode, ranges, context);
        break;

      case "VariableName":
        nodeId = this.convertVariableName(astNode, ranges, context);
        break;

      case "Number":
        nodeId = this.convertNumber(astNode, ranges, context);
        break;

      case "String":
        nodeId = this.convertString(astNode, ranges, context);
        break;

      case "ObjectExpression":
        nodeId = this.convertObjectExpression(astNode, ranges, context);
        break;

      default:
        logToPanel(`⚠️ Unknown AST node type: ${astNode.name}`, "warn");
        // Don't cache unknown wrapper nodes either
        return this.convertFirstChild(astNode, ranges, context);
    }

    context.visitedNodes.set(nodeKey, nodeId);
    return nodeId;
  }

  /**
   * Convert the first child of a wrapper node
   */
  private convertFirstChild(
    astNode: any,
    ranges: RangeSet<UUIDTag>,
    context: DirectConversionContext,
  ): string {
    if (astNode.firstChild) {
      return this.convertASTNode(astNode.firstChild, ranges, context);
    }

    // Fallback to null constant
    const nodeId = this.generateNodeId(context);
    logToPanel(
      `⚠️ No child found for ${astNode.name}, creating null constant`,
      "warn",
    );

    this.createValueNode(nodeId, null, context);
    return nodeId;
  }

  /**
   * Convert function call expressions with proper method chaining support
   */
  private convertCallExpression(
    astNode: any,
    ranges: RangeSet<UUIDTag>,
    context: DirectConversionContext,
  ): string {
    // Check if this is part of a method chain
    if (this.isMethodChain(astNode)) {
      return this.convertMethodChain(astNode, ranges, context);
    } else {
      return this.convertSingleCall(astNode, ranges, context);
    }
  }

  /**
   * Check if a CallExpression is part of a method chain
   */
  private isMethodChain(astNode: any): boolean {
    const { targetNode } = this.extractCallExpressionParts(astNode, {
      dslContext: {},
      nodes: {},
      edges: {},
      edges_in: {},
      nodeCounter: 0,
      sourceCode: "",
      visitedNodes: new Map(),
    });

    // If target is a CallExpression, this is method chaining
    return targetNode && targetNode.name === "CallExpression";
  }

  /**
   * Extract chain calls in dependency order (innermost to outermost)
   */
  private extractChainCalls(astNode: any): any[] {
    const calls: any[] = [];
    let currentNode = astNode;

    // Walk up the chain from outermost to innermost
    while (currentNode && currentNode.name === "CallExpression") {
      calls.unshift(currentNode); // Add to beginning for proper order
      const { targetNode } = this.extractCallExpressionParts(currentNode, {
        dslContext: {},
        nodes: {},
        edges: {},
        edges_in: {},
        nodeCounter: 0,
        sourceCode: "",
        visitedNodes: new Map(),
      });
      currentNode = targetNode;
    }

    return calls;
  }

  /**
   * Convert a single function call (not part of a chain)
   */
  private convertSingleCall(
    astNode: any,
    ranges: RangeSet<UUIDTag>,
    context: DirectConversionContext,
  ): string {
    // Extract the parts of this specific call expression
    const { functionName, targetNode, args } = this.extractCallExpressionParts(
      astNode,
      context,
    );

    const uuid = this.nodeIdFromRangeSet(astNode, ranges);
    const nodeId = uuid || this.generateNodeId(context);

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
      const chainContext = this.getChainContext(functionName, context);
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
      this.logConversion(
        astNode,
        nodeId,
        "RefNode",
        functionName,
        ["Function not found in DSL context"],
        uuid || undefined,
      );

      // Create error RefNode
      this.createRefNode(
        nodeId,
        "@error.unknown_function",
        functionName,
        context,
        uuid || undefined,
      );
      return nodeId;
    }

    // Convert arguments to nodes
    console.log(
      `   Converting ${args.length} arguments for ${functionName}...`,
    );
    const argNodeIds = args.map((arg: any, index: number) => {
      const argNodeId = this.convertASTNode(arg, ranges, context);
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
      const targetNodeId = this.convertASTNode(targetNode, ranges, context);
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
      this.logConversion(
        astNode,
        nodeId,
        "RefNode",
        resolvedFunctionName,
        undefined,
        uuid || undefined,
      );
      this.createRefNode(
        nodeId,
        frameResult.ref,
        frameResult,
        context,
        uuid || undefined,
      );
    } else {
      // Create the executable RefNode for this individual function call
      this.logConversion(
        astNode,
        nodeId,
        "RefNode",
        resolvedFunctionName,
        undefined,
        uuid || undefined,
      );
      this.createExecutableRefNode(
        nodeId,
        dslFunction,
        dependencyNodeIds,
        context,
        uuid || undefined,
      );
    }

    return nodeId;
  }

  /**
   * Convert method chain with proper sequential dependencies
   */
  private convertMethodChain(
    astNode: any,
    ranges: RangeSet<UUIDTag>,
    context: DirectConversionContext,
  ): string {
    const chainCalls = this.extractChainCalls(astNode);
    console.log(
      `🔗 METHOD CHAIN: Processing ${chainCalls.length} calls in chain`,
    );

    let previousNodeId: string | null = null;
    let currentNodeId: string = "";

    // Process each call in the chain sequentially
    for (let i = 0; i < chainCalls.length; i++) {
      const callNode = chainCalls[i];
      const { functionName, args } = this.extractCallExpressionParts(
        callNode,
        context,
      );

      const uuid = this.nodeIdFromRangeSet(callNode, ranges);
      currentNodeId = uuid || this.generateNodeId(context);

      console.log(
        `🔗 CHAIN STEP ${i + 1}: ${functionName} at ${callNode.from}-${callNode.to}, nodeId: ${currentNodeId}`,
      );

      // Look up function in DSL context or chain context
      let dslFunction = context.dslContext[functionName];
      let resolvedFunctionName = functionName;

      // If it's not the first call in chain, try chain context
      if (!dslFunction && i > 0) {
        const chainContext = this.getChainContext(functionName, context);
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
        this.logConversion(
          callNode,
          currentNodeId,
          "RefNode",
          functionName,
          ["Function not found in DSL context"],
          uuid || undefined,
        );

        // Create error RefNode
        this.createRefNode(
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
        const argNodeId = this.convertASTNode(arg, ranges, context);
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
        this.logConversion(
          callNode,
          currentNodeId,
          "RefNode",
          resolvedFunctionName,
          undefined,
          uuid || undefined,
        );
        this.createRefNode(
          currentNodeId,
          frameResult.ref,
          frameResult,
          context,
          uuid || undefined,
        );
      } else {
        // Create the executable RefNode for this individual function call
        this.logConversion(
          callNode,
          currentNodeId,
          "RefNode",
          resolvedFunctionName,
          undefined,
          uuid || undefined,
        );
        this.createExecutableRefNode(
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

  /**
   * Convert member expressions
   */
  private convertMemberExpression(
    astNode: any,
    ranges: RangeSet<UUIDTag>,
    context: DirectConversionContext,
  ): string {
    logToPanel(`🔗 Member expression: ${this.getNodeText(astNode, context)}`);

    // Find the property name and object
    let propertyName = "";
    let objectNode = null;

    let child = astNode.firstChild;
    while (child) {
      if (child.name === "PropertyName") {
        propertyName = this.getNodeText(child, context);
      } else if (child.name !== ".") {
        objectNode = child;
      }
      child = child.nextSibling;
    }

    if (objectNode) {
      const baseNodeId = this.convertASTNode(objectNode, ranges, context);
      logToPanel(`🔗 Member access: ${propertyName} on node ${baseNodeId}`);
      return baseNodeId; // Return the base node; property access handled by parent CallExpression
    }

    return this.convertFirstChild(astNode, ranges, context);
  }

  /**
   * Convert variable names to RefNode or ValueNode
   */
  private convertVariableName(
    astNode: any,
    ranges: RangeSet<UUIDTag>,
    context: DirectConversionContext,
  ): string {
    const uuid = this.nodeIdFromRangeSet(astNode, ranges);
    const nodeId = uuid || this.generateNodeId(context);
    const variableName = this.getNodeText(astNode, context);

    logToPanel(`🏷️ Converting variable: ${variableName}`);

    const dslValue = context.dslContext[variableName];

    if (dslValue !== undefined) {
      if (typeof dslValue === "function") {
        // Function reference
        this.logConversion(
          astNode,
          nodeId,
          "RefNode",
          variableName,
          undefined,
          uuid || undefined,
        );
        this.createRefNode(
          nodeId,
          "@dsl.function",
          dslValue,
          context,
          uuid || undefined,
        );
      } else {
        // Constant value
        this.logConversion(
          astNode,
          nodeId,
          "ValueNode",
          variableName,
          undefined,
          uuid || undefined,
        );
        this.createValueNode(nodeId, dslValue, context, uuid || undefined);
      }
    } else {
      logToPanel(
        `⚠️ Variable '${variableName}' not found in DSL context`,
        "warn",
      );
      this.logConversion(
        astNode,
        nodeId,
        "ValueNode",
        variableName,
        ["Variable not found in DSL context"],
        uuid || undefined,
      );
      this.createValueNode(nodeId, variableName, context, uuid || undefined);
    }

    return nodeId;
  }

  /**
   * Convert number literals to ValueNode
   */
  private convertNumber(
    astNode: any,
    ranges: RangeSet<UUIDTag>,
    context: DirectConversionContext,
  ): string {
    const uuid = this.nodeIdFromRangeSet(astNode, ranges);
    const nodeId = uuid || this.generateNodeId(context);
    const numberText = this.getNodeText(astNode, context);
    const numberValue = parseFloat(numberText);

    logToPanel(`🔢 Converting number: ${numberValue}`);
    this.logConversion(
      astNode,
      nodeId,
      "ValueNode",
      undefined,
      undefined,
      uuid || undefined,
    );

    this.createValueNode(nodeId, numberValue, context, uuid || undefined);
    return nodeId;
  }

  /**
   * Convert string literals to ValueNode
   */
  private convertString(
    astNode: any,
    ranges: RangeSet<UUIDTag>,
    context: DirectConversionContext,
  ): string {
    const uuid = this.nodeIdFromRangeSet(astNode, ranges);
    const nodeId = uuid || this.generateNodeId(context);
    const stringText = this.getNodeText(astNode, context);
    const stringValue = stringText.slice(1, -1); // Remove quotes

    logToPanel(`📝 Converting string: "${stringValue}"`);
    this.logConversion(
      astNode,
      nodeId,
      "ValueNode",
      undefined,
      undefined,
      uuid || undefined,
    );

    this.createValueNode(nodeId, stringValue, context, uuid || undefined);
    return nodeId;
  }

  /**
   * Convert object expressions to ValueNode
   */
  private convertObjectExpression(
    astNode: any,
    ranges: RangeSet<UUIDTag>,
    context: DirectConversionContext,
  ): string {
    const uuid = this.nodeIdFromRangeSet(astNode, ranges);
    const nodeId = uuid || this.generateNodeId(context);
    const objectValue: any = {};

    let child = astNode.firstChild;
    while (child) {
      if (child.name === "Property") {
        let propertyKey = "";
        let propChild = child.firstChild;

        while (propChild) {
          if (propChild.name === "PropertyName") {
            propertyKey = this.getNodeText(propChild, context);
          } else if (propChild.name === "Number") {
            objectValue[propertyKey] = parseFloat(
              this.getNodeText(propChild, context),
            );
          } else if (propChild.name === "String") {
            objectValue[propertyKey] = this.getNodeText(
              propChild,
              context,
            ).slice(1, -1);
          }
          propChild = propChild.nextSibling;
        }
      }
      child = child.nextSibling;
    }

    this.logConversion(
      astNode,
      nodeId,
      "ValueNode",
      undefined,
      undefined,
      uuid || undefined,
    );
    this.createValueNode(nodeId, objectValue, context, uuid || undefined);
    return nodeId;
  }

  /**
   * Create ValueNode directly in context
   */
  private createValueNode(
    nodeId: string,
    value: any,
    context: DirectConversionContext,
    uuid?: string,
  ): void {
    const valueNode: ValueNode = {
      id: nodeId,
      value: typeof value === "string" ? value : String(value),
      ...(uuid && { uuid }),
    };

    context.nodes[nodeId] = valueNode;
  }

  /**
   * Create RefNode directly in context
   */
  private createRefNode(
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

  /**
   * Create executable RefNode with dependencies and edges
   */
  private createExecutableRefNode(
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
        this.createEdge(depNodeId, nodeId, `arg${index}`, context);
      } else {
        console.log(`     SKIP: self-referential edge for ${nodeId}`);
      }
    });
  }

  /**
   * Create edge and update edges_in lookup
   */
  private createEdge(
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

  /**
   * Extract function name, target object, and arguments from CallExpression
   */
  private extractCallExpressionParts(
    astNode: any,
    context: DirectConversionContext,
  ): {
    functionName: string;
    targetNode: any | null;
    args: any[];
  } {
    let functionName = "";
    let targetNode = null;
    const args: any[] = [];

    let child = astNode.firstChild;
    while (child) {
      if (child.name === "VariableName") {
        functionName = this.getNodeText(child, context);
      } else if (child.name === "MemberExpression") {
        targetNode = child.firstChild;
        let memberChild = child.firstChild;
        while (memberChild) {
          if (memberChild.name === "PropertyName") {
            functionName = this.getNodeText(memberChild, context);
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

  /**
   * Get chain context for method resolution
   */
  private getChainContext(
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

  /**
   * Get text content for an AST node
   */
  private getNodeText(astNode: any, context: DirectConversionContext): string {
    return context.sourceCode.slice(astNode.from, astNode.to);
  }

  /**
   * Generate unique node ID
   */
  private generateNodeId(context: DirectConversionContext): string {
    return `node-${++context.nodeCounter}`;
  }

  /**
   * Log conversion details
   */
  private logConversion(
    astNode: any,
    nodeId: string,
    nodeType: "RefNode" | "ValueNode",
    functionResolved?: string,
    warnings?: string[],
    uuid?: string,
  ): void {
    this.conversionLog.push({
      astNodeType: astNode.name,
      position: { from: astNode.from, to: astNode.to },
      nodysseusNodeId: nodeId,
      nodysseusNodeType: nodeType,
      functionResolved,
      warnings,
      uuid,
    });
  }
}

/**
 * Convenience function for direct AST to Nodysseus conversion
 */
export function convertASTToNodysseus(
  sourceCode: string,
  ranges: RangeSet<UUIDTag>,
  dslContext?: Record<string, any>,
): DirectASTToNodysseusResult {
  const converter = new DirectASTToNodysseusConverter();
  return converter.convert(sourceCode, ranges, dslContext);
}
