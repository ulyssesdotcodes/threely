import { computeInit, computeUpdate } from "./compute/compute-init";
import { pointsFromNodes } from "./compute/points-renderer";
import { hsvToRgb, paletteNode } from "./compute/oscillare";
import { renderLogic } from "./dsl/object3d-chain";
import { curl } from "./compute/curl-noise";
import { signalToNode } from "./signal-to-node";
import * as THREE from "three/webgpu";
import { computed, Signal } from "@preact/signals";

const particleCount = 100000;

// Curl parameters that can be controlled via UI
export const curlParams = {
  timeMultiplier: 0.08,
  elscale: 12,
  speed: 0.001,
};

const tickSignal = new Signal(0);
const tapbeatSignal : Signal<number[]> = new Signal([]);
const beatrampSignal = computed(() => {
  const last = tapbeatSignal.value[tapbeatSignal.value.length - 1];
  const avgTime = tapbeatSignal.value.length > 2
   ? (last - tapbeatSignal.value[0]) / tapbeatSignal.value.length
   : 500;

  return (tickSignal.value - (last ?? 0)) / avgTime;
});

export const beatramp = signalToNode(beatrampSignal, 'float');

const tick = () => {
  tickSignal.value = performance.now();
  requestAnimationFrame(tick);
}

export const create = (renderer) => {
  const particleBuffers = {
    position: "vec3",
    velocity: "vec3",
    color: "vec3",
    birthTime: "float",
    lifespan: "float",
  };
  const isInstanced = true;
  // Initialize compute buffers and nodes for particle system
  const particles = computeInit(
    renderer,
    particleCount, // Number of particles
    particleBuffers, // Buffer type definitions
    isInstanced, // Use instanced rendering
  );
  const t = THREE.TSL;

  // Create ReferenceNodes for curl parameters
  const timeMultiplierRef = t.reference('timeMultiplier', 'float', curlParams);
  const elscaleRef = t.reference('elscale', 'float', curlParams);
  const speedRef = t.reference('speed', 'float', curlParams);

  console.log("recreating force");
  const curlForce = curl({
    posa: particles.nodes.position,
    elscale: elscaleRef,
    force: t.vec3(0),
    time: t.time.mul(timeMultiplierRef),
    speed: speedRef,
    index: t.float(t.instanceIndex)
  });

  const curlUpdate = THREE.TSL.Fn(() => {
    particles.buffers.velocity.element(t.instanceIndex).addAssign(
      curlForce
    );
  })().compute(particleCount)

  particles.nodes.force = t.vec3(0);

  const recompute = () => {
    renderer.compute(curlUpdate);
    requestAnimationFrame(recompute);
  };

  requestAnimationFrame(recompute)
  requestAnimationFrame(tick)


  return {
    ...particles,
    pointsMaterial: new THREE.SpriteNodeMaterial(),
  };
};

export const executeParticles = (_, __, doc, particles) => {
  console.log(THREE);

  const newNodes = { ...particles.nodes };

  const includes = {
    nodes: newNodes,
    t: THREE.TSL,
    curl,
    signalToNode,
    paletteNode,
    hsvToRgb,
    beatramp
  };

  try {
    new Function(...Object.keys(includes), doc)(...Object.values(includes));

    renderLogic(
      pointsFromNodes(
        particles.pointsMaterial,
        particles.buffers,
        newNodes,
        computeUpdate(newNodes, particles.buffers, particleCount),
      ),
      "particleSystem",
    );
  } catch (error) {
    console.error("Error executing particle code:", error);
    // Optionally display error to user or handle gracefully
    throw error; // Re-throw to allow caller to handle if needed
  }
};

export function createCurlInterface(): HTMLElement {
  const container = document.createElement("div");
  container.className = "curl-interface-container";

  // Helper function to create a labeled input
  const createInput = (label: string, paramKey: keyof typeof curlParams, step: string) => {
    const wrapper = document.createElement("div");
    wrapper.className = "curl-input-wrapper";

    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    labelEl.className = "curl-input-label";

    const input = document.createElement("input");
    input.type = "number";
    input.step = step;
    input.value = String(curlParams[paramKey]);
    input.className = "curl-input";

    // Update the parameter object when input changes
    input.addEventListener("input", () => {
      const value = parseFloat(input.value);
      if (!isNaN(value)) {
        curlParams[paramKey] = value;
      }
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    return wrapper;
  };

  // Create inputs for each parameter
  container.appendChild(createInput("Time", "timeMultiplier", "0.001"));
  container.appendChild(createInput("Scale", "elscale", "0.1"));
  container.appendChild(createInput("Speed", "speed", "0.0001"));

  return container;
}

export function createTapBeatButton(): HTMLElement {
  const button = document.createElement("button");

  button.className = "tapbeat-button button";
  button.innerHTML = `
    <span>Beat</span>
  `;

  button.addEventListener("click", () => {
    const now = performance.now();
    const arr = tapbeatSignal.value.filter(v => now - v < 8000);
    arr.push(now);
    tapbeatSignal.value = arr
  })


  return button;
}