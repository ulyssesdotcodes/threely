// Core runtime class with basic node management

import { v4 as uuid } from "uuid";
import {
  State,
  VarNode,
  MapNode,
  BindNode,
  AnyNode,
  AnyNodeMap,
  isNothing,
  isNothingOrUndefined,
  isVarNode,
  isConstNode,
  isMapNode,
  isBindNode,
} from "./node-types";
import { Graph, Edge, NodysseusNode, ValueNode, GraphNodeNode, isNodeRef, RefNode, isNodeValue, isGraph } from "./types";
import {
  Scope,
  constNode,
  varNode,
  mapNode,
  bindNode,
  handleError,
  mapEntries,
  nothingValue,
  chainNothing
} from "./node-constructors";
import { ExternalNodeHandler, externs } from "./external-nodes";
import {
  appendGraphId,
  compareObjects,
  wrapPromise,
  wrapPromiseAll,
  newLib,
  nodeEdgesIn
} from "./util";

const NAME_FIELD = new Set(["name"]);


export class NodysseusRuntime {
  public scope: Scope = new Scope();
  private watches: Map<string, Array<(a: unknown) => void>> = new Map();
  private outputs: Map<string, Set<string>> = new Map();
  private inputs: Map<string, Set<string>> = new Map();
  private rerun: Map<string, number> = new Map();
  private eventQueue: Array<Function> = [];
  private running: Map<string, number> = new Map();
  private torun: Set<string> = new Set();
  private dirtying = 0;
  public id: string = "runtime-id";
  public event: string = "graph-update";
  public lib: Record<string, any> = { runtime: this };
  private store = {
    refs: new Map(),
    persist: new Map(),
    state: new Map()
  };
  private externalHandler: ExternalNodeHandler;

  constructor() {
    this.externalHandler = new ExternalNodeHandler(this);
  }

  public refs() {
    return this.store.refs.keys();
  }

  nodeCount() {
    return this.scope.count();
  }

  public createWatch<T>(node: any): AsyncIterable<T> {
    return {
      [Symbol.asyncIterator]: () => ({
        next: () =>
          new Promise<IteratorResult<T>>((res) => {
            const watch = (a: T) => {
              this.watches
                .get(node.id)
                ?.splice(this.watches.get(node.id)?.indexOf(watch as (a: unknown) => void) ?? 0, 1);
              res({ value: a });
            };
            this.addWatchFn(node, watch);
          }),
      }),
    };
  }

  public clearWatch(node: any, watch: any) {
    if (
      this.watches.has(node.id) &&
      this.watches.get(node.id)?.includes(watch)
    ) {
      this.watches
        .get(node.id)
        ?.splice(this.watches.get(node.id)?.indexOf(watch) ?? 0, 1);
    }
  }

  private addWatchFn<T>(node: any, watch: (output: T) => void) {
    if (!this.watches.has(node.id)) this.watches.set(node.id, []);
    this.watches.get(node.id)?.push(watch as any);
    this.checkWatch(node.id);
  }

  private resetOutputs(id: string, inputs?: any) {
    if (!this.outputs.has(id)) this.outputs.set(id, new Set());
    if (!this.inputs.has(id)) this.inputs.set(id, new Set());

    let changed = false;

    if (inputs) {
      let k: any;
      for (k in inputs) {
        if (inputs[k] && this.outputs.has(inputs[k].id)) {
          if (!this.outputs.get(inputs[k].id)?.has(id)) {
            changed = true;
            this.outputs.get(inputs[k].id)?.add(id);
          }
          if (!this.inputs.get(id)?.has(inputs[k].id)) {
            changed = true;
            this.inputs.get(id)?.add(inputs[k].id);
          }
        }
      }
    }

    if (changed) {
      this.dirty(id);
    }
  }

  private checkWatch(id: string) {
    const node = this.scope.get(id);

    const runIfClean = () => {
      if (!this.running.has(id)) {
        this.watches.get(id)?.forEach((fn) => {
          fn(this.runNode(this.scope.get(id)));
        });
        this.rerun.delete(id);
      }
    };

    if (
      this.watches.has(id) &&
      !this.rerun.has(id) &&
      !this.running.has(id) &&
      (!isMapNode(node) || node.isDirty.read())
    ) {
      new Promise(() => runIfClean());
    }
  }

  private dirty(id: string, breakOnNode?: string) {
    this.dirtying += 1;

    const finalize = () => {
      this.dirtying -= 1;
      if (this.dirtying === 0) {
        Array.from(this.torun).map((id) => this.checkWatch(id));
        this.checkWatch(id);
        this.torun.clear();
      } else {
        this.torun.add(id);
      }
    };

    const node = this.scope.get(id);
    if (isMapNode(node) || isBindNode(node)) {
      if (node.isDirty.read()) {
        finalize();
        return;
      }
      node.isDirty.write(true);
    }
    if (id === breakOnNode) {
      finalize();
      return;
    }
    let nid: any;
    const nodeOuts = this.outputs.get(id) ?? [];
    for (nid of Array.from(nodeOuts)) {
      this.dirty(nid, breakOnNode);
    }
    finalize();
  }

  constNode<T>(v: T, id: string, useExisting: boolean = true): any {
    const existing = this.scope.get(id);
    const existingValue = existing?.value?.read();
    if (useExisting && existing && compareObjects(existingValue, v)) {
      return existing;
    }

    const node = useExisting && existing ? existing : constNode(v, id);
    this.scope.add(node);
    this.resetOutputs(node.id);
    this.dirty(node.id);
    return node;
  }

  varNode<T>(
    initial?: T,
    compare?: (a: T, b: T) => boolean,
    id?: string,
    useExisting: boolean = true,
    dirty = true,
    unwrapValue = false
  ): any {
    if (useExisting && id && this.scope.has(id)) {
      const node = this.scope.get(id);
      initial && node.set(initial);
      return node;
    }
    const node = varNode<T>(
      (newValueWrapper: T | { value: T }) => {
        const newValue: T =
          unwrapValue && typeof newValueWrapper === "object" && (newValueWrapper as any).hasOwnProperty("value")
            ? (newValueWrapper as { value: T }).value
            : newValueWrapper as T;

        const currentValue = node.value.read();
        if (isNothing(currentValue) || !node.compare(currentValue, newValue)) {
          node.value.write(newValue);
          if (dirty) {
            this.dirty(node.id);
          }
        }
        return newValue;
      },
      compare,
      id,
    );
    this.scope.add(node);
    this.resetOutputs(node.id);
    if (initial !== undefined) node.set(initial);
    this.dirty(node.id);
    return node;
  }

  public addListenerVarNode<T>(nodeGraphId: any, listener: any, stateId = nodeGraphId) {
    // TODO: implement
  }

  mapNode<T, S extends Record<string, unknown>>(
    inputs: { [k in keyof S]: any },
    fn: (s: S) => T,
    isStale: (previous: S, next: S) => boolean = () => true,
    id?: string,
    useExisting: boolean = true,
  ): any {
    if (useExisting && id && this.scope.has(id)) return this.scope.get(id);
    const node = mapNode(inputs, fn, isStale, id);
    this.scope.add(node);
    this.resetOutputs(node.id, inputs as any);
    this.dirty(node.id);
    return node;
  }

