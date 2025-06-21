import { AnyNode } from "./node-types";
import { Graph } from "./types";
import { Scope } from "./node-constructors";
export declare class NodysseusRuntime {
    scope: Scope;
    private watches;
    private outputs;
    private inputs;
    private rerun;
    private eventQueue;
    private running;
    private torun;
    private dirtying;
    id: string;
    event: string;
    private store;
    private externalHandler;
    constructor();
    refs(): MapIterator<any>;
    nodeCount(): number;
    createWatch<T>(node: any): AsyncIterable<T>;
    clearWatch(node: any, watch: any): void;
    private addWatchFn;
    private resetOutputs;
    private checkWatch;
    private dirty;
    constNode<T>(v: T, id: string, useExisting?: boolean): any;
    varNode<T>(initial?: T, compare?: (a: T, b: T) => boolean, id?: string, useExisting?: boolean, dirty?: boolean, unwrapValue?: boolean): any;
    addListenerVarNode<T>(nodeGraphId: any, listener: any, stateId?: any): void;
    mapNode<T, S extends Record<string, unknown>>(inputs: {
        [k in keyof S]: any;
    }, fn: (s: S) => T, isStale?: (previous: S, next: S) => boolean, id?: string, useExisting?: boolean): any;
    bindNode<R, T extends AnyNode<R>, S extends Record<string, unknown>>(inputs: {
        [k in keyof S]: any;
    }, fn: (s: S) => T | PromiseLike<T>, id: string, isStale?: (previous: S, next: S) => boolean, useExisting?: boolean): any;
    switchNode<T, S extends Record<string, T>>(key: any, inputs: {
        [k in keyof S]: any;
    }, id: string, useExisting?: boolean): any;
    accessorMap<T, S extends Record<string, unknown>>(map: any, key: string, id: string, useExisting: boolean, isNodeRun?: boolean): any;
    accessor<T, S extends Record<string, unknown>>(map: any, key: string, id: string, useExisting: boolean, isNodeRun?: boolean): any;
    runNodeNode<T>(node: any, nodeGraphId: string, useExisting?: boolean): any;
    fromNode<T, D, M, S extends Record<string, unknown>>(graph: Graph | string, nodeId: string, closure?: any): any;
    private calcNode;
    private fromNodeInternal;
    runNode<T>(innode: any): any;
    runGraphNode<T>(graph: Graph | string, node: string): any;
    run<T>(node: any): any;
    private dereference;
}
