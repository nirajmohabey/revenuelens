import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = await realpath(resolve(project, 'dist'));
const args = process.argv.slice(2);
let port = 4317;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] !== '--port' || !args[i + 1]) throw new Error('Usage: npm run serve -- --port 4317');
  port = Number(args[++i]);
}
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be an integer from 1 to 65535.');
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8'
};
function isInside(path) { return path === root || path.startsWith(root + sep); }
function finish(response, status, text, method) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(method === 'HEAD' ? undefined : text);
}
const server = createServer(async (request, response) => {
  const method = request.method;
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  if (method !== 'GET' && method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    return finish(response, 405, 'Method not allowed', method);
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { return finish(response, 400, 'Invalid request path', method); }
  if (pathname.includes('\0') || pathname.includes('\\')) return finish(response, 400, 'Invalid request path', method);
  const candidate = resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
  if (!isInside(candidate)) return finish(response, 403, 'Forbidden', method);
  try {
    const actual = await realpath(candidate);
    if (!isInside(actual)) return finish(response, 403, 'Forbidden', method);
    const info = await stat(actual);
    if (!info.isFile()) return finish(response, 404, 'Not found', method);
    response.writeHead(200, {
      'Content-Type': types[extname(actual).toLowerCase()] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-cache'
    });
    if (method === 'HEAD') return response.end();
    const stream = createReadStream(actual);
    stream.on('error', () => response.destroy());
    response.on('close', () => { if (!response.writableFinished) stream.destroy(); });
    stream.pipe(response);
  } catch (error) {
    const missing = error.code === 'ENOENT' || error.code === 'ENOTDIR';
    return finish(response, missing ? 404 : 500, missing ? 'Not found' : 'Unable to serve file', method);
  }
});
server.on('error', (error) => { console.error(`Preview failed: ${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`RevenueLens Local: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
