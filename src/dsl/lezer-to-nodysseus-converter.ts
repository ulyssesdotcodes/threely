// Lezer AST to Nodysseus Node Converter
import { parser } from "@lezer/javascript";
import { Graph, Node, createNode } from '../graph';
import { convertGraphToNodysseus } from '../graph-to-nodysseus-converter';
import { NodysseusNode, RefNode, ValueNode, Graph as NodysseusGraph, Edge } from '../nodysseus/types';
import { logToPanel } from './parser';
import { getFunctionCallRegistry, getUUIDAtPosition, getUUIDFromState, FunctionCallInfo } from '../uuid-tagging';

interface ConversionContext {
  dslContext: Record<string, any>;
  visitedNodes: Map<string, string>; // AST position -> Node ID
  sourceCode: string;
  nodeCounter: number;
}

interface ConversionResult {
  nodeId: string;
  additionalEdges?: Edge[];
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

export interface LezerToNodysseusResult {
  graph: NodysseusGraph;
  rootNodeId: string;
  conversionLog: ConversionLogEntry[];
}

export class LezerToNodysseusConverter {
  private conversionLog: ConversionLogEntry[] = [];

  /**
   * Convert a source code string directly to Nodysseus graph using Lezer AST
   * Always converts to Nodysseus graph and uses runGraph - never evaluates code directly
   */
  convert(sourceCode: string, dslContext?: Record<string, any>): LezerToNodysseusResult {
    const context: ConversionContext = {
      dslContext: dslContext || {},
      visitedNodes: new Map(),
      sourceCode: sourceCode.trim(),
      nodeCounter: 0
    };

    logToPanel('🔄 Starting direct Lezer to Nodysseus conversion...');
    logToPanel(`📝 Source code: ${context.sourceCode}`);

    // Always convert to Nodysseus graph using the original approach
    return this.convertToNodysseusGraph(context);
  }


  /**
   * Convert to Nodysseus graph using the original approach
   */
  private convertToNodysseusGraph(context: ConversionContext): LezerToNodysseusResult {
    // Parse with Lezer
    const tree = parser.parse(context.sourceCode);
    logToPanel('🌳 Parsed AST with Lezer');

    // Convert AST to functional graph (original approach)
    const functionalGraph = this.convertASTToFunctionalGraph(tree.topNode, context);
    logToPanel(`🔗 Created functional graph with root node: ${functionalGraph.id}`);

    console.log(functionalGraph)

    // Convert functional graph to Nodysseus format
    const nodysseusGraph = convertGraphToNodysseus(functionalGraph);
    logToPanel(`🎯 Converted to Nodysseus graph with ${Object.keys(nodysseusGraph.nodes).length} nodes`);
    console.log(nodysseusGraph)

    return {
      graph: nodysseusGraph,
      rootNodeId: nodysseusGraph.out || functionalGraph.id,
      conversionLog: this.conversionLog
    };
  }

  /**
   * Convert AST node to functional graph node (original method)
   */
  private convertASTToFunctionalGraph(astNode: any, context: ConversionContext): Node<any> {
    logToPanel(`🔍 Converting AST node: ${astNode.name} (${astNode.from}-${astNode.to})`);
    
    switch (astNode.name) {
      case 'Script':
      case 'ExpressionStatement':
        return this.convertFirstChild(astNode, context);

      case 'CallExpression':
        return this.convertCallExpression(astNode, context);

      case 'MemberExpression':
        return this.convertMemberExpression(astNode, context);

      case 'VariableName':
        return this.convertVariableName(astNode, context);

      case 'Number':
        return this.convertNumber(astNode, context);

      case 'String':
        return this.convertString(astNode, context);

      case 'ObjectExpression':
        return this.convertObjectExpression(astNode, context);

      default:
        logToPanel(`⚠️ Unknown AST node type: ${astNode.name}`, 'warn');
        return this.convertFirstChild(astNode, context);
    }
  }


  /**
   * Convert the first child of a wrapper node
   */
  private convertFirstChild(astNode: any, context: ConversionContext): Node<any> {
    if (astNode.firstChild) {
      return this.convertASTToFunctionalGraph(astNode.firstChild, context);
    }
    
    // Fallback to a constant node
    const nodeId = this.generateNodeId(context);
    logToPanel(`⚠️ No child found for ${astNode.name}, creating null constant`, 'warn');
    return createNode(null, [], {});
  }

  /**
   * Convert function call expressions like sphere(), frame().mult(0.1)
   */
  private convertCallExpression(astNode: any, context: ConversionContext): Node<any> {
    // Parse the call chain structure to understand dependencies
    const callChain = this.parseCallChain(astNode, context);
    logToPanel(`📞 Processing call chain with ${callChain.length} calls`);
    
    // Convert the chain bottom-up (leaf functions first, then dependent calls)
    return this.buildCallChain(callChain, context);
  }
  
