// Node constructor functions and utilities

import { v4 as uuid } from "uuid";
import { 
  State, 
  VarNode, 
  MapNode, 
  BindNode, 
  AnyNode, 
  isConstNode,
  isVarNode,
  isMapNode,
  isBindNode,
  isNode
} from "./node-types";
import { ConstNode } from "./types";

const NAME_FIELD = new Set(["name"]);

export function compareObjectsNeq(value1: any, value2: any) {
  const keys1 = Object.keys(value1);
  const keys2 = Object.keys(value2);

  if (keys1.length !== keys2.length) {
    return true;
  }

  for (const key of keys1) {
    if (value1[key] === value2[key]) {
      continue;
    }

    return true;
  }

  return false;
}

const mapEntries = <
  T extends Record<string, unknown>,
  S extends Record<string, unknown>,
>(
  v: T,
  f: (e: [string, T["string"]]) => S[keyof S],
): S =>
  Object.fromEntries(
    Object.entries(v)
      .filter((e) => e[1])
      .map((e: [string, unknown]) => [e[0], f(e as [string, T["string"]])]),
  ) as S;

const nothingValue: any = { __kind: "nothing" };
const chainNothing = <T, S>(a: any, fn: (a: T) => S): any =>
  a?.__kind === "nothing" ? a : fn(a);

export class Scope {
  private nodes: Map<string, any> = new Map();
  
  constructor() {}
  
  add(node: any) {
    this.nodes.set(node.id, node);
  }
  
  get<T>(id: string) {
    return this.nodes.get(id) as any;
  }
  
  has(id: string) {
    return this.nodes.has(id);
  }
  
  count() {
    return this.nodes.size;
  }
  
  findKeys(id: string) {
    return Array.from(this.nodes.keys()).filter((k) => k.startsWith(id));
  }
  
  removeAll(id: string) {
    for (const k of Array.from(this.nodes.keys())) {
      if (
        k &&
        k.startsWith(id) &&
        k !== id + "-graphnode" &&
        k !== id + "-boundNode"
      ) {
        this.nodes.delete(k);
      }
    }
  }
}

export const constNode = <T>(a: T, id?: string): any => ({
  __kind: "const" as const,
  id: id ?? uuid(),
  value: new State(a),
  compute: () => a,
  dependencies: [],
});

export const varNode = <T>(
  set: (value: T) => void,
  compare: (a: T, b: T) => boolean = (a, b) => a === b,
  id?: string,
): VarNode<T> => ({
  __kind: "var" as const,
  id: id ?? uuid(),
  value: new State(),
  set,
  compare,
});

export const mapNode = <T, S extends Record<string, unknown>>(
  inputs: { [k in keyof S]: AnyNode<S[k]> },
  fn: (s: S) => T,
  isStale: (previous: S, next: S) => boolean,
  id?: string,
): MapNode<T, S> => ({
  __kind: "map" as const,
  id: id ?? uuid(),
  value: new State(),
  fn: new State(fn),
  cachedInputs: new State(),
  isStale,
  inputs: mapEntries(inputs, (e) => e[1].id),
  isDirty: new State(false),
});

export const bindNode = <
  R,
  T extends AnyNode<R> | AnyNode<R>,
  S extends Record<string, unknown>,
>(
  inputs: { [k in keyof S]: AnyNode<S[k]> },
  fn: (inputs: S) => T | PromiseLike<T>,
  isStale = (p: any, n: any) => true,
  id?: string,
): BindNode<T, S> =>
  ({
    __kind: "bind" as const,
    id: id ?? uuid(),
    value: new State(),
    fn,
    cachedInputs: new State(),
    inputs: mapEntries(inputs, (e) => e[1].id),
    isStale,
    isDirty: new State(false),
  }) as BindNode<T, S>;

export const handleError = (e: Error, nodeGraphId: string) => {
  console.error(e);
};

export { mapEntries, nothingValue, chainNothing, NAME_FIELD };