import { initBackgroundScene } from './three-render';
import { startEditor, setupEditorUI } from './editor';

document.addEventListener('DOMContentLoaded', () => {
  initBackgroundScene();
  startEditor();
  setupEditorUI();
});