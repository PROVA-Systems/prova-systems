/**
 * PROVA Version-History (MEGA⁶⁷ Item 5.9)
 *
 * Slider-UI über documents_versions. Zeigt Versionen mit Metadaten.
 * "Wiederherstellen" speichert alte Version als neue.
 *
 * API:
 *   ProvaVersionHistory.open({ documentId, editor, onRestore })
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-version-history-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-version-history-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-version-history.css';
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

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  const ProvaVersionHistory = {
    async open({ documentId, editor, onRestore }) {
      if (!documentId) { alert('document_id erforderlich'); return; }
      if (this._active) return;
      _injectStyle();

      const overlay = document.createElement('div');
      overlay.className = 'prova-version-overlay';
      overlay.innerHTML = `
        <div class="prova-version-modal">
          <header>
            <h2>Versions-Historie</h2>
            <button type="button" class="close" aria-label="Schließen">✕</button>
          </header>
          <div class="vh-loading">Lade Versionen…</div>
        </div>
      `;
      document.body.appendChild(overlay);
      this._active = overlay;

      const close = () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        this._active = null;
        document.removeEventListener('keydown', onKey, true);
      };
      const onKey = (e) => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey, true);
      overlay.querySelector('.close').addEventListener('click', close);
      overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });

      const modal = overlay.querySelector('.prova-version-modal');

      try {
        const sb = await _getSb();
        const { data: versions, error } = await sb.from('documents_versions')
          .select('id, document_id, version_nr, saved_by_user_id, saved_at, byte_size, notiz')
          .eq('document_id', documentId)
          .order('version_nr', { ascending: false })
          .limit(50);
        if (error) throw error;
        if (!versions || versions.length === 0) {
          modal.innerHTML = `
            <header><h2>Versions-Historie</h2><button class="close">✕</button></header>
            <div class="vh-empty">Noch keine Versions-Snapshots vorhanden.<br><small>Versionen werden bei jedem Auto-Save erstellt.</small></div>
          `;
          modal.querySelector('.close').addEventListener('click', close);
          return;
        }

        let selectedIdx = 0;
        let selectedVersion = versions[0];

        function render() {
          modal.innerHTML = `
            <header>
              <h2>Versions-Historie · ${versions.length} Versionen</h2>
              <button type="button" class="close" aria-label="Schließen">✕</button>
            </header>
            <div class="vh-slider-row">
              <input type="range" class="vh-slider" min="0" max="${versions.length - 1}" value="${selectedIdx}">
              <div class="vh-slider-labels">
                <span>v${versions[versions.length - 1].version_nr}</span>
                <span>v${versions[0].version_nr} (aktuell)</span>
              </div>
            </div>
            <div class="vh-detail">
              <div class="vh-meta">
                <strong>Version ${selectedVersion.version_nr}</strong>
                ${selectedIdx === 0 ? '<span class="vh-pill">aktuell</span>' : ''}
                · ${new Date(selectedVersion.saved_at).toLocaleString('de-DE')}
                · ${selectedVersion.byte_size || 0} Bytes
                ${selectedVersion.notiz ? '<br><em>' + _esc(selectedVersion.notiz) + '</em>' : ''}
              </div>
              <div class="vh-actions">
                ${selectedIdx === 0 ? '' : `<button type="button" class="vh-restore">↻ Diese Version wiederherstellen</button>`}
              </div>
            </div>
          `;
          modal.querySelector('.close').addEventListener('click', close);
          modal.querySelector('.vh-slider').addEventListener('input', (e) => {
            selectedIdx = parseInt(e.target.value, 10);
            selectedVersion = versions[selectedIdx];
            render();
          });
          modal.querySelector('.vh-restore')?.addEventListener('click', async () => {
            if (!confirm(`Version ${selectedVersion.version_nr} wirklich wiederherstellen? Die aktuelle Version bleibt als Snapshot erhalten.`)) return;
            try {
              const { data: full } = await sb.from('documents_versions').select('content_json').eq('id', selectedVersion.id).maybeSingle();
              if (!full?.content_json) throw new Error('Version nicht ladbar');
              if (editor) editor.commands.setContent(full.content_json);
              if (typeof onRestore === 'function') onRestore(full.content_json, selectedVersion);
              close();
            } catch (e) {
              alert('Wiederherstellen fehlgeschlagen: ' + e.message);
            }
          });
        }

        render();
      } catch (e) {
        modal.innerHTML = `<div class="vh-error">Fehler: ${_esc(e.message)}</div>`;
      }
    }
  };

  global.ProvaVersionHistory = ProvaVersionHistory;
})(typeof window !== 'undefined' ? window : globalThis);
