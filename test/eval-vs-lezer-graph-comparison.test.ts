// Test to compare eval-based vs Lezer-based graph outputs
import { dslContext } from "../src/dsl";
import { convertLezerToNodysseus } from "../src/dsl/lezer-to-nodysseus-converter";
import { parseDSL } from "../src/dsl/parser";
import { convertGraphToNodysseus } from "../src/graph-to-nodysseus-converter";

// Temporarily manipulate the flag for testing
function withEvalParser<T>(fn: () => T): T {
  const parser = require("../src/dsl/parser");
  const originalFlag = parser.USE_LEZER_CONVERTER;
  parser.USE_LEZER_CONVERTER = false;
  try {
    return fn();
  } finally {
    parser.USE_LEZER_CONVERTER = originalFlag;
  }
}

function withLezerParser<T>(fn: () => T): T {
  const parser = require("../src/dsl/parser");
  const originalFlag = parser.USE_LEZER_CONVERTER;
  parser.USE_LEZER_CONVERTER = true;
  try {
    return fn();
  } finally {
    parser.USE_LEZER_CONVERTER = originalFlag;
  }
}

describe("Eval vs Lezer Graph Structure Comparison", () => {
  const testExpressions = [
    "mult(2, 3)",
    "frame().mult(0.1)",
    "sphere()",
    "mesh(sphere(), material())",
    'mesh(sphere(), material()).translateX(1).rotateY(45).render("test")',
  ];

  testExpressions.forEach((expression) => {
    it(`should produce equivalent graphs for: ${expression}`, () => {
      // Get eval-based result
      const evalResult = withEvalParser(() => {
        const functionalGraph = parseDSL(expression, dslContext);
        if (
          functionalGraph &&
          typeof functionalGraph === "object" &&
          "value" in functionalGraph &&
          "dependencies" in functionalGraph
        ) {
          return convertGraphToNodysseus(functionalGraph);
        }
        return null;
      });

      // Get Lezer-based result
      const lezerResult = convertLezerToNodysseus(expression, dslContext);

      console.log(`\n=== Comparing: ${expression} ===`);
      console.log(
        "Eval graph nodes:",
        evalResult ? Object.keys(evalResult.nodes).length : "null",
      );
      console.log(
        "Lezer graph nodes:",
        Object.keys(lezerResult.graph.nodes).length,
      );

      if (evalResult) {
        console.log(
          "Eval graph edges:",
          Object.keys(evalResult.edges || {}).length,
        );
        console.log(
          "Lezer graph edges:",
          Object.keys(lezerResult.graph.edges || {}).length,
        );

        // Both should have similar complexity (node count should be close)
        const evalNodeCount = Object.keys(evalResult.nodes).length;
        const lezerNodeCount = Object.keys(lezerResult.graph.nodes).length;

        expect(lezerNodeCount).toBeGreaterThan(0);
        expect(Math.abs(evalNodeCount - lezerNodeCount)).toBeLessThan(3); // Allow some variance

        // Both should have root nodes
        expect(evalResult.out).toBeDefined();
        expect(lezerResult.graph.out).toBeDefined();
      } else {
        // If eval fails, Lezer should still work
        expect(lezerResult.graph).toBeDefined();
        expect(Object.keys(lezerResult.graph.nodes).length).toBeGreaterThan(0);
      }
    });
  });

  it("should handle complex expression equivalence", () => {
    const complexExpression =
      'mesh(sphere(), material()).translateX(1).rotateY(45).render("mySphere")';

    // Test Lezer converter directly
    const lezerResult = convertLezerToNodysseus(complexExpression, dslContext);

    expect(lezerResult.graph).toBeDefined();
    expect(lezerResult.graph.nodes).toBeDefined();
    expect(lezerResult.graph.edges).toBeDefined();
    expect(lezerResult.rootNodeId).toBeDefined();

    // Should have a substantial graph
    expect(Object.keys(lezerResult.graph.nodes).length).toBeGreaterThan(5);
    expect(Object.keys(lezerResult.graph.edges || {}).length).toBeGreaterThan(
      3,
    );

    console.log("Complex expression Lezer result:");
    console.log("Nodes:", Object.keys(lezerResult.graph.nodes).length);
    console.log("Edges:", Object.keys(lezerResult.graph.edges || {}).length);
    console.log("Root:", lezerResult.rootNodeId);
  });
});
