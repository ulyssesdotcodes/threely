// Points rendering for compute particles - extracted from parser.ts
import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { MockObject3D } from "../three/MockObject3D";
import { apply } from "../graph";
import { chainObj3d } from "../dsl/object3d-chain";

// Points from nodes function based on compute-example/pointsMaterialFromNodes.js
export function pointsFromNodes(pointsMaterial, buffers: any, nodes: any, computeUpdate) {

  // Handle existing material properties if provided
  // for compute particles
  pointsMaterial.userData.count = buffers.position.value.count;

  console.log("running mat update");

  // Update position buffer reference if changed
  if (pointsMaterial.userData.positionBuffer !== buffers.position) {
    console.log("new position buffer")
    pointsMaterial.userData.positionBuffer = buffers.position;
    pointsMaterial.vertexColors = true;
    pointsMaterial.sizeAttenuation = true;
  }

  // Set material nodes
  console.log(nodes.renderPosition, buffers.position);
  // pointsMaterial.positionNode = TSL.instancedBufferAttribute(
  //   buffers.position.value,
  // );
  pointsMaterial.positionNode = nodes.renderPosition ?? nodes.position;
  console.log("pointsmat2", nodes.color, computeUpdate)
  pointsMaterial.colorNode = nodes.color ?? TSL.vec3(1);
  pointsMaterial.scaleNode = nodes.size ?? THREE.TSL.vec3(0.1);


  pointsMaterial.opacityNode = nodes.opacity ?? TSL.float(1);
  pointsMaterial.blending = THREE.AdditiveBlending;

  pointsMaterial.needsUpdate = true;

  // Create sprite with the points material
  const pts = new THREE.Sprite(pointsMaterial);
  if (pointsMaterial.userData.count) {
    // for compute particles
    console.log(pointsMaterial.userData.count)
    pts.count = pointsMaterial.userData.count;
  }

  // Set up animation loop for compute updates
  let animationId: { id: number | null } = { id: null };
  console.log("created anim", animationId)

  const setupAnimation = (renderer: any) => {
    console.log("setup anim", renderer)
    if (!renderer || animationId.id) return;

    const recompute = () => {
      if (computeUpdate) {
        renderer.compute(computeUpdate);
      }
      animationId.id = requestAnimationFrame(recompute);
    };

    // Start the animation loop
    console.log("start anim", animationId)
    animationId.id = requestAnimationFrame(recompute);
  };

  const stopAnimation = () => {
    console.log("no anim id?", animationId)
    if (animationId.id) {
      console.log("stopping anim", animationId)
      cancelAnimationFrame(animationId.id);
      animationId.id = null;
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
