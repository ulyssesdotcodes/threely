// Type definitions for the Nodysseus runtime system

export type RUnknown = Record<string, unknown>;
export type Output = "value" | "display" | "metadata";
export type NodeKind = "const" | "var" | "map" | "bind";
export type Nothing = { __kind: "nothing" };

export class State<T = any> {
  private _value: T;
  
  constructor(value?: T) {
    this._value = value as T;
  }
  
  read(): T {
    return this._value;
  }
  
  write(value: T): void {
    this._value = value;
  }
}

export type VarNode<T> = {
  __kind: "var";
  id: string;
  value: State<T>;
  set: (value: T) => void;
  compare: (a: T, b: T) => boolean;
};

export type MapNode<T, S extends Record<string, unknown>> = {
  __kind: "map";
  id: string;
  value: State<T>;
  fn: State<(s: S) => T>;
  cachedInputs: State<S>;
  isStale: (previous: S, next: S) => boolean;
  inputs: Record<keyof S, string>;
  isDirty: State<boolean>;
};

export type BindNode<T, S extends Record<string, unknown>> = {
  __kind: "bind";
  id: string;
  value: State<T>;
  fn: (inputs: S) => T | PromiseLike<T>;
  cachedInputs: State<S>;
  inputs: Record<keyof S, string>;
  isStale: (previous: S, next: S) => boolean;
  isDirty: State<boolean>;
};

export type AnyNode<T> = any; // Simplified for now
export type UnwrapNode<T> = T;
export type AnyNodeMap<T> = Record<string, any>;

export type NodeOutputs<T, D, M> = {
  value: AnyNode<T>;
  display: AnyNode<D>;
  metadata: AnyNode<M>;
  graphId?: string;
  nodeId?: string;
};

export type NodeOutputsU = NodeOutputs<unknown, unknown, unknown>;

// Helper functions for type checking
export const isNothing = (value: any): value is Nothing => value?.__kind === "nothing";
export const isNothingOrUndefined = (value: any): value is Nothing | undefined => 
  value === undefined || isNothing(value);

export const outputs: Output[] = ["value", "display", "metadata"];

// Node type guards
export const isConstNode = <T>(a: any): boolean => a?.__kind === "const";
export const isVarNode = <T>(a: any): boolean => a?.__kind === "var";
export const isMapNode = <T>(a: any): boolean => a?.__kind === "map";
export const isBindNode = <T>(a: any): boolean => a?.__kind === "bind";
export const isNode = <T>(a: any): boolean =>
  a?.__kind === "bind" ||
  a?.__kind === "var" ||
  a?.__kind === "const" ||
  a?.__kind === "map";