  /**
   * Parse a call expression into a structured call chain
   */
  private parseCallChain(astNode: any, context: ConversionContext): any[] {
    const chain: any[] = [];
    
    const parseCall = (node: any): void => {
      if (node.name !== 'CallExpression') return;
      
      const { functionName, targetNode, args } = this.extractCallExpressionParts(node, context);
      
      // Add this call to the chain
      chain.push({
        astNode: node,
        functionName,
        targetNode,
        args,
        isMethod: !!targetNode
      });
      
      // Recursively parse target (for method chaining)
      if (targetNode && targetNode.name === 'CallExpression') {
        parseCall(targetNode);
      } else if (targetNode && targetNode.name === 'MemberExpression') {
        // Handle nested member expressions
        let memberChild = targetNode.firstChild;
        while (memberChild) {
          if (memberChild.name === 'CallExpression') {
            parseCall(memberChild);
            break;
          }
          memberChild = memberChild.nextSibling;
        }
      }
    };
    
    parseCall(astNode);
    return chain.reverse(); // Reverse to get bottom-up order
  }
  
  /**
   * Build the call chain by creating nodes bottom-up
   */
  private buildCallChain(callChain: any[], context: ConversionContext): Node<any> {
    let currentNode: Node<any> | null = null;
    
    for (const call of callChain) {
      // Try to get UUID from function call registry based on AST position
      const uuid = getUUIDAtPosition(call.astNode.from);
      const nodeId = uuid || this.generateNodeId(context);
      
      logToPanel(`🔗 Building call: ${call.functionName}${call.isMethod ? ' (method)' : ' (function)'} (UUID: ${uuid || 'generated'})`);
      
      if (uuid) {
        logToPanel(`✅ Found UUID correlation: ${uuid} for ${call.functionName} at position ${call.astNode.from}-${call.astNode.to}`);
      }
      
      // Look up function in DSL context or chain context
      let dslFunction = context.dslContext[call.functionName];
      let resolvedFunctionName = call.functionName;
      
      // If it's a method call and function not found in main context, 
      // try chain context from previous node
      if (!dslFunction && call.isMethod && currentNode) {
        const chainContext = this.getChainContext(call.functionName, context);
        if (chainContext && chainContext[call.functionName] && chainContext[call.functionName].fn) {
          dslFunction = chainContext[call.functionName].fn;
          resolvedFunctionName = dslFunction.name || call.functionName;
          logToPanel(`🔗 Resolved chain method ${call.functionName} to ${resolvedFunctionName}`);
        }
      }
      
      if (!dslFunction) {
        logToPanel(`❌ Function '${call.functionName}' not found in DSL context`, 'error');
        this.logConversion(call.astNode, nodeId, 'RefNode', call.functionName, ['Function not found in DSL context'], uuid || undefined);
        
        const errorRefNode: RefNode = {
          id: nodeId,
          ref: '@error.unknown_function',
          value: call.functionName
        };
        return createNode(errorRefNode, [], {});
      }
      
      // Convert arguments to nodes
      const argNodes = call.args.map((arg: any) => this.convertASTToFunctionalGraph(arg, context));
      
      // Build dependencies array
      const dependencies: Node<any>[] = [];
      
      if (call.isMethod && currentNode) {
        // Method call: current node result is first argument
        dependencies.push(currentNode);
        dependencies.push(...argNodes);
      } else {
        // Function call: just the arguments
        dependencies.push(...argNodes);
      }
      
      // Create the node
      this.logConversion(call.astNode, nodeId, 'RefNode', resolvedFunctionName, undefined, uuid || undefined);
      
      const refNode: RefNode = {
        id: nodeId,
        ref: '@graph.executable',
        value: dslFunction,
        ...(uuid && { uuid }) // Add UUID if available for correlation
      };

      console.log("created refNode?", refNode)
      
      currentNode = createNode(refNode, dependencies, this.getChainContext(call.functionName, context));
    }
    
    return currentNode!;
  }

  /**
   * Convert member expressions like obj.property
   */
  private convertMemberExpression(astNode: any, context: ConversionContext): Node<any> {
    // For member expressions that aren't call expressions, we need to handle property access
    // This is typically part of a larger call expression, so we'll delegate to the parent
    logToPanel(`🔗 Member expression: ${this.getNodeText(astNode, context)}`);
    
    // Find the property name
    let propertyName = '';
    let objectNode = null;
    
    // Walk children to find object and property
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
      const baseNode = this.convertASTToFunctionalGraph(objectNode, context);
      logToPanel(`🔗 Member access: ${propertyName} on node ${baseNode.id}`);
      return baseNode; // Return the base node; property access will be handled by parent CallExpression
    }
    
    return this.convertFirstChild(astNode, context);
  }

