/**
 * PROVA Systems — textbaustein-search.js  (Client-Side)
 * ══════════════════════════════════════════════════════════════════════
 * Category 5 Missing Feature — Textbaustein Full-Text Search via Airtable
 *
 * PROBLEM:  Lokale Suche begrenzt auf localStorage-Cache.
 *           Neue oder geänderte Textbausteine werden nicht gefunden.
 *
 * LÖSUNG:
 *   1. Airtable TEXTBAUSTEINE-Tabelle mit sv_email-Filter durchsuchen
 *   2. Client-seitiges Debounce (300ms) + lokaler Cache (5 min TTL)
 *   3. Fallback auf localStorage-Cache bei Offline
 *   4. Fuzzy-Highlight der Treffer im Ergebnis
 *
 * EINBINDEN: <script src="textbaustein-search.js" defer></script>
 * ══════════════════════════════════════════════════════════════════════
 */
(function(global) {
  'use strict';

  var AT_BASE     = 'appJ7bLlAHZoxENWE';
  var AT_TABLE    = 'TEXTBAUSTEINE';        // Tabellenname in Airtable
  var CACHE_TTL   = 5 * 60 * 1000;         // 5 Minuten
  var DEBOUNCE_MS = 300;

  var _cache     = null;   // { ts, items: [{id, titel, text, kategorie, tags}] }
  var _debTimer  = null;
  var _svEmail   = '';

  /* ── Airtable: Alle Textbausteine des SVs laden ──────────────── */
  async function ladeAlleTextbausteine(svEmail) {
    if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
      return _cache.items;
    }

    // MEGA⁷⁵-F-Batch2 B9: textbausteine via Supabase (RLS workspace-scoped).
    // Globale Bausteine (workspace_id NULL) sind via RLS-Policy auch lesbar.
    var ad = await import('/lib/prova-supabase-adapters.js');
    var sb = await ad.getSupabase();
    if (!sb) throw new Error('no-supabase');
    var r = await sb.from('textbausteine')
      .select('id, titel, text, kategorie, tags, workspace_id')
      .is('deleted_at', null)
      .limit(500);
    if (r.error) throw new Error(r.error.message);

    var items = (r.data || []).map(function(row) {
      return {
        id:        row.id,
        titel:     row.titel     || '',
        text:      row.text      || '',
        kategorie: row.kategorie || '',
        tags:      row.tags      || '',
        global:    !row.workspace_id
      };
    });

    /* In localStorage cachen (für Offline) */
    try {
      localStorage.setItem('prova_textbausteine_cache', JSON.stringify({ts: Date.now(), items: items}));
    } catch(e) {}

    _cache = {ts: Date.now(), items: items};
    return items;
  }

  /* ── Fuzzy-Suche (client-seitig) ────────────────────────────── */
  function sucheLokal(items, query) {
    if (!query || !query.trim()) return items;
    var q       = query.toLowerCase().trim();
    var qNorm   = q.replace(/[\s\-\.]/g, '');
    return items.filter(function(item) {
      var hay     = (item.titel + ' ' + item.text + ' ' + item.kategorie + ' ' + item.tags).toLowerCase();
      var hayNorm = hay.replace(/[\s\-\.]/g, '');
      return hay.includes(q) || hayNorm.includes(qNorm);
    }).sort(function(a, b) {
      /* Titel-Treffer zuerst */
      var aTitle = a.titel.toLowerCase().includes(q);
      var bTitle = b.titel.toLowerCase().includes(q);
      if (aTitle && !bTitle) return -1;
      if (!aTitle && bTitle) return 1;
      return 0;
    });
  }

  /* ── Highlight Treffer im Text ───────────────────────────────── */
  function highlight(text, query) {
    if (!query || !text) return escHtml(text);
    var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escHtml(text).replace(new RegExp('(' + escaped + ')', 'gi'),
      '<mark style="background:rgba(79,142,247,.25);color:inherit;border-radius:2px;">$1</mark>');
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>');
  }

  /* ── Ergebnisliste rendern ───────────────────────────────────── */
  function renderErgebnisse(items, query, containerEl, onInsert) {
    if (!containerEl) return;
    if (items.length === 0) {
      containerEl.innerHTML = '<div style="padding:16px;text-align:center;font-size:13px;color:var(--text3);">'
        + (query ? '🔍 Keine Textbausteine für "' + escHtml(query) + '"' : 'Keine Textbausteine vorhanden')
        + '</div>';
      return;
    }

    /* Kategorien gruppieren */
    var grouped = {};
    items.forEach(function(item) {
      var kat = item.kategorie || 'Allgemein';
      if (!grouped[kat]) grouped[kat] = [];
      grouped[kat].push(item);
    });

    var html = '';
    Object.keys(grouped).forEach(function(kat) {
      html += '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;'
        + 'color:var(--text3);padding:8px 12px 4px;">' + escHtml(kat) + '</div>';
      grouped[kat].forEach(function(item) {
        var preview = item.text.slice(0, 100) + (item.text.length > 100 ? '…' : '');
        html += '<div class="tb-result-item" data-id="' + item.id + '" '
          + 'style="padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--border);'
          + 'transition:background .15s;" '
          + 'onmouseenter="this.style.background=\'rgba(79,142,247,.06)\'" '
          + 'onmouseleave="this.style.background=\'\'">'
          + '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:3px;">'
          + (item.global ? '🌐 ' : '') + highlight(item.titel, query) + '</div>'
          + '<div style="font-size:11px;color:var(--text3);line-height:1.4;">' + highlight(preview, query) + '</div>'
          + '</div>';
      });
    });

    containerEl.innerHTML = html;

    /* Klick-Handler */
    containerEl.querySelectorAll('.tb-result-item').forEach(function(el) {
      el.addEventListener('click', function() {
        var id    = el.getAttribute('data-id');
        var found = items.find(function(i) { return i.id === id; });
        if (found && typeof onInsert === 'function') {
          onInsert(found);
        }
      });
    });
  }

  /* ── Debounce-Suche ──────────────────────────────────────────── */
  function starteSuche(query, containerEl, onInsert, svEmail) {
    clearTimeout(_debTimer);
    _svEmail = svEmail || localStorage.getItem('prova_sv_email') || '';

    /* Sofort: Offline-Cache anzeigen */
    var offlineCache = [];
    try {
      var cached = JSON.parse(localStorage.getItem('prova_textbausteine_cache') || '{}');
      offlineCache = cached.items || [];
    } catch(e) {}
    if (offlineCache.length > 0) {
      renderErgebnisse(sucheLokal(offlineCache, query), query, containerEl, onInsert);
    }

    if (!navigator.onLine) return;

    _debTimer = setTimeout(async function() {
      if (containerEl) {
        var loadEl = document.createElement('div');
        loadEl.style.cssText = 'padding:8px 12px;font-size:11px;color:var(--text3);';
        loadEl.textContent = '⏳ Airtable wird durchsucht…';
        containerEl.insertBefore(loadEl, containerEl.firstChild);
      }
      try {
        var items   = await ladeAlleTextbausteine(_svEmail);
        var results = sucheLokal(items, query);
        renderErgebnisse(results, query, containerEl, onInsert);
      } catch(e) {
        console.warn('[Textbaustein] Airtable-Suche fehlgeschlagen:', e.message);
        /* Fallback auf Offline-Cache bleibt */
      }
    }, DEBOUNCE_MS);
  }

  /* ── Widget einbinden ────────────────────────────────────────── */
  /**
   * Erstellt eine vollständige Textbaustein-Suchleiste.
   * @param {string}   inputSelector  - CSS-Selektor des Sucheingabefelds
   * @param {string}   listSelector   - CSS-Selektor des Ergebnis-Containers
   * @param {function} onInsert       - Callback wenn Baustein ausgewählt: fn(item)
   */
  function init(inputSelector, listSelector, onInsert) {
    var inputEl = document.querySelector(inputSelector);
    var listEl  = document.querySelector(listSelector);
    if (!inputEl || !listEl) return;

    /* Initiale Vorladung */
    var svEmail = localStorage.getItem('prova_sv_email') || '';
    ladeAlleTextbausteine(svEmail).then(function(items) {
      renderErgebnisse(items, '', listEl, onInsert);
    }).catch(function() {});

    /* Suche bei Eingabe */
    inputEl.addEventListener('input', function() {
      starteSuche(inputEl.value, listEl, onInsert, svEmail);
    });

    /* Suche löschen */
    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        inputEl.value = '';
        ladeAlleTextbausteine(svEmail).then(function(items) {
          renderErgebnisse(items, '', listEl, onInsert);
        }).catch(function() {});
      }
    });
  }

  /* ── Cache invalidieren (nach Speichern eines neuen Bausteins) ── */
  function invalidateCache() {
    _cache = null;
    try { localStorage.removeItem('prova_textbausteine_cache'); } catch(e) {}
  }

  global.ProvaTextbausteinSearch = {
    init:             init,
    suche:            starteSuche,
    lade:             ladeAlleTextbausteine,
    invalidateCache:  invalidateCache,
    renderErgebnisse: renderErgebnisse,
  };

})(window);