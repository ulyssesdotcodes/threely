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
    return computeInit(
        renderer,
        particleCount,    // Number of particles
        particleBuffers,  // Buffer type definitions
        isInstanced       // Use instanced rendering
    )
}


export const executeParticles = (_, __, doc, particles) => {
    console.log(THREE)

    new Function("nodes", "THREE", doc)(particles.nodes, THREE)

    const nodesWithUpdate = {
        ...particles.nodes,
        computeUpdate: computeUpdate(particles.nodes, particles.buffers, particleCount)
    }

    console.log(nodesWithUpdate.color)
    renderLogic(pointsFromNodes(particles.buffers, nodesWithUpdate, 50), "particleSystem")

}