  bindNode<R, T extends any, S extends Record<string, unknown>>(
    inputs: { [k in keyof S]: any },
    fn: (s: S) => T | PromiseLike<T>,
    id: string,
    isStale?: (previous: S, next: S) => boolean,
    useExisting: boolean = true,
  ): any {
    if (useExisting && id && this.scope.has(id)) return this.scope.get(id);
    const currentBind = this.scope.get(id);
    if (useExisting && currentBind) {
      return currentBind;
    }
    const node = bindNode<R, T, S>(
      inputs,
      (args: any) => {
        const current = node.value.read();
        return wrapPromiseAll([fn(args), current]).then(
          ([outNode, current]) => {
            if (current !== outNode && outNode) {
              if (current.id !== outNode.id) {
                this.outputs
                  .get(node.id)
                  ?.forEach((oid) => this.outputs.get(outNode.id)?.add(oid));
              }

              if (
                current &&
                !isNothing(current) &&
                (current.__kind !== outNode.__kind ||
                  current.id !== outNode.id ||
                  !compareObjects(current.value.read(), outNode.value.read()) ||
                  ((isMapNode(current) || isBindNode(current)) &&
                    current.isDirty.read()))
              ) {
                if (isMapNode(outNode) || isBindNode(outNode)) {
                  outNode.isDirty.write(false);
                }
                this.dirty(outNode.id);
              }
            }
            return outNode;
          },
        ).value as any;
      },
      isStale,
      id,
    );
    this.scope.add(node);
    this.resetOutputs(node.id, inputs as any);
    this.dirty(node.id);
    return node;
  }

  switchNode<T, S extends Record<string, T>>(
    key: any,
    inputs: { [k in keyof S]: any },
    id: string,
    useExisting: boolean = true,
  ) {
    const keyOptions: Record<string, any> = mapEntries(
      inputs,
      (e) => this.constNode(e[1], id && `${id}-${e[0]}-const`, false)
    );
    const binding: any = this.bindNode(
      { key, ...keyOptions } as { key: any } & {
        [k in keyof S]: any;
      },
      (args: any) => args[args.key],
      id && `${id}-bind`,
      (p: any, n: any) => p.key !== n.key || p[p.key] !== n[n.key],
      useExisting,
    );
    return this.mapNode(
      { bound: binding },
      ({ bound }: any) => {
        const res = !isNothing(bound) && this.runNode(bound);
        return res !== undefined && !isNothing(res) ? res : undefined;
      },
      undefined,
      id,
      useExisting,
    );
  }

  public accessorMap<T, S extends Record<string, unknown>>(
    map: any,
    key: string,
    id: string,
    useExisting: boolean,
    isNodeRun: boolean = false,
  ): any {
    return this.mapNode(
      { map },
      ({ map }: any) => (map as any)[key],
      undefined,
      id + key + "-map",
      useExisting,
    );
  }

  public accessor<T, S extends Record<string, unknown>>(
    map: any,
    key: string,
    id: string,
    useExisting: boolean,
    isNodeRun: boolean = false,
  ): any {
    return this.mapNode(
      {
        bound: this.bindNode(
          { map },
          ({ map }: any) => (map as any)[key],
          id + key + "-bind",
          undefined,
          useExisting,
        ),
      },
      ({ bound }: any) => {
        return this.runNode(bound);
      },
      undefined,
      id + key + "-map",
      useExisting,
    );
  }

  public runNodeNode<T>(
    node: any,
    nodeGraphId: string,
    useExisting = true,
  ): any {
    return this.mapNode(
      {
        bound: this.bindNode(
          { bound: node },
          ({ bound }: any) => bound,
          nodeGraphId + "-runNodeNodebind",
          undefined,
        ),
      },
      ({ bound }: any) => this.runNode(bound),
      undefined,
      nodeGraphId,
      useExisting,
    );
  }

  public fromNode<T, D, M, S extends Record<string, unknown>>(
    graph: Graph | string,
    nodeId: string,
    closure?: any,
  ): any {
    closure = closure ?? ({} as any);
    return wrapPromise(
      typeof graph === "string" ? this.store.refs.get(graph) : graph,
    ).then((graph) =>
      this.fromNodeInternal<T, D, M, S>(
        graph,
        nodeId,
        graph.id,
        closure && this.constNode(closure, appendGraphId(graph.id, nodeId) + "-outerargs"),
        true,
      ),
    ).value;
  }

 private calcNode<T, S extends Record<string, unknown>>(
    graph: Graph,
    node: NodysseusNode,
    graphId: string,
    nodeGraphId: string,
    nodeClosure: AnyNode<AnyNodeMap<S>>,
    graphClosure: AnyNode<AnyNodeMap<S>>,
    edgesIn: Edge[],
    useExisting: boolean,
    extraNodeGraphId:  string,
  ) {
    const calculateInputs = () =>
      Object.fromEntries(
        edgesIn.map((e) => [
          e.as,
          this.fromNodeInternal(graph, e.from, graphId, graphClosure, true),
        ]),
      ) as AnyNodeMap<S>;
    if (isNothing(node)) {
      return this.constNode(undefined, nodeGraphId, false);
    } else if (isNodeRef(node)) {
      return this.dereference(
        graph,
        node,
        edgesIn,
        graphId,
        nodeGraphId,
        nodeClosure,
        calculateInputs,
        extraNodeGraphId,
        useExisting,
      );
    } else if (isNodeValue(node)) {
      // TODO: make this work better
      return this.mapNode({
          __graph_value: this.accessor(nodeClosure, "__parent_graph_value", nodeGraphId + "-accessvalue", useExisting)
        }, ({__graph_value}) => externs.parseValue(__graph_value), 
        undefined, 
        nodeGraphId, 
        useExisting
      )

    } else if (isGraph(node)) {
      return this.fromNodeInternal(
          node,
          node.out ?? "out",
          nodeGraphId,
            {},
          useExisting,
        )
    } else {
      return this.mapNode(
        calculateInputs(),
        (args) => args,
        undefined,
        nodeGraphId,
        useExisting,
      );
    }
  }

