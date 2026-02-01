import { EditorState, Prec, Compartment, Text } from "@codemirror/state";
import { EditorView, keymap, ViewUpdate } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { CodeMirror, vim } from "@replit/codemirror-vim";
import {
  languageServerExtensions,
  LSPClient,
  Transport,
  Workspace,
  WorkspaceFile,
  LSPPlugin,
} from "@codemirror/lsp-client";
import { parser } from "@lezer/javascript";
// import { oneDarkTheme } from "./onedark";
import { oneDark, color as oneDarkColor } from "@codemirror/theme-one-dark";
import { getTextBlockAtPosition } from "./text_utils";
import { executeDSL } from "./dsl";
import { executeParticles, create as createParticles } from "./particles";
import { NumberNodeUniform } from "three/src/renderers/common/nodes/NodeUniform.js";

export { EditorState, EditorView, keymap, basicSetup, javascript };

// Vim mode state management
const VIM_MODE_KEY = "three-tree-vim-mode";
const EDITOR_CONTENT_KEY = "three-tree-editor-content";
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

export function saveEditorContent(content: string): void {
  try {
    localStorage.setItem(EDITOR_CONTENT_KEY, content);
  } catch {
    // Ignore localStorage errors
  }
}

export function getStoredEditorContent(): string | null {
  try {
    return localStorage.getItem(EDITOR_CONTENT_KEY);
  } catch {
    return null;
  }
}

export function getCurrentEditorView(): EditorView | null {
  return currentEditorView;
}

let currentParticles;

export function getCurrentParticles() {
  return currentParticles;
}

