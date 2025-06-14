// graph.ts - Implementation of a functional node-based graph system with TypeScript

  /**
   * Interface representing a Node in the graph.
   *
   * @template T - The type of value this node computes
   */
  export interface Node<T> {
    id: string;
    compute: () => T;
    dependencies: Node<any>[];
  }

  /**
   * Type definition for a curried function (kept for backward compatibility)
   */
  export type CurriedFunction<T> = (...args: any[]) => CurriedFunction<T> | T;

  let nodeIdCounter = 0;

  /**
   * Generate a unique ID for nodes
   */
  function generateUniqueId(): string {
    return `node-${++nodeIdCounter}`;
  }

  /**
   * The map function with type (A => B) => Node<A> => Node<B>
   * 
   * @param fn - Function to transform value A to value B
   * @returns A function that transforms Node<A> to Node<B>
   */
  export function map<A, B>(fn: (a: A) => B): (node: Node<A>) => Node<B> {
    return (node: Node<A>) => ({
      id: generateUniqueId(),
      compute: () => fn(Graph.run(node)),
      dependencies: [node]
    });
  }

  /**
   * Options for pretty printing the graph
   */
  export interface PrettyPrintOptions {
    /** Show node IDs in the output */
    showIds?: boolean;
    /** Maximum depth to traverse (prevents infinite loops) */
    maxDepth?: number;
    /** Custom node label function */
    nodeLabel?: (node: Node<any>) => string;
    /** Include dependency count */
    showDependencyCount?: boolean;
  }

  /**
   * Pretty printer for graph visualization
   */
  export class GraphPrettyPrinter {
    private visited = new Set<string>();
    private options: Required<PrettyPrintOptions>;

    constructor(options: PrettyPrintOptions = {}) {
      this.options = {
        showIds: options.showIds ?? true,
        maxDepth: options.maxDepth ?? 10,
        nodeLabel: options.nodeLabel ?? this.defaultNodeLabel.bind(this),
        showDependencyCount: options.showDependencyCount ?? true
      };
    }

    /**
     * Default node label generator
     */
    private defaultNodeLabel(node: Node<any>): string {
      const computeStr = node.compute.toString();
      
      // Try to extract meaningful info from the compute function
      if (computeStr.includes('SphereGeometry')) return 'sphere';
      if (computeStr.includes('BoxGeometry')) return 'box';
      if (computeStr.includes('CylinderGeometry')) return 'cylinder';
      if (computeStr.includes('MeshBasicMaterial')) return 'material';
      if (computeStr.includes('THREE.Mesh')) return 'mesh';
      if (computeStr.includes('translateXObj')) return 'translateX';
      if (computeStr.includes('translateYObj')) return 'translateY';
      if (computeStr.includes('translateZObj')) return 'translateZ';
      if (computeStr.includes('rotateXObj')) return 'rotateX';
      if (computeStr.includes('rotateYObj')) return 'rotateY';
      if (computeStr.includes('rotateZObj')) return 'rotateZ';
      if (computeStr.includes('currentScene.add')) return 'render';
      if (computeStr.includes('Graph.run')) return 'map';
      
      return 'node';
    }

    /**
     * Pretty print a single node with its dependencies
     */
    print(node: Node<any>, depth: number = 0): string {
      const indent = '  '.repeat(depth);
      const nodeId = this.options.showIds ? ` (${node.id})` : '';
      const depCount = this.options.showDependencyCount ? ` [deps: ${node.dependencies.length}]` : '';
      const label = this.options.nodeLabel(node);
      
      let result = `${indent}${label}${nodeId}${depCount}\n`;

      // Prevent infinite recursion
      if (depth >= this.options.maxDepth) {
        return result + `${indent}  ...(max depth reached)\n`;
      }

      // Prevent cycles
      if (this.visited.has(node.id)) {
        return result + `${indent}  ...(already visited)\n`;
      }

      this.visited.add(node.id);

      // Print dependencies
      for (let i = 0; i < node.dependencies.length; i++) {
        const dep = node.dependencies[i];
        const isLast = i === node.dependencies.length - 1;
        const connector = isLast ? '└─ ' : '├─ ';
        
        result += `${indent}${connector}`;
        result += this.print(dep, depth + 1).slice(indent.length + connector.length);
      }

      return result;
    }

    /**
     * Print multiple nodes as a forest
     */
    printForest(nodes: Node<any>[]): string {
      this.visited.clear();
      let result = '';
      
      for (let i = 0; i < nodes.length; i++) {
        if (i > 0) result += '\n';
        result += `Root ${i + 1}:\n`;
        result += this.print(nodes[i]);
      }
      
      return result;
    }

    /**
     * Create a compact one-line representation
     */
    compact(node: Node<any>): string {
      const label = this.options.nodeLabel(node);
      const deps = node.dependencies.map(dep => this.compact(dep)).join(', ');
      
      if (deps) {
        return `${label}(${deps})`;
      }
      return label;
    }
  }

  /**
   * Simplified Graph class for functional execution
   */
  export class Graph {
    /**
     * Execute a node and return its computed value
     * @param node - The node to execute
     * @returns The computed value
     */
    static run<T>(node: Node<T>): T {
      return node.compute();
    }

    /**
     * Pretty print a node and its dependencies
     */
    static prettyPrint(node: Node<any>, options?: PrettyPrintOptions): string {
      const printer = new GraphPrettyPrinter(options);
      return printer.print(node);
    }

    /**
     * Create a compact representation of a node
     */
    static compact(node: Node<any>, options?: PrettyPrintOptions): string {
      const printer = new GraphPrettyPrinter(options);
      return printer.compact(node);
    }
  }

  // Export for backward compatibility
  export { Graph as DefaultGraph };