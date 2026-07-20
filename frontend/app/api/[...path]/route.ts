import { NextRequest } from 'next/server';

// Local development should work immediately after starting FastAPI on port 8000.
// Hosted deployments must provide an explicit server-side proxy target.
const backendBaseUrl = process.env.PROXIMA_API_BASE_URL
  || process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : undefined);

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (!backendBaseUrl) {
    return Response.json({ detail: 'The API proxy is not configured.' }, { status: 503 });
  }
  const sourceUrl = new URL(request.url);
  let target: URL;
  try {
    target = new URL(`/api/v1/${path.join('/')}`, backendBaseUrl);
  } catch {
    return Response.json({ detail: 'The API proxy URL is invalid.' }, { status: 503 });
  }
  target.search = sourceUrl.search;
  // Do not forward Vercel's hop-by-hop request headers. In particular,
  // forwarding `connection` and `content-length` can make an upstream POST
  // fail even though the same route works when called directly.
  const headers = new Headers();
  for (const name of ['accept', 'authorization', 'content-type', 'cookie']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const method = request.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();
  let upstream: Response;
  try {
    upstream = await fetch(target, { method, headers, body, cache: 'no-store' });
  } catch {
    return Response.json({ detail: 'The API service is temporarily unavailable.' }, { status: 502 });
  }
  const responseHeaders = new Headers(upstream.headers);
  for (const header of ['content-encoding', 'content-length', 'transfer-encoding']) responseHeaders.delete(header);
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