// Custom command for Ctrl-Enter
const handleCtrlEnter =
  (particles) =>
  (view: EditorView): boolean => {
    const blockInfo = getBlockAtCursor(view);

    if (blockInfo && blockInfo.block) {
      const code = blockInfo.block.trim();
      const fullDocument = view.state.doc.toJSON();
      const beginIndex = fullDocument.findIndex((value) =>
        value.includes("begin-eval"),
      );
      const codeDoc = fullDocument.slice(beginIndex + 1).join("\n");
      console.log(beginIndex, codeDoc);

      try {
        const result = executeParticles(code, undefined, codeDoc, particles);
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

export const defaultContent = `import * as THREE from "three/webgpu";
import {TSL as t} from "three/webgpu";
import {paletteNode, hsvToRgb} from "./compute/oscillare"
import { beatramp } from "./particles"


declare const nodes : Record<string, t.ShaderNodeObject<THREE.Node>>

/** begin-eval */

const time = beatramp;
nodes.size = t.float(0.01)

const palette = paletteNode("darkestred");
const age = t.sub(time, nodes.birthTime);
let paletteIndex = t.rand(t.instanceIndex);
paletteIndex = paletteIndex.mul(0.3).add(nodes.position.y.sub(-2).div(4).mul(0.7));
let hsv = palette.element(t.int(paletteIndex.clamp(0, 2).mul(palette.value.count)));
hsv = t.vec3(hsv.x, hsv.y.add(hsv.y.oneMinus().mul(beatramp.mod(1))), hsv.z);
nodes.color = hsvToRgb(hsv);
// nodes.force = nodes.force.add(t.vec3(0.0001, 0, 0).mul(t.sin(time.mul(0.5)).add(t.float(0.15))));

nodes.force= nodes.force.add(nodes.position.mul(-0.0001)).mul(t.vec3(1, 1, 2));


nodes.lifespan = t.float(99999999)



const sphere = {
  position: (time) => t.vec3(0),
  radius: (time) => t.vec3(t.sin(time.mul(2)).abs().mul(1.5).add(0.25)),
  color: t.vec3(0, 0, 1)
}

const sphere2 = {
  position: (time) => t.vec3(t.sin(time.mul(2)).mul(2), 0, 0),
  radius: (time) => t.float(0.75),
  color: t.vec3(1, 0, 0)
}

const sphere3 = {
  position: (time) => t.vec3(0, t.sin(time), 0),
  radius: (time) => t.float(1),
  color: t.vec3(0, 1, 0)
}

const applySphere = (sphere) => {
    const prevFrame = time.sub(0.0166);
    const r = sphere.radius(time);
    const p = sphere.position(time);
    const pprev = sphere.position(prevFrame);
    const rprev = sphere.radius(prevFrame);

    const posNode = nodes.position.sub(p);
    const surface = posNode.normalize().mul(r);
    const diff = surface.sub(posNode);
    const diffSq = diff.lengthSq()
    const isInside = posNode
        .length()
        .lessThan(r);

    const v = p.sub(pprev).add(posNode.normalize().mul(r.sub(rprev)));

    const v1 = nodes.velocity.sub(v);
    const N = posNode.normalize();

    const v2 = v1.sub(t.vec3(2).mul(v1.dot(N)).mul(N));

    // nodes.force = diffSq.lessThan(
    //     t.float(16)
    //   ).select(
    //     isInside.select(
    //         nodes.force.add(v1.dot(N)),
    //         nodes.force
    //         // t.float(0.0002).div(diffSq.add(1)).mul(diff.normalize()).add(nodes.force),
    //     ),
    //     nodes.force
    // );

    nodes.velocity =
        isInside.select(
            v2.mul(0.95),
            nodes.velocity
        );

    nodes.position =
        isInside.select(
            surface.add(p),
            nodes.position
        )

    nodes.color = t.mix(nodes.color, sphere.color, diffSq.mul(8).oneMinus().max(0));
}


// applySphere(sphere);
applySphere(sphere2);
applySphere(sphere3);

nodes.color = nodes.color.mul(beatramp.mul(0.25).mod(1).oneMinus().add(0.2));

`;

// Extension to save content on document changes
const saveContentExtension = EditorView.updateListener.of(
  (update: ViewUpdate) => {
    if (update.docChanged) {
      const content = update.state.doc.toString();
      saveEditorContent(content);
    }
  },
);

class DefaultWorkspaceFile {
  uri: string;
  languageId: string;
  version: number;
  view: EditorView;
  doc: Text;

  constructor(uri, languageId, version, doc, view) {
    this.uri = uri;
    this.languageId = languageId;
    this.version = version;
    this.doc = doc;
    this.view = view;
  }
  getView() {
    return this.view;
  }
}
class ThreelyWorkspace extends Workspace {
  files: WorkspaceFile[];
  fileVersions: {};
  constructor(client) {
    super(client);
    this.files = [];
    this.fileVersions = Object.create(null);
  }
  nextFileVersion(uri) {
    var _a;
    return (this.fileVersions[uri] =
      ((_a = this.fileVersions[uri]) !== null && _a !== void 0 ? _a : -1) + 1);
  }
  prependFile(doc) {
    return Text.of(
      [
        `import * as THREE from "three/webgpu"`,
        "",
        "const t = THREE.TSL;",
        "declare var nodes : Record<string, THREE.TSL.Node<unknown>>;",
      ].concat(doc.toJSON()),
    );
  }
  syncFiles() {
    let result: Array<any> = [];
    for (let file of this.files) {
      let plugin = LSPPlugin.get(file.getView()!);
      if (!plugin) continue;
      let changes = plugin.unsyncedChanges;
      if (!changes.empty) {
        result.push({ changes, file, prevDoc: file.doc });
        file.doc = file.getView()!.state.doc;
        file.version = this.nextFileVersion(file.uri);
        plugin.clear();
      }
    }
    return result;
  }
  openFile(uri, languageId, view) {
    console.log("openFile", uri, languageId);
    if (this.getFile(uri))
      throw new Error(
        "Default workspace implementation doesn't support multiple views on the same file",
      );
    let file = new DefaultWorkspaceFile(
      uri,
      languageId,
      this.nextFileVersion(uri),
      view.state.doc,
      view,
    );
    this.files.push(file);
    this.client.didOpen(file);
  }
  closeFile(uri) {
    let file = this.getFile(uri);
    if (file) {
      this.files = this.files.filter((f) => f != file);
      this.client.didClose(uri);
    }
  }
}

export async function createEditorState(
  content: string = defaultContent,

  renderer,
): Promise<EditorState> {
  const vimModeEnabled = getVimModeEnabled();

  // Use stored content if available, otherwise use provided content
  const storedContent = getStoredEditorContent();
  const initialContent = storedContent !== null ? storedContent : content;

  const particles = await createParticles(renderer);
  currentParticles = particles;

  function simpleWebSocketTransport(uri: string): Promise<Transport> {
    let handlers: ((value: string) => void)[] = [];
    let sock: WebSocket;
    let reconnectAttempts = 0;
    let maxReconnectDelay = 30000; // 30 seconds max delay
    let reconnectTimeoutId: number | null = null;
    let hasConnectedOnce = false; // Track if we've ever connected successfully

    const connect = () => {
      sock = new WebSocket(uri);

      sock.onmessage = (e) => {
        for (let h of handlers) h(e.data.toString());
      };

      sock.onclose = () => {
        // Only reconnect if we've successfully connected at least once
        if (!hasConnectedOnce) {
          console.log("WebSocket closed before initial connection");
          return;
        }

        console.log("WebSocket closed, attempting to reconnect...");
        // Clear any existing reconnect timeout
        if (reconnectTimeoutId !== null) {
          clearTimeout(reconnectTimeoutId);
        }

        // Calculate exponential backoff delay: 1s, 2s, 4s, 8s, 16s, 30s (max)
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttempts),
          maxReconnectDelay,
        );
        reconnectAttempts++;

        reconnectTimeoutId = setTimeout(() => {
          console.log(`Reconnecting... (attempt ${reconnectAttempts})`);
          connect();
        }, delay) as unknown as number;
      };

      sock.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      sock.onopen = () => {
        console.log("WebSocket connected");
        hasConnectedOnce = true; // Mark that we've connected successfully
        reconnectAttempts = 0; // Reset counter on successful connection
        if (reconnectTimeoutId !== null) {
          clearTimeout(reconnectTimeoutId);
          reconnectTimeoutId = null;
        }
      };
    };

    connect();

    return new Promise((resolve) => {
      const checkConnection = () => {
        if (sock.readyState === WebSocket.OPEN) {
          resolve({
            send(message: string) {
              if (sock.readyState === WebSocket.OPEN) {
                sock.send(message);
              }
            },
            subscribe(handler: (value: string) => void) {
              handlers.push(handler);
            },
            unsubscribe(handler: (value: string) => void) {
              handlers = handlers.filter((h) => h != handler);
            },
          });
        } else {
          // Wait for connection to open
          sock.addEventListener(
            "open",
            () => {
              resolve({
                send(message: string) {
                  if (sock.readyState === WebSocket.OPEN) {
                    sock.send(message);
                  }
                },
                subscribe(handler: (value: string) => void) {
                  handlers.push(handler);
                },
                unsubscribe(handler: (value: string) => void) {
                  handlers = handlers.filter((h) => h != handler);
                },
              });
            },
            { once: true },
          );
        }
      };
      checkConnection();
    });
  }
  const transport = await simpleWebSocketTransport(process.env.LSP_BASE_URL!);

  let client = new LSPClient({
    rootUri: process.env.LSP_BASE_FILE_URI!,
    extensions: [
      ...languageServerExtensions(),
      {
        clientCapabilities: {
          workspace: {
            didChangeConfiguration: {},
          },
        },
      },
    ],
    workspace: (client) => {
      return new ThreelyWorkspace(client);
    },
  }).connect(transport);

  return EditorState.create({
    doc: initialContent,
    extensions: [
      vimCompartment.of(vimModeEnabled ? vim() : []),
      basicSetup,
      javascript({
        typescript: true,
      }),
      EditorView.theme({
        ".cm-activeLine": {
          backgroundColor: `${oneDarkColor.darkBackground}aa`,
        },
      }),
      oneDark,
      saveContentExtension,
      Prec.highest(
        keymap.of([{ key: "Ctrl-Enter", run: handleCtrlEnter(particles) }]),
      ),
      client.plugin(`${process.env.LSP_BASE_FILE_URI}/index.ts`),
    ],
  });
}

export function setCurrentEditorView(view: EditorView): void {
  currentEditorView = view;
}
