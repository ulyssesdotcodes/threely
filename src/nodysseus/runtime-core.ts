// Core runtime class with basic node management

import { v4 as uuid } from "uuid";
import { 
  State, 
  VarNode, 
  MapNode, 
  BindNode, 
  AnyNode,
  isNothing,
  isNothingOrUndefined,
  isVarNode,
  isConstNode,
  isMapNode,
  isBindNode,
  NodeOutputsU,
  outputs,
  Output
} from "./node-types";
import { Graph, Edge } from "./types";
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
import { ExternalNodeHandler } from "./external-nodes";
import {
  appendGraphId,
  compareObjects,
  wrapPromise,
  wrapPromiseAll,
  newLib
} from "./util";

export class NodysseusRuntime {
  public scope: Scope = new Scope();
  private _outputReturns: Map<string, string> = new Map();
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
        for (const output of outputs) {
          this.watches.get(id)?.forEach((fn) => {
            fn(this.runNode(this.scope.get(id), output));
          });
        }
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

  private fromNodeInternal<T, D, M, S extends Record<string, unknown>>(
    graph: Graph,
    nodeId: string,
    graphId: string,
    graphClosure?: any,
    useExisting: boolean = true,
  ): any {
    // Simplified implementation - just return a constant node
    const nodeGraphId = appendGraphId(graphId, nodeId);
    if (useExisting && this.scope.has(nodeGraphId + "-boundNode"))
      return this.scope.get(nodeGraphId + "-boundNode");

    const result = this.constNode(
      {
        value: this.constNode(undefined, nodeGraphId + "-value", false),
        display: this.constNode(undefined, nodeGraphId + "-display", false),
        metadata: this.constNode(undefined, nodeGraphId + "-metadata", false),
        graphId,
        nodeId,
      },
      nodeGraphId + "-boundNode",
      useExisting
    );

    return result;
  }

  runNode<T>(
    innode: any,
    _output?: "display" | "value" | "metadata",
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
    _output?: "display" | "value" | "metadata",
  ): any {
    return wrapPromise(node).then((node) => {
      const nodeid = typeof node === "string" ? node : node.id;
      const resolvedNode = this.scope.get(nodeid);
      const res = resolvedNode && this.runNode(resolvedNode);

      return res && !isNothing(res) && wrapPromise(res).value;
    }).value;
  }
}