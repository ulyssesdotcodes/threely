import { signal, computed } from "@preact/signals";

// Direct imports to avoid Three.js issues
import { parseDSL, executeDSL, dslContext } from "../src/dsl/parser";
import { clearDslVariables, declaredVariables } from "../src/dsl/parser";

describe("Function Signals for Variable Dependencies", () => {
  let mockContext: any;

  beforeEach(() => {
    clearDslVariables();
    // Create a minimal DSL context for testing
    mockContext = {
      frame: () => ({ value: 42 }), // Mock frame function
      Math,
      console,
    };
  });

  afterEach(() => {
    clearDslVariables();
  });

  describe("Basic Function Signal Creation", () => {
    it("should create function signal for variables with dependencies", () => {
      console.log("=== Test: Function signal creation ===");

      // First create a frame variable (dependency)
      mockContext.frameVar = signal(42);

      // Now create a variable that depends on frameVar
      const dslCode = "const slow_frame = frameVar.value * 0.25";
      const result = parseDSL(dslCode, mockContext);

      console.log("Result:", result);
      console.log(
        "Mock context keys:",
        Object.keys(mockContext).filter((key) => key.includes("slow_frame")),
      );

      // Should have both the variable and its function signal in context
      expect(mockContext.hasOwnProperty("slow_frame")).toBe(true);
      expect(mockContext.hasOwnProperty("slow_frame_fn")).toBe(true);

      // Function signal should be a signal
      const functionSignal = mockContext["slow_frame_fn"];
      expect(functionSignal).toBeDefined();
      expect(typeof functionSignal).toBe("object");
      expect("value" in functionSignal).toBe(true);
      expect("peek" in functionSignal).toBe(true);

      // The function signal value should be a function
      expect(typeof functionSignal.value).toBe("function");

      // Test the function works
      expect(functionSignal.value(42)).toBe(10.5); // 42 * 0.25
    });

    it("should create computed signal that uses function signal", () => {
      console.log("=== Test: Computed signal creation ===");

      // Create frame dependency
      executeDSL("const frameVar = frame()");

      // Create dependent variable
      executeDSL("const slow_frame = frameVar.value * 0.25");

      const slowFrameVariable = declaredVariables.get("slow_frame");
      const functionSignal = dslContext["slow_frame_fn"];

      expect(slowFrameVariable).toBeDefined();
      expect(typeof slowFrameVariable).toBe("object");

      // Should be a computed signal (has peek but value is getter)
      expect("value" in slowFrameVariable).toBe(true);
      expect("peek" in slowFrameVariable).toBe(true);

      // Test that the computed uses the function signal
      const frameValue = 10;
      const expectedResult = frameValue * 0.25;

      // Manually call the function signal to verify computation
      const computedResult = functionSignal.value(frameValue);
      expect(computedResult).toBe(expectedResult);
    });

    it("should not create function signals for variables without dependencies", () => {
      console.log("=== Test: No function signal for independent variables ===");

      const dslCode = "const simpleVar = 42";
      executeDSL(dslCode);

      // Should have the variable but no function signal
      expect(declaredVariables.has("simpleVar")).toBe(true);
      expect(dslContext.hasOwnProperty("simpleVar_fn")).toBe(false);

      const simpleVariable = declaredVariables.get("simpleVar");
      expect(typeof simpleVariable.value).toBe("number");
      expect(simpleVariable.value).toBe(42);
    });
  });

  describe("Function Signal Updates on Re-execution", () => {
    it("should update function signal when variable is re-declared", () => {
      console.log("=== Test: Function signal update on re-execution ===");

      // Create frame dependency
      executeDSL("const frameVar = frame()");

      // First execution: create slow_frame with 0.25 multiplier
      executeDSL("const slow_frame = frameVar.value * 0.25");

      const firstFunctionSignal = dslContext["slow_frame_fn"];
      const firstFunction = firstFunctionSignal.value;

      // Test first function
      expect(firstFunction(100)).toBe(25); // 100 * 0.25

      // Second execution: update slow_frame with 0.125 multiplier
      executeDSL("const slow_frame = frameVar.value * 0.125");

      const secondFunctionSignal = dslContext["slow_frame_fn"];
      const secondFunction = secondFunctionSignal.value;

      // Should be the same signal object (reused)
      expect(secondFunctionSignal).toBe(firstFunctionSignal);

      // But the function should be updated
      expect(secondFunction).not.toBe(firstFunction);
      expect(secondFunction(100)).toBe(12.5); // 100 * 0.125

      console.log("First function result:", firstFunction(100));
      console.log("Second function result:", secondFunction(100));
    });

    it("should maintain computed signal reactivity across updates", () => {
      console.log("=== Test: Computed signal reactivity ===");

      // Create frame dependency
      executeDSL("const frameVar = frame()");

      // Create dependent variable
      executeDSL("const slow_frame = frameVar.value * 0.25");

      const slowFrameComputed = declaredVariables.get("slow_frame");
      const originalComputed = slowFrameComputed;

      // Update the function signal
      executeDSL("const slow_frame = frameVar.value * 0.5");

      const updatedSlowFrameComputed = declaredVariables.get("slow_frame");

      // The computed signal should be the same object (preserved)
      expect(updatedSlowFrameComputed).toBe(originalComputed);

      // But it should now use the updated function
      const functionSignal = dslContext["slow_frame_fn"];
      expect(typeof functionSignal.value).toBe("function");
    });
  });

  describe("Multiple Dependencies", () => {
    it("should handle variables with multiple dependencies", () => {
      console.log("=== Test: Multiple dependencies ===");

      // Create multiple dependencies
      executeDSL("const frameVar = frame()");
      executeDSL("const scaleVar = 0.5");

      // Create variable that depends on both
      executeDSL("const complexVar = frameVar.value * scaleVar.value + 10");

      // Should create function signal
      expect(dslContext.hasOwnProperty("complexVar_fn")).toBe(true);

      const functionSignal = dslContext["complexVar_fn"];
      expect(typeof functionSignal.value).toBe("function");

      // Function should take multiple parameters
      const testResult = functionSignal.value(20, 2); // frameVar=20, scaleVar=2
      expect(testResult).toBe(50); // 20 * 2 + 10
    });

    it("should update function with changed dependencies", () => {
      console.log("=== Test: Changed dependencies ===");

      // Create dependencies
      executeDSL("const frameVar = frame()");
      executeDSL("const scaleVar = 0.5");

      // Create dependent variable
      executeDSL("const complexVar = frameVar.value * scaleVar.value");

      const originalFunction = dslContext["complexVar_fn"].value;

      // Update to use different expression
      executeDSL("const complexVar = frameVar.value + scaleVar.value");

      const updatedFunction = dslContext["complexVar_fn"].value;

      // Functions should be different
      expect(updatedFunction).not.toBe(originalFunction);

      // Test the new computation
      expect(originalFunction(10, 2)).toBe(20); // 10 * 2
      expect(updatedFunction(10, 2)).toBe(12); // 10 + 2
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid RHS expressions gracefully", () => {
      console.log("=== Test: Invalid RHS expression ===");

      executeDSL("const frameVar = frame()");

      // Try to create variable with invalid expression
      const result = executeDSL(
        "const badVar = frameVar.value.nonexistentMethod()",
      );

      // Should not crash
      expect(result).toBeDefined();

      // Function signal should not be created for failed assignments
      expect(dslContext.hasOwnProperty("badVar_fn")).toBe(false);
    });

    it("should handle missing dependencies gracefully", () => {
      console.log("=== Test: Missing dependencies ===");

      // Try to create variable that depends on non-existent variable
      const result = executeDSL(
        "const dependentVar = nonexistentVar.value * 2",
      );

      // Should not crash
      expect(result).toBeDefined();

      // Should not create function signal since dependency resolution failed
      expect(dslContext.hasOwnProperty("dependentVar_fn")).toBe(false);
    });
  });

  describe("Complex Expressions", () => {
    it("should handle complex mathematical expressions", () => {
      console.log("=== Test: Complex mathematical expressions ===");

      executeDSL("const frameVar = frame()");
      executeDSL("const scaleVar = 2");
      executeDSL("const offsetVar = 100");

      // Complex expression with multiple operations
      const complexExpression =
        "const result = Math.sin(frameVar.value * 0.1) * scaleVar.value + offsetVar.value";
      executeDSL(complexExpression);

      const functionSignal = dslContext["result_fn"];
      expect(functionSignal).toBeDefined();
      expect(typeof functionSignal.value).toBe("function");

      // Test the complex computation
      const testFrame = Math.PI * 5; // Should give sin(0.5π) = 1
      const expectedResult = Math.sin(testFrame * 0.1) * 2 + 100;
      const actualResult = functionSignal.value(testFrame, 2, 100);

      expect(actualResult).toBeCloseTo(expectedResult, 10);
    });

    it("should handle nested object property access", () => {
      console.log("=== Test: Nested property access ===");

      // Create a mock object dependency
      executeDSL("const objVar = { nested: { value: 42 } }");

      // Create variable that accesses nested properties
      executeDSL("const nestedAccess = objVar.value.nested.value * 2");

      const functionSignal = dslContext["nestedAccess_fn"];
      expect(functionSignal).toBeDefined();

      // Test with mock object
      const mockObj = { nested: { value: 10 } };
      const result = functionSignal.value(mockObj);
      expect(result).toBe(20);
    });
  });

  describe("Integration with Existing Systems", () => {
    it("should work with frame() calls in complex chains", () => {
      console.log("=== Test: Integration with frame system ===");

      // Create frame-dependent variable
      executeDSL("const frameVar = frame()");
      executeDSL("const animationSpeed = frameVar.value * 0.1");

      // Verify both signals exist
      expect(declaredVariables.has("frameVar")).toBe(true);
      expect(declaredVariables.has("animationSpeed")).toBe(true);
      expect(dslContext.hasOwnProperty("animationSpeed_fn")).toBe(true);

      // Should not create function signal for frameVar (no dependencies)
      expect(dslContext.hasOwnProperty("frameVar_fn")).toBe(false);
    });

    it("should work with 3D object transformations", () => {
      console.log("=== Test: Integration with 3D transformations ===");

      // Create variables for 3D transformations
      executeDSL("const frameVar = frame()");
      executeDSL("const rotationSpeed = frameVar.value * 0.02");
      executeDSL("const translationSpeed = frameVar.value * 0.01");

      // Both dependent variables should have function signals
      expect(dslContext.hasOwnProperty("rotationSpeed_fn")).toBe(true);
      expect(dslContext.hasOwnProperty("translationSpeed_fn")).toBe(true);

      // Test the functions
      const rotationFn = dslContext["rotationSpeed_fn"].value;
      const translationFn = dslContext["translationSpeed_fn"].value;

      expect(rotationFn(50)).toBe(1.0); // 50 * 0.02
      expect(translationFn(50)).toBe(0.5); // 50 * 0.01
    });
  });

  describe("Signal Reactivity Chain", () => {
    it("should create proper reactivity chains with multiple levels", () => {
      console.log("=== Test: Multi-level reactivity chains ===");

      // Create a chain: base -> derived1 -> derived2
      executeDSL("const baseVar = frame()");
      executeDSL("const derived1 = baseVar.value * 2");
      executeDSL("const derived2 = derived1.value + 10");

      // All dependent variables should have function signals
      expect(dslContext.hasOwnProperty("derived1_fn")).toBe(true);
      expect(dslContext.hasOwnProperty("derived2_fn")).toBe(true);

      // Base variable should not have function signal (no dependencies)
      expect(dslContext.hasOwnProperty("baseVar_fn")).toBe(false);

      // Test the computation chain
      const derived1Fn = dslContext["derived1_fn"].value;
      const derived2Fn = dslContext["derived2_fn"].value;

      expect(derived1Fn(5)).toBe(10); // 5 * 2

      // For derived2, we need to pass the computed value of derived1
      const derived1Result = derived1Fn(5);
      expect(derived2Fn(derived1Result)).toBe(20); // 10 + 10
    });

    it("should update entire chains when base changes", () => {
      console.log("=== Test: Chain updates ===");

      // Create chain
      executeDSL("const baseVar = frame()");
      executeDSL("const derived1 = baseVar.value * 2");
      executeDSL("const derived2 = derived1.value + 10");

      const originalDerived1Fn = dslContext["derived1_fn"].value;
      const originalDerived2Fn = dslContext["derived2_fn"].value;

      // Update derived1
      executeDSL("const derived1 = baseVar.value * 3");

      const updatedDerived1Fn = dslContext["derived1_fn"].value;
      const unchangedDerived2Fn = dslContext["derived2_fn"].value;

      // derived1 function should be updated
      expect(updatedDerived1Fn).not.toBe(originalDerived1Fn);
      expect(updatedDerived1Fn(5)).toBe(15); // 5 * 3

      // derived2 function should remain the same (it depends on derived1.value, not the computation)
      expect(unchangedDerived2Fn).toBe(originalDerived2Fn);
    });
  });
});
