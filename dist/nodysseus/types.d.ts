export type NodysseusNode = GraphNode | ValueNode | RefNode;
type BaseNode = {
    id: string;
    name?: string;
    category?: string;
};
export type GraphNode = Graph & {
    value?: any;
    category?: string;
};
export type ValueNode = BaseNode & {
    value?: string;
};
export type RefNode = BaseNode & {
    ref: string;
    value?: string | Function;
};
export declare const isNodeValue: (n: NodysseusNode) => n is ValueNode;
export declare const isNodeGraph: (n: NodysseusNode) => n is GraphNode;
export declare const isNodeRef: (n: NodysseusNode) => n is RefNode;
export declare const compareNodes: (a: NodysseusNode, b: NodysseusNode) => boolean;
export type SavedGraph = {
    id: string;
    out?: string;
    name?: string;
    nodes: Record<string, NodysseusNode>;
    edges: Record<string, Edge>;
    description?: string;
};
export type Graph = SavedGraph & {
    edges_in?: Record<string, Record<string, Edge>>;
};
export type ExportedGraph = {
    graphs: Array<Graph>;
    state: Record<string, unknown>;
};
export declare const isGraph: (graph: any) => graph is Graph;
export declare const isEdgesInGraph: (graph: Graph | SavedGraph) => graph is Graph;
export declare const isExportedGraph: (g: ExportedGraph | unknown) => g is ExportedGraph;
export type EdgesIn = Record<string, Record<string, Edge>>;
export type Edge = EdgeNoAs & {
    as: string;
};
export type EdgeNoAs = {
    to: string;
    from: string;
};
export type Store<T> = {
    get: (id: string) => T | undefined | Promise<T | undefined>;
    set: (id: string, data: T) => T | Promise<T>;
    delete: (id: string) => void;
    clear: () => void;
    keys: () => Array<string> | Promise<Array<string>>;
};
export type RefStore = Store<Graph> & {
    addFromUrl: (url: string) => Array<Graph> | Promise<Array<Graph>>;
    add_node: (graphId: string, node: NodysseusNode) => Graph | Promise<Graph>;
    add_nodes_edges: (updates: {
        graphId: string;
        addedNodes?: NodysseusNode[];
        addedEdges?: Edge[];
        removedNodes?: NodysseusNode[];
        removedEdges?: Array<{
            [k in Exclude<keyof Edge, "as">]: Edge[k];
        }>;
    }) => Graph | Promise<Graph>;
    remove_node: (graphId: string, node: NodysseusNode) => Graph | Promise<Graph>;
    add_edge: (graphId: string, edge: Edge) => Graph | Promise<Graph>;
    remove_edge: (graphId: string, edge: Edge) => Graph | Promise<Graph>;
    undo?: false | ((id: string) => undefined | Graph | Promise<Graph>);
    redo?: false | ((id: string) => undefined | Graph | Promise<Graph>);
};
export type StoreType<T extends Store<any>> = Exclude<ReturnType<T["get"]>, undefined | Promise<any>>;
export type NodysseusStoreTypes = {
    [k in keyof NodysseusStore]: StoreType<NodysseusStore[k]>;
};
export type NodysseusStore = {
    refs: RefStore;
    parents: Store<{
        parent: string;
        parentest: string;
        nodeRef?: string;
    }>;
    state: Store<any>;
    persist: Store<any>;
    fns: Store<{
        script: string;
        fn: Function;
    }>;
    assets: Store<Blob>;
};
export type LokiT<T> = {
    id: string;
    data: T;
};
export type Lib = {
    __kind: "lib";
    data: Record<string, any>;
};
export declare const isLib: (lib: any) => lib is Lib;
export type Env = {
    __kind: "env";
    data: Args;
    _output?: string;
    env?: Env;
    node_id?: string;
};
export declare const isEnv: (env: any) => env is Env;
export type ApFunction = {
    __kind: "apFunction";
    fn: Function;
    args: Array<string>;
    promiseArgs?: boolean;
    rawArgs?: boolean;
    outputs?: {
        lib?: boolean;
        display?: boolean;
    };
};
export type Extern = {
    args: Array<string | FullyTypedArg> | Record<string, string | FullyTypedArg>;
    fn: Function;
};
export type NodeArg = {
    exists: boolean;
    name: string;
} & Partial<FullyTypedArg>;
export type Args = Map<string, unknown>;
export type ResolvedArgs = Map<string, unknown>;
export declare const isArgs: (args: any) => args is Args;
export type RunOptions = {
    profile?: boolean;
    resolvePromises?: boolean;
    timings?: Record<string, number>;
};
type _BaseFullyTypedArg = {
    type: string | Record<string, string | FullyTypedArg | ((graph: Graph, nodeId: string) => FullyTypedArg)>;
    default?: boolean;
    additionalArg?: boolean;
    local?: boolean;
};
type _RunnableTypedArg = _BaseFullyTypedArg & {
    type: "@flow.runnable";
    runnableParameters: Array<string>;
};
export type FullyTypedArg = _BaseFullyTypedArg | _RunnableTypedArg;
export declare const isRunnableTypedArg: (a: FullyTypedArg) => a is _RunnableTypedArg;
export type TypedArg = string | FullyTypedArg;
export declare const isTypedArg: (a: any) => a is TypedArg;
export type NodeMetadata = {
    parameters?: Array<string>;
    values?: Array<string>;
    dataLabel?: string;
    codeEditor?: {
        language?: "javascript" | "json" | "markdown" | false;
        onChange?: Function;
        editorText?: string;
    };
};
export type MemoryState<T = any> = {
    __kind: "state";
    id: string;
    set: ApFunction;
    state: T;
};
export type MemoryReference<T = any> = {
    __kind: "reference";
    id: string;
    set: ApFunction;
    value: T;
};
export declare class MemoryCache<T = any> {
    private recacheFn;
    private valueFn;
    __kind: string;
    private cachedValue;
    constructor(recacheFn: (value: T) => boolean, valueFn: () => T);
    recache(): boolean;
    value(): T;
}
export type Memory<T> = MemoryState<T> | MemoryReference<T> | MemoryCache<T>;
export declare const isMemory: (v: any) => boolean;
export type GenericHTMLElement = {
    dom_type: string;
    children: Array<GenericHTMLElement>;
    props: {
        onref: (el: any) => void;
    } & Record<string, unknown>;
    value: any;
};
export type GenericHTMLText = {
    dom_type: "text_value";
    text: string;
};
export type GenericHTMLNode = GenericHTMLElement | GenericHTMLText;
/**
 * Interface representing a Node in the graph.
 * @template T - The type of value this node computes
 */
