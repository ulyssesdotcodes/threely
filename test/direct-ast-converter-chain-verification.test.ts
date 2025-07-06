// Direct AST to Nodysseus Converter - Method Chain Edge Structure Verification
import { convertASTToNodysseus } from "../src/dsl/direct-ast-to-nodysseus-converter";
import { dslContext } from "../src/dsl";
import { RangeSet } from "@codemirror/state";

describe("Direct AST to Nodysseus Converter - Method Chain Edge Structure", () => {
  /**
   * Helper function to analyze the edge structure and verify proper chaining hierarchy
   */
  function analyzeChainStructure(graph: any, expression: string) {
    console.log(`\n=== CHAIN STRUCTURE ANALYSIS: ${expression} ===`);

    const nodes = Object.keys(graph.nodes);
    const edges = graph.edges_in || {};

    console.log(
      `📊 Graph Stats: ${nodes.length} nodes, ${Object.keys(edges).length} nodes with inputs`,
    );

    // Log all nodes with their types
    console.log("\n📝 Nodes:");
    Object.entries(graph.nodes).forEach(([nodeId, node]: [string, any]) => {
      const type = "ref" in node ? "RefNode" : "ValueNode";
      const ref = "ref" in node ? node.ref : "N/A";
      const valueDesc =
        typeof node.value === "function"
          ? `[Function: ${node.value.name || "anonymous"}]`
          : JSON.stringify(node.value).substring(0, 50);
      console.log(`  ${nodeId}: ${type} (${ref}) = ${valueDesc}`);
    });

    // Log edge structure to verify proper chaining
    console.log("\n🔗 Edge Dependencies:");
    Object.entries(edges).forEach(([nodeId, nodeEdges]: [string, any]) => {
      const dependencies = Object.keys(nodeEdges);
      const node = graph.nodes[nodeId];
      const functionName =
        typeof node.value === "function" ? node.value.name : "unknown";
      console.log(
        `  ${nodeId} (${functionName}) ← [${dependencies.join(", ")}]`,
      );

      // Detailed edge info
      Object.entries(nodeEdges).forEach(([fromId, edge]: [string, any]) => {
        console.log(`    ${fromId} --${edge.as}--> ${nodeId}`);
      });
    });

    return {
      nodeCount: nodes.length,
      edgeCount: Object.keys(edges).length,
      rootNode: graph.out,
      edges: edges,
      nodes: graph.nodes,
    };
  }

  /**
   * Verify that a chain follows proper sequential dependency structure
   */
  function verifyChainSequence(analysis: any, expectedFunctions: string[]) {
    console.log(
      `\n🔍 Verifying chain sequence: ${expectedFunctions.join(" → ")}`,
    );

    // Find nodes by function name
    const functionNodes = new Map<string, string>();
    Object.entries(analysis.nodes).forEach(([nodeId, node]: [string, any]) => {
      if ("value" in node && typeof node.value === "function") {
        functionNodes.set(node.value.name, nodeId);
      }
    });

    console.log("📋 Function to Node mapping:");
    expectedFunctions.forEach((fn) => {
      const nodeId = functionNodes.get(fn);
      console.log(`  ${fn} → ${nodeId || "NOT FOUND"}`);
    });

    // Verify each step depends only on the previous step (except the first)
    let isValidChain = true;
    for (let i = 1; i < expectedFunctions.length; i++) {
      const currentFn = expectedFunctions[i];
      const prevFn = expectedFunctions[i - 1];

      const currentNodeId = functionNodes.get(currentFn);
      const prevNodeId = functionNodes.get(prevFn);

      if (!currentNodeId || !prevNodeId) {
        console.log(`❌ Missing node for ${currentFn} or ${prevFn}`);
        isValidChain = false;
        continue;
      }

      const currentDeps = analysis.edges[currentNodeId];
      if (!currentDeps) {
        console.log(`❌ ${currentFn} has no dependencies`);
        isValidChain = false;
        continue;
      }

      const hasPrevDependency = Object.keys(currentDeps).includes(prevNodeId);
      console.log(
        `🔗 ${currentFn} depends on ${prevFn}: ${hasPrevDependency ? "✅" : "❌"}`,
      );

      if (!hasPrevDependency) {
        isValidChain = false;
        console.log(
          `   Current deps: [${Object.keys(currentDeps).join(", ")}]`,
        );
      }
    }

    return isValidChain;
  }

  it('should create proper hierarchy for mesh(sphere(), material()).translateX(1).render("test")', () => {
    const expression =
      'mesh(sphere(), material()).translateX(1).render("test")';
    console.log(`\n🧪 Testing: ${expression}`);

    const result = convertASTToNodysseus(
      expression,
      RangeSet.empty,
      dslContext,
    );
    expect(result.graph).toBeDefined();
    expect(result.rootNodeId).toBeDefined();

    const analysis = analyzeChainStructure(result.graph, expression);

    // Verify we have the expected number of function calls
    const expectedFunctions = [
      "sphere",
      "material",
      "mesh",
      "translateX",
      "render",
    ];
    const hasValidChain = verifyChainSequence(analysis, [
      "mesh",
      "translateX",
      "render",
    ]);

    // Verify basic structure expectations
    expect(analysis.nodeCount).toBeGreaterThanOrEqual(5); // At least the function calls
    expect(analysis.edgeCount).toBeGreaterThan(0); // Should have dependencies
    expect(hasValidChain).toBe(true);

    // Specific verification: render should depend on translateX, translateX should depend on mesh
    const renderNodeId = Object.entries(analysis.nodes).find(
      ([_, node]: [string, any]) =>
        "value" in node &&
        typeof node.value === "function" &&
        node.value.name === "render",
    )?.[0];
    const translateXNodeId = Object.entries(analysis.nodes).find(
      ([_, node]: [string, any]) =>
        "value" in node &&
        typeof node.value === "function" &&
        node.value.name === "translateX",
    )?.[0];
    const meshNodeId = Object.entries(analysis.nodes).find(
      ([_, node]: [string, any]) =>
        "value" in node &&
        typeof node.value === "function" &&
        node.value.name === "mesh",
    )?.[0];

    if (renderNodeId && translateXNodeId && meshNodeId) {
      const renderDeps = analysis.edges[renderNodeId];
      const translateXDeps = analysis.edges[translateXNodeId];

      expect(renderDeps).toBeDefined();
      expect(translateXDeps).toBeDefined();
      expect(Object.keys(renderDeps)).toContain(translateXNodeId);
      expect(Object.keys(translateXDeps)).toContain(meshNodeId);

      console.log("✅ Proper chain hierarchy verified");
    } else {
      console.log("❌ Could not find expected function nodes");
      expect(false).toBe(true); // Force test failure
    }
  });

  it('should create proper hierarchy for mesh(sphere()).rotateY(45).translateX(1).render("test")', () => {
    const expression =
      'mesh(sphere()).rotateY(45).translateX(1).render("test")';
    console.log(`\n🧪 Testing: ${expression}`);

    const result = convertASTToNodysseus(
      expression,
      RangeSet.empty,
      dslContext,
    );
    expect(result.graph).toBeDefined();
    expect(result.rootNodeId).toBeDefined();

    const analysis = analyzeChainStructure(result.graph, expression);

    // Verify proper chain sequence: mesh → rotateY → translateX → render
    const expectedSequence = ["mesh", "rotateY", "translateX", "render"];
    const hasValidChain = verifyChainSequence(analysis, expectedSequence);

    expect(hasValidChain).toBe(true);

    // Verify no "all edges to one node" pattern exists
    const maxDependencies = Math.max(
      ...Object.values(analysis.edges).map(
        (deps: any) => Object.keys(deps).length,
      ),
    );
    console.log(
      `📊 Maximum dependencies on any single node: ${maxDependencies}`,
    );

    // In a proper chain, no single node should have more than 2-3 dependencies
    // (the previous result + maybe 1-2 arguments)
    expect(maxDependencies).toBeLessThanOrEqual(3);

    console.log("✅ Proper sequential hierarchy verified");
  });

  it("should handle simple single calls correctly", () => {
    const expression = "sphere()";
    console.log(`\n🧪 Testing simple call: ${expression}`);

    const result = convertASTToNodysseus(
      expression,
      RangeSet.empty,
      dslContext,
    );
    expect(result.graph).toBeDefined();
    expect(result.rootNodeId).toBeDefined();

    const analysis = analyzeChainStructure(result.graph, expression);

    // Should have exactly one function node (sphere)
    const functionNodes = Object.values(analysis.nodes).filter(
      (node: any) => "value" in node && typeof node.value === "function",
    );

    expect(functionNodes.length).toBe(1);
    expect((functionNodes[0] as any).value.name).toBe("sphere");

    console.log("✅ Simple function call handled correctly");
  });

  it("should handle mixed chains and single calls working together", () => {
    // This would test a more complex scenario if needed
    const expression = "mesh(sphere(), material()).translateX(1)";
    console.log(`\n🧪 Testing mixed scenario: ${expression}`);

    const result = convertASTToNodysseus(
      expression,
      RangeSet.empty,
      dslContext,
    );
    expect(result.graph).toBeDefined();
    expect(result.rootNodeId).toBeDefined();

    const analysis = analyzeChainStructure(result.graph, expression);

    // Verify that sphere() and material() are independent, but mesh depends on both
    // and translateX depends only on mesh
    const sphereNodeId = Object.entries(analysis.nodes).find(
      ([_, node]: [string, any]) =>
        "value" in node &&
        typeof node.value === "function" &&
        node.value.name === "sphere",
    )?.[0];
    const materialNodeId = Object.entries(analysis.nodes).find(
      ([_, node]: [string, any]) =>
        "value" in node &&
        typeof node.value === "function" &&
        node.value.name === "material",
    )?.[0];
    const meshNodeId = Object.entries(analysis.nodes).find(
      ([_, node]: [string, any]) =>
        "value" in node &&
        typeof node.value === "function" &&
        node.value.name === "mesh",
    )?.[0];
    const translateXNodeId = Object.entries(analysis.nodes).find(
      ([_, node]: [string, any]) =>
        "value" in node &&
        typeof node.value === "function" &&
        node.value.name === "translateX",
    )?.[0];

    if (sphereNodeId && materialNodeId && meshNodeId && translateXNodeId) {
      // sphere() and material() should have no dependencies on each other
      const sphereDeps = analysis.edges[sphereNodeId] || {};
      const materialDeps = analysis.edges[materialNodeId] || {};

      expect(Object.keys(sphereDeps)).not.toContain(materialNodeId);
      expect(Object.keys(materialDeps)).not.toContain(sphereNodeId);

      // mesh should depend on both sphere and material
      const meshDeps = analysis.edges[meshNodeId] || {};
      expect(Object.keys(meshDeps)).toContain(sphereNodeId);
      expect(Object.keys(meshDeps)).toContain(materialNodeId);

      // translateX should depend only on mesh (plus its own arg)
      const translateXDeps = analysis.edges[translateXNodeId] || {};
      expect(Object.keys(translateXDeps)).toContain(meshNodeId);

      console.log("✅ Mixed scenario handled correctly");
    } else {
      console.log("❌ Could not find all expected function nodes");
      expect(false).toBe(true); // Force test failure
    }
  });

  it("should verify no flattened edge patterns exist", () => {
    const expression =
      'mesh(sphere(), material()).translateX(1).rotateY(45).render("test")';
    console.log(`\n🧪 Testing for flattened edge patterns: ${expression}`);

    const result = convertASTToNodysseus(
      expression,
      RangeSet.empty,
      dslContext,
    );
    const analysis = analyzeChainStructure(result.graph, expression);

    // Check that no single node has dependencies on ALL other nodes
    // (which would indicate flattened structure)
    const totalFunctionNodes = Object.values(analysis.nodes).filter(
      (node: any) => "value" in node && typeof node.value === "function",
    ).length;

    let hasFlattening = false;
    Object.entries(analysis.edges).forEach(([nodeId, deps]: [string, any]) => {
      const depCount = Object.keys(deps).length;
      if (depCount >= totalFunctionNodes - 1) {
        console.log(
          `⚠️ Potential flattening detected: ${nodeId} has ${depCount} dependencies`,
        );
        hasFlattening = true;
      }
    });

    expect(hasFlattening).toBe(false);
    console.log("✅ No flattened edge patterns detected");
  });

  it("should analyze detailed conversion log for debugging", () => {
    const expression =
      'mesh(sphere(), material()).translateX(1).render("test")';
    console.log(`\n🧪 Detailed conversion analysis: ${expression}`);

    const result = convertASTToNodysseus(
      expression,
      RangeSet.empty,
      dslContext,
    );

    console.log("\n📋 Conversion Log:");
    result.conversionLog.forEach((entry, index) => {
      console.log(
        `${index + 1}. ${entry.astNodeType} (${entry.position.from}-${entry.position.to})`,
      );
      console.log(`   → ${entry.nodysseusNodeType}: ${entry.nodysseusNodeId}`);
      if (entry.functionResolved) {
        console.log(`   → Function: ${entry.functionResolved}`);
      }
      if (entry.warnings && entry.warnings.length > 0) {
        console.log(`   → Warnings: ${entry.warnings.join(", ")}`);
      }
      if (entry.uuid) {
        console.log(`   → UUID: ${entry.uuid}`);
      }
    });

    // Verify that method calls are being properly identified vs function calls
    const callExpressions = result.conversionLog.filter(
      (entry) => entry.astNodeType === "CallExpression",
    );
    console.log(`\n📞 Call Expressions Found: ${callExpressions.length}`);

    callExpressions.forEach((call) => {
      console.log(
        `  ${call.functionResolved} at ${call.position.from}-${call.position.to}`,
      );
    });

    expect(callExpressions.length).toBeGreaterThan(0);
    console.log("✅ Conversion log analysis complete");
  });
});
