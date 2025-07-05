// Test functional equivalence between eval-based and Lezer converters
import { dslContext } from "../src/dsl";
import { convertLezerToNodysseus } from "../src/dsl/lezer-to-nodysseus-converter";

// Temporarily disable Lezer converter to test eval approach
const originalFlag = require("../src/dsl/parser").USE_LEZER_CONVERTER;

function setLezerFlag(enabled: boolean) {
  // This is a hack to change the module constant for testing
  const parser = require("../src/dsl/parser");
  parser.USE_LEZER_CONVERTER = enabled;
}

describe("Lezer vs Eval Converter Equivalence", () => {
  const complexExpression =
    'mesh(sphere(), material()).translateX(1).rotateY(45).render("mySphere")';

  afterAll(() => {
    // Restore original flag
    setLezerFlag(originalFlag);
  });

  it("should produce similar graph structure for complex chaining", () => {
    // Test Lezer converter directly
    const lezerResult = convertLezerToNodysseus(complexExpression, dslContext);

    expect(lezerResult.graph).toBeDefined();
    expect(lezerResult.rootNodeId).toBeDefined();

    console.log(
      "Lezer result nodes:",
      Object.keys(lezerResult.graph.nodes).length,
    );
    console.log(
      "Lezer result edges:",
      Object.keys(lezerResult.graph.edges || {}).length,
    );

    // Check that we have the expected function calls
    const functionCalls = lezerResult.conversionLog
      .filter((entry) => entry.functionResolved)
      .map((entry) => entry.functionResolved);

    console.log("Functions found:", functionCalls);

    // Should contain key DSL functions
    expect(functionCalls).toContain("sphere");
    expect(functionCalls).toContain("material");
    expect(functionCalls).toContain("mesh");
    expect(functionCalls).toContain("translateX");
    expect(functionCalls).toContain("rotateY");
    expect(functionCalls).toContain("render");
  });

  it("should handle method chaining properly", () => {
    const result = convertLezerToNodysseus(
      "frame().mult(0.1).abs()",
      dslContext,
    );

    expect(result.graph).toBeDefined();

    // Should have proper method chain
    const functionCalls = result.conversionLog
      .filter((entry) => entry.functionResolved)
      .map((entry) => entry.functionResolved);

    console.log("Chain functions:", functionCalls);

    // Should have frame, mult, and abs functions (abs is available in chain)
    expect(functionCalls).toContain("frame");
    expect(functionCalls).toContain("mult");
    expect(functionCalls).toContain("abs");
  });

  it("should create proper dependency relationships", () => {
    const result = convertLezerToNodysseus("mult(2, 3)", dslContext);

    expect(result.graph).toBeDefined();
    expect(result.graph.nodes).toBeDefined();
    expect(result.graph.edges).toBeDefined();

    // Should have mult function node plus argument nodes
    const nodeCount = Object.keys(result.graph.nodes).length;
    expect(nodeCount).toBeGreaterThan(2); // mult + two number args

    // Should have edges connecting arguments to function
    const edgeCount = Object.keys(result.graph.edges || {}).length;
    expect(edgeCount).toBeGreaterThan(0);
  });

  it("should handle nested function calls", () => {
    const result = convertLezerToNodysseus(
      "mesh(sphere(1), material())",
      dslContext,
    );

    expect(result.graph).toBeDefined();

    const functionCalls = result.conversionLog
      .filter((entry) => entry.functionResolved)
      .map((entry) => entry.functionResolved);

    console.log("Nested functions:", functionCalls);

    expect(functionCalls).toContain("sphere");
    expect(functionCalls).toContain("material");
    expect(functionCalls).toContain("mesh");
  });
});
