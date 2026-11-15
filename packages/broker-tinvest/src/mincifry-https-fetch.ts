import * as https from 'node:https';
import { createRequire } from 'node:module';
import * as tls from 'node:tls';

/**
 * Node `fetch` rejects T-Invest HTTPS with SELF_SIGNED_CERT_IN_CHAIN unless the
 * Russian Trusted Root (Mincifry) CA is present — same issue the gRPC SDK solves
 * via `useMincifryCertificate`.
 */
export async function createMincifryHttpsFetch(): Promise<typeof fetch> {
  const certificate = await downloadMincifryCertificate();
  const ca = [...tls.rootCertificates, certificate];

  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = requestUrl(input);
    const method = init?.method ?? 'GET';
    const headers = headersToRecord(init?.headers);

    return await new Promise<Response>((resolve, reject) => {
      const request = https.request(
        url,
        {
          method,
          headers,
          ca,
        },
        (incoming) => {
          const chunks: Buffer[] = [];
          incoming.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });
          incoming.on('end', () => {
            const body = Buffer.concat(chunks);
            const responseHeaders = new Headers();
            for (const [key, value] of Object.entries(incoming.headers)) {
              if (typeof value === 'string') {
                responseHeaders.set(key, value);
              } else if (Array.isArray(value)) {
                for (const item of value) {
                  responseHeaders.append(key, item);
                }
              }
            }
            const statusText = incoming.statusMessage;
            resolve(
              new Response(body, {
                status: incoming.statusCode ?? 0,
                headers: responseHeaders,
                ...(statusText !== undefined ? { statusText } : {}),
              }),
            );
          });
          incoming.on('error', reject);
        },
      );
      request.on('error', reject);

      const body = init?.body;
      if (typeof body === 'string' || body instanceof Uint8Array || Buffer.isBuffer(body)) {
        request.write(body);
      } else if (body !== undefined && body !== null) {
        reject(new Error('mincifry https fetch supports only string/Uint8Array body'));
        return;
      }
      request.end();
    });
  };
}

function requestUrl(input: string | URL | Request): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

function headersToRecord(headers: RequestInit['headers']): Record<string, string> {
  const result: Record<string, string> = {};
  if (headers === undefined) {
    return result;
  }
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  if (Array.isArray(headers)) {
    for (const pair of headers) {
      if (pair.length >= 2) {
        const key = pair[0];
        const value = pair[1];
        if (typeof key === 'string' && typeof value === 'string') {
          result[key] = value;
        }
      }
    }
    return result;
  }
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

function downloadMincifryCertificate(): Promise<Buffer> {
  const require = createRequire(import.meta.url);
  const loaded: unknown = require('@ttech-pub/grpc-node-client/src/mincifry-certificate.js');
  if (!isRecord(loaded) || typeof loaded.downloadMincifryCertificate !== 'function') {
    throw new Error('Mincifry certificate helper is unavailable from grpc-node-client');
  }
  const download = loaded.downloadMincifryCertificate;
  return Promise.resolve(download()).then((value: unknown) => {
    if (!Buffer.isBuffer(value)) {
      throw new Error('Mincifry certificate download did not return a Buffer');
    }
    return value;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
