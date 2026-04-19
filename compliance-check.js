/* ═══════════════════════════════════════════════════════════════════
   PROVA compliance-check.js — Phase 6 Qualitätsprüfung (S34)

   Kombiniert zwei Checks, die vor Freigabe laufen sollten:
   
   1. § 407a ZPO-Compliance: Sind Pflicht-Hinweise im Gutachten-Text?
      (Unabhängigkeitserklärung, Anzeigepflicht, Fachkunde-Nachweis,
      Weisungsungebundenheit)
   
   2. Konsistenz-Check: §4 Befund ↔ §6 Fachurteil
      - KI prüft ob die im §6 formulierte Ursache zu §4 passt
      - Markiert unbelegte Kausalaussagen
      - Warnt bei Indikativ statt Konjunktiv II
   
   Alle Prüfungen sind HINWEISE — SV entscheidet final (§ 407a).
   Halluzinationsverbot: KI zitiert nur aus den gegebenen Textstellen.
   ═══════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  window.PROVA = window.PROVA || {};

  /* ──────────────────────────────────────────────
     1. § 407a ZPO-Compliance-Check (regex-basiert)
     Schnell, ohne KI-Call, deterministisch.
  ────────────────────────────────────────────── */

  // Signalwörter für die 4 Pflichthinweise nach § 407a ZPO
  var COMPLIANCE_SIGNALE = [
    {
      id: 'unabhaengigkeit',
      label: 'Unabhängigkeitserklärung',
      hinweis: '§ 407a Abs. 2 ZPO — SV muss anzeigen wenn Gründe gegen Unparteilichkeit sprechen. Erklärung oder Hinweis auf Unabhängigkeit empfohlen.',
      patterns: [
        /unabh[äa]ngig(?:keit)?/i,
        /unparteili(?:ch|sch)/i,
        /weder.*noch.*verbunden/i,
        /keine.*beziehung/i,
        /neutralit[äa]t/i
      ]
    },
    {
      id: 'fachkunde',
      label: 'Fachkunde / Qualifikation',
      hinweis: '§ 407a Abs. 1 ZPO — SV muss prüfen ob Auftrag in sein Fachgebiet fällt. Hinweis auf öffentliche Bestellung & Vereidigung empfohlen.',
      patterns: [
        /öffentlich[\s\-]best[ae]llt/i,
        /vereidig[tu]/i,
        /ö\.?b\.?u\.?v/i,
        /sachkunde/i,
        /fachkunde/i,
        /fachgebiet/i,
        /bestellungsgebiet/i
      ]
    },
    {
      id: 'weisungsungebunden',
      label: 'Weisungsungebundenheit',
      hinweis: 'Die Gutachtenerstellung erfolgt weisungsungebunden — typischer Formulierungs-Baustein in Gerichtsgutachten.',
      patterns: [
        /weisungs(?:un)?gebunden/i,
        /ohne\s+weisung/i,
        /frei\s+von\s+weisungen/i,
        /eigenverantwortlich/i
      ]
    },
    {
      id: 'anzeigepflicht',
      label: 'Anzeigepflicht bei Überschreitung',
      hinweis: '§ 407a Abs. 3 ZPO — wenn Kostenrahmen überschritten wird, muss SV das dem Gericht unverzüglich anzeigen. Hinweis empfohlen in Kostenkapitel.',
      patterns: [
        /kostenüberschreitung/i,
        /kostenrahmen/i,
        /unverzüglich\s+anzeigen/i,
        /\bhinweis.*kosten/i
      ]
    }
  ];

  // Konjunktiv-II Indikatoren (für das Fachurteil wichtig)
  var KONJUNKTIV_II_WOERTER = [
    'könnte', 'könnten', 'dürfte', 'dürften', 'wäre', 'wären',
    'hätte', 'hätten', 'müsste', 'müssten', 'würde', 'würden',
    'sollte', 'sollten', 'spräche', 'sprächen', 'ließe', 'ließen'
  ];

  // Problematische Indikativ-Formulierungen in Ursachenzusammenhängen
  var KAUSAL_INDIKATIV_PATTERNS = [
    { pat: /\bverursacht durch\b/i,      hinweis: '"verursacht durch" ist Tatsachenbehauptung — Konjunktiv II erwägen ("könnte verursacht sein durch")' },
    { pat: /\bist\s+die\s+ursache\b/i,   hinweis: '"ist die Ursache" ist Tatsachenbehauptung — "könnte Ursache sein" oder "spricht für" formulieren' },
    { pat: /\beindeutig\b/i,             hinweis: '"eindeutig" — wirklich eindeutig? Nur verwenden wenn durch Messung/Norm belegt' },
    { pat: /\bzweifelsfrei\b/i,          hinweis: '"zweifelsfrei" — selten gerechtfertigt, Konjunktiv II sicherer' },
    { pat: /\bmuss\s+(?:als\s+ursache|zwingend)\b/i, hinweis: '"muss als Ursache" — sehr starke Aussage, prüfen ob Belege ausreichen' }
  ];

  /**
   * Prüft einen Gutachten-Text auf §407a-Pflichthinweise + Konjunktiv-Nutzung
   * @param {string} text - Volltext des Gutachtens
   * @param {object} options - { checkKonjunktiv: true/false, istGerichtsgutachten: true/false }
   * @returns {object} { score, findings:[], warnings:[], ok:bool }
   */
  PROVA.complianceCheck = function(text, options) {
    options = options || {};
    var istGerichts = options.istGerichtsgutachten !== false;
    var text_lc = String(text || '');

    var findings = [];
    var warnings = [];

    // 1. §407a Pflichthinweise prüfen — nur bei Gerichtsgutachten
    if (istGerichts) {
      COMPLIANCE_SIGNALE.forEach(function(sig) {
        var gefunden = sig.patterns.some(function(p) { return p.test(text_lc); });
        findings.push({
          id: sig.id,
          label: sig.label,
          status: gefunden ? 'ok' : 'warn',
          hinweis: gefunden ? 'Gefunden.' : sig.hinweis
        });
      });
    }

    // 2. Konjunktiv II im Kausal-Kontext prüfen
    if (options.checkKonjunktiv !== false) {
      KAUSAL_INDIKATIV_PATTERNS.forEach(function(kp) {
        var matches = text_lc.match(kp.pat);
        if (matches) {
          warnings.push({
            typ: 'konjunktiv',
            gefundene_stelle: matches[0],
            hinweis: kp.hinweis
          });
        }
      });

      // Gegenprobe: kommen Konjunktiv-II-Formen überhaupt vor?
      var konjCount = 0;
      KONJUNKTIV_II_WOERTER.forEach(function(w) {
        var re = new RegExp('\\b' + w + '\\b', 'gi');
        var m = text_lc.match(re);
        if (m) konjCount += m.length;
      });
      if (konjCount === 0 && text_lc.length > 500) {
        warnings.push({
          typ: 'kein_konjunktiv',
          gefundene_stelle: '',
          hinweis: 'Text enthält keine Konjunktiv-II-Formen. Kausal-Aussagen bei Schaden-Ursachen sollten im Konjunktiv II formuliert sein.'
        });
      }
    }

    // Score berechnen: 1.0 = alles ok
    var anzPflicht = findings.filter(function(f){return f.status==='warn';}).length;
    var anzWarn    = warnings.length;
    var score = Math.max(0, 1 - (anzPflicht * 0.15 + anzWarn * 0.05));

    return {
      score: Math.round(score * 100) / 100,
      findings: findings,
      warnings: warnings,
      ok: anzPflicht === 0 && anzWarn <= 1,
      zusammenfassung: anzPflicht + ' Pflicht-Hinweise offen · ' + anzWarn + ' Konjunktiv-Warnungen'
    };
  };

  /* ──────────────────────────────────────────────
     2. KI-basierter Konsistenz-Check §4 ↔ §6
     Nutzt ki-proxy — strikter Halluzinations-Prompt.
  ────────────────────────────────────────────── */

  var KONSISTENZ_SYSTEM_PROMPT = [
    'Du bist Qualitätsprüfer für Bausachverständigen-Gutachten. Deine Aufgabe ist ein Konsistenz-Check.',
    '',
    'ABSOLUTE REGELN:',
    '1. Du zitierst AUSSCHLIESSLICH aus den zwei gegebenen Textstellen (§ 4 und § 6) — keine Ergänzung von Fakten aus deinem Weltwissen.',
    '2. Du erfindest keine Inkonsistenzen. Wenn kein Problem sichtbar ist, sage das.',
    '3. Du achtest besonders auf:',
    '   a) Im § 6 formulierte Ursache — ist sie durch § 4 Befund belegt?',
    '   b) Normen/Grenzwerte im § 6 — werden sie in § 4 als überschritten/unterschritten gemessen?',
    '   c) Kausalaussagen im Indikativ — sollten Konjunktiv II sein',
    '   d) Widersprüche zwischen Zahlen/Angaben in § 4 und § 6',
    '4. Du gibst KEINE Empfehlung was geändert werden soll — nur Hinweis auf das Problem. SV entscheidet.',
    '',
    'Antworte als JSON-Objekt:',
    '{',
    '  "konsistent": boolean,',
    '  "issues": [',
    '    { "typ": "ursache_unbelegt|norm_widerspruch|indikativ_statt_konjunktiv|zahlen_widerspruch|sonstiges",',
    '      "schwere": "info|warn|error",',
    '      "stelle_p4": "Zitat aus § 4 (kurz)",',
    '      "stelle_p6": "Zitat aus § 6 (kurz)",',
    '      "hinweis": "prägnante Beschreibung (1 Satz)" }',
    '  ],',
    '  "zusammenfassung": "string (1-2 Sätze)"',
    '}',
    'Keine Einleitung, keine Erklärung — nur das JSON.'
  ].join('\n');

  /**
   * KI-basierter Konsistenz-Check zwischen §4 und §6 eines Gutachtens.
   * @param {string} text_p4 - § 4 Befund-Text
   * @param {string} text_p6 - § 6 Fachurteil-Text
   * @returns {Promise<object>} {konsistent, issues:[], zusammenfassung}
   */
  PROVA.konsistenzCheck = async function(text_p4, text_p6) {
    if (!text_p4 || !text_p6) {
      throw new Error('§ 4 und § 6 werden beide benötigt');
    }
    var userMsg = '§ 4 Befund:\n\n' + String(text_p4) + '\n\n─────\n\n§ 6 Fachurteil:\n\n' + String(text_p6);

    try {
      var res = await fetch('/.netlify/functions/ki-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1500,
          temperature: 0.1,
          messages: [
            { role: 'system', content: KONSISTENZ_SYSTEM_PROMPT },
            { role: 'user',   content: userMsg }
          ]
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      var raw = (data.content && data.content[0] && data.content[0].text) || '';
      raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'').trim();
      var parsed;
      try { parsed = JSON.parse(raw); }
      catch (e) {
        var m = raw.match(/\{[\s\S]*\}/);
        if (!m) throw new Error('KI-Antwort nicht als JSON lesbar');
        parsed = JSON.parse(m[0]);
      }
      return {
        konsistent:     !!parsed.konsistent,
        issues:         Array.isArray(parsed.issues) ? parsed.issues : [],
        zusammenfassung: String(parsed.zusammenfassung || '')
      };
    } catch (e) {
      throw new Error('Konsistenz-Check fehlgeschlagen: ' + e.message);
    }
  };

  /* ──────────────────────────────────────────────
     3. UI-Helper: Zusammengeführtes Review-Panel
  ────────────────────────────────────────────── */
  PROVA.renderComplianceReview = function(result, containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!result) { el.innerHTML = ''; return; }

    function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

    var scorePct = Math.round((result.score || 0) * 100);
    var scoreCol = scorePct >= 90 ? '#10b981' : scorePct >= 70 ? '#f59e0b' : '#ef4444';

    var html = '<div style="background:var(--bg3,#181b24);border:1px solid ' + scoreCol + '33;border-radius:10px;padding:14px 16px;">'
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">'
      +   '<span style="font-size:18px;font-weight:800;color:' + scoreCol + ';">' + scorePct + ' %</span>'
      +   '<span style="font-size:12px;color:var(--text3,#6b7280);">§ 407a-Compliance</span>'
      +   '<span style="font-size:11px;color:var(--text3);margin-left:auto;">' + esc(result.zusammenfassung) + '</span>'
      + '</div>';

    // Findings (Pflichthinweise)
    if (result.findings && result.findings.length) {
      html += '<div style="margin-bottom:10px;">';
      result.findings.forEach(function(f) {
        var ico = f.status === 'ok' ? '✓' : '⚠';
        var col = f.status === 'ok' ? '#10b981' : '#f59e0b';
        html += '<div style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;font-size:12px;">'
          + '<span style="color:' + col + ';font-weight:700;flex-shrink:0;">' + ico + '</span>'
          + '<div><strong>' + esc(f.label) + '</strong>'
          + (f.status !== 'ok' ? '<div style="color:var(--text3);font-size:11px;margin-top:2px;">' + esc(f.hinweis) + '</div>' : '')
          + '</div></div>';
      });
      html += '</div>';
    }

    // Warnings (Konjunktiv etc.)
    if (result.warnings && result.warnings.length) {
      html += '<div style="border-top:1px solid var(--border,rgba(255,255,255,.06));padding-top:10px;">'
        + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3,#6b7280);margin-bottom:6px;">Sprachliche Hinweise</div>';
      result.warnings.forEach(function(w) {
        html += '<div style="font-size:11px;color:var(--text2,#aab4cb);padding:3px 0;">'
          + (w.gefundene_stelle ? '<span style="font-family:monospace;background:rgba(245,158,11,.1);padding:1px 4px;border-radius:3px;color:#f59e0b;">' + esc(w.gefundene_stelle) + '</span> ' : '')
          + esc(w.hinweis)
          + '</div>';
      });
      html += '</div>';
    }

    html += '<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);font-size:10px;color:var(--text3);font-style:italic;">'
      + '§ 407a ZPO: Diese Hinweise ersetzen keine Prüfung durch den Sachverständigen. Alle fachlichen Entscheidungen bleiben SV-Eigenleistung.'
      + '</div>';
    html += '</div>';

    el.innerHTML = html;
  };

})();
