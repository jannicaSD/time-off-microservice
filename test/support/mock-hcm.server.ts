import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';

type Mode = 'normal' | 'error' | 'timeout';

function key(employeeId: string, locationId: string): string {
  return `${employeeId}::${locationId}`;
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

function json(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export class MockHcmServer {
  private readonly balances = new Map<string, number>();
  private mode: Mode = 'normal';
  private server?: Server;
  private port = 0;

  async start(): Promise<void> {
    this.server = createServer(async (req, res) => {
      const url = new URL(req.url || '/', 'http://localhost');

      if (req.method === 'GET' && url.pathname === '/hcm/balances') {
        if (this.mode === 'error') {
          json(res, 500, { message: 'mock hcm error' });
          return;
        }

        if (this.mode === 'timeout') {
          return;
        }

        const employeeId = url.searchParams.get('employeeId') || '';
        const locationId = url.searchParams.get('locationId') || '';
        const availableDays = this.balances.get(key(employeeId, locationId)) || 0;
        json(res, 200, { employeeId, locationId, availableDays });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/hcm/admin/set-balance') {
        const body = await readJson(req);
        const employeeId = String(body.employeeId || '');
        const locationId = String(body.locationId || '');
        const availableDays = Number(body.availableDays || 0);

        this.balances.set(key(employeeId, locationId), availableDays);
        json(res, 200, { ok: true });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/hcm/admin/set-mode') {
        const body = await readJson(req);
        const mode = String(body.mode || 'normal') as Mode;
        this.mode = mode;
        json(res, 200, { ok: true });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/hcm/admin/reset') {
        this.mode = 'normal';
        this.balances.clear();
        json(res, 200, { ok: true });
        return;
      }

      json(res, 404, { message: 'not found' });
    });

    await new Promise<void>((resolve) => {
      this.server?.listen(0, () => {
        this.port = (this.server?.address() as AddressInfo).port;
        resolve();
      });
    });
  }

  baseUrl(): string {
    return `http://localhost:${this.port}`;
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    this.server = undefined;
  }
}
