// Test for Lezer to Nodysseus converter
import { convertLezerToNodysseus } from '../src/dsl/lezer-to-nodysseus-converter';
import { dslContext } from '../src/dsl';

describe('Lezer to Nodysseus Converter', () => {
  it('should convert simple number literal', () => {
    const result = convertLezerToNodysseus('42', dslContext);
    
    expect(result.graph).toBeDefined();
    expect(result.rootNodeId).toBeDefined();
    expect(result.conversionLog.length).toBeGreaterThan(0);
    
    // Should have converted a number literal
    expect(result.conversionLog.some(entry => entry.astNodeType === 'Number')).toBe(true);
  });

  it('should debug complex method chaining expression', () => {
    const complexExpression = 'mesh(sphere(), material()).translateX(1).rotateY(45).render("mySphere")';
    console.log('🔍 Testing complex expression:', complexExpression);
    
    const result = convertLezerToNodysseus(complexExpression, dslContext);
    
    // Log detailed analysis
    console.log('\n=== LEZER CONVERTER DEBUG ANALYSIS ===');
    console.log('Expression:', complexExpression);
    console.log('Root Node ID:', result.rootNodeId);
    console.log('Total nodes created:', Object.keys(result.graph.nodes).length);
    console.log('Total edges:', Object.keys(result.graph.edges_in || {}).length);
    
    console.log('\n--- Conversion Log ---');
    result.conversionLog.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.astNodeType} (${entry.position.from}-${entry.position.to})`);
      console.log(`   -> ${entry.nodysseusNodeType}: ${entry.nodysseusNodeId}`);
      if (entry.functionResolved) {
        console.log(`   -> Function: ${entry.functionResolved}`);
      }
      if (entry.warnings && entry.warnings.length > 0) {
        console.log(`   -> Warnings: ${entry.warnings.join(', ')}`);
      }
    });
    
    console.log('\n--- Graph Structure ---');
    console.log('Nodes:');
    Object.entries(result.graph.nodes).forEach(([nodeId, node]) => {
      if ('ref' in node) {
        console.log(`  ${nodeId}: RefNode(${node.ref}) = ${typeof node.value === 'function' ? '[Function]' : node.value}`);
      } else {
        console.log(`  ${nodeId}: ValueNode = ${node.value}`);
      }
    });
    
    console.log('\nEdges (dependencies):');
    if (result.graph.edges_in) {
      Object.entries(result.graph.edges_in).forEach(([toNodeId, edges]) => {
        console.log(`  To ${toNodeId}:`);
        Object.entries(edges).forEach(([fromNodeId, edge]) => {
          console.log(`    From ${fromNodeId} as ${edge.as}`);
        });
      });
    }
    
    console.log('\nGraph Output Node:', result.graph.out);
    
    // Basic expectations
    expect(result.graph).toBeDefined();
    expect(result.rootNodeId).toBeDefined();
    expect(result.conversionLog.length).toBeGreaterThan(0);
    
    // Should have functions in the conversion log
    const functionsFound = result.conversionLog
      .filter(entry => entry.functionResolved)
      .map(entry => entry.functionResolved);
    console.log('\nFunctions found in conversion:', functionsFound);
    
    // Expected functions: mesh, sphere, material, translateX, rotateY, render
    const expectedFunctions = ['mesh', 'sphere', 'material', 'translateX', 'rotateY', 'render'];
    expectedFunctions.forEach(fn => {
      const found = functionsFound.includes(fn);
      console.log(`Expected function '${fn}': ${found ? '✅' : '❌'}`);
      if (!found) {
        console.log(`  Available functions in DSL context: ${Object.keys(dslContext).filter(k => typeof dslContext[k] === 'function').slice(0, 10).join(', ')}...`);
      }
    });
  });

  it('should compare Lezer converter vs eval-based approach', () => {
    const complexExpression = 'mesh(sphere(), material()).translateX(1).rotateY(45).render("mySphere")';
    
    // Test with Lezer converter
    const lezerResult = convertLezerToNodysseus(complexExpression, dslContext);
    
    // Test with eval-based approach
    const evalResult = (() => {
      try {
        const func = new Function(...Object.keys(dslContext), `return ${complexExpression}`);
        return func(...Object.values(dslContext));
      } catch (error) {
        console.error('Eval approach failed:', error);
        return null;
      }
    })();
    
    console.log('\n=== COMPARISON: LEZER vs EVAL ===');
    console.log('Expression:', complexExpression);
    
    console.log('\n--- LEZER RESULT ---');
    console.log('Total nodes:', Object.keys(lezerResult.graph.nodes).length);
    console.log('Root node:', lezerResult.rootNodeId);
    console.log('Graph output:', lezerResult.graph.out);
    
    console.log('\n--- EVAL RESULT ---');
    if (evalResult && typeof evalResult === 'object' && 'id' in evalResult) {
      console.log('Result type: Node');
      console.log('Node ID:', evalResult.id);
      console.log('Has dependencies:', evalResult.dependencies?.length || 0);
      console.log('Dependencies:', evalResult.dependencies?.map((dep: any) => dep.id) || []);
      
      // Convert eval result to Nodysseus for comparison
      const { convertGraphToNodysseus } = require('../src/graph-to-nodysseus-converter');
      const evalNodysseusGraph = convertGraphToNodysseus(evalResult);
      console.log('Converted to Nodysseus - nodes:', Object.keys(evalNodysseusGraph.nodes).length);
      console.log('Converted to Nodysseus - output:', evalNodysseusGraph.out);
      
      console.log('\n--- STRUCTURE COMPARISON ---');
      console.log('Lezer nodes:', Object.keys(lezerResult.graph.nodes).length);
      console.log('Eval nodes:', Object.keys(evalNodysseusGraph.nodes).length);
      console.log('Nodes match:', Object.keys(lezerResult.graph.nodes).length === Object.keys(evalNodysseusGraph.nodes).length);
      
      // Analyze the dependency structure
      const lezerDeps = Object.keys(lezerResult.graph.edges_in || {}).length;
      const evalDeps = Object.keys(evalNodysseusGraph.edges_in || {}).length;
      console.log('Lezer edges:', lezerDeps);
      console.log('Eval edges:', evalDeps);
      console.log('Edges match:', lezerDeps === evalDeps);
      
    } else {
      console.log('Result type:', typeof evalResult);
      console.log('Result value:', evalResult);
    }
  });

  it('should analyze detailed node structure differences', () => {
    const complexExpression = 'mesh(sphere(), material()).translateX(1).rotateY(45).render("mySphere")';
    
    // Test with Lezer converter
    const lezerResult = convertLezerToNodysseus(complexExpression, dslContext);
    
    // Test with eval-based approach
    const evalResult = (() => {
      const func = new Function(...Object.keys(dslContext), `return ${complexExpression}`);
      return func(...Object.values(dslContext));
    })();
    
    const { convertGraphToNodysseus } = require('../src/graph-to-nodysseus-converter');
    const evalNodysseusGraph = convertGraphToNodysseus(evalResult);
    
    console.log('\n=== DETAILED NODE STRUCTURE ANALYSIS ===');
    
    console.log('\n--- LEZER GRAPH NODES ---');
    Object.entries(lezerResult.graph.nodes).forEach(([nodeId, node]) => {
      console.log(`${nodeId}:`);
      if ('ref' in node) {
        console.log(`  Type: RefNode`);
        console.log(`  Ref: ${node.ref}`);
        console.log(`  Value: ${typeof node.value === 'function' ? '[Function ' + (node.value.name || 'anonymous') + ']' : JSON.stringify(node.value)}`);
      } else {
        console.log(`  Type: ValueNode`);
        console.log(`  Value: ${JSON.stringify(node.value)}`);
      }
    });
    
    console.log('\n--- EVAL GRAPH NODES ---');
    Object.entries(evalNodysseusGraph.nodes).forEach(([nodeId, node]) => {
      console.log(`${nodeId}:`);
      if ((node as any).ref) {
        console.log(`  Type: RefNode`);
        console.log(`  Ref: ${(node as any).ref}`);
        console.log(`  Value: ${typeof (node as any).value === 'function' ? '[Function ' + ((node as any).value.name || 'anonymous') + ']' : JSON.stringify((node as any).value)}`);
      } else {
        console.log(`  Type: ValueNode`);
        console.log(`  Value: ${JSON.stringify((node as any).value)}`);
      }
    });
    
    console.log('\n--- LEZER EDGES ---');
    if (lezerResult.graph.edges_in) {
      Object.entries(lezerResult.graph.edges_in).forEach(([toNodeId, edges]) => {
        console.log(`${toNodeId} <-`);
        Object.entries(edges).forEach(([fromNodeId, edge]) => {
          console.log(`  ${fromNodeId} (as ${edge.as})`);
        });
      });
    }
    
    console.log('\n--- EVAL EDGES ---');
    if (evalNodysseusGraph.edges_in) {
      Object.entries(evalNodysseusGraph.edges_in).forEach(([toNodeId, edges]) => {
        console.log(`${toNodeId} <-`);
        Object.entries(edges as any).forEach(([fromNodeId, edge]) => {
          console.log(`  ${fromNodeId} (as ${(edge as any).as})`);
        });
      });
    }
    
    console.log('\n--- ISSUE ANALYSIS ---');
    console.log('Key differences identified:');
    console.log('1. Node count: Lezer =', Object.keys(lezerResult.graph.nodes).length, ', Eval =', Object.keys(evalNodysseusGraph.nodes).length);
    console.log('2. Edge count: Lezer =', Object.keys(lezerResult.graph.edges_in || {}).length, ', Eval =', Object.keys(evalNodysseusGraph.edges_in || {}).length);
    
    // Analyze what the Lezer converter is doing wrong
    console.log('\n--- LEZER CONVERTER ISSUES ---');
    
    // Check if all functions are being treated as method calls when they shouldn't be
    const lezerMethods = Object.values(lezerResult.graph.nodes).filter((node: any) => 
      'ref' in node && node.ref === '@dsl.method'
    ).length;
    const lezerFunctions = Object.values(lezerResult.graph.nodes).filter((node: any) => 
      'ref' in node && node.ref === '@dsl.function'
    ).length;
    
    console.log(`Lezer: ${lezerMethods} method calls, ${lezerFunctions} function calls`);
    
    // Expected: sphere() and material() should be @dsl.function, others should be @dsl.method  
    console.log('Expected: sphere() and material() should be functions, mesh/translateX/rotateY/render should be methods');
    
    // The issue seems to be that Lezer is creating separate nodes for each argument and function call
    // instead of creating a proper chaining dependency structure
  });

  it('should convert string literal', () => {
    const result = convertLezerToNodysseus('"hello"', dslContext);
    
    expect(result.graph).toBeDefined();
    expect(result.rootNodeId).toBeDefined();
    
    // Should have converted a string literal
    expect(result.conversionLog.some(entry => entry.astNodeType === 'String')).toBe(true);
  });

  it('should convert simple function call', () => {
    const testContext = {
      testFn: () => 42
    };
    
    const result = convertLezerToNodysseus('testFn()', testContext);
    
    expect(result.graph).toBeDefined();
    expect(result.rootNodeId).toBeDefined();
    
    // Should have converted a CallExpression
    expect(result.conversionLog.some(entry => entry.astNodeType === 'CallExpression')).toBe(true);
    expect(result.conversionLog.some(entry => entry.functionResolved === 'testFn')).toBe(true);
  });

  it('should handle function with arguments', () => {
    const testContext = {
      add: (a: number, b: number) => a + b
    };
    
    const result = convertLezerToNodysseus('add(1, 2)', testContext);
    
    expect(result.graph).toBeDefined();
    expect(result.rootNodeId).toBeDefined();
    
    // Should have converted the call and its arguments
    expect(result.conversionLog.some(entry => entry.astNodeType === 'CallExpression')).toBe(true);
    expect(result.conversionLog.some(entry => entry.astNodeType === 'Number')).toBe(true);
    expect(result.conversionLog.length).toBeGreaterThan(2); // Call + 2 numbers + wrapper nodes
  });

  it('should handle unknown functions gracefully', () => {
    const result = convertLezerToNodysseus('unknownFunction()', {});
    
    expect(result.graph).toBeDefined();
    expect(result.rootNodeId).toBeDefined();
    
    // Should have logged a warning about unknown function
    const callEntry = result.conversionLog.find(entry => entry.astNodeType === 'CallExpression');
    expect(callEntry).toBeDefined();
    expect(callEntry?.warnings?.some(w => w.includes('not found'))).toBe(true);
  });

  it('should convert DSL functions', () => {
    const result = convertLezerToNodysseus('mult(2, 3)', dslContext);
    
    expect(result.graph).toBeDefined();
    expect(result.rootNodeId).toBeDefined();
    
    // Should have found the mult function in DSL context
    expect(result.conversionLog.some(entry => entry.functionResolved === 'mult')).toBe(true);
  });

  it('should handle method chaining', () => {
    const result = convertLezerToNodysseus('frame().mult(0.1)', dslContext);
    
    expect(result.graph).toBeDefined();
    expect(result.rootNodeId).toBeDefined();
    
    // Should have converted both frame() and mult() calls
    expect(result.conversionLog.some(entry => entry.functionResolved === 'frame')).toBe(true);
    expect(result.conversionLog.some(entry => entry.functionResolved === 'mult')).toBe(true);
    
    // Should have multiple nodes for the chain
    expect(Object.keys(result.graph.nodes).length).toBeGreaterThan(1);
  });

  it('should handle complex expressions gracefully', () => {
    const result = convertLezerToNodysseus('mult(1, 2)', dslContext);
    
    expect(result.graph).toBeDefined();
    expect(result.rootNodeId).toBeDefined();
    
    // Should have found the mult function and converted it with arguments
    expect(result.conversionLog.some(entry => entry.functionResolved === 'mult')).toBe(true);
    expect(Object.keys(result.graph.nodes).length).toBeGreaterThan(1);
  });
});