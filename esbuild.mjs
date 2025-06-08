import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import esbuild from 'esbuild';

const PORT = 8080;
const PUBLIC_DIR = path.join(process.cwd(), 'public');

// Initialize esbuild context for TypeScript files
const ctx = await esbuild.context({
  entryPoints: ['src/index.ts'], // Adjust the input file as needed
  outdir: PUBLIC_DIR,
  bundle: true,
  minify: true, // Minify code for production
  platform: 'browser', // Ensure it's built for browser environment
  format: 'esm', // Use ES module format
});

// Rebuild when files change
await ctx.watch();

// Create a server to serve files in the 'public' directory
const server = createServer((req, res) => {
  const filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK, (err) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
      return;
    }

    const ext = path.extname(filePath);
    let contentType = 'text/html';

    switch (ext) {
      case '.js':
        contentType = 'application/javascript';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      default:
        contentType = 'text/plain';
    }

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
