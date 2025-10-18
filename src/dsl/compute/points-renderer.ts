// Points rendering for compute particles - extracted from parser.ts
import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { MockObject3D } from "../../three/MockObject3D";
import { apply } from "../../graph";
import { chainObj3d } from "../object3d-chain";

// Points from nodes function based on compute-example/pointsMaterialFromNodes.js
export function pointsFromNodes(buffers: any, nodes: any, count: number) {
  const pointsMaterial = new THREE.SpriteNodeMaterial();

  // Handle existing material properties if provided
  // for compute particles
  pointsMaterial.userData.count = count;

  console.log("running mat update");

  // Update position buffer reference if changed
  if (pointsMaterial.userData.positionBuffer !== buffers.position) {
    pointsMaterial.userData.positionBuffer = buffers.position;
    pointsMaterial.vertexColors = true;
    pointsMaterial.sizeAttenuation = true;
  }

  // Set material nodes
  console.log(nodes.position, buffers.position);
  pointsMaterial.positionNode = TSL.instancedBufferAttribute(
    buffers.position.value,
  );
  console.log("pointsmat", nodes.color)
  pointsMaterial.colorNode = nodes.color ?? TSL.vec3(1);
  pointsMaterial.scaleNode = nodes.size ?? THREE.TSL.vec3(0.1);

  pointsMaterial.userData.count = buffers.position.value.count;

  pointsMaterial.opacityNode = TSL.float(1);
  // pointsMaterial.blending = THREE.AdditiveBlending;

  pointsMaterial.needsUpdate = true;

  // Create sprite with the points material
  const pts = new THREE.Sprite(pointsMaterial);
  if (pointsMaterial.userData.count) {
    // for compute particles
    console.log(pointsMaterial.userData.count)
    pts.count = pointsMaterial.userData.count;
  }

  // Set up animation loop for compute updates
  let animationId: number | null = null;

  const setupAnimation = (renderer: any) => {
    if (!renderer || animationId) return;

    const recompute = () => {
      if (nodes.computeUpdate) {
        console.log("recomputing")
        renderer.compute(nodes.computeUpdate);
      }
      animationId = requestAnimationFrame(recompute);
    };

    // Start the animation loop
    renderer.compute(nodes.computeUpdate);
    animationId = requestAnimationFrame(recompute);
  };

  const stopAnimation = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  };

  // Return a Node<MockObject3D> using apply() to match mesh() exactly
  // Create a MockObject3D that contains the sprite information
  return {
    geometry: undefined, // Points don't use traditional geometry
    userData: {
      material: pointsMaterial,
      sprite: pts, // Store the sprite in userData so render can access it
      isParticleSystem: true,
      setupAnimation,
      stopAnimation,
      nodes, // Include nodes for access to computeUpdate
    },
  };
}
