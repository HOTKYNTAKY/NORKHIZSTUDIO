import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const stop = server => new Promise(resolve => server.close(resolve));

test('device purchase and one trial with configured panel, volume and hours', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'vortex-test-'));
  let child;
  const captured = [];
  const users = new Map();
  const mock = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    res.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/api/groups/simple') return res.end(JSON.stringify({ groups: [{ id: 1, name: 'Germany' }, { id: 2, name: 'Private' }] }));
    if (url.pathname === '/api/user' && req.method === 'POST') {
      let body = ''; for await (const chunk of req) body += chunk;
      const p = JSON.parse(body); captured.push(p);
      await new Promise(r => setTimeout(r, 100));
      users.set(p.username, { ...p, id: 1, subscription_url: '/sub/' + p.username });
      return res.end(JSON.stringify(users.get(p.username)));
    }
    if (url.pathname.startsWith('/api/user/')) return res.end(JSON.stringify(users.get(url.pathname.split('/').pop()) || {}));
    res.statusCode = 404; res.end('{}');
  });
  const mockPort = await listen(mock);
  const probe = net.createServer(); const port = await listen(probe); await stop(probe);
  const salt = crypto.randomBytes(16), pass = 'admin-password-123';
  const hash = `scrypt:${salt.toString('base64')}:${crypto.scryptSync(pass, salt, 64).toString('base64')}`;
  const panel = { id: 'pn_test', name: 'Test panel', enabled: true, baseUrl: `http://127.0.0.1:${mockPort}`, apiKey: 'test-key', groupIds: [1], pricePerGB: 4000 };
  await writeFile(path.join(dir, 'config.json'), JSON.stringify({ adminPassHash: hash, panels: [panel], trialEnabled: false }));
  const start = () => { child = spawn(process.execPath, [path.join(root, 'server/server.mjs')], { env: { ...process.env, API_PORT: String(port), DATA_DIR: dir }, stdio: 'ignore' }); };
  const base = `http://127.0.0.1:${port}`;
  const request = async (url, method = 'GET', body, cookie) => {
    const r = await fetch(base + url, { method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, body: await r.json(), cookie: r.headers.get('set-cookie')?.split(';')[0] };
  };
  const wait = async () => { for (let i = 0; i < 60; i++) { try { if ((await request('/healthz')).status === 200) return; } catch {} await new Promise(r => setTimeout(r, 50)); } throw new Error('server not ready'); };
  try {
    start(); await wait();
    const first = await request('/api/device', 'POST');
    assert.equal(first.status, 200); assert.ok(first.cookie);
    const again = await request('/api/device', 'POST', {}, first.cookie);
    assert.equal(again.body.user.id, first.body.user.id);
    assert.equal((await request('/api/auth/register', 'POST', {})).status, 410);
    assert.equal((await request('/api/trial', 'POST', {}, first.cookie)).status, 403);
    const admin = await request('/api/admin/login', 'POST', { password: pass });
    assert.equal(admin.status, 200);
    const settings = await request('/api/admin/settings', 'POST', { trialEnabled: true, trialPanelId: 'pn_test', trialGB: 0.5, trialHours: 6 }, admin.cookie);
    assert.equal(settings.status, 200);
    assert.deepEqual((await request('/api/config')).body.trial, { enabled: true, gb: 0.5, hours: 6 });
    const purchase = await request('/api/orders', 'POST', { gb: 10, last4: '1234', panelId: 'pn_test' }, first.cookie);
    assert.equal(purchase.status, 201);
    const now = Math.floor(Date.now() / 1000);
    const [one, two] = await Promise.all([request('/api/trial', 'POST', {}, first.cookie), request('/api/trial', 'POST', {}, first.cookie)]);
    assert.deepEqual([one.status, two.status].sort(), [201, 409]);
    assert.equal(captured.length, 1);
    assert.equal(captured[0].data_limit, 0.5 * 1024 ** 3);
    assert.ok(Math.abs(captured[0].expire - now - 6 * 3600) < 5);
    const trial = one.status === 201 ? one.body : two.body;
    const services = await request('/api/my/services', 'GET', undefined, first.cookie);
    assert.equal(services.body.services[0].isTrial, true);
    assert.equal((await request(`/api/my/services/${trial.code}/extend-time`, 'POST', { days: 365 }, first.cookie)).status, 403);
    child.kill(); await new Promise(resolve => child.once('exit', resolve));
    start(); await wait();
    assert.equal((await request('/api/device', 'POST', {}, first.cookie)).body.user.id, first.body.user.id);
    assert.equal((await request('/api/trial', 'POST', {}, first.cookie)).status, 409);
    assert.equal((await request('/api/admin/panels/pn_test/sync-locations', 'POST', {})).status, 401);
    const sync = await request('/api/admin/panels/pn_test/sync-locations', 'POST', {}, admin.cookie);
    assert.equal(sync.status, 200);
    assert.deepEqual(sync.body.locations, [{ id: 1, name: 'Germany' }]); // only allowed group IDs
    const publicPanel = (await request('/api/config')).body.panels[0];
    assert.deepEqual(publicPanel.locations, [{ id: 1, name: 'Germany' }]);
    assert.equal(publicPanel.apiKey, undefined);
    assert.equal((await request('/api/orders', 'POST', { gb: 10, last4: '1234', panelId: 'pn_test', groupId: 2 }, first.cookie)).status, 400);
    const picked = await request('/api/orders', 'POST', { gb: 10, last4: '1234', panelId: 'pn_test', groupId: 1 }, first.cookie);
    assert.equal(picked.status, 201);
    const approved = await request(`/api/admin/orders/${picked.body.code}/approve`, 'POST', {}, admin.cookie);
    assert.equal(approved.status, 200);
    assert.deepEqual(captured.at(-1).group_ids, [1]);
    assert.equal(approved.body.order.locationName, 'Germany');
    const persisted = JSON.parse(await readFile(path.join(dir, 'orders.json')));
    assert.equal(persisted.filter(o => o.isTrial).length, 1);
  } finally {
    if (child && child.exitCode === null) { child.kill(); await new Promise(resolve => child.once('exit', resolve)); }
    await stop(mock); await rm(dir, { recursive: true, force: true });
  }
});
