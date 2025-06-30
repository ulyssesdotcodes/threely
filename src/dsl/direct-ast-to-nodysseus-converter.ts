// Direct AST to Nodysseus Converter
// Eliminates the functional graph intermediate layer for better performance
import { parser } from "@lezer/javascript";
import { NodysseusNode, RefNode, ValueNode, Graph as NodysseusGraph, Edge } from '../nodysseus/types';
import { logToPanel } from './parser';
import { getFunctionCallRegistry, getUUIDAtPosition, getUUIDFromState, FunctionCallInfo } from '../uuid-tagging';

interface DirectConversionContext {
  dslContext: Record<string, any>;           // DSL functions and variables
  nodes: Record<string, NodysseusNode>;      // Accumulated Nodysseus nodes
  edges: Record<string, Edge>;               // Accumulated edges
  edges_in: Record<string, Record<string, Edge>>; // Reverse lookup
  nodeCounter: number;                       // For generating unique IDs
  sourceCode: string;                        // Source for error reporting
  visitedNodes: Map<string, string>;         // AST position key → node ID
}

interface DirectConversionResult {
  nodeId: string;
}

interface ConversionLogEntry {
  astNodeType: string;
  position: { from: number; to: number };
  nodysseusNodeId: string;
  nodysseusNodeType: 'RefNode' | 'ValueNode';
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
  convert(sourceCode: string, dslContext?: Record<string, any>): DirectASTToNodysseusResult {
    const context: DirectConversionContext = {
      dslContext: dslContext || {},
      nodes: {},
      edges: {},
      edges_in: {},
      nodeCounter: 0,
      sourceCode: sourceCode.trim(),
      visitedNodes: new Map()
    };

    logToPanel('🚀 Starting direct AST to Nodysseus conversion...');
    logToPanel(`📝 Source code: ${context.sourceCode}`);
    
    // Check UUID registry
    const registry = getFunctionCallRegistry();
    console.log(`🔍 UUID registry: ${registry.size} entries`);

    // Parse with Lezer
    const tree = parser.parse(context.sourceCode);
    logToPanel('🌳 Parsed AST with Lezer', 'info', tree);

    // Convert AST directly to Nodysseus
    const rootNodeId = this.convertASTNode(tree.topNode, context);
    logToPanel(`🎯 Created Nodysseus graph with root node: ${rootNodeId}`);

    // Build the complete graph
    const graph: NodysseusGraph = {
      id: `direct-nodysseus-graph-${Date.now()}`,
      out: rootNodeId,
      nodes: context.nodes,
      edges: context.edges,
      edges_in: context.edges_in
    };

    logToPanel(`✅ Conversion complete: ${Object.keys(context.nodes).length} nodes, ${Object.keys(context.edges).length} edges`);
    

    return {
      graph,
      rootNodeId,
      conversionLog: this.conversionLog
    };
  }

  /**
   * Convert AST node directly to Nodysseus node
   */
  private convertASTNode(astNode: any, context: DirectConversionContext): string {
    const nodeKey = `${astNode.from}-${astNode.to}`;
    
    // Check if already converted
    if (context.visitedNodes.has(nodeKey)) {
      return context.visitedNodes.get(nodeKey)!;
    }

    logToPanel(`🔍 Converting AST node: ${astNode.name} (${astNode.from}-${astNode.to})`);
    
    let nodeId: string;

    switch (astNode.name) {
      case 'Script':
      case 'ExpressionStatement':
        nodeId = this.convertFirstChild(astNode, context);
        break;

      case 'CallExpression':
        nodeId = this.convertCallExpression(astNode, context);
        break;

      case 'MemberExpression':
        nodeId = this.convertMemberExpression(astNode, context);
        break;

      case 'VariableName':
        nodeId = this.convertVariableName(astNode, context);
        break;

      case 'Number':
        nodeId = this.convertNumber(astNode, context);
        break;

      case 'String':
        nodeId = this.convertString(astNode, context);
        break;

      case 'ObjectExpression':
        nodeId = this.convertObjectExpression(astNode, context);
        break;

      default:
        logToPanel(`⚠️ Unknown AST node type: ${astNode.name}`, 'warn');
        nodeId = this.convertFirstChild(astNode, context);
        break;
    }

    context.visitedNodes.set(nodeKey, nodeId);
    return nodeId;
  }

