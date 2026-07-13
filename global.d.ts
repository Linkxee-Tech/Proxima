declare module 'node:http' {
  export interface IncomingMessage extends AsyncIterable<Uint8Array> { url?: string; method?: string }
  export interface ServerResponse { statusCode: number; setHeader(name: string, value: string): void; end(chunk?: string): void }
  export function createServer(handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>): { listen(port?: string | number): void };
}
declare const process: { argv: string[]; env: Record<string, string | undefined> };
declare const Buffer: { from(input: string | Uint8Array): Uint8Array; concat(chunks: Uint8Array[]): { toString(encoding: string): string } };
