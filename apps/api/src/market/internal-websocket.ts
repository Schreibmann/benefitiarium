import { createHash, randomBytes } from 'node:crypto';
import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const OP_TEXT = 0x1;
const OP_CLOSE = 0x8;
const OP_PING = 0x9;
const OP_PONG = 0xa;

export type InternalWebSocket = {
  connectionId: string;
  send: (text: string) => void;
  close: (code?: number, reason?: string) => void;
};

export type InternalWebSocketHandlers = {
  path: string;
  onConnection: (socket: InternalWebSocket, request: IncomingMessage) => void;
  onMessage: (socket: InternalWebSocket, text: string) => void;
  onClose: (socket: InternalWebSocket) => void;
};

function acceptKey(secWebSocketKey: string): string {
  return createHash('sha1').update(`${secWebSocketKey}${WS_GUID}`).digest('base64');
}

function encodeFrame(opcode: number, payload: Buffer): Buffer {
  const len = payload.length;
  if (len < 126) {
    const header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = len;
    return Buffer.concat([header, payload]);
  }
  if (len < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
    return Buffer.concat([header, payload]);
  }
  const header = Buffer.alloc(10);
  header[0] = 0x80 | opcode;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(len), 2);
  return Buffer.concat([header, payload]);
}

function decodeFrames(buffer: Buffer, onFrame: (opcode: number, payload: Buffer) => void): Buffer {
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const b0 = buffer[offset];
    const b1 = buffer[offset + 1];
    if (b0 === undefined || b1 === undefined) {
      break;
    }
    const opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let payloadLen = b1 & 0x7f;
    let headerLen = 2;
    if (payloadLen === 126) {
      if (offset + 4 > buffer.length) {
        break;
      }
      payloadLen = buffer.readUInt16BE(offset + 2);
      headerLen = 4;
    } else if (payloadLen === 127) {
      if (offset + 10 > buffer.length) {
        break;
      }
      const big = buffer.readBigUInt64BE(offset + 2);
      if (big > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error('websocket payload too large');
      }
      payloadLen = Number(big);
      headerLen = 10;
    }
    const maskLen = masked ? 4 : 0;
    const total = headerLen + maskLen + payloadLen;
    if (offset + total > buffer.length) {
      break;
    }
    let payload = buffer.subarray(offset + headerLen + maskLen, offset + total);
    if (masked) {
      const mask = buffer.subarray(offset + headerLen, offset + headerLen + 4);
      const decoded = Buffer.alloc(payload.length);
      for (let i = 0; i < payload.length; i += 1) {
        const maskByte = mask[i % 4];
        const payloadByte = payload[i];
        if (maskByte === undefined || payloadByte === undefined) {
          continue;
        }
        decoded[i] = payloadByte ^ maskByte;
      }
      payload = decoded;
    }
    onFrame(opcode, payload);
    offset += total;
  }
  return buffer.subarray(offset);
}

/**
 * Zero-dependency WebSocket upgrade helper for the internal market-data gateway.
 * Supports text frames only (JSON control + event protocol).
 */
export function attachInternalWebSocketServer(
  server: Server,
  handlers: InternalWebSocketHandlers,
): void {
  server.on('upgrade', (request, socket, head) => {
    const url = request.url ?? '';
    const pathOnly = url.split('?')[0] ?? url;
    if (pathOnly !== handlers.path) {
      socket.destroy();
      return;
    }

    const key = request.headers['sec-websocket-key'];
    if (typeof key !== 'string' || key.length === 0) {
      socket.destroy();
      return;
    }

    const duplex: Duplex = socket;
    const connectionId = randomBytes(16).toString('hex');
    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey(key)}`,
      '\r\n',
    ].join('\r\n');
    duplex.write(responseHeaders);
    if (head.length > 0) {
      duplex.unshift(head);
    }

    let closed = false;
    const ws: InternalWebSocket = {
      connectionId,
      send: (text: string) => {
        if (closed) {
          return;
        }
        duplex.write(encodeFrame(OP_TEXT, Buffer.from(text, 'utf8')));
      },
      close: (code = 1000, reason = '') => {
        if (closed) {
          return;
        }
        closed = true;
        const reasonBuf = Buffer.from(reason, 'utf8');
        const payload = Buffer.alloc(2 + reasonBuf.length);
        payload.writeUInt16BE(code, 0);
        reasonBuf.copy(payload, 2);
        duplex.write(encodeFrame(OP_CLOSE, payload));
        duplex.end();
        handlers.onClose(ws);
      },
    };

    let buffer: Buffer = Buffer.alloc(0);
    duplex.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        const rest = decodeFrames(buffer, (opcode, payload) => {
          if (opcode === OP_TEXT) {
            handlers.onMessage(ws, payload.toString('utf8'));
            return;
          }
          if (opcode === OP_PING) {
            duplex.write(encodeFrame(OP_PONG, payload));
            return;
          }
          if (opcode === OP_CLOSE) {
            ws.close();
          }
        });
        buffer = Buffer.from(rest);
      } catch {
        ws.close(1002, 'protocol error');
      }
    });

    duplex.on('close', () => {
      if (!closed) {
        closed = true;
        handlers.onClose(ws);
      }
    });

    handlers.onConnection(ws, request);
  });
}
