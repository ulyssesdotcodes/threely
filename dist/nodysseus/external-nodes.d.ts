import { Graph, RefNode, Edge } from "./types";
export declare const requestAnimationFrame: any;
export declare const externs: any;
export declare class ExternalNodeHandler {
    private runtime;
    constructor(runtime: any);
    handleExternalNode<T>(refNode: RefNode, node: any, edgesIn: Edge[], graph: Graph, graphId: string, nodeGraphId: string, closure: any, calculateInputs: () => any, useExisting?: boolean): any;
    private handleJavaScriptNode;
    private handleReturnNode;
    private handleExternNode;
    private handleFrameExtern;
    private handleSwitchNode;
    private handleMapNode;
    private handleFoldNode;
    private handleStateNode;
    private handleHtmlElementNode;
    private handleGenericExternNode;
    private handleArgNode;
    private handleGraphFunctionalNode;
    private handleGraphExecutableNode;
    private handleEventNode;
    private handlePublishNode;
}
