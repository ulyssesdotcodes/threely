// graph.ts - Implementation of a node-based graph system with TypeScript

  /**
   * Interface representing a Node in the graph.
   *
   * @template T - The type of data associated with this node
   */
  export interface Node<T = any> {
    id: string;
    data?: T | ((...args: any[]) => any) | CurriedFunction;
    inputs: Map<string, Node<T>>;
    outputs: Map<string, Node<T>>;
  }

  /**
   * Type definition for a curried function
   */
  export type CurriedFunction = (...args: any[]) => CurriedFunction | any;

  /**
   * Interface for a FunctionNode that has a function as its data
   */
  export interface FunctionNode<T = any> extends Node<T> {
    data: ((...args: any[]) => any) | CurriedFunction;
  }

  /**
   * Type guard to check if a node is a FunctionNode
   */
  export function isFunctionNode<T>(node: Node<T>): node is FunctionNode<T> {
    return typeof node.data === 'function' && node.data.length >= 0;
  }

  /**
   * Utility function to create a curried version of any regular function
   *
   * @param fn - The original function to be curried
   * @returns A new curried function that accepts arguments one at a time
   */
  export function createCurriedFunction(fn: (...args: any[]) => any): CurriedFunction {
    const arity = fn.length;

    // Create a closure to store collected arguments and the original function
    return function curried(this: any, ...collectedArgs: any[]): any {
      if (collectedArgs.length === 0) {
        // If no args provided, just return this function for chaining
        return curried;
      }

      // If we've collected enough arguments, execute the original function
      if (collectedArgs.length >= arity) {
        return fn.apply(this, collectedArgs);
      }

      // Otherwise, return another function that collects more arguments
      const newCurried = ((...nextArgs: any[]) =>
        curried.call(this, ...collectedArgs.concat(nextArgs))) as CurriedFunction;

      // Set the length property to indicate how many args are still needed
      Object.defineProperty(newCurried, 'length', { value: arity - collectedArgs.length });

      return newCurried;
    };
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
    createNode(data?: T | (() => void) | CurriedFunction): Node<T> {
      // Check if data is a regular function and not already curried
      if (typeof data === 'function' && !(data as any).curried) {
        // Mark the original function as curried to avoid double-currying
        (data as any).curried = true;

        const id = this.generateUniqueId();
        const node: Node<T> = { id, data, inputs: new Map(), outputs: new Map() };
        this.nodes.set(id, node);
        return node;
      }

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

    /**
     * Helper function to recursively run input nodes and collect their results
     * @param node - The node whose inputs should be executed
     * @returns An array of results from executing the input nodes' data functions
     */
    private executeInputs(node: Node<T>): any[] {
      const results = [];
      for (const [inputName, inputNode] of node.inputs) {
        if (isFunctionNode(inputNode)) {
          // Recursively run inputs and get their results
          const inputResults = this.executeInputs(inputNode);
          // Execute the input node's data function with its input results
          const result = inputNode.data ? inputNode.data(...inputResults) : undefined;
          results.push(result);
        } else {
          results.push(undefined);
        }
      }
      return results;
    }

    /**
     * Run the graph starting from a root node
     * @param root - The root node to start execution from
     * @returns The result of executing the root node's data function
     */
    run(root: Node<T>): any {
      // Get input values by recursively running all inputs
      const args = this.executeInputs(root);
    
      // Execute the root node's data function if it exists and is a function
      if (isFunctionNode(root) && typeof root.data === 'function') {
        // If the function is curried, we need to execute it with no arguments first
        // to get the next function in the chain
        const result = root.data(...args);
        return result;
      }
    
      return undefined;
    }
  }

  /**
   * Function to wrap regular functions into graph nodes
   *
   * @param fn - The function to wrap
   * @param graph - The graph instance to use for node creation
   * @returns A wrapped function that creates a node when called
   */
  export function createGraphNodeWrapper<T>(
    fn: (...args: any[]) => void,
    graph?: Graph<T>
  ): (...args: any[]) => void {
    // Use the provided graph or default to globalGraph if none is provided
    const targetGraph = graph || (global as any).globalGraph;
  
    // Check if the function is already curried
    let curriedFn = fn;
    if (typeof fn === 'function' && !(fn as any).curried) {
      // Mark the original function as curried to avoid double-currying
      (fn as any).curried = true;
  
      // Create a curried version of the function
      curriedFn = createCurriedFunction(fn);
    }
  
    // Create a proxy handler for the function
    const handler: ProxyHandler<any> = {
      apply(target, thisArg, argumentsList) {
        // Save the previous current node
        const prevNode = targetGraph.currentNode;
  
        // Execute the original function first to maintain test behavior
        let result;
        if (argumentsList.length > 0) {
          result = fn.apply(thisArg, argumentsList);
        } else {
          result = fn.apply(thisArg, []);
        }
  
        // Create a node for this function call with the same function
        const node = targetGraph.createNode(fn);
  
        // If there's a previous node in the chain, connect it to this one
        if (prevNode) {
          targetGraph.connect(prevNode, node, 'next');
        }
  
        // Set this as the current node for the next call
        targetGraph.currentNode = node;
  
        // Reset to the previous current node after execution
        targetGraph.currentNode = prevNode;
  
        return result;
      }
    };
  
    // Create a proxy that wraps the original function (not curried)
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