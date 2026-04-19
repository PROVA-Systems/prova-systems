// ══════════════════════════════════════════════════════════════
// PROVA — prova-fachwissen.js (Server-seitig, für Netlify Functions)
//
// Zentraler Fachwissen-Provider. Wird von ki-proxy.js, paragraph-generator
// (künftig) und weiteren KI-Modulen genutzt.
//
// 3-Schicht-Fallback (Cache-Aside mit Stale-While-Error):
//   1) Airtable-Live (primär)    → tblnceVJIW7BjHsPF in appJ7bLlAHZoxENWE
//   2) In-Memory-Cache (5 Min)   → zwischen Function-Aufrufen wiederverwendet
//   3) Hardcode-Basis-Fallback   → 18 kritische Normen als absolute Safeguard
//
// Architektur-Prinzip (Separation of Concerns):
//   - Dieses Modul kennt nur Daten + Abfragen, KEINE Prompts.
//   - Die KI-Module (ki-proxy etc.) bauen Prompts und fragen hier nach Daten.
//
// Sicherheits-Garantien:
//   - Funktion wirft NIE eine Exception nach außen → Konsumenten können
//     sich darauf verlassen, IMMER ein Ergebnis zu bekommen.
//   - Bei Total-Airtable-Ausfall läuft KI mit Basis-18-Fallback weiter
//     (= heutiger Inline-Zustand der KI-Prompts im Live-ki-proxy).
// ══════════════════════════════════════════════════════════════

'use strict';

const AIRTABLE_BASE  = 'appJ7bLlAHZoxENWE';
const AIRTABLE_TABLE = 'tblnceVJIW7BjHsPF'; // NORMEN

// Feld-IDs aus netlify/functions/normen.js (Stand 17.04.2026, verifiziert)
const FIELD_MAP = {
  'fldyeReuP8JN2ysfX': 'num',
  'fldOoZMoaGeVvRrex': 'titel',
  'fldGi6sTQjrcFfkfc': 'bereich',
  'fld9fmLn0GyA9SDf9': 'sa',
  'flduiGXOUlExoE9PV': 'anw',
  'fldSfEeDIFHWRX26u': 'gw',
  'fldWwYKqbcRilMPoY': 'mess',
  'fldRb3LIxS7kbKJft': 'hint',
  'fldket7RgxYYMFBrw': 'hf',
  'fldK4QeLnSDAbkQ8N': 'status',
  'fldbPPZwyU2BlyTco': 'aktiv'
};

const FIELDS = Object.keys(FIELD_MAP).map(id => `fields[]=${encodeURIComponent(id)}`).join('&');

// ── CACHE (in-memory, lebt zwischen Function-Aufrufen in warmen Netlify-Instanzen)
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 Minuten
let _cache = { data: null, timestamp: 0, source: null };

