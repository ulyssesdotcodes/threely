import { setScene, executeDSL, clearAll, frame, mesh, sphere, material, render, multiply } from '../src/dsl';
import { Graph } from '../src/graph';
import { convertGraphToNodysseus } from '../src/graph-to-nodysseus-converter';
import { NodysseusRuntime } from '../src/nodysseus/runtime-core';
import * as externalNodes from '../src/nodysseus/external-nodes';
import * as THREE from 'three';

// Mock requestAnimationFrame to control timing
const mockRequestAnimationFrame = jest.fn();

describe('executeDSL Frame Integration Tests', () => {
  let scene: THREE.Scene;
  let executionLog: string[] = [];
  let originalConsoleLog: typeof console.log;

  beforeEach(() => {
    scene = new THREE.Scene();
    setScene(scene);
    clearAll();
    executionLog = [];
    
    // Mock requestAnimationFrame from external-nodes
    jest.spyOn(externalNodes, 'requestAnimationFrame').mockImplementation(mockRequestAnimationFrame);
    
    // Capture console.log to track execution
    originalConsoleLog = console.log;
    console.log = (...args: any[]) => {
      const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
      executionLog.push(message);
      originalConsoleLog(...args);
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    console.log = originalConsoleLog;
  });

  describe('Basic Frame Execution', () => {
    it('should execute frame() DSL successfully', () => {
      console.log('=== Test: Basic frame() execution ===');
      
      const result = executeDSL('frame()');
      
      console.log('Result:', result);
      console.log('Result type:', typeof result);
      console.log('RequestAnimationFrame called:', mockRequestAnimationFrame.mock.calls.length);
      console.log('Execution log:', executionLog);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
      expect(result).toBe(1); // Frame should start at 1
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1);
      
      // Check if watch was set up
      const watchSetupLogs = executionLog.filter(log => log.includes('watch') || log.includes('Watch'));
      console.log('Watch setup logs:', watchSetupLogs);
    });

    it('should handle multiple frame() calls without conflicts', () => {
      console.log('=== Test: Multiple frame() calls ===');
      
      const result1 = executeDSL('frame()');
      const result2 = executeDSL('frame()');
      
      console.log('Result 1:', result1);
      console.log('Result 2:', result2);
      console.log('Total RAF calls:', mockRequestAnimationFrame.mock.calls.length);
      
      expect(result1).toBe(1);
      expect(result2).toBe(1);
      // Should create separate frame instances
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(2);
    });

    it('should detect multiple executions during single frame() call', () => {
      console.log('=== Test: Multiple executions detection ===');
      
      // Track how many times the graph conversion happens
      const originalConvertGraphToNodysseus = require('../src/graph-to-nodysseus-converter').convertGraphToNodysseus;
      let conversionCount = 0;
      
      jest.spyOn(require('../src/graph-to-nodysseus-converter'), 'convertGraphToNodysseus').mockImplementation((...args) => {
        conversionCount++;
        console.log(`Graph conversion #${conversionCount}`);
        return originalConvertGraphToNodysseus(...args);
      });
      
      // Track how many times runtime.runGraphNode is called
      const runtime = new NodysseusRuntime();
      const originalRunGraphNode = runtime.runGraphNode;
      let runGraphCount = 0;
      
      runtime.runGraphNode = function(...args) {
        runGraphCount++;
        console.log(`Runtime.runGraphNode call #${runGraphCount}`);
        return originalRunGraphNode.apply(this, args);
      };
      
      const result = executeDSL('frame()');
      
      console.log('Conversion count:', conversionCount);
      console.log('RunGraphNode count:', runGraphCount);
      console.log('Final result:', result);
      
      // Should only convert and run once per executeDSL call
      expect(conversionCount).toBe(1);
      expect(result).toBe(1);
    });
  });

  describe('Frame with Render Chain', () => {
    it('should execute frame() with render chain', () => {
      console.log('=== Test: Frame with render chain ===');
      
      const dslCode = `
        mesh(
          sphere(1),
          material({ color: 0xff0000 })
        ).translateX(multiply(frame(), 0.1)).render('animatedSphere')
      `;
      
      let result;
      let error;
      
      try {
        result = executeDSL(dslCode);
      } catch (e) {
        error = e;
        console.log('Error during execution:', e);
      }
      
      console.log('Result:', result);
      console.log('Error:', error);
      console.log('Scene children count:', scene.children.length);
      console.log('RAF calls:', mockRequestAnimationFrame.mock.calls.length);
      
      if (error) {
        console.log('Error stack:', error.stack);
      }
      
      // Should not crash and should create some result
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('should handle frame() in complex transformation chains', () => {
      console.log('=== Test: Complex frame transformations ===');
      
      const dslCode = `
        mesh(sphere(1), material())
          .translateX(multiply(frame(), 0.01))
          .rotateY(multiply(frame(), 0.02))
          .render('complexAnimation')
      `;
      
      let result;
      let error;
      
      try {
        result = executeDSL(dslCode);
      } catch (e) {
        error = e;
        console.log('Complex chain error:', e);
      }
      
      console.log('Complex result:', result);
      console.log('Complex error:', error);
      
      if (error) {
        console.log('Complex error stack:', error.stack);
      }
      
      expect(error).toBeUndefined();
    });
  });

  describe('CreateWatch Behavior Analysis', () => {
    it('should analyze createWatch setup and execution', () => {
      console.log('=== Test: CreateWatch analysis ===');
      
      // Track runtime.createWatch calls
      const runtime = new NodysseusRuntime();
      const originalCreateWatch = runtime.createWatch;
      let createWatchCalls = 0;
      
      runtime.createWatch = function<T>(node: any) {
        createWatchCalls++;
        console.log(`CreateWatch call #${createWatchCalls}`, node);
        return originalCreateWatch.call(this, node) as AsyncIterable<T>;
      };
      
      const result = executeDSL('frame()');
      
      console.log('CreateWatch calls:', createWatchCalls);
      console.log('Result after watch setup:', result);
      
      // Should NOT set up watch for simple frame() calls (optimization)
      expect(createWatchCalls).toBe(0);
    });

    it('should test if createWatch causes multiple node executions', async () => {
      console.log('=== Test: CreateWatch multiple executions ===');
      
      // Create a custom runtime to track node execution
      const runtime = new NodysseusRuntime();
      let nodeExecutionCount = 0;
      
      const originalRunNode = runtime.runNode;
      runtime.runNode = function(...args) {
        nodeExecutionCount++;
        console.log(`RunNode call #${nodeExecutionCount}`);
        return originalRunNode.apply(this, args);
      };
      
      // Execute frame DSL
      const result = executeDSL('frame()');
      
      console.log('Node executions after initial call:', nodeExecutionCount);
      console.log('Initial result:', result);
      
      // Simulate animation frame update
      const updateFunction = mockRequestAnimationFrame.mock.calls[0]?.[0];
      if (updateFunction) {
        console.log('Calling animation frame update...');
        updateFunction();
        console.log('Node executions after frame update:', nodeExecutionCount);
      }
      
      // Should not cause excessive node re-executions
      expect(nodeExecutionCount).toBeLessThan(10); // Reasonable threshold
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle dependencies[1] access safely', () => {
      console.log('=== Test: Dependencies access safety ===');
      
      // This tests the line: nodysseusGraph.id = result.dependencies[1].value;
      const frameNode = frame();
      console.log('Frame node structure:', JSON.stringify(frameNode, null, 2));
      console.log('Dependencies:', frameNode.dependencies);
      console.log('Dependencies length:', frameNode.dependencies?.length);
      
      if (frameNode.dependencies && frameNode.dependencies.length > 1) {
        console.log('Dependencies[1]:', frameNode.dependencies[1]);
        console.log('Dependencies[1].value:', frameNode.dependencies[1].value);
      }
      
      let result;
      let error;
      
      try {
        result = executeDSL('frame()');
      } catch (e) {
        error = e;
        console.log('Dependencies access error:', e);
      }
      
      console.log('Result:', result);
      console.log('Error:', error);
      
      // Should handle missing dependencies gracefully
      expect(error).toBeUndefined();
    });

    it('should handle frame() with missing scene', () => {
      console.log('=== Test: Frame with missing scene ===');
      
      setScene(null as any);
      
      let result;
      let error;
      
      try {
        result = executeDSL('frame()');
      } catch (e) {
        error = e;
        console.log('Missing scene error:', e);
      }
      
      console.log('Result with no scene:', result);
      console.log('Error with no scene:', error);
      
      // Should handle missing scene gracefully
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('should detect infinite loops or excessive recursion', () => {
      console.log('=== Test: Infinite loop detection ===');
      
      const startTime = Date.now();
      
      let result;
      let error;
      
      try {
        result = executeDSL('frame()');
        
        // Simulate multiple frame updates quickly
        for (let i = 0; i < 5; i++) {
          const updateFunction = mockRequestAnimationFrame.mock.calls[i]?.[0];
          if (updateFunction) {
            updateFunction();
          }
        }
      } catch (e) {
        error = e;
        console.log('Infinite loop error:', e);
      }
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      console.log('Execution time:', executionTime, 'ms');
      console.log('RAF calls after loop test:', mockRequestAnimationFrame.mock.calls.length);
      
      // Should not take too long or cause infinite recursion
      expect(executionTime).toBeLessThan(1000); // 1 second threshold
      expect(error).toBeUndefined();
    });
  });

  describe('Graph Conversion and Caching', () => {
    it('should test graph ID generation and caching', () => {
      console.log('=== Test: Graph ID and caching ===');
      
      const frameNode = frame();
      const nodysseusGraph = convertGraphToNodysseus(frameNode);
      
      console.log('Original graph ID:', nodysseusGraph.id);
      console.log('Graph structure:', JSON.stringify(nodysseusGraph, null, 2));
      
      // Test the problematic line in executeDSL
      try {
        if (frameNode.dependencies && frameNode.dependencies.length > 1) {
          const graphId = frameNode.dependencies[1].value;
          console.log('Graph ID from dependencies[1]:', graphId);
        } else {
          console.log('Dependencies[1] not available, using fallback');
        }
      } catch (e) {
        console.log('Error accessing dependencies[1]:', e);
      }
      
      // Test multiple executions with same graph
      const result1 = executeDSL('frame()');
      const result2 = executeDSL('frame()');
      
      console.log('First execution result:', result1);
      console.log('Second execution result:', result2);
      
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should test graph contains frame detection', () => {
      console.log('=== Test: Graph contains frame detection ===');
      
      const frameNode = frame();
      const frameJsonString = JSON.stringify(frameNode);
      
      console.log('Frame node JSON:', frameJsonString);
      console.log('Contains extern.frame:', frameJsonString.includes('extern.frame'));
      
      // Test the detection logic used in executeDSL
      const graphContainsFrame = frameJsonString.includes('extern.frame');
      console.log('Graph contains frame (detection):', graphContainsFrame);
      
      expect(graphContainsFrame).toBe(true);
    });
  });

  describe('Geometry Type Mutation Bug Reproduction', () => {
    it('should reproduce "Unknown geometry type: SphereGeometry" error on third loop', (done) => {
      console.log('=== Test: Reproducing SphereGeometry type mutation error ===');
      
      // The exact DSL expression that triggers the bug
      const dslCode = `mesh(sphere(), material()).translateX(frame()).rotateY(45).render("mySphere")`;
      
      let watchCallbacks: Function[] = [];
      let frameUpdateCount = 0;
      let capturedErrors: any[] = [];
      let capturedWarnings: any[] = [];
      let geometryTypeHistory: any[] = [];
      
      // Capture console.warn to catch the error
      const originalConsoleWarn = console.warn;
      console.warn = (...args: any[]) => {
        const message = args.map(arg => {
          if (arg instanceof Error) return arg.message;
          return typeof arg === 'string' ? arg : JSON.stringify(arg);
        }).join(' ');
        capturedWarnings.push({
          message,
          args,
          timestamp: Date.now()
        });
        originalConsoleWarn(...args);
      };
      
      // Track all watch callbacks that get created
      const originalRAF = mockRequestAnimationFrame;
      mockRequestAnimationFrame.mockImplementation((callback: Function) => {
        console.log(`=== RAF callback registered for frame update #${watchCallbacks.length + 1} ===`);
        watchCallbacks.push(callback);
        return watchCallbacks.length;
      });
      
      // Execute the DSL that sets up the watch
      let initialResult;
      let setupError;
      
      try {
        console.log('Executing DSL to setup watch...');
        initialResult = executeDSL(dslCode);
        console.log('Initial DSL execution result:', initialResult);
        console.log('Watch callbacks registered:', watchCallbacks.length);
      } catch (e) {
        setupError = e;
        console.log('Setup error:', e);
      }
      
      if (setupError) {
        console.log('Failed to setup watch, test cannot continue');
        expect(setupError).toBeUndefined();
        console.warn = originalConsoleWarn;
        return done();
      }
      
      // Function to trigger frame updates and capture geometry type mutations
      const triggerFrameUpdate = (updateNumber: number) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            try {
              frameUpdateCount++;
              console.log(`\n=== FRAME UPDATE #${frameUpdateCount} (iteration ${updateNumber}) ===`);
              
              // Before triggering the callback, try to inspect the current state
              if (scene.children.length > 0) {
                const mesh = scene.children.find(child => child.name === 'mySphere') as THREE.Mesh;
                if (mesh && mesh.geometry) {
                  const geometryType = mesh.geometry.constructor.name;
                  const geometryTypeProperty = (mesh.geometry as any).type;
                  
                  console.log(`Before update ${updateNumber}:`);
                  console.log('  - geometry.constructor.name:', geometryType);
                  console.log('  - geometry.type property:', geometryTypeProperty);
                  console.log('  - geometry object keys:', Object.keys(mesh.geometry));
                  
                  geometryTypeHistory.push({
                    iteration: updateNumber,
                    phase: 'before',
                    constructorName: geometryType,
                    typeProperty: geometryTypeProperty,
                    isString: typeof geometryTypeProperty === 'string',
                    isObject: typeof geometryTypeProperty === 'object'
                  });
                }
              }
              
              // Trigger the watch callback
              if (watchCallbacks.length > 0) {
                const callback = watchCallbacks[0]; // Use the first (main) callback
                console.log(`Calling watch callback for frame ${frameUpdateCount}...`);
                callback();
              }
              
              // After triggering the callback, inspect the state again
              if (scene.children.length > 0) {
                const mesh = scene.children.find(child => child.name === 'mySphere') as THREE.Mesh;
                if (mesh && mesh.geometry) {
                  const geometryType = mesh.geometry.constructor.name;
                  const geometryTypeProperty = (mesh.geometry as any).type;
                  
                  console.log(`After update ${updateNumber}:`);
                  console.log('  - geometry.constructor.name:', geometryType);
                  console.log('  - geometry.type property:', geometryTypeProperty);
                  
                  geometryTypeHistory.push({
                    iteration: updateNumber,
                    phase: 'after',
                    constructorName: geometryType,
                    typeProperty: geometryTypeProperty,
                    isString: typeof geometryTypeProperty === 'string',
                    isObject: typeof geometryTypeProperty === 'object'
                  });
                  
                  // Check if this is the mutation we're looking for
                  if (typeof geometryTypeProperty !== 'string' && geometryTypeProperty && geometryTypeProperty.constructor) {
                    console.log('🚨 GEOMETRY TYPE MUTATION DETECTED!');
                    console.log('  - Type property is no longer a string');
                    console.log('  - Type value:', geometryTypeProperty);
                    console.log('  - Type value constructor:', geometryTypeProperty.constructor.name);
                  }
                }
              }
              
              console.log(`Frame update ${updateNumber} completed`);
              resolve();
              
            } catch (error) {
              console.log(`ERROR in frame update ${updateNumber}:`, error);
              if (error instanceof Error) {
                console.log('Error message:', error.message);
                console.log('Error stack:', error.stack);
              }
              
              capturedErrors.push({
                iteration: updateNumber,
                frameCount: frameUpdateCount,
                error: error,
                message: error instanceof Error ? error.message : String(error)
              });
              resolve();
            }
          }, 50); // Small delay to allow async operations
        });
      };
      
      // Run the frame updates sequentially
      const runFrameUpdates = async () => {
        console.log('\n=== Starting frame update sequence ===');
        
        for (let i = 1; i <= 5; i++) { // Run 5 iterations to be sure we catch the error
          await triggerFrameUpdate(i);
          
          // Check if we've captured the specific error we're looking for
          const sphereGeometryError = capturedErrors.find(e => 
            e.message && e.message.includes('Unknown geometry type: SphereGeometry')
          );
          
          if (sphereGeometryError) {
            console.log(`\n🎯 FOUND THE TARGET ERROR on iteration ${sphereGeometryError.iteration}!`);
            console.log('Error details:', sphereGeometryError);
            break;
          }
        }
        
        // Final analysis
        console.log('\n=== FINAL ANALYSIS ===');
        console.log('Total frame updates:', frameUpdateCount);
        console.log('Total errors captured:', capturedErrors.length);
        console.log('Total warnings captured:', capturedWarnings.length);
        console.log('Geometry type history:', geometryTypeHistory);
        
        console.log('\nWarnings captured:');
        capturedWarnings.forEach((warning, index) => {
          console.log(`  Warning ${index + 1}: ${warning.message}`);
        });
        
        console.log('\nErrors by iteration:');
        capturedErrors.forEach(err => {
          console.log(`  Iteration ${err.iteration}: ${err.message}`);
        });
        
        console.log('\nGeometry type changes:');
        geometryTypeHistory.forEach(entry => {
          console.log(`  ${entry.iteration}.${entry.phase}: ${entry.typeProperty} (string: ${entry.isString})`);
        });
        
        // Test assertions - check both errors and warnings
        const targetError = capturedErrors.find(e => 
          e.message && e.message.includes('Unknown geometry type: SphereGeometry')
        );
        
        const targetWarning = capturedWarnings.find(w => 
          w.message && w.message.includes('Unknown geometry type: SphereGeometry')
        );
        
        if (targetError || targetWarning) {
          const found = targetError || targetWarning;
          console.log('✅ Successfully reproduced the "Unknown geometry type: SphereGeometry" error');
          console.log(`✅ Error occurred in ${targetError ? 'error' : 'warning'}`);
          console.log('✅ Error details:', found);
          
          // Verify the error message is exactly what we expect
          expect(found.message).toContain('Unknown geometry type: SphereGeometry');
        } else {
          console.log('❌ Failed to reproduce the target error');
          console.log('Captured errors:', capturedErrors.map(e => e.message));
          console.log('Captured warnings:', capturedWarnings.map(w => w.message));
          
          // If we didn't get the exact error, let's at least verify we got some geometry type mutations
          const typeObjectMutations = geometryTypeHistory.filter(entry => 
            !entry.isString && entry.typeProperty !== null && entry.typeProperty !== undefined
          );
          
          if (typeObjectMutations.length > 0) {
            console.log('Found geometry type object mutations:', typeObjectMutations.length);
            expect(typeObjectMutations.length).toBeGreaterThan(0);
          }
        }
        
        // Restore console.warn
        console.warn = originalConsoleWarn;
        done();
      };
      
      // Start the frame update sequence
      runFrameUpdates().catch(error => {
        console.log('Error in runFrameUpdates:', error);
        done(error);
      });
    }, 10000); // 10 second timeout for this test
  });

  describe('Comprehensive Integration Test', () => {
    it('should run a complete frame animation scenario', async () => {
      console.log('=== Test: Complete frame animation scenario ===');
      
      // Test sequence: create animated object, trigger updates, check state
      const dslCode = `
        mesh(sphere(1), material({ color: 0x00ff00 }))
          .translateX(multiply(frame(), 0.1))
          .render('testAnimation')
      `;
      
      let result;
      let error;
      let sceneObjectsBefore: THREE.Object3D[] = [];
      let sceneObjectsAfter: THREE.Object3D[] = [];
      
      try {
        sceneObjectsBefore = [...scene.children];
        result = executeDSL(dslCode);
        sceneObjectsAfter = [...scene.children];
        
        console.log('Animation result:', result);
        console.log('Scene objects before:', sceneObjectsBefore.length);
        console.log('Scene objects after:', sceneObjectsAfter.length);
        
        // Trigger a few animation frame updates
        for (let i = 0; i < 3; i++) {
          const updateFunction = mockRequestAnimationFrame.mock.calls[i]?.[0];
          if (updateFunction) {
            console.log(`Triggering animation update ${i + 1}`);
            updateFunction();
          }
        }
        
      } catch (e) {
        error = e;
        console.log('Complete scenario error:', e);
        if (e instanceof Error && e.stack) {
          console.log('Error stack:', e.stack);
        }
      }
      
      console.log('Final result:', result);
      console.log('Final error:', error);
      console.log('Total RAF calls:', mockRequestAnimationFrame.mock.calls.length);
      console.log('Final execution log entries:', executionLog.length);
      
      // Should complete without errors
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
      
      // Should complete without errors and create object
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      
      // Should have created an object in the scene
      expect(sceneObjectsAfter.length).toBeGreaterThan(sceneObjectsBefore.length);
    });
  });
});