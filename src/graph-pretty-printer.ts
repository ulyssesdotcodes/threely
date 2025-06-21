// graph-pretty-printer.ts - Pretty printing functionality for graph visualization
import { Node } from './graph';

/**
 * Options for pretty printing the graph
 */
export type PrettyPrintOptions = {
  /** Show node IDs in the output */
  readonly showIds?: boolean;
  /** Maximum depth to traverse (prevents infinite loops) */
  readonly maxDepth?: number;
  /** Custom node label function */
  readonly nodeLabel?: (node: Node<any>) => string;
  /** Include dependency count */
  readonly showDependencyCount?: boolean;
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
    // Handle different value types
    if (typeof node.value === 'function') {
      const functionStr = node.value.toString();
      
      // Try to extract meaningful info from the function
      if (functionStr.includes('SphereGeometry')) return 'sphere';
      if (functionStr.includes('BoxGeometry')) return 'box';
      if (functionStr.includes('CylinderGeometry')) return 'cylinder';
      if (functionStr.includes('MeshBasicMaterial')) return 'material';
      if (functionStr.includes('THREE.Mesh') || functionStr.includes('new THREE.Mesh')) return 'mesh';
      if (functionStr.includes('translateXObj')) return 'translateX';
      if (functionStr.includes('translateYObj')) return 'translateY';
      if (functionStr.includes('translateZObj')) return 'translateZ';
      if (functionStr.includes('rotateXObj')) return 'rotateX';
      if (functionStr.includes('rotateYObj')) return 'rotateY';
      if (functionStr.includes('rotateZObj')) return 'rotateZ';
      if (functionStr.includes('currentScene.add') || functionStr.includes('objectRegistry')) return 'render';
      if (functionStr.includes('Graph.run')) return 'map';
      
      return 'function';
    } else if (typeof node.value === 'object' && node.value !== null && 'ref' in node.value) {
      // RefNode value
      const refNode = node.value as any;
      return `extern:${refNode.ref}`;
    } else {
      // Constant value
      if (typeof node.value === 'string') return `"${node.value}"`;
      if (typeof node.value === 'number') return `${node.value}`;
      if (typeof node.value === 'boolean') return `${node.value}`;
      if (node.value === null) return 'null';
      if (node.value === undefined) return 'undefined';
      return 'constant';
    }
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