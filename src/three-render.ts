// Three.js rendering logic for the background scene
import * as THREE from 'three/webgpu';
import { setScene } from './dsl';

// Function to initialize the background Three.js scene  
export function initBackgroundScene() {
  // Create scene, camera, and renderer
  const scene = new THREE.Scene();
  setScene(scene); // Set scene for DSL
  
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: true });
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0.1); // Dark background with low opacity
  
  // Position canvas behind editor
  const canvas = renderer.domElement;
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.zIndex = '-1';
  canvas.style.pointerEvents = 'none';
  
  document.body.insertBefore(canvas, document.body.firstChild);
  
  // Create a simple wireframe cube
  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const material = new THREE.MeshBasicMaterial({ 
    color: 0x444444, 
    wireframe: true,
    transparent: true,
    opacity: 0.3
  });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);
  
  // Position camera
  camera.position.z = 5;
  
  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    
    // Rotate cube slowly
    cube.rotation.x += 0.005;
    cube.rotation.y += 0.01;
    
    renderer.renderAsync(scene, camera);
  }
  
  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  animate();
}