  private fromNodeInternal<T, D, M, S extends Record<string, unknown>>(
    graph: Graph,
    nodeId: string,
    graphId: string,
    graphClosure?: AnyNode<AnyNodeMap<S>>,
    useExisting: boolean = true,
  ): AnyNode<T> {
    const node = graph.nodes[nodeId];
    const nodeGraphId = appendGraphId(graphId, nodeId);
    if (useExisting && this.scope.has(nodeGraphId + "-boundNode"))
      return this.scope.get(nodeGraphId + "-boundNode") as AnyNode<T>;
    const staticGraphId = graph.id;

    const compareGraphNodes = (
      { node: nodeA, edgesIn: edgesInA, graph: graphA },
      { node: nodeB, edgesIn: edgesInB, graph: graphB },
    ) => {
      if (
        !nodeB ||
        !nodeA ||
        !compareObjects(nodeA, nodeB, false, NAME_FIELD) ||
        edgesInA.length !== edgesInB.length
      )
        return false;
      const sortedEdgesA = edgesInA.sort((a, b) => a.as.localeCompare(b.as));
      const sortedEdgesB = edgesInB.sort((a, b) => a.as.localeCompare(b.as));
      return sortedEdgesA.every((e, i) => compareObjects(e, sortedEdgesB[i]));
    };

    const graphNodeNode: VarNode<GraphNodeNode> = this.varNode(
      {
        graph,
        node: graph.nodes[node.id],
        edgesIn: nodeEdgesIn(graph, nodeId),
      },
      compareGraphNodes,
      nodeGraphId + "-graphnode",
      true,
    );

    // TODO: Add back in for graph updates
    // nolib.no.runtime.addListener(
    //   this.event,
    //   this.id + nodeGraphId + "-nodelistener",
    //   ({ graph }) => {
    //     if (graph.id === staticGraphId) {
    //       const oldval = graphNodeNode.value.read();
    //       const newval: {
    //         graph: Graph;
    //         node: NodysseusNode;
    //         edgesIn: Array<Edge>;
    //         previous?: NodysseusNode;
    //       } = {
    //         graph,
    //         node: graph.nodes[node.id],
    //         edgesIn: graph.edges_in?.[node.id]
    //           ? Object.values(graph.edges_in?.[node.id])
    //           : Object.values<Edge>(graph.edges).filter(
    //               (e: Edge) => e.to === node.id,
    //             ),
    //         previous: isNothing(oldval) ? undefined : oldval.node,
    //       };
    //       graphNodeNode.set(newval);
    //     }
    //   },
    // );

    const nodeValue =
      this.mapNode({ graphNodeNode }, ({ graphNodeNode }: { graphNodeNode: { node: ValueNode } }) => (graphNodeNode).node.value
        , (prev, next) => prev.graphNodeNode.node.value !== next.graphNodeNode.node.value
        , appendGraphId(nodeGraphId, "-system-values"));

    const nodeClosure = this.mapNode({ graphClosure }, ({ graphClosure }: any) => ({ ...graphClosure, __parent_graph_value: nodeValue }), undefined, nodeGraphId + "-closure-with-system")

    const ret: AnyNode<T> = this.mapNode(
      { graphNodeNode },
      ({ graphNodeNode }: {graphNodeNode: GraphNodeNode}) => {
        // if ref has changed, remove all current graph nodes
        if (
          graphNodeNode.previous &&
          isNodeRef(graphNodeNode.previous) &&
          isNodeRef(graphNodeNode.node) &&
          graphNodeNode.node.ref !== graphNodeNode.previous?.ref &&
          this.scope.has(nodeGraphId + "value")
        ) {
          this.scope.removeAll(nodeGraphId);
        }
        return wrapPromise(
          this.calcNode(
            graphNodeNode.graph,
            graphNodeNode.node,
            graphId,
            nodeGraphId,
            nodeClosure,
            graphClosure,
            graphNodeNode.edgesIn,
            false,
          ),
        ).then(
          (value) =>
            wrapPromiseAll([
              this.calcNode(
                graphNodeNode.graph,
                graphNodeNode.node,
                graphId,
                nodeGraphId,
                nodeClosure,
                graphClosure,
                graphNodeNode.edgesIn,
                true,
                "display",
              ),
              this.calcNode(
                graphNodeNode.graph,
                graphNodeNode.node,
                graphId,
                nodeGraphId,
                nodeClosure,
                graphClosure,
                graphNodeNode.edgesIn,
                true,
                "metadata",
              ),
            ]).then(([display, metadata]) => ({
              value,
              display,
              metadata,
            })).value,
        ).value;
      },
      ({ graphNodeNode: graphNodeA }, { graphNodeNode: graphNodeB }) =>
        !compareGraphNodes(graphNodeA, graphNodeB),
      nodeGraphId + "-boundNode",
    ) as NodeOutputs<T, D, M>;

    ret.graphId = staticGraphId;
    ret.nodeId = nodeId;

    return ret;
  }

  runNode<T>(
    innode: any,
  ): any {
    if (isNothing(innode)) return innode;
    const node: any = this.scope.get(innode.id);
    if (!node) return undefined;

    const current = node.value?.read();
    let result: any;

    if (
      node &&
      !isNothing(node) &&
      (isVarNode(node) ||
        isConstNode(node) ||
        !(node as any).isDirty?.read())
    ) {
      result = node.value.read();
    } else if (isMapNode(node) || isBindNode(node)) {
      if (!this.running.has(node.id)) this.running.set(node.id, 0);
      this.running.set(node.id, (this.running.get(node.id) || 0) + 1);

      const prev = node.cachedInputs.read();

      const inputPromises = () => {
        const updatedNode = this.scope.get(node.id);
        const _inputPromises: any[] = [];
        const keys = Object.keys(updatedNode.inputs);

        for (const key of keys) {
          const inputNode = this.scope.get(updatedNode.inputs[key]);
          const res = this.runNode(inputNode);
          if (inputNode) {
            _inputPromises.push(wrapPromise(res).value);
          }
        }

        return wrapPromiseAll(_inputPromises).then((ips: any) =>
          ips.reduce((a: any, v: any, i: number) => ((a[keys[i]] = v), a), {}),
        ).value;
      };

      return wrapPromise(inputPromises())
        .then((next: any) => {
          const updatedNode = this.scope.get(node.id);
          if (!updatedNode) {
            if (this.running.has(node.id)) this.running.delete(node.id);
            return;
          }

          if (
            isNothing(updatedNode.value.read()) ||
            isNothing(prev) ||
            updatedNode.isStale(prev, next)
          ) {
            const res = isBindNode(node)
              ? chainNothing(updatedNode.fn, (fn: any) => fn(next)) ?? nothingValue
              : chainNothing(node.fn, (fn: any) =>
                chainNothing(
                  typeof fn === "function" ? fn : fn.read(),
                  (ffn: any) => ffn(next),
                ),
              );
            updatedNode.value.write(res);
            updatedNode.cachedInputs.write(next);

            return wrapPromise(res).then((r: any) => {
              if (isBindNode(updatedNode) && !isNothing(res) && res)
                this.scope.add(res);

              updatedNode.value.write(r);
              updatedNode.isDirty.write(false);

              if (this.watches.has(node.id)) {
                this.watches
                  .get(node.id)
                  ?.forEach((fn) => wrapPromise(r).then(fn));
              }

              const currentRunning = this.running.get(node.id);
              if (currentRunning === 1) {
                this.running.delete(node.id);
              } else this.running.set(node.id, (currentRunning || 0) - 1);

              return r;
            }).value;
          }

          result = updatedNode.value.read();
          return wrapPromise(result).then((result: any) => {
            updatedNode.isDirty.write(false);

            const currentRunning = this.running.get(node.id);
            if (currentRunning === 1) {
              this.running.delete(node.id);
              this.checkWatch(node.id);
            } else this.running.set(node.id, (currentRunning || 0) - 1);

            return result;
          }).value;
        }).value;
    }

    if (this.watches.has(node.id) && current !== result) {
      this.watches.get(node.id)?.forEach((fn) => wrapPromise(result).then(fn));
    }

    return result;
  }

  public runGraphNode<T>(graph: Graph | string, node: string): any {
    const current = this.scope.get(
      `${appendGraphId(
        typeof graph === "string" ? graph : graph.id,
        node,
      )}-boundNode`,
    );
    if (current) return this.runNode(current);
    return wrapPromise(this.fromNode(graph, node)).then((nodeNode) =>
      this.runNode(nodeNode),
    ).value;
  }

