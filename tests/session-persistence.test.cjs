const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');
function load(file, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => mocks[name] || require(name), URL, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key' } } }, { filename: file });
  return module.exports;
}
const session = load('lib/supabase/session-options.ts');
function middleware(auth) {
  return load('middleware.ts', {
    '@/lib/supabase/session-options': session,
    '@supabase/ssr': { createServerClient: (_, __, options) => ({ auth: { getUser: () => auth(options) } }) },
  }).middleware;
}
const request = path => new NextRequest('https://zola.example' + path);
const loggedIn = { data: { user: { id: 'user-1' } }, error: null };
test('reopening the existing PWA start URL skips the login flow', async () => {
  const response = await middleware(() => loggedIn)(request('/'));
  assert.equal(response.headers.get('location'), 'https://zola.example/home');
  assert.match(response.headers.get('cache-control'), /no-store/);
});
test('refreshed cookies reach downstream server handlers and the browser', async () => {
  const response = await middleware(options => {
    options.cookies.setAll([{ name: 'sb-test-auth-token', value: 'rotated', options: { maxAge: 34560000, path: '/' } }]);
    return loggedIn;
  })(request('/home'));
  assert.match(response.headers.get('x-middleware-request-cookie'), /sb-test-auth-token=rotated/);
  assert.equal(response.cookies.get('sb-test-auth-token').value, 'rotated');
});
test('entry redirects retain refreshed cookies', async () => {
  const response = await middleware(options => {
    options.cookies.setAll([{ name: 'sb-test-auth-token', value: 'rotated', options: { maxAge: 34560000 } }]);
    return loggedIn;
  })(request('/login?next=/referrals/new'));
  assert.equal(response.headers.get('location'), 'https://zola.example/referrals/new');
  assert.equal(response.cookies.get('sb-test-auth-token').value, 'rotated');
});
test('temporary auth failures return 503 without a login redirect or auth bypass', async () => {
  const response = await middleware(() => ({ data: { user: null }, error: { name: 'AuthRetryableFetchError', status: 503 } }))(request('/home'));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('location'), null);
  assert.equal(response.headers.get('retry-after'), '5');
  assert.match(await response.text(), /Reconnecting to Zola/);
});
test('missing API sessions return JSON 401', async () => {
  const response = await middleware(() => ({ data: { user: null }, error: null }))(request('/api/me'));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, 'Authentication required.');
});
test('invalid session removes cookies on redirect and retains the intended page', async () => {
  const response = await middleware(options => {
    options.cookies.setAll([{ name: 'sb-test-auth-token', value: '', options: { maxAge: 0 } }]);
    return { data: { user: null }, error: { status: 400 } };
  })(request('/referrals/new?care_level=ICU'));
  assert.equal(new URL(response.headers.get('location')).searchParams.get('next'), '/referrals/new?care_level=ICU');
  assert.equal(response.cookies.get('sb-test-auth-token').maxAge, 0);
});
test('resume rejects external redirects and login loops', () => {
  for (const path of ['//external.example', '/\\external.example', 'https://external.example', '/login', '/workspace/login', '/']) assert.equal(session.safeNextPath(path), '/home');
  assert.equal(session.safeNextPath('/referrals/new?care_level=ICU'), '/referrals/new?care_level=ICU');
});
