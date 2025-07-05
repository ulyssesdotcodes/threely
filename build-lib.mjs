import esbuild from "esbuild";
import fs from "fs";
import path from "path";

// Ensure dist directory exists
const distDir = "dist";
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Build CommonJS version
await esbuild.build({
  entryPoints: ["src/lib.ts"],
  outfile: "dist/index.js",
  bundle: true,
  minify: true,
  platform: "node",
  format: "cjs",
  external: [
    "three",
    "@codemirror/*",
    "@replit/codemirror-vim",
    "codemirror",
    "@solidjs/signals",
    "uuid",
  ],
  target: "node16",
});

// Build ESM version
await esbuild.build({
  entryPoints: ["src/lib.ts"],
  outfile: "dist/index.esm.js",
  bundle: true,
  minify: true,
  platform: "neutral",
  format: "esm",
  external: [
    "three",
    "@codemirror/*",
    "@replit/codemirror-vim",
    "codemirror",
    "@solidjs/signals",
    "uuid",
  ],
  target: "es2020",
});

console.log("Library builds completed successfully!");
