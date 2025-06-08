import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { getTextBlockAtPosition } from './text_utils';

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
  view.dom.style.height = '100vh';
  view.dom.style.width = '100%';
  view.dom.style.display = 'block';
}

// Initialize the editor when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', startEditor);