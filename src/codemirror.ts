import { EditorState, Prec, Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { vim } from "@replit/codemirror-vim";
import { getTextBlockAtPosition } from "./text_utils";
import { executeDSL } from "./dsl";
import {
  uuidRangeSetField,
  uuidRangeSetPlugin,
  generateUUIDTags,
  setUUIDRangeSet,
  getUUIDFromState,
  UUIDTag,
} from "./uuid-tagging";
import { State } from "./nodysseus/node-types";

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

    try {
      // const ranges: { start: number; end: number; uuid: UUIDTag }[] = [];
      // .between(
      //   blockInfo.start,
      //   blockInfo.end,
      //   (start, end, uuid) => (
      //     ranges.push({
      //       start: start - blockInfo.start,
      //       end: end - blockInfo.start,
      //       uuid,
      //     }),
      //     undefined
      //   ),
      // );
      const result = executeDSL(
        code,
        view.state.field(uuidRangeSetField),
        undefined,
        blockInfo.start,
      );
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

// Function to get block at cursor position
export const getBlockAtCursor = (
  view: EditorView,
): { block: string; start: number; end: number } | null => {
  const text = view.state.doc.toString();
  const cursorPos = view.state.selection.ranges[0].from;

  return getTextBlockAtPosition(text, cursorPos);
};

export const defaultContent = `mesh(sphere(), material()).translateX(1).rotateY(45).render("mySphere")

mesh(sphere(), material()).translateX(frame().mult(0.02).floor()).rotateY(45).render("mySphere")

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
`;

export function createEditorState(
  content: string = defaultContent,
): EditorState {
  const vimModeEnabled = getVimModeEnabled();

  // Generate new tags for the content
  const { rangeSet } = generateUUIDTags(content);

  const state = EditorState.create({
    doc: content,
    extensions: [
      vimCompartment.of(vimModeEnabled ? vim() : []),
      basicSetup,
      javascript(),
      Prec.highest(keymap.of([{ key: "Ctrl-Enter", run: handleCtrlEnter }])),
      uuidRangeSetField, // Add UUID RangeSet field
      uuidRangeSetPlugin, // Add UUID RangeSet plugin for automatic updates
    ],
  });

  // Apply the initial UUID RangeSet
  return state.update({
    effects: setUUIDRangeSet.of(rangeSet),
  }).state;
}

export function setCurrentEditorView(view: EditorView): void {
  currentEditorView = view;
}
