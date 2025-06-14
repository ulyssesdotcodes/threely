// Test file to verify our split works

import { State, isNothing, AnyNode } from "./node-types.js";
import { constNode, varNode, Scope } from "./node-constructors.js";
import { NodysseusRuntime } from "./runtime-core.js";

// Test basic functionality
const state = new State(42);
console.log("State test:", state.read());

const node = constNode("test", "test-id");
console.log("ConstNode test:", node.id);

const scope = new Scope();
scope.add(node);
console.log("Scope test:", scope.has("test-id"));

const runtime = new NodysseusRuntime();
console.log("Runtime test:", runtime.nodeCount());

export { state, node, scope, runtime };