  /**
   * Convert the first child of a wrapper node
   */
  private convertFirstChild(astNode: any, context: DirectConversionContext): string {
    if (astNode.firstChild) {
      return this.convertASTNode(astNode.firstChild, context);
    }
    
    // Fallback to null constant
    const nodeId = this.generateNodeId(context);
    logToPanel(`⚠️ No child found for ${astNode.name}, creating null constant`, 'warn');
    
    this.createValueNode(nodeId, null, context);
    return nodeId;
  }

  /**
   * Convert function call expressions directly to individual RefNodes 
   */
  private convertCallExpression(astNode: any, context: DirectConversionContext): string {
    // Extract the parts of this specific call expression
    const { functionName, targetNode, args } = this.extractCallExpressionParts(astNode, context);
    
    const uuid = getUUIDAtPosition(astNode.from);
    const nodeId = uuid || this.generateNodeId(context);
    
    // Look up function in DSL context or chain context
    let dslFunction = context.dslContext[functionName];
    let resolvedFunctionName = functionName;
    
    // If it's a method call (has targetNode), try chain context
    if (!dslFunction && targetNode) {
      const chainContext = this.getChainContext(functionName, context);
      if (chainContext && chainContext[functionName] && chainContext[functionName].fn) {
        dslFunction = chainContext[functionName].fn;
        resolvedFunctionName = dslFunction.name || functionName;
        logToPanel(`🔗 Resolved chain method ${functionName} to ${resolvedFunctionName}`);
      }
    }
    
    if (!dslFunction) {
      logToPanel(`❌ Function '${functionName}' not found in DSL context`, 'error');
      this.logConversion(astNode, nodeId, 'RefNode', functionName, ['Function not found in DSL context'], uuid || undefined);
      
      // Create error RefNode
      this.createRefNode(nodeId, '@error.unknown_function', functionName, context, uuid || undefined);
      return nodeId;
    }
    
    // Convert arguments to nodes
    const argNodeIds = args.map((arg: any) => this.convertASTNode(arg, context));
    
    // Build dependencies array
    const dependencyNodeIds: string[] = [];
    
    if (targetNode) {
      // Method call: target object result is first argument
      const targetNodeId = this.convertASTNode(targetNode, context);
      dependencyNodeIds.push(targetNodeId);
      dependencyNodeIds.push(...argNodeIds);
    } else {
      // Function call: just the arguments
      dependencyNodeIds.push(...argNodeIds);
    }
    
    // Check if this is a special function that returns a RefNode directly (like frame)
    if (resolvedFunctionName === 'frame' || dslFunction.name === 'frame') {
      // Handle frame function specially - create RefNode directly
      const frameResult = dslFunction(uuid);
      this.logConversion(astNode, nodeId, 'RefNode', resolvedFunctionName, undefined, uuid || undefined);
      this.createRefNode(nodeId, frameResult.ref, frameResult, context, uuid || undefined);
    } else {
      // Create the executable RefNode for this individual function call
      this.logConversion(astNode, nodeId, 'RefNode', resolvedFunctionName, undefined, uuid || undefined);
      this.createExecutableRefNode(nodeId, dslFunction, dependencyNodeIds, context, uuid || undefined);
    }
    
    return nodeId;
  }


  /**
   * Convert member expressions
   */
  private convertMemberExpression(astNode: any, context: DirectConversionContext): string {
    logToPanel(`🔗 Member expression: ${this.getNodeText(astNode, context)}`);
    
    // Find the property name and object
    let propertyName = '';
    let objectNode = null;
    
    let child = astNode.firstChild;
    while (child) {
      if (child.name === 'PropertyName') {
        propertyName = this.getNodeText(child, context);
      } else if (child.name !== '.') {
        objectNode = child;
      }
      child = child.nextSibling;
    }
    
    if (objectNode) {
      const baseNodeId = this.convertASTNode(objectNode, context);
      logToPanel(`🔗 Member access: ${propertyName} on node ${baseNodeId}`);
      return baseNodeId; // Return the base node; property access handled by parent CallExpression
    }
    
    return this.convertFirstChild(astNode, context);
  }

