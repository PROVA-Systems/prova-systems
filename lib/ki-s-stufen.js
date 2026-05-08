/**
 * PROVA — KI-S-Stufen-Toggle (MEGA³¹ A3)
 *
 * Opt-in S1/S2/S3-Buttons im §6 Fachurteil-Editor.
 * Vision-Master Regel 13: KI-Hilfen sind opt-in, nicht default.
 *
 * Public API:
 *   ProvaSStufen.toggle(stufe)  — 's1' | 's2' | 's3'
 *
 * Backend: ki-proxy.js mit Action-Mapping
 *   S1 → 'rechtschreibung_s1' (gpt-5.4-mini)
 *   S2 → 'absatz_s2' (gpt-5.4)
 *   S3 → 'fachsprache_s3' (gpt-5.4)
 *
 * Pseudonymisierung VOR Call (Regel 17, ki-proxy.js handhabt das server-side).
 * KI-Output non-copyable (Box mit user-select:none).
 */
'use strict';

(function () {
  const ACTIONS = {
    s1: { action: 'rechtschreibung_s1', label: 'S1 Sprache', model_purpose: 'freitext' },
    s2: { action: 'absatz_s2',          label: 'S2 Struktur', model_purpose: 'assist_inline' },
    s3: { action: 'fachsprache_s3',     label: 'S3 Fachsprache', model_purpose: 'assist_inline' }
  };

  let activeBtn = null;

  function setActiveButton(stufe) {
    ['s1', 's2', 's3'].forEach(s => {
      const btn = document.getElementById('ki-' + s + '-btn');
      if (!btn) return;
      const active = (s === stufe);
      btn.classList.toggle('active', active);
      btn.style.background = active ? 'var(--accent)' : 'var(--bg2)';
      btn.style.color = active ? '#fff' : 'var(--text2)';
    });
    activeBtn = stufe;
  }

  function setStatus(text) {
    const el = document.getElementById('ki-stufen-status');
    if (el) el.textContent = text || '';
  }

  function showOutput(content) {
    const box = document.getElementById('ki-output-box');
    const target = document.getElementById('ki-output-content');
    if (box && target) {
      target.textContent = content;
      box.style.display = 'block';
    }
  }

  function hideOutput() {
    const box = document.getElementById('ki-output-box');
    if (box) box.style.display = 'none';
  }

  async function callKi(stufe) {
    const cfg = ACTIONS[stufe];
    if (!cfg) return;
    const ta = document.getElementById('svTextA');
    const text = (ta && ta.value || '').trim();
    if (text.length < 10) {
      setStatus('Mindestens 10 Zeichen Text für ' + cfg.label + ' benötigt.');
      return;
    }
    setStatus('⏳ ' + cfg.label + ' läuft…');
    try {
      const fetcher = window.provaFetch || window.fetch.bind(window);
      // ki-proxy.js erkennt action im body und routet zu MODELS[action]
      const res = await fetcher('/.netlify/functions/ki-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: cfg.action,
          text: text,
          purpose: cfg.model_purpose,
          context: 'fachurteil_s_stufe'
        })
      });
      if (!res.ok) {
        setStatus('Fehler: HTTP ' + res.status);
        return;
      }
      const data = await res.json();
      const output = data.output || data.text || data.result || JSON.stringify(data);
      showOutput(output);
      setStatus('✓ ' + cfg.label + ' fertig');
    } catch (e) {
      setStatus('Fehler: ' + e.message);
    }
  }

  function toggle(stufe) {
    if (!ACTIONS[stufe]) return;
    if (activeBtn === stufe) {
      // Toggle off
      setActiveButton(null);
      hideOutput();
      setStatus('');
      return;
    }
    setActiveButton(stufe);
    callKi(stufe);
  }

  window.ProvaSStufen = {
    toggle: toggle,
    ACTIONS: ACTIONS,
    _internals: { setActiveButton, callKi, showOutput, hideOutput }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = window.ProvaSStufen;
}());
