import {startEditor} from './codemirror';
import { initBackgroundScene } from './three-render';

// Initialize both the background scene and editor when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  initBackgroundScene();
  startEditor();
});