  public run<T>(
    node: any,
  ): any {
    return wrapPromise(node).then((node) => {
      const nodeid = typeof node === "string" ? node : node.id;
      const resolvedNode = this.scope.get(nodeid);
      const res = resolvedNode && this.runNode(resolvedNode);

      return res && !isNothing(res) && wrapPromise(res).value;
    }).value;
  }
private dereference<T, S extends Record<string, unknown>>(
    graph: Graph,
    node: RefNode,
    edgesIn: Edge[],
    graphId: string,
    nodeGraphId: string,
    closure: AnyNode<AnyNodeMap<S>>,
    calculateInputs: () => AnyNodeMap<S>,
    extraNodeGraphId: string,
    useExisting: boolean = true,
    refNode = node,
  ): AnyNode<T> | PromiseLike<AnyNode<T>> {
    return wrapPromise(this.store.refs.get(refNode.ref) as Graph, (e) =>
      handleError(e, nodeGraphId),
    ).then((nodeRef): AnyNode<T> => {
      const outputNodeGraphId = appendGraphId(nodeGraphId, extraNodeGraphId);
      if (nodeRef === undefined) {
        throw new Error(`invalid node ref ${refNode.ref}`);
      }
      if (refNode.ref === "@js.script") {
        if (extraNodeGraphId === "metadata") {
          return this.constNode({
            dataLabel: "script",
            codeEditor: { language: "javascript", editorText: node.value },
          } as T, outputNodeGraphId, useExisting );
        } else if (extraNodeGraphId === "display") {
          return this.constNode({ dom_type: "text_value", text: "" } as T, outputNodeGraphId, useExisting);
        }

        let scriptFn;
        const inputs = edgesIn.map((e) => e.as);
        try {
          scriptFn = new Function(
            "_lib",
            "_node",
            "_node_args",
            "wrapPromise",
            ...inputs,
            refNode.value,
          ) as (...args: any[]) => any;
        } catch (e) {
          handleError(e, nodeGraphId);
          if(this.scope.has(outputNodeGraphId)) return this.scope.get(outputNodeGraphId) as AnyNode<T>
          scriptFn = () => {};
        }

        return this.mapNode(
          calculateInputs(),
          (args) => {
            try {
              return scriptFn(
                this.lib,
                node,
                args,
                wrapPromise,
                ...inputs.map(i => args[i])
              );
            } catch (e) {
              handleError(e, nodeGraphId);
            }
          },
          undefined,
          outputNodeGraphId,
          useExisting,
        );
      } else if (refNode.ref === "return") {
        if (
          extraNodeGraphId === "metadata" &&
          (node.id !== (graph.out ?? "out") ||
            nodeGraphId === appendGraphId(graph.id, node.id))
        ) {
          return this.constNode(
            {
              parameters: {
                value: {
                  type: "any",
                  default: true,
                },
                display: {
                  type: {
                    background: "@html.html_element",
                    resultPanel: "@html.html_element",
                  },
                },
                subscribe: "any",
                dependencies: "any",
                metadata: {
                  type: {
                    parameters: (graph: Graph, nodeId: string) => ({
                      type: Object.fromEntries(
                        Object.values(ancestor_graph(nodeId, graph).nodes)
                          .filter(
                            (n) =>
                              isNodeRef(n) &&
                              n.ref === "arg" &&
                              n.value &&
                              !n.value.startsWith("_"),
                          )
                          .map((n) => [
                            n.value.includes(".")
                              ? n.value.split(".")[0]
                              : n.value,
                            "any",
                          ]),
                      ),
                    }),
                    values: "any",
                    dataLabel: "any",
                    codeEditor: {
                      language: "any",
                      onChange: "any"
                    },
                  },
                },
                args: "any",
                lib: "any",
                _output: "string",
                _lib: "any",
                _runoptions: "any",
                __graphid: "string",
              },
            },
            nodeGraphId + extraNodeGraphId,
            useExisting,
          ) as AnyNode<T>;
        }

        const libNode =
          edgesIn.find((e) => e.as === "lib") &&
          (this.mapNode(
              {
                lib: this.valueMap(
                  this.fromNodeInternal(
                    graph,
                    edgesIn.find((e) => e.as === "lib").from,
                    graphId,
                    this.constNode({}, nodeGraphId + "-libnodeclosure"),
                    useExisting,
                  ),
                  nodeGraphId + "-libvalmap",
                  useExisting,
                ),
              },
              ({ lib }) => Object.assign(this.lib, lib),
              undefined,
              nodeGraphId + "-libnode",
              useExisting,
            ));

        const argsEdge = edgesIn.find((e) => e.as === "args");
        const chainedscope: AnyNode<AnyNodeMap<S>> = argsEdge
          ? this.mergeClosure(
              closure,
              this.valueMap(
                this.fromNodeInternal(
                  graph,
                  argsEdge.from,
                  graphId,
                  closure,
                  useExisting,
                ),
                nodeGraphId + "-argsvalmap",
                useExisting,
              ),
              nodeGraphId + "-returnchained",
              useExisting,
            )
          : closure;

        // if(!edgesIn.find(e => e.as === extraNodeGraphId || (extraNodeGraphId === "value" && e.as === "display"))) {
        //   return this.constNode(undefined, appendGraphId(nodeGraphId, extraNodeGraphId), useExisting)
        // }

        const inputs = Object.fromEntries(
          edgesIn
            .filter(
              (e) =>
                e.as !== "args" &&
                e.as !== "lib"
            )
            .map((e) => [
              e.as,
              this.valueMap(
                this.fromNodeInternal(
                  graph,
                  e.from,
                  graphId,
                  chainedscope,
                  useExisting,
                ),
                nodeGraphId + `-inputsvalmap-${e.as}-${extraNodeGraphId}`,
                useExisting,
              ),
            ]),
        );

        const subscribe = inputs["subscribe"];

        const resultNode =
          inputs[extraNodeGraphId] ??
          (extraNodeGraphId === "value" && inputs["display"]);

        const dependencies = inputs["dependencies"]



        return wrapPromise(
          libNode && this.runNode(libNode),
        ).then(() =>
         dependencies
          ? (this.mapNode(
              {
                dependencies,
                subscribe
              },
            ({ subscribe: subscriptions, dependencies }) => {

                subscriptions &&
                  Object.entries(subscriptions).forEach(
                    (kv) =>
                      kv[1] &&
                      nolib.no.runtime.addListener(
                        kv[0],
                        this.id + nodeGraphId,
                        (payload) => {
                          if (this.running.size > 0)
                            this.eventQueue.push(() => kv[1](payload));
                          else kv[1](payload);
                        },
                        false,
                        graphId,
                        true,
                        nolibLib,
                      ),
                  );

              let result = resultNode && this.runNode(resultNode);
              return result
              },
            // undefined,
              ({ dependencies: previous }, { dependencies: next }) =>
                (isNothingOrUndefined(previous) &&
                  isNothingOrUndefined(next)) ||
                  !compareObjects(previous, next),
              nodeGraphId + extraNodeGraphId,
              useExisting,
            ) as AnyNode<T>)
          : (this.mapNode(
              {
                result: resultNode,
                subscribe
              },
            ({ subscribe: subscriptions, result }) => {
              subscriptions &&
                  Object.entries(subscriptions).forEach(
                    (kv) =>
                      kv[1] &&
                      nolib.no.runtime.addListener(
                        kv[0],
                        this.id + nodeGraphId,
                        (payload) => {
                          if (this.running.size > 0)
                            this.eventQueue.push(() => kv[1](payload));
                          else kv[1](payload);
                        },
                        false,
                        graphId,
                        true,
                        nolibLib,
                      ),
                  );
                return result;
              },
              undefined,
              nodeGraphId + extraNodeGraphId,
              useExisting,
            ) as AnyNode<T>)
      ).value;
      } else if (refNode.ref === "extern") {
        if (refNode.value === "extern.switch") {
          const outputNodeGraphId = appendGraphId(nodeGraphId, graphId);

          if(extraNodeGraphId === "display") {
          return this.constNode({ dom_type: "text_value", text: "" } as T, outputNodeGraphId, useExisting);
          } else if (extraNodeGraphId === "metadata") {
            return this.constNode({ dom_type: "text_value", text: "" } as T, outputNodeGraphId, useExisting)
          }

          const inputEdge = edgesIn.find((e) => e.as === "input");
          return inputEdge
            ? (this.switchNode(
                this.valueMap(
                  this.fromNodeInternal(
                    graph,
                    inputEdge.from,
                    graphId,
                    closure,
                    useExisting,
                  ),
                  nodeGraphId + "-predvalmap",
                  useExisting,
                ),
                Object.fromEntries(
                  edgesIn
                    .filter((e) => e.as !== "input")
                    .map(
                      (e) => [
                        e.as,
                        this.valueMap(
                          this.fromNodeInternal(
                            graph,
                            e.from,
                            graphId,
                            closure,
                            useExisting,
                          ),
                          nodeGraphId + `-switchvalmap${e.as}`,
                          useExisting,
                        ),
                      ],
                      useExisting,
                    ),
                ),
                nodeGraphId,
                useExisting,
              ) as AnyNode<T>)
            : this.constNode(undefined, nodeGraphId, false);
        } else if (refNode.value === "extern.runnable") {
          if (extraNodeGraphId === "metadata") {
            return this.constNode(
              {
                parameters: {
                  fn: "any",
                  parameters: "any",
                },
              },
              nodeGraphId + extraNodeGraphId,
              useExisting,
            ) as AnyNode<T>;
          }
          const fnArgs = this.varNode<Record<string, unknown>>(
            {},
            undefined,
            nodeGraphId + "-fnargs",
            useExisting,
            false,
          );

          const chainedClosure = this.mergeClosure(
            closure,
            fnArgs,
            nodeGraphId + "-runnablechained",
            useExisting,
          );

          const parametersEdge = edgesIn.find((e) => e.as === "parameters");
          const parameters =
            parametersEdge &&
            this.valueMap(
              this.fromNodeInternal(
                graph,
                parametersEdge.from,
                graphId,
                closure,
                useExisting,
              ),
              nodeGraphId + "-parametersvalmap",
              useExisting,
            );

          const fnEdgeId = edgesIn.find((e) => e.as === "fn")?.from;
          const fnNode =
            fnEdgeId &&
            this.valueMap(
              this.fromNodeInternal(
                graph,
                fnEdgeId,
                graphId,
                chainedClosure,
                useExisting,
              ),
              nodeGraphId + "-fnnodevalmap",
              useExisting,
            );
          //
          return this.mapNode(
            {
              parameters,
              fnNode:
                fnNode &&
                this.bindNode(
                  {},
                  () => fnNode,
                  undefined,
                  nodeGraphId + "-fnNodebindnode",
                  useExisting,
                ),
            },
            ({ parameters, fnNode }) =>
              ((args) => {
                if (!fnNode) return;
                this.dirty(fnArgs.id, fnNode.id);
                if (parameters) {
                  const keys = new Set(Object.keys(parameters));
                  (this.scope.get(fnArgs.id) as typeof fnArgs).set(
                    Object.fromEntries(
                      Object.entries(args).filter((e) => keys.has(e[0])),
                    ),
                  );
                } else {
                  (this.scope.get(fnArgs.id) as typeof fnArgs).set({});
                }
                return this.runNode(fnNode);
              }) as T,
            undefined,
            nodeGraphId,
            useExisting,
          );
        } else if (refNode.value === "extern.map") {
          if (extraNodeGraphId === "metadata") {
            return this.constNode(
              {
                parameters: {
                  fn: "@flow.runnable",
                  array: "any: default",
                },
              },
              nodeGraphId + extraNodeGraphId,
              useExisting,
            ) as AnyNode<T>;
          }
          return this.mapNode(
            calculateInputs() as {
              fn: AnyNode<
                (mapArgs: { element: unknown; index: number }) => unknown
              >;
              array: AnyNode<Array<unknown>>;
            },
            ({ fn, array }) =>
              wrapPromiseAll(
                (ArrayBuffer.isView(array)
                  ? Array.from(array)
                  : Array.isArray(array)
                    ? array
                    : Object.entries(array)
                ).map((element, index) => fn({ element, index })),
              ),
            undefined,
            nodeGraphId,
            useExisting,
          ) as AnyNode<T>;
        } else if (refNode.value === "extern.fold") {
          return this.mapNode(
            calculateInputs() as {
              fn: AnyNode<
                (mapArgs: {
                  previousValue: T;
                  currentValue: unknown;
                  index: number;
                }) => T
              >;
              object: AnyNode<Array<unknown>>;
              initial: AnyNode<T>;
            },
            ({ fn, object, initial }) =>
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
          ) as AnyNode<T>;
        } else if (refNode.value === "extern.ap") {
          if (extraNodeGraphId === "metadata") {
            return this.constNode(
              {
                parameters: {
                  fn: "any",
                  args: "any",
                  run: "any",
                  isScope: "any",
                },
              },
              nodeGraphId + extraNodeGraphId,
              useExisting,
            ) as AnyNode<T>;
          }
          const fnEdge = edgesIn.find((e) => e.as === "fn");
          if (!fnEdge) {
            return this.constNode(undefined, nodeGraphId, useExisting);
          }
          const fn: AnyNode<Array<(mapArgs: Record<string, unknown>) => T>> =
            this.valueMap(
              this.fromNodeInternal(
                graph,
                fnEdge.from,
                graphId,
                closure,
                useExisting,
              ),
              nodeGraphId + "-fnvalmap",
              useExisting,
            );
          const runEdge = edgesIn.find((e) => e.as === "run");
          const run: AnyNode<boolean> =
            runEdge &&
            this.valueMap(
              this.fromNodeInternal(
                graph,
                runEdge.from,
                graphId,
                closure,
                useExisting,
              ),
              nodeGraphId + "-runvalmap",
              useExisting,
            );
          const isScopeEdge = edgesIn.find((e) => e.as === "isScope");
          const isScope =
            isScopeEdge &&
            this.valueMap(
              this.fromNodeInternal(
                graph,
                isScopeEdge.from,
                graphId,
                closure,
                useExisting,
              ),
              nodeGraphId + "-isscopevalmap",
              useExisting,
            );
          const apArgs = this.varNode<Record<string, unknown>>(
            {},
            undefined,
            nodeGraphId + "-apapargs",
            useExisting,
          );
          const chainedClosure = this.mergeClosure(
            closure,
            apArgs,
            nodeGraphId + "-apchained",
            useExisting,
          );
          const argsEdge = edgesIn.find((e) => e.as === "args")?.from;
          const argsNode = argsEdge
            ? this.mapNode(
                {
                  argsNode: this.valueMap(
                    this.fromNodeInternal(
                      graph,
                      argsEdge,
                      graphId,
                      chainedClosure,
                      useExisting,
                    ),
                    nodeGraphId + "-argsvalmap",
                    useExisting,
                  ) as AnyNode<Record<string, unknown>>,
                },
                ({ argsNode }) => argsNode,
                undefined,
                nodeGraphId + "-apargs",
                useExisting,
              )
            : this.mapNode(
                { chainedClosure },
                ({ chainedClosure }) =>
                  Object.fromEntries(
                    Object.entries(chainedClosure).map((e) => [
                      e[0],
                      e[1].value.read(),
                    ]),
                  ),
                undefined,
                nodeGraphId + "-apargs",
                useExisting,
              );

          return this.mapNode(
            {
              fn,
              run,
              isScope,
              argsNode: this.bindNode(
                {},
                () => argsNode,
                undefined,
                nodeGraphId + "-argsnodebind",
                useExisting,
              ),
            },
            ({ fn, run, argsNode, isScope }) => {
              if (run) {
                return wrapPromise(this.runNode(argsNode))
                  .then((args) =>
                    (Array.isArray(fn) ? fn : [fn])
                      .filter((f) => typeof f === "function")
                      .map((ffn) => ffn(args)),
                  )
                  .then((results) => (Array.isArray(fn) ? results : results[0]))
                  .value;
              } else if (isScope) {
                return wrapPromise(this.runNode(argsNode)).then(
                  (scopeArgs) => (args) => {
                    const argsWithScopedArgs = { ...args, ...scopeArgs };
                    return wrapPromiseAll(
                      (Array.isArray(fn) ? fn : [fn])
                        .filter((f) => typeof f === "function")
                        .map((ffn) => ffn(argsWithScopedArgs)),
                    ).then((results) =>
                      Array.isArray(fn) ? results : results[0],
                    ).value;
                  },
                ).value;
              } else {
                return (args) => {
                  const runtimeApArgs = this.scope.get(
                    apArgs.id,
                  ) as VarNode<any>;
                  runtimeApArgs.set(args);
                  return wrapPromise(
                    this.runNode(argsNode) as Record<string, unknown>,
                  )
                    .then((args) =>
                      (Array.isArray(fn) ? fn : [fn])
                        .filter((f) => typeof f === "function")
                        .map((ffn) => ffn(args)),
                    )
                    .then((results) =>
                      Array.isArray(fn) ? results : results[0],
                    ).value;
                };
              }
            },
            undefined,
            nodeGraphId,
            useExisting,
          ) as AnyNode<T>;
        } else if (
          refNode.value === "extern.reference" ||
          refNode.value === "extern.state"
        ) {
          if (extraNodeGraphId === "metadata") {
            return this.constNode(
              {
                parameters: {
                  initial: "any",
                  persist: "any",
                  publish: "any",
                  listener: "any",
                  share: "any",
                },
              },
              nodeGraphId + extraNodeGraphId,
              useExisting,
            ) as AnyNode<T>;
          }
          const initialNode =
            edgesIn.find((e) => e.as === "initial" || e.as === "value")?.from &&
            this.valueMap(
              this.fromNodeInternal(
                graph,
                edgesIn.find((e) => e.as === "initial" || e.as === "value")
                  .from,
                graphId,
                closure,
                useExisting,
              ),
              nodeGraphId + "-initialvalmap",
              useExisting,
            );

          const persistEdge = edgesIn.find((e) => e.as === "persist");
          const persistNode =
            persistEdge &&
            this.valueMap(
              this.fromNodeInternal(
                graph,
                persistEdge.from,
                graphId,
                closure,
                useExisting,
              ),
              nodeGraphId + "valmappersist",
              useExisting,
            );
          const publishEdge = edgesIn.find((e) => e.as === "publish");
          const publishNode =
            publishEdge &&
            this.valueMap(
              this.fromNodeInternal(
                graph,
                publishEdge.from,
                graphId,
                closure,
                useExisting,
              ),
              nodeGraphId + "valmappublish",
              useExisting,
            );
          const listenerEdge = edgesIn.find((e) => e.as === "listener");
          const listenerNode =
            listenerEdge &&
            (this.valueMap(
              this.fromNodeInternal(
                graph,
                listenerEdge.from,
                graphId,
                closure,
                useExisting,
              ),
              nodeGraphId + "valmaplistener",
              useExisting,
            ) as AnyNode<Function>);

          const shareEdge = edgesIn.find((e) => e.as === "share");
          const shareNode =
            shareEdge &&
            this.valueMap(
              this.fromNodeInternal(
                graph,
                shareEdge.from,
                graphId,
                closure,
                useExisting,
              ),
              nodeGraphId + "valmapshare",
              useExisting,
            );

          const scope = this.scope;
          this.varNode<T>(
            undefined,
            undefined,
            nodeGraphId + "-refset",
            true,
            true,
            true
          );

          return this.mapNode(
            {
              persistNode,
              publishNode,
              listenerNode,
              shareNode,
            },
            ({
              persistNode: persist,
              publishNode: publish,
              listenerNode: listener,
              shareNode: share,
            }) =>
              wrapPromise(persist ? this.store.persist.get(nodeGraphId) : undefined)
                .then(
                  (persisted) =>
                    persisted ??
                    wrapPromise(initialNode && this.runNode(initialNode)),
                )
                .then((initial) => {
                  const setNode = scope.get(nodeGraphId + "-refset");
                  const stateId = share ? "__shared_" + share : nodeGraphId;
                  if (
                    share &&
                    this.store.state.get(stateId)?.value !== undefined
                  ) {
                    setNode.value.write(this.store.state.get(stateId)?.value);
                  } else if (initial !== undefined) {
                    setNode.value.write(initial);
                    this.store.state.set(stateId, { value: initial });
                    if (listener) listener({ value: initial });
                  }

                  if (publish || share) {

                    nolib.no.runtime.addListener(
                      stateId + "-argsupdate",
                      this.id + "-" + stateId,
                      ({ id, changes, source, timeModified }) => {
                        const currentTimeModified = this.store.state.get(nodeGraphId + "-timeModified")?.timeModified;
                        if(!currentTimeModified || currentTimeModified < timeModified) {
                        if (publish && id === nodeGraphId) {
                          if (listener) listener({ value: changes.state });
                          if (
                            !(
                              source.type === "var" &&
                              source.clientId === clientId &&
                              source.id === this.id
                            )
                          ) {
                            (
                              scope.get(nodeGraphId + "-refset") as VarNode<T>
                            ).set(changes.state);
                            if (persist) {
                              this.store.persist.set(
                                nodeGraphId,
                                changes.state,
                              );
                            }
                          }
                        }
                        else if(share && id !== nodeGraphId) {

                          if (listener) listener({ value: changes.state });
                            (
                              scope.get(nodeGraphId + "-refset") as VarNode<T>
                            ).set(changes.state);
                            if (persist) {
                              this.store.persist.set(
                                nodeGraphId,
                                changes.state
                              );
                            }
                        }
                      }
                    })
                  }

                  this.watches.set(setNode.id, []);
                  this.addWatchFn(setNode, value => {
                    if (
                      value !== undefined
                    ) {
                      
                      const timeModified = performance.now();
                      this.store.state.set(nodeGraphId + "-timeModified", {timeModified});
                      if (share) {
                        this.store.state.set(stateId, { value });
                      }
                      if (persist) {
                        this.store.persist.set(nodeGraphId, value);
                      }
                      if (publish || share) {
                        nolib.no.runtime.publish(
                          stateId + "-argsupdate",
                          {
                            id: nodeGraphId,
                            changes: { state: value},
                            mutate: false,
                            source: {
                              id: this.id,
                              clientId,
                              type: "var",
                            },
                            timeModified 
                          },
                          nolibLib,
                          {},
                          true,
                        );
                      }
                    }
                  })


                  return extraNodeGraphId === "display"
                    ? {
                        dom_type: "div",
                        props: {},
                        children: [
                          {
                            dom_type: "text_value",
                            text: JSON.stringify(
                              setNode.value.read() && setNode.value.read(),
                            ),
                          },
                        ],
                      }
                    : setNode;
                    
                   /* {
                        __kind: "varNode",
                        id: nodeGraphId,
                        get value() {
                          if (
                            share &&
                            setNode.value.read() !==
                              runtime.store.state.get(stateId)?.value
                          ) {
                            setNode.value.write(
                              runtime.store.state.get(stateId)?.value,
                            );
                          }
                          return setNode as VarNode<T>;
                        },
                        set: (t: { value: T } | T) => {
                          if (
                            (t as { value: T })?.value !== undefined ||
                            t !== undefined
                          ) {
                            const setNode = scope.get(nodeGraphId + "-refset");
                            const value: T =
                              typeof t === "object" && Object.hasOwn(t, "value")
                                ? (t as { value: T }).value
                                : (t as T);
                            (setNode as VarNode<T>).set(value);
                            if (share) {
                              runtime.store.state.set(stateId, { value });
                            }
                            if (persist) {
                              runtime.store.persist.set(nodeGraphId, value);
                            }
                            if (publish) {
                              nolib.no.runtime.publish(
                                "argsupdate",
                                {
                                  id: nodeGraphId,
                                  changes: { state: value },
                                  mutate: false,
                                  source: {
                                    id: this.id,
                                    clientId,
                                    type: "var",
                                  },
                                },
                                nolibLib,
                                {},
                                true,
                              );
                            }
                            return value;
                          }

                          return scope
                            .get(nodeGraphId + "-refset")
                            .value.read();
                        },
                      };*/
                }).value,
            () => false,
            nodeGraphId + extraNodeGraphId,
            useExisting,
          ) as AnyNode<T>;
        } else if (
          refNode.value === "extern.readReference" ||
          refNode.value === "extern.memoryUnwrap"
        ) {
          if (extraNodeGraphId === "metadata") {
            return this.constNode(
              {
                parameters: {
                  reference: {
                    type: "arg",
                    default: true
                  },
                },
              },
              nodeGraphId + extraNodeGraphId,
              useExisting,
            ) as AnyNode<T>;
          }
          return this.mapNode(
            {
              ref: this.bindNode(
                { reference: calculateInputs()["reference"] },
                ({ reference }) => (reference as AnyNode<T> ),
                undefined,
                nodeGraphId + "-bindreadref",
                useExisting,
              ),
            },
            ({ ref }) => {
              const result = ref?.value?.read() as T;
              if ((result as Nothing)?.__kind === "nothing") return undefined;
              else return result;
            },
            undefined,
            nodeGraphId,
            useExisting,
          );
        } else if (refNode.value === "extern.frame") {
          const varNode: VarNode<T> = this.varNode(
            1 as T,
            undefined,
            nodeGraphId,
            useExisting,
          );
          const update = () => {
            varNode.set(((varNode.value.read() as number) + 1) as T);
            if (this.scope.get(nodeGraphId) === varNode) {
              requestAnimationFrame(update);
            }
          };
          requestAnimationFrame(update);
          return varNode;
        } else if (refNode.value === "extern.time") {
          const varNode: VarNode<T> = this.varNode(
            1 as T,
            undefined,
            nodeGraphId,
            useExisting,
          );
          const update = (time) => {
            varNode.set((time * 0.001 * ((node.value as unknown as number) ?? 1)) as T);
            if (this.scope.get(nodeGraphId) === varNode) {
              requestAnimationFrame(update);
            }
          };
          requestAnimationFrame(update);
          return varNode;
        } else if (refNode.value === "extern.runNode") {
          const nodeNode = this.valueMap(
            this.fromNodeInternal(
              graph,
              edgesIn.find((e) => e.as === "node").from,
              graphId,
              closure,
              useExisting,
            ),
            nodeGraphId + "-nodenode",
            useExisting,
          ) as AnyNode<AnyNode<T>>;
          return this.runNodeNode(nodeNode, nodeGraphId, useExisting);
        } else if (refNode.value === "extern.nodeDisplay") {
          return wrapPromise(
            this.fromNodeInternal(graph, node.value, graphId, closure, true),
            (e) => {
              console.error("error in nodeDisplay", e);
              handleError(e, nodeGraphId);
            },
          ).then((targetNode) =>
            this.accessor(
              targetNode,
              "display",
              nodeGraphId + "-accessnodedisplay",
              useExisting,
            ),
          ).value as AnyNode<T>;
        } else if (refNode.value === "extern.workerRunnable") {
          return this.constNode(
            {
              graph: graph.id,
              fn: edgesIn.find((e) => e.as === "graph").from,
              nodeGraphId: appendGraphId(
                graph.id,
                edgesIn.find((e) => e.as === "graph").from,
              ),
            },
            nodeGraphId,
            useExisting,
          ) as AnyNode<T>;
        } else if (refNode.value === "extern.create_fn") {
          const idEdge = edgesIn.find(
            (e) => e.as === "function" || e.as === "runnable" || e.as === "fn",
          );
          const fnNode = this.fromNodeInternal(
            graph,
            idEdge.from,
            graphId,
            closure,
            useExisting,
          );
          return this.runNodeNode(
            this.bindNode(
              { closure, fn: fnNode },
              ({ closure, fn }) =>
                this.mapNode(
                  { ...closure },
                  (closure) =>
                    create_fn(
                      graph,
                      idEdge.from,
                      nodeGraphId,
                      closure,
                      this.lib,
                    ),
                  undefined,
                  appendGraphId(nodeGraphId, "-generatedFn"),
                  useExisting,
                ) as AnyNode<T>,
              undefined,
              appendGraphId(nodeGraphId, "-bindclosure"),
              useExisting,
            ),
            nodeGraphId,
            useExisting,
          ) as AnyNode<T>;
        } else if (refNode.value === "extern.html_element") {
          if (extraNodeGraphId === "metadata" && this.lib.domTypes) {
            const el = this.lib.domTypes[node.value ?? "div"];
            const defaultAttrs = this.lib.domTypes.defaults;
            return this.constNode<T>(
              {
                values: Object.keys(this.lib.domTypes).filter(
                  (k) => k !== "defaults",
                ),
                parameters: {
                  children: "@html.html_element",
                  props: {
                    type:
                      el?.attrs &&
                      Object.fromEntries(
                        el.attrs
                          .concat(defaultAttrs[el.spec])
                          .map((n) => (Array.isArray(n) ? n : [n, "any"]))
                          .concat([
                            [
                              "style",
                              {
                                type: Object.fromEntries(
                                  defaultAttrs["css"].map((a) =>
                                    Array.isArray(a) ? a : [a, "any"],
                                  ),
                                ),
                              },
                            ],
                          ])
                          .concat([
                            [
                              "onref",
                              {
                                type: "@flow.runnable",
                                runnableParameters: ["ref"],
                              },
                            ],
                          ]),
                      ),
                  },
                },
              } as T,
              nodeGraphId + extraNodeGraphId,
              useExisting,
            );
          }
          return this.mapNode(
            calculateInputs(),
            (el) => {
              const { dom_type, children, props, value } =
                el as unknown as GenericHTMLElement;
              return {
                dom_type: dom_type ?? node.value ?? "div",
                children: (Array.isArray(children) ? children : [children])
                  .filter((v) => v)
                  .map((child) =>
                    typeof child === "string"
                      ? { dom_type: "text_value", text: child }
                      : child,
                  ),
                props: props ?? {},
                value,
                ref:
                  typeof props?.onref === "function"
                    ? (ref) => props.onref({ ref })
                    : undefined,
              } as T;
            },
            undefined,
            nodeGraphId + extraNodeGraphId,
            useExisting,
          );
        } else if (refNode.value === "extern.data") {
          return this.mapNode(
            calculateInputs(),
            (args) => args as unknown as T,
            undefined,
            nodeGraphId,
            useExisting
          );
        } else {
          if (extraNodeGraphId === "metadata") {
            const libExternFn =
              refNode.value.startsWith("extern.") && refNode.value.substring(7);
            const extern = libExternFn
              ? this.lib.extern[libExternFn]
              : get(this.lib, refNode.value);
            return this.constNode(
              {
                parameters: Array.isArray(extern?.args)
                  ? Object.fromEntries(extern.args.map((v) => [v, "any"]))
                  : extern?.args,
              },
              nodeGraphId + extraNodeGraphId,
              useExisting,
            ) as AnyNode<T>;
          }
          const inputs = calculateInputs();
          const systemValues = this.accessor(closure, "__parent_graph_value", appendGraphId(nodeGraphId + extraNodeGraphId, "-extern-system-values"), useExisting);
          return this.mapNode(
            { ...inputs, systemValues },
            (nodeArgs) =>
              wrapPromise(
                node_extern(
                  refNode,
                  new Map(
                    Object.entries(nodeArgs)
                      .filter(e => e[0] !== "systemValues" && !e[0].startsWith("_"))
                      .concat([["__graph_value", nodeArgs.systemValues]])
                  ),
                  newLib(this.lib),
                  {},
                ),
              ).value,
            undefined,
            nodeGraphId + extraNodeGraphId,
            useExisting,
          );
        }
      } else if (refNode.ref === "arg") {
        const argname = refNode.value && parseArg(refNode.value).name;
        const isAccessor = argname?.includes(".");
        const libNode = this.constNode(this.lib, "runtime-lib", true);
        const graphIdNode = this.constNode(
          graphId,
          `${nodeGraphId}-internalnodegraphid`,
          false,
        );
        if (extraNodeGraphId === "metadata") {
          const keys = ["__graph_value"];
          const edgeChain = [];
          const walkEdges = (edges: Edge[], ty: any) => {
            return !ty || edges.length === 0 || ty.type === "@flow.runnable"
              ? ty
              : walkEdges(
                  edges.slice(1),
                  typeof ty.type === "object"
                    ? ty.type[edges[0].as]
                    : ty[edges[0].as],
                );
          };
          const descGraph = descendantGraph(node.id, graph, (nodeId, edge) => {
            edgeChain.push(edge);
            const outEdgeChain = [...edgeChain];
            outEdgeChain.reverse();
            const descNode = graph.nodes[nodeId];
            const dataNode =
              nodeId &&
              isNodeRef(descNode) &&
              descNode.ref === "return" &&
              edge.as !== "lib" &&
              edge.as !== "args"
                ? graph.nodes[
                    nodeEdgesIn(graph, nodeId).find((e) => e.as === "args")
                      ?.from
                  ]
                : nodeId &&
                    isNodeRef(descNode) &&
                    descNode.ref === "@flow.runnable"
                  ? graph.nodes[
                      nodeEdgesIn(graph, nodeId).find(
                        (e) => e.as === "parameters",
                      )?.from
                    ]
                  : false;

            if (dataNode) {
              if (
                (nodeEdgesIn(graph, nodeId) &&
                  !(isNodeRef(dataNode) && dataNode.value === undefined)) ||
                (isNodeRef(dataNode) &&
                  ((dataNode.ref === "extern" &&
                    dataNode.value === "extern.data") ||
                    dataNode.ref === "@data.object"))
              ) {
                nodeEdgesIn(graph, nodeId)
                  .map((e) => e.as)
                  .forEach((k) => keys.push(k));
              }
            }
            return outEdgeChain;
          });

          return this.mapNode(
            Object.fromEntries(
              Object.entries(descGraph)
                .filter((e) => e[1])
                .map((e) =>
                  // all descendants will have been created already
                  [
                    e[0],
                    this.accessor(
                      this.fromNode(graph, e[0]) as NodeOutputsU,
                      "metadata",
                      nodeGraphId + e[0] + "-metadata",
                      true,
                    ),
                  ],
                ),
            ),
            (metadatas) => {
              // have to reduce to get all the inedge stuff
              return {
                values: Object.entries(metadatas)
                  .map((metadataEntry) => {
                    const inEdge = descGraph[metadataEntry[0]][0];
                    const inEdgeType = walkEdges(
                      descGraph[metadataEntry[0]],
                      (metadataEntry[1] as any)?.parameters,
                    );
                    return (
                      (inEdgeType?.type === "@flow.runnable" &&
                        inEdgeType.runnableParameters) ||
                      []
                    );
                  })
                  .filter((v) => v)
                  .flat(),
              } as T;
            },
            undefined,
            nodeGraphId + extraNodeGraphId,
            useExisting,
          );
        }
        if (!argname) {
          return this.constNode(
            undefined,
            nodeGraphId + extraNodeGraphId,
            useExisting,
          );
        }
        let isargsdata  = false;

        const mnode = this.mapNode(
          {
            bound: this.bindNode(
              { closure },
              ({ closure: innerClosure }): AnyNode<unknown> => {
                if (!argname) return;
                if (argname === "_argsdata") {
                  // Object.values(argsdata).map(argnode => argnode && this.outputs.get(argnode.id).add(mnode.id))
        return this.mapNode(
          {
            bound: this.bindNode(
              { closure },
              ({ closure: innerClosure }: { closure: AnyNodeMap<S> }) => {
                const argsdataout = 
                this.mapNode(
                  Object.fromEntries(Object.entries(innerClosure).filter(kv => !kv[0].startsWith("_"))),
                  (innerInnerClosure) => innerInnerClosure as S[keyof S],
                  undefined,
                  nodeGraphId + "-argsdatamap",
                  useExisting,
                )
                return argsdataout
              },
              undefined,
              nodeGraphId + "-argsdata",
              useExisting,
            ),
          },
          ({ bound }) => this.runNode(bound),
          undefined,
          nodeGraphId + "-argsdataouterbind",
          useExisting,
        );
                }

                return argname === "_args"
                    ? closure
                    : argname.startsWith("_lib")
                      ? libNode
                      : argname === "__graphid"
                        ? graphIdNode
                        : isAccessor
                          ? innerClosure[
                              argname.substring(0, argname.indexOf("."))
                            ]
                          : innerClosure[argname];
              },
              undefined,
              nodeGraphId + "-bind",
              useExisting,
            ),
          },
          ({ bound }) => {
            return wrapPromise(this.runNode(bound)).then(
              (res) =>
                (res !== undefined && !isNothing(res)
                  ? isAccessor
                    ? get(res, argname.substring(argname.indexOf(".") + 1))
                    : res
                  : undefined) as T,
            ).value;
          },
          undefined,
          nodeGraphId,
          useExisting,
        );

        return mnode;
      } else if (isGraph(nodeRef)) {
        const inputs = calculateInputs();
        const graphvalue = this.accessor(
                  closure,
                  "__parent_graph_value",
                  `${nodeGraphId}-${extraNodeGraphId}-internalnodegraphvalue`,
                  useExisting,
                );
        const innerGraphNode = this.accessor(
          this.fromNodeInternal(
            nodeRef,
            nodeRef.out ?? "out",
            nodeGraphId,
            // this.mapNode({graphvalue, ...inputs}, (args) => this.constNode(args, nodeGraphId + "-innergraphclosure", useExisting), undefined, appendGraphId(nodeGraphId, "-graphclosure"), useExisting),
            this.constNode(
              {
                ...inputs,
                __graph_value: graphvalue,
              },
              nodeGraphId + "-args",
              false,
            ),
            useExisting,
          ),
          extraNodeGraphId,
          nodeGraphId + "-innergraphnodeval",
          useExisting,
        );

        const res = this.mapNode(
          {
            bound: this.bindNode(
              {},
              () => innerGraphNode,
              undefined,
              nodeGraphId + extraNodeGraphId + "-graphoutbind",
              useExisting,
            ),
          },
          ({ bound }) => this.runNode(bound) as T,
          undefined,
          nodeGraphId + extraNodeGraphId,
          useExisting,
        );
        return res;
      } else {
        return this.dereference(
          graph,
          node,
          edgesIn,
          graphId,
          nodeGraphId,
          closure,
          calculateInputs,
          extraNodeGraphId,
          useExisting,
          nodeRef,
        ) as AnyNode<T>;
      }
    }).value;
  }
}