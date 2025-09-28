const {timerGlobal, vec3, attribute, instancedBufferAttribute} = _lib.THREE.TSL


const pointsMaterial = new _lib.THREE.PointsNodeMaterial();
if(material.userData.count) {
  // for compute particles
  pts.count = material.userData.count;
}


console.log("running mat update")

//pointsMaterial.positionNode = attribute('position');
if(pointsMaterial.userData.positionBuffer !== buffers.position) {
  pointsMaterial.userData.positionBuffer = buffers.position;
//pointsMaterial.geometryNode = nodes.compute;
  pointsMaterial.vertexColors = true;
  pointsMaterial.sizeAttenuation = true;
}

pointsMaterial.positionNode = nodes.position
pointsMaterial.colorNode = nodes.color
pointsMaterial.sizeNode = nodes.size ?? vec3(4)

pointsMaterial.userData.count = buffers.position.value.count

pointsMaterial.opacityNode = nodes.opacity
pointsMaterial.blending = _lib.THREE.AdditiveBlending

pointsMaterial.needsUpdate = true

const pts = new THREE.Sprite(pointsMaterial)
if(pointsMaterial.userData.count) {
  // for compute particles
  pts.count = pointsMaterial.userData.count;
}

return pts