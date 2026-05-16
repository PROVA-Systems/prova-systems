/* ════════════════════════════════════════════════════════════════════
   PROVA KI Diktat→§§ Mapping mit editierbaren Chips — MEGA⁸⁴ Block A.4
   ════════════════════════════════════════════════════════════════════
   Wrapper für ki-proxy task='diktat_paragraph_mapping' (gpt-5.5).
   Liefert pro § einen Text-Block, plus Alternatives bei strittigen Sätzen.

   API:
     await window.ProvaKiDiktatMapping.structure(transkript, opts?)
     window.ProvaKiDiktatMapping.renderChips(containerEl, mappingResult, onSave)
═════════════════════════════════════════════════════════════════════ */
(function(global){
  'use strict';

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function _injectStyle(){
    if (document.getElementById('prova-ki-diktat-style')) return;
    var css = ''
      + '.pkd-chips{display:flex;flex-direction:column;gap:12px;}'
      + '.pkd-chip{background:var(--surface,#1c2130);border:1px solid var(--border,rgba(255,255,255,.06));border-radius:10px;padding:12px 14px;}'
      + '.pkd-chip-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}'
      + '.pkd-chip-paragraph{font-size:13px;font-weight:700;color:var(--accent,#4f8ef7);}'
      + '.pkd-chip-paragraph-select{padding:3px 7px;font-size:12px;font-weight:700;color:#fff;background:var(--accent,#4f8ef7);border:none;border-radius:6px;cursor:pointer;font-family:inherit;}'
      + '.pkd-chip-confidence{font-size:10px;color:var(--text3,#4d5568);}'
      + '.pkd-chip-text{font-size:13px;line-height:1.55;color:var(--text2,#8b93ab);background:var(--bg3,#161a22);border:1px solid var(--border,rgba(255,255,255,.06));border-radius:8px;padding:10px 12px;min-height:60px;outline:none;}'
      + '.pkd-chip-text[contenteditable="true"]:focus{border-color:var(--accent,#4f8ef7);color:var(--text,#eaecf4);}'
      + '.pkd-chip-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:10px;}'
      + '.pkd-chip-btn{padding:6px 14px;font-size:12px;font-weight:600;border-radius:6px;cursor:pointer;font-family:inherit;border:none;}'
      + '.pkd-chip-btn-primary{background:var(--accent,#4f8ef7);color:#fff;}'
      + '.pkd-chip-btn-secondary{background:var(--surface2,#232a3a);border:1px solid var(--border2,rgba(255,255,255,.11));color:var(--text2,#8b93ab);}'
      + '.pkd-chip-alt{margin-top:8px;padding:8px 10px;background:rgba(245,158,11,.08);border-left:3px solid var(--warning,#f59e0b);border-radius:6px;font-size:11px;color:var(--text2,#8b93ab);}'
      + '.pkd-chip-alt strong{color:var(--warning,#f59e0b);}'
      + '.pkd-empty{padding:24px;text-align:center;color:var(--text3,#4d5568);font-style:italic;font-size:13px;}';
    var st = document.createElement('style');
    st.id = 'prova-ki-diktat-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  async function _getToken(){
    try {
      var mod = await import('/lib/supabase-client.js');
      var sb = mod.supabase || (mod.getSupabase && mod.getSupabase());
      if (!sb) return null;
      var { data: { session } } = await sb.auth.getSession();
      return session && session.access_token ? session.access_token : null;
    } catch(_){ return null; }
  }

  async function structure(transkript, opts){
    opts = opts || {};
    if (!transkript || !transkript.trim()) throw new Error('Transkript leer');
    var tok = await _getToken();
    if (!tok) throw new Error('Keine Anmeldung');

    var url = (window.PROVA_CONFIG && window.PROVA_CONFIG.SUPABASE_URL || '').replace(/\/$/, '');
    var res = await fetch(url + '/functions/v1/ki-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
      body: JSON.stringify({
        purpose: 'diktat_paragraph_mapping',
        prompt: transkript,
        context: opts.context || '',
        max_tokens: 2000
      })
    });
    if (!res.ok) {
      var errText = await res.text();
      throw new Error('Mapping-Call fehlgeschlagen: ' + res.status + ' ' + errText.slice(0,200));
    }
    var json = await res.json();
    var text = json.output || json.text || '';
    try {
      text = text.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim();
      var parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Mapping return ist kein Array');
      return parsed;
    } catch(e){
      console.warn('[ProvaKiDiktatMapping] JSON-Parse failed', e, text);
      throw new Error('KI-Output konnte nicht geparsed werden: ' + e.message);
    }
  }

  function renderChips(containerEl, chips, onSave){
    _injectStyle();
    if (!chips || !chips.length) {
      containerEl.innerHTML = '<div class="pkd-empty">Kein KI-Mapping verfuegbar.</div>';
      return;
    }
    var paragraphs = ['§1','§2','§3','§4','§5'];
    containerEl.innerHTML = '<div class="pkd-chips">' + chips.map(function(chip, idx){
      var optionsHtml = paragraphs.map(function(p){
        return '<option value="' + p + '"' + (p === chip.paragraph ? ' selected' : '') + '>' + p + '</option>';
      }).join('');
      var altHtml = '';
      if (chip.alternatives && chip.alternatives.length) {
        altHtml = chip.alternatives.map(function(alt){
          return '<div class="pkd-chip-alt"><strong>Alternativ:</strong> ' + esc(alt.paragraph) + ' (Confidence ' + (alt.confidence||0).toFixed(2) + ')</div>';
        }).join('');
      }
      var confPct = Math.round((Number(chip.confidence)||0) * 100);
      return '<div class="pkd-chip" data-idx="' + idx + '">'
        + '<div class="pkd-chip-head">'
        +   '<select class="pkd-chip-paragraph-select" onchange="this.closest(\'.pkd-chip\').setAttribute(\'data-paragraph\',this.value)">' + optionsHtml + '</select>'
        +   '<span class="pkd-chip-confidence">Confidence: ' + confPct + '%</span>'
        + '</div>'
        + '<div class="pkd-chip-text" contenteditable="true">' + esc(chip.text || '') + '</div>'
        + altHtml
        + '<div class="pkd-chip-actions">'
        +   '<button type="button" class="pkd-chip-btn pkd-chip-btn-secondary" data-action="reject">Verwerfen</button>'
        +   '<button type="button" class="pkd-chip-btn pkd-chip-btn-primary" data-action="accept">Übernehmen →</button>'
        + '</div>'
        + '</div>';
    }).join('') + '</div>';

    containerEl.querySelectorAll('.pkd-chip').forEach(function(chipEl, idx){
      chipEl.setAttribute('data-paragraph', chips[idx].paragraph || '§1');
      chipEl.querySelector('[data-action="accept"]').addEventListener('click', function(){
        var paragraph = chipEl.getAttribute('data-paragraph');
        var text = chipEl.querySelector('.pkd-chip-text').textContent.trim();
        if (typeof onSave === 'function') {
          onSave({ paragraph: paragraph, text: text, original: chips[idx] });
        }
        chipEl.style.opacity = '0.5';
        chipEl.style.pointerEvents = 'none';
        chipEl.querySelector('[data-action="accept"]').textContent = '✓ Uebernommen';
      });
      chipEl.querySelector('[data-action="reject"]').addEventListener('click', function(){
        chipEl.remove();
      });
    });
  }

  global.ProvaKiDiktatMapping = {
    structure: structure,
    renderChips: renderChips
  };
})(typeof window !== 'undefined' ? window : globalThis);
