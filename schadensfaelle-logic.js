/**
 * PROVA — schadensfaelle-logic.js (MEGA²⁸ P1-I1)
 *
 * Übersichts-Liste für Flow A (Schaden/Mangel).
 * Daten via lib/data-store.js aus auftraege-Tabelle.
 *
 * Filter: Suche (Aktenzeichen + Kurzbezeichnung), Typ, Phase, Status.
 * Sortierung: alle Spalten, Default Frist asc.
 * Klick → akte.html?id=<auftrag_id>.
 */
'use strict';

(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const SCHADENS_TYPEN = [
    'schadensgutachten', 'beweissicherung', 'ergaenzungsgutachten',
    'gegengutachten', 'gerichtsgutachten', 'stellungnahme', 'gutachterliche-stellungnahme'
  ];

  let _all = [];
  let _filtered = [];
  let _sortKey = 'frist';
  let _sortDir = 'asc';

  /**
   * Sort-Helper. Pure-Function für Tests.
   * @param {Array} rows
   * @param {string} key
   * @param {'asc'|'desc'} dir
   * @returns {Array}
   */
  function sortRows(rows, key, dir) {
    const factor = dir === 'desc' ? -1 : 1;
    return rows.slice().sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor;
      return String(va).localeCompare(String(vb), 'de') * factor;
    });
  }

  /**
   * Filter-Logic. Pure-Function für Tests.
   */
  function filterRows(rows, filters) {
    filters = filters || {};
    const q = String(filters.q || '').trim().toLowerCase();
    return rows.filter(r => {
      if (filters.typ && r.typ !== filters.typ) return false;
      if (filters.phase && r.phase !== filters.phase) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (q) {
        const hay = ((r.az || '') + ' ' + (r.kurzbezeichnung || '')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  /**
   * Frist-Status für Badge.
   * Pure-Function für Tests.
   */
  function fristStatus(fristIso, today) {
    if (!fristIso) return 'none';
    const t = today ? new Date(today) : new Date();
    const f = new Date(fristIso);
    if (isNaN(f.getTime())) return 'none';
    const diff = (f - t) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'overdue';
    if (diff < 7) return 'warn';
    return 'ok';
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatFrist(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '—';
      return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
    } catch (_) { return '—'; }
  }

  function renderTable(rows) {
    if (!rows || rows.length === 0) return renderEmpty();
    const headers = [
      { key: 'az', label: 'Aktenzeichen' },
      { key: 'kurzbezeichnung', label: 'Kurzbezeichnung' },
      { key: 'auftraggeber_name', label: 'Auftraggeber' },
      { key: 'phase', label: 'Phase' },
      { key: 'frist', label: 'Frist' },
      { key: 'status', label: 'Status' }
    ];
    let html = '<table class="sf-table"><thead><tr>';
    headers.forEach(h => {
      const sortedClass = h.key === _sortKey ? (_sortDir === 'asc' ? 'sorted-asc' : 'sorted') : '';
      html += '<th class="' + sortedClass + '" data-sort="' + h.key + '">' + escapeHtml(h.label) + '</th>';
    });
    html += '</tr></thead><tbody>';
    rows.forEach(r => {
      const fStatus = fristStatus(r.frist);
      const fBadgeClass = fStatus === 'overdue' ? 'badge-frist-overdue'
                       : fStatus === 'warn' ? 'badge-frist-warn'
                       : '';
      html += '<tr data-id="' + escapeHtml(r.id || '') + '">'
        + '<td class="az">' + escapeHtml(r.az || '—') + '</td>'
        + '<td class="title">' + escapeHtml(r.kurzbezeichnung || '—') + '</td>'
        + '<td>' + escapeHtml(r.auftraggeber_name || '—') + '</td>'
        + '<td><span class="badge badge-phase">' + escapeHtml(r.phase || '—') + '</span></td>'
        + '<td><span class="badge ' + fBadgeClass + '">' + formatFrist(r.frist) + '</span></td>'
        + '<td><span class="badge badge-status ' + escapeHtml(r.status || '') + '">' + escapeHtml(r.status || '—') + '</span></td>'
        + '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  function renderEmpty() {
    return '<div class="empty-state">'
      + '<div class="icon">📋</div>'
      + '<div class="title">Noch keine Schadensfälle</div>'
      + '<div class="desc">Erstelle deinen ersten Auftrag oder schau dir den Demo-Fall an.</div>'
      + '<a href="neuer-fall.html" class="btn btn-primary" style="text-decoration:none;display:inline-block;">+ Neuer Fall</a>'
      + '<div class="demo-hint">Oder: <a href="akte.html?id=SCH-DEMO-001" style="color:var(--accent);text-decoration:none;">Demo-Fall öffnen</a></div>'
      + '</div>';
  }

  function applyFilters() {
    const filters = {
      q: document.getElementById('sf-search').value,
      typ: document.getElementById('sf-typ').value,
      phase: document.getElementById('sf-phase').value,
      status: document.getElementById('sf-status').value
    };
    _filtered = sortRows(filterRows(_all, filters), _sortKey, _sortDir);
    document.getElementById('sf-content').innerHTML = renderTable(_filtered);
    document.getElementById('sf-count').textContent = '(' + _filtered.length + ')';
    wireRowClicks();
    wireHeaderClicks();
  }

  function wireRowClicks() {
    document.querySelectorAll('.sf-table tbody tr[data-id]').forEach(tr => {
      tr.addEventListener('click', () => {
        const id = tr.getAttribute('data-id');
        if (id) window.location.href = 'akte.html?id=' + encodeURIComponent(id);
      });
    });
  }

  function wireHeaderClicks() {
    document.querySelectorAll('.sf-table thead th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.getAttribute('data-sort');
        if (key === _sortKey) _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
        else { _sortKey = key; _sortDir = 'asc'; }
        applyFilters();
      });
    });
  }

  async function loadData() {
    try {
      // Versuche data-store.js
      let rows = [];
      if (window.dataStore && typeof window.dataStore.listAuftraege === 'function') {
        rows = await window.dataStore.listAuftraege({ types: SCHADENS_TYPEN });
      } else if (window.provaFetch) {
        // Fallback: direkter Lambda-Call
        const res = await window.provaFetch('/.netlify/functions/list-auftraege?typen=' + SCHADENS_TYPEN.join(','), {
          headers: window.provaAuthHeaders ? window.provaAuthHeaders() : {}
        });
        if (res.ok) {
          const data = await res.json();
          rows = (data && data.items) || [];
        }
      }
      _all = Array.isArray(rows) ? rows : [];
      applyFilters();
      document.getElementById('sf-meta').textContent = 'Insgesamt ' + _all.length + ' Schadensfälle.';
    } catch (e) {
      document.getElementById('sf-content').innerHTML =
        '<div class="error-box">Fehler beim Laden: ' + escapeHtml(e.message || 'unbekannt') + '</div>';
    }
  }

  // ─── MEGA³⁴ A2: Pagination + Bulk + CSV-Export ───
  var _state = { page: 1, pageSize: 50, sortBy: 'datum', sortDir: 'desc', selected: new Set() };

  function paginate(rows, page, size) {
    const start = (page - 1) * size;
    return rows.slice(start, start + size);
  }

  function totalPages(total, size) {
    return Math.max(1, Math.ceil(total / size));
  }

  function pageGo(delta) {
    _state.page = Math.max(1, _state.page + delta);
    if (typeof applyFilters === 'function') applyFilters();
  }

  function sortBy(key) {
    if (_state.sortBy === key) {
      _state.sortDir = _state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      _state.sortBy = key;
      _state.sortDir = 'asc';
    }
    if (typeof applyFilters === 'function') applyFilters();
  }

  function filterByDateRange(rows, fromIso, toIso) {
    if (!fromIso && !toIso) return rows;
    return rows.filter(r => {
      const d = (r.datum || r.created_at || '').slice(0, 10);
      if (fromIso && d < fromIso) return false;
      if (toIso && d > toIso) return false;
      return true;
    });
  }

  function bulkComplete() {
    if (!_state.selected.size) { alert('Keine Auswahl getroffen.'); return; }
    if (!confirm('Markiere ' + _state.selected.size + ' Aufträge als abgeschlossen?')) return;
    // TODO: Production-Path via Lambda. Für M34: optimistic UI-Update.
    console.log('[SF] Bulk-Complete:', Array.from(_state.selected));
    _state.selected.clear();
    if (typeof applyFilters === 'function') applyFilters();
  }

  function bulkClear() {
    _state.selected.clear();
    var bb = document.getElementById('sf-bulk-bar');
    if (bb) bb.style.display = 'none';
    document.querySelectorAll('.sf-row-check').forEach(function (cb) { cb.checked = false; });
  }

  function exportCSV(rows) {
    const data = (rows && Array.isArray(rows)) ? rows : (window._SF_currentRows || []);
    const head = ['Aktenzeichen', 'Auftragstyp', 'Auftraggeber', 'Phase', 'Datum', 'Status'];
    const csv = [head.join(';')].concat(
      data.map(r => [r.az || r.aktenzeichen || '', r.auftragstyp || r.typ || '',
        r.auftraggeber || '', r.phase || '', r.datum || '', r.status || '']
        .map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';'))
    ).join('\n');
    if (typeof Blob !== 'undefined') {
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'schadensfaelle-' + Date.now() + '.csv';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
    }
    return csv;
  }

  // Public API
  window.SF = {
    applyFilters,
    sortRows,
    filterRows,
    fristStatus,
    paginate,
    totalPages,
    page: pageGo,
    sortBy,
    filterByDateRange,
    bulkComplete,
    bulkClear,
    exportCSV,
    _state,
    _const: { SCHADENS_TYPEN }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadData);
  } else {
    loadData();
  }
})();

