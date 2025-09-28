
const THREE = _lib.THREE
const { Fn, uniform, storage, attribute, float, vec2, vec3, color, instanceIndex } = _lib.THREE.TSL;


const particleSize = 2
const bufferTypeSizes = {
    'vec2': 2,
    'vec3': 3,
    'float': 1
}
const createBuffer = (bufferType) => {
    console.log("is instanced", instanced)
    const buffer = instanced ? new THREE.StorageInstancedBufferAttribute(count, bufferTypeSizes[bufferType])
        : new THREE.StorageBufferAttribute(count, bufferTypeSizes[bufferType]);
    const node = storage(buffer, bufferType, count)
    return node
}
const createdBuffers = Object.fromEntries(Object.entries(buffers).map(([name, type]) => [name, createBuffer(type)]));
const createdNodes = Object.fromEntries(Object.entries(buffers).map(([name, type]) => [name, createdBuffers[name].element(instanceIndex)]));

const fn = new Function("_lib", "buffers", "nodes", fnText);

const computeInit = Fn(() => {
    const { float, vec2, instanceIndex, timerGlobal, rand, vec3, div } = _lib.THREE.TSL;
    const particleIndex = float(instanceIndex);
    const randomAngle = rand(particleIndex).mul(5).mul(Math.PI * 2);
    const velMul = 0.1;
    const randomSpeed = rand(particleIndex).mul(velMul).add(velMul * 0.2);


    const velX = randomAngle.sin().mul(randomSpeed);
    const velY = randomAngle.cos().mul(randomSpeed);

    const velocity = nodes.velocity
    const time = timerGlobal();
    velocity.xy = vec2(velX, velY);
    nodes.position.xy = vec3(rand(particleIndex.div(8)), rand(particleIndex.div(16)), rand(particleIndex.div(6)));

    nodes.color.assign(vec3(1));

    nodes.birthTime.assign(time);
    nodes.lifespan.assign(rand(particleIndex).mul(10));
})().compute(count);

renderer?.renderer?.compute(computeInit);

console.log("creating compute", { createdBuffers, createdNodes, renderer, particleNum, count, fnText })

return {
    buffers: createdBuffers,
    nodes: createdNodes,
    count
}
