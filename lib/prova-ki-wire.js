/**
 * PROVA KI-Wire (MEGA⁶⁶ Item 4.5)
 *
 * Verbindet Frontend-CustomEvents aus Commands-Registry mit Backend-Edge-Functions:
 *   - 'prova:ki-suggestion-request' (Konjunktiv / §-Verweis / Plausibilität)
 *     → ki-proxy / ki-konsistenz-check
 *     → setKiSuggestion Mark im Editor
 *   - 'prova:similarity-request' → similarity-v1 → FragmentSidebar-Highlight
 *   - 'prova:fragments-to-befund-request' → fragments-to-befund-v1 → Editor-Insert
 *
 * Activation: ProvaKiWire.activate({ editor, auftragId, fragmentSidebar? })
 */
'use strict';

(function (global) {

  async function _getSb() {
    if (_getSb._c) return _getSb._c;
    const url = window.PROVA_CONFIG?.SUPABASE_URL;
    const key = window.PROVA_CONFIG?.SUPABASE_ANON_KEY;
    const mod = await import('https://esm.sh/@supabase/supabase-js@2.105.0');
    _getSb._c = mod.createClient(url, key, { auth: { persistSession: true } });
    return _getSb._c;
  }

  async function _callEdge(name, body) {
    const sb = await _getSb();
    const { data: { session } } = await sb.auth.getSession();
    const tok = session?.access_token;
    if (!tok) throw new Error('Nicht angemeldet');
    const url = window.PROVA_CONFIG.SUPABASE_URL;
    const anon = window.PROVA_CONFIG.SUPABASE_ANON_KEY;
    const resp = await fetch(`${url}/functions/v1/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}`, 'apikey': anon },
      body: JSON.stringify(body)
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error || `HTTP ${resp.status}`);
    return json;
  }

  function _toast(msg, kind = 'info') {
    if (typeof document === 'undefined') return;
    const t = document.createElement('div');
    t.className = `prova-toast prova-toast--${kind}`;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-visible'));
    setTimeout(() => { t.classList.remove('is-visible'); setTimeout(() => t.parentNode?.removeChild(t), 300); }, 4500);
  }

  async function _sha256(s) {
    const buf = new TextEncoder().encode(s);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const ProvaKiWire = {
    activate({ editor, auftragId, fragmentSidebar }) {
      this._editor = editor;
      this._auftragId = auftragId;
      this._sidebar = fragmentSidebar || null;
      if (this._registered) return;
      this._registered = true;

      // KI-Suggestion (Konjunktiv / §-Verweis / Plausibilität)
      document.addEventListener('prova:ki-suggestion-request', async (e) => {
        const { purpose, text, from, to } = e.detail || {};
        if (!text || from == null || to == null) return;
        await this._handleKiSuggestion(purpose, text, from, to);
      });

      // Similarity
      document.addEventListener('prova:similarity-request', async () => {
        await this._handleSimilarity();
      });

      // Fragments-to-Befund (Command-Path)
      document.addEventListener('prova:fragments-to-befund-request', async () => {
        if (typeof global.ProvaBefundGenerator?.open === 'function') {
          global.ProvaBefundGenerator.open(editor, auftragId, fragmentSidebar);
        } else {
          _toast('Befund-Generator nicht geladen', 'error');
        }
      });
    },

    async _handleKiSuggestion(purpose, text, from, to) {
      const editor = this._editor;
      if (!editor) return;
      _toast(`KI prüft (${purpose})…`, 'loading');
      try {
        let response;
        if (purpose === 'plausibilitaets_check') {
          // ki-konsistenz-check braucht 2 Texte → defensive fallback
          response = await _callEdge('ki-proxy', {
            prompt: text,
            purpose: 'plausibilitaets_check',
            auftrag_id: this._auftragId,
            max_tokens: 800
          });
        } else {
          response = await _callEdge('ki-proxy', {
            prompt: text,
            purpose,
            auftrag_id: this._auftragId,
            max_tokens: 500
          });
        }
        const newText = response.text || response.result || '';
        if (!newText) { _toast('KI lieferte leere Antwort', 'error'); return; }
        const providerHash = await _sha256(response.modell_version || response.modell || 'unknown');

        // Bei plausibilitaets_check: Callout statt Suggestion
        if (purpose === 'plausibilitaets_check') {
          editor.chain().focus().setTextSelection({ from, to }).run();
          editor.chain().focus().insertContentAt(to, {
            type: 'provaCallout',
            attrs: { severity: 'warning' },
            content: [{ type: 'text', text: newText.slice(0, 1500) }]
          }).run();
          _toast('Plausibilitäts-Hinweis eingefügt', 'success');
          return;
        }

        // Konjunktiv/§-Verweis → Suggestion-Mark einfügen
        editor.chain().focus()
          .setTextSelection({ from, to })
          .insertContent({
            type: 'text',
            text: newText,
            marks: [{
              type: 'provaKiSuggestion',
              attrs: {
                suggestionId: crypto.randomUUID(),
                type: 'replace',
                original: text,
                newText: newText,
                providerHash: 'sha256:' + providerHash.slice(0, 16),
                confidence: response.confidence ?? 0.85,
                kiProtokollId: response.ki_protokoll_id || null,
                createdAt: new Date().toISOString()
              }
            }]
          })
          .run();
        _toast('KI-Vorschlag eingefügt — klick zum Übernehmen/Verwerfen', 'success');
      } catch (err) {
        _toast('KI-Fehler: ' + (err?.message || String(err)), 'error');
      }
    },

    async _handleSimilarity() {
      const editor = this._editor;
      if (!editor) return;
      // Aktueller Absatz-Text als Query
      const { from } = editor.state.selection;
      const $pos = editor.state.doc.resolve(from);
      const parentText = $pos.parent.textContent || '';
      if (parentText.trim().length === 0) {
        _toast('Cursor in einem Absatz mit Text platzieren', 'info');
        return;
      }
      _toast('Suche ähnliche Fragmente…', 'loading');
      try {
        // similarity-v1 erwartet fragment_id (siehe MEGA⁶²) — wir nutzen Workaround: query_text
        const response = await _callEdge('similarity-v1', {
          query_text: parentText.slice(0, 500),
          auftrag_id: this._auftragId,
          scope: 'workspace',
          limit: 5
        });
        const results = response.results || [];
        if (results.length === 0) { _toast('Keine ähnlichen Fragmente gefunden', 'info'); return; }
        _toast(`${results.length} ähnliche Fragmente — siehe Sidebar`, 'success');
        // Sidebar hervorheben
        if (this._sidebar && typeof this._sidebar.scrollToFragment === 'function') {
          this._sidebar.scrollToFragment(results[0].id);
        }
      } catch (err) {
        _toast('Similarity-Fehler: ' + (err?.message || String(err)), 'error');
      }
    }
  };

  global.ProvaKiWire = ProvaKiWire;
})(typeof window !== 'undefined' ? window : globalThis);
