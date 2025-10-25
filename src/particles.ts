import { computeInit, computeUpdate } from "./compute/compute-init"
import { pointsFromNodes } from "./compute/points-renderer"
import { renderLogic } from "./dsl/object3d-chain"
import { curl } from './compute/curl-noise'
import * as THREE from "three/webgpu"

const particleCount = 1000000
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

    const includes = {
        nodes: newNodes,
        t: THREE.TSL,
        curl
    }

    new Function(...(Object.keys(includes)), doc)(...Object.values(includes))


    renderLogic(pointsFromNodes(particles.pointsMaterial, particles.buffers, newNodes,
        computeUpdate(newNodes, particles.buffers, particleCount)
        , 50), "particleSystem")

}