// ── SCHICHT 3: Hardcode-Fallback (18 kritische Basis-Normen)
// Diese Auswahl entspricht dem aktuellen LIVE-Zustand der ki-proxy-Prompts
// plus einer konservativen Erweiterung. Bewusst klein gehalten, um
// Duplikation mit normen-logic.js (264 Einträge) zu minimieren.
const BASIS_FALLBACK = [
  { num: 'DIN 4108-2', titel: 'Wärmeschutz — Mindestanforderungen', bereich: 'Wärme', sa: 'WS,SC,BA', anw: 'Mindestoberflächentemperaturfaktor, Wärmebrücken, Schimmelrisiko.', gw: 'fRsi ≥ 0,70 | Taupunkt bei 20°C/50% rF ≈ 9,3°C', mess: 'Thermografie DIN EN 13187, Berechnung DIN EN ISO 13788', hf: 'hoch', hint: 'Bei Schimmel und Wärmebrücken immer zitieren.' },
  { num: 'DIN 4108-3', titel: 'Wärmeschutz — Klimabedingter Feuchteschutz', bereich: 'Wärme', sa: 'WS,SC,BA', anw: 'Schutz gegen klimabedingte Feuchte durch Dampfdiffusion.', gw: 'Tauwassermenge max. 1,0 kg/m² je Tauperiode', mess: 'Glaser-Diagramm nach DIN 4108-3', hf: 'mittel', hint: 'Tauwasserberechnung als Anlage beifügen.' },
  { num: 'DIN 4108-7', titel: 'Wärmeschutz — Luftdichtheit', bereich: 'Wärme', sa: 'WS,SC,BA', anw: 'Anforderungen an Luftdichtheit der Gebäudehülle.', gw: 'n50-Wert ≤ 3,0 h⁻¹ ohne RLT | ≤ 1,5 h⁻¹ mit RLT (GEG)', mess: 'Blower-Door DIN EN ISO 9972', hf: 'mittel', hint: 'Bei unklaren Feuchteschäden Luftdichtigkeit prüfen.' },
  { num: 'DIN EN ISO 13788', titel: 'Raumseitige Oberflächentemperatur', bereich: 'Wärme', sa: 'WS,SC', anw: 'Bewertung Schimmelpilzrisiko an Bauteilen.', gw: 'fRsi ≥ 0,70 (20°C/50% rF) | krit. Oberflächenfeuchte 80%', mess: 'Wärmedurchgangsberechnung, thermische Simulation', hf: 'hoch', hint: 'Standardreferenz bei Schimmelpilzgutachten.' },
  { num: 'WTA 6-1-01/D', titel: 'Feuchtemessung Mauerwerk', bereich: 'Feuchte', sa: 'WS,SC', anw: 'Standardverfahren zur Mauerwerksfeuchte-Bestimmung.', gw: 'CM-Messung oder Darr-Methode (gravimetrisch)', mess: 'Bohrprobe + gravimetrisch | CM-Verfahren', hf: 'hoch', hint: 'Bei aufsteigender Feuchte zitieren.' },
  { num: 'DIN 18533', titel: 'Abdichtung erdberührter Bauteile', bereich: 'Abdichtung', sa: 'WS,SC,BA', anw: 'Kellerabdichtungen, Lastfälle W1-E bis W4-E.', gw: 'Abdichtungsdicke je nach Lastfall 3-8mm', mess: 'Feuchtemessung CM | Lastfall nach Bodengutachten', hf: 'hoch', hint: 'Lastfall korrekt bestimmen — häufigster Fehler.' },
  { num: 'DIN 18531', titel: 'Abdichtung von Dächern', bereich: 'Abdichtung', sa: 'WS,SS,BA', anw: 'Dachabdichtungen, Aufkantungen, Anschlussdetails.', gw: 'Bitumenbahnen ≥ 6 mm | Aufkantung ≥ 150 mm', mess: 'Thermografie | Kernbohrung Schichtaufbau', hf: 'hoch', hint: 'Aufkantungshöhen fotografieren.' },
  { num: 'DIN 68800-1', titel: 'Holzschutz — Allgemeines', bereich: 'Holz', sa: 'WS,BS,SC,BA', anw: 'Gebrauchsklassen GK 0 bis GK 5.', gw: 'Einbaufeuchte max. 20% | Dauerfeuchte max. 18%', mess: 'Holzfeuchtemessung Widerstand / gravimetrisch', hf: 'hoch', hint: 'Gebrauchsklasse mit Behandlung vergleichen.' },
  { num: 'DIN 68800-2', titel: 'Holzschutz — Vorbeugende Maßnahmen', bereich: 'Holz', sa: 'WS,SC,BA', anw: 'Konstruktionsregeln Holztragwerke.', gw: 'Holzfeuchte bei Einbau max. 20%', mess: 'Widerstandsmethode 3cm Einschlagtiefe', hf: 'hoch', hint: 'Bei Dachstuhlschäden Einbaufeuchte dokumentieren.' },
  { num: 'DIN 18202', titel: 'Toleranzen im Hochbau', bereich: 'Baumängel', sa: 'BA', anw: 'Maßtoleranzen fertiger Bauteile.', gw: 'Fußboden mit Belag max. 5mm bei 4m Abstand', mess: 'Messlatte 4m | Laserabstandsmessgerät', hf: 'hoch', hint: 'Tabellen Zeile 3 und 6 immer angeben.' },
  { num: 'DIN 52460', titel: 'Fugen und Dichtstoffe — Rissbreite', bereich: 'Baumängel', sa: 'BA,SC', anw: 'Klassifizierung von Rissbreiten.', gw: 'Rissbreite > 0,2mm dokumentationspflichtig', mess: 'Rissbreitenlineal | Kartierung', hf: 'hoch', hint: 'Bei Setzungsrissen zitieren.' },
  { num: 'UBA-Leitfaden', titel: 'Schimmelpilze in Innenräumen', bereich: 'Feuchte', sa: 'SC', anw: 'Bewertung und Sanierung von Schimmelschäden.', gw: 'Befall >0,5 m² = erheblicher Mangel | >1 m² Fachbetrieb', mess: 'Visuell + Abklatschprobe | Luftkeimmessung | ERMI', hf: 'hoch', hint: 'Standardreferenz bei Schimmelschäden.' },
  { num: 'DIN 1946-6', titel: 'Lüftung von Wohnungen', bereich: 'Feuchte', sa: 'SC,BA', anw: 'Lüftungsanforderungen bei erhöhter Luftdichtheit.', gw: 'Feuchteschutz-Lüftung ≥ 0,3-facher Luftwechsel/h', mess: 'Volumenstrommessung | CO2-Messung', hf: 'hoch', hint: 'Bei saniertem Altbau Lüftungskonzept prüfen.' },
  { num: 'VOB/B §13', titel: 'Mängelansprüche', bereich: 'VOB-Recht', sa: 'BA', anw: 'Mängelbegriff, Gewährleistung, Nacherfüllung.', gw: 'Gewährleistung Bauwerk 4 Jahre | bewegl. Sachen 2 Jahre', mess: 'Bestandsaufnahme | Schadensprotokoll', hf: 'hoch', hint: 'Verjährungsbeginn Abnahme dokumentieren.' },
  { num: 'VOB/B §4', titel: 'Ausführung — Prüf- und Hinweispflicht', bereich: 'VOB-Recht', sa: 'BA', anw: 'Bedenkenanzeigepflicht Auftragnehmer.', gw: 'bei fehlender Anzeige ggf. Mitverschulden', mess: 'Dokumentation Bedenkenanzeige | Bautagebuch', hf: 'hoch', hint: 'Verletzung der Prüf-/Hinweispflicht häufig.' },
  { num: 'ZPO §407a', titel: 'Pflichten des Sachverständigen', bereich: 'Verfahrensrecht', sa: 'BA,WS,BS,SS,SC,ES', anw: 'Persönliche Erstattung, keine Delegation.', gw: 'Unverzügliche Anzeige bei Überforderung', mess: 'Dokumentation persönlicher Bearbeitung | Unterschrift', hf: 'hoch', hint: 'Bei jedem Gerichtsgutachten in §6 zitieren.' },
  { num: 'ZPO §404', titel: 'Auswahl des Sachverständigen', bereich: 'Verfahrensrecht', sa: 'BA,WS,BS,SS,SC,ES', anw: 'Gerichtliche Bestellung, öffentliche Bestellung.', gw: 'SV muss öffentlich bestellt oder besonders sachkundig sein', mess: 'Bestellungsurkunde | Fachgebietsprüfung', hf: 'hoch', hint: 'Als Rechtsgrundlage bei Gerichtsgutachten angeben.' },
  { num: 'ZPO §411', titel: 'Schriftliches Gutachten', bereich: 'Verfahrensrecht', sa: 'BA,WS,BS,SS,SC,ES', anw: 'Form und Inhalt des schriftlichen Gutachtens.', gw: 'Begründungspflicht | Tatsachengrundlage | nachvollziehbar', mess: 'Gutachtenstruktur prüfen | Lücken vermeiden', hf: 'hoch', hint: 'Als Maßstab bei jeder Gutachtenerstellung.' }
];

