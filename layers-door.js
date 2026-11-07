/*! layers-door.js: open, fill in and sign .docx/.xlsx/.pptx files in Layers. MIT, SumOffice. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LayersDoor = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  var APP = 'https://app.layers.md';
  var SITE = 'https://layers.md';
  var OFFICE = /\.(docx|xlsx|pptx)$/i;

  function tag(from) {
    return String(from || 'door').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(0, 80);
  }

  function absolute(file) {
    var base = typeof location !== 'undefined' ? location.href : undefined;
    try { return new URL(file, base); } catch (e) { return null; }
  }

  function isOfficeFile(file) {
    var u = absolute(file);
    return !!u && (u.protocol === 'https:' || u.protocol === 'http:') && OFFICE.test(u.pathname);
  }

  // Link that opens the file in Layers: read it, edit it, send it for signature, save a copy.
  function viewerUrl(file, from) {
    var u = absolute(file);
    if (!u || !isOfficeFile(u.href)) return null;
    u.hash = '';
    return APP + '/v1/public/viewer/open#' + new URLSearchParams({ url: u.href, from: tag(from) }).toString();
  }

  // Live document or table from the Layers catalog (4,000+ letters, contracts, calculators).
  function formUrl(slug, from, embed) {
    var q = new URLSearchParams({ from: tag(from) });
    if (embed !== false) q.set('embed', '1');
    return APP + '/t/' + encodeURIComponent(slug) + '?' + q.toString();
  }

  function signUpUrl(from) { return APP + '/register?from=' + encodeURIComponent(tag(from)); }
  function pricingUrl(from) { return SITE + '/pricing?from=' + encodeURIComponent(tag(from)); }

  // Server side (Node 18+): import a public file and get a ready link to it.
  function open(file, from, fetchImpl) {
    var f = fetchImpl || fetch;
    return f(APP + '/v1/public/viewer/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: String(file), from: tag(from) })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (b) {
        if (!r.ok) throw new Error(b.error || 'ERR_VIEWER_IMPORT_' + r.status);
        return b;
      });
    });
  }

  return {
    APP: APP, SITE: SITE, tag: tag, isOfficeFile: isOfficeFile,
    viewerUrl: viewerUrl, formUrl: formUrl, signUpUrl: signUpUrl, pricingUrl: pricingUrl, open: open
  };
});
