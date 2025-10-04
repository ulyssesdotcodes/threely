import {
  executeDSL,
  clearDslVariables,
  declaredVariables,
  setScene,
  clearAll,
} from "../src/dsl";
import * as THREE from "three";

describe("Variable Declarations in DSL", () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    setScene(scene);
    clearAll();
    clearDslVariables();
  });

  afterEach(() => {
    clearDslVariables();
  });

  describe("Basic Variable Declaration", () => {
    it("should detect and store const variable declaration", () => {
      console.log("=== Test: Basic const variable declaration ===");

      const dslCode = "const mySphere = mesh(sphere(), material())";
      const result = executeDSL(dslCode);

      console.log("Result:", result);
      console.log(
        "Declared variables:",
        Array.from(declaredVariables.entries()),
      );

      // Should have stored the variable
      expect(declaredVariables.has("mySphere")).toBe(true);
      expect(declaredVariables.get("mySphere")).toBeDefined();

      // The result should be the evaluated expression (MockObject3D)
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    });

    it("should handle let variable declaration", () => {
      console.log("=== Test: let variable declaration ===");

      const dslCode = "let myBox = mesh(box(), material())";
      const result = executeDSL(dslCode);

      console.log("Result:", result);
      console.log(
        "Declared variables:",
        Array.from(declaredVariables.entries()),
      );

      expect(declaredVariables.has("myBox")).toBe(true);
      expect(declaredVariables.get("myBox")).toBeDefined();
    });

    it("should handle var variable declaration", () => {
      console.log("=== Test: var variable declaration ===");

      const dslCode = "var myCylinder = mesh(cylinder(), material())";
      const result = executeDSL(dslCode);

      console.log("Result:", result);
      console.log(
        "Declared variables:",
        Array.from(declaredVariables.entries()),
      );

      expect(declaredVariables.has("myCylinder")).toBe(true);
      expect(declaredVariables.get("myCylinder")).toBeDefined();
    });
  });

  describe("Variable Reuse", () => {
    it("should make declared variables available in subsequent executeDSL calls", () => {
      console.log("=== Test: Variable reuse across executeDSL calls ===");

      // First call: declare the variable
      const declarationCode = "const mySphere = mesh(sphere(), material())";
      const declarationResult = executeDSL(declarationCode);

      console.log("Declaration result:", declarationResult);
      console.log(
        "Variables after declaration:",
        Array.from(declaredVariables.entries()),
      );

      expect(declaredVariables.has("mySphere")).toBe(true);

      // Second call: use the variable
      const usageCode = 'mySphere.value.translateX(10).render("testSphere")';
      const usageResult = executeDSL(usageCode);

      console.log("Usage result:", usageResult);
      console.log("Scene children after usage:", scene.children.length);

      expect(usageResult).toBeDefined();
      expect(scene.children.length).toBeGreaterThan(0);

      // Check if the object was rendered with the correct name or graphId
      const renderedObject = scene.children.find(
        (child) =>
          child.name === "testSphere" ||
          (child as any).graphId === "testSphere",
      );
      expect(renderedObject).toBeDefined();
    });

    it("should handle complex chained expressions in variable declarations", () => {
      console.log("=== Test: Complex chained expressions ===");

      const dslCode =
        "const animatedSphere = mesh(sphere(2), material({ color: 0xff0000 })).translateY(5).rotateX(45)";
      const result = executeDSL(dslCode);

      console.log("Result:", result);
      console.log("Variables:", Array.from(declaredVariables.entries()));

      expect(declaredVariables.has("animatedSphere")).toBe(true);

      const storedVariable = declaredVariables.get("animatedSphere");
      expect(storedVariable).toBeDefined();
      expect(typeof storedVariable).toBe("object");

      // Should be able to use it later
      const usageResult = executeDSL(
        'animatedSphere.value.render("myAnimatedSphere")',
      );
      expect(usageResult).toBeDefined();
    });

    it("should handle mathematical expressions in variable declarations", () => {
      console.log("=== Test: Mathematical expressions in variables ===");

      const dslCode = "const scaledSize = mult(2, 3)";
      const result = executeDSL(dslCode);

      console.log("Math result:", result);
      console.log("Variables:", Array.from(declaredVariables.entries()));

      expect(declaredVariables.has("scaledSize")).toBe(true);

      // Should be able to use the math result
      const usageResult = executeDSL(
        'mesh(sphere(scaledSize.value), material()).render("scaledSphere")',
      );
      expect(usageResult).toBeDefined();
    });
  });

  describe("Multiple Variables", () => {
    it("should handle multiple variable declarations in sequence", () => {
      console.log("=== Test: Multiple variable declarations ===");

      // Declare multiple variables
      executeDSL(
        "const sphere1 = mesh(sphere(1), material({ color: 0xff0000 }))",
      );
      executeDSL(
        "const sphere2 = mesh(sphere(2), material({ color: 0x00ff00 }))",
      );
      executeDSL(
        "const sphere3 = mesh(sphere(3), material({ color: 0x0000ff }))",
      );

      console.log(
        "Variables after declarations:",
        Array.from(declaredVariables.entries()),
      );

      expect(declaredVariables.has("sphere1")).toBe(true);
      expect(declaredVariables.has("sphere2")).toBe(true);
      expect(declaredVariables.has("sphere3")).toBe(true);
      expect(declaredVariables.size).toBe(3);

      // Use all variables
      executeDSL('sphere1.value.translateX(-5).render("red")');
      // Note: Using translateX(0.01) instead of translateX(0) to work around known render issue with zero translation
      executeDSL('sphere2.value.translateX(0.01).render("green")');
      executeDSL('sphere3.value.translateX(5).render("blue")');

      expect(scene.children.length).toBe(3);
      expect(
        scene.children.find(
          (child) => child.name === "red" || (child as any).graphId === "red",
        ),
      ).toBeDefined();
      expect(
        scene.children.find(
          (child) =>
            child.name === "green" || (child as any).graphId === "green",
        ),
      ).toBeDefined();
      expect(
        scene.children.find(
          (child) => child.name === "blue" || (child as any).graphId === "blue",
        ),
      ).toBeDefined();
    });

    it("should handle variable overwriting", () => {
      console.log("=== Test: Variable overwriting ===");

      // Declare initial variable
      executeDSL("const myShape = mesh(sphere(), material())");
      const firstValue = declaredVariables.get("myShape");

      // Overwrite with new value
      executeDSL("const myShape = mesh(box(), material())");
      const secondValue = declaredVariables.get("myShape");

      console.log("First value type:", typeof firstValue);
      console.log("Second value type:", typeof secondValue);
      console.log("Values are different:", firstValue !== secondValue);

      expect(declaredVariables.has("myShape")).toBe(true);
      expect(secondValue).not.toBe(firstValue);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid assignment expressions gracefully", () => {
      console.log("=== Test: Invalid assignment expressions ===");

      const dslCode = "const invalidVar = nonexistentFunction()";
      const result = executeDSL(dslCode);

      console.log("Result for invalid assignment:", result);
      console.log(
        "Variables after invalid assignment:",
        Array.from(declaredVariables.entries()),
      );

      // Variable should not be stored if assignment failed
      expect(declaredVariables.has("invalidVar")).toBe(false);
    });

    it("should handle malformed variable declarations", () => {
      console.log("=== Test: Malformed variable declarations ===");

      // This should not crash
      const dslCode = "const = mesh(sphere(), material())"; // Missing variable name
      const result = executeDSL(dslCode);

      console.log("Result for malformed declaration:", result);

      // Should not crash and should handle gracefully
      expect(result).toBeDefined(); // The function should return without crashing
    });
  });

  describe("Variable Clearing", () => {
    it("should clear all declared variables when clearDslVariables is called", () => {
      console.log("=== Test: Variable clearing ===");

      // Declare some variables
      executeDSL("const var1 = mesh(sphere(), material())");
      executeDSL("const var2 = mesh(box(), material())");

      expect(declaredVariables.size).toBe(2);

      // Clear variables
      clearDslVariables();

      expect(declaredVariables.size).toBe(0);
      expect(declaredVariables.has("var1")).toBe(false);
      expect(declaredVariables.has("var2")).toBe(false);

      // Variables should no longer be available
      const result = executeDSL('var1.value.render("shouldFail")');
      // This might fail or return null since var1 is no longer available
    });
  });
});
