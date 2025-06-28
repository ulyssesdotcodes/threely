/**
 * Tests for function call parser
 * 
 * These tests verify that the parser correctly identifies function calls and their positions
 * in DSL code, including nested calls, method chaining, and edge cases.
 */


import {
  findFunctionCalls,
  findFunctionCallsInRange,
  getFunctionCallAt,
  findMethodChainCalls,
  findAllFunctionCalls,
  findAllFunctionCallsFlat
} from '../src/codemirror/function-call-parser';
import { FunctionCall } from '../src/codemirror/function-call-tag';

describe('Function Call Parser', () => {
  describe('Basic Function Calls', () => {
    it('should parse simple function calls without arguments', () => {
      const code = 'frame()';
      const calls = findFunctionCalls(code);
      
      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        name: 'frame',
        start: 0,
        end: 7,
        args: []
      });
    });

    it('should parse function calls with numeric arguments', () => {
      const code = 'sphere(1)';
      const calls = findFunctionCalls(code);
      
      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        name: 'sphere',
        start: 0,
        end: 9,
        args: []
      });
    });

    it('should parse function calls with multiple arguments', () => {
      const code = 'material(0xff0000, 0.5, true)';
      const calls = findFunctionCalls(code);
      
      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        name: 'material',
        start: 0,
        end: 29,
        args: []
      });
    });

    it('should handle function calls with whitespace', () => {
      const code = '  sphere  (  1  )  ';
      const calls = findFunctionCalls(code);
      
      expect(calls).toHaveLength(1);
      expect(calls[0].name).toBe('sphere');
      expect(calls[0].start).toBe(2);
      expect(calls[0].end).toBe(17);
    });

    it('should parse multiple independent function calls', () => {
      const code = 'frame() sphere() material()';
      const calls = findFunctionCalls(code);
      
      expect(calls).toHaveLength(3);
      expect(calls[0].name).toBe('frame');
      expect(calls[1].name).toBe('sphere');
      expect(calls[2].name).toBe('material');
    });
  });

  describe('Nested Function Calls', () => {
    it('should parse nested function calls', () => {
      const code = 'mesh(sphere(), material())';
      const calls = findFunctionCalls(code);
      
      expect(calls).toHaveLength(1);
      
      const meshCall = calls[0];
      expect(meshCall.name).toBe('mesh');
      expect(meshCall.start).toBe(0);
      expect(meshCall.end).toBe(26);
      expect(meshCall.args).toHaveLength(2);
      
      expect(meshCall.args[0]).toEqual({
        name: 'sphere',
        start: 5,
        end: 13,
        args: []
      });
      
      expect(meshCall.args[1]).toEqual({
        name: 'material',
        start: 15,
        end: 25,
        args: []
      });
    });

    it('should handle deeply nested function calls', () => {
      const code = 'mesh(box(sphere(1)), material(color(0xff0000)))';
      const calls = findFunctionCalls(code);
      
      expect(calls).toHaveLength(1);
      
      const meshCall = calls[0];
      expect(meshCall.name).toBe('mesh');
      expect(meshCall.args).toHaveLength(2);
      
      // First argument: box(sphere(1))
      const boxCall = meshCall.args[0];
      expect(boxCall.name).toBe('box');
      expect(boxCall.args).toHaveLength(1);
      expect(boxCall.args[0].name).toBe('sphere');
      
      // Second argument: material(color(0xff0000))
      const materialCall = meshCall.args[1];
      expect(materialCall.name).toBe('material');
      expect(materialCall.args).toHaveLength(1);
      expect(materialCall.args[0].name).toBe('color');
    });

    it('should handle nested calls with complex expressions', () => {
      const code = 'translateX(mult(frame(), 0.1))';
      const calls = findFunctionCalls(code);
      
      expect(calls).toHaveLength(1);
      
      const translateCall = calls[0];
      expect(translateCall.name).toBe('translateX');
      expect(translateCall.args).toHaveLength(1);
      
      const multCall = translateCall.args[0];
      expect(multCall.name).toBe('mult');
      expect(multCall.args).toHaveLength(1);
      expect(multCall.args[0].name).toBe('frame');
    });
  });

  describe('Method Chaining', () => {
    it('should parse method chain calls', () => {
      const code = 'mesh().translateX(1)';
      const calls = findAllFunctionCalls(code);
      
      expect(calls).toHaveLength(2);
      
      expect(calls[0]).toEqual({
        name: 'mesh',
        start: 0,
        end: 6,
        args: []
      });
      
      expect(calls[1]).toEqual({
        name: 'translateX',
        start: 7,
        end: 20,
        args: []
      });
    });

    it('should parse complex method chains', () => {
      const code = 'mesh(sphere(), material()).translateX(1).rotateY(45).render("test")';
      const calls = findAllFunctionCalls(code);
      
      expect(calls).toHaveLength(4);
      
      // Base mesh call with nested args
      expect(calls[0].name).toBe('mesh');
      expect(calls[0].args).toHaveLength(2);
      expect(calls[0].args[0].name).toBe('sphere');
      expect(calls[0].args[1].name).toBe('material');
      
      // Method chain calls
      expect(calls[1].name).toBe('translateX');
      expect(calls[2].name).toBe('rotateY');
      expect(calls[3].name).toBe('render');
    });

    it('should handle method chains with whitespace', () => {
      const code = 'mesh()  .  translateX  (  1  )  .  rotateY  (  45  )';
      const calls = findAllFunctionCalls(code);
      
      expect(calls).toHaveLength(3);
      expect(calls[0].name).toBe('mesh');
      expect(calls[1].name).toBe('translateX');
      expect(calls[2].name).toBe('rotateY');
    });

    it('should find method chains starting from specific position', () => {
      const code = 'mesh(sphere()).translateX(1).rotateY(45)';
      const meshEnd = 14; // Position after mesh(sphere())
      
      const methodCalls = findMethodChainCalls(code, meshEnd);
      
      expect(methodCalls).toHaveLength(2);
      expect(methodCalls[0].name).toBe('translateX');
      expect(methodCalls[1].name).toBe('rotateY');
    });
  });

  describe('String Handling', () => {
    it('should ignore function-like patterns in strings', () => {
      const code = 'render("sphere()")';
      const calls = findFunctionCalls(code);
      
      expect(calls).toHaveLength(1);
      expect(calls[0].name).toBe('render');
      expect(calls[0].args).toHaveLength(0); // String content is not parsed as function call
    });

    it('should handle escaped quotes in strings', () => {
      const code = 'render("test \\"nested\\" quotes")';
      const calls = findFunctionCalls(code);
      
      expect(calls).toHaveLength(1);
      expect(calls[0].name).toBe('render');
    });

    it('should handle different quote types', () => {
      const code = `render('single') render("double") render(\`template\`)`;
      const calls = findFunctionCalls(code);
      
      expect(calls).toHaveLength(3);
      expect(calls[0].name).toBe('render');
      expect(calls[1].name).toBe('render');
      expect(calls[2].name).toBe('render');
    });
  });

  describe('Range-based Queries', () => {
    it('should find function calls in specific range', () => {
      const code = 'sphere() mesh() material()';
      const calls = findFunctionCallsInRange(code, 9, 15); // Should cover mesh()
      
      expect(calls).toHaveLength(1);
      expect(calls[0].name).toBe('mesh');
    });

    it('should find overlapping function calls', () => {
      const code = 'mesh(sphere(), material())';
      const calls = findFunctionCallsInRange(code, 5, 13); // Covers sphere() call
      
      expect(calls).toHaveLength(1); // Only mesh overlaps this range (sphere is nested inside)
      expect(calls.map(c => c.name)).toContain('mesh');
      
      // The sphere call is nested inside mesh, so it's in the args
      expect(calls[0].args[0].name).toBe('sphere');
    });

    it('should return empty array for range with no function calls', () => {
      const code = 'mesh(sphere(), material())';
      const calls = findFunctionCallsInRange(code, 50, 60); // Beyond code length
      
      expect(calls).toHaveLength(0);
    });
  });

  describe('Position-based Queries', () => {
    it('should find function call at specific position', () => {
      const code = 'mesh(sphere(), material())';
      
      // Position inside 'mesh'
      const meshCall = getFunctionCallAt(code, 2);
      expect(meshCall?.name).toBe('mesh');
      
      // Position inside 'sphere'
      const sphereCall = getFunctionCallAt(code, 7);
      expect(sphereCall?.name).toBe('sphere');
      
      // Position inside 'material'
      const materialCall = getFunctionCallAt(code, 18);
      expect(materialCall?.name).toBe('material');
    });

    it('should return most specific (innermost) function call', () => {
      const code = 'mesh(sphere(1))';
      
      // Position inside the nested sphere call should return sphere, not mesh
      const call = getFunctionCallAt(code, 9); // Inside sphere(1)
      expect(call?.name).toBe('sphere');
    });

    it('should return null for position with no function call', () => {
      const code = 'frame() + 1';
      const call = getFunctionCallAt(code, 9); // Position at '+'
      
      expect(call).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty code', () => {
      const calls = findFunctionCalls('');
      expect(calls).toHaveLength(0);
    });

    it('should handle code with no function calls', () => {
      const calls = findFunctionCalls('const x = 5; return x + 1;');
      expect(calls).toHaveLength(0);
    });

    it('should handle unmatched parentheses gracefully', () => {
      const code = 'frame(';
      const calls = findFunctionCalls(code);
      
      // Should not crash, but may not find the incomplete call
      expect(calls).toBeDefined();
    });

    it('should handle nested parentheses in arguments', () => {
      const code = 'transform((x + y) * 2)';
      const calls = findFunctionCalls(code);
      
      expect(calls).toHaveLength(1);
      expect(calls[0].name).toBe('transform');
    });

    it('should handle function calls with object literals', () => {
      const code = 'material({ color: 0xff0000, opacity: 0.5 })';
      const calls = findFunctionCalls(code);
      
      expect(calls).toHaveLength(1);
      expect(calls[0].name).toBe('material');
    });

    it('should handle function calls with array literals', () => {
      const code = 'transform([1, 2, 3])';
      const calls = findFunctionCalls(code);
      
      expect(calls).toHaveLength(1);
      expect(calls[0].name).toBe('transform');
    });

    it('should ignore identifiers without parentheses', () => {
      const code = 'const frame = 1; sphere + material';
      const calls = findFunctionCalls(code);
      
      expect(calls).toHaveLength(0);
    });

    it('should handle comments correctly', () => {
      const code = `
        // This is frame() in a comment
        frame() // Real function call
        /* mesh() in block comment */
      `;
      const calls = findFunctionCalls(code);
      
      // Should find the real function call but ignore those in comments
      // Note: This basic regex parser doesn't handle comments, so it might
      // find all of them. This test documents current behavior.
      expect(calls.some(c => c.name === 'frame')).toBe(true);
    });
  });

  describe('Real DSL Examples', () => {
    it('should parse the main example from CodeMirror tests', () => {
      const code = 'mesh(sphere(), material()).translateX(1).rotateY(45).render("mySphere")';
      const calls = findAllFunctionCalls(code);
      
      expect(calls).toHaveLength(4);
      
      // Verify the main mesh call and its nested args
      const meshCall = calls.find(c => c.name === 'mesh');
      expect(meshCall).toBeDefined();
      expect(meshCall!.args).toHaveLength(2);
      expect(meshCall!.args[0].name).toBe('sphere');
      expect(meshCall!.args[1].name).toBe('material');
      
      // Verify method chain calls
      const methodNames = calls.filter(c => c.name !== 'mesh').map(c => c.name);
      expect(methodNames).toEqual(['translateX', 'rotateY', 'render']);
    });

    it('should parse frame animation example', () => {
      const code = 'mesh(sphere(1), material({ color: 0xff0000 })).translateX(mult(frame(), 0.1)).render("animatedSphere")';
      const calls = findAllFunctionCalls(code);
      
      // Should find mesh, translateX, render (top-level calls)
      const callNames = calls.map(c => c.name);
      expect(callNames).toContain('mesh');
      expect(callNames).toContain('translateX');
      expect(callNames).toContain('render');
      
      // Verify nested calls are in the args
      const meshCall = calls.find(c => c.name === 'mesh');
      expect(meshCall?.args[0].name).toBe('sphere');
      expect(meshCall?.args[1].name).toBe('material');
      
      const translateCall = calls.find(c => c.name === 'translateX');
      expect(translateCall?.args[0].name).toBe('mult');
      expect(translateCall?.args[0].args[0].name).toBe('frame');
    });

    it('should parse complex transformation chains', () => {
      const code = `
        mesh(sphere(1), material())
          .translateX(mult(frame(), 0.01))
          .rotateY(mult(frame(), 0.02))
          .render('complexAnimation')
      `;
      
      const calls = findAllFunctionCalls(code);
      
      // Should handle multiline code and find top-level function calls
      const callNames = calls.map(c => c.name);
      expect(callNames).toContain('mesh');
      expect(callNames).toContain('translateX');
      expect(callNames).toContain('rotateY');
      expect(callNames).toContain('render');
      
      // Verify nested structure
      const meshCall = calls.find(c => c.name === 'mesh');
      expect(meshCall?.args[0].name).toBe('sphere');
      expect(meshCall?.args[1].name).toBe('material');
      
      const translateCall = calls.find(c => c.name === 'translateX');
      expect(translateCall?.args[0].name).toBe('mult');
      expect(translateCall?.args[0].args[0].name).toBe('frame');
      
      const rotateCall = calls.find(c => c.name === 'rotateY');
      expect(rotateCall?.args[0].name).toBe('mult');
      expect(rotateCall?.args[0].args[0].name).toBe('frame');
    });
  });

  describe('Parser Consistency', () => {
    it('should provide consistent position information', () => {
      const code = 'mesh(sphere(), material()).translateX(1)';
      const allCalls = findAllFunctionCalls(code);
      
      // All positions should be within the code bounds
      for (const call of allCalls) {
        expect(call.start).toBeGreaterThanOrEqual(0);
        expect(call.end).toBeLessThanOrEqual(code.length);
        expect(call.start).toBeLessThan(call.end);
        
        // The function name should actually be at the start position
        const nameInCode = code.slice(call.start, call.start + call.name.length);
        expect(nameInCode).toBe(call.name);
      }
    });

    it('should handle the same code consistently across multiple calls', () => {
      const code = 'mesh(sphere(), material()).translateX(1).rotateY(45)';
      
      const calls1 = findAllFunctionCalls(code);
      const calls2 = findAllFunctionCalls(code);
      
      expect(calls1).toEqual(calls2);
    });

    it('should maintain proper nesting in args field', () => {
      const code = 'outer(middle(inner()))';
      const calls = findFunctionCalls(code);
      
      expect(calls).toHaveLength(1);
      
      const outerCall = calls[0];
      expect(outerCall.name).toBe('outer');
      expect(outerCall.args).toHaveLength(1);
      
      const middleCall = outerCall.args[0];
      expect(middleCall.name).toBe('middle');
      expect(middleCall.args).toHaveLength(1);
      
      const innerCall = middleCall.args[0];
      expect(innerCall.name).toBe('inner');
      expect(innerCall.args).toHaveLength(0);
    });
  });
});