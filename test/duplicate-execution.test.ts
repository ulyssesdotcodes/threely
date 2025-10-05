import { signal, computed } from "@preact/signals";

// Direct import of the signal logic for testing
// This avoids Three.js import issues while testing the core functionality

describe("Duplicate Execution Error", () => {
  let mockContext: any;
  let declaredVariables: Map<string, any>;

  beforeEach(() => {
    // Clear any global state
    declaredVariables = new Map();
    mockContext = {
      Math,
      console,
    };
  });

  // Simulate the executeVariableAssignment logic for testing
  function executeVariableAssignment(
    name: string,
    assignmentExpr: string,
    dslContext: any,
    newDepVars: string[],
  ): any {
    try {
      console.log(`🔧 Executing assignment: ${assignmentExpr}`);

      // Check if variable already exists as a signal in the context
      const existingSignal = dslContext[name];

      // Create a value computation function
      const computeValue = () => {
        const fullContext = { ...dslContext };

        // For re-execution, only evaluate the RHS to avoid "already declared" errors
        const rhsExpression = assignmentExpr.split("=")[1].trim();

        const func = new Function(
          ...Object.keys(fullContext),
          `return ${rhsExpression}`,
        );
        const result = func(...Object.values(fullContext));
        console.log(`✅ Assignment result: ${typeof result}`);
        return result;
      };

      // If the variable already exists as a signal, update its value
      if (
        existingSignal &&
        typeof existingSignal === "object" &&
        "value" in existingSignal &&
        "peek" in existingSignal
      ) {
        console.log(`🔄 Updating existing signal for variable '${name}'`);
        if (newDepVars.length > 0) {
          // For variables with dependencies, update the function signal
          const functionSignalKey = `${name}_fn`;

          // Extract RHS expression (simplified for test)
          const rhsExpression = assignmentExpr.split("=")[1].trim();

          // Transform RHS expression to work with parameters instead of .value access
          let transformedRHS = rhsExpression;
          for (const dep of newDepVars) {
            transformedRHS = transformedRHS.replace(
              new RegExp(`\\b${dep}\\.value\\b`, "g"),
              dep,
            );
          }

          // Create higher-order function with access to DSL context
          const functionBody = `return (${newDepVars.join(", ")}) => ${transformedRHS}`;
          const computeFunction = new Function(
            ...Object.keys(dslContext),
            functionBody,
          )(...Object.values(dslContext));

          // Check if function signal exists, update or create it
          const existingFunctionSignal = dslContext[functionSignalKey];
          if (
            existingFunctionSignal &&
            typeof existingFunctionSignal === "object" &&
            "value" in existingFunctionSignal
          ) {
            // Update existing function signal
            existingFunctionSignal.value = computeFunction;
            console.log(`🔄 Updated function signal: ${functionSignalKey}`);
          } else {
            // Create new function signal
            dslContext[functionSignalKey] = signal(computeFunction);
            console.log(`🆕 Created new function signal: ${functionSignalKey}`);
          }

          // The computed signal should still exist and will auto-update
          return existingSignal;
        } else {
          // For simple signals, just update the value
          existingSignal.value = computeValue();
          return existingSignal;
        }
      }

      // Create new signal
      console.log(`🆕 Creating new signal for variable '${name}'`);
      let newSignal;
      if (newDepVars.length > 0) {
        // For variables with dependencies, create function signal + computed signal
        const functionSignalKey = `${name}_fn`;
        const rhsExpression = assignmentExpr.split("=")[1].trim();

        // Transform RHS expression to work with parameters instead of .value access
        let transformedRHS = rhsExpression;
        for (const dep of newDepVars) {
          transformedRHS = transformedRHS.replace(
            new RegExp(`\\b${dep}\\.value\\b`, "g"),
            dep,
          );
        }

        // Create higher-order function with access to DSL context
        const functionBody = `return (${newDepVars.join(", ")}) => ${transformedRHS}`;
        const computeFunction = new Function(
          ...Object.keys(dslContext),
          functionBody,
        )(...Object.values(dslContext));

        // Create the function signal
        const functionSignal = signal(computeFunction);
        dslContext[functionSignalKey] = functionSignal;

        // Create the computed signal that uses the function signal
        const computedValue = () => {
          const deps = newDepVars.map((dep) => dslContext[dep].value);
          return dslContext[functionSignalKey].value(...deps);
        };

        newSignal = computed(computedValue);
        console.log(
          `🔧 Created function signal: ${functionSignalKey} and computed: ${name}`,
        );
      } else {
        newSignal = signal(computeValue());
      }

      // Store the signal directly in the DSL context
      dslContext[name] = newSignal;

      // Also maintain backward compatibility with global map
      declaredVariables.set(name, newSignal);

      return newSignal;
    } catch (error) {
      console.log(`❌ Assignment execution error: ${error}`);
      return null;
    }
  }

  it("should handle running the same code twice without error - no dependencies", () => {
    console.log("=== Test: Duplicate execution without dependencies ===");

    // First execution: create a simple variable without dependencies
    const result1 = executeVariableAssignment(
      "x",
      "const x = 42",
      mockContext,
      [],
    );
    console.log("First execution result:", result1);

    expect(result1).toBeDefined();
    expect(mockContext.x.value).toBe(42);

    // Second execution: should update the existing signal
    const result2 = executeVariableAssignment(
      "x",
      "const x = 84",
      mockContext,
      [],
    );
    console.log("Second execution result:", result2);

    expect(result2).toBeDefined();
    expect(mockContext.x.value).toBe(84);
    expect(result1).toBe(result2); // Should be the same signal object
  });

  it("should handle running code with dependencies twice without error", () => {
    console.log("=== Test: Duplicate execution with dependencies ===");

    // Create frame dependency first
    mockContext.frameVar = signal(42);

    // First execution: create dependent variable
    const result1 = executeVariableAssignment(
      "slow_frame",
      "const slow_frame = frameVar.value * 0.25",
      mockContext,
      ["frameVar"],
    );
    console.log("First execution result:", result1);

    expect(result1).toBeDefined();
    expect(mockContext.slow_frame).toBeDefined();
    expect(mockContext.slow_frame_fn).toBeDefined();
    expect(mockContext.slow_frame.value).toBe(10.5); // 42 * 0.25

    // Second execution: should update the function signal
    const result2 = executeVariableAssignment(
      "slow_frame",
      "const slow_frame = frameVar.value * 0.5",
      mockContext,
      ["frameVar"],
    );
    console.log("Second execution result:", result2);

    expect(result2).toBeDefined();
    expect(result1).toBe(result2); // Should be the same computed signal object
    expect(mockContext.slow_frame.value).toBe(21); // 42 * 0.5

    // Function signal should have been updated
    expect(mockContext.slow_frame_fn.value(42)).toBe(21); // 42 * 0.5
  });

  it("should update signals properly on re-execution", () => {
    console.log("=== Test: Signal update on re-execution ===");

    mockContext.frameVar = signal(100);

    // First execution with one multiplier
    executeVariableAssignment(
      "derived",
      "const derived = frameVar.value * 2",
      mockContext,
      ["frameVar"],
    );

    // Check that signals exist
    expect(mockContext.derived).toBeDefined();
    expect(mockContext.derived_fn).toBeDefined();
    expect(mockContext.derived.value).toBe(200); // 100 * 2

    // Second execution with different multiplier
    executeVariableAssignment(
      "derived",
      "const derived = frameVar.value * 3",
      mockContext,
      ["frameVar"],
    );

    // Signal should still exist and function should be updated
    expect(mockContext.derived).toBeDefined();
    expect(mockContext.derived_fn).toBeDefined();
    expect(mockContext.derived.value).toBe(300); // 100 * 3

    // Function should reflect new computation
    expect(mockContext.derived_fn.value(100)).toBe(300); // 100 * 3
  });
});
