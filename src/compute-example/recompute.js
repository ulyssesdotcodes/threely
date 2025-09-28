const {
  buffers,
  nodes,
  count
} = data;
renderer = renderer?.renderer;

const storedTimer =  timer.value?.read();
const timerset = timer.set


if(storedTimer) {
  cancelAnimationFrame(storedTimer);
}


const recompute = () => {   
  renderer.compute(nodes.compute);
  timerset( requestAnimationFrame(recompute))
}

if(renderer){
renderer.compute(nodes.compute);
timerset( requestAnimationFrame(recompute))
}

return {...data}