  /**
   * Convert variable names to RefNode or ValueNode
   */
  private convertVariableName(astNode: any, context: DirectConversionContext): string {
    const uuid = getUUIDAtPosition(astNode.from);
    const nodeId = uuid || this.generateNodeId(context);
    const variableName = this.getNodeText(astNode, context);
    
    logToPanel(`🏷️ Converting variable: ${variableName}`);
    
    const dslValue = context.dslContext[variableName];
    
    if (dslValue !== undefined) {
      if (typeof dslValue === 'function') {
        // Function reference
        this.logConversion(astNode, nodeId, 'RefNode', variableName, undefined, uuid || undefined);
        this.createRefNode(nodeId, '@dsl.function', dslValue, context, uuid || undefined);
      } else {
        // Constant value
        this.logConversion(astNode, nodeId, 'ValueNode', variableName, undefined, uuid || undefined);
        this.createValueNode(nodeId, dslValue, context, uuid || undefined);
      }
    } else {
      logToPanel(`⚠️ Variable '${variableName}' not found in DSL context`, 'warn');
      this.logConversion(astNode, nodeId, 'ValueNode', variableName, ['Variable not found in DSL context'], uuid || undefined);
      this.createValueNode(nodeId, variableName, context, uuid || undefined);
    }
    
    return nodeId;
  }

  /**
   * Convert number literals to ValueNode
   */
  private convertNumber(astNode: any, context: DirectConversionContext): string {
    const uuid = getUUIDAtPosition(astNode.from);
    const nodeId = uuid || this.generateNodeId(context);
    const numberText = this.getNodeText(astNode, context);
    const numberValue = parseFloat(numberText);
    
    logToPanel(`🔢 Converting number: ${numberValue}`);
    this.logConversion(astNode, nodeId, 'ValueNode', undefined, undefined, uuid || undefined);
    
    this.createValueNode(nodeId, numberValue, context, uuid || undefined);
    return nodeId;
  }

  /**
   * Convert string literals to ValueNode
   */
  private convertString(astNode: any, context: DirectConversionContext): string {
    const uuid = getUUIDAtPosition(astNode.from);
    const nodeId = uuid || this.generateNodeId(context);
    const stringText = this.getNodeText(astNode, context);
    const stringValue = stringText.slice(1, -1); // Remove quotes
    
    logToPanel(`📝 Converting string: "${stringValue}"`);
    this.logConversion(astNode, nodeId, 'ValueNode', undefined, undefined, uuid || undefined);
    
    this.createValueNode(nodeId, stringValue, context, uuid || undefined);
    return nodeId;
  }

  /**
   * Convert object expressions to ValueNode
   */
  private convertObjectExpression(astNode: any, context: DirectConversionContext): string {
    const uuid = getUUIDAtPosition(astNode.from);
    const nodeId = uuid || this.generateNodeId(context);
    const objectValue: any = {};
    
    let child = astNode.firstChild;
    while (child) {
      if (child.name === 'Property') {
        let propertyKey = '';
        let propChild = child.firstChild;
        
        while (propChild) {
          if (propChild.name === 'PropertyName') {
            propertyKey = this.getNodeText(propChild, context);
          } else if (propChild.name === 'Number') {
            objectValue[propertyKey] = parseFloat(this.getNodeText(propChild, context));
          } else if (propChild.name === 'String') {
            objectValue[propertyKey] = this.getNodeText(propChild, context).slice(1, -1);
          }
          propChild = propChild.nextSibling;
        }
      }
      child = child.nextSibling;
    }
    
    this.logConversion(astNode, nodeId, 'ValueNode', undefined, undefined, uuid || undefined);
    this.createValueNode(nodeId, objectValue, context, uuid || undefined);
    return nodeId;
  }

