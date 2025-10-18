// Compute initialization functions - extracted from parser.ts
import * as THREE from "three/webgpu";
import { getDefaultRenderer } from "../context/dsl-context";

// Compute init function based on compute-example/compute-init.js
export function computeInit(
  renderer,
  count: number,
  buffers: any,
  instanced: boolean,
  particleNum?: number,
) {
  const particleSize = 2;
  const bufferTypeSizes = {
    vec2: 2,
    vec3: 3,
    float: 1,
  };

  const createBuffer = (bufferType: string) => {
    console.log("is instanced", instanced);
    const buffer = instanced
      ? new THREE.StorageInstancedBufferAttribute(
        count,
        bufferTypeSizes[bufferType],
      )
      : new THREE.StorageBufferAttribute(count, bufferTypeSizes[bufferType]);
    const node = THREE.TSL.storage(buffer, bufferType, count);

    return node;
  };

  const createdBuffers = Object.fromEntries(
    Object.entries(buffers).map(([name, type]) => [
      name,
      createBuffer(type as string),
    ]),
  );
  const nodes = Object.fromEntries(
    Object.entries(buffers).map(([name, type]) => [
      name,
      createdBuffers[name].element(THREE.TSL.instanceIndex),
    ]),
  );

  const computeInitFn = THREE.TSL.Fn(() => {
    const { float, vec2, instanceIndex, timerGlobal, rand, vec3, div, time } =
      THREE.TSL;
    const particleIndex = float(instanceIndex);

    // Initialize with random position in a larger area
    const randomX = rand(particleIndex.mul(0.1547)); // -4 to 4
    const randomY = rand(particleIndex.mul(0.7834)); // -4 to 4
    const randomZ = rand(particleIndex.mul(0.9123)); // -2 to 2

    // // Initialize with very small random velocity
    const velMul = 0.02; // Much smaller initial velocity
    const randomAngle = rand(particleIndex.mul(0.4567)).mul(Math.PI * 2);
    const randomSpeed = rand(particleIndex.mul(0.2341)).mul(velMul);

    const velX = randomAngle.sin().mul(randomSpeed);
    const velY = randomAngle.cos().mul(randomSpeed);
    const velZ = rand(particleIndex.mul(0.6789))
      .mul(velMul * 0.5)
      .sub(velMul * 0.25);

    // Set initial position to random location
    console.log("assigning pos");
    nodes.position.assign(vec3(randomX, randomY, randomZ));

    // // Set initial velocity to small random values
    nodes.velocity.assign(vec3(velX, velY, velZ));

    nodes.color.assign(vec3(1));

    nodes.birthTime.assign(time);
    nodes.lifespan.assign(rand(particleIndex).mul(10).add(5)); // 5-15 seconds lifespan
  })().compute(count);



  renderer.computeAsync(computeInitFn);

  console.log("creating compute", {
    createdBuffers,
    nodes,
    particleNum,
    count,
  });

  // Log the created buffers in detail
  console.log("Created buffers:", createdBuffers);
  Object.entries(createdBuffers).forEach(([name, buffer]) => {
    console.log(`Buffer ${name}:`, buffer);
  });

  return {
    buffers: createdBuffers,
    nodes,
    count,
  };
}

export const computeUpdate = (nodes, buffers, count) => THREE.TSL.Fn(() => {
  const {
    uniform,
    vec2,
    vec3,
    vec4,
    instanceIndex,
    float,
    timerGlobal,
    add,
    mul,
    sub,
    rand,
    abs,
    int,
    trunc,
    fract,
    mix,
    clamp,
    time,
  } = THREE.TSL;

  const particle = nodes.position;
  const velocity = nodes.velocity;
  const particleIndex = float(instanceIndex);

  const limit = uniform(vec3(4, 4, 2));
  const position = particle.add(velocity).toVar();

  const forceMul = rand(particleIndex).mul(0.08).add(0.9).mul(0);
  velocity.assign(mul(velocity, float(1).sub(forceMul).mul(0.04).add(0.95)));

  if (nodes.force) {
    velocity.assign(add(velocity, nodes.force));
  }

  const age = sub(time, nodes.birthTime);
  const isDead = age.greaterThanEqual(nodes.lifespan);

  console.log("color", nodes.color)
  buffers.color.element(instanceIndex).assign(nodes.color);

  const randomAngle = rand(particleIndex.div(4)).mul(Math.PI * 2);
  const velMul = 0.04;
  const randomSpeed = rand(particleIndex)
    .mul(velMul)
    .add(velMul * 0.2);
  const velX = randomAngle.sin().mul(randomSpeed);
  const velY = randomAngle.cos().mul(randomSpeed);

  position.assign(
    isDead.select(
      (nodes.spawnPosition ?? vec3(0)).add(
        vec3(
          rand(particleIndex.mul(0.254)),
          rand(particleIndex.mul(0.928824)),
          rand(particleIndex.mul(10.254)),
        ).mul(0.1),
      ),
      position,
    ),
  );

  velocity.assign(isDead.select(vec3(velX, velY, 0), velocity));

  nodes.birthTime.assign(isDead.select(time, nodes.birthTime));

  buffers.position.element(instanceIndex).assign(position);
  buffers.velocity.element(instanceIndex).assign(velocity);
  buffers.color.element(instanceIndex).assign(nodes.color);
})().compute(count);