// MEGA³⁴ A2: Pure-Function-Exports für Tests (Node-side, ohne window/document)
function paginatePure(rows, page, size) {
  const start = (page - 1) * size;
  return rows.slice(start, start + size);
}
function totalPagesPure(total, size) {
  return Math.max(1, Math.ceil(total / size));
}
function filterByDateRangePure(rows, fromIso, toIso) {
  if (!fromIso && !toIso) return rows;
  return rows.filter(r => {
    const d = (r.datum || r.created_at || '').slice(0, 10);
    if (fromIso && d < fromIso) return false;
    if (toIso && d > toIso) return false;
    return true;
  });
}
function exportCSVPure(rows) {
  const head = ['Aktenzeichen', 'Auftragstyp', 'Auftraggeber', 'Phase', 'Datum', 'Status'];
  return [head.join(';')].concat(
    rows.map(r => [r.az || '', r.auftragstyp || '', r.auftraggeber || '', r.phase || '', r.datum || '', r.status || '']
      .map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';'))
  ).join('\n');
}

// Test-Exports (Node-side via require — pure functions only)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    paginate: paginatePure,
    totalPages: totalPagesPure,
    filterByDateRange: filterByDateRangePure,
    exportCSV: exportCSVPure,
    sortRows: function (rows, key, dir) {
      const factor = dir === 'desc' ? -1 : 1;
      return rows.slice().sort((a, b) => {
        const va = a[key]; const vb = b[key];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor;
        return String(va).localeCompare(String(vb), 'de') * factor;
      });
    },
    filterRows: function (rows, filters) {
      filters = filters || {};
      const q = String(filters.q || '').trim().toLowerCase();
      return rows.filter(r => {
        if (filters.typ && r.typ !== filters.typ) return false;
        if (filters.phase && r.phase !== filters.phase) return false;
        if (filters.status && r.status !== filters.status) return false;
        if (q) {
          const hay = ((r.az || '') + ' ' + (r.kurzbezeichnung || '')).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });
    },
    fristStatus: function (fristIso, today) {
      if (!fristIso) return 'none';
      const t = today ? new Date(today) : new Date();
      const f = new Date(fristIso);
      if (isNaN(f.getTime())) return 'none';
      const diff = (f - t) / (1000 * 60 * 60 * 24);
      if (diff < 0) return 'overdue';
      if (diff < 7) return 'warn';
      return 'ok';
    },
    SCHADENS_TYPEN: [
      'schadensgutachten', 'beweissicherung', 'ergaenzungsgutachten',
      'gegengutachten', 'gerichtsgutachten', 'stellungnahme', 'gutachterliche-stellungnahme'
    ]
  };
}
