import http from 'node:http';
import { API_ROUTES } from '../../../packages/contracts/src/index.ts';
import { architecture, createWorkflowPlan, getSnapshot } from '../../../packages/kernel/src/index.ts';

export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    res.setHeader('content-type', 'application/json');
    if (url.pathname === API_ROUTES.health) return res.end(JSON.stringify({ ok: true, service: 'proxima-api' }));
    if (url.pathname === API_ROUTES.architecture) return res.end(JSON.stringify(architecture));
    const snapshot = getSnapshot();
    if (url.pathname === API_ROUTES.tasks) return res.end(JSON.stringify(snapshot.tasks));
    if (url.pathname === API_ROUTES.agents) return res.end(JSON.stringify(snapshot.agents));
    if (url.pathname === API_ROUTES.artifacts) return res.end(JSON.stringify(snapshot.artifacts));
    if (url.pathname === API_ROUTES.approvals) return res.end(JSON.stringify(snapshot.approvals));
    if (url.pathname === API_ROUTES.plan && req.method === 'POST') {
      const chunks: Uint8Array[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
      return res.end(JSON.stringify(createWorkflowPlan({ goal: String(body.goal ?? '') })));
    }
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'Not found', path: url.pathname }));
  });
}

if (process.argv[1]?.endsWith('server.js')) createServer().listen(process.env.PORT ?? 3001);