// ══════════════════════════════════════════════════════════════
// HELPER: Airtable-Fetch (intern, wirft bei Fehler — wird gefangen)
// ══════════════════════════════════════════════════════════════
async function fetchAirtablePage(pat, offset) {
  const filter = encodeURIComponent('{Aktiv}=TRUE()');
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?${FIELDS}&filterByFormula=${filter}&pageSize=100&returnFieldsByFieldId=true${offset ? '&offset=' + encodeURIComponent(offset) : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${pat}` } });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable HTTP ${res.status}: ${err.substring(0, 200)}`);
  }
  return res.json();
}

function mapAirtableRecord(rec) {
  const f = rec.fields || {};
  const mapped = {};
  for (const [fieldId, key] of Object.entries(FIELD_MAP)) {
    let val = f[fieldId];
    if (val && typeof val === 'object' && val.name) val = val.name;
    if (Array.isArray(val)) val = val.map(v => v.name || v).join(',');
    mapped[key] = val !== undefined && val !== null ? val : '';
  }
  return mapped;
}

// ══════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════

/**
 * Liefert alle aktuellen Normen zurück.
 * Durchläuft die 3-Schicht-Kaskade. Wirft nie.
 *
 * @returns {Promise<{normen: Array, source: 'airtable-live'|'cache'|'fallback', count: number}>}
 */
