import { resize } from "https://deno.land/x/deno_image/mod.ts";
import { Sha1 } from "https://deno.land/std@0.91.0/hash/sha1.ts";
import { compress as brotliEncode } from 'https://deno.land/x/brotli@v0.1.4/mod.ts';
import { gzipEncode } from 'https://raw.githubusercontent.com/manyuanrong/wasm_gzip/v1.0.0/mod.ts';

function errorResponse (event: any, msg: string) {
  event.respondWith(
    new Response('No url', {
      status: 500
    })
  );
}

addEventListener('fetch', async event => {
  const { searchParams } = new URL(event.request.url);

  const size = searchParams.get('size');
  const url = searchParams.get('url');

  if (!url) {
    errorResponse(event, 'No url');
    return;
  }

  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();

  const headers = new Headers();

  let body;

  try {
    body = await resize(new Uint8Array(arrayBuffer), { width: size ? parseInt(size, 10) : 500, height: size ? parseInt(size, 10) : 500 });
  } catch (e) {
    errorResponse(event, e.message);
    return;
  }

  const checksum = new Sha1().update(body).hex();

  headers.set('etag', checksum);
  headers.set('content-type', response.headers.get('content-type') ?? 'image/jpeg');
  headers.set('Cache-Control', 'public, max-age=3600');

  if (event.request.headers.get('accept-encoding')?.includes('br')) {
    headers.set('Content-Encoding', 'br');
    body = brotliEncode(body);
  } else if (event.request.headers.get('accept-encoding')?.includes('gzip')) {
    headers.set('Content-Encoding', 'gzip');
    body = gzipEncode(body);
  }

  headers.set('Content-Length', String(body.byteLength));

  event.respondWith(
    new Response(body, {
      status: 200,
      headers
    })
  );
});
