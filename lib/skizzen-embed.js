/**
 * PROVA — Skizzen-Inline-Embed (MEGA³¹ A4)
 *
 * Sidebar im §6 Editor + [SKIZZE-N] Marker-Insert + PDF-Replace-Logic.
 *
 * Public API:
 *   ProvaSkizzenEmbed.loadList(auftrag_id) — render Sidebar mit Skizzen
 *   ProvaSkizzenEmbed.insertMarker(textarea, skizzeNr) — Cursor-Position-Insert
 *   ProvaSkizzenEmbed.replaceMarkers(text, skizzenMap) — PDF-Render-Helper (auch im Lambda nutzbar)
 *
 * Marker-Format: [SKIZZE-1], [SKIZZE-2], ... (aufsteigende Reihenfolge im Editor)
 */
'use strict';

(function () {
  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // Insert [SKIZZE-N] an Cursor-Position
  function insertMarker(textarea, skizzeNr) {
    if (!textarea || typeof textarea.selectionStart !== 'number') return false;
    const marker = '[SKIZZE-' + parseInt(skizzeNr, 10) + ']';
    const before = textarea.value.slice(0, textarea.selectionStart);
    const after = textarea.value.slice(textarea.selectionEnd);
    textarea.value = before + marker + after;
    const newPos = before.length + marker.length;
    textarea.setSelectionRange(newPos, newPos);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
    return true;
  }

  // Replace [SKIZZE-N] mit SVG (PDF-Render-Helper)
  // Auch in Lambda nutzbar (Node-kompatibel via require)
  function replaceMarkers(text, skizzenMap) {
    if (!text) return '';
    if (!skizzenMap || typeof skizzenMap !== 'object') return text;
    return String(text).replace(/\[SKIZZE-(\d+)\]/g, function (match, nr) {
      const key = parseInt(nr, 10);
      const skizze = skizzenMap[key] || skizzenMap[nr];
      if (skizze && skizze.svg_data) {
        return '\n<figure class="skizze-embed"><figcaption>Skizze ' + key + ': ' +
          escHtml(skizze.name || '') + '</figcaption>' + skizze.svg_data + '</figure>\n';
      }
      return match; // unverändert lassen wenn nicht gefunden
    });
  }

  // Sidebar-Element rendern + Click-Handler
  async function loadList(auftrag_id) {
    const sidebar = document.getElementById('skizzen-sidebar');
    if (!sidebar) return;
    if (!auftrag_id) {
      sidebar.innerHTML = '<div style="font-size:11px;color:var(--text3);">Kein Auftrag ausgewählt.</div>';
      return;
    }
    sidebar.innerHTML = '<div style="font-size:11px;color:var(--text3);font-style:italic;">Lade Skizzen…</div>';
    try {
      const fetcher = window.provaFetch || window.fetch.bind(window);
      const res = await fetcher('/.netlify/functions/skizzen-list?auftrag_id=' + encodeURIComponent(auftrag_id));
      if (!res.ok) {
        sidebar.innerHTML = '<div style="font-size:11px;color:#ef4444;">Fehler beim Laden.</div>';
        return;
      }
      const data = await res.json();
      const skizzen = data.skizzen || [];
      if (!skizzen.length) {
        sidebar.innerHTML = '<div style="font-size:11px;color:var(--text3);">Keine Skizzen für diesen Auftrag. <a href="/skizzen.html?auftrag_id=' + encodeURIComponent(auftrag_id) + '" style="color:var(--accent);">+ Skizze erstellen</a></div>';
        return;
      }
      const list = skizzen.map(function (s, i) {
        const nr = i + 1;
        return '<div class="skizze-item" style="padding:8px;background:var(--bg2);border-radius:6px;margin-bottom:6px;cursor:pointer;font-size:11px;" onclick="window.ProvaSkizzenEmbed._click(' + nr + ')" data-skizze-nr="' + nr + '">' +
          '<strong>[SKIZZE-' + nr + ']</strong> ' + escHtml(s.name || s.titel || 'Unbenannt') +
          '</div>';
      }).join('');
      sidebar.innerHTML = '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:8px;">📐 Skizzen einbinden</div>' + list;
    } catch (e) {
      sidebar.innerHTML = '<div style="font-size:11px;color:#ef4444;">Fehler: ' + escHtml(e.message) + '</div>';
    }
  }

  function clickHandler(nr) {
    const ta = document.getElementById('svTextA');
    if (ta) insertMarker(ta, nr);
  }

  if (typeof window !== 'undefined') {
    window.ProvaSkizzenEmbed = {
      loadList: loadList,
      insertMarker: insertMarker,
      replaceMarkers: replaceMarkers,
      _click: clickHandler,
      _internals: { escHtml }
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      insertMarker: insertMarker,
      replaceMarkers: replaceMarkers
    };
  }
}());