async function getNormen() {
  // SCHICHT 2: Cache prüfen
  const now = Date.now();
  if (_cache.data && (now - _cache.timestamp) < CACHE_TTL_MS) {
    return { normen: _cache.data, source: 'cache', count: _cache.data.length };
  }

  // SCHICHT 1: Airtable-Live
  const pat = process.env.AIRTABLE_PAT || process.env.AIRTABLE_TOKEN;
  if (pat) {
    try {
      const all = [];
      let offset = null;
      let pageCount = 0;
      do {
        const page = await fetchAirtablePage(pat, offset);
        const records = (page.records || []).map(mapAirtableRecord);
        all.push(...records);
        offset = page.offset || null;
        pageCount++;
        if (pageCount > 10) break; // Safety-Limit: max 1000 Einträge
      } while (offset);

      if (all.length > 0) {
        _cache = { data: all, timestamp: now, source: 'airtable-live' };
        return { normen: all, source: 'airtable-live', count: all.length };
      }
      // Airtable lieferte 0 Records → als Fehler behandeln (Schutz vor stillen Fehlern)
      console.warn('[prova-fachwissen] Airtable lieferte 0 Normen — nutze Fallback');
    } catch (err) {
      console.warn(`[prova-fachwissen] Airtable-Fehler, nutze Fallback: ${err.message}`);
    }
  } else {
    console.warn('[prova-fachwissen] AIRTABLE_PAT nicht gesetzt — nutze Fallback');
  }

  // SCHICHT 2b: Stale Cache (wenn vorhanden, auch wenn > 5min — besser als Fallback)
  if (_cache.data) {
    console.warn('[prova-fachwissen] Nutze abgelaufenen Cache (stale-while-error)');
    return { normen: _cache.data, source: 'cache-stale', count: _cache.data.length };
  }

  // SCHICHT 3: Hardcode-Fallback (IMMER verfügbar)
  return { normen: BASIS_FALLBACK, source: 'fallback', count: BASIS_FALLBACK.length };
}

/**
 * Filtert Normen nach Schadensart-Code (WS, SC, BS, SS, BA, ES, BR, ALL).
 * Mehrere Codes komma-separiert möglich: "WS,SC"
 */
