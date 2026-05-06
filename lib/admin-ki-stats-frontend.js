/**
 * PROVA — admin-ki-stats-frontend.js (MEGA²³ Block 4)
 *
 * Frontend-Aggregations + HTML-Renderer fuer Admin-Cockpit "KI & Workflow"-Tab.
 * Reine Funktionen — testbar ohne Browser/DOM.
 *
 * Datenquelle: ki_protokoll-Aggregation via /.netlify/functions/admin-ki-aggregations
 *
 * Public API (browser via window.ProvaAdminKiStats, node via require):
 *   ProvaAdminKiStats.aggregateModelDistribution(rows) → [{ provider, count, percent }]
 *   ProvaAdminKiStats.aggregateCostsPerUser(rows) → [{ user_id, count, total_cost_eur, avg_dauer_ms }]
 *   ProvaAdminKiStats.aggregateFotoUsage(rows) → [{ user_id, foto_calls }]
 *   ProvaAdminKiStats.aggregateDiktatStats(rows) → { total_calls, total_minutes, avg_dauer_ms }
 *   ProvaAdminKiStats.renderModelPie(distribution) → HTML
 *   ProvaAdminKiStats.renderCostsTable(perUser) → HTML
 *   ProvaAdminKiStats.renderFotoUsage(perUser) → HTML
 *   ProvaAdminKiStats.renderDiktatStats(stats) → HTML
 */
