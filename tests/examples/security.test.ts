import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { it } from 'vitest';

async function run(example: string, source: string): Promise<void> {
  await promisify(execFile)(process.execPath, ['--input-type=module', '-e', source], {
    cwd: fileURLToPath(new URL(`../../examples/${example}/`, import.meta.url)),
    timeout: 10000,
  });
}

it('rejects oversized constrained collections before validating each element', async () => {
  await run(
    'bot',
    `
import assert from 'node:assert/strict';
import { z } from 'zod';
let checked = 0;
const schema = z.array(z.string().transform(value => {
  checked++;
  return value;
})).max(2);
assert.equal(schema.safeParse(Array.from({ length: 128 }, () => 'item')).success, false);
assert.equal(checked, 0);
assert.deepEqual(schema.parse(['valid']), ['valid']);
assert.equal(checked, 1);
`,
  );
});

it('rejects cross-origin hyperlink auditing requests through Hono CSRF middleware', async () => {
  await run(
    'hono',
    `
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { csrf } from 'hono/csrf';
const app = new Hono();
let invoked = 0;
app.use('*', csrf());
app.post('/action', context => {
  invoked++;
  return context.text('accepted');
});
const rejected = await app.request('https://dashboard.example/action', {
  method: 'POST',
  headers: { 'Content-Type': 'text/ping', Origin: 'https://attacker.example', 'Sec-Fetch-Site': 'cross-site' },
  body: 'PING',
});
assert.equal(rejected.status, 403);
assert.equal(invoked, 0);
const accepted = await app.request('https://dashboard.example/action', {
  method: 'POST',
  headers: { 'Content-Type': 'text/ping', Origin: 'https://dashboard.example', 'Sec-Fetch-Site': 'same-origin' },
  body: 'PING',
});
assert.equal(accepted.status, 200);
assert.equal(invoked, 1);
`,
  );
});

it('keeps encoded mounted paths from bypassing scoped middleware', async () => {
  await run(
    'hono',
    `
import assert from 'node:assert/strict';
import { Hono } from 'hono';
const app = new Hono();
const mounted = new Hono();
mounted.get('/admin/secret', context => context.text('private'));
mounted.get('/public', context => context.text('public'));
app.use('/app/admin/*', context => context.text('denied', 401));
app.mount('/app', mounted.fetch.bind(mounted));
const encoded = await app.request('/app/public%5C..%5Cadmin/secret');
assert.notEqual(await encoded.text(), 'private');
assert.notEqual(encoded.status, 200);
assert.equal((await app.request('/app/admin/secret')).status, 401);
assert.equal(await (await app.request('/app/public')).text(), 'public');
`,
  );
});