// ══════════════════════════════════════════════════════════════
// SCHADENSART-NORMALISIERUNG (v3 — Sprint 3)
//
// Akzeptiert sowohl Codes ("WS") als auch volle Texte ("Wasserschaden"),
// einzeln oder komma-separiert. Unbekannte Werte werden unverändert
// durchgelassen (kein stiller Fail — safe by default).
//
// Warum: Die Browser-Module speichern Schadensart als Text in localStorage
// (z.B. "Wasserschaden"). Die NORMEN-DB nutzt Codes (z.B. "WS"). Dieser
// Normalisierer überbrückt beide Welten transparent für alle Aufrufer.
// ══════════════════════════════════════════════════════════════
const SA_TEXT_TO_CODE = {
  // Wasserschaden
  'WASSERSCHADEN': 'WS', 'WASSERSCHÄDEN': 'WS', 'WASSER': 'WS', 'LEITUNGSWASSER': 'WS',
  // Schimmel/Feuchte
  'SCHIMMEL': 'SC', 'SCHIMMELPILZ': 'SC', 'SCHIMMELPILZE': 'SC', 'FEUCHTE': 'SC', 'FEUCHTIGKEIT': 'SC',
  // Brandschaden
  'BRANDSCHADEN': 'BS', 'BRAND': 'BS', 'FEUER': 'BS', 'FEUERSCHADEN': 'BS',
  // Sturmschaden
  'STURMSCHADEN': 'SS', 'STURM': 'SS', 'HAGELSCHADEN': 'SS', 'HAGEL': 'SS',
  // Baumangel
  'BAUMANGEL': 'BA', 'BAUMÄNGEL': 'BA', 'MANGEL': 'BA', 'MÄNGEL': 'BA',
  // Elementarschaden
  'ELEMENTARSCHADEN': 'ES', 'ELEMENTAR': 'ES', 'ÜBERSCHWEMMUNG': 'ES', 'HOCHWASSER': 'ES',
  // Barrierefrei
  'BARRIEREFREI': 'BR', 'BARRIEREFREIHEIT': 'BR'
};

/**
 * Normalisiert eine Schadensart-Eingabe zu Codes.
 * Akzeptiert: "Wasserschaden", "WS", "Wasserschaden,Schimmel", "WS,SC", gemischt.
 * @param {string} input
 * @returns {string} komma-separierte Codes, uppercase, z.B. "WS,SC"
 */
function normalizeSaInput(input) {
  if (!input) return '';
  const parts = String(input).split(/[,;|]/).map(s => s.trim()).filter(Boolean);
  const codes = parts.map(p => {
    const up = p.toUpperCase();
    // Bereits Code-Format (2-3 Zeichen, nur Buchstaben)?
    if (/^[A-Z]{2,3}$/.test(up)) return up;
    // Text-Mapping
    if (SA_TEXT_TO_CODE[up]) return SA_TEXT_TO_CODE[up];
    // Fuzzy-Match: "Wasserschaden, Leitungswasser" → suche Teil-String
    for (const [text, code] of Object.entries(SA_TEXT_TO_CODE)) {
      if (up.includes(text)) return code;
    }
    // Unbekannt → Original durchlassen (Suche wird dann vermutlich nichts finden, aber kein Fehler)
    return up;
  });
  // Dedup
  return [...new Set(codes)].join(',');
}

async function normenFuerSchadensart(saInput) {
  const { normen, source } = await getNormen();
  if (!saInput) return { normen, source };

  const normalizedCodes = normalizeSaInput(saInput);
  if (!normalizedCodes) return { normen, source };

  const codes = normalizedCodes.split(',').filter(Boolean);
  const filtered = normen.filter(n => {
    const nsa = String(n.sa || '').toUpperCase();
    if (nsa.includes('ALL')) return true;
    return codes.some(code => nsa.includes(code));
  });

  return { normen: filtered, source };
}

/**
 * Baut einen kompakten Prompt-Kontext-String mit relevanten Normen.
 * Priorisiert nach Häufigkeit (hoch → mittel → niedrig) und begrenzt auf maxNormen.
 *
 * @param {Object} opts
 * @param {string} opts.schadensart  — SA-Code(s), z.B. 'WS' oder 'WS,SC'
 * @param {string} [opts.typ]        — 'fachurteil_entwurf' | 'paragraph_gen' | 'compliance'
 * @param {number} [opts.maxNormen]  — Default 8
 * @returns {Promise<{text: string, anzahl: number, source: string}>}
 */
