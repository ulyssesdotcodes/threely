import { EditorState, Prec, Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { vim } from "@replit/codemirror-vim";
import { parser } from "@lezer/javascript";
// import { oneDarkTheme } from "./onedark";
import { oneDark } from "@codemirror/theme-one-dark"
import { getTextBlockAtPosition } from "./text_utils";
import { executeDSL } from "./dsl";

export { EditorState, EditorView, keymap, basicSetup, javascript };

// Vim mode state management
const VIM_MODE_KEY = "three-tree-vim-mode";
const vimCompartment = new Compartment();
let currentEditorView: EditorView | null = null;

export function getVimModeEnabled(): boolean {
  try {
    return localStorage.getItem(VIM_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setVimModeEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(VIM_MODE_KEY, enabled.toString());
    if (currentEditorView) {
      currentEditorView.dispatch({
        effects: vimCompartment.reconfigure(enabled ? vim() : []),
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

  if (blockInfo && blockInfo.block) {
    const code = blockInfo.block.trim();
    const fullDocument = view.state.doc.toString();

    try {
      const result = executeDSL(code, undefined, fullDocument);
      if (result) {
      } else {
      }
    } catch (error) {
      console.error("Error executing DSL code:", error);
    }
  }

  // Prevent the default new line behavior by returning true
  return true;
};

// Function to get top-level expression at cursor position using Lezer parser
export const getTopLevelExpressionAtCursor = (
  view: EditorView,
): { block: string } | null => {
  const text = view.state.doc.toString();
  const cursorPos = view.state.selection.ranges[0].from;

  try {
    // Parse the entire document with Lezer
    const tree = parser.parse(text);

    // Find the top-level expression containing the cursor
    let targetExpression: { from: number; to: number } | null = null;

    // Recursive function to find the deepest top-level statement containing cursor
    const findTopLevelStatement = (node: any, depth: number = 0): any => {
      // Check if this node contains the cursor
      if (cursorPos < node.from || cursorPos > node.to) {
        return null;
      }

      // If this is a top-level statement (child of Script/Program), return it
      if (
        depth === 1 &&
        (tree.topNode.name === "Script" || tree.topNode.name === "Program")
      ) {
        return node;
      }

      // Otherwise, check children
      if (node.firstChild) {
        let child = node.firstChild;
        while (child) {
          const result = findTopLevelStatement(child, depth + 1);
          if (result) return result;
          child = child.nextSibling;
        }
      }

      // If we're at the root and found the cursor, return the whole tree
      if (depth === 0) {
        return node;
      }

      return null;
    };

    const foundNode = findTopLevelStatement(tree.topNode);

    if (foundNode) {
      targetExpression = { from: foundNode.from, to: foundNode.to };
    }

    if (targetExpression) {
      const blockText = text
        .slice(targetExpression.from, targetExpression.to)
        .trim();
      return { block: blockText };
    }

    // Fallback: if no top-level expression found, return the line at cursor
    const line = view.state.doc.lineAt(cursorPos);
    return { block: line.text.trim() };
  } catch (error) {
    console.error("Error parsing with Lezer:", error);
    // Fallback to old behavior if parsing fails
    const blockText = getTextBlockAtPosition(text, cursorPos);
    return { block: blockText };
  }
};

// Function to get block at cursor position (updated to use Lezer)
export const getBlockAtCursor = (
  view: EditorView,
): { block: string } | null => {
  return getTopLevelExpressionAtCursor(view);
};

export const defaultContent = `
const mySphere = mesh(sphere(), material()).translateX(1)

mySphere.rotateY(45).render("mySphere")

mesh(sphere(), material()).translateX(frame().mult(0.02)).rotateY(45).render("mySphere")

// Try pressing Ctrl+Enter on the line above!
// This will create a sphere mesh named "mySphere", translate it, rotate it, and add it to the scene
// Running it again will update the existing object instead of creating a new one!
// Note: sphere(), box(), and cylinder() now create mock geometries that are applied during render!

mesh(box(2, 1, 1), material({color: 0xff0000})).translateX(-3).render("redBox")

mesh(cylinder(), material({color: 0x0000ff, wireframe: true})).translateX(3).render("blueCylinder")

// Animated sphere using frame counter:
mesh(sphere(0.5), material({color: 0x00ff00})).translateX(Math.sin(frame() * 0.01) * 2).render("animatedSphere")

// Using mock objects for quick property setting:
applyMock(mesh(sphere(), material({color: 0xff0000})), mockUtils.position(2, 1, 0)).render("mockSphere")

// Using presets for common configurations:
applyMock(mesh(box(), material()), mockPresets.elevated(3)).render("elevatedBox")

// Custom geometry parameters with mock system:
mesh(sphere(1.5, 16, 8), material({color: 0xff00ff})).render("customSphere")

// Custom box with specific dimensions:
mesh(box(3, 0.5, 0.5), material({color: 0x00ffff})).translateY(-2).render("customBox")

// Custom cylinder with different top/bottom radius:
mesh(cylinder(0.5, 1, 2), material({color: 0xffff00})).translateZ(-3).render("customCylinder")

// Try modifying the values and re-running to see objects update:
// mesh(sphere(0.5), material({color: 0xffffff})).translateY(2).rotateX(90).render("mySphere")
// mesh(box(1, 3, 1), material({color: 0x00ff00})).translateX(-2).render("redBox")

// Use clearAll() to remove all objects:
// clearAll()

// --- NEW: Compute Shader Particle System ---
// Example of using the new compute functions for particle systems

// First, declare variables that will be used in computeInit
const particleBuffers = {
  position: 'vec3',
  velocity: 'vec3',
  color: 'vec3',
  birthTime: 'float',
  lifespan: 'float'
}
const particleCount = 50
const isInstanced = true
// Initialize compute buffers and nodes for particle system
const particleData = computeInit(
  particleCount,    // Number of particles
  particleBuffers,  // Buffer type definitions
  isInstanced       // Use instanced rendering
)

// Create a sprite with points material from the computed nodes
// Include the computeUpdate function in the nodes
const nodesWithUpdate = {
  ...(console.log("particle data", particleData), particleData).nodes,
  computeUpdate: particleData.computeUpdate
}

const particleSprite = pointsFromNodes(
  particleData.buffers,  // Buffers from computeInit
  nodesWithUpdate,        // Nodes with computeUpdate function
  particleCount
)

// Render the particle system to the scene
particleSprite.render("particleSystem")

// The particleSprite can now be added to the scene
// particleSprite will contain a THREE.Sprite with PointsNodeMaterial
// configured for compute shader particle rendering

// Note: These functions use THREE by default (can optionally pass a custom _lib parameter)
// They are designed to work with THREE.js WebGPU renderer and TSL (Three.js Shading Language)
// In a real implementation, you would also need frame update functions
// to animate the particles over time.
`;

export function createEditorState(
  content: string = defaultContent,
): EditorState {
  const vimModeEnabled = getVimModeEnabled();

  return EditorState.create({
    doc: content,
    extensions: [
      vimCompartment.of(vimModeEnabled ? vim() : []),
      basicSetup,
      javascript(),
      oneDark,
      Prec.highest(keymap.of([{ key: "Ctrl-Enter", run: handleCtrlEnter }])),
    ],
  });
}

export function setCurrentEditorView(view: EditorView): void {
  currentEditorView = view;
}
