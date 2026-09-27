import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

function harness(overrides = {}) {
  const handlers = {};
  const shown = [];
  const opened = [];
  const deleted = [];
  let activated = false;
  const context = {
    URL,
    caches: {
      open: async () => ({ add: async () => { throw new Error('Offline page unavailable'); } }),
      keys: async () => ['edutrack-v1', 'edutrack-v2', 'another-app'],
      delete: async (name) => deleted.push(name),
      ...overrides.caches,
    },
    self: {
      location: { origin: 'https://edutrack.test' },
      addEventListener: (name, handler) => { handlers[name] = handler; },
      skipWaiting: async () => { activated = true; },
      registration: { showNotification: async (title, options) => { shown.push({ title, options }); } },
      clients: {
        claim: async () => {},
        matchAll: async () => [],
        openWindow: async (url) => { opened.push(url); },
        ...overrides.clients,
      },
    },
  };
  vm.runInNewContext(worker, context);
  async function dispatch(name, props = {}) {
    let pending;
    handlers[name]({ ...props, waitUntil: (promise) => { pending = promise; } });
    await pending;
  }
  return { dispatch, shown, opened, deleted, isActivated: () => activated };
}

test('failed optional precache downloads do not prevent push worker activation', async () => {
  const app = harness();
  await app.dispatch('install');
  assert.equal(app.isActivated(), true);
});

test('storage unavailable still allows push worker activation', async () => {
  const app = harness({ caches: { open: async () => { throw new Error('Quota exceeded'); } } });
  await app.dispatch('install');
  assert.equal(app.isActivated(), true);
});

test('activation removes only obsolete EduTrack caches', async () => {
  const app = harness();
  await app.dispatch('activate');
  assert.deepEqual(app.deleted, ['edutrack-v1']);
});

test('push displays title, body, deduplication tag and corrected attendance link', async () => {
  const app = harness();
  await app.dispatch('push', { data: { json: () => ({ title: 'Điểm danh', body: 'Lớp A', tag: 'attendance:123', url: '/dashboard/classes/123?tab=attendance' }) } });
  assert.equal(app.shown[0].title, 'Điểm danh');
  assert.equal(app.shown[0].options.body, 'Lớp A');
  assert.equal(app.shown[0].options.tag, 'attendance:123');
  assert.equal(app.shown[0].options.data.url, 'https://edutrack.test/classes/123?tab=attendance');
});

test('null and plain-text payloads still display a notification', async () => {
  const app = harness();
  await app.dispatch('push', { data: { json: () => null } });
  await app.dispatch('push', { data: { json: () => { throw new Error('not json'); }, text: () => 'Nhắc lịch' } });
  assert.equal(app.shown[0].title, 'EduTrack');
  assert.equal(app.shown[1].options.body, 'Nhắc lịch');
});

test('notification targets stay on the application origin', async () => {
  const app = harness();
  await app.dispatch('push', { data: { json: () => ({ url: 'https://other.test' }) } });
  assert.equal(app.shown[0].options.data.url, 'https://edutrack.test/dashboard');
});

test('click focuses exact existing attendance tab', async () => {
  let focused = 0;
  const app = harness({ clients: { matchAll: async () => [{ url: 'https://edutrack.test/classes/123?tab=attendance', focus: async () => { focused++; } }] } });
  await app.dispatch('notificationclick', { notification: { close() {}, data: { url: '/classes/123?tab=attendance' } } });
  assert.equal(focused, 1);
  assert.equal(app.opened.length, 0);
});

test('click navigates another tab and waits for focus', async () => {
  const actions = [];
  const app = harness({ clients: { matchAll: async () => [{ url: 'https://edutrack.test/profile', navigate: async (url) => { actions.push(url); return { focus: async () => actions.push('focused') }; } }] } });
  await app.dispatch('notificationclick', { notification: { close() {}, data: { url: '/classes/123?tab=attendance' } } });
  assert.deepEqual(actions, ['https://edutrack.test/classes/123?tab=attendance', 'focused']);
});

test('closed tab during navigation opens a new application window', async () => {
  const app = harness({ clients: { matchAll: async () => [{ url: 'https://edutrack.test/profile', navigate: async () => { throw new Error('window closed'); } }] } });
  await app.dispatch('notificationclick', { notification: { close() {}, data: { url: '/classes/123?tab=attendance' } } });
  assert.deepEqual(app.opened, ['https://edutrack.test/classes/123?tab=attendance']);
});

test('notification without stored data opens dashboard', async () => {
  const app = harness();
  await app.dispatch('notificationclick', { notification: { close() {} } });
  assert.deepEqual(app.opened, ['https://edutrack.test/dashboard']);
});
