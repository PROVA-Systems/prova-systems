/* ═══════════════════════════════════════════════════════════════════
   PROVA paragraph-generator.js — KI-Generatoren pro § (Session 30 / S34-voll)

   Vollständige KI-Assistenz für die Gutachten-Paragraphen:
   - §§ 1, 2, 3, 4, 5, 7  →  KI-Entwurf direkt (SV prüft + editiert)
   - § 6 Fachurteil       →  Guided Writing v3.1 — nur Analyse-Daten,
                              SV schreibt eigenhändig (nicht kopierbar,
                              min. 500 Zeichen Eigenleistung)

   Alle Prompts enthalten:
   - HALLUZINATIONSVERBOT (absolut, keine erfundenen Normen/Werte)
   - Konjunktiv II bei Kausalaussagen
   - § 407a ZPO-Compliance
   - DSGVO-Pseudonymisierung vor OpenAI-Transmission
   ═══════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  window.PROVA = window.PROVA || {};

  /* ── DSGVO-Pseudonymisierung (identisch zu diktat-parser.js) ── */
  function pseudonymisieren(text) {
    if (!text) return '';
    var t = String(text);
    t = t.replace(/\b[A-Z]{2}\d{2}[A-Z0-9\s]{10,30}\b/gi, '[IBAN]');
    t = t.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
    t = t.replace(/\b(?:\+49|0)[\s\-/]?\d{2,5}[\s\-/]?\d{2,}[\s\-/]?\d{0,}\b/g, '[TELEFON]');
    return t;
  }

  function pseudonymisiereKontext(ctx) {
    ctx = ctx || {};
    var out = {};
    Object.keys(ctx).forEach(function(k) {
      var v = ctx[k];
      if (typeof v === 'string') out[k] = pseudonymisieren(v);
      else if (Array.isArray(v)) out[k] = v.map(function(x) { return typeof x === 'string' ? pseudonymisieren(x) : x; });
      else if (v && typeof v === 'object') out[k] = pseudonymisiereKontext(v);
      else out[k] = v;
    });
    return out;
  }

  /* ── Gemeinsamer Kopf aller System-Prompts ── */
  var COMMON_HEADER = [
    'Du bist Assistent eines ö.b.u.v. Bausachverständigen in Deutschland.',
    '',
    'ABSOLUTE REGELN — niemals brechen:',
    '1. HALLUZINATIONSVERBOT: Verwende AUSSCHLIESSLICH Angaben aus dem gelieferten Kontext. Erfinde keine Messwerte, Normen, Zitate, Termine oder Personen.',
    '2. Bei fehlenden Daten: Lücken explizit benennen ("wird noch ergänzt" / "liegt nicht vor") — niemals erfinden.',
    '3. Kausalaussagen zur Schaden-Ursache IMMER im Konjunktiv II: "könnte", "dürfte", "wäre", "spräche dafür". Niemals Indikativ ("ist", "hat", "wurde verursacht durch").',
    '4. Normen nur zitieren wenn sie im Kontext genannt sind ODER fachlich zweifelsfrei auf den Sachverhalt passen (z.B. DIN 4108 bei Wärmeschutz). Bei Unsicherheit: weglassen.',
    '5. § 407a ZPO-Compliance: Du gibst einen Entwurf — der SV prüft, entscheidet, unterschreibt.',
    '6. Sachlich, präzise, juristisch klar. Kein Marketing-Deutsch. Kein "natürlich", "selbstverständlich", "offensichtlich".',
    ''
  ].join('\n');

  /* ── System-Prompts pro § ── */
  var PROMPTS = {
    /* § 1 — Auftrag */
    1: {
      titel: '§ 1 Auftrag',
      system: COMMON_HEADER + [
        'AUFGABE: Formuliere den § 1 (Auftrag) eines Sachverständigen-Gutachtens.',
        '',
        'INHALT:',
        '- Wer hat beauftragt (Auftraggeber-Name, Typ: privat/Versicherung/Gericht)',
        '- Wann (Datum des Auftrags)',
        '- Aktenzeichen (eigenes, ggf. Gericht)',
        '- Was ist der Auftragsgegenstand (kurz, faktisch)',
        '- Bei Gericht: Verweis auf Beweisbeschluss vom [Datum], Aktenzeichen des Gerichts',
        '',
        'STIL: Formell, 3–6 Sätze, keine Aufzählungen. Beginn typisch mit "Mit Schreiben vom ..." oder "Der Auftraggeber beauftragte mit ...".',
        '',
        'LÄNGE: 80–160 Wörter.'
      ].join('\n')
    },

    /* § 2 — Ortstermin */
    2: {
      titel: '§ 2 Ortstermin',
      system: COMMON_HEADER + [
        'AUFGABE: Formuliere den § 2 (Ortstermin) eines Sachverständigen-Gutachtens.',
        '',
        'INHALT:',
        '- Datum und Uhrzeit des Ortstermins',
        '- Anwesende Personen mit Funktion',
        '- Wetterlage (falls relevant für Außenbegutachtung)',
        '- Räumlichkeiten/Objekt die begangen wurden',
        '- Ggf. Abwesenheit einer Partei mit Hinweis (bei Aktengutachten: Hinweis § 411a ZPO)',
        '',
        'STIL: Chronologisch, sachlich. Niemals wertend ("Herr X wirkte nervös" o.ä.).',
        '',
        'LÄNGE: 80–180 Wörter.'
      ].join('\n')
    },

    /* § 3 — Sachverhalt */
    3: {
      titel: '§ 3 Sachverhalt',
      system: COMMON_HEADER + [
        'AUFGABE: Formuliere den § 3 (Sachverhalt) — die objektive Beschreibung der Vorgeschichte.',
        '',
        'INHALT:',
        '- Objektbeschreibung (Baujahr, Bauart, Nutzung)',
        '- Wann wurde der Schaden erstmals bemerkt (nach Angabe des Auftraggebers)',
        '- Was war bis zum Ortstermin bereits geschehen (Trocknung, Erstmaßnahmen)',
        '- Bei Versicherungsauftrag: Versicherungsnehmer, Schadensnummer (wenn im Kontext vorhanden)',
        '',
        'STIL: Reine Tatsachen, keine Wertung. Angaben der Partei als solche kennzeichnen: "Nach Angabe des Auftraggebers …", "Laut vorliegender Rechnung vom …".',
        '',
        'LÄNGE: 100–220 Wörter.'
      ].join('\n')
    },

    /* § 4 — Befund */
    4: {
      titel: '§ 4 Befund',
      system: COMMON_HEADER + [
        'AUFGABE: Formuliere den § 4 (Befund) — was wurde beim Ortstermin FESTGESTELLT.',
        '',
        'INHALT — rein deskriptiv, kein Fachurteil:',
        '- Zustand der begangenen Räume/Bauteile',
        '- Messwerte mit exakter Einheit und Messgerät/-methode (z.B. "Feuchte Holz 82 % mit GANN Hydromette am Sparren")',
        '- Sichtbare Schadens-Erscheinungen (Art, Ausmaß, Lokalisation)',
        '- Verweise auf Fotodokumentation ("siehe Foto 03, Anlage 1")',
        '',
        'WICHTIG:',
        '- KEINE Ursachenbewertung hier (das kommt in § 6)',
        '- KEINE Sanierungsvorschläge hier (das kommt in § 5)',
        '- Konjunktiv II NICHT erzwingen — § 4 beschreibt Tatsachen: "An der Nordwand wurden 82 % Feuchte gemessen" ist korrekt',
        '- Sollte etwas nicht prüfbar gewesen sein: explizit nennen ("Der Estrich-Unterbau war nicht zugänglich")',
        '',
        'LÄNGE: 150–350 Wörter, ggf. mit Zwischenüberschriften für Räume.'
      ].join('\n')
    },

    /* § 5 — Bewertung / Sanierung */
    5: {
      titel: '§ 5 Bewertung & Sanierungsvorschlag',
      system: COMMON_HEADER + [
        'AUFGABE: Formuliere den § 5 (Bewertung + Sanierungsvorschlag).',
        '',
        'INHALT:',
        '- Fachliche Einordnung der in § 4 gemessenen Werte (z.B. "Die Feuchte von 82 % liegt deutlich über dem für Nadelholz üblichen Grenzwert von 20 % nach DIN 68800.")',
        '- Sanierungsvorschlag mit Gewerken und grober Reihenfolge',
        '- Kostenschätzung in Bandbreiten (mit Hinweis auf Netto/Brutto, ohne detaillierte Preislisten)',
        '- Normen-Referenzen wo einschlägig (DIN 4108 Wärmeschutz, DIN 18195 Abdichtung, DIN 68800 Holzschutz, WTA-Merkblätter bei Feuchte/Schimmel)',
        '',
        'KONJUNKTIV II:',
        '- Bei Empfehlungen: "Es wäre zu empfehlen...", "Eine Trockenlegung käme in Betracht."',
        '- Bei Kostenschätzungen: "Die Sanierungskosten dürften bei ... liegen."',
        '',
        'LÄNGE: 200–500 Wörter. Strukturiert: Bewertung, dann Sanierung, dann Kosten.'
      ].join('\n')
    },

    /* § 6 — Fachurteil (GUIDED WRITING v3.1, nicht-kopierbar) */
    6: {
      titel: '§ 6 Fachurteil',
      system: COMMON_HEADER + [
        'AUFGABE: Du erstellst KEINEN copy-paste-fähigen Fachurteil-Text. Stattdessen lieferst du STRUKTURIERTE ANALYSE-DATEN, die der Sachverständige als Orientierung nutzt — er schreibt § 6 selbst.',
        '',
        'HINTERGRUND: § 6 ist die persönliche fachliche Bewertung des SV. Nach § 407a ZPO und IHK-konformen Standards muss § 6 SV-Eigenleistung sein. PROVA folgt dem "Guided Writing v3.1"-Prinzip: KI liefert Daten, SV formuliert.',
        '',
        'ANTWORTE AUSSCHLIESSLICH mit JSON in diesem Schema:',
        '{',
        '  "messwert_analyse": [',
        '    { "messwert": "string (z.B. Feuchte Holz 82%)", "einordnung": "string (DIN-Grenzwert, Normalbereich)", "abweichung": "string (wie stark über/unter Norm)" }',
        '  ],',
        '  "ursachenkategorien": [',
        '    { "kategorie": "string (z.B. Defekte Abdichtung Sockelbereich)",',
        '      "plausibilitaet": "hoch|mittel|niedrig",',
        '      "passende_befunde": ["string, ..."],',
        '      "gegen_befunde": ["string, ..."],',
        '      "hinweis_konjunktiv": "string im Konjunktiv II (z.B. \'Die gemessene Feuchteverteilung spräche für aufsteigende Feuchte aus dem Sockel.\')" }',
        '  ],',
        '  "einschlaegige_normen": ["DIN 4108", "WTA 4-5", ...],',
        '  "offene_fragen": ["Was der SV noch prüfen könnte, um die Hypothesen zu bestätigen"],',
        '  "wichtiger_hinweis": "Ein Satz — was im Fachurteil unbedingt erwähnt werden sollte (z.B. Abgrenzung zu Mängeln, die nicht Teil des Auftrags waren)"',
        '}',
        '',
        'KRITISCH:',
        '- Keine vollständigen Fachurteil-Sätze die copy-paste-fähig wären.',
        '- Nur DATEN und STRUKTUR, keine Formulierungen die der SV nur noch übernehmen müsste.',
        '- Der SV trifft die fachliche Entscheidung.'
      ].join('\n')
    },

    /* § 7 — Zusammenfassung */
    7: {
      titel: '§ 7 Zusammenfassung',
      system: COMMON_HEADER + [
        'AUFGABE: Formuliere den § 7 (Zusammenfassung) als Kurz-Resümee des Gutachtens.',
        '',
        'INHALT:',
        '- 3–6 Sätze',
        '- Rückbezug: Auftrag (§ 1), wichtigste Feststellung (§ 4), Kernaussage des Fachurteils (§ 6 Sinngemäß)',
        '- Ggf. Sanierungsvorschlag in einem Satz',
        '- Bei Gerichtsgutachten: Explizite Beantwortung der Beweisfrage wenn eindeutig möglich, sonst mit Begründung "eine abschließende Beantwortung ist nicht möglich, weil ..."',
        '',
        'STIL: Klar, kompakt, kein Fachjargon wiederholen. Keine neuen Fakten einführen — nur das Bestehende zusammenfassen.',
        '',
        'LÄNGE: 80–180 Wörter.',
        '',
        'EU AI ACT HINWEIS: Am Ende in einer separaten Zeile: "Dieses Gutachten wurde unter Einsatz von KI-Assistenz bei der Textstrukturierung erstellt. Alle fachlichen Bewertungen sind Eigenleistung des Sachverständigen."'
      ].join('\n')
    }
  };

  /* ── Kontext zum User-Prompt formatieren ── */
  function formatContextForPrompt(ctx) {
    ctx = ctx || {};
    var lines = [];
    if (ctx.auftragstyp) lines.push('Auftragstyp: ' + ctx.auftragstyp);
    if (ctx.aktenzeichen) lines.push('Aktenzeichen: ' + ctx.aktenzeichen);
    if (ctx.auftraggeber) lines.push('Auftraggeber: ' + ctx.auftraggeber);
    if (ctx.auftraggeber_typ) lines.push('Auftraggeber-Typ: ' + ctx.auftraggeber_typ);
    if (ctx.objekt_adresse) lines.push('Objekt-Adresse: ' + ctx.objekt_adresse);
    if (ctx.schadensart) lines.push('Schadensart: ' + ctx.schadensart);
    if (ctx.auftragsdatum) lines.push('Auftragsdatum: ' + ctx.auftragsdatum);
    if (ctx.ortstermin_datum) lines.push('Ortstermin: ' + ctx.ortstermin_datum);
    if (ctx.anwesende) lines.push('Anwesende: ' + (Array.isArray(ctx.anwesende) ? ctx.anwesende.join(', ') : ctx.anwesende));
    if (ctx.befund) lines.push('\nBefund-Text:\n' + ctx.befund);
    if (ctx.diktat) lines.push('\nOrtstermin-Diktat:\n' + ctx.diktat);
    if (ctx.messwerte && ctx.messwerte.length) {
      lines.push('\nMesswerte:');
      ctx.messwerte.forEach(function(m) {
        lines.push('  - ' + (m.groesse || '?') + ': ' + (m.wert || '?') + (m.ort ? ' (' + m.ort + ')' : ''));
      });
    }
    if (ctx.beweisfragen && ctx.beweisfragen.length) {
      lines.push('\nBeweisfragen:');
      ctx.beweisfragen.forEach(function(bf, i) { lines.push('  ' + (i+1) + '. ' + bf); });
    }
    if (ctx.ergaenzende_angaben) lines.push('\nErgänzende Angaben:\n' + ctx.ergaenzende_angaben);
    if (ctx.vorherige_paragraphen) {
      Object.keys(ctx.vorherige_paragraphen).forEach(function(n) {
        lines.push('\n§ ' + n + ' (bereits geschrieben):\n' + ctx.vorherige_paragraphen[n]);
      });
    }
    return lines.join('\n');
  }

  /* ──────────────────────────────────────────────
     Haupt-API: Paragraph generieren
     @param paragraphNr  1|2|3|4|5|7  (für §6 bitte generateGuidedAnalysis nutzen)
     @param ctx          Kontext-Objekt
     @returns Promise<string>
  ────────────────────────────────────────────── */
  PROVA.generateParagraph = async function(paragraphNr, ctx) {
    var nr = parseInt(paragraphNr, 10);
    // § 6 läuft über eigenen Endpoint
    if (nr === 6) {
      throw new Error('Für § 6 bitte PROVA.generateGuidedAnalysis() nutzen (Guided Writing v3.1).');
    }
    if ([1,2,3,4,5,7].indexOf(nr) === -1) {
      throw new Error('Paragraph § ' + nr + ' nicht unterstützt.');
    }
    var prompt = PROMPTS[nr];
    if (!prompt) throw new Error('Kein System-Prompt für § ' + nr + ' definiert');

    var pseudo = pseudonymisiereKontext(ctx || {});
    var userMsg = 'Bitte § ' + nr + ' (' + prompt.titel + ') auf Basis folgenden Kontexts formulieren:\n\n'
      + formatContextForPrompt(pseudo);

    try {
      var res = await fetch('/.netlify/functions/ki-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1200,
          temperature: 0.2,
          // v3.4: Fachwissen-Kontext triggern (Server injiziert typ-abhängige Normen)
          schadensart: (ctx && ctx.schadensart) || '',
          paragraph_nr: nr,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user',   content: userMsg }
          ]
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      var txt = (data.content && data.content[0] && data.content[0].text) || '';
      if (!txt) throw new Error('Leere KI-Antwort');
      // Code-Fences defensiv entfernen (sollten nicht vorkommen aber safety-first)
      txt = txt.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/,'').trim();
      return txt;
    } catch (e) {
      throw new Error('§ ' + nr + '-Generator fehlgeschlagen: ' + e.message);
    }
  };

  /* ──────────────────────────────────────────────
     § 6 Guided Writing v3.1 — liefert NUR Analyse-Daten,
     kein copy-paste-fähiger Fließtext.
  ────────────────────────────────────────────── */
  PROVA.generateGuidedAnalysis = async function(ctx) {
    var prompt = PROMPTS[6];
    var pseudo = pseudonymisiereKontext(ctx || {});
    var userMsg = 'Bitte Analyse-Daten für § 6 Fachurteil liefern (Guided Writing v3.1).\n\n'
      + formatContextForPrompt(pseudo);

    try {
      var res = await fetch('/.netlify/functions/ki-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1500,
          temperature: 0.15,
          // v3.4: Fachwissen-Kontext triggern (§ 6 Fachurteil → max. 8 Normen)
          schadensart: (ctx && ctx.schadensart) || '',
          paragraph_nr: 6,
          messages: [
            { role: 'system', content: prompt.system },
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
        if (!m) throw new Error('Antwort war kein JSON');
        parsed = JSON.parse(m[0]);
      }
      return {
        messwert_analyse:     Array.isArray(parsed.messwert_analyse)     ? parsed.messwert_analyse     : [],
        ursachenkategorien:   Array.isArray(parsed.ursachenkategorien)   ? parsed.ursachenkategorien   : [],
        einschlaegige_normen: Array.isArray(parsed.einschlaegige_normen) ? parsed.einschlaegige_normen : [],
        offene_fragen:        Array.isArray(parsed.offene_fragen)        ? parsed.offene_fragen        : [],
        wichtiger_hinweis:    String(parsed.wichtiger_hinweis || '')
      };
    } catch (e) {
      throw new Error('§ 6 Guided Writing fehlgeschlagen: ' + e.message);
    }
  };

  /* ──────────────────────────────────────────────
     UI-Helper: Guided-Analysis in stellungnahme.html rendern
     (nicht-kopierbare Darstellung)
  ────────────────────────────────────────────── */
  PROVA.renderGuidedAnalysis = function(analyse, containerId) {
    var el = document.getElementById(containerId);
    if (!el || !analyse) return;
    function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

    var html = '<div style="user-select:none;-webkit-user-select:none;-moz-user-select:none;pointer-events:auto;">';

    // Messwerte
    if (analyse.messwert_analyse && analyse.messwert_analyse.length) {
      html += '<div style="margin-bottom:14px;">'
        + '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--accent,#4f8ef7);margin-bottom:6px;">📊 Messwert-Einordnung</div>';
      analyse.messwert_analyse.forEach(function(m) {
        html += '<div style="font-size:12px;padding:6px 10px;background:var(--bg3,rgba(79,142,247,.04));border-radius:6px;margin-bottom:4px;">'
          + '<strong>' + esc(m.messwert) + '</strong> — ' + esc(m.einordnung)
          + (m.abweichung ? ' <span style="color:var(--warn,#f59e0b);">· ' + esc(m.abweichung) + '</span>' : '')
          + '</div>';
      });
      html += '</div>';
    }

    // Ursachenkategorien
    if (analyse.ursachenkategorien && analyse.ursachenkategorien.length) {
      html += '<div style="margin-bottom:14px;">'
        + '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--accent);margin-bottom:6px;">💡 Ursachenkategorien (Hypothesen)</div>';
      analyse.ursachenkategorien.forEach(function(u) {
        var col = u.plausibilitaet === 'hoch' ? '#10b981' : u.plausibilitaet === 'mittel' ? '#f59e0b' : '#6b7280';
        html += '<div style="padding:8px 12px;background:var(--bg3);border-left:3px solid ' + col + ';border-radius:4px;margin-bottom:6px;">'
          + '<div style="font-size:12px;font-weight:600;color:var(--text);">' + esc(u.kategorie)
          + ' <span style="font-size:10px;font-weight:700;color:' + col + ';text-transform:uppercase;">· ' + esc(u.plausibilitaet) + '</span></div>'
          + (u.hinweis_konjunktiv ? '<div style="font-size:11px;color:var(--text2);margin-top:4px;font-style:italic;">' + esc(u.hinweis_konjunktiv) + '</div>' : '');
        if (u.passende_befunde && u.passende_befunde.length) {
          html += '<div style="font-size:10px;color:var(--text3);margin-top:4px;">✓ ' + u.passende_befunde.map(esc).join(' · ') + '</div>';
        }
        if (u.gegen_befunde && u.gegen_befunde.length) {
          html += '<div style="font-size:10px;color:var(--text3);margin-top:2px;">✗ ' + u.gegen_befunde.map(esc).join(' · ') + '</div>';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    // Normen
    if (analyse.einschlaegige_normen && analyse.einschlaegige_normen.length) {
      html += '<div style="margin-bottom:12px;">'
        + '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--accent);margin-bottom:6px;">📚 Einschlägige Normen</div>'
        + '<div style="font-size:12px;color:var(--text2);">' + analyse.einschlaegige_normen.map(esc).join(' · ') + '</div>'
        + '</div>';
    }

    // Offene Fragen
    if (analyse.offene_fragen && analyse.offene_fragen.length) {
      html += '<div style="margin-bottom:12px;">'
        + '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--warn,#f59e0b);margin-bottom:6px;">❓ Offene Fragen</div>';
      analyse.offene_fragen.forEach(function(f) {
        html += '<div style="font-size:12px;color:var(--text2);padding:3px 0;">• ' + esc(f) + '</div>';
      });
      html += '</div>';
    }

    // Wichtiger Hinweis
    if (analyse.wichtiger_hinweis) {
      html += '<div style="padding:10px 12px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:6px;margin-top:12px;">'
        + '<div style="font-size:11px;font-weight:700;color:#f59e0b;margin-bottom:3px;">⚠ Wichtig für § 6</div>'
        + '<div style="font-size:12px;color:var(--text2);">' + esc(analyse.wichtiger_hinweis) + '</div>'
        + '</div>';
    }

    html += '<div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--border);font-size:10px;color:var(--text3);font-style:italic;">'
      + 'Guided Writing v3.1 · Diese Analyse ist nicht kopierbar. § 6 Fachurteil formulieren Sie als SV-Eigenleistung (min. 500 Zeichen). § 407a ZPO.'
      + '</div>';

    html += '</div>';
    el.innerHTML = html;
  };

  /* ──────────────────────────────────────────────
     UI-Helper: Paragraph-Generator-Button in
     beliebiges HTML-Element einhängen
  ────────────────────────────────────────────── */
  PROVA.attachParagraphButton = function(config) {
    // config: { targetTextareaId, buttonId, paragraphNr, ctxGetter: Function }
    var btn = document.getElementById(config.buttonId);
    var textarea = document.getElementById(config.targetTextareaId);
    if (!btn || !textarea) return;

    btn.addEventListener('click', async function() {
      var originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '⏳ KI schreibt § ' + config.paragraphNr + '…';
      try {
        var ctx = typeof config.ctxGetter === 'function' ? config.ctxGetter() : {};
        var txt = await PROVA.generateParagraph(config.paragraphNr, ctx);
        // Bestehenden Text nicht überschreiben sondern ersetzen NUR wenn leer oder User bestätigt
        if (textarea.value && textarea.value.trim() && !confirm('§ ' + config.paragraphNr + ' bereits gefüllt. Überschreiben?')) {
          btn.textContent = originalText;
          btn.disabled = false;
          return;
        }
        textarea.value = txt;
        // Autosize-Event triggern falls vorhanden
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      } catch (e) {
        alert('KI-Fehler § ' + config.paragraphNr + ': ' + e.message);
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  };

})();
