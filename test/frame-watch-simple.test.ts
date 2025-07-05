import { setScene, executeDSL, clearAll, frame } from "../src/dsl";
import { Graph } from "../src/graph";
import { convertGraphToNodysseus } from "../src/graph-to-nodysseus-converter";
import { NodysseusRuntime } from "../src/nodysseus/runtime-core";
import * as THREE from "three";

describe("Frame Watch System Simple Test", () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    setScene(scene);
    clearAll();
  });

  it("should create frame extern and return initial value", () => {
    const frameNode = frame();
    expect(frameNode).toBeDefined();
    expect(frameNode.value).toBeDefined();
    expect(frameNode.value.ref).toBe("extern.frame");
  });

  it("should execute frame with Nodysseus runtime and return number", () => {
    const frameNode = frame();
    const nodysseusGraph = convertGraphToNodysseus(frameNode);
    const runtime = new NodysseusRuntime();

    const frameValue = runtime.runGraphNode(
      nodysseusGraph,
      nodysseusGraph.out!,
    );

    expect(typeof frameValue).toBe("number");
    expect(frameValue).toBe(1);
  });

  it("should test watch creation on frame node", async () => {
    const frameNode = frame();
    const nodysseusGraph = convertGraphToNodysseus(frameNode);
    const runtime = new NodysseusRuntime();

    // Create the frame var node
    const frameVarNode = runtime.runGraphNode(
      nodysseusGraph,
      nodysseusGraph.out!,
    );

    // Find the actual VarNode in the runtime scope
    const varNodeId = `${nodysseusGraph.id}/${nodysseusGraph.out}`;
    const actualVarNode = runtime.scope.get(varNodeId);

    console.log("VarNode ID:", varNodeId);
    console.log("Actual VarNode:", actualVarNode);

    if (actualVarNode) {
      // Create a watch on the var node
      const watchIterable = runtime.createWatch(actualVarNode);

      let watchTriggered = false;
      let watchValue: any;

      // Set up a watch listener
      const watchPromise = (async () => {
        const iterator = watchIterable[Symbol.asyncIterator]();
        const result = await iterator.next();
        watchTriggered = true;
        watchValue = result.value;
        console.log("Watch triggered with value:", result.value);
      })();

      console.log("Setting var node value to 2...");
      // Manually trigger a value change
      actualVarNode.set(2);
      console.log("VarNode value after set:", actualVarNode.value.read());

      // Try running the node again to see if it returns the updated value
      const freshValue = runtime.runNode(actualVarNode);
      console.log("Fresh run of VarNode returns:", freshValue);

      // Wait for the watch to trigger
      await watchPromise;

      expect(watchTriggered).toBe(true);
      expect(watchValue).toBe(2);
    }
  });

  it("should test frame in DSL expression", () => {
    const result = executeDSL("frame()");
    console.log("DSL frame() result:", result);

    // The DSL should fallback to Nodysseus runtime and return a number
    expect(typeof result).toBe("number");
    expect(result).toBe(1);
  });
});
