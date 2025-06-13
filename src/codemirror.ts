import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { getTextBlockAtPosition } from './text_utils';
import * as THREE from 'three';

export { EditorState, EditorView, keymap, basicSetup, javascript };

// Custom command for Ctrl-Enter
const handleCtrlEnter = (view: EditorView): boolean => {
  console.log("Ctrl-Enter pressed", getBlockAtCursor(view));
  // Add your custom behavior here
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

// Function to initialize the background Three.js scene
function initBackgroundScene() {
  // Create scene, camera, and renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  
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
    
    renderer.render(scene, camera);
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
  const defaultContent = `
mesh(sphere(), material).translateX(osc(30)).translateY(45).render()
sphere().texture(material).translateX...
model("Willy").animate("xyz", time).translateX(osc(30))...

//by default do geometry stuff on the gpu?

sphere.position(p, i => p.add(sphere.normal(i.mul(2))))
points(600000).position((p, i) => vec3(i).mul(2).step(1))

geometry attributes are available as buffers on gpu

changing things should keep the existing ones where possible
`;

  const state = EditorState.create({
      doc: defaultContent,
      extensions: [
        basicSetup,
        javascript(),
        keymap.of([{ key: "Ctrl-Enter", run: handleCtrlEnter }]),
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