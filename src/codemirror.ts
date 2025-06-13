import { EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { getTextBlockAtPosition } from './text_utils';
import * as THREE from 'three/webgpu';
import { setScene, executeDSL } from './dsl';

export { EditorState, EditorView, keymap, basicSetup, javascript };

// Custom command for Ctrl-Enter
const handleCtrlEnter = (view: EditorView): boolean => {
  const blockInfo = getBlockAtCursor(view);
  console.log("Ctrl-Enter pressed", blockInfo);
  
  if (blockInfo && blockInfo.block) {
    const code = blockInfo.block.trim();
    console.log("Executing DSL code:", code);
    
    try {
      const result = executeDSL(code);
      if (result) {
        console.log("DSL execution successful, object added to scene:", result);
      } else {
        console.log("DSL execution returned no result");
      }
    } catch (error) {
      console.error("Error executing DSL code:", error);
    }
  }
  
  // Prevent the default new line behavior by returning true
  return true;
};

// Function to get block at cursor position
export const getBlockAtCursor = (view: EditorView): { block: string } | null => {
  const text = view.state.doc.toString();
  const cursorPos = view.state.selection.ranges[0].from;

  const blockText = getTextBlockAtPosition(text, cursorPos);

  return {
    block: blockText,
  };
};

// Global scene reference for DSL
let globalScene: THREE.Scene | null = null;

// Function to initialize the background Three.js scene  
function initBackgroundScene() {
  // Create scene, camera, and renderer
  const scene = new THREE.Scene();
  globalScene = scene; // Store global reference
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

// Function to initialize the editor
export function startEditor() {
  const defaultContent = `mesh(sphere(), material()).translateX(1).rotateY(45).render()

// Try pressing Ctrl+Enter on the line above!
// This will create a sphere mesh, translate it, rotate it, and add it to the scene

mesh(box(2, 1, 1), material({color: 0xff0000})).translateX(-3).render()

mesh(cylinder(), material({color: 0x0000ff, wireframe: true})).translateX(3).render()

// More examples:
// mesh(sphere(0.5), material({color: 0xffffff})).translateY(2).render()
`;

  const state = EditorState.create({
      doc: defaultContent,
      extensions: [
        basicSetup,
        javascript(),
        Prec.highest(keymap.of([{ key: "Ctrl-Enter", run: handleCtrlEnter }])),
      ],
    });

  const view = new EditorView({
    state,
    parent: document.body,
  });

  // Set the editor to occupy full height of the screen
  document.body.style.margin = '0';
  document.body.style.backgroundColor = 'transparent';
  view.dom.style.height = '100vh';
  view.dom.style.width = '100%';
  view.dom.style.display = 'block';
  view.dom.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; // Semi-transparent background
}

// Initialize both the background scene and editor when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  initBackgroundScene();
  startEditor();
});