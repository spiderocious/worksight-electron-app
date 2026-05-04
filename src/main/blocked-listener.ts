import net from 'node:net';

/**
 * A pair of listeners on localhost that catch the candidate's attempts to
 * reach blocked domains during a session.
 *
 * The flow: pf has rdr rules redirecting 80→8080 and 443→8443 on lo0. When the
 * candidate's browser tries to connect to a blocked domain (which /etc/hosts
 * has redirected to 127.0.0.1), pf forwards the connection here. We read just
 * enough bytes to learn which host the candidate was trying to reach, fire a
 * callback, and close the connection.
 *
 * We never act as a man-in-the-middle. We don't decrypt TLS or proxy the
 * traffic. We learn the hostname (from the TLS ClientHello SNI extension or
 * the HTTP Host header) and drop the connection.
 */

export const HTTP_LISTEN_PORT = 8080;
export const HTTPS_LISTEN_PORT = 8443;

export type BlockedAttemptCallback = (domain: string) => void;

let httpServer: net.Server | null = null;
let httpsServer: net.Server | null = null;

export const startBlockedListener = (cb: BlockedAttemptCallback): void => {
  if (httpServer || httpsServer) return; // already running

  httpServer = net.createServer((socket) => {
    socket.setTimeout(2000);
    socket.once('data', (data) => {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
      const host = parseHttpHost(buf);
      if (host) cb(host);
      try {
        socket.end();
      } catch {
        // ignore
      }
    });
    socket.on('error', () => {
      try {
        socket.destroy();
      } catch {
        // ignore
      }
    });
    socket.on('timeout', () => {
      try {
        socket.destroy();
      } catch {
        // ignore
      }
    });
  });
  httpServer.on('error', (err) => console.error('[worksight] HTTP listener error', err));
  httpServer.listen(HTTP_LISTEN_PORT, '127.0.0.1');

  httpsServer = net.createServer((socket) => {
    socket.setTimeout(2000);
    socket.once('data', (data) => {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
      const host = parseTlsSni(buf);
      if (host) cb(host);
      try {
        socket.end();
      } catch {
        // ignore
      }
    });
    socket.on('error', () => {
      try {
        socket.destroy();
      } catch {
        // ignore
      }
    });
    socket.on('timeout', () => {
      try {
        socket.destroy();
      } catch {
        // ignore
      }
    });
  });
  httpsServer.on('error', (err) => console.error('[worksight] HTTPS listener error', err));
  httpsServer.listen(HTTPS_LISTEN_PORT, '127.0.0.1');
};

export const stopBlockedListener = (): void => {
  try {
    httpServer?.close();
  } catch {
    // ignore
  }
  try {
    httpsServer?.close();
  } catch {
    // ignore
  }
  httpServer = null;
  httpsServer = null;
};

// ----- Parsers -----

const parseHttpHost = (data: Buffer): string | null => {
  // Crude but reliable: parse the headers as ASCII and pull the Host: line.
  // We've only read the first packet; if Host: is past that, we miss — fine.
  try {
    const text = data.toString('ascii', 0, Math.min(data.length, 4096));
    const match = text.match(/^Host:\s*([^\r\n:]+)/im);
    if (match && match[1]) {
      return match[1].trim().toLowerCase();
    }
  } catch {
    // ignore
  }
  return null;
};

/**
 * Parses the SNI hostname out of a TLS ClientHello.
 *
 * TLS record layer:
 *   [0]    Content type (0x16 = handshake)
 *   [1-2]  Version
 *   [3-4]  Length
 * Handshake:
 *   [5]    Handshake type (0x01 = ClientHello)
 *   [6-8]  Length
 *   [9-10] Client version
 *   [11-42] Random (32 bytes)
 *   [43]   Session ID length, then session ID
 *   then cipher suites length (2), cipher suites,
 *   then compression methods length (1), methods,
 *   then extensions length (2), extensions.
 *
 * We walk extensions looking for type 0x0000 (server_name), then pull the
 * first server name (type 0 = host_name).
 */
const parseTlsSni = (data: Buffer): string | null => {
  try {
    if (data.length < 43) return null;
    if (data[0] !== 0x16) return null; // not a TLS handshake
    if (data[5] !== 0x01) return null; // not a ClientHello

    let offset = 43; // start of session ID length
    if (offset >= data.length) return null;

    const sessionIdLen = data[offset];
    offset += 1 + sessionIdLen;
    if (offset + 2 > data.length) return null;

    const cipherSuitesLen = data.readUInt16BE(offset);
    offset += 2 + cipherSuitesLen;
    if (offset + 1 > data.length) return null;

    const compressionLen = data[offset];
    offset += 1 + compressionLen;
    if (offset + 2 > data.length) return null;

    const extensionsLen = data.readUInt16BE(offset);
    offset += 2;
    const extensionsEnd = offset + extensionsLen;
    if (extensionsEnd > data.length) return null;

    while (offset + 4 <= extensionsEnd) {
      const extType = data.readUInt16BE(offset);
      const extLen = data.readUInt16BE(offset + 2);
      offset += 4;
      if (offset + extLen > extensionsEnd) return null;

      if (extType === 0x0000) {
        // server_name extension
        let p = offset;
        const listLen = data.readUInt16BE(p);
        p += 2;
        const listEnd = p + listLen;
        while (p + 3 <= listEnd) {
          const nameType = data[p];
          const nameLen = data.readUInt16BE(p + 1);
          p += 3;
          if (p + nameLen > listEnd) return null;
          if (nameType === 0) {
            return data.toString('ascii', p, p + nameLen).toLowerCase();
          }
          p += nameLen;
        }
      }

      offset += extLen;
    }
  } catch {
    // malformed — give up silently
  }
  return null;
};
