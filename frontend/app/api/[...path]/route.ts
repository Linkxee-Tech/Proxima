import { NextRequest } from 'next/server';

const backendBaseUrl = process.env.PROXIMA_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const sourceUrl = new URL(request.url);
  const target = new URL(`/api/v1/${path.join('/')}`, backendBaseUrl);
  target.search = sourceUrl.search;
  const headers = new Headers(request.headers);
  headers.delete('host');
  const method = request.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();
  const upstream = await fetch(target, { method, headers, body, cache: 'no-store' });
  const responseHeaders = new Headers(upstream.headers);
  for (const header of ['content-encoding', 'content-length', 'transfer-encoding']) responseHeaders.delete(header);
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
