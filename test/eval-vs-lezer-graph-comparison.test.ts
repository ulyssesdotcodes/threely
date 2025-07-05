// OBSOLETE: Test to compare eval-based vs Lezer-based graph outputs
// Eval-based parser has been removed, only Lezer parser remains
// TODO: Remove this file or convert to Lezer-only tests

describe.skip("OBSOLETE - Eval vs Lezer comparison tests", () => {
  test("skipped - eval parser removed", () => {
    expect(true).toBe(true);
  });
});

/*
// Test to compare eval-based vs Lezer-based graph outputs
import { dslContext } from "../src/dsl";
import { convertLezerToNodysseus } from "../src/dsl/lezer-to-nodysseus-converter";
// import { parseDSL } from "../src/dsl/parser"; // Removed - eval parser no longer exists
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

describe("Eval vs Lezer Graph Comparison", () => {
  test("should produce equivalent graphs for simple expressions", () => {
    const simpleExpression = 'sphere().render("test")';

    // Test eval-based parser
    let evalResult;
    withEvalParser(() => {
      evalResult = parseDSL(simpleExpression, dslContext);
    });

    // Test Lezer converter directly
    const lezerResult = convertLezerToNodysseus(simpleExpression, dslContext);

    // Compare basic properties
    expect(evalResult).toBeDefined();
    expect(lezerResult).toBeDefined();
    expect(lezerResult.graph).toBeDefined();

    // Convert eval result to Nodysseus for comparison
    if (
      evalResult &&
      typeof evalResult === "object" &&
      "value" in evalResult &&
      "dependencies" in evalResult
    ) {
      const evalNodysseusGraph = convertGraphToNodysseus(evalResult);

      console.log("Eval graph nodes:", Object.keys(evalNodysseusGraph.nodes).length);
      console.log("Lezer graph nodes:", Object.keys(lezerResult.graph.nodes).length);

      // Both should produce graphs
      expect(evalNodysseusGraph.nodes).toBeDefined();
      expect(lezerResult.graph.nodes).toBeDefined();

      // Both should have similar structure (though exact match not expected due to implementation differences)
      expect(Object.keys(evalNodysseusGraph.nodes).length).toBeGreaterThan(0);
      expect(Object.keys(lezerResult.graph.nodes).length).toBeGreaterThan(0);
    }
  });

  test("should handle complex chained expressions", () => {
    const complexExpression =
      'mesh(sphere(), material({color: 0xff0000})).translateX(1).rotateY(45).render("complexMesh")';

    // Test eval-based parser
    let evalResult;
    withEvalParser(() => {
      evalResult = parseDSL(complexExpression, dslContext);
    });

    // Test Lezer converter directly
    const lezerResult = convertLezerToNodysseus(complexExpression, dslContext);

    expect(lezerResult.graph).toBeDefined();
    expect(lezerResult.graph.nodes).toBeDefined();
    expect(lezerResult.graph.edges).toBeDefined();
    expect(lezerResult.rootNodeId).toBeDefined();

    // Should have a substantial graph
    expect(Object.keys(lezerResult.graph.nodes).length).toBeGreaterThan(5);

    console.log("Nodes:", Object.keys(lezerResult.graph.nodes).length);
    console.log("Edges:", Object.keys(lezerResult.graph.edges || {}).length);
    console.log("Root:", lezerResult.rootNodeId);
  });
});
*/
