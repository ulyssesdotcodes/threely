import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import esbuild from 'esbuild';

const ctx = await esbuild.context({
  entryPoints: ['src/index.ts'],
  outfile: 'public/index.js',
  bundle: true,
  minify: false,
  platform: 'browser',
});

await ctx.watch();

await ctx.serve({
  servedir: "public",
  port: 8000,
  host: "0.0.0.0"
});

