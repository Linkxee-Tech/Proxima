import { NextRequest } from 'next/server';

const backendBaseUrl = process.env.PROXIMA_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;

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
  const headers = new Headers(request.headers);
  headers.delete('host');
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
