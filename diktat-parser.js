/* ═══════════════════════════════════════════════════════════════════
   PROVA diktat-parser.js — Phase 2 KI-Assistenz (Session 30 / S33)
   
   Nimmt einen Whisper-transkribierten Ortstermin-Diktat-Text und
   extrahiert strukturierte Felder via KI (gpt-4o-mini).
   
   Absolute Regeln (§ 407a ZPO):
   - Halluzinationsverbot: Nur verwenden was im Diktat steht
   - Konjunktiv II bei Kausalaussagen ("könnte" / "dürfte" / "wäre")
   - Keine erfundenen Normen, Werte oder Zitate
   - SV bleibt Entscheider — KI liefert nur strukturierte Rohdaten
   ═══════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  window.PROVA = window.PROVA || {};

  /* ── DSGVO-Pseudonymisierung vor OpenAI-Transmission ── */
  function pseudonymisieren(text) {
    if (!text) return '';
    var t = String(text);
    // IBAN (DE + international grob)
    t = t.replace(/\b[A-Z]{2}\d{2}[A-Z0-9\s]{10,30}\b/gi, '[IBAN]');
    // E-Mail
    t = t.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
    // Telefon (deutsche Formate)
    t = t.replace(/\b(?:\+49|0)[\s\-/]?\d{2,5}[\s\-/]?\d{2,}[\s\-/]?\d{0,}\b/g, '[TELEFON]');
    // Hausnummern mit PLZ-Ort (leichter Ansatz — wird nicht alles erwischen, aber hilft)
    // Bewusst NICHT aggressiv, damit Adresse im Diktat noch strukturierbar bleibt
    return t;
  }

  /* ── System-Prompt für den Parser ── */
  var SYSTEM_PROMPT = [
    'Du bist Assistent eines ö.b.u.v. Bausachverständigen und strukturierst einen Ortstermin-Diktat-Text.',
    '',
    'ABSOLUTE REGELN:',
    '1. HALLUZINATIONSVERBOT: Übernimm NUR was im Diktat-Text tatsächlich steht. Erfinde niemals Daten.',
    '2. Fehlende Felder bleiben leer ("") — rate nicht und fülle nicht mit Default-Werten.',
    '3. Bei Kausalaussagen zur Schaden-URSACHE (Feld "ursache_hypothese") verwende IMMER Konjunktiv II:',
    '   "könnte", "dürfte", "wäre", "spräche dafür" — niemals "ist", "hat", "wurde verursacht durch".',
    '4. Messwerte exakt übernehmen wie diktiert, Einheiten normalisieren: % (nicht Prozent), °C (nicht Grad Celsius), m² (nicht Quadratmeter), mm/cm/m.',
    '5. Normen-Zitate nur wenn der SV sie im Diktat selbst nennt. Nichts hinzufügen.',
    '6. SV-Entscheidungen (Ursache, Bewertung, Sanierung) sind SV-Eigenleistung — du fasst nur zusammen was der SV sagt.',
    '',
    'AUFGABE: Antworte AUSSCHLIESSLICH mit einem JSON-Objekt, keine Einleitung, keine Erklärung.',
    '',
    'JSON-Schema:',
    '{',
    '  "aktenzeichen": "string (z.B. 2026-042, falls im Text genannt)",',
    '  "objekt_adresse": "string (Straße Hausnr., PLZ Ort, falls genannt)",',
    '  "raum_bereich": "string (z.B. Keller, Dachgeschoss, Küche — der Raum auf den sich der Diktat-Abschnitt bezieht)",',
    '  "befund": "string (was wurde VORGEFUNDEN — rein deskriptiv, mehrere Sätze erlaubt)",',
    '  "messwerte": [',
    '    { "groesse": "string (z.B. Feuchte Holz, Temperatur, Rissbreite)", "wert": "string mit Einheit (z.B. 82 %, 21 °C, 0,4 mm)", "ort": "string (wo gemessen, optional)" }',
    '  ],',
    '  "schadensart": "string (z.B. Schimmelbefall, Wasserschaden, Riss, Feuchte — in Stichwort)",',
    '  "ursache_hypothese": "string im Konjunktiv II (z.B. \'Eine defekte Abdichtung im Sockelbereich könnte ursächlich sein.\') — leer wenn SV keine Hypothese nennt",',
    '  "normen_erwaehnt": ["string, ..."] ,',
    '  "fotos_erwaehnt": number (Anzahl Fotos die der SV zu diesem Abschnitt erwähnt, sonst 0),',
    '  "todo_naechste_schritte": ["string, ..."],',
    '  "warnung": "string — füge einen Hinweis hinzu, falls Diktat unklar oder unvollständig ist, sonst leer"',
    '}'
  ].join('\n');

  /* ── Haupt-API ── */
  PROVA.parseDiktatToStructured = async function(diktatText, options) {
    options = options || {};
    if (!diktatText || !String(diktatText).trim()) {
      throw new Error('Diktat-Text ist leer');
    }

    // DSGVO: pseudonymisieren vor Transmission
    var payloadText = pseudonymisieren(String(diktatText));

    try {
      var res = await fetch('/.netlify/functions/ki-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1200,
          temperature: 0.1, // niedrig für Determinismus / weniger Halluzinationen
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user',   content: 'Diktat-Text:\n\n' + payloadText }
          ]
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      var raw = (data.content && data.content[0] && data.content[0].text) || '';
      if (!raw) throw new Error('Leere KI-Antwort');

      // Code-Fences entfernen falls vorhanden
      raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'').trim();

      var parsed;
      try { parsed = JSON.parse(raw); }
      catch (e) {
        // Fallback: Extraktion des JSON-Blocks aus Text
        var m = raw.match(/\{[\s\S]*\}/);
        if (m) { parsed = JSON.parse(m[0]); }
        else throw new Error('KI-Antwort war kein gültiges JSON: ' + raw.slice(0, 100));
      }

      // Schema-Sanitierung + Defaults
      return {
        aktenzeichen:     String(parsed.aktenzeichen || '').trim(),
        objekt_adresse:   String(parsed.objekt_adresse || '').trim(),
        raum_bereich:     String(parsed.raum_bereich || '').trim(),
        befund:           String(parsed.befund || '').trim(),
        messwerte:        Array.isArray(parsed.messwerte) ? parsed.messwerte.filter(function(m){return m && (m.groesse||m.wert);}) : [],
        schadensart:      String(parsed.schadensart || '').trim(),
        ursache_hypothese: String(parsed.ursache_hypothese || '').trim(),
        normen_erwaehnt:  Array.isArray(parsed.normen_erwaehnt) ? parsed.normen_erwaehnt.filter(Boolean) : [],
        fotos_erwaehnt:   parseInt(parsed.fotos_erwaehnt, 10) || 0,
        todo_naechste_schritte: Array.isArray(parsed.todo_naechste_schritte) ? parsed.todo_naechste_schritte.filter(Boolean) : [],
        warnung:          String(parsed.warnung || '').trim(),
        _meta: {
          parser_version: 'v1-session30',
          timestamp: new Date().toISOString(),
          input_length: diktatText.length
        }
      };
    } catch (e) {
      throw new Error('Diktat-Parsing fehlgeschlagen: ' + e.message);
    }
  };

  /* ── UI-Helper: zeigt strukturiertes Ergebnis als Review-Panel ── */
  PROVA.renderDiktatReview = function(strukturiert, containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!strukturiert) { el.innerHTML = ''; return; }

    var s = strukturiert;
    function row(label, value, monospace) {
      if (!value) return '';
      return '<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--border,rgba(255,255,255,.06));">'
        + '<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3,#6b7280);min-width:120px;flex-shrink:0;">' + esc(label) + '</span>'
        + '<span style="font-size:13px;color:var(--text,#eaecf4);flex:1;' + (monospace ? 'font-family:monospace;' : '') + '">' + esc(value) + '</span>'
        + '</div>';
    }
    function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

    var html = ''
      + '<div style="background:var(--bg3,#181b24);border:1px solid rgba(79,142,247,.2);border-radius:10px;padding:14px 16px;">'
      +   '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">'
      +     '<span style="font-size:14px;">✨</span>'
      +     '<span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--accent,#4f8ef7);">KI-strukturiert — Bitte prüfen</span>'
      +   '</div>';

    if (s.warnung) {
      html += '<div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:6px;padding:8px 10px;margin-bottom:10px;font-size:12px;color:#f59e0b;">'
        + '⚠ ' + esc(s.warnung) + '</div>';
    }

    html += row('Aktenzeichen', s.aktenzeichen, true)
      + row('Objekt-Adresse', s.objekt_adresse)
      + row('Raum/Bereich', s.raum_bereich)
      + row('Schadensart', s.schadensart)
      + row('Befund', s.befund);

    if (s.messwerte && s.messwerte.length) {
      html += '<div style="padding:7px 0;border-bottom:1px solid var(--border,rgba(255,255,255,.06));">'
        + '<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3,#6b7280);display:block;margin-bottom:4px;">Messwerte</span>';
      s.messwerte.forEach(function(m){
        html += '<div style="font-size:12px;margin-left:4px;padding:2px 0;">• ' + esc(m.groesse) + ': <strong>' + esc(m.wert) + '</strong>'
          + (m.ort ? ' <span style="color:var(--text3);">(' + esc(m.ort) + ')</span>' : '')
          + '</div>';
      });
      html += '</div>';
    }

    if (s.ursache_hypothese) {
      html += '<div style="padding:7px 0;border-bottom:1px solid var(--border,rgba(255,255,255,.06));">'
        + '<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3,#6b7280);display:block;margin-bottom:4px;">Ursachen-Hypothese (Konjunktiv II)</span>'
        + '<span style="font-size:13px;color:var(--text,#eaecf4);font-style:italic;">' + esc(s.ursache_hypothese) + '</span>'
        + '<div style="font-size:10px;color:var(--text3);margin-top:4px;">⚖ § 407a ZPO: Finale Ursachen-Bewertung bleibt SV-Entscheidung.</div>'
        + '</div>';
    }

    if (s.normen_erwaehnt && s.normen_erwaehnt.length) {
      html += row('Normen', s.normen_erwaehnt.join(', '));
    }

    if (s.todo_naechste_schritte && s.todo_naechste_schritte.length) {
      html += '<div style="padding:7px 0;">'
        + '<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3,#6b7280);display:block;margin-bottom:4px;">Nächste Schritte</span>';
      s.todo_naechste_schritte.forEach(function(t){
        html += '<div style="font-size:12px;margin-left:4px;padding:2px 0;">☐ ' + esc(t) + '</div>';
      });
      html += '</div>';
    }

    html += '</div>';
    el.innerHTML = html;
  };

})();