async function buildPromptKontext(opts) {
  opts = opts || {};
  const schadensart = opts.schadensart || '';
  const maxNormen = opts.maxNormen || 8;

  const { normen, source } = await normenFuerSchadensart(schadensart);

  // Sortiere nach Häufigkeit
  const HF_ORDER = { 'hoch': 0, 'mittel': 1, 'niedrig': 2 };
  const sorted = [...normen].sort((a, b) =>
    (HF_ORDER[a.hf] ?? 9) - (HF_ORDER[b.hf] ?? 9)
  );

  const ausgewaehlt = sorted.slice(0, maxNormen);

  if (ausgewaehlt.length === 0) {
    return { text: '', anzahl: 0, source };
  }

  // Kompakter Prompt-String (KEIN Markdown — reiner Text für System-Prompt)
  const zeilen = ausgewaehlt.map(n => {
    const teile = [n.num];
    if (n.titel) teile.push(n.titel);
    if (n.gw) teile.push('Grenzwerte: ' + n.gw);
    return '• ' + teile.join(' — ');
  });

  const text = 'RELEVANTE NORMEN:\n' + zeilen.join('\n');

  return { text, anzahl: ausgewaehlt.length, source };
}

/**
 * Debug-Info für Tests (kein Produktionsgebrauch).
 */
function _getCacheState() {
  return {
    hasCachedData: !!_cache.data,
    cachedCount: _cache.data ? _cache.data.length : 0,
    cachedAt: _cache.timestamp ? new Date(_cache.timestamp).toISOString() : null,
    source: _cache.source,
    ttlMs: CACHE_TTL_MS
  };
}

/**
 * Cache-Reset (für Tests).
 */
function _resetCache() {
  _cache = { data: null, timestamp: 0, source: null };
}

