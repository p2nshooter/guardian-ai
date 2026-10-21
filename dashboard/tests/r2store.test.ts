/**
 * The R2 Store against an exact in-memory R2 (conditional writes, list paging,
 * metadata and key limits, one write per second per key). Every race below
 * runs the callers concurrently; the fake yields between calls, so they
 * interleave the way they would against the real bucket.
 *
 *   npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isTransient, withRetry } from '../lib/r2/bucket';
import { FakeR2, fakeClock } from '../lib/r2/fake';
import { BusyError, ConflictError, Store } from '../lib/r2/store';
import { newestFirst, oldestFirst, ulid } from '../lib/r2/ulid';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'member' | 'admin';
  credits: number;
  created_at: string;
}

interface Payment {
  id: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'failed';
  amount: number;
  confirmed_by?: string;
  created_at: string;
}

function setup(opts: { rateLimit?: boolean } = {}) {
  const clock = fakeClock();
  const r2 = new FakeR2({ now: clock.now, rateLimit: opts.rateLimit });
  const store = new Store(r2, { sleep: clock.sleep, now: clock.now });
  const users = store.collection<User>({
    name: 'users',
    unique: [{ name: 'email', value: (u) => u.email }],
    indexes: [
      { name: 'all', key: () => 'all', meta: (u) => ({ email: u.email, name: u.name }) },
      { name: 'role', key: (u) => u.role },
    ],
  });
  const payments = store.collection<Payment>({
    name: 'payments',
    indexes: [
      { name: 'user', key: (p) => p.user_id, meta: (p) => ({ status: p.status, amount: p.amount }) },
      { name: 'status', key: (p) => p.status },
    ],
  });
  const iso = () => new Date(clock.now()).toISOString();
  const user = (n: number, extra: Partial<User> = {}): User => ({
    id: `u${n}`,
    email: `person${n}@example.com`,
    name: `Person ${n}`,
    role: 'member',
    credits: 0,
    created_at: iso(),
    ...extra,
  });
  return { clock, r2, store, users, payments, user, iso };
}

const keys = (r2: FakeR2, prefix: string) => [...r2.objects.keys()].filter((k) => k.startsWith(prefix)).sort();

describe('documents, guards and indexes', () => {
  it('creates, finds by a unique value (case-insensitive), lists and deletes', async () => {
    const { r2, users, user } = setup();
    await users.create(user(1, { email: 'Ana@Example.com' }));
    assert.equal((await users.get('u1'))?.name, 'Person 1');
    assert.equal((await users.find('email', ' ana@example.COM '))?.id, 'u1');
    assert.equal(await users.find('email', 'nobody@example.com'), null);

    const page = await users.list('all', 'all');
    assert.deepEqual(page.entries.map((e) => [e.id, e.meta]), [['u1', { email: 'Ana@Example.com', name: 'Person 1' }]]);
    assert.equal(await users.count('role', 'member'), 1);

    assert.equal(await users.delete('u1'), true);
    assert.equal(await users.get('u1'), null);
    assert.equal(await users.find('email', 'ana@example.com'), null);
    assert.deepEqual(keys(r2, 'i/'), []);
    assert.deepEqual(keys(r2, 'u/'), []);
    assert.equal(await users.delete('u1'), false);
  });

  it('refuses a second document with the same id or the same unique value', async () => {
    const { users, user } = setup();
    await users.create(user(1));
    await assert.rejects(users.create(user(1, { email: 'other@example.com' })), (e) => e instanceof ConflictError && e.field === 'id');
    await assert.rejects(users.create(user(2, { email: 'PERSON1@example.com' })), (e) => e instanceof ConflictError && e.field === 'email');
    // The failed id-conflict create must not have kept the other email's guard.
    await users.create(user(3, { email: 'other@example.com' }));
  });

  it('rejects ids that would break the key layout', async () => {
    const { users, user } = setup();
    await assert.rejects(users.create(user(1, { id: 'a/b' })), /invalid id/);
    await assert.rejects(users.create(user(1, { id: 'a~b' })), /invalid id/);
    await assert.rejects(users.create(user(1, { id: '' })), /invalid id/);
  });

  it('createIfAbsent is idempotent (re-running an import changes nothing)', async () => {
    const { r2, users, user } = setup();
    assert.equal(await users.createIfAbsent(user(1)), true);
    const before = [...r2.objects.keys()].sort();
    assert.equal(await users.createIfAbsent(user(1)), false);
    assert.deepEqual([...r2.objects.keys()].sort(), before);
  });

  it('moves a unique value on update and frees the old one', async () => {
    const { users, user } = setup();
    await users.create(user(1));
    await users.create(user(2));
    await assert.rejects(users.update('u1', (u) => ({ ...u, email: 'person2@example.com' })), ConflictError);
    assert.equal((await users.get('u1'))?.email, 'person1@example.com');

    await users.update('u1', (u) => ({ ...u, email: 'new@example.com' }));
    assert.equal((await users.find('email', 'new@example.com'))?.id, 'u1');
    assert.equal(await users.find('email', 'person1@example.com'), null);
    await users.create(user(3, { email: 'person1@example.com' }));
  });

  it('keeps index entries and summaries in step with the document', async () => {
    const { users, user } = setup();
    await users.create(user(1));
    await users.update('u1', (u) => ({ ...u, role: 'admin', name: 'Renamed' }));
    assert.equal(await users.count('role', 'member'), 0);
    assert.equal(await users.count('role', 'admin'), 1);
    assert.deepEqual((await users.list('all', 'all')).entries[0]?.meta, { email: 'person1@example.com', name: 'Renamed' });
  });

  it('update returning null or the same document writes nothing', async () => {
    const { r2, users, user } = setup();
    await users.create(user(1));
    const writes = r2.ops.classA;
    await users.update('u1', () => null);
    await users.update('u1', (u) => ({ ...u }));
    assert.equal(r2.ops.classA, writes);
    await assert.rejects(users.update('u1', (u) => ({ ...u, id: 'u9' })), /cannot change/);
    await assert.rejects(users.update('missing', (u) => u), /not found/);
  });

  it('pages an index newest first, 1000 at most per page', async () => {
    const { clock, payments, iso } = setup();
    for (let n = 0; n < 250; n += 1) {
      clock.advance(1000);
      await payments.create({ id: `p${String(n).padStart(3, '0')}`, user_id: 'u1', status: 'pending', amount: n, created_at: iso() });
    }
    const seen: string[] = [];
    let cursor: string | undefined;
    let pages = 0;
    do {
      const page = await payments.list('user', 'u1', { limit: 100, cursor });
      seen.push(...page.entries.map((e) => e.id));
      cursor = page.cursor;
      pages += 1;
    } while (cursor);
    assert.equal(pages, 3);
    assert.equal(seen.length, 250);
    assert.equal(seen[0], 'p249');
    assert.equal(seen.at(-1), 'p000');
    assert.equal((await payments.listAllDocs('user', 'u1')).length, 250);
    assert.equal(await payments.count('status', 'pending'), 250);
  });

  it('hashes long index values so keys stay under 1024 bytes', async () => {
    const { payments, iso } = setup();
    const long = 'x'.repeat(900);
    await payments.create({ id: 'p1', user_id: long, status: 'pending', amount: 1, created_at: iso() });
    assert.equal((await payments.listDocs('user', long)).docs[0]?.id, 'p1');
  });
});

describe('races (concurrent callers)', () => {
  it('20 sign-ups with the same email: exactly one account', async () => {
    const { r2, users, user } = setup();
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, (_, n) => users.create(user(n, { email: 'same@example.com' }))),
    );
    const ok = results.filter((r) => r.status === 'fulfilled');
    const conflicts = results.filter((r) => r.status === 'rejected' && r.reason instanceof ConflictError);
    assert.equal(ok.length, 1);
    assert.equal(conflicts.length, 19);
    assert.equal(keys(r2, 'c/users/').length, 1);
    assert.equal(keys(r2, 'u/users/email/').length, 1);
    assert.equal(await users.count('all', 'all'), 1);
  });

  it('10 concurrent credit top-ups on one account: all land', async () => {
    const { users, user } = setup();
    await users.create(user(1));
    await Promise.all(Array.from({ length: 10 }, () => users.update('u1', (u) => ({ ...u, credits: u.credits + 1 }))));
    assert.equal((await users.get('u1'))?.credits, 10);
  });

  it('50 concurrent writes to one key: none lost, the rest told to retry', async () => {
    // R2 takes one write per second per key, so a pile-up this size cannot all land at once.
    const { users, user } = setup();
    await users.create(user(1));
    const results = await Promise.allSettled(
      Array.from({ length: 50 }, () => users.update('u1', (u) => ({ ...u, credits: u.credits + 1 }))),
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const busy = results.filter((r) => r.status === 'rejected' && r.reason instanceof BusyError).length;
    assert.equal(ok + busy, 50, 'every caller either succeeded or got BusyError');
    assert.equal((await users.get('u1'))?.credits, ok, 'the balance equals the successful top-ups exactly');
    assert.ok(ok >= 10, `got ${ok}`);
  });

  it('10 concurrent confirmations of one payment: exactly one transition', async () => {
    const { payments, iso } = setup();
    await payments.create({ id: 'p1', user_id: 'u1', status: 'pending', amount: 49, created_at: iso() });
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, n) =>
        payments.update('p1', (p) => (p.status === 'pending' ? { ...p, status: 'confirmed', confirmed_by: `webhook-${n}` } : null)),
      ),
    );
    const winners = results.filter((p, n) => p.confirmed_by === `webhook-${n}`);
    assert.equal(winners.length, 1);
    assert.ok(results.every((p) => p.status === 'confirmed'));
    assert.equal(await payments.count('status', 'pending'), 0);
    assert.equal(await payments.count('status', 'confirmed'), 1);
  });

  it('counters never hand out the same number twice', async () => {
    const { r2, store } = setup();
    const got = await Promise.all(Array.from({ length: 10 }, () => store.next('invoice', 1001)));
    assert.deepEqual([...got].sort((a, b) => a - b), Array.from({ length: 10 }, (_, n) => 1001 + n));
    assert.equal(await store.next('invoice'), 1011);
    assert.ok(r2.objects.has('n/invoice'));
    assert.ok(!r2.objects.has('k/n/invoice'));
  });

  it('settings documents change by compare-and-swap', async () => {
    const { store } = setup();
    await Promise.all(
      Array.from({ length: 8 }, (_, n) => store.updateDoc<{ flags: string[] }>('site', { flags: [] }, (s) => ({ flags: [...s.flags, `f${n}`] }))),
    );
    const site = await store.getDoc<{ flags: string[] }>('site', { flags: [] });
    assert.equal(site.flags.length, 8);
    assert.deepEqual(await store.getDoc('missing', { ok: true }), { ok: true });
  });
});

describe('limits and failures', () => {
  it('rides out the one-write-per-second limit (429) with backoff', async () => {
    const { r2, users, user } = setup();
    await users.create(user(1));
    let throttled = 0;
    const put = r2.put.bind(r2);
    r2.put = async (...args) => {
      try {
        return await put(...args);
      } catch (err) {
        throttled += 1;
        throw err;
      }
    };
    for (let n = 1; n <= 3; n += 1) await users.update('u1', (u) => ({ ...u, credits: n }));
    assert.ok(throttled > 0, 'the fake should have answered 429 at least once');
    assert.equal((await users.get('u1'))?.credits, 3);
  });

  it('retries transient errors and surfaces real ones', async () => {
    const clock = fakeClock();
    let calls = 0;
    const value = await withRetry(async () => {
      calls += 1;
      if (calls < 3) throw new Error('503 Service Unavailable');
      return 'ok';
    }, clock.sleep);
    assert.equal(value, 'ok');
    assert.equal(calls, 3);
    await assert.rejects(withRetry(async () => { throw new Error('InvalidObjectName (10020)'); }, clock.sleep), /10020/);
    assert.equal(isTransient(new Error('429 TooManyRequests (10058)')), true);
    assert.equal(isTransient(new Error('MetadataTooLarge (10012)')), false);
  });

  it('enforces the R2 metadata limit, so oversized summaries fail loudly', async () => {
    const clock = fakeClock();
    const r2 = new FakeR2({ now: clock.now });
    const store = new Store(r2, { sleep: clock.sleep, now: clock.now });
    const notes = store.collection<{ id: string; text: string; created_at: string }>({
      name: 'notes',
      indexes: [{ name: 'all', key: () => 'all', meta: (d) => ({ text: d.text }) }],
    });
    await assert.rejects(notes.create({ id: 'n1', text: 'x'.repeat(9000), created_at: '2026-10-20T00:00:00Z' }), /10012/);
  });
});

describe('repair', () => {
  it('listDocs drops entries whose document moved on, and fixes stale summaries', async () => {
    const { r2, users, user } = setup();
    await users.create(user(1));
    await users.create(user(2));
    // A crash between the document write and the index update: the document says admin, the index still says member.
    const doc = { ...(await users.get('u1'))!, role: 'admin' as const, name: 'Changed' };
    r2.objects.get('c/users/u1.json')!.body = JSON.stringify(doc);

    const members = await users.listDocs('role', 'member');
    assert.deepEqual(members.docs.map((u) => u.id), ['u2']);
    assert.equal(await users.count('role', 'member'), 1, 'the stale entry is deleted');

    await users.listDocs('all', 'all');
    const entry = (await users.list('all', 'all')).entries.find((e) => e.id === 'u1');
    assert.deepEqual(entry?.meta, { email: 'person1@example.com', name: 'Changed' });
  });

  it('reindex rebuilds missing entries and guards and removes strays', async () => {
    const { clock, r2, users, user } = setup();
    await users.create(user(1));
    await users.create(user(2));
    for (const k of keys(r2, 'i/users/role/')) r2.objects.delete(k);
    for (const k of keys(r2, 'u/users/')) r2.objects.delete(k);
    await r2.put('i/users/role/admin/0000000000000~ghost', '', { customMetadata: { m: '{}' } });
    await r2.put('u/users/email/deadbeef', 'ghost');
    clock.advance(3 * 60_000);

    const report = await users.reindex();
    assert.equal(report.docs, 2);
    assert.equal(report.entriesAdded, 2);
    assert.equal(report.entriesRemoved, 1);
    assert.equal(report.guardsAdded, 2);
    assert.equal(report.guardsRemoved, 1);
    assert.equal(await users.count('role', 'member'), 2);
    assert.equal((await users.find('email', 'person2@example.com'))?.id, 'u2');
    assert.deepEqual(await users.reindex(), { docs: 2, entriesAdded: 0, entriesRemoved: 0, guardsAdded: 0, guardsRemoved: 0 });
  });

  it('reclaims a guard left by a sign-up that never finished, but only after two minutes', async () => {
    const { clock, r2, users, user } = setup();
    const { createHash } = await import('node:crypto');
    const guard = `u/users/email/${createHash('sha256').update('stuck@example.com').digest('hex')}`;
    await r2.put(guard, 'u-abandoned');

    await assert.rejects(users.create(user(1, { email: 'stuck@example.com' })), ConflictError);
    clock.advance(2 * 60_000 + 1);
    await users.create(user(1, { email: 'stuck@example.com' }));
    assert.equal((await users.find('email', 'stuck@example.com'))?.id, 'u1');
  });

  it('never reclaims a guard whose holder still holds the value', async () => {
    const { clock, users, user } = setup();
    await users.create(user(1));
    clock.advance(60 * 60_000);
    await assert.rejects(users.create(user(2, { email: 'person1@example.com' })), ConflictError);
  });
});

describe('logs and ids', () => {
  it('appends and reads a stream in time order, with a resume point', async () => {
    const { clock, store } = setup();
    const ids: string[] = [];
    for (let n = 0; n < 5; n += 1) {
      clock.advance(10);
      const id = ulid(clock.now());
      ids.push(id);
      await store.append('support/t1', id, { n });
    }
    assert.deepEqual((await store.readLog<{ n: number }>('support/t1')).map((e) => e.value.n), [0, 1, 2, 3, 4]);
    assert.deepEqual((await store.readLog<{ n: number }>('support/t1', { after: ids[2] })).map((e) => e.value.n), [3, 4]);
    await store.append('support/t1', ids[0]!, { n: 0 }); // the same entry again: idempotent
    await assert.rejects(store.append('support/t1', ids[0]!, { n: 99 }), ConflictError);
    await store.deleteLog('support/t1', ids.slice(0, 2));
    assert.equal((await store.readLog('support/t1')).length, 3);
  });

  it('ulids sort by time; sort keys order both ways', () => {
    const a = ulid(Date.parse('2026-01-01T00:00:00Z'));
    const b = ulid(Date.parse('2026-06-01T00:00:00Z'));
    assert.equal(a.length, 26);
    assert.ok(a < b);
    assert.ok(newestFirst('2026-06-01T00:00:00Z') < newestFirst('2026-01-01T00:00:00Z'));
    assert.ok(oldestFirst('2026-01-01T00:00:00Z') < oldestFirst('2026-06-01T00:00:00Z'));
    assert.equal(newestFirst(0).length, 13);
  });
});
