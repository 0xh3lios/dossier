// The explorer's server: read-only, on 127.0.0.1, GET only. It answers the page's questions from
// verify's analysis of the root, computed with write: false, and from the chart's own code. After a
// change under the root or in the knowledge base it drops the analysis and tells every open page,
// which then asks again.
import { createServer } from 'node:http';
import { existsSync, statSync, watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { verifyAll } from '../commands/verify.ts';
import { readMarker } from '../dossiers/root.ts';
import { readMeanings } from './meanings.ts';
import { addresses, componentModel, componentTrace, rootModel, systemModel, systemTrace } from './model.ts';
import { chartRun, explainAt, LIMIT } from './run.ts';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { FSWatcher } from 'node:fs';
import type { Verified } from '../commands/verify.ts';
import type { Run } from './run.ts';

export const DEFAULT_PORT = 3677;
// How many ports past the asked one to try when it is taken.
const TRIES = 20;
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.map': 'application/json', '.svg': 'image/svg+xml' };

// Changes that move nothing verify reads: the explorer's own build, the packages, scratch work and
// git's own files at the root, and each dossier's local trial bundles. A dossier's .running/ is not
// quiet, since verify reports a publication left unfinished there.
export const quiet = (path: string): boolean => /^(\.explorer|node_modules|_scratch|\.git)([\\/]|$)|^(components|systems)[\\/][^\\/]+[\\/]trials([\\/]|$)/.test(path);

// No free port among the ones tried.
export class NoFreePort extends Error {}

export interface ExplorerOptions { root: string; pluginRoot: string; version: string; port?: number; limit?: number; dist: string | null; log?: (line: string) => void }
export interface Explorer { url: string; port: number; close(): Promise<void> }

// Listens on the asked port, or the next free one: an address that stays the same keeps what the page
// remembers. Port 0 asks the system for any free port.
async function listen(server: Server, port: number): Promise<number> {
  const last = port === 0 ? 0 : Math.min(port + TRIES - 1, 65535);
  for (let p = port; p <= last; p++) {
    const error = await new Promise<NodeJS.ErrnoException | null>(done => {
      const failed = (e: NodeJS.ErrnoException) => { server.off('listening', ready); done(e); };
      const ready = () => { server.off('error', failed); done(null); };
      server.once('error', failed);
      server.once('listening', ready);
      server.listen(p, '127.0.0.1');
    });
    if (!error) { const a = server.address(); return typeof a === 'object' && a ? a.port : p; }
    if (error.code !== 'EADDRINUSE' || port === 0) throw error;
  }
  throw new NoFreePort(`no free port from ${port} to ${last}: name another with --port`);
}

export async function startExplorer({ root, pluginRoot, version, port = DEFAULT_PORT, limit = LIMIT, dist, log = () => {} }: ExplorerOptions): Promise<Explorer> {
  const meanings = readMeanings(pluginRoot);
  let analysis: Verified | null = null;
  const verified = () => (analysis ||= verifyAll({ root, version, write: false }));
  const component = (id: string) => verified().components.find(x => x.id === id) || null;
  const system = (id: string) => verified().systems.find(x => x.id === id) || null;

  // A component's chart run, kept while its compiled form and its doubts' walks stay the same.
  const runs = new Map<string, { key: string; run: Promise<Run> }>();
  const runOf = (id: string) => {
    const a = component(id);
    if (!a) return null;
    const key = `${a.irHash}:${JSON.stringify(a.doubts.map(d => [d.id, d.walks]))}`;
    const held = runs.get(id);
    if (held?.key === key) return held.run;
    const run = chartRun(root, a, limit);
    runs.set(id, { key, run });
    return run;
  };

  const send = (res: ServerResponse, status: number, type: string, body: string | Buffer) => { res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(body); };
  const text = (res: ServerResponse, status: number, body: string) => send(res, status, 'text/plain; charset=utf-8', body);
  const json = (res: ServerResponse, value: unknown) => (value == null ? text(res, 404, 'not found') : send(res, 200, 'application/json', JSON.stringify(value)));
  const listeners = new Set<ServerResponse>();
  let bound = port;

  async function handle(req: IncomingMessage, res: ServerResponse) {
    // Only a page this machine opened at this address may ask: a name that resolves here from
    // elsewhere is refused, so another site cannot read the dossiers through a browser.
    const host = req.headers.host || '';
    if (host !== `127.0.0.1:${bound}` && host !== `localhost:${bound}`) return text(res, 403, 'the explorer answers only at 127.0.0.1 or localhost');
    if (req.method !== 'GET') return text(res, 405, 'the explorer is read-only');
    const url = new URL(req.url || '/', `http://${host}`);
    const path = url.pathname;
    if (path === '/api/events') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
      res.write(': connected\n\n');
      listeners.add(res);
      req.on('close', () => listeners.delete(res));
      return;
    }
    if (path === '/api/root') return json(res, rootModel(verified(), root, version, meanings));
    if (path === '/api/addresses') return json(res, addresses(verified()));
    let m: RegExpMatchArray | null;
    if ((m = path.match(/^\/api\/component\/([\w-]+)$/))) { const a = component(m[1]); return json(res, a && componentModel(verified(), a, meanings)); }
    if ((m = path.match(/^\/api\/component\/([\w-]+)\/run$/))) { const run = await runOf(m[1]); return json(res, run?.view); }
    if ((m = path.match(/^\/api\/component\/([\w-]+)\/explain$/))) { const run = await runOf(m[1]); return json(res, run && explainAt(run, Number(url.searchParams.get('at') || 0))); }
    if ((m = path.match(/^\/api\/component\/([\w-]+)\/trace\/([\w-]+)$/))) { const a = component(m[1]); return json(res, a && componentTrace(a, m[2])); }
    if ((m = path.match(/^\/api\/system\/([\w-]+)$/))) { const a = system(m[1]); return json(res, a && systemModel(verified(), a, meanings)); }
    if ((m = path.match(/^\/api\/system\/([\w-]+)\/trace\/([\w-]+)\/([\w-]+)$/))) { const a = system(m[1]); return json(res, a && systemTrace(verified(), a, m[2], m[3])); }
    if (path.startsWith('/api/')) return text(res, 404, 'no such question');
    if (!dist) return text(res, 503, 'the explorer\'s page is not built: run dossier explore --install');
    // One file of the built page, by its own name: no folder, no path, nothing hidden.
    const file = path === '/' ? 'index.html' : path.slice(1);
    const full = join(dist, file);
    if (!/^[\w.-]+$/.test(file) || file.startsWith('.') || !existsSync(full) || !statSync(full).isFile()) return text(res, 404, 'not found');
    return send(res, 200, TYPES[extname(file)] || 'application/octet-stream', await readFile(full));
  }

  const server = createServer((req, res) => {
    handle(req, res).catch(e => {
      log(`explore: ${(e as Error).stack || e}`);
      if (!res.headersSent) text(res, 500, `the explorer could not answer: ${(e as Error).message}`);
      else res.end();
    });
  });
  bound = await listen(server, port);

  // Open pages are told of each change under the root and in the knowledge base, whose records a
  // component's pins and a guarantee's backing read. The watch starts once the port is bound.
  let pending: NodeJS.Timeout | undefined, changed = new Set<string>();
  const notify = (file: string) => {
    changed.add(file);
    clearTimeout(pending);
    pending = setTimeout(() => {
      analysis = null;
      const paths = [...changed];
      changed = new Set();
      for (const res of listeners) res.write(`event: change\ndata: ${JSON.stringify({ paths, at: new Date().toISOString() })}\n\n`);
    }, 400);
  };
  const watchers: FSWatcher[] = [];
  const knowledge = (() => { try { const k = readMarker(root).knowledge?.root; return k ? resolve(root, k) : null; } catch { return null; } })();
  for (const [dir, label] of [[root, ''], ...(knowledge && existsSync(knowledge) ? [[knowledge, 'knowledge: ']] : [])] as [string, string][]) {
    try { watchers.push(watch(dir, { recursive: true }, (_event, file) => { if (file && !(label === '' && quiet(String(file)))) notify(label + String(file)); })); }
    catch (e) { log(`explore: not watching ${dir}: ${(e as Error).message}; reload the page after a change`); }
  }

  return {
    url: `http://127.0.0.1:${bound}/`,
    port: bound,
    close: () => new Promise<void>(done => {
      clearTimeout(pending);
      for (const w of watchers) w.close();
      for (const res of listeners) res.end();
      listeners.clear();
      server.close(() => done());
      server.closeAllConnections();
    }),
  };
}
