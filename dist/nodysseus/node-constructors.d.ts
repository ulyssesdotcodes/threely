import { VarNode, MapNode, BindNode, AnyNode } from "./node-types";
declare const NAME_FIELD: Set<string>;
export declare function compareObjectsNeq(value1: any, value2: any): boolean;
declare const mapEntries: <T extends Record<string, unknown>, S extends Record<string, unknown>>(v: T, f: (e: [string, T["string"]]) => S[keyof S]) => S;
declare const nothingValue: any;
declare const chainNothing: <T, S>(a: any, fn: (a: T) => S) => any;
export declare class Scope {
    private nodes;
    constructor();
    add(node: any): void;
    get<T>(id: string): any;
    has(id: string): boolean;
    count(): number;
    findKeys(id: string): string[];
    removeAll(id: string): void;
}
export declare const constNode: <T>(a: T, id?: string) => any;
export declare const varNode: <T>(set: (value: T) => void, compare?: (a: T, b: T) => boolean, id?: string) => VarNode<T>;
export declare const mapNode: <T, S extends Record<string, unknown>>(inputs: { [k in keyof S]: AnyNode<S[k]>; }, fn: (s: S) => T, isStale: (previous: S, next: S) => boolean, id?: string) => MapNode<T, S>;
export declare const bindNode: <R, T extends AnyNode<R> | AnyNode<R>, S extends Record<string, unknown>>(inputs: { [k in keyof S]: AnyNode<S[k]>; }, fn: (inputs: S) => T | PromiseLike<T>, isStale?: (p: any, n: any) => boolean, id?: string) => BindNode<T, S>;
export declare const handleError: (e: Error, nodeGraphId: string) => void;
export { mapEntries, nothingValue, chainNothing, NAME_FIELD };
