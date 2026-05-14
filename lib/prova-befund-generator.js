/**
 * PROVA Befund-Generator (MEGA⁶⁶ Item 4.4)
 *
 * Modal: SV wählt Fragmente (aus FragmentSidebar) + Sprachstil + gutachten_teil
 * → POST fragments-to-befund-v1 → Markdown im Editor.
 *
 * API:
 *   ProvaBefundGenerator.open(editor, auftragId, fragmentSidebar)
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-befund-generator-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-befund-generator-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-befund-generator.css';
    document.head.appendChild(link);
  }

  async function _getSb() {
    if (_getSb._c) return _getSb._c;
    const url = window.PROVA_CONFIG?.SUPABASE_URL;
    const key = window.PROVA_CONFIG?.SUPABASE_ANON_KEY;
    const mod = await import('/lib/supabase-client.js');  // MEGA75-E Singleton
    _getSb._c = mod.supabase || (mod.getSupabase && mod.getSupabase());
    return _getSb._c;
  }

  function _toast(msg, kind = 'info') {
    const t = document.createElement('div');
    t.className = `prova-toast prova-toast--${kind}`;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-visible'));
    setTimeout(() => { t.classList.remove('is-visible'); setTimeout(() => t.parentNode?.removeChild(t), 300); }, 4500);
  }

  const ProvaBefundGenerator = {
    async open(editor, auftragId, fragmentSidebar) {
      if (!editor || !auftragId) { alert('Editor + auftrag_id Pflicht'); return; }
      _injectStyle();

      // Falls Sidebar Auswahl liefert
      let selectedIds = [];
      if (fragmentSidebar?.getSelectedIds) {
        selectedIds = fragmentSidebar.getSelectedIds();
      }

      // Falls keine Auswahl → alle gepruft-Fragmente
      if (selectedIds.length === 0) {
        const sb = await _getSb();
        const { data } = await sb.from('befund_fragmente')
          .select('id')
          .eq('auftrag_id', auftragId)
          .eq('status', 'gepruft')
          .is('deleted_at', null);
        selectedIds = (data || []).map(f => f.id);
      }

      if (selectedIds.length === 0) {
        _toast('Keine geprüften Fragmente vorhanden. Erst Fragmente prüfen.', 'info');
        return;
      }

      const overlay = document.createElement('div');
      overlay.className = 'prova-befundgen-overlay';
      overlay.innerHTML = `
        <div class="prova-befundgen-modal">
          <header><h2>Befund generieren</h2><button type="button" class="close" aria-label="Schließen">✕</button></header>
          <div class="body">
            <p><strong>${selectedIds.length}</strong> Fragment${selectedIds.length !== 1 ? 'e' : ''} werden via fragments-to-befund-v1 verarbeitet.</p>
            <label class="row">
              <span>Gutachten-Teil:</span>
              <select id="bg-teil">
                <option value="">(auto)</option>
                <option value="sachverhalt">Sachverhalt</option>
                <option value="befund" selected>Befund</option>
                <option value="fachurteil">Fachurteil</option>
                <option value="zusammenfassung">Zusammenfassung</option>
              </select>
            </label>
            <label class="row">
              <span>Sprachstil:</span>
              <select id="bg-stil">
                <option value="sachlich" selected>Sachlich (Gerichts-Stil)</option>
                <option value="detailliert">Detailliert</option>
                <option value="kurz">Kurz</option>
              </select>
            </label>
            <div class="meta">Halluzinations-Check: JEDES Fragment muss im Output auftauchen (Marker [🔗fragment-uuid]).</div>
          </div>
          <footer>
            <button type="button" class="btn-cancel">Abbrechen</button>
            <button type="button" class="btn-go">Generieren →</button>
          </footer>
        </div>
      `;
      document.body.appendChild(overlay);

      function close() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        document.removeEventListener('keydown', onKey, true);
      }
      function onKey(e) { if (e.key === 'Escape') close(); }
      document.addEventListener('keydown', onKey, true);
      overlay.querySelector('.close').addEventListener('click', close);
      overlay.querySelector('.btn-cancel').addEventListener('click', close);
      overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });

      overlay.querySelector('.btn-go').addEventListener('click', async () => {
        const teil = overlay.querySelector('#bg-teil').value || null;
        const stil = overlay.querySelector('#bg-stil').value || 'sachlich';
        const btn = overlay.querySelector('.btn-go');
        btn.disabled = true;
        btn.textContent = 'Läuft…';
        _toast('Generiere Befund…', 'loading');
        try {
          const sb = await _getSb();
          const { data: { session } } = await sb.auth.getSession();
          const tok = session?.access_token;
          const url = window.PROVA_CONFIG.SUPABASE_URL;
          const anon = window.PROVA_CONFIG.SUPABASE_ANON_KEY;
          const resp = await fetch(`${url}/functions/v1/fragments-to-befund-v1`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}`, 'apikey': anon },
            body: JSON.stringify({
              auftrag_id: auftragId,
              fragment_ids: selectedIds,
              gutachten_teil: teil,
              sprachstil: stil
            })
          });
          const json = await resp.json();
          if (!resp.ok || !json.success) {
            _toast('Generation fehlgeschlagen: ' + (json?.error || 'Unbekannt'), 'error');
            btn.disabled = false; btn.textContent = 'Generieren →';
            return;
          }
          const markdown = json.markdown || '';
          // Markdown → Einfügen mit Marker-Konvertierung
          _insertMarkdownAtCursor(editor, markdown);
          _toast(`Befund eingefügt · ${json.marker_count} Marker · ${Math.round((json.kosten_eur || 0) * 100) / 100} €`, 'success');
          close();
        } catch (e) {
          _toast('Fehler: ' + (e?.message || String(e)), 'error');
          btn.disabled = false; btn.textContent = 'Generieren →';
        }
      });
    }
  };

  function _insertMarkdownAtCursor(editor, markdown) {
    // Sehr einfache Konversion: Headings + Paragraphs + Inline-Marker
    const lines = (markdown || '').split('\n');
    const nodes = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const h = trimmed.match(/^(#{1,3})\s+(.*)$/);
      if (h) {
        nodes.push({ type: 'heading', attrs: { level: h[1].length }, content: [{ type: 'text', text: h[2] }] });
        continue;
      }
      // Parse Marker [🔗fragment-uuid] in Text
      const content = _parseInlineMarkers(trimmed);
      nodes.push({ type: 'paragraph', content });
    }
    if (nodes.length === 0) return;
    editor.chain().focus().insertContent(nodes).run();
  }

  function _parseInlineMarkers(text) {
    const out = [];
    const re = /(.*?)\[🔗fragment-([0-9a-f-]+)\]/g;
    let lastEnd = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const before = m[1];
      const fragId = m[2];
      if (before.length > 0) {
        out.push({
          type: 'text',
          text: before,
          marks: [{ type: 'provaFragmentMarker', attrs: { fragmentId: fragId, quelle: 'ki_zusammenfuehrung', timestamp: new Date().toISOString() } }]
        });
      }
      lastEnd = m.index + m[0].length;
    }
    if (lastEnd < text.length) {
      out.push({ type: 'text', text: text.slice(lastEnd) });
    } else if (out.length === 0) {
      out.push({ type: 'text', text });
    }
    return out;
  }

  global.ProvaBefundGenerator = ProvaBefundGenerator;
})(typeof window !== 'undefined' ? window : globalThis);
