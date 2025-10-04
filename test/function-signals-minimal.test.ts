import { signal, computed } from "@preact/signals";

// Test the core function signal logic independently
describe("Function Signal Logic Tests", () => {
  beforeEach(() => {
    // Clear any global state if needed
  });

  describe("Signal Creation and Update Logic", () => {
    it("should create function signal and computed signal for dependencies", () => {
      console.log("=== Test: Basic signal creation ===");

      // Simulate the function signal creation logic
      const name = "slow_frame";
      const dependencies = ["frameVar"];
      const rhsExpression = "frameVar * 0.25"; // Parameter names, not .value access

      // Create mock context with dependencies
      const mockContext: any = {
        frameVar: signal(100),
      };

      // Simulate what executeVariableAssignment does for dependencies
      const functionSignalKey = `${name}_fn`;

      // Create function that takes dependencies as parameters (with DSL context access)
      const functionBody = `return (${dependencies.join(", ")}) => ${rhsExpression}`;
      const computeFunction = new Function(
        ...Object.keys(mockContext),
        functionBody,
      )(...Object.values(mockContext));

      // Create the function signal
      const functionSignal = signal(computeFunction);
      mockContext[functionSignalKey] = functionSignal;

      // Create the computed signal that uses the function signal
      const computedValue = () => {
        const deps = dependencies.map((dep) => mockContext[dep].value);
        return mockContext[functionSignalKey].value(...deps);
      };

      const computedSignal = computed(computedValue);
      mockContext[name] = computedSignal;

      // Test the results
      expect(mockContext.hasOwnProperty("slow_frame")).toBe(true);
      expect(mockContext.hasOwnProperty("slow_frame_fn")).toBe(true);

      // Function signal should contain a function
      expect(typeof functionSignal.value).toBe("function");

      // Test the computation
      expect(functionSignal.value(100)).toBe(25); // 100 * 0.25

      // Computed signal should get the same result
      expect(computedSignal.value).toBe(25);

      console.log("Function signal value:", functionSignal.value(100));
      console.log("Computed signal value:", computedSignal.value);
    });

    it("should update function signal when expression changes", () => {
      console.log("=== Test: Function signal update ===");

      const name = "slow_frame";
      const dependencies = ["frameVar"];
      const mockContext: any = {
        frameVar: signal(100),
      };

      // First expression: * 0.25
      let rhsExpression = "frameVar * 0.25";
      let functionBody = `return (${dependencies.join(", ")}) => ${rhsExpression}`;
      let computeFunction = new Function(
        ...Object.keys(mockContext),
        functionBody,
      )(...Object.values(mockContext));

      const functionSignalKey = `${name}_fn`;
      const functionSignal = signal(computeFunction);
      mockContext[functionSignalKey] = functionSignal;

      // Test first function
      expect(functionSignal.value(100)).toBe(25);

      // Update to new expression: * 0.5
      rhsExpression = "frameVar * 0.5";
      functionBody = `return (${dependencies.join(", ")}) => ${rhsExpression}`;
      computeFunction = new Function(...Object.keys(mockContext), functionBody)(
        ...Object.values(mockContext),
      );

      // Update the existing signal (simulate re-execution)
      functionSignal.value = computeFunction;

      // Test updated function
      expect(functionSignal.value(100)).toBe(50);

      console.log("Updated function signal value:", functionSignal.value(100));
    });

    it("should handle multiple dependencies", () => {
      console.log("=== Test: Multiple dependencies ===");

      const name = "complexVar";
      const dependencies = ["frameVar", "scaleVar"];
      const rhsExpression = "frameVar * scaleVar + 10";

      const mockContext: any = {
        frameVar: signal(20),
        scaleVar: signal(2),
      };

      // Create function with multiple parameters
      const functionBody = `return (${dependencies.join(", ")}) => ${rhsExpression}`;
      const computeFunction = new Function(
        ...Object.keys(mockContext),
        functionBody,
      )(...Object.values(mockContext));

      const functionSignal = signal(computeFunction);

      // Test multiple parameter function
      expect(functionSignal.value(20, 2)).toBe(50); // 20 * 2 + 10

      console.log("Multi-dependency result:", functionSignal.value(20, 2));
    });

    it("should work with complex mathematical expressions", () => {
      console.log("=== Test: Complex expressions ===");

      const dependencies = ["frameVar", "scaleVar"];
      const rhsExpression = "Math.sin(frameVar * 0.1) * scaleVar";

      // Mock context needs Math for the expression to work
      const mockContext = { Math };
      const functionBody = `return (${dependencies.join(", ")}) => ${rhsExpression}`;
      const computeFunction = new Function(
        ...Object.keys(mockContext),
        functionBody,
      )(...Object.values(mockContext));

      const functionSignal = signal(computeFunction);

      // Test complex computation
      const testFrame = Math.PI * 5; // sin(0.5π) = 1
      const testScale = 3;
      const expectedResult = Math.sin(testFrame * 0.1) * testScale;
      const actualResult = functionSignal.value(testFrame, testScale);

      expect(actualResult).toBeCloseTo(expectedResult, 10);

      console.log("Complex expression result:", actualResult);
    });
  });

  describe("Error Handling", () => {
    it("should handle function creation errors gracefully", () => {
      console.log("=== Test: Error handling ===");

      const dependencies = ["frameVar"];
      const badExpression = "frameVar.nonexistentMethod()";

      let functionSignal;
      let error;

      try {
        const mockContext = {};
        const functionBody = `return (${dependencies.join(", ")}) => ${badExpression}`;
        const computeFunction = new Function(
          ...Object.keys(mockContext),
          functionBody,
        )(...Object.values(mockContext));
        functionSignal = signal(computeFunction);
      } catch (e) {
        error = e;
      }

      // Function creation should succeed (error happens at execution time)
      expect(functionSignal).toBeDefined();
      expect(error).toBeUndefined();

      // But function execution should fail
      let executionError;
      try {
        const mockFrame = { value: 42 };
        functionSignal.value(mockFrame);
      } catch (e) {
        executionError = e;
      }

      expect(executionError).toBeDefined();

      console.log("Execution error:", executionError?.message);
    });
  });

  describe("Reactivity Chain", () => {
    it("should create proper reactivity with computed signals", () => {
      console.log("=== Test: Reactivity chain ===");

      // Create base signal
      const baseSignal = signal(10);

      // Create function signal for derived1
      const derived1FnSignal = signal((base) => base * 2);

      // Create computed signal that uses function signal
      const derived1Computed = computed(() => {
        return derived1FnSignal.value(baseSignal.value);
      });

      // Initial values
      expect(derived1Computed.value).toBe(20); // 10 * 2

      // Update base signal
      baseSignal.value = 15;

      // Computed should auto-update
      expect(derived1Computed.value).toBe(30); // 15 * 2

      // Update function signal
      derived1FnSignal.value = (base) => base * 3;

      // Computed should reflect function change
      expect(derived1Computed.value).toBe(45); // 15 * 3

      console.log("Final computed value:", derived1Computed.value);
    });
  });
});
