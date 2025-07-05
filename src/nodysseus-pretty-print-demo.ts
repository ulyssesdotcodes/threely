// nodysseus-pretty-print-demo.ts - Demo showcasing Nodysseus graph pretty printing
import {
  prettyPrint,
  compact,
  NodysseusPrettyPrinter,
} from "./nodysseus-pretty-printer";
import { Graph, RefNode, ValueNode, Edge } from "./nodysseus/types";

// Create a complex demo graph representing a 3D scene
const createDemoGraph = (): Graph => {
  // Geometry nodes
  const sphereRadius: ValueNode = {
    id: "sphere-radius",
    value: "2.0",
  };

  const sphereGeometry: RefNode = {
    id: "sphere-geo",
    ref: "@graph.executable",
    value: function () {
      return "SphereGeometry";
    },
  };

  // Material nodes
  const materialColor: ValueNode = {
    id: "material-color",
    value: "0x00ff00",
  };

  const basicMaterial: RefNode = {
    id: "basic-material",
    ref: "@graph.executable",
    value: function () {
      return "MeshBasicMaterial";
    },
  };

  // Mesh node
  const mesh: RefNode = {
    id: "main-mesh",
    ref: "@graph.executable",
    value: function () {
      return "THREE.Mesh";
    },
  };

  // Transform nodes
  const translateX: RefNode = {
    id: "translate-x",
    ref: "@graph.executable",
    value: function () {
      return "translateXObj";
    },
  };

  const xOffset: ValueNode = {
    id: "x-offset",
    value: "5.0",
  };

  // Animation frame
  const frame: RefNode = {
    id: "anim-frame",
    ref: "extern.frame",
  };

  const edges: Record<string, Edge> = {
    "sphere-radius->sphere-geo": {
      from: "sphere-radius",
      to: "sphere-geo",
      as: "arg0",
    },
    "material-color->basic-material": {
      from: "material-color",
      to: "basic-material",
      as: "arg0",
    },
    "sphere-geo->main-mesh": {
      from: "sphere-geo",
      to: "main-mesh",
      as: "arg0",
    },
    "basic-material->main-mesh": {
      from: "basic-material",
      to: "main-mesh",
      as: "arg1",
    },
    "main-mesh->translate-x": {
      from: "main-mesh",
      to: "translate-x",
      as: "arg0",
    },
    "x-offset->translate-x": {
      from: "x-offset",
      to: "translate-x",
      as: "arg1",
    },
    "anim-frame->translate-x": {
      from: "anim-frame",
      to: "translate-x",
      as: "arg2",
    },
  };

  const edges_in = {
    "sphere-geo": { "sphere-radius": edges["sphere-radius->sphere-geo"] },
    "basic-material": {
      "material-color": edges["material-color->basic-material"],
    },
    "main-mesh": {
      "sphere-geo": edges["sphere-geo->main-mesh"],
      "basic-material": edges["basic-material->main-mesh"],
    },
    "translate-x": {
      "main-mesh": edges["main-mesh->translate-x"],
      "x-offset": edges["x-offset->translate-x"],
      "anim-frame": edges["anim-frame->translate-x"],
    },
  };

  return {
    id: "animated-sphere-scene",
    name: "Animated Sphere Scene",
    description:
      "A green sphere that moves along the X-axis with animation frames",
    out: "translate-x",
    nodes: {
      "sphere-radius": sphereRadius,
      "sphere-geo": sphereGeometry,
      "material-color": materialColor,
      "basic-material": basicMaterial,
      "main-mesh": mesh,
      "translate-x": translateX,
      "x-offset": xOffset,
      "anim-frame": frame,
    },
    edges,
    edges_in,
  };
};

// Demo function to showcase all pretty printing features
export function runPrettyPrintDemo() {
  console.log("=".repeat(60));
  console.log("NODYSSEUS GRAPH PRETTY PRINTING DEMO");
  console.log("=".repeat(60));

  const graph = createDemoGraph();

  // 1. Basic pretty print
  console.log("\n1. BASIC PRETTY PRINT:");
  console.log("-".repeat(40));
  console.log(prettyPrint(graph));

  // 2. Compact representation
  console.log("\n2. COMPACT REPRESENTATION:");
  console.log("-".repeat(40));
  console.log(compact(graph));

  // 3. Custom options - no IDs, no types
  console.log("\n3. SIMPLIFIED VIEW (No IDs, No Types):");
  console.log("-".repeat(40));
  console.log(
    prettyPrint(graph, {
      showIds: false,
      showTypes: false,
    }),
  );

  // 4. Custom node labeling with emojis
  console.log("\n4. CUSTOM LABELING WITH EMOJIS:");
  console.log("-".repeat(40));
  const emojiLabeler = (node: any) => {
    if (node.ref === "extern.frame") return "🎬 frame";
    if (node.ref === "@graph.executable" && node.value) {
      const funcStr = node.value.toString();
      if (funcStr.includes("SphereGeometry")) return "🌍 sphere";
      if (funcStr.includes("MeshBasicMaterial")) return "🎨 material";
      if (funcStr.includes("THREE.Mesh")) return "🔷 mesh";
      if (funcStr.includes("translateX")) return "➡️ moveX";
    }
    if (node.value && typeof node.value === "string") {
      if (node.value.startsWith("0x")) return `🎨 ${node.value}`;
      return `📊 ${node.value}`;
    }
    return "❓ unknown";
  };

  console.log(
    prettyPrint(graph, {
      nodeLabel: emojiLabeler,
      showIds: false,
    }),
  );

  // 5. Depth limiting demonstration
  console.log("\n5. DEPTH LIMITED (Max Depth 2):");
  console.log("-".repeat(40));
  console.log(prettyPrint(graph, { maxDepth: 2 }));

  console.log("\n" + "=".repeat(60));
  console.log("Demo completed! 🎉");
  console.log("=".repeat(60));
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runPrettyPrintDemo();
}