  /**
   * Convert variable names to function references or constants
   */
  private convertVariableName(astNode: any, context: ConversionContext): Node<any> {
    const uuid = getUUIDAtPosition(astNode.from);
    const nodeId = uuid || this.generateNodeId(context);
    const nodeKey = `${astNode.from}-${astNode.to}`;
    const variableName = this.getNodeText(astNode, context);
    
    logToPanel(`🏷️ Converting variable: ${variableName}`);
    
    // Look up in DSL context
    const dslValue = context.dslContext[variableName];
    
    if (dslValue !== undefined) {
      if (typeof dslValue === 'function') {
        // It's a function reference
        this.logConversion(astNode, nodeId, 'RefNode', variableName, undefined, uuid || undefined);
        const functionRefNode: RefNode = {
          id: nodeId,
          ref: '@dsl.function',
          value: dslValue,
          ...(uuid && { uuid }) // Add UUID if available for correlation
        };
        const resultNode = createNode(functionRefNode, [], this.getChainContext(variableName, context));
        context.visitedNodes.set(nodeKey, resultNode.id);
        return resultNode;
      } else {
        // It's a constant value
        this.logConversion(astNode, nodeId, 'ValueNode', variableName, undefined, uuid || undefined);
        const resultNode = createNode(dslValue, [], {});
        context.visitedNodes.set(nodeKey, resultNode.id);
        return resultNode;
      }
    }
    
    logToPanel(`⚠️ Variable '${variableName}' not found in DSL context`, 'warn');
    this.logConversion(astNode, nodeId, 'ValueNode', variableName, ['Variable not found in DSL context'], uuid || undefined);
    
    // Return the variable name as a string constant
    const resultNode = createNode(variableName, [], {});
    context.visitedNodes.set(nodeKey, resultNode.id);
    return resultNode;
  }

  /**
   * Convert number literals
   */
  private convertNumber(astNode: any, context: ConversionContext): Node<any> {
    const uuid = getUUIDAtPosition(astNode.from);
    const nodeId = uuid || this.generateNodeId(context);
    const nodeKey = `${astNode.from}-${astNode.to}`;
    const numberText = this.getNodeText(astNode, context);
    const numberValue = parseFloat(numberText);
    
    logToPanel(`🔢 Converting number: ${numberValue}`);
    this.logConversion(astNode, nodeId, 'ValueNode', undefined, undefined, uuid || undefined);
    
    const resultNode = createNode(numberValue, [], {});
    context.visitedNodes.set(nodeKey, resultNode.id);
    return resultNode;
  }

  /**
   * Convert string literals
   */
  private convertString(astNode: any, context: ConversionContext): Node<any> {
    const uuid = getUUIDAtPosition(astNode.from);
    const nodeId = uuid || this.generateNodeId(context);
    const nodeKey = `${astNode.from}-${astNode.to}`;
    const stringText = this.getNodeText(astNode, context);
    // Remove quotes from string literal
    const stringValue = stringText.slice(1, -1);
    
    logToPanel(`📝 Converting string: "${stringValue}"`);
    this.logConversion(astNode, nodeId, 'ValueNode', undefined, undefined, uuid || undefined);
    
    const resultNode = createNode(stringValue, [], {});
    context.visitedNodes.set(nodeKey, resultNode.id);
    return resultNode;
  }

  private convertObjectExpression(astNode: any, context: ConversionContext): Node<any> {
    const uuid = getUUIDAtPosition(astNode.from);
    const nodeId = uuid || this.generateNodeId(context);
    const nodeKey = `${astNode.from}-${astNode.to}`;
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
    const resultNode = createNode(objectValue, [], {});
    context.visitedNodes.set(nodeKey, resultNode.id);
    return resultNode;
  }

  /**
   * Extract function name, target object, and arguments from CallExpression
   */
  private extractCallExpressionParts(astNode: any, context: ConversionContext): {
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
        // Direct function call like sphere()
        functionName = this.getNodeText(child, context);
      } else if (child.name === 'MemberExpression') {
        // Method call like obj.method()
        targetNode = child.firstChild; // The object being called on
        // Find property name in the MemberExpression
        let memberChild = child.firstChild;
        while (memberChild) {
          if (memberChild.name === 'PropertyName') {
            functionName = this.getNodeText(memberChild, context);
            break;
          }
          memberChild = memberChild.nextSibling;
        }
      } else if (child.name === 'ArgList') {
        // Extract arguments from argument list
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
   * Get the chain context for a function (for method chaining)
   */
  private getChainContext(functionName: string, context: ConversionContext): any {
    // Math chain methods (including short names like 'abs', 'floor', etc.)
    const mathChainMethods = ['mult', 'add', 'sub', 'div', 'abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh', 'cbrt', 'ceil', 'clz32', 'cos', 'cosh', 'exp', 'expm1', 'floor', 'fround', 'hypot', 'imul', 'log', 'log10', 'log1p', 'log2', 'max', 'min', 'pow', 'random', 'round', 'sign', 'sin', 'sinh', 'sqrt', 'tan', 'tanh', 'trunc'];
    
    // Object3D chain methods  
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
  private getNodeText(astNode: any, context: ConversionContext): string {
    return context.sourceCode.slice(astNode.from, astNode.to);
  }

  /**
   * Generate a unique node ID
   */
  private generateNodeId(context: ConversionContext): string {
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
 * Convenience function to convert source code to Nodysseus graph
 */
export function convertLezerToNodysseus(
  sourceCode: string,
  dslContext?: Record<string, any>
): LezerToNodysseusResult {
  const converter = new LezerToNodysseusConverter();
  return converter.convert(sourceCode, dslContext);
}