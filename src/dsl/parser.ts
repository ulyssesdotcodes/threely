// DSL Parser and execution engine
import * as THREE from 'three';
import { parser } from "@lezer/javascript";
import { v7 as uuid } from "uuid";
import { convertGraphToNodysseus } from '../graph-to-nodysseus-converter';
import { NodysseusRuntime } from '../nodysseus/runtime-core';
import { MockObject3D, applyMockToObject3D, createGeometryFromMock, mockUtils, mockPresets } from '../three/MockObject3D';
// Import object registry from pure functions
// import { getObjectRegistry } from './object3d-chain';
// Use pure functions instead of Node-based chains
import * as pureObj3d from './pure-object3d-functions';
import * as pureMath from './pure-math-functions';
import { convertASTToNodysseus } from './direct-ast-to-nodysseus-converter';
import { RangeSet } from '@codemirror/state';
import {UUIDTag, generateUUIDTags} from "../uuid-tagging"

// Global map to store function call positions and UUIDs
const functionCallUUIDs = new Map<string, string>();

// Log to the error panel at the bottom of the page
function logToPanel(message: string, type: 'info' | 'warn' | 'error' = 'info', ...args): void {
  if (typeof window !== 'undefined' && window.document) {
    const errorPanel = document.getElementById('error-panel');
    const errorMessages = document.getElementById('error-messages');
    
    if (errorPanel && errorMessages) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `error-message ${type}`;
      
      const timestamp = new Date().toLocaleTimeString();
      const timestampSpan = document.createElement('span');
      timestampSpan.className = 'error-timestamp';
      timestampSpan.textContent = `[${timestamp}]`;
      
      messageDiv.appendChild(timestampSpan);
      messageDiv.appendChild(document.createTextNode(` ${message}`));
      
      errorMessages.appendChild(messageDiv);
      errorPanel.classList.add('has-errors');
      
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
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// Generate deterministic UUID based on position and function name
function generateFunctionUUID(functionName: string, position: number, code: string): string {
  const key = `${functionName}:${position}:${code.length}`;
  if (!functionCallUUIDs.has(key)) {
    const hash = simpleHash(key);
    const uuid = `${hash.slice(0, 8)}-${hash.slice(8, 12) || '0000'}-${hash.slice(12, 16) || '0000'}-${hash.slice(16, 20) || '0000'}-${hash.slice(20, 32) || '000000000000'}`;
    functionCallUUIDs.set(key, uuid);
    logToPanel(`Generated new UUID for ${functionName} at position ${position}: ${uuid}`);
  } else {
    logToPanel(`Reusing existing UUID for ${functionName} at position ${position}: ${functionCallUUIDs.get(key)!}`);
  }
  return functionCallUUIDs.get(key)!;
}

// Flag to enable Lezer-based parsing (experimental)
const USE_LEZER_CONVERTER = true;

// Direct AST to Nodysseus parser (eliminates functional graph layer)
export function parseDSLWithLezer(code: string, dslContext: any): any {
  try {
    console.log('🚀 PARSER: Using direct AST to Nodysseus converter for code:', code);
    logToPanel('🚀 Using direct AST to Nodysseus converter...');
    
    const cleanCode = code.trim();
    logToPanel(`📝 Input code: ${cleanCode}`);
    
    // Generate UUID tags for function calls before conversion
    generateUUIDTags(cleanCode);
    
    // Use the direct converter with pure functions (no functional graph layer)
    const conversionResult = convertASTToNodysseus(cleanCode, dslContext);
    
    logToPanel(`🎯 Direct conversion result: ${conversionResult.conversionLog.length} nodes converted`);
    logToPanel(`📊 Root node: ${conversionResult.rootNodeId}`);
    
    // LOG THE COMPLETE GRAPH OBJECT
    console.log('🔍 COMPLETE NODYSSEUS GRAPH OBJECT:');
    console.log(conversionResult.graph);
    
    // Log conversion details
    conversionResult.conversionLog.forEach(entry => {
      const warnings = entry.warnings ? ` (${entry.warnings.join(', ')})` : '';
      logToPanel(`  🔗 ${entry.astNodeType} -> ${entry.nodysseusNodeType} (${entry.nodysseusNodeId})${warnings}`);
    });
    
    // Execute the Nodysseus graph directly and return the result
    // No need for fake Node wrapper - return the computed result directly
    console.log('\n🚀 EXECUTING NODYSSEUS GRAPH...');
    console.log('About to execute graph with root node:', conversionResult.rootNodeId);
    
    let finalComputed;
    try {
      finalComputed = runtime.runGraphNode(conversionResult.graph, conversionResult.rootNodeId);
      console.log('✅ Graph execution completed successfully');
      console.log('Result type:', typeof finalComputed);
      console.log('Result constructor:', finalComputed?.constructor?.name);
      console.log('Result:', finalComputed);
    } catch (error) {
      console.error('❌ ERROR during graph execution:', error);
      console.error('Stack trace:', (error as Error).stack);
      throw error;
    }
    
    // Set up frame watching if needed
    const graphContainsFrame = JSON.stringify(conversionResult.graph).includes('extern.frame');
    if (graphContainsFrame && finalComputed instanceof THREE.Object3D) {
      const objectName = conversionResult.graph.id;
      const renderNodeId = conversionResult.rootNodeId;
      const renderInputEdges = conversionResult.graph.edges_in?.[renderNodeId];
      
      if (renderInputEdges) {
        // Find the edge that represents the first argument (the MockObject3D)
        let mockObjectNodeId: string | null = null;
        for (const [fromNodeId, edge] of Object.entries(renderInputEdges)) {
          if (edge && typeof edge === 'object' && 'as' in edge && edge.as === 'arg0') {
            mockObjectNodeId = fromNodeId;
            break;
          }
        }
        
        if (mockObjectNodeId) {
          const scopeKey = conversionResult.graph.id + "/" + mockObjectNodeId;
          const nodeToWatch = runtime.scope.get(scopeKey);
          
          if (nodeToWatch && pureObj3d.getObjectRegistry().has(objectName)) {
            runtime.stopWatch(nodeToWatch);
            const watch = runtime.createWatch<MockObject3D>(nodeToWatch);
            
            // Start watching for frame updates
            (async () => {
              try {
                for await (const updatedValue of watch) {
                  const existingObject = pureObj3d.getObjectRegistry().get(objectName);
                  if (existingObject) {
                    applyMockToObject3D(existingObject, updatedValue);
                  } else {
                    break;
                  }
                }
              } catch (error) {
                console.warn('Watch loop error:', error);
              }
            })();
          }
        }
      }
    }
    
    return finalComputed;
    
  } catch (error) {
    logToPanel(`❌ Direct conversion error: ${error}`, 'error');
    console.error('Direct conversion error:', error);
    return null;
  }
}

// Simple DSL parser that evaluates code with functional context
export function parseDSL(code: string, dslContext: any, ranges: {start: number, end: number, uuid: UUIDTag}[] = []): any {
  // Choose parsing strategy
  if (USE_LEZER_CONVERTER) {
    return parseDSLWithLezer(code, dslContext);
  }
  
  try {
    // Clear previous logs for this parse session
    logToPanel('🔄 Starting DSL parsing (eval-based)...');
    
    // Clean up the code by trimming whitespace and handling multiline expressions
    const cleanCode = code.trim();
    logToPanel(`📝 Input code: ${cleanCode}`);
    
    // Parse with @lezer/javascript to get AST
    logToPanel('🌳 Parsing with Lezer JavaScript parser...');
    const tree = parser.parse(cleanCode);
    
    // Log detailed AST structure
    logToPanel('=== Lezer Parser Output ===');
    logToPanel(`AST Root: ${tree.topNode.name} (${tree.topNode.from}-${tree.topNode.to})`);
    
    // Walk the entire tree to show structure
    const astNodes: Array<{name: string, from: number, to: number, depth: number, text: string}> = [];
    const walkTree = (node: any, depth: number = 0) => {
      const nodeText = cleanCode.slice(node.from, node.to);
      astNodes.push({
        name: node.name,
        from: node.from,
        to: node.to,
        depth: depth,
        text: nodeText.length > 50 ? nodeText.slice(0, 50) + '...' : nodeText
      });
      
      if (node.firstChild) {
        let child = node.firstChild;
        do {
          walkTree(child, depth + 1);
          child = child.nextSibling;
        } while (child);
      }
    };
    
    walkTree(tree.topNode);
    
    // Check for parse errors by looking for error nodes
    const hasError = astNodes.some(node => node.name === '⚠');
    if (hasError) {
      logToPanel('⚠️  Parse tree contains errors!', 'warn');
    } else {
      logToPanel('✅ Parse successful!');
    }
    
    // Log AST structure
    logToPanel('🏗️  AST Structure:');
    astNodes.forEach(node => {
      const indent = '  '.repeat(node.depth);
      logToPanel(`${indent}${node.name} (${node.from}-${node.to}): "${node.text}"`);
    });
    
    // Walk the tree to find function calls and generate UUIDs for frame() calls
    const functionCalls: Array<{name: string, from: number, to: number, uuid?: string}> = [];
    let modifiedCode = cleanCode;
    let offset = 0;
    
    tree.cursor().iterate((node) => {
          const matchingRange = ranges.find(v => v.start === node.from && v.end === node.to);
          console.log("matching range", matchingRange)
      if (node.name === 'CallExpression') {
        const callText = cleanCode.slice(node.from, node.to);
        // Extract function name from the call expression
        const funcNameMatch = callText.match(/^(\w+)/);
        if (funcNameMatch) {
          const functionName = funcNameMatch[1];
          const callInfo: {name: string, from: number, to: number, uuid?: string} = {
            name: functionName,
            from: node.from,
            to: node.to
          };
          
          // Generate stable UUID for frame() calls
          if (functionName === 'frame') {
            const genuuid = uuid();
            callInfo.uuid = genuuid
            
            // Replace frame() with frame("uuid") in the code
            if (callText === 'frame()') {
              const replacement = `frame("${genuuid}")`;
              const adjustedFrom = node.from + offset;
              const adjustedTo = node.to + offset;
              modifiedCode = modifiedCode.slice(0, adjustedFrom) + replacement + modifiedCode.slice(adjustedTo);
              offset += replacement.length - callText.length;
            }
          }
          
          functionCalls.push(callInfo);
        }
      }
    });
    
    logToPanel('🔍 Function calls found:');
    functionCalls.forEach(call => {
      const callText = cleanCode.slice(call.from, call.to);
      logToPanel(`  📞 ${call.name} at ${call.from}-${call.to}: "${callText}"${call.uuid ? ` -> UUID: ${call.uuid}` : ''}`);
    });
    
    if (modifiedCode !== cleanCode) {
      logToPanel(`🔄 Modified code: ${modifiedCode}`);
    }
    
    logToPanel('⚡ Executing modified code...');
    console.log('Function calls found:', functionCalls);
    
    // Create a function that has access to the DSL context
    const func = new Function(...Object.keys(dslContext), `return ${modifiedCode}`);
    
    // Execute the function and return the result (which could be a Node<T>)
    const result = func(...Object.values(dslContext));
    logToPanel('✅ DSL parsing completed successfully!');
    return result;
  } catch (error) {
    logToPanel(`❌ DSL parsing error: ${error}`, 'error');
    console.error('DSL parsing error:', error);
    return null;
  }
}

// Important that this isn't created every time executeDSL is called!
const runtime = new NodysseusRuntime();

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
  console
};

export function executeDSL(code: string, ranges : {start: number, end: number, uuid: UUIDTag}[] = [], dslContextParam?: any): THREE.Object3D | number | string | boolean | null {
  try {
    const contextToUse = dslContextParam || defaultDslContext;
    console.log(ranges);
    let result = parseDSL(code, contextToUse, ranges);
    const objectRegistry = pureObj3d.getObjectRegistry();
    
    // Lezer converter now returns results directly - no wrapper needed
    
    if (result && typeof result === 'object' && 'value' in result && 'dependencies' in result && !('__isLezerConverted' in result) && !('__wasLezerConverted' in result)) {
      // Convert the graph to Nodysseus format
      const nodysseusGraph = convertGraphToNodysseus(result);
      // Grab the name and use it as the graph id so that it caches.
      if (result.dependencies && result.dependencies.length > 1 && result.dependencies[1] && result.dependencies[1].value) {
        nodysseusGraph.id = result.dependencies[1].value;
      } else {
        // Fallback to generating a unique ID if dependencies[1].value is not available
        nodysseusGraph.id = nodysseusGraph.id || `graph-${Date.now()}`;
      }
      
      // Re-execute with the named graph
      const finalComputed = runtime.runGraphNode(nodysseusGraph, nodysseusGraph.out!);
      
      // Set up watch for frame updates only if graph contains frame nodes AND results in a rendered object
      const graphContainsFrame = JSON.stringify(result).includes('extern.frame');
      if (graphContainsFrame && finalComputed instanceof THREE.Object3D) {
        const objectName = nodysseusGraph.id;
        const renderNodeId = nodysseusGraph.out!;
        const renderInputEdges = nodysseusGraph.edges_in?.[renderNodeId];
        
        if (renderInputEdges) {
          // Find the edge that represents the first argument (the MockObject3D)
          let mockObjectNodeId: string | null = null;
          for (const [fromNodeId, edge] of Object.entries(renderInputEdges)) {
            if (edge && typeof edge === 'object' && 'as' in edge && edge.as === 'arg0') {
              mockObjectNodeId = fromNodeId;
              break;
            }
          }
          
          if (mockObjectNodeId) {
            const scopeKey = nodysseusGraph.id + "/" + mockObjectNodeId;
            const nodeToWatch = runtime.scope.get(scopeKey);
            
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
                      // Break the watch loop if object is no longer in registry
                      break;
                    }
                  }
                } catch (error) {
                  console.warn('Watch loop error:', error);
                }
              })();
            }
          }
        }
      }
      
      return finalComputed;
    }
    
    // Otherwise return the result if it's already an Object3D or MockObject3D
    if (result instanceof THREE.Object3D) {
      return result;
    }
    
    // If it's a MockObject3D, convert it to a real Object3D
    if (result && typeof result === 'object' && 'geometry' in result) {
      let realObject: THREE.Object3D;
      if (result.geometry && result.userData?.material) {
        const geometry = createGeometryFromMock(result.geometry);
        const material = result.userData.material;
        realObject = new THREE.Mesh(geometry, material);
      } else {
        realObject = new THREE.Object3D();
      }
      applyMockToObject3D(realObject, result);
      return realObject;
    }
    
    return null;
  } catch (error) {
    console.error('DSL execution error:', error);
    return null;
  }
}

// Export logToPanel for use in other modules
export { logToPanel };

// Export dslContext for external use
export { defaultDslContext as dslContext };