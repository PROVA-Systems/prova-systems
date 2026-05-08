/**
 * PROVA — Diktat-Strukturierung-Frontend (MEGA³¹ D1)
 *
 * Bridge zwischen Whisper-Output und §1-§5-Befunde-Panel.
 *
 * Public API:
 *   ProvaDiktatStruktur.run() — async: liest Diktat aus Storage/localStorage, ruft Lambda, fillt befunde-panel
 */
'use strict';

(function () {
  function setStatus(text) {
    const el = document.getElementById('diktat-strukt-status');
    if (el) el.textContent = text || '';
  }

  function fillBefunde(data) {
    const map = {
      'befunde-auftrag': data.paragraf_1,
      'befunde-sachverhalt': data.paragraf_2,
      'befunde-anknuepfung': data.paragraf_3,
      'befunde-befunde': data.paragraf_4,
      'befunde-fragen': data.paragraf_5
    };
    Object.keys(map).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = map[id] || '—';
    });
  }

  async function run() {
    // Diktat-Quelle: aus localStorage 'prova_diktat_transkript' (set durch whisper-diktat.js)
    let transkript = '';
    try { transkript = localStorage.getItem('prova_diktat_transkript') || ''; } catch (e) {}

    if (!transkript || transkript.length < 30) {
      setStatus('Kein Diktat-Transkript gefunden. Erst Diktat aufnehmen.');
      return;
    }

    setStatus('⏳ Strukturierung läuft (Modell rechnet)…');

    try {
      const fetcher = window.provaFetch || window.fetch.bind(window);
      const auftragId = localStorage.getItem('prova_current_auftrag_id') || null;
      const audioId = localStorage.getItem('prova_diktat_audio_id') || null;
      const res = await fetcher('/.netlify/functions/ki-diktat-strukturierung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transkript: transkript,
          auftrag_id: auftragId,
          audio_id: audioId
        })
      });
      if (!res.ok) {
        const err = await res.json();
        setStatus('Fehler: ' + (err.error || res.status));
        return;
      }
      const data = await res.json();
      fillBefunde(data);
      setStatus('✓ §1-§5 strukturiert (Modell: ' + (data.modell || '?') + ', Kosten: ' + (data.kosten_eur || 0).toFixed(4) + '€)');
    } catch (e) {
      setStatus('Fehler: ' + e.message);
    }
  }

  window.ProvaDiktatStruktur = { run, fillBefunde };

  if (typeof module !== 'undefined' && module.exports) module.exports = window.ProvaDiktatStruktur;
}());
