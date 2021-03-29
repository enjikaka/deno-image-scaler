import { serve } from "https://deno.land/std@0.91.0/http/server.ts";
import { resize } from "https://deno.land/x/deno_image/mod.ts";
import { Sha1 } from "https://deno.land/std@0.91.0/hash/sha1.ts";
import { compress as brotliEncode } from 'https://deno.land/x/brotli@v0.1.4/mod.ts';
import { gzipEncode } from 'https://raw.githubusercontent.com/manyuanrong/wasm_gzip/v1.0.0/mod.ts';
import type { ServerRequest } from 'https://deno.land/std@0.91.0/http/server.ts';

function reqToURL (req: ServerRequest) {
  const base = req.conn.localAddr.transport === 'tcp' ? req.conn.localAddr.hostname : 'localhost';

  return new URL(req.url, 'http://' + base);
}

function errorResponse (msg: string) {
  return {
    body: msg,
    status: 500
  };
}

async function handleRequest (request: ServerRequest) {
  const { searchParams } = reqToURL(request);

  const size = searchParams.get('size');
  const url = searchParams.get('url');

  if (!url) {
    return errorResponse('No url');
  }

  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();

  const headers = new Headers();

  let body;

  try {
    body = await resize(new Uint8Array(arrayBuffer), { width: size ? parseInt(size, 10) : 500, height: size ? parseInt(size, 10) : 500 });
  } catch (e) {
    return errorResponse(e.message);
  }

  const checksum = new Sha1().update(body).hex();

  headers.set('etag', checksum);
  headers.set('content-type', response.headers.get('content-type') ?? 'image/jpeg');
  headers.set('Cache-Control', 'public, max-age=3600');

  if (request.headers.get('accept-encoding')?.includes('br')) {
    headers.set('Content-Encoding', 'br');
    body = brotliEncode(body);
  } else if (request.headers.get('accept-encoding')?.includes('gzip')) {
    headers.set('Content-Encoding', 'gzip');
    body = gzipEncode(body);
  }

  headers.set('Content-Length', String(body.byteLength));

  return {
    body,
    status: 200,
    headers
  };
}

const server = serve({ port: 8080 });
console.log(`HTTP web server running.  Access it at:  http://localhost:8080/`);

for await (const request of server) {
  const response = await handleRequest(request);

  request.respond(response);
}
