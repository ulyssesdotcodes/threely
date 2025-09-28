const { uniform, vec2, vec3, vec4, instanceIndex, float, timerGlobal, add, mul, sub, rand, abs, int, trunc, fract, mix, clamp } = _lib.THREE.TSL;
console.log("computeUpdate rerun")
const particle = nodes.position;
//  nodes.position;
const velocity = nodes.velocity;

const particleIndex = float(instanceIndex);

const limit = uniform(vec3(4, 4, 2));

const position = particle.add(velocity).temp();

const forceMul = rand(particleIndex).mul(0.08).add(0.9).mul(0);

velocity.assign(mul(velocity, float(1).sub(forceMul).mul(0.04).add(0.95)));

//velocity.assign(mul(velocity, 0.95));

if (nodes.force) {
  velocity.assign(add(velocity, nodes.force));
}

const time = timerGlobal()
const age = sub(time, nodes.birthTime)
const isDead = age
  .greaterThanEqual(nodes.lifespan);





buffers.color.element(instanceIndex)
  .assign(nodes.color);
//.assign(vec3(1))


const randomAngle = rand(particleIndex.div(4)).mul(Math.PI * 2);
const velMul = 0.04;
const randomSpeed = rand(particleIndex).mul(velMul).add(velMul * 0.2);
const velX = randomAngle.sin().mul(randomSpeed);
const velY = randomAngle.cos().mul(randomSpeed);

position.assign(
  isDead.select(
    (nodes.spawnPosition ?? vec3(0)).add(vec3(
      rand(particleIndex.mul(0.254)),
      rand(particleIndex.mul(0.928824)),
      rand(particleIndex.mul(10.254))
    ).mul(0.1)),
    position
  ))

velocity.assign(
  isDead.select(
    vec3(velX, velY, 0),
    velocity
  ))

nodes.birthTime.assign(
  isDead.select(
    time,
    nodes.birthTime
  ));


buffers.position.element(instanceIndex)
  .assign(position);

buffers.velocity.element(instanceIndex)
  .assign(velocity);

buffers.color.element(instanceIndex)
  .assign(nodes.color)
//.assign(vec3(1));

console.log("done with update")