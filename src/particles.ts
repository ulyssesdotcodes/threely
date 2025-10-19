import { computeInit, computeUpdate } from "./dsl/compute/compute-init"
import { pointsFromNodes } from "./dsl/compute/points-renderer"
import { renderLogic } from "./dsl/object3d-chain"
import * as THREE from "three/webgpu"

const particleCount = 50
export const create = (renderer) => {
    const particleBuffers = {
        position: 'vec3',
        velocity: 'vec3',
        color: 'vec3',
        birthTime: 'float',
        lifespan: 'float'
    }
    const isInstanced = true
    // Initialize compute buffers and nodes for particle system
    const particles = computeInit(
        renderer,
        particleCount,    // Number of particles
        particleBuffers,  // Buffer type definitions
        isInstanced,       // Use instanced rendering
    );

    return {
        ...particles, pointsMaterial:
            new THREE.SpriteNodeMaterial()
    }
}


export const executeParticles = (_, __, doc, particles) => {
    console.log(THREE)

    const newNodes = { ...particles.nodes };

    new Function("nodes", "THREE", doc)(newNodes, THREE)


    renderLogic(pointsFromNodes(particles.pointsMaterial, particles.buffers, newNodes,
        computeUpdate(newNodes, particles.buffers, particleCount)
        , 50), "particleSystem")

}