// ══════════════════════════════════════════════════════════════
// FLOW B — WERTGUTACHTEN-NORMEN (Sprint 4)
//
// Statische Normen-Matrix für Immobilienwertermittlung. Diese Normen
// sind stabile Rechtsvorschriften die sich sehr selten ändern
// (ImmoWertV-Novelle 2022 war die letzte große Anpassung).
// Daher kein Airtable-Sync nötig — hier als kuratierte Referenz.
//
// Struktur: { num, titel, gw, zweck }
//   zweck: "alle" | "bank" | "gericht" | "steuer"
// ══════════════════════════════════════════════════════════════
const WERTGUTACHTEN_NORMEN = [
  // ─── Kern-Normen (IMMER, egal Zweck/Objektart) ───
  { num: '§§ 194-199 BauGB', titel: 'Verkehrswert — Begriff und Ermittlung', gw: 'Verkehrswert = Preis zum Stichtag im gewöhnlichen Geschäftsverkehr', zweck: 'alle' },
  { num: '§ 1 ImmoWertV',    titel: 'Allgemeine Grundsätze der Wertermittlung', gw: 'Modellkonformität, Marktanpassung, Berücksichtigung wertrelevanter Umstände', zweck: 'alle' },
  { num: '§ 8 ImmoWertV',    titel: 'Verfahrenswahl und Gewichtung', gw: 'Wahl nach Marktgepflogenheiten; mehrere Verfahren möglich', zweck: 'alle' },
  { num: '§§ 24-26 ImmoWertV', titel: 'Vergleichswertverfahren', gw: 'Mind. 3 Vergleichsobjekte; Anpassungsfaktoren dokumentieren', zweck: 'alle' },
  { num: '§§ 27-34 ImmoWertV', titel: 'Ertragswertverfahren', gw: 'Rohertrag, Bewirtschaftungskosten, Liegenschaftszins, Restnutzungsdauer', zweck: 'alle' },
  { num: '§§ 35-39 ImmoWertV', titel: 'Sachwertverfahren', gw: 'Bodenwert + Gebäudesachwert (NHK 2010) − Alterswertminderung', zweck: 'alle' },
  { num: '§ 407a ZPO',       titel: 'Pflichten des Sachverständigen', gw: 'Unverzügliche Anzeige bei Überforderung, höchstpersönliche Erstattung', zweck: 'alle' },
  { num: 'WoFlV',            titel: 'Wohnflächenverordnung', gw: 'Balkone 25%, Dachschrägen nach lichter Höhe 1-2m zu 50%, <1m 0%', zweck: 'alle' },
  { num: 'DIN 277',          titel: 'Grundflächen und Rauminhalte', gw: 'BGF, BRI, NGF nach Bauwerksteilen', zweck: 'alle' },
  { num: 'NHK 2010',         titel: 'Normalherstellungskosten (Anlage 4 ImmoWertV)', gw: 'Kostenkennwerte €/m² BGF nach Gebäudestandards 1-5', zweck: 'alle' },
  { num: 'SVV 2021',         titel: 'Sachverständigenverordnung', gw: 'Bestellungsvoraussetzungen, Pflichten ö.b.u.v. SV', zweck: 'alle' },

  // ─── Zweck: Bankgutachten (Beleihungswert) ───
  { num: '§ 16 BelWertV',    titel: 'Beleihungswert — Begriff', gw: 'Langfristig nachhaltig erzielbarer Wert unter Ausschluss spekulativer Elemente', zweck: 'bank' },
  { num: '§§ 17-21 BelWertV', titel: 'Beleihungswertverfahren', gw: 'Sachwert- und Ertragswertverfahren separat, Sicherheitsabschläge', zweck: 'bank' },
  { num: '§ 22 BelWertV',    titel: 'Bewirtschaftungskosten', gw: 'Mindestansätze für Instandhaltung, Mietausfallwagnis, Verwaltung', zweck: 'bank' },
  { num: 'PfandBG',          titel: 'Pfandbriefgesetz — Deckungsanforderungen', gw: 'Beleihungsgrenze 60% des Beleihungswerts', zweck: 'bank' },

  // ─── Zweck: Gerichtsgutachten ───
  { num: '§ 404 ZPO',        titel: 'Auswahl des Sachverständigen', gw: 'Bevorzugt öffentlich bestellte SV', zweck: 'gericht' },
  { num: '§ 411 ZPO',        titel: 'Schriftliches Gutachten', gw: 'Frist, Unterschrift, Stempel; Rückfragen-Pflicht', zweck: 'gericht' },
  { num: '§ 412 ZPO',        titel: 'Neues Gutachten', gw: 'Bei Widerspruch oder Ergänzungsbedarf', zweck: 'gericht' },

  // ─── Zweck: Steuergutachten ───
  { num: '§§ 151-157 BewG',  titel: 'Grundbesitzwert für Erbschaft/Schenkung', gw: 'Typisierende Bewertung für steuerliche Zwecke', zweck: 'steuer' },
  { num: 'R B 179 ErbStR',   titel: 'Niedrigerer gemeiner Wert', gw: 'Nachweis durch Gutachten nach § 198 BewG möglich', zweck: 'steuer' }
];

/**
 * Liefert Wertgutachten-Normen gefiltert nach Zweck.
 * Kern-Normen (zweck:"alle") sind immer dabei.
 *
 * @param {string} zweck - "alle" | "privat" | "bank" | "gericht" | "steuer" | "versicherung"
 * @returns {Array} Gefilterte Normen-Liste
 */
function wertgutachtenNormen(zweck) {
  const z = String(zweck || 'alle').toLowerCase();
  // privat + versicherung = nur Kern-Normen
  if (z === 'privat' || z === 'versicherung' || z === 'alle' || z === '') {
    return WERTGUTACHTEN_NORMEN.filter(n => n.zweck === 'alle');
  }
  // Alle anderen Zwecke: Kern + Zweck-spezifisch
  return WERTGUTACHTEN_NORMEN.filter(n => n.zweck === 'alle' || n.zweck === z);
}

module.exports = {
  getNormen,
  normenFuerSchadensart,
  buildPromptKontext,
  normalizeSaInput,
  wertgutachtenNormen,
  BASIS_FALLBACK,
  SA_TEXT_TO_CODE,
  WERTGUTACHTEN_NORMEN,
  _getCacheState,
  _resetCache
};
