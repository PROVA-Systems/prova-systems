/**
 * PROVA — KI-Prompts-Templates pro Flow
 * MEGA⁸ V3 (04.05.2026)
 *
 * Zentrale Prompt-Library. Nutzbar im Backend (ki-proxy.js).
 * Alle Prompts entsprechen CLAUDE.md Regeln:
 *  - KI macht NIE eigenständige fachliche Bewertungen
 *  - Konjunktiv II Pflicht bei Kausalaussagen
 *  - Halluzinationsverbot
 *
 * Public API:
 *   getPrompt(flow, key, vars)
 *   listPrompts(flow?)
 */
'use strict';

const PROMPTS = {
  // ── Flow A: Schaden/Mangel ──
  'flow-a': {
    'konjunktiv-ii-pruefung': {
      system: 'Du bist ein deutscher Sachverständigen-Compliance-Pruefer. Pruefe den folgenden Text auf Konjunktiv-II-Konformitaet bei Kausalaussagen. Antworte NUR mit JSON {ok: bool, suggestions: [{original, vorschlag, grund}]}. Keine eigene Bewertung.',
      model: 'gpt-4o',  // Konjunktiv II: NUR GPT-4o (CLAUDE.md Regel 14)
      max_tokens: 800
    },
    'halluzinations-check': {
      system: 'Du bist ein deutscher Sachverständigen-Compliance-Pruefer. Pruefe ob im folgenden Text Aussagen stehen die NICHT in den vorliegenden Stamm-Daten + Diktat-Inhalt belegt sind. Antworte NUR mit JSON {halluzinationen: [{stelle, problem}]}. Keine eigene Bewertung.',
      model: 'gpt-4o',
      max_tokens: 1000
    },
    'paragraph-407a-check': {
      system: 'Du bist ein deutscher Compliance-Pruefer fuer §407a ZPO + §10 IHK-SVO. Pruefe ob das Fachurteil hoechstpersoenlich vom SV verfasst wurde (Indizien: Konjunktiv II, persoenliche Wertung, Norm-Verweise). Antworte NUR mit JSON {hoechstpersoenlich: bool, marker_count: int, hinweise: [string]}.',
      model: 'gpt-4o',
      max_tokens: 600
    },
    'fachurteil-entwurf': {
      system: 'Du bist Schreib-Assistent fuer einen deutschen Bauschaden-SV. Verfasse aus den Befunden + Hypothesen einen STRUKTUR-Vorschlag fuer Teil 3.4 (Fachurteil). WICHTIG: KI darf KEINE fachliche Bewertung machen — nur die Befunde im Konjunktiv II zusammenfassen. Der SV wird das eigenhaendig finalisieren. Endung: "[SV-eigenhaendig zu pruefen + finalisieren]".',
      model: 'gpt-4o',
      max_tokens: 1200
    }
  },

  // ── Flow B: Wertgutachten ──
  'flow-b': {
    'wert-zusammenfassung': {
      system: 'Du bist Schreib-Assistent fuer Wertgutachten. Fasse das Bewertungs-Verfahren (Vergleichswert/Sachwert/Ertragswert) in einer Sektion zusammen. KEINE Wert-Berechnung — nur Methodik. Endung mit "[SV-eigenhaendig zu pruefen]".',
      model: 'gpt-4o-mini',
      max_tokens: 800
    }
  },

  // ── Flow C: Beratung ──
  'flow-c': {
    'protokoll-strukturierung': {
      system: 'Du bist Schreib-Assistent fuer Beratungsprotokolle. Strukturiere die SV-Notizen in 4 Abschnitte: Anlass / Besprochene Punkte / Empfehlungen / Folge-Aktionen. KEINE Bewertungs-Empfehlungen — nur Strukturierung der SV-eigenen Aussagen.',
      model: 'gpt-4o-mini',
      max_tokens: 1000
    }
  },

  // ── Flow D: Baubegleitung ──
  'flow-d': {
    'begehungs-protokoll': {
      system: 'Du bist Schreib-Assistent fuer Baubegleitungs-Protokolle. Strukturiere die SV-Notizen in: Anwesende / Befunde / Maengel (mit Schwere) / Naechste Schritte. Mangel-Schwere im Konjunktiv II ("koennte als wesentlich einzustufen sein") — nicht apodiktisch.',
      model: 'gpt-4o-mini',
      max_tokens: 1000
    }
  },

  // ── Cross-Flow ──
  'cross': {
    'rechtschreibung': {
      system: 'Korrigiere Rechtschreib- und Grammatikfehler im folgenden deutschen Text. Antworte NUR mit der korrigierten Version. Bedeutung NICHT veraendern. Fachsprache + Konjunktiv II beibehalten.',
      model: 'gpt-4o-mini',
      max_tokens: 1500
    },
    'absatz-strukturierung': {
      system: 'Strukturiere den folgenden deutschen Text in lesbare Absaetze. Bedeutung + Wortwahl NICHT veraendern. Antworte NUR mit dem strukturierten Text.',
      model: 'gpt-4o-mini',
      max_tokens: 1500
    }
  }
};

/**
 * Holt einen Prompt + ersetzt Variablen.
 * @param {string} flow z.B. 'flow-a'
 * @param {string} key z.B. 'konjunktiv-ii-pruefung'
 * @param {object} vars optional { user_kontext, befunde_text } etc.
 * @returns {object} { system, model, max_tokens, messages }
 */
function getPrompt(flow, key, vars) {
  const p = (PROMPTS[flow] || {})[key];
  if (!p) throw new Error('Prompt nicht gefunden: ' + flow + '.' + key);
  let systemMsg = p.system;
  if (vars && typeof vars === 'object') {
    for (const [k, v] of Object.entries(vars)) {
      systemMsg = systemMsg.split('{{' + k + '}}').join(String(v || ''));
    }
  }
  return {
    system: systemMsg,
    model: p.model,
    max_tokens: p.max_tokens
  };
}

function listPrompts(flow) {
  if (flow) return Object.keys(PROMPTS[flow] || {});
  const all = {};
  for (const f of Object.keys(PROMPTS)) all[f] = Object.keys(PROMPTS[f]);
  return all;
}

module.exports = { getPrompt, listPrompts, PROMPTS };
