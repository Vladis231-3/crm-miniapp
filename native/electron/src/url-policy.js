'use strict';

function parseSafeUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) return null;
  try {
    const url = new URL(rawUrl);
    if (url.username || url.password) return null;
    return url;
  } catch (_) {
    return null;
  }
}

function createUrlPolicy(backendPort) {
  const internalOrigins = new Set([
    `http://127.0.0.1:${backendPort}`,
    `http://localhost:${backendPort}`,
  ]);

  function isInternal(rawUrl) {
    const url = parseSafeUrl(rawUrl);
    return Boolean(url && internalOrigins.has(url.origin));
  }

  function isExternal(rawUrl) {
    const url = parseSafeUrl(rawUrl);
    if (!url) return false;
    // Telephone links are used by the CRM. All other external navigation must use HTTPS.
    return url.protocol === 'https:' || url.protocol === 'tel:';
  }

  function classify(rawUrl) {
    if (isInternal(rawUrl)) return 'internal';
    if (isExternal(rawUrl)) return 'external';
    return 'blocked';
  }

  return { classify, isExternal, isInternal };
}

module.exports = { createUrlPolicy, parseSafeUrl };
