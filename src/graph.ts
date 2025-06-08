// graph.ts - Implementation of a node-based graph system with TypeScript

/**
 * Interface representing a Node in the graph.
 *
 * @template T - The type of data associated with this node
 */
export interface Node<T = any> {
  id: string;
  data?: T | (() => void);
  inputs: Map<string, Node<T>>;
  outputs: Map<string, Node<T>>;
}

/**
 * Generic Graph class that manages nodes and their connections.
 *
 * @template T - The type of data associated with the graph's nodes
 */
export class Graph<T = any> {
  private nodes: Map<string, Node<T>>;
  // Make currentNode accessible from outside the class but read-only
  private _currentNode?: Node<T>;
  get currentNode(): Node<T> | undefined {
    return this._currentNode;
  }
  set currentNode(node: Node<T> | undefined) {
    this._currentNode = node;
  }

  constructor() {
    this.nodes = new Map();
    this.currentNode = undefined;
  }

  /**
   * Create a new node with unique ID
   * @param data - Optional data to associate with the node
   * @returns The created node
   */
  createNode(data?: T | (() => void)): Node<T> {
    const id = this.generateUniqueId();
    const node: Node<T> = { id, data, inputs: new Map(), outputs: new Map() };
    this.nodes.set(id, node);
    return node;
  }

  /**
   * Connect two nodes via named inputs
   * @param source - The source node to connect from
   * @param target - The target node to connect to
   * @param inputName - The name of the input on the target node
   */
  connect(source: Node<T>, target: Node<T>, inputName: string): void {
    if (!target.inputs.has(inputName)) {
      target.inputs.set(inputName, source);
    } else {
      console.warn(`Input "${inputName}" already has a connection`);
    }

    source.outputs.set(inputName, target);
  }

  /**
   * Generate a UUID for nodes (RFC4122 version 4 compliant)
   * @returns A unique string ID in UUID format
   */
  private generateUniqueId(): string {
    // RFC4122, version 4 compliant UUID generator
    let d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
      d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (d + Math.random()*16)%16 | 0;
      d = Math.floor(d/16);
      return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
  }

  /**
   * Get a node by its ID
   * @param id - The ID of the node to retrieve
   * @returns The node with the specified ID, or undefined if not found
   */
  getNode(id: string): Node<T> | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes in the graph (for demonstration purposes)
   * @returns An array of all nodes
   */
  getAllNodes(): Node<T>[] {
    return Array.from(this.nodes.values());
  }
}

// Global graph instance to track all nodes
const globalGraph = new Graph();

/**
 * Function to wrap regular functions into graph nodes
 *
 * @param fn - The function to wrap
 * @returns A wrapped function that creates a node when called
 */
export function createGraphNodeWrapper(fn: (...args: any[]) => void): (...args: any[]) => void {
  // Create a proxy handler for the function
  const handler: ProxyHandler<any> = {
    apply(target, thisArg, argumentsList) {
      // Create a node for this function call
      const node = globalGraph.createNode(() => target.apply(thisArg, argumentsList));

      // If there's a previous node in the chain, connect it to this one
      if (globalGraph.currentNode) {
        globalGraph.connect(globalGraph.currentNode, node, 'next');
      }

      // Set this as the current node for the next call
      globalGraph.currentNode = node;

      // Execute the function and return its result
      const result = target.apply(thisArg, argumentsList);

      // Reset current node after execution
      globalGraph.currentNode = undefined;

      return result;
    }
  };

  // Create a proxy that wraps the original function
  const wrappedFn = new Proxy(fn, handler);

  return wrappedFn;
}

/**
 * Example usage of the decorator function
 */
class Example {
  exampleMethod = createGraphNodeWrapper(function() {
    console.log('This is an example method');
  }).bind(this);

  anotherMethod = createGraphNodeWrapper(function() {
    console.log('This is another method in the chain');
  }).bind(this);
}

// Export for testing
export { Graph as DefaultGraph };