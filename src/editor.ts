// Editor UI components and controls
import { EditorView } from "@codemirror/view";
import {
  getVimModeEnabled,
  setVimModeEnabled,
  createEditorState,
  setCurrentEditorView,
  defaultContent,
  getCurrentEditorView,
  getBlockAtCursor,
} from "./codemirror";
import { executeDSL } from "./dsl";
import { uuidRangeSetField, UUIDTag } from "./uuid-tagging";

export function createVimToggle(): HTMLElement {
  const container = document.createElement("div");
  container.className = "vim-toggle-container";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = "vim-toggle";
  checkbox.checked = getVimModeEnabled();

  const label = document.createElement("label");
  label.htmlFor = "vim-toggle";
  label.textContent = "Vim";

  container.appendChild(checkbox);
  container.appendChild(label);

  // Handle toggle
  checkbox.addEventListener("change", () => {
    setVimModeEnabled(checkbox.checked);
  });

  return container;
}

export function createRunButton(): HTMLElement {
  const button = document.createElement("button");
  button.className = "run-button";
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
    <span>Run</span>
  `;
  button.title = "Run current block (Ctrl+Enter)";

  // Handle button click - same logic as Ctrl+Enter
  button.addEventListener("click", () => {
    const view = getCurrentEditorView();
    if (!view) {
      console.warn("No editor view available");
      return;
    }

    const blockInfo = getBlockAtCursor(view);

    if (blockInfo && blockInfo.block) {
      const code = blockInfo.block.trim();

      try {
        // Extract UUID ranges for the block (same as codemirror.ts)
        const ranges: { start: number; end: number; uuid: UUIDTag }[] = [];
        view.state.field(uuidRangeSetField).between(
          blockInfo.start,
          blockInfo.end,
          (start, end, uuid) => (
            ranges.push({
              start: start - blockInfo.start,
              end: end - blockInfo.start,
              uuid,
            }),
            undefined
          ),
        );

        const result = executeDSL(code, ranges);
        if (result) {
        } else {
        }
      } catch (error) {
        console.error("Error executing DSL code:", error);
      }
    }
  });

  return button;
}

export function startEditor(): EditorView {
  const state = createEditorState(defaultContent);

  const view = new EditorView({
    state,
    parent: document.body,
  });

  setCurrentEditorView(view);

  // Set the editor to occupy full height with mobile support
  document.body.style.margin = "0";
  document.body.style.backgroundColor = "transparent";
  view.dom.style.height = "100vh";
  view.dom.style.height = "100dvh"; // Dynamic viewport height for mobile
  view.dom.style.width = "100%";
  view.dom.style.display = "block";
  view.dom.style.backgroundColor = "rgba(0, 0, 0, 0.7)";

  // Mobile-specific styling
  view.dom.style.fontSize = "16px"; // Prevent zoom on iOS
  view.dom.style.lineHeight = "1.5"; // Better mobile readability

  return view;
}

export function setupEditorUI(): void {
  // Create and style the vim toggle
  const vimToggle = createVimToggle();
  document.body.appendChild(vimToggle);

  // Create and add the run button
  const runButton = createRunButton();
  document.body.appendChild(runButton);

  // Add CSS styles
  const style = document.createElement("style");
  style.textContent = `
    .vim-toggle-container {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(0, 0, 0, 0.8);
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(4px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 16px; /* Increased for mobile readability */
      color: white;
      user-select: none;
      min-height: 44px; /* Minimum touch target */
      box-sizing: border-box;
    }
    
    /* Touch-friendly hover states */
    .vim-toggle-container:hover,
    .vim-toggle-container:focus-within {
      background: rgba(0, 0, 0, 0.9);
      border-color: rgba(255, 255, 255, 0.3);
      transform: scale(1.02);
    }
    
    .vim-toggle-container:active {
      transform: scale(0.98);
    }
    
    .vim-toggle-container input[type="checkbox"] {
      margin: 0;
      cursor: pointer;
      transform: scale(1.3); /* Larger for mobile touch */
      min-width: 20px;
      min-height: 20px;
    }
    
    .vim-toggle-container label {
      margin: 0;
      cursor: pointer;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
    }
    
    .vim-toggle-container input[type="checkbox"]:checked + label {
      color: #4ade80;
    }
    
    .run-button {
      position: fixed;
      top: 16px;
      right: 180px; /* Adjusted for larger Vim toggle */
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(34, 197, 94, 0.9);
      color: white;
      border: none;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(4px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 16px; /* Increased for mobile */
      font-weight: 500;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
      min-height: 44px; /* Minimum touch target */
      box-sizing: border-box;
    }
    
    /* Touch-friendly button states */
    .run-button:hover,
    .run-button:focus {
      background: rgba(34, 197, 94, 1);
      border-color: rgba(255, 255, 255, 0.3);
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
    }
    
    .run-button:active {
      transform: scale(0.95);
      box-shadow: 0 2px 6px rgba(34, 197, 94, 0.4);
    }
    
    .run-button svg {
      flex-shrink: 0;
    }
    
    .run-button span {
      font-weight: 500;
    }
    
    /* Mobile responsive layout */
    @media (max-width: 768px) {
      .vim-toggle-container {
        top: 12px;
        right: 12px;
        font-size: 14px;
        padding: 10px 12px;
      }
      
      .run-button {
        top: 12px;
        right: 120px;
        font-size: 14px;
        padding: 10px 12px;
      }
    }
    
    @media (max-width: 480px) {
      /* Stack buttons vertically on very small screens */
      .vim-toggle-container {
        top: 12px;
        right: 12px;
      }
      
      .run-button {
        top: 70px; /* Stack below vim toggle */
        right: 12px;
      }
    }
    
    /* Improve CodeMirror mobile experience */
    .cm-editor {
      font-size: 16px !important; /* Prevent zoom on iOS */
    }
    
    .cm-content {
      padding: 16px !important; /* More touch-friendly padding */
      line-height: 1.6 !important;
    }
    
    .cm-focused {
      outline: 2px solid rgba(34, 197, 94, 0.5) !important;
      outline-offset: -2px !important;
    }
  `;
  document.head.appendChild(style);
}
