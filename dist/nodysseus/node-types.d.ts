export type RUnknown = Record<string, unknown>;
export type NodeKind = "const" | "var" | "map" | "bind";
export type Node<K extends NodeKind, T = unknown> = {
    __kind: K;
    id: string;
    value: State<T>;
};
export type Nothing = {
    __kind: "nothing";
};
export declare class State<T = any> {
    private _value;
    constructor(value?: T);
    read(): T;
    write(value: T): void;
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
export type AnyNode<T> = Node<NodeKind, T>;
export type UnwrapNode<T> = T;
export type AnyNodeMap<T> = Record<string, any>;
export declare const isNothing: (value: any) => value is Nothing;
export declare const isNothingOrUndefined: (value: any) => value is Nothing | undefined;
export declare const isConstNode: <T>(a: any) => boolean;
export declare const isVarNode: <T>(a: any) => boolean;
export declare const isMapNode: <T>(a: any) => boolean;
export declare const isBindNode: <T>(a: any) => boolean;
export declare const isNode: <T>(a: any) => boolean;
