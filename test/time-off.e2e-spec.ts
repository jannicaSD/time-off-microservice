import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HcmMockServer } from './hcm-mock.server';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Time Off API (e2e)', () => {
  let app: INestApplication<App>;
  let hcm: HcmMockServer;
  const dbPath = resolve(process.cwd(), 'test', 'data-e2e.sqlite');

  async function mockHcmPost(path: string, body: Record<string, unknown>) {
    const response = await fetch(`${hcm.baseUrl()}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Mock HCM call failed for ${path}`);
    }
  }

  async function setHcmBalance(employeeId: string, locationId: string, availableDays: number) {
    await mockHcmPost('/hcm/admin/set-balance', { employeeId, locationId, availableDays });
  }

  async function setHcmMode(mode: 'normal' | 'error' | 'timeout') {
    await mockHcmPost('/hcm/admin/set-mode', { mode });
  }

  beforeAll(async () => {
    hcm = new HcmMockServer();
    await hcm.start();
  });

  beforeEach(async () => {
    rmSync(dbPath, { force: true });
    process.env.DATABASE_FILE = dbPath;
    process.env.HCM_BASE_URL = hcm.baseUrl();
    process.env.HCM_TIMEOUT_MS = '300';
    process.env.HCM_MAX_RETRIES = '1';

    await mockHcmPost('/hcm/admin/reset', {});

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('creates request when hcm has sufficient balance', async () => {
    await setHcmBalance('emp-1', 'loc-1', 10);

    return request(app.getHttpServer())
      .post('/time-off/requests')
      .send({
        employeeId: 'emp-1',
        locationId: 'loc-1',
        daysRequested: 2,
        idempotencyKey: 'idem-1',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('SUBMITTED');
        expect(res.body.id).toBeDefined();
      });
  });

  it('returns conflict for insufficient balance', async () => {
    await setHcmBalance('emp-2', 'loc-1', 1);

    return request(app.getHttpServer())
      .post('/time-off/requests')
      .send({
        employeeId: 'emp-2',
        locationId: 'loc-1',
        daysRequested: 2,
        idempotencyKey: 'idem-2',
      })
      .expect(409);
  });

  it('returns same request for same idempotency key', async () => {
    await setHcmBalance('emp-3', 'loc-1', 10);

    const first = await request(app.getHttpServer())
      .post('/time-off/requests')
      .send({
        employeeId: 'emp-3',
        locationId: 'loc-1',
        daysRequested: 2,
        idempotencyKey: 'idem-3',
      })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/time-off/requests')
      .send({
        employeeId: 'emp-3',
        locationId: 'loc-1',
        daysRequested: 2,
        idempotencyKey: 'idem-3',
      })
      .expect(201);

    expect(second.body.id).toBe(first.body.id);
  });

  it('applies webhook update and exposes balance', async () => {
    await request(app.getHttpServer())
      .post('/sync/webhook/hcm-update')
      .send({
        employeeId: 'emp-4',
        locationId: 'loc-2',
        availableDays: 7,
      })
      .expect(201);

    return request(app.getHttpServer())
      .get('/time-off/balances')
      .query({ employeeId: 'emp-4' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(1);
        expect(res.body[0].availableDays).toBe(7);
      });
  });

  it('batch sync upserts balances', async () => {
    await request(app.getHttpServer())
      .post('/sync/hcm/balances')
      .send({
        balances: [
          { employeeId: 'emp-5', locationId: 'loc-1', availableDays: 4 },
          { employeeId: 'emp-5', locationId: 'loc-2', availableDays: 8 },
        ],
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.upserted).toBe(2);
      });

    return request(app.getHttpServer())
      .get('/time-off/balances')
      .query({ employeeId: 'emp-5' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(2);
      });
  });

  it('returns 503 when hcm fails or times out', async () => {
    await setHcmMode('error');

    await request(app.getHttpServer())
      .post('/time-off/requests')
      .send({
        employeeId: 'emp-6',
        locationId: 'loc-1',
        daysRequested: 1,
        idempotencyKey: 'idem-6-error',
      })
      .expect(503);

    await setHcmMode('timeout');

    await request(app.getHttpServer())
      .post('/time-off/requests')
      .send({
        employeeId: 'emp-6',
        locationId: 'loc-1',
        daysRequested: 1,
        idempotencyKey: 'idem-6-timeout',
      })
      .expect(503);
  });

  it('approves request', async () => {
    await setHcmBalance('emp-7', 'loc-1', 10);

    const created = await request(app.getHttpServer())
      .post('/time-off/requests')
      .send({
        employeeId: 'emp-7',
        locationId: 'loc-1',
        daysRequested: 2,
        idempotencyKey: 'idem-7',
      })
      .expect(201);

    return request(app.getHttpServer())
      .post(`/time-off/requests/${created.body.id}/approve`)
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('APPROVED');
      });
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    rmSync(dbPath, { force: true });
    await hcm.stop();
  });
});
