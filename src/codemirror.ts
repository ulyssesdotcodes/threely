import { EditorState, Prec, Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { vim } from "@replit/codemirror-vim";
import { getTextBlockAtPosition } from './text_utils';
import { executeDSL } from './dsl';

export { EditorState, EditorView, keymap, basicSetup, javascript };

// Vim mode state management
const VIM_MODE_KEY = 'three-tree-vim-mode';
const vimCompartment = new Compartment();
let currentEditorView: EditorView | null = null;

export function getVimModeEnabled(): boolean {
  try {
    return localStorage.getItem(VIM_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setVimModeEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(VIM_MODE_KEY, enabled.toString());
    if (currentEditorView) {
      currentEditorView.dispatch({
        effects: vimCompartment.reconfigure(enabled ? vim() : [])
      });
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function getCurrentEditorView(): EditorView | null {
  return currentEditorView;
}

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


export const defaultContent = `mesh(sphere(), material()).translateX(1).rotateY(45).render("mySphere")

// Try pressing Ctrl+Enter on the line above!
// This will create a sphere mesh named "mySphere", translate it, rotate it, and add it to the scene
// Running it again will update the existing object instead of creating a new one!

mesh(box(2, 1, 1), material({color: 0xff0000})).translateX(-3).render("redBox")

mesh(cylinder(), material({color: 0x0000ff, wireframe: true})).translateX(3).render("blueCylinder")

// Try modifying the values and re-running to see objects update:
// mesh(sphere(0.5), material({color: 0xffffff})).translateY(2).rotateX(90).render("mySphere")
// mesh(box(1, 3, 1), material({color: 0x00ff00})).translateX(-2).render("redBox")

// Use clearAll() to remove all objects:
// clearAll()
`;

export function createEditorState(content: string = defaultContent): EditorState {
  const vimModeEnabled = getVimModeEnabled();
  
  return EditorState.create({
    doc: content,
    extensions: [
      vimCompartment.of(vimModeEnabled ? vim() : []),
      basicSetup,
      javascript(),
      Prec.highest(keymap.of([{ key: "Ctrl-Enter", run: handleCtrlEnter }])),
    ],
  });
}

export function setCurrentEditorView(view: EditorView): void {
  currentEditorView = view;
}
