'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createUrlPolicy, parseSafeUrl } = require('../src/url-policy');

const policy = createUrlPolicy(8000);

test('allows only exact internal backend origins', () => {
  assert.equal(policy.classify('http://127.0.0.1:8000/api/health'), 'internal');
  assert.equal(policy.classify('http://localhost:8000/path?next=https://example.com'), 'internal');
  assert.equal(policy.classify('http://127.0.0.1:8001/'), 'blocked');
  assert.equal(policy.classify('http://localhost.evil.test:8000/'), 'blocked');
  assert.equal(policy.classify('http://127.0.0.1:8000.evil.test/'), 'blocked');
});

test('allows HTTPS and required telephone links externally', () => {
  assert.equal(policy.classify('https://t.me/system_polish'), 'external');
  assert.equal(policy.classify('https://example.com/path'), 'external');
  assert.equal(policy.classify('tel:+79990000000'), 'external');
});

test('rejects unsafe schemes, invalid URLs, and credentials', () => {
  for (const url of [
    'http://example.com',
    'mailto:test@example.com',
    'tg://resolve?domain=example',
    'javascript:alert(1)',
    'file:///etc/passwd',
    'data:text/html,unsafe',
    'https://user:pass@example.com/',
    'not a url',
    '',
  ]) {
    assert.equal(policy.classify(url), 'blocked', url);
  }
  assert.equal(parseSafeUrl(null), null);
});
