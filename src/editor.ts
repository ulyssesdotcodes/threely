// Editor UI components and controls
import { EditorView } from "@codemirror/view";
import { 
  getVimModeEnabled, 
  setVimModeEnabled, 
  createEditorState, 
  setCurrentEditorView,
  defaultContent,
  getCurrentEditorView,
  getBlockAtCursor
} from './codemirror';
import { executeDSL } from './dsl';

export function createVimToggle(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'vim-toggle-container';
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'vim-toggle';
  checkbox.checked = getVimModeEnabled();
  
  const label = document.createElement('label');
  label.htmlFor = 'vim-toggle';
  label.textContent = 'Vim';
  
  container.appendChild(checkbox);
  container.appendChild(label);
  
  // Handle toggle
  checkbox.addEventListener('change', () => {
    setVimModeEnabled(checkbox.checked);
  });
  
  return container;
}

export function createRunButton(): HTMLElement {
  const button = document.createElement('button');
  button.className = 'run-button';
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
    <span>Run</span>
  `;
  button.title = 'Run current block (Ctrl+Enter)';
  
  // Handle button click - same logic as Ctrl+Enter
  button.addEventListener('click', () => {
    const view = getCurrentEditorView();
    if (!view) {
      console.warn('No editor view available');
      return;
    }
    
    const blockInfo = getBlockAtCursor(view);
    
    if (blockInfo && blockInfo.block) {
      const code = blockInfo.block.trim();
      
      try {
        const result = executeDSL(code);
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

  // Set the editor to occupy full height of the screen
  document.body.style.margin = '0';
  document.body.style.backgroundColor = 'transparent';
  view.dom.style.height = '100vh';
  view.dom.style.width = '100%';
  view.dom.style.display = 'block';
  view.dom.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  
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
  const style = document.createElement('style');
  style.textContent = `
    .vim-toggle-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 0, 0, 0.8);
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(4px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      color: white;
      user-select: none;
    }
    
    .vim-toggle-container:hover {
      background: rgba(0, 0, 0, 0.9);
      border-color: rgba(255, 255, 255, 0.3);
    }
    
    .vim-toggle-container input[type="checkbox"] {
      margin: 0;
      cursor: pointer;
      transform: scale(1.1);
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
      top: 20px;
      right: 140px;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(34, 197, 94, 0.9);
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(4px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
    }
    
    .run-button:hover {
      background: rgba(34, 197, 94, 1);
      border-color: rgba(255, 255, 255, 0.3);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    
    .run-button:active {
      transform: translateY(0);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .run-button svg {
      flex-shrink: 0;
    }
    
    .run-button span {
      font-weight: 500;
    }
  `;
  document.head.appendChild(style);
}