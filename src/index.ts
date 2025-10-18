import { initBackgroundScene } from "./three-render";
import { startEditor, setupEditorUI } from "./editor";
import { initErrorDisplay } from "./error-display";
import { initMobileSupport } from "./mobile-support";
import { setRenderer } from "./dsl/parser";

document.addEventListener("DOMContentLoaded", () => {
  // Initialize error display system first
  initErrorDisplay();

  // Initialize mobile support
  initMobileSupport();

  const renderer = initBackgroundScene();
  setRenderer(renderer);
  startEditor(renderer);
  setupEditorUI();
});