  /**
   * Create ValueNode directly in context
   */
  private createValueNode(nodeId: string, value: any, context: DirectConversionContext, uuid?: string): void {
    const valueNode: ValueNode = {
      id: nodeId,
      value: typeof value === 'string' ? value : String(value),
      ...(uuid && { uuid })
    };
    
    context.nodes[nodeId] = valueNode;
  }

  /**
   * Create RefNode directly in context
   */
  private createRefNode(nodeId: string, ref: string, value: any, context: DirectConversionContext, uuid?: string): void {
    const refNode: RefNode = {
      id: nodeId,
      ref,
      value,
      ...(uuid && { uuid })
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
    uuid?: string
  ): void {
    // Create the RefNode
    const refNode: RefNode = {
      id: nodeId,
      ref: '@graph.executable',
      value: fn,
      ...(uuid && { uuid })
    };
    
    context.nodes[nodeId] = refNode;
    
    // Create edges for dependencies (avoid self-referential edges)
    dependencyNodeIds.forEach((depNodeId, index) => {
      if (depNodeId !== nodeId) {
        this.createEdge(depNodeId, nodeId, `arg${index}`, context);
      }
    });
  }

  /**
   * Create edge and update edges_in lookup
   */
  private createEdge(fromNodeId: string, toNodeId: string, as: string, context: DirectConversionContext): void {
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
  private extractCallExpressionParts(astNode: any, context: DirectConversionContext): {
    functionName: string;
    targetNode: any | null;
    args: any[];
  } {
    let functionName = '';
    let targetNode = null;
    const args: any[] = [];
    
    let child = astNode.firstChild;
    while (child) {
      if (child.name === 'VariableName') {
        functionName = this.getNodeText(child, context);
      } else if (child.name === 'MemberExpression') {
        targetNode = child.firstChild;
        let memberChild = child.firstChild;
        while (memberChild) {
          if (memberChild.name === 'PropertyName') {
            functionName = this.getNodeText(memberChild, context);
            break;
          }
          memberChild = memberChild.nextSibling;
        }
      } else if (child.name === 'ArgList') {
        let argChild = child.firstChild;
        while (argChild) {
          if (argChild.name !== '(' && argChild.name !== ')' && argChild.name !== ',') {
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
  private getChainContext(functionName: string, context: DirectConversionContext): any {
    const mathChainMethods = ['mult', 'add', 'sub', 'div', 'abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh', 'cbrt', 'ceil', 'clz32', 'cos', 'cosh', 'exp', 'expm1', 'floor', 'fround', 'hypot', 'imul', 'log', 'log10', 'log1p', 'log2', 'max', 'min', 'pow', 'random', 'round', 'sign', 'sin', 'sinh', 'sqrt', 'tan', 'tanh', 'trunc'];
    const obj3dChainMethods = ['translateX', 'translateY', 'translateZ', 'rotateX', 'rotateY', 'rotateZ', 'render'];
    
    if (mathChainMethods.includes(functionName)) {
      return context.dslContext['chainMath'] || {};
    } else if (obj3dChainMethods.includes(functionName)) {
      return context.dslContext['chainObj3d'] || {};
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
    nodeType: 'RefNode' | 'ValueNode',
    functionResolved?: string,
    warnings?: string[],
    uuid?: string
  ): void {
    this.conversionLog.push({
      astNodeType: astNode.name,
      position: { from: astNode.from, to: astNode.to },
      nodysseusNodeId: nodeId,
      nodysseusNodeType: nodeType,
      functionResolved,
      warnings,
      uuid
    });
  }
}

/**
 * Convenience function for direct AST to Nodysseus conversion
 */
export function convertASTToNodysseus(
  sourceCode: string,
  dslContext?: Record<string, any>
): DirectASTToNodysseusResult {
  const converter = new DirectASTToNodysseusConverter();
  return converter.convert(sourceCode, dslContext);
}