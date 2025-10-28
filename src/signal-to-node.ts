import { Signal, effect } from "@preact/signals-core";
import { ReferenceNode } from "three/webgpu";

/**
 * Transforms a Preact signal into a Three.js ReferenceNode.
 * The node automatically updates when the signal value changes.
 *
 * @param signal - The Preact signal to transform
 * @param uniformType - The Three.js uniform type (e.g., 'float', 'vec2', 'vec3', 'color')
 * @returns A ReferenceNode that tracks the signal's value
 *
 * @example
 * const mySignal = signal(5);
 * const node = signalToNode(mySignal, 'float');
 * // When mySignal.value changes, the ReferenceNode automatically updates
 */
export function signalToNode<T>(
  signal: Signal<T>,
  uniformType: string,
): ReferenceNode {
  // Create a wrapper object to hold the signal's value
  const wrapper = {
    value: signal.value,
  };

  // Set up reactive effect to update the wrapper when signal changes
  effect(() => {
    wrapper.value = signal.value;
  });

  // Create and return a ReferenceNode that references the wrapper's value property
  return new ReferenceNode("value", uniformType, wrapper);
}
