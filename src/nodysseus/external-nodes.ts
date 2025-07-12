// External node handlers for various node types

import {
  State,
  VarNode,
  MapNode,
  BindNode,
  AnyNode,
  isNothing,
  isNothingOrUndefined,
} from "./node-types";
import { Graph, RefNode, GenericHTMLElement, Edge } from "./types";
import {
  constNode,
  varNode,
  mapNode,
  bindNode,
  handleError,
  mapEntries,
  nothingValue,
  chainNothing,
} from "./node-constructors";
import {
  appendGraphId,
  compareObjects,
  wrapPromise,
  wrapPromiseAll,
  wrapPromiseReduce,
  newLib,
  nodeEdgesIn,
  parseArg,
} from "./util";
import { globalPubSub, PubSubMessage } from "./pubsub-manager";

// Missing dependencies - adding placeholder implementations
const nolib: any = {
  no: { runtime: { addListener: () => {}, publish: () => {} } },
};
const nolibLib: any = {};
export const requestAnimationFrame: any =
  globalThis.requestAnimationFrame || (() => {});
export const externs: any = {
  parseValue: (value: any) => {
    if (typeof value !== "string") {
      return value;
    }

    if (value === "undefined") {
      return undefined;
    }

    if (typeof value === "string") {
      if (value.startsWith('"') && value.endsWith('"')) {
        return value.substring(1, value.length - 1);
      }

      if (value.startsWith("{") || value.startsWith("[")) {
        try {
          return JSON.parse(value.replace(/'/g, '"'));
        } catch (e) {
          // non-empty
        }
      }

      if (value.startsWith("0x")) {
        const int = parseInt(value);
        if (!isNaN(int)) {
          return int;
        }
      }

      if (value.match(/-?[0-9.]*/g)?.[0].length === value.length) {
        const float = parseFloat(value);
        if (!isNaN(float)) {
          return float;
        }
      }

      if (value === "false" || value === "true") {
        return value === "true";
      }
    }

    return value;
  },
};
const node_value = (node: any) => node.value;
const get = (obj: any, path: string) => {
  const keys = path.split(".");
  let result = obj;
  for (const key of keys) {
    result = result?.[key];
  }
  return result;
};
const node_extern = () => {};
const create_fn = () => {};

export class ExternalNodeHandler {
  private runtime: any;

  constructor(runtime: any) {
    this.runtime = runtime;
  }

  handleExternalNode<T>(
    refNode: RefNode,
    node: any,
    edgesIn: Edge[],
    graph: Graph,
    graphId: string,
    nodeGraphId: string,
    closure: any,
    calculateInputs: () => any,
    useExisting: boolean = true,
  ): any {
    if (refNode.ref === "@js.script") {
      return this.handleJavaScriptNode(
        refNode,
        node,
        edgesIn,
        nodeGraphId,
        calculateInputs,
        useExisting,
      );
    }

    if (refNode.ref === "return") {
      return this.handleReturnNode(
        refNode,
        node,
        edgesIn,
        graph,
        graphId,
        nodeGraphId,
        closure,
        useExisting,
      );
    }

    if (refNode.ref === "extern") {
      return this.handleExternNode(
        refNode,
        node,
        edgesIn,
        graph,
        graphId,
        nodeGraphId,
        closure,
        calculateInputs,
        useExisting,
      );
    }

    if (refNode.ref === "arg") {
      return this.handleArgNode(
        refNode,
        node,
        edgesIn,
        graph,
        graphId,
        nodeGraphId,
        closure,
        useExisting,
      );
    }

    if (refNode.ref === "@graph.functional") {
      return this.handleGraphFunctionalNode(
        refNode,
        node,
        edgesIn,
        nodeGraphId,
        calculateInputs,
        useExisting,
      );
    }

    if (refNode.ref === "@graph.executable") {
      return this.handleGraphExecutableNode(
        refNode,
        node,
        edgesIn,
        nodeGraphId,
        calculateInputs,
        useExisting,
      );
    }

    if (refNode.ref === "event") {
      return this.handleEventNode(
        refNode,
        node,
        edgesIn,
        nodeGraphId,
        calculateInputs,
        useExisting,
      );
    }

    if (refNode.ref === "publish") {
      return this.handlePublishNode(
        refNode,
        node,
        edgesIn,
        nodeGraphId,
        calculateInputs,
        useExisting,
      );
    }

    if (refNode.ref === "extern.frame") {
      return this.handleFrameExtern(nodeGraphId, useExisting);
    }

    if (refNode.ref === "extern.feedback") {
      return this.handleFeedbackExtern(
        refNode,
        node,
        edgesIn,
        nodeGraphId,
        calculateInputs,
        useExisting,
      );
    }

    // Return false so runtime-core can handle graph nodes
    return false;
  }

  private handleJavaScriptNode(
    refNode: RefNode,
    node: any,
    edgesIn: Edge[],
    nodeGraphId: string,
    calculateInputs: () => any,
    useExisting: boolean,
  ): any {
    let scriptFn: any;
    const inputs = edgesIn.map((e) => e.as);
    try {
      scriptFn = new Function(
        "_lib",
        "_node",
        "_node_args",
        "wrapPromise",
        ...inputs,
        (typeof refNode.value === "string" ? refNode.value : "") || "",
      ) as (...args: any[]) => any;
    } catch (e: any) {
      handleError(e, nodeGraphId);
      if (this.runtime.scope.has(nodeGraphId))
        return this.runtime.scope.get(nodeGraphId);
      scriptFn = () => {};
    }

    return this.runtime.mapNode(
      calculateInputs(),
      (args: any) => {
        try {
          return scriptFn(
            this.runtime.lib,
            node,
            args,
            wrapPromise,
            ...inputs.map((i: any) => args[i]),
          );
        } catch (e: any) {
          handleError(e, nodeGraphId);
        }
      },
      undefined,
      nodeGraphId,
      useExisting,
    );
  }

  private handleReturnNode(
    refNode: RefNode,
    node: any,
    edgesIn: Edge[],
    graph: Graph,
    graphId: string,
    nodeGraphId: string,
    closure: any,
    useExisting: boolean,
  ): any {
    // Simplified return node handling
    const inputs = Object.fromEntries(
      edgesIn
        .filter((e) => e.as !== "args" && e.as !== "lib")
        .map((e) => [
          e.as,
          this.runtime.constNode(
            undefined,
            nodeGraphId + `-input-${e.as}`,
            false,
          ),
        ]),
    );

    const resultNode = inputs["value"] || inputs["display"];

    return this.runtime.mapNode(
      { result: resultNode },
      ({ result }: any) => result && this.runtime.runNode(result),
      undefined,
      nodeGraphId,
      useExisting,
    );
  }

  private handleExternNode(
    refNode: RefNode,
    node: any,
    edgesIn: Edge[],
    graph: Graph,
    graphId: string,
    nodeGraphId: string,
    closure: any,
    calculateInputs: () => any,
    useExisting: boolean,
  ): any {
    const externValue = refNode.value;

    if (externValue === "extern.switch") {
      return this.handleSwitchNode(
        edgesIn,
        graph,
        graphId,
        nodeGraphId,
        closure,
        useExisting,
      );
    } else if (externValue === "extern.map") {
      return this.handleMapNode(calculateInputs, nodeGraphId, useExisting);
    } else if (externValue === "extern.fold") {
      return this.handleFoldNode(calculateInputs, nodeGraphId, useExisting);
    } else if (
      externValue === "extern.reference" ||
      externValue === "extern.state"
    ) {
      return this.handleStateNode(
        edgesIn,
        graph,
        graphId,
        nodeGraphId,
        closure,
        useExisting,
      );
    } else if (externValue === "extern.html_element") {
      return this.handleHtmlElementNode(
        node,
        calculateInputs,
        nodeGraphId,
        useExisting,
      );
    } else if (externValue === "extern.frame") {
      const varNode = this.runtime.varNode(
        1,
        undefined,
        nodeGraphId,
        useExisting,
      );
      const update = () => {
        varNode.set((varNode.value.read() as number) + 1);
        if (this.runtime.scope.get(nodeGraphId) === varNode) {
          requestAnimationFrame(update);
        }
      };
      requestAnimationFrame(update);
      return varNode;
    }

    // Default extern handling
    return this.handleGenericExternNode(
      refNode,
      calculateInputs,
      nodeGraphId,
      useExisting,
    );
  }

  private handleFrameExtern(nodeGraphId: string, useExisting: boolean): any {
    const varNode = this.runtime.varNode(
      1,
      undefined,
      nodeGraphId,
      useExisting,
    );

    const update = () => {
      const oldValue = varNode.value.read() as number;
      const newValue = oldValue + 1;
      varNode.set(newValue);

      if (this.runtime.scope.get(nodeGraphId) === varNode) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
    return varNode;
  }

  private handleFeedbackExtern(
    refNode: RefNode,
    node: any,
    edgesIn: Edge[],
    nodeGraphId: string,
    calculateInputs: () => any,
    useExisting: boolean,
  ): any {
    // All function parsing and node creation should have been done
    // during AST to Nodysseus conversion phase

    // Parse metadata from the RefNode value
    let metadata: { transformNodeId: string; parameterName: string } = {
      transformNodeId: "",
      parameterName: "",
    };

    try {
      if (typeof refNode.value === "string") {
        metadata = JSON.parse(refNode.value);
      }
    } catch (e) {
      console.warn("Failed to parse feedback metadata:", refNode.value);
    }

    // Create a varNode to hold the feedback value
    const feedbackVarNode = this.runtime.varNode(
      undefined, // initial value
      undefined, // default comparison
      nodeGraphId + "-feedback-var",
      useExisting,
    );

    // Create a mapNode that computes the feedback loop
    const inputs = calculateInputs();
    const feedbackMapNode = this.runtime.mapNode(
      { ...inputs, feedbackVar: feedbackVarNode },
      (allInputs: any) => {
        try {
          // Get the input value (typically the first input, excluding feedbackVar)
          const { feedbackVar, ...regularInputs } = allInputs;
          const inputValue =
            regularInputs.value || Object.values(regularInputs)[0];

          // Get the transformed value from the connected transform node
          const transformedValue = allInputs.transform || inputValue;

          // Update the varNode with the transformed value for the next iteration
          feedbackVarNode.set(transformedValue);

          // Return the transformed value
          return transformedValue;
        } catch (e: any) {
          handleError(e, nodeGraphId);
          return undefined;
        }
      },
      undefined,
      nodeGraphId,
      useExisting,
    );

    // Connect the feedbackVarNode to parameter references in the transform nodes
    if (metadata.transformNodeId && metadata.parameterName) {
      this.connectParameterNodes(
        metadata.transformNodeId,
        metadata.parameterName,
        feedbackVarNode,
        nodeGraphId,
      );
    }

    return feedbackMapNode;
  }

  private connectParameterNodes(
    transformNodeId: string,
    parameterName: string,
    feedbackVarNode: any,
    nodeGraphId: string,
  ): void {
    // This method should connect any nodes in the transform graph that reference
    // the parameter (e.g., "sphere" in "sphere => sphere.scale(2)") to the feedbackVarNode

    // Implementation would need to:
    // 1. Find all nodes in the graph that reference the parameter name
    // 2. Replace those references with edges to the feedbackVarNode
    // 3. Update the graph structure to establish the feedback loop

    // For now, this is a placeholder - the actual implementation would require
    // graph traversal and node replacement logic
    console.log(
      `Connecting parameter "${parameterName}" in transform ${transformNodeId} to feedback var ${feedbackVarNode.id}`,
    );
  }

  private handleSwitchNode(
    edgesIn: Edge[],
    graph: Graph,
    graphId: string,
    nodeGraphId: string,
    closure: any,
    useExisting: boolean,
  ): any {
    const inputEdge = edgesIn.find((e) => e.as === "input");
    if (!inputEdge)
      return this.runtime.constNode(undefined, nodeGraphId, false);

    return this.runtime.switchNode(
      this.runtime.constNode("default", nodeGraphId + "-key", false),
      Object.fromEntries(
        edgesIn
          .filter((e) => e.as !== "input")
          .map((e) => [
            e.as,
            this.runtime.constNode(undefined, nodeGraphId + `-${e.as}`, false),
          ]),
      ),
      nodeGraphId,
      useExisting,
    );
  }

  private handleMapNode(
    calculateInputs: () => any,
    nodeGraphId: string,
    useExisting: boolean,
  ): any {
    return this.runtime.mapNode(
      calculateInputs(),
      ({ fn, array }: any) =>
        wrapPromiseAll(
          (Array.isArray(array) ? array : Object.entries(array || {})).map(
            (element: any, index: number) => fn({ element, index }),
          ),
        ),
      undefined,
      nodeGraphId,
      useExisting,
    );
  }

  private handleFoldNode(
    calculateInputs: () => any,
    nodeGraphId: string,
    useExisting: boolean,
  ): any {
    return this.runtime.mapNode(
      calculateInputs(),
      ({ fn, object, initial }: any) =>
        object === undefined
          ? object
          : wrapPromiseReduce(
              initial,
              Array.isArray(object) ? object : Object.entries(object),
              fn,
              0,
            ),
      undefined,
      nodeGraphId,
      useExisting,
    );
  }

  private handleStateNode(
    edgesIn: Edge[],
    graph: Graph,
    graphId: string,
    nodeGraphId: string,
    closure: any,
    useExisting: boolean,
  ): any {
    // Simplified state node - just return a var node
    const stateNode = this.runtime.varNode(
      undefined,
      undefined,
      nodeGraphId + "-state",
      useExisting,
      true,
      true,
    );

    return this.runtime.mapNode(
      { state: stateNode },
      ({ state }: any) => state,
      () => false,
      nodeGraphId,
      useExisting,
    );
  }

  private handleHtmlElementNode(
    node: any,
    calculateInputs: () => any,
    nodeGraphId: string,
    useExisting: boolean,
  ): any {
    return this.runtime.mapNode(
      calculateInputs(),
      (el: any) => {
        const { dom_type, children, props, value } = el as GenericHTMLElement;
        return {
          dom_type: dom_type ?? node.value ?? "div",
          children: (Array.isArray(children) ? children : [children])
            .filter((v: any) => v)
            .map((child: any) =>
              typeof child === "string"
                ? { dom_type: "text_value", text: child }
                : child,
            ),
          props: props ?? {},
          value,
        };
      },
      undefined,
      nodeGraphId,
      useExisting,
    );
  }

  private handleGenericExternNode(
    refNode: RefNode,
    calculateInputs: () => any,
    nodeGraphId: string,
    useExisting: boolean,
  ): any {
    const inputs = calculateInputs();
    return this.runtime.mapNode(
      inputs,
      (nodeArgs: any) => {
        try {
          return node_extern();
        } catch (e) {
          return undefined;
        }
      },
      undefined,
      nodeGraphId,
      useExisting,
    );
  }

  private handleArgNode(
    refNode: RefNode,
    node: any,
    edgesIn: Edge[],
    graph: Graph,
    graphId: string,
    nodeGraphId: string,
    closure: any,
    useExisting: boolean,
  ): any {
    const argname =
      refNode.value &&
      typeof refNode.value === "string" &&
      parseArg(refNode.value).name;

    if (!argname) {
      return this.runtime.constNode(undefined, nodeGraphId, useExisting);
    }

    return this.runtime.mapNode(
      { closure },
      ({ closure: innerClosure }: any) => {
        if (argname === "_args") return closure;
        if (argname.startsWith("_lib")) return this.runtime.lib;
        if (argname === "__graphid") return graphId;

        const isAccessor = argname.includes(".");
        if (isAccessor) {
          const baseName = argname.substring(0, argname.indexOf("."));
          const path = argname.substring(argname.indexOf(".") + 1);
          return get(innerClosure[baseName], path);
        }

        return innerClosure[argname];
      },
      undefined,
      nodeGraphId,
      useExisting,
    );
  }

  private handleGraphFunctionalNode(
    refNode: RefNode,
    node: any,
    edgesIn: Edge[],
    nodeGraphId: string,
    calculateInputs: () => any,
    useExisting: boolean,
  ): any {
    let computeFn: any;
    const inputs = edgesIn.map((e) => e.as);

    try {
      // Create function from stored compute function string
      // The original function expects dependency results as arguments in order
      computeFn = new Function(
        ...inputs.sort(), // Sort to ensure consistent parameter order (arg0, arg1, arg2, etc.)
        `return (${refNode.value || "() => undefined"}).apply(this, arguments);`,
      ) as (...args: any[]) => any;
    } catch (e: any) {
      handleError(e, nodeGraphId);
      if (this.runtime.scope.has(nodeGraphId))
        return this.runtime.scope.get(nodeGraphId);
      computeFn = () => undefined;
    }

    return this.runtime.mapNode(
      calculateInputs(),
      (args: any) => {
        try {
          // Extract dependency values in correct order based on edge 'as' names
          const sortedInputs = inputs.sort();
          const orderedArgs = sortedInputs.map(
            (inputName: string) => args[inputName],
          );
          return computeFn(...orderedArgs);
        } catch (e: any) {
          handleError(e, nodeGraphId);
          return undefined;
        }
      },
      undefined,
      nodeGraphId,
      useExisting,
    );
  }

  private handleGraphExecutableNode(
    refNode: RefNode,
    node: any,
    edgesIn: Edge[],
    nodeGraphId: string,
    calculateInputs: () => any,
    useExisting: boolean,
  ): any {
    // Parse the function from the value field
    let executableFn: Function;
    try {
      if (typeof refNode.value === "string") {
        // If it's a string, eval it as a function
        executableFn = eval(`(${refNode.value})`);
      } else if (typeof refNode.value === "function") {
        // If it's already a function, use it directly
        executableFn = refNode.value;
      } else {
        // Default to identity function
        executableFn = (x: any) => x;
      }
    } catch (e: any) {
      handleError(e, nodeGraphId);
      executableFn = () => undefined;
    }

    const inputs = edgesIn.map((e) => e.as);

    return this.runtime.mapNode(
      calculateInputs(),
      (args: any) => {
        try {
          // Extract dependency values in correct order based on edge 'as' names
          const sortedInputs = inputs.sort();
          const orderedArgs = sortedInputs.map(
            (inputName: string) => args[inputName],
          );

          // Debug logging for mesh function
          if (
            typeof executableFn === "function" &&
            executableFn.name === "mesh"
          ) {
            console.log("🔍 MESH FUNCTION DEBUG:");
            console.log("   Node ID:", nodeGraphId);
            console.log("   Inputs:", inputs);
            console.log("   Sorted inputs:", sortedInputs);
            console.log("   Args object:", args);
            console.log("   Ordered args:", orderedArgs);
            console.log("   First arg (geometry):", orderedArgs[0]);
            console.log("   Second arg (material):", orderedArgs[1]);
            console.log("   First arg type:", typeof orderedArgs[0]);
            console.log("   Second arg type:", typeof orderedArgs[1]);
          }

          const result = executableFn(...orderedArgs);
          return result;
        } catch (e: any) {
          handleError(e, nodeGraphId);
          return undefined;
        }
      },
      (prev, next) => !compareObjects(prev, next),
      // undefined,
      nodeGraphId,
      useExisting,
    );
  }

  private handleEventNode(
    refNode: RefNode,
    node: any,
    edgesIn: Edge[],
    nodeGraphId: string,
    calculateInputs: () => any,
    useExisting: boolean,
  ): any {
    const channel =
      typeof refNode.value === "string" ? refNode.value : "default";

    // Create a var node that will hold the latest message data
    const eventVarNode = this.runtime.varNode(
      undefined, // initial value
      (a: any, b: any) => false, // always update when new message arrives
      nodeGraphId + "-event-var",
      useExisting,
      true, // dirty on change
      false, // don't unwrap value
    );

    // Subscribe to the pub/sub channel
    const unsubscribe = globalPubSub.subscribe(channel, {
      id: nodeGraphId,
      callback: (message: PubSubMessage) => {
        // Update the var node with the new message data
        eventVarNode.set(message.data);
      },
    });

    // Store unsubscribe function for cleanup
    if (!this.runtime.eventUnsubscribers) {
      this.runtime.eventUnsubscribers = new Map();
    }
    this.runtime.eventUnsubscribers.set(nodeGraphId, unsubscribe);

    // Get the initial message if one exists
    const latestMessage = globalPubSub.getLatestMessage(channel);
    if (latestMessage) {
      eventVarNode.set(latestMessage.data);
    }

    return this.runtime.mapNode(
      { eventVar: eventVarNode },
      ({ eventVar }: any) => eventVar,
      () => false, // don't check staleness, rely on var node dirtying
      nodeGraphId,
      useExisting,
    );
  }

  private handlePublishNode(
    refNode: RefNode,
    node: any,
    edgesIn: Edge[],
    nodeGraphId: string,
    calculateInputs: () => any,
    useExisting: boolean,
  ): any {
    const channel =
      typeof refNode.value === "string" ? refNode.value : "default";

    return this.runtime.mapNode(
      calculateInputs(),
      (args: any) => {
        // Get the data to publish from the 'data' input, or use the first available input
        const dataInput =
          args.data !== undefined ? args.data : Object.values(args)[0];

        // Publish the message
        globalPubSub.publish(channel, dataInput);

        // Return the published data for chaining
        return dataInput;
      },
      undefined,
      nodeGraphId,
      useExisting,
    );
  }
}