'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.ProvaAdminKiStats = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _safeNum(v) { const n = Number(v); return isFinite(n) ? n : 0; }

  /**
   * Aggregiere Modell-Distribution.
   *
   * @param {Array<{provider, modell?}>} rows
   * @returns {Array<{provider, count, percent}>}
   */
  function aggregateModelDistribution(rows) {
    if (!Array.isArray(rows)) return [];
    const buckets = {};
    rows.forEach(r => {
      const key = (r.provider || r.modell || 'unknown').toString().toLowerCase();
      buckets[key] = (buckets[key] || 0) + 1;
    });
    const total = Object.values(buckets).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    return Object.entries(buckets)
      .map(([provider, count]) => ({
        provider,
        count,
        percent: Math.round((count / total) * 1000) / 10
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Aggregiere Costs pro User (Top N).
   *
   * @param {Array<{user_id, cost_eur?, dauer_ms?}>} rows
   * @param {number} [topN=5]
   * @returns {Array<{user_id, count, total_cost_eur, avg_dauer_ms}>}
   */
  function aggregateCostsPerUser(rows, topN = 5) {
    if (!Array.isArray(rows)) return [];
    const buckets = {};
    rows.forEach(r => {
      const uid = r.user_id || 'unknown';
      if (!buckets[uid]) buckets[uid] = { user_id: uid, count: 0, total_cost_eur: 0, dauer_sum: 0 };
      buckets[uid].count++;
      buckets[uid].total_cost_eur += _safeNum(r.cost_eur);
      buckets[uid].dauer_sum += _safeNum(r.dauer_ms);
    });
    return Object.values(buckets)
      .map(b => ({
        user_id: b.user_id,
        count: b.count,
        total_cost_eur: Math.round(b.total_cost_eur * 100) / 100,
        avg_dauer_ms: b.count > 0 ? Math.round(b.dauer_sum / b.count) : 0
      }))
      .sort((a, b) => b.total_cost_eur - a.total_cost_eur)
      .slice(0, topN);
  }

  /**
   * Aggregiere Foto-KI-Usage pro User (purpose='foto_analyse').
   *
   * @param {Array<{user_id, purpose}>} rows
   * @returns {Array<{user_id, foto_calls, limit_pct}>}  // limit_pct relativ zu 10/Monat
   */
  function aggregateFotoUsage(rows) {
    if (!Array.isArray(rows)) return [];
    const buckets = {};
    rows.forEach(r => {
      if (r.purpose !== 'foto_analyse') return;
      const uid = r.user_id || 'unknown';
      buckets[uid] = (buckets[uid] || 0) + 1;
    });
    const FOTO_LIMIT = 10;
    return Object.entries(buckets)
      .map(([user_id, foto_calls]) => ({
        user_id,
        foto_calls,
        limit_pct: Math.round((foto_calls / FOTO_LIMIT) * 100)
      }))
      .sort((a, b) => b.foto_calls - a.foto_calls);
  }

  /**
   * Aggregiere Diktat-Stats (purpose='diktat_strukturierung').
   *
   * @param {Array} rows
   * @returns {object} { total_calls, total_minutes, avg_dauer_ms }
   */
  function aggregateDiktatStats(rows) {
    if (!Array.isArray(rows)) return { total_calls: 0, total_minutes: 0, avg_dauer_ms: 0 };
    const diktatRows = rows.filter(r => r.purpose === 'diktat_strukturierung');
    if (diktatRows.length === 0) return { total_calls: 0, total_minutes: 0, avg_dauer_ms: 0 };
    const total_dauer_ms = diktatRows.reduce((sum, r) => sum + _safeNum(r.dauer_ms), 0);
    return {
      total_calls: diktatRows.length,
      total_minutes: Math.round((total_dauer_ms / 1000 / 60) * 10) / 10,
      avg_dauer_ms: Math.round(total_dauer_ms / diktatRows.length)
    };
  }

  // ── HTML-Renderer ────────────────────────────────────────

  function renderModelPie(distribution) {
    if (!Array.isArray(distribution) || distribution.length === 0) {
      return '<div style="color:var(--text3, #8b93ab);font-style:italic;padding:8px 0;">Keine Daten im Zeitraum</div>';
    }
    const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];
    return distribution.map((d, i) => {
      const c = COLORS[i % COLORS.length];
      return '<div style="display:grid;grid-template-columns:120px 1fr 60px;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.05);">'
        + '<span style="font-size:12px;color:var(--text2, #8b93ab);">' + escapeHtml(d.provider) + '</span>'
        + '<div style="background:rgba(0,0,0,0.06);border-radius:4px;overflow:hidden;height:14px;">'
        + '<div style="background:' + c + ';height:14px;width:' + Math.min(100, d.percent) + '%;"></div></div>'
        + '<span style="font-size:11px;text-align:right;font-family:ui-monospace,monospace;color:var(--text, #eaecf4);">' + d.count + ' (' + d.percent + '%)</span>'
        + '</div>';
    }).join('');
  }

  function renderCostsTable(perUser) {
    if (!Array.isArray(perUser) || perUser.length === 0) {
      return '<div style="color:var(--text3, #8b93ab);font-style:italic;padding:8px 0;">Keine Daten</div>';
    }
    let html = '<table style="width:100%;font-size:11px;color:var(--text2, #8b93ab);">';
    html += '<thead><tr style="text-align:left;color:var(--text3, #4d5568);text-transform:uppercase;font-size:10px;letter-spacing:0.06em;">'
      + '<th style="padding:4px 0;">User-ID</th><th>Calls</th><th>Cost (€)</th><th>Ø ms</th></tr></thead><tbody>';
    perUser.forEach(p => {
      const uid = String(p.user_id).slice(0, 8);
      html += '<tr style="border-top:1px solid rgba(0,0,0,0.05);">'
        + '<td style="padding:4px 0;font-family:ui-monospace,monospace;">' + escapeHtml(uid) + '…</td>'
        + '<td>' + p.count + '</td>'
        + '<td style="font-weight:600;color:var(--text, #eaecf4);">' + p.total_cost_eur.toFixed(2) + '</td>'
        + '<td>' + p.avg_dauer_ms + '</td>'
        + '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  function renderFotoUsage(perUser) {
    if (!Array.isArray(perUser) || perUser.length === 0) {
      return '<div style="color:var(--text3, #8b93ab);font-style:italic;padding:8px 0;">Keine Foto-KI-Calls im Zeitraum</div>';
    }
    return perUser.slice(0, 5).map(p => {
      const pct = Math.min(100, p.limit_pct);
      const color = pct > 80 ? '#ef4444' : (pct > 50 ? '#f59e0b' : '#10b981');
      const uid = String(p.user_id).slice(0, 8);
      return '<div style="display:grid;grid-template-columns:80px 1fr 70px;gap:10px;align-items:center;padding:5px 0;border-bottom:1px solid rgba(0,0,0,0.05);">'
        + '<span style="font-family:ui-monospace,monospace;font-size:11px;">' + escapeHtml(uid) + '…</span>'
        + '<div style="background:rgba(0,0,0,0.06);border-radius:3px;overflow:hidden;height:10px;">'
        + '<div style="background:' + color + ';height:10px;width:' + pct + '%;"></div></div>'
        + '<span style="font-size:11px;text-align:right;font-family:ui-monospace,monospace;">' + p.foto_calls + '/10 (' + p.limit_pct + '%)</span>'
        + '</div>';
    }).join('');
  }

  function renderDiktatStats(stats) {
    stats = stats || { total_calls: 0, total_minutes: 0, avg_dauer_ms: 0 };
    if (stats.total_calls === 0) {
      return '<div style="color:var(--text3, #8b93ab);font-style:italic;padding:8px 0;">Keine Diktat-Calls im Zeitraum</div>';
    }
    return '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">'
      + '<div style="text-align:center;padding:10px;background:rgba(99,102,241,0.06);border-radius:6px;">'
      + '<div style="font-size:18px;font-weight:700;color:var(--text, #eaecf4);">' + stats.total_calls + '</div>'
      + '<div style="font-size:10px;color:var(--text3, #4d5568);text-transform:uppercase;">Calls</div></div>'
      + '<div style="text-align:center;padding:10px;background:rgba(99,102,241,0.06);border-radius:6px;">'
      + '<div style="font-size:18px;font-weight:700;color:var(--text, #eaecf4);">' + stats.total_minutes + '</div>'
      + '<div style="font-size:10px;color:var(--text3, #4d5568);text-transform:uppercase;">Min total</div></div>'
      + '<div style="text-align:center;padding:10px;background:rgba(99,102,241,0.06);border-radius:6px;">'
      + '<div style="font-size:18px;font-weight:700;color:var(--text, #eaecf4);">' + Math.round(stats.avg_dauer_ms) + '</div>'
      + '<div style="font-size:10px;color:var(--text3, #4d5568);text-transform:uppercase;">Ø ms</div></div>'
      + '</div>';
  }

  return {
    aggregateModelDistribution,
    aggregateCostsPerUser,
    aggregateFotoUsage,
    aggregateDiktatStats,
    renderModelPie,
    renderCostsTable,
    renderFotoUsage,
    renderDiktatStats,
    escapeHtml
  };
});