export interface Node<T> {
    id: string;
    compute: () => T;
    dependencies: Node<any>[];
}
/**
 * A constant node that always returns the same value
 */
export type ConstNode<T> = Node<T> & {
    value: T;
};
/**
 * A mapped node that transforms the output of another node
 */
export type MappedNode<T, U> = Node<U> & {
    sourceNode: Node<T>;
    transform: (value: T) => U;
};
/**
 * Type helper to extract the value type from a Node
 */
export type NodeValue<N> = N extends Node<infer T> ? T : never;
/**
 * Create a constant node that always returns the same value
 */
export declare function constNode<T>(value: T): ConstNode<T>;
/**
 * The map function with type (A => B) => Node<A> => Node<B>
 *
 * @param fn - Function to transform value A to value B
 * @returns A function that transforms Node<A> to Node<B>
 */
export declare function map<A, B>(fn: (a: A) => B): (node: Node<A>) => Node<B>;
/**
 * Execute a node and return its computed value
 * @param node - The node to execute
 * @returns The computed value
 */
export declare function runNode<T>(node: Node<T>): T;
export type GraphNodeNode = {
    node: NodysseusNode;
    edgesIn: Array<Edge>;
    graph: Graph;
    previous?: NodysseusNode;
};
export { PubSubManager, globalPubSub, type PubSubMessage, type PubSubSubscriber } from './pubsub-manager';
