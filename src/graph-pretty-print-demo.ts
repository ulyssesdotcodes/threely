// DISABLED: Demo of the graph pretty printer - uses old Node-based system
// TODO: Update this demo to work with the new direct AST to Nodysseus system

/*
import { Graph } from "./graph";
import { GraphPrettyPrinter } from "./graph-pretty-printer";
import {
  sphere,
  box,
  material,
  mesh,
  translateX,
  rotateY,
  render,
} from "./dsl";

// Create a complex graph: render(rotateY(translateX(mesh(sphere(), material()), 2), Math.PI/4), "demo")
const sphereGeom = sphere(1, 16, 12);
const mat = material({ color: 0xff0000 });
const meshNode = mesh(sphereGeom, mat);
const translated = translateX(meshNode, 2);
const rotated = rotateY(translated, Math.PI / 4);
const rendered = render(rotated, "demo");

console.log("=== Graph Pretty Print Demo ===\n");

// Show how the new Graph.run works
console.log("Running the graph:");
const result = Graph.run(rendered);
console.log("Result type:", result.constructor.name);

// Default pretty print
console.log("\nDefault tree view:");
console.log(Graph.prettyPrint(rendered));

// Compact representation
console.log("\nCompact representation:");
console.log(Graph.compact(rendered));

// Custom options
console.log("\nWithout IDs and dependency counts:");
console.log(
  Graph.prettyPrint(rendered, {
    showIds: false,
    showDependencyCount: false,
  }),
);

// Custom node labeler
console.log("\nWith custom node labels:");
console.log(
  Graph.prettyPrint(rendered, {
    nodeLabel: (node) => {
      const valueStr =
        typeof node.value === "function"
          ? node.value.toString()
          : String(node.value);
      if (valueStr.includes("SphereGeometry")) return "🌍 SPHERE";
      if (valueStr.includes("MeshBasicMaterial")) return "🎨 MATERIAL";
      if (valueStr.includes("THREE.Mesh")) return "🔧 MESH";
      if (valueStr.includes("translateXObj")) return "➡️ TRANSLATE-X";
      if (valueStr.includes("rotateYObj")) return "🔄 ROTATE-Y";
      if (valueStr.includes("currentScene.add")) return "🖼️ RENDER";
      return "❓ UNKNOWN";
    },
  }),
);

// Multiple separate graphs
const box1 = box(2, 2, 2);
const mat2 = material({ color: 0x00ff00 });
const mesh2 = mesh(box1, mat2);

console.log("\nMultiple root nodes:");
const printer = new GraphPrettyPrinter();
console.log(printer.printForest([rendered, mesh2]));
*/
