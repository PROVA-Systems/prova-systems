/**
 * PROVA Public-Status-Widget
 * MEGA¹¹ W6 (Tier 9, 2026-05-04)
 *
 * Kompaktes Footer-Widget das Live-System-Status anzeigt.
 * Pollt /.netlify/functions/health alle 60 Sekunden (zentral cached).
 *
 * USAGE in HTML-Footer:
 *   <div id="prova-status-widget"></div>
 *   <script src="/lib/public-status-widget.js" defer></script>
 *
 * USAGE programmatic:
 *   ProvaStatusWidget.mount(container, options)
 *   ProvaStatusWidget.refresh()
 *   ProvaStatusWidget.destroy()
 *
 * Anti-Pattern vermieden:
 *   - Kein global polling beim Page-Load wenn kein Container da
 *   - Kein localStorage-Abuse (Status ist Server-Wahrheit, nicht client-cached)
 *   - Kein blocking-fetch (defer-Pattern)
 *   - Kein bunte Animationen wenn prefers-reduced-motion (Accessibility)
 */
'use strict';

(function () {

  const POLL_INTERVAL_MS = 60 * 1000;        // 60s — UptimeRobot pollt 5min, Widget agile
  const FETCH_TIMEOUT_MS = 8 * 1000;         // 8s — generous fuer cold-start
  const HEALTH_ENDPOINT = '/.netlify/functions/health';
  const STATUS_PAGE_URL = '/status.html';

  // ─── STYLE INJECTION (kein separater CSS-File noetig) ────────────────
  const STYLE_ID = 'prova-status-widget-style';
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .psw-root { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#6b7a99; font-family:inherit; }
      .psw-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
      .psw-dot--ok { background:#10b981; box-shadow:0 0 0 2px rgba(16,185,129,0.15); }
      .psw-dot--degraded { background:#f59e0b; box-shadow:0 0 0 2px rgba(245,158,11,0.2); }
      .psw-dot--outage { background:#ef4444; box-shadow:0 0 0 2px rgba(239,68,68,0.2); animation: psw-pulse 1.5s infinite; }
      .psw-dot--loading { background:#6b7a99; }
      .psw-link { color:inherit; text-decoration:none; }
      .psw-link:hover { color:#4f8ef7; }
      @keyframes psw-pulse { 0%,100% { opacity:1; } 50% { opacity:.55; } }
      @media (prefers-reduced-motion: reduce) {
        .psw-dot--outage { animation:none; }
      }
    `;
    document.head.appendChild(style);
  }

  // ─── HEALTH-FETCH (mit Timeout + Fallback) ───────────────────────────
  async function _fetchHealth() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(HEALTH_ENDPOINT, {
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) return { state: 'outage', reason: 'HTTP ' + res.status };

      const json = await res.json();
      // health.js returns { status: 'ok' } | { status: 'degraded' } | { status: 'down' }
      if (json.status === 'ok') return { state: 'ok', detail: json };
      if (json.status === 'degraded') return { state: 'degraded', detail: json };
      return { state: 'outage', detail: json };
    } catch (e) {
      clearTimeout(timeout);
      if (e.name === 'AbortError') return { state: 'outage', reason: 'timeout' };
      return { state: 'outage', reason: e.message || 'fetch failed' };
    }
  }

  // ─── RENDER ───────────────────────────────────────────────────────────
  function _stateLabel(state) {
    if (state === 'ok')        return 'Alle Systeme operativ';
    if (state === 'degraded')  return 'Eingeschraenkter Betrieb';
    if (state === 'outage')    return 'Stoerung';
    return 'Status pruefen';
  }

  function _render(container, state, options) {
    const showLabel = options.showLabel !== false;
    const dotClass = 'psw-dot psw-dot--' + state;
    const label = _stateLabel(state);

    container.innerHTML = '';
    container.classList.add('psw-root');

    const link = document.createElement('a');
    link.href = STATUS_PAGE_URL;
    link.className = 'psw-link';
    link.setAttribute('aria-label', 'System-Status: ' + label);
    link.title = label + ' — System-Status anzeigen';

    const dot = document.createElement('span');
    dot.className = dotClass;
    dot.setAttribute('aria-hidden', 'true');
    link.appendChild(dot);

    if (showLabel) {
      const txt = document.createElement('span');
      txt.textContent = label;
      link.appendChild(txt);
    }

    container.appendChild(link);
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────
  let _pollerHandle = null;
  let _activeContainer = null;
  let _activeOptions = null;

  async function _pollAndRender() {
    if (!_activeContainer || !document.body.contains(_activeContainer)) {
      // Container weg — stop polling
      destroy();
      return;
    }
    const result = await _fetchHealth();
    _render(_activeContainer, result.state, _activeOptions || {});
  }

  function mount(container, options) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) {
      console.warn('[ProvaStatusWidget] container not found');
      return;
    }
    injectStyle();
    _activeContainer = container;
    _activeOptions = options || {};

    // Initial render mit "loading"-State
    _render(container, 'loading', _activeOptions);

    // Sofort erstes Poll
    _pollAndRender();

    // Recurring Poll (cleared on destroy)
    if (_pollerHandle) clearInterval(_pollerHandle);
    _pollerHandle = setInterval(_pollAndRender, POLL_INTERVAL_MS);
  }

  function refresh() {
    _pollAndRender();
  }

  function destroy() {
    if (_pollerHandle) {
      clearInterval(_pollerHandle);
      _pollerHandle = null;
    }
    _activeContainer = null;
    _activeOptions = null;
  }

  // ─── AUTO-MOUNT bei container#prova-status-widget ─────────────────────
  function _autoMount() {
    const container = document.getElementById('prova-status-widget');
    if (container) mount(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _autoMount);
  } else {
    _autoMount();
  }

  window.ProvaStatusWidget = { mount, refresh, destroy };

  // Test-Exports
  window.ProvaStatusWidget._test = {
    stateLabel: _stateLabel,
    fetchHealth: _fetchHealth,
    POLL_INTERVAL_MS, FETCH_TIMEOUT_MS, HEALTH_ENDPOINT
  };
})();
