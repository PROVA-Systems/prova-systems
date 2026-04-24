/* ════════════════════════════════════════════════════════════════════
   PROVA — prova-sanitize.js
   S-SICHER Paket 2 Commit P2.3a (25.04.2026) · Finding 6.1

   XSS-Helper fuer die ~479 innerHTML-Stellen in der Codebase. Keine
   globale DOMPurify-Dependency — PROVA ist Vanilla-JS by design.

   API (window.PROVA_SANITIZE):
     escapeHtml(str)  — & < > " ' als HTML-Entities
     escapeAttr(str)  — escapeHtml + Backtick + Backslash (fuer Attribut-Werte)
     safeText(str)    — trimmed String, undefined/null → ''

   Defensiv: undefined/null/number werden zu '' bzw. String-konvertiert,
   keine Exceptions. ES5-kompatibel (siehe trial-guard.js Stil).

   EINBINDEN: Nach auth-guard.js, vor page-spezifischen Logic-Scripts.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var MAP_HTML = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
  var MAP_ATTR = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;', '`':'&#96;', '\\':'&#92;' };

  function toStr(v) {
    if (v === undefined || v === null) return '';
    return String(v);
  }

  function escapeHtml(v) {
    return toStr(v).replace(/[&<>"']/g, function (ch) { return MAP_HTML[ch]; });
  }

  function escapeAttr(v) {
    return toStr(v).replace(/[&<>"'`\\]/g, function (ch) { return MAP_ATTR[ch]; });
  }

  function safeText(v) {
    return toStr(v);
  }

  window.PROVA_SANITIZE = {
    escapeHtml: escapeHtml,
    escapeAttr: escapeAttr,
    safeText: safeText
  };
})();
