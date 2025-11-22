import { createServer } from "http";
import path from "path";
import fs from "fs";
import esbuild from "esbuild";
import dotenv from "dotenv";

dotenv.config();

const ctx = await esbuild.context({
  entryPoints: ["src/index.ts"],
  outfile: "public/index.js",
  bundle: true,
  minify: false,
  platform: "browser",
  define: {
    "process.env.LSP_BASE_URL": JSON.stringify(process.env.LSP_BASE_URL),
    "process.env.LSP_BASE_FILE_URI": JSON.stringify(
      process.env.LSP_BASE_FILE_URI,
    ),
  },
});

await ctx.watch();

await ctx.serve({
  servedir: "public",
  port: 8000,
  host: process.env.HOST,
});
