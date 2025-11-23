import { computeInit, computeUpdate } from "./compute/compute-init";
import { pointsFromNodes } from "./compute/points-renderer";
import { hsvToRgb, paletteNode } from "./compute/oscillare";
import { renderLogic } from "./dsl/object3d-chain";
import { curl } from "./compute/curl-noise";
import { signalToNode } from "./signal-to-node";
import * as THREE from "three/webgpu";
import { computed, effect, Signal } from "@preact/signals";

const particleCount = 100000;

const CURL_PARAMS_STORAGE_KEY = "threely-curl-params";

// Default curl parameters
const defaultCurlParams = {
  timeMultiplier: 0.08,
  elscale: 12,
  speed: 0.001,
};

// Load curl parameters from localStorage or use defaults
function loadCurlParams(): typeof defaultCurlParams {
  try {
    const stored = localStorage.getItem(CURL_PARAMS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultCurlParams, ...parsed };
    }
  } catch (e) {
    console.warn("Failed to load curl params from localStorage:", e);
  }
  return { ...defaultCurlParams };
}

// Save curl parameters to localStorage
function saveCurlParams() {
  try {
    localStorage.setItem(CURL_PARAMS_STORAGE_KEY, JSON.stringify(curlParams));
  } catch (e) {
    console.warn("Failed to save curl params to localStorage:", e);
  }
}

// Curl parameters that can be controlled via UI
export const curlParams = loadCurlParams();

const tickSignal = new Signal(0);
const tapbeatSignal: Signal<number[]> = new Signal([]);
const avgTimeSignal = computed(() => {
  if(tapbeatSignal.value.length < 2) {
    return [500, 0];
  }
  const last = tapbeatSignal.value[tapbeatSignal.value.length - 1];
  const first = tapbeatSignal.value[0];
  return [(last - first) / (tapbeatSignal.value.length - 1)
      , first];

});

const beatrampSignal = computed(() => {
  const [avgTime, first] = avgTimeSignal.value;
  const now = tickSignal.value;
  const adjFirstTime = (first ?? 0) % (avgTime * 4);
  console.log(avgTime);
  return (now - adjFirstTime) / avgTime;
})

// effect(() => {
//   console.log(beatrampSignal.value)
// })

const beatrampRef = signalToNode(beatrampSignal, "float");
export const beatramp = THREE.TSL.float(beatrampRef);

const tick = () => {
  tickSignal.value = performance.now();
  requestAnimationFrame(tick);
};

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
  const timeMultiplierRef = t.reference("timeMultiplier", "float", curlParams);
  const elscaleRef = t.reference("elscale", "float", curlParams);
  const speedRef = t.reference("speed", "float", curlParams);

  console.log("recreating force");
  const curlForce = curl({
    posa: particles.nodes.position,
    elscale: elscaleRef,
    force: t.vec3(0),
    time: t.time.mul(timeMultiplierRef),
    speed: speedRef,
    index: t.float(t.instanceIndex),
  });

  const curlUpdate = THREE.TSL.Fn(() => {
    particles.buffers.velocity.element(t.instanceIndex).addAssign(curlForce);
  })().compute(particleCount);

  particles.nodes.force = t.vec3(0);

  const recompute = () => {
    renderer.compute(curlUpdate);
    requestAnimationFrame(recompute);
  };

  requestAnimationFrame(recompute);
  requestAnimationFrame(tick);

  return {
    ...particles,
    pointsMaterial: new THREE.SpriteNodeMaterial(),
  };
};

export const executeParticles = (_, __, doc, particles) => {
  console.log("[executeParticles] Starting execution");
  console.log("[executeParticles] doc:", doc);
  console.log("[executeParticles] particles:", particles);
  console.log("[executeParticles] THREE:", THREE);

  const newNodes = { ...particles.nodes };
  console.log("[executeParticles] newNodes:", newNodes);

  const includes = {
    nodes: newNodes,
    t: THREE.TSL,
    curl,
    signalToNode,
    paletteNode,
    hsvToRgb,
    beatramp,
  };
  console.log("[executeParticles] includes:", includes);

  try {
    console.log(
      "[executeParticles] Creating function with keys:",
      Object.keys(includes),
    );
    const fn = new Function(...Object.keys(includes), doc);
    console.log("[executeParticles] Function created, executing...");
    fn(...Object.values(includes));
    console.log("[executeParticles] Function executed successfully");
    console.log("[executeParticles] newNodes after execution:", newNodes);

    console.log("[executeParticles] Calling renderLogic...");
    renderLogic(
      pointsFromNodes(
        particles.pointsMaterial,
        particles.buffers,
        newNodes,
        computeUpdate(newNodes, particles.buffers, particleCount),
      ),
      "particleSystem",
    );
    console.log("[executeParticles] renderLogic completed");
  } catch (error) {
    console.error("[executeParticles] Error executing particle code:", error);
    console.error("[executeParticles] Error name:", error?.name);
    console.error("[executeParticles] Error message:", error?.message);
    console.error("[executeParticles] Error stack:", error?.stack);
    // Optionally display error to user or handle gracefully
    throw error; // Re-throw to allow caller to handle if needed
  }
};

export function createCurlInterface(): HTMLElement {
  const container = document.createElement("div");
  container.className = "curl-interface-container";

  // Helper function to create a labeled input
  const createInput = (
    label: string,
    paramKey: keyof typeof curlParams,
    step: string,
  ) => {
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
        saveCurlParams();
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
    const arr = tapbeatSignal.value.filter((v) => now - v < 8000).slice(-8);
    arr.push(now);
    tapbeatSignal.value = arr;
  });

  return button;
}
