import { initBackgroundScene } from './three-render';
import { startEditor, setupEditorUI } from './editor';
import { initErrorDisplay } from './error-display';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize error display system first
  initErrorDisplay();
  
  initBackgroundScene();
  startEditor();
  setupEditorUI();
});