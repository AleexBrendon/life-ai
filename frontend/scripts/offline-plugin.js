import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const template = new URL('../src/offline/service-worker.template.js', import.meta.url);
export default function offlinePlugin() {
  return {
    name: 'lifeai-offline-shell',
    configureServer(server) {
      server.middlewares.use('/sw.js', async (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript'); res.setHeader('Cache-Control', 'no-store');
        res.end(await readFile(template, 'utf8'));
      });
    },
    async generateBundle(_options, bundle) {
      const publicPaths = ['/favicon.svg', '/lifeai-icon.svg', '/lifeai-icon-192.png', '/lifeai-icon-512.png', '/lifeai-icon-180.png', '/manifest.webmanifest'];
      const paths = ['/index.html', ...publicPaths, ...Object.keys(bundle).filter(name => /\.(js|css|woff2)$/.test(name)).map(name => '/' + name)].sort();
      const sourceTemplate = await readFile(template, 'utf8');
      const digest = createHash('sha256').update(paths.join('\n')).update(sourceTemplate);
      for (const filename of publicPaths) digest.update(await readFile(new URL('../public' + filename, import.meta.url)));
      const version = digest.digest('hex').slice(0, 12);
      const source = sourceTemplate.replace('const PRECACHE = [];', `const PRECACHE = ${JSON.stringify(paths)};`).replace('lifeai-shell-development', 'lifeai-shell-' + version);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}
