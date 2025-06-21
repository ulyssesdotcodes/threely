import { Args, Edge, Graph, NodysseusNode, Lib, Env, SavedGraph, FullyTypedArg } from "./types";
export declare const WRAPPED_KIND = "wrapped";
type WrappedKind = "wrapped";
export declare const ispromise: <T>(a: any) => a is Promise<T>;
export declare const isWrappedPromise: <T>(a: any) => a is WrappedPromise<T>;
export declare const isgraph: (g: any) => boolean;
export type WrappedPromise<T> = {
    __kind: WrappedKind;
    then: <S>(fn: (t: FlattenPromise<T>) => S | WrappedPromise<S>) => WrappedPromise<S>;
    value: T;
};
type FlattenWrappedPromise<T> = T extends WrappedPromise<infer Item> ? Item : T;
export declare const wrapPromise: <T, S>(t: T | PromiseLike<T>, c?: (e: Error) => S) => WrappedPromise<FlattenWrappedPromise<T>>;
export declare const wrapPromiseAll: <T>(wrappedPromises: Array<WrappedPromise<T> | T>, c?: (e: Error) => T) => WrappedPromise<Array<any> | Promise<Array<any>>>;
export declare const wrapPromiseReduce: (previousValue: any, arr: any[], fn: (args: {
    previousValue: any;
    currentValue: any;
    index: number;
}) => any, index: number) => any;
export type IfPromise<T, S> = T extends Promise<infer _> ? S : Promise<S>;
export type FlattenPromise<T> = T extends Promise<infer Item> ? Item : T;
export declare class NodysseusError extends Error {
    cause: {
        node_id: string;
    };
    constructor(node_id: string, ...params: any[]);
}
export declare const base_node: (node: any) => any;
export declare const base_graph: (graph: any) => any;
export declare const create_randid: (graph: Graph) => any;
type FlattenedGraph = {
    flat_nodes: Record<string, NodysseusNode>;
    flat_edges: Record<string, Edge>;
};
export declare const flattenNode: (graph: NodysseusNode, levels?: number) => FlattenedGraph | NodysseusNode;
export declare const expand_node: (data: {
    nolib: Record<string, any>;
    node_id: string;
    editingGraph: Graph;
}) => {
    editingGraph: Graph;
    selected: Array<string>;
};
export declare const contract_node: (data: {
    editingGraph: Graph;
    node_id: string;
    nolib: any;
}) => {
    editingGraph: Graph;
    selected: string[];
} | {
    selected: string[];
    editingGraph?: undefined;
};
export declare const parseArg: (arg: string) => FullyTypedArg & {
    name: string;
};
export declare const ancestor_graph: (node_id: string, from_graph: Graph | SavedGraph, _nolib?: Record<string, any>) => Graph;
export declare const descendantGraph: <T>(nodeId: string, graph: Graph, traverse: (nodeId: string, edgeIn: Edge) => T) => Record<string, T>;
export declare const newEnv: (data: Args, _output?: any, env?: Env) => Env;
export declare const combineEnv: (data: Args, env: Env, node_id?: string, _output?: string) => Env;
export declare const newLib: (data: any) => Lib;
export declare const mergeLib: (a: Record<string, any> | Lib, b: Lib) => Lib;
export declare function compareObjects(value1: any, value2: any, isUpdate?: boolean, excludedFields?: Set<string>): boolean;
export declare function set_mutable(obj: any, propsArg: any, value: any): boolean;
export declare const bfs: (graph: Graph, fn: (id: string, level: number) => void) => (id: string, level: number) => void;
export declare const handleError: (e: any, lib: any, graph: any, node: any, graphid: string) => any;
export declare const appendGraphId: (graphId: string, nodeId: string) => string;
export declare const nodeEdgesIn: (graph: Graph, nodeId: string) => Edge[];
export {};
