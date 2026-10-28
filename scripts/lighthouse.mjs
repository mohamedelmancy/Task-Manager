import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { gzipSync } from 'node:zlib';

const port = 4399;
const root = 'dist/task-manager/browser';
const url = `http://127.0.0.1:${port}/tasks`;
const minimumScore = 0.9;
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

await build();
const server = await serve();

try {
  const report = await measure(url);
  for (const [name, score] of Object.entries(report.scores)) {
    console.log(`${name}: ${score}`);
  }

  const failed = Object.entries(report.scores).filter(([, score]) => score < minimumScore * 100);
  if (failed.length > 0) {
    console.log(report.weakAudits.join('\n'));
    process.exitCode = 1;
  }
} finally {
  server.close();
}

function build() {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['ng', 'build'], { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error('Production build failed'));
    });
  });
}

function send(request, response, body, type, filePath) {
  const hashed = /-[A-Z0-9]{8}\.[a-z0-9]+$/i.test(filePath);
  const headers = {
    'content-type': type,
    'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
  };
  const compressible = type.startsWith('text/') || type === 'application/json';
  const acceptsGzip = request.headers['accept-encoding']?.includes('gzip');

  if (compressible && acceptsGzip) {
    response.writeHead(200, { ...headers, 'content-encoding': 'gzip' });
    response.end(gzipSync(body));
    return;
  }

  response.writeHead(200, headers);
  response.end(body);
}

function serve() {
  return new Promise((resolve) => {
    const server = createServer(async (request, response) => {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', url).pathname);
      const filePath = join(root, pathname);

      try {
        const body = await readFile(filePath);
        send(
          request,
          response,
          body,
          types[extname(filePath)] ?? 'application/octet-stream',
          filePath,
        );
      } catch {
        const index = await readFile(join(root, 'index.html'));
        send(request, response, index, 'text/html', 'index.html');
      }
    });

    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function measure(address) {
  const lighthouse = (await import('../tools/node_modules/lighthouse/core/index.js')).default;
  const chromeLauncher = await import('../tools/node_modules/chrome-launcher/dist/index.js');
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox'] });

  try {
    const result = await lighthouse(address, {
      port: chrome.port,
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });

    const scores = Object.fromEntries(
      Object.values(result.lhr.categories).map((category) => [
        category.title,
        Math.round((category.score ?? 0) * 100),
      ]),
    );
    const weakAudits = Object.values(result.lhr.audits)
      .filter((audit) => audit.score !== null && audit.score < 1)
      .map(
        (audit) =>
          `${audit.id}: ${Math.round((audit.score ?? 0) * 100)} ${audit.displayValue ?? ''}`,
      );

    return { scores, weakAudits };
  } finally {
    await chrome.kill();
  }
}
