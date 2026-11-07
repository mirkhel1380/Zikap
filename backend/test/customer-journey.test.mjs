import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import worker from '../worker.mjs';
import admin from '../admin-worker.mjs';

// Real handlers and all migrations; memory-only records and no external Stripe calls.
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  const migrations = new URL('../migrations/', import.meta.url);
  for (const name of readdirSync(migrations).filter(n => n.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(name, migrations), 'utf8'));
  const DB = {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        execute() { return { meta: { changes: db.prepare(sql).run(...args).changes } }; },
        async run() { return this.execute(); },
        async first() { return db.prepare(sql).get(...args) || null; },
        async all() { return { results: db.prepare(sql).all(...args) }; }
      };
    },
    async batch(statements) {
      db.exec('BEGIN');
      try { const result = statements.map(s => s.execute()); db.exec('COMMIT'); return result; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    }
  };
  const sessions = new Map(), keys = new Map();
  const env = { DB, ALLOWED_ORIGIN: 'https://mirkhel1380.github.io',
    ADMIN_TOKEN: 'journey-fixture-owner-key-not-a-real-secret',
    STRIPE_SECRET_KEY: 'sk_test_journey_fixture_not_real', STRIPE_WEBHOOK_SECRET: 'whsec_journey_fixture_not_real',
    async STRIPE_HTTP(url, options) {
      const path = new URL(url).pathname;
      if (path === '/v1/checkout/sessions' && options.method === 'POST') {
        const params = new URLSearchParams(options.body), key = options.headers['Idempotency-Key'];
        assert.equal([...params.keys()].some(k => k.startsWith('payment_method_types')), false);
        assert.equal(params.get('mode'), 'payment');
        assert.equal(params.get('line_items[0][price_data][unit_amount]'), '2900');
        assert.equal(params.get('line_items[0][price_data][currency]'), 'usd');
        assert.ok(key);
        if (keys.has(key)) return Response.json(sessions.get(keys.get(key)));
        const id = 'cs_test_journey_' + (sessions.size + 1);
        const session = { id, object: 'checkout.session', mode: 'payment', status: 'open', payment_status: 'unpaid',
          currency: 'usd', amount_total: 2900, client_reference_id: params.get('client_reference_id'),
          metadata: { orderId: params.get('metadata[orderId]'), generation: params.get('metadata[generation]') },
          livemode: false, url: 'https://checkout.stripe.com/c/pay/' + id,
          expires_at: Math.floor(Date.now() / 1000) + 3600, payment_intent: null };
        sessions.set(id, session); keys.set(key, id); return Response.json(session);
      }
      assert.equal(options.method, 'GET');
      const session = sessions.get(path.split('/').at(-1));
      assert.ok(session, 'Only the created checkout can be retrieved');
      return Response.json(session);
    }
  };
  const ownerEnv = { DB, ADMIN_TOKEN: env.ADMIN_TOKEN, ZIKAP_API: { fetch: request => worker.fetch(request, env) } };
  return { db, env, ownerEnv, sessions };
}
async function request(handler, env, host, path, method = 'GET', body, cookie) {
  const headers = { Origin: host };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  const r = await handler.fetch(new Request(host + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
  return { status: r.status, body: await r.json(), cookie: r.headers.get('set-cookie')?.split(';')[0] };
}
async function webhook(env, session) {
  const payload = JSON.stringify({ id: 'evt_journey_fixture', type: 'checkout.session.completed', data: { object: session } });
  const timestamp = Math.floor(Date.now() / 1000), encode = s => new TextEncoder().encode(s);
  const key = await crypto.subtle.importKey('raw', encode(env.STRIPE_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encode(timestamp + '.' + payload)));
  const signature = [...bytes].map(v => v.toString(16).padStart(2, '0')).join('');
  const r = await worker.fetch(new Request('https://customer.example/stripe/webhook', { method: 'POST', headers: { 'Stripe-Signature': `t=${timestamp},v1=${signature}` }, body: payload }), env);
  return { status: r.status, body: await r.json() };
}

test('complete order journey uses the independent owner portal, payment reconciliation, messages and report delivery', async t => {
  const f = fixture(); t.after(() => f.db.close());
  const customerCall = (p, m, b, c) => request(worker, f.env, 'https://customer.example', p, m, b, c);
  const ownerCall = (p, m, b, c) => request(admin, f.ownerEnv, 'https://owner.example', p, m, b, c);
  const registration = await customerCall('/account-api/register', 'POST', { name: 'Journey Fixture', email: 'journey@example.test', password: 'Journey-fixture-password-2026', consent: true });
  assert.equal(registration.status, 201);
  const customer = registration.cookie;
  const setup = await ownerCall('/admin-api/setup', 'POST', { username: 'JourneyOwner', password: 'Journey-owner-password-2026', ownerKey: f.env.ADMIN_TOKEN });
  assert.equal(setup.status, 201);
  const owner = setup.cookie, id = crypto.randomUUID(), cp = '/account-api/orders/' + id, op = '/admin/orders/' + id;
  const brief = { requestId: id, packageId: 'audit', quotedPrice: 29, catalogVersion: 1, website: 'https://example.com', pages: 'https://example.com/', topic: 'Isolated fixture', language: 'English', market: 'Fixture', goals: 'Verify the full journey without purchasing a service.', consent: true, company: '' };
  assert.equal((await customerCall('/account-api/orders', 'POST', brief, customer)).status, 201);
  assert.equal((await customerCall('/account-api/orders', 'POST', brief, customer)).status, 201);
  assert.equal(f.db.prepare('SELECT count(*) n FROM orders').get().n, 1);
  assert.equal((await customerCall(cp, 'GET', undefined, customer)).body.order.status, 'requested');
  assert.equal((await customerCall(cp + '/checkout', 'POST', { acknowledged: true }, customer)).status, 409);
  assert.equal((await ownerCall('/admin/orders', 'GET', undefined, owner)).body.orders[0].id, id);
  assert.equal((await ownerCall(op, 'GET', undefined, customer)).status, 401);
  const original = (await ownerCall(op, 'GET', undefined, owner)).body.order;
  const accepted = await ownerCall(op, 'PATCH', { status: 'accepted', report: '', note: 'Fixture scope and timing agreed.', expectedVersion: original.editVersion }, owner);
  assert.equal(accepted.status, 200);
  assert.equal((await customerCall(cp, 'GET', undefined, customer)).body.order.payment.available, true);
  assert.equal((await customerCall(cp + '/checkout', 'POST', { acknowledged: false }, customer)).status, 400);
  assert.equal((await customerCall(cp + '/checkout', 'POST', { acknowledged: true, amount: 1 }, customer)).status, 200);
  assert.equal((await customerCall(cp + '/checkout', 'POST', { acknowledged: true }, customer)).status, 200);
  assert.equal(f.sessions.size, 1);
  const session = [...f.sessions.values()][0];
  assert.equal(session.client_reference_id, id);
  assert.equal((await customerCall(cp, 'GET', undefined, customer)).body.order.payment.status, 'pending');
  session.status = 'complete'; session.payment_status = 'paid'; session.payment_intent = 'pi_journey_fixture';
  assert.equal((await webhook(f.env, session)).status, 200);
  assert.equal((await webhook(f.env, session)).body.replayed, true);
  assert.equal((await customerCall(cp + '/payment-status', 'POST', {}, customer)).status, 200);
  const paid = (await customerCall(cp, 'GET', undefined, customer)).body.order;
  assert.equal(paid.payment.status, 'paid'); assert.equal(paid.payment.testMode, true); assert.equal(paid.paymentCollected, false);
  assert.equal((await ownerCall('/admin-api/payments?mode=test', 'GET', undefined, owner)).body.payments.length, 1);
  const summary = (await ownerCall('/admin-api/dashboard', 'GET', undefined, owner)).body;
  assert.equal(summary.payments.netCents, 0, 'Test payments cannot inflate live revenue'); assert.equal(summary.payments.testRecords, 1);
  assert.equal((await customerCall(cp + '/messages', 'POST', { requestId: crypto.randomUUID(), body: 'Please explain the first finding.' }, customer)).status, 201);
  assert.equal((await ownerCall(op + '/messages', 'GET', undefined, owner)).body.messages[0].role, 'customer');
  assert.equal((await ownerCall(op + '/messages', 'POST', { requestId: crypto.randomUUID(), body: 'The report includes evidence and verification steps.' }, owner)).status, 201);
  assert.equal((await customerCall(cp + '/messages', 'GET', undefined, customer)).body.messages.some(m => m.role === 'owner'), true);
  const report = 'FIXTURE REPORT\nReviewed URL: https://example.com/\nRecommended title: <title>Example</title>';
  const delivered = await ownerCall(op, 'PATCH', { status: 'delivered', report, note: 'Your fixture review is ready.', expectedVersion: accepted.body.orderUpdate.editVersion }, owner);
  assert.equal(delivered.status, 200);
  const received = (await customerCall(cp, 'GET', undefined, customer)).body.order;
  assert.equal(received.status, 'delivered'); assert.equal(received.report, report);
  assert.equal((await customerCall('/account-api/orders', 'GET', undefined, customer)).body.orders[0].report, report);
  assert.equal((await ownerCall(op + '/history', 'GET', undefined, owner)).body.currentVersion, delivered.body.orderUpdate.editVersion);
  const action = await customerCall(cp + '/actions', 'POST', { requestId: crypto.randomUUID(), title: 'Review the suggested title', pageUrl: 'https://example.com/', notes: '', priority: 'high', status: 'planned' }, customer);
  assert.equal(action.status, 201);
  assert.equal((await customerCall(cp + '/actions/' + action.body.action.id, 'PATCH', { ...action.body.action, status: 'done' }, customer)).status, 200);
  assert.equal((await customerCall(cp + '/revision', 'POST', { note: 'Clarify the verification step.' }, customer)).status, 200);
  assert.equal((await customerCall(cp + '/revision', 'POST', { note: 'A second revision.' }, customer)).status, 409);
  assert.equal((await ownerCall(op, 'GET', undefined, owner)).body.order.status, 'revision_requested');
  assert.deepEqual(f.db.prepare('SELECT kind FROM email_outbox ORDER BY kind').all().map(row=>row.kind), ['payment_confirmed','project_accepted','report_ready','request_received']);
  assert.equal((await customerCall('/account-api/logout', 'POST', {}, customer)).status, 200);
  assert.equal((await customerCall(cp, 'GET', undefined, customer)).status, 401);
  assert.equal((await ownerCall('/admin-api/logout', 'POST', {}, owner)).status, 200);
  assert.equal((await ownerCall(op, 'GET', undefined, owner)).status, 401);
});
