/**
 * PROVA — global-search.js (MEGA²⁹ V3.2-W9N-I4)
 *
 * Globale Suche-Lambda für Cmd-K-Modal.
 * Searches across: auftraege, kontakte, gutachten, bescheinigungen.
 *
 * Auth: requireAuth (workspace_member)
 * GET /.netlify/functions/global-search?q=text&limit=10&type=akten|kontakte|dokumente
 *
 * Rate-Limit: 60/60s (Live-Search mit Debounce, kann häufig kommen)
 * Sentry-Wrap mit functionName.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

const LimitClamp = (n, def, max) => Math.min(max, Math.max(1, parseInt(n || def, 10) || def));

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  // Rate-Limit für Live-Search (Debounce-tolerant)
  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'global-search' });
  if (!rl.allowed) {
    return jsonResponse(event, 429, { error: 'Rate-Limit erreicht. Bitte ' + rl.retryAfter + 's warten.' },
      { 'Retry-After': String(rl.retryAfter) });
  }

  const q = (event.queryStringParameters && event.queryStringParameters.q) || '';
  const cleanQ = String(q).trim();
  if (cleanQ.length < 2) {
    return jsonResponse(event, 200, { results: [], total: 0, q: cleanQ, hint: 'Mindestens 2 Zeichen' });
  }

  const limit = LimitClamp((event.queryStringParameters && event.queryStringParameters.limit) || 10, 10, 50);
  const typeFilter = (event.queryStringParameters && event.queryStringParameters.type) || 'all';
  const userId = context.userId || context.user_id;

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert', results: [] });

  const queryLower = cleanQ.toLowerCase();
  const allResults = [];

  try {
    // 1. Auftraege durchsuchen — Schema W12-I0: az (NICHT aktenzeichen), schadensart_label, kurzbeantwortung
    if (typeFilter === 'all' || typeFilter === 'akten') {
      try {
        const { data: auftraege } = await sb.from('auftraege')
          .select('id, az, schadensart_label, schadensart_kategorie, kurzbeantwortung, status, created_at')
          .or('az.ilike.%' + queryLower + '%,schadensart_label.ilike.%' + queryLower + '%,kurzbeantwortung.ilike.%' + queryLower + '%')
          .limit(limit);
        (auftraege || []).forEach(a => allResults.push({
          type: 'akte',
          id: a.id,
          title: a.az || '(kein AZ)',
          subtitle: [a.schadensart_label || a.schadensart_kategorie, a.status].filter(Boolean).join(' · '),
          status: a.status,
          href: 'akte.html?az=' + encodeURIComponent(a.az || ''),
          score: a.az && a.az.toLowerCase().includes(queryLower) ? 100 : 50
        }));
      } catch (_) { /* table maybe not present */ }
    }

    // 2. Kontakte durchsuchen
    if (typeFilter === 'all' || typeFilter === 'kontakte') {
      try {
        const { data: kontakte } = await sb.from('kontakte')
          .select('id, name, firma, email, typ')
          .or('name.ilike.%' + queryLower + '%,firma.ilike.%' + queryLower + '%')
          .limit(limit);
        (kontakte || []).forEach(k => allResults.push({
          type: 'kontakt',
          id: k.id,
          title: k.name || k.firma || '(kein Name)',
          subtitle: [k.typ, k.firma].filter(Boolean).join(' · '),
          href: 'kontakte.html?id=' + encodeURIComponent(k.id),
          score: 60
        }));
      } catch (_) { /* table maybe not present */ }
    }

    // 3. Bescheinigungen durchsuchen (Korrespondenz-Briefe)
    if (typeFilter === 'all' || typeFilter === 'dokumente') {
      // Static-Liste aus bescheinigungen.html W3-I3 (11 K-Codes)
      const KORRESPONDENZ = [
        { code: 'K-01', name: 'Auftragsbestätigung', vorlage: 'auftragsbestaetigung' },
        { code: 'K-02', name: 'Termin-Mitteilung', vorlage: 'einladung-ortstermin' },
        { code: 'K-03', name: 'Mehrparteien-Termin', vorlage: 'einladung-ortstermin-multi' },
        { code: 'K-04', name: 'Anforderung Unterlagen', vorlage: 'nachforderung-unterlagen' },
        { code: 'K-05', name: 'Übergabe Gutachten', vorlage: 'uebergabe-gutachten' },
        { code: 'K-06A', name: 'Mahnung 1 (Erinnerung)', vorlage: 'mahnung-1' },
        { code: 'K-06B', name: 'Mahnung 2', vorlage: 'mahnung-2' },
        { code: 'K-06C', name: 'Mahnung 3 (letzte Frist)', vorlage: 'mahnung-3' },
        { code: 'K-07', name: 'Akteneinsicht-Antrag', vorlage: 'akteneinsicht' },
        { code: 'K-08', name: 'Befangenheits-Anzeige', vorlage: 'befangenheit' },
        { code: 'K-09', name: 'Auftragsablehnung', vorlage: 'auftragsablehnung' }
      ];
      KORRESPONDENZ.filter(b =>
        b.code.toLowerCase().includes(queryLower) ||
        b.name.toLowerCase().includes(queryLower)
      ).forEach(b => allResults.push({
        type: 'dokument',
        id: b.code,
        title: b.name,
        subtitle: b.code + ' · Korrespondenz',
        href: 'briefvorlagen.html?vorlage=' + encodeURIComponent(b.vorlage),
        score: b.code.toLowerCase().includes(queryLower) ? 90 : 40
      }));
    }

    // 4. Termine durchsuchen (M³⁹ P2)
    if (typeFilter === 'all' || typeFilter === 'termine') {
      try {
        const { data: termine } = await sb.from('termine')
          .select('id, titel, ort, datum_soll, status, auftrag_id')
          .or('titel.ilike.%' + queryLower + '%,ort.ilike.%' + queryLower + '%')
          .limit(limit);
        (termine || []).forEach(t => allResults.push({
          type: 'termin',
          id: t.id,
          title: t.titel || '(Termin)',
          subtitle: [t.ort, t.datum_soll, t.status].filter(Boolean).join(' · '),
          href: 'termine.html?id=' + encodeURIComponent(t.id),
          score: t.titel && t.titel.toLowerCase().includes(queryLower) ? 75 : 35
        }));
      } catch (_) { /* graceful */ }
    }

    // 5. Einträge durchsuchen (Diktat/Notiz/Skizze) — Volltext via search_vector wenn vorhanden
    if (typeFilter === 'all' || typeFilter === 'eintraege') {
      try {
        const { data: eintraege } = await sb.from('eintraege')
          .select('id, typ, titel, content, auftrag_id, skizze_nr')
          .or('titel.ilike.%' + queryLower + '%,content.ilike.%' + queryLower + '%')
          .limit(limit);
        (eintraege || []).forEach(e => allResults.push({
          type: 'eintrag',
          id: e.id,
          title: e.titel || ('Eintrag (' + e.typ + ')'),
          subtitle: [e.typ, e.skizze_nr ? 'Skizze ' + e.skizze_nr : null,
                     (e.content || '').slice(0, 60)].filter(Boolean).join(' · '),
          href: 'akte.html?az=' + encodeURIComponent(e.auftrag_id || ''),
          score: e.titel && e.titel.toLowerCase().includes(queryLower) ? 70 : 30
        }));
      } catch (_) { /* graceful */ }
    }

    // 6. Textbausteine + Floskeln durchsuchen
    if (typeFilter === 'all' || typeFilter === 'textbausteine') {
      try {
        const { data: bausteine } = await sb.from('textbausteine')
          .select('id, titel, kategorie, inhalt')
          .or('titel.ilike.%' + queryLower + '%,inhalt.ilike.%' + queryLower + '%')
          .limit(limit);
        (bausteine || []).forEach(b => allResults.push({
          type: 'textbaustein',
          id: b.id,
          title: b.titel || '(Textbaustein)',
          subtitle: [b.kategorie, (b.inhalt || '').slice(0, 60)].filter(Boolean).join(' · '),
          href: 'textbausteine.html?id=' + encodeURIComponent(b.id),
          score: 50
        }));
      } catch (_) { /* graceful */ }
    }

    // 7. dokument_templates durchsuchen (M³⁷ B SEED — Korrespondenz + Gutachten-Templates)
    if (typeFilter === 'all' || typeFilter === 'templates') {
      try {
        const { data: tpls } = await sb.from('dokument_templates')
          .select('id, name, typ, pdfmonkey_template_id, rechtlicher_hinweis')
          .eq('aktiv', true)
          .or('name.ilike.%' + queryLower + '%,typ.ilike.%' + queryLower + '%,pdfmonkey_template_id.ilike.%' + queryLower + '%')
          .limit(limit);
        (tpls || []).forEach(tp => allResults.push({
          type: 'template',
          id: tp.id,
          title: tp.name,
          subtitle: [tp.pdfmonkey_template_id, tp.typ, tp.rechtlicher_hinweis].filter(Boolean).join(' · '),
          href: 'briefvorlagen.html?template=' + encodeURIComponent(tp.pdfmonkey_template_id || ''),
          score: tp.pdfmonkey_template_id && tp.pdfmonkey_template_id.toLowerCase().includes(queryLower) ? 85 : 45
        }));
      } catch (_) { /* graceful */ }
    }

    // 8. Normen — Static-Seed (DIN/WTA/VOB/EnEV) als Server-Side-Liste
    if (typeFilter === 'all' || typeFilter === 'normen') {
      const normenMatches = matchNormen(queryLower, limit);
      normenMatches.forEach(n => allResults.push({
        type: 'norm',
        id: n.id,
        title: n.id,
        subtitle: n.titel + (n.bereich ? ' · ' + n.bereich : ''),
        href: 'normen.html?q=' + encodeURIComponent(n.id),
        score: n.id.toLowerCase().includes(queryLower) ? 95 : 55
      }));
    }

    // Sort by score desc, dann limit
    allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
    const sliced = allResults.slice(0, limit);

    return jsonResponse(event, 200, {
      q: cleanQ,
      total: allResults.length,
      results: sliced,
      // MEGA³⁴ A3: Aktionen-Kategorie (Quick-Actions)
      aktionen: matchActions(cleanQ)
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message, results: [] });
  }
}), { functionName: 'global-search' });

// ─── MEGA³⁴ A3: Quick-Actions-Kategorie ─────────────────────────────────────
const QUICK_ACTIONS = [
  { id: 'new-auftrag', label: 'Neuer Auftrag', icon: '➕', href: '/neuer-fall.html', keywords: ['auftrag','neu','fall','schaden','wert'] },
  { id: 'new-rechnung', label: 'Neue Rechnung', icon: '🧾', href: '/rechnungen.html?new=1', keywords: ['rechnung','invoice','honorar'] },
  { id: 'termine', label: 'Termine-Kalender', icon: '📅', href: '/termine.html', keywords: ['termin','kalender','date'] },
  { id: 'archiv', label: 'Archiv', icon: '📦', href: '/archiv.html', keywords: ['archiv','abgeschlossen'] },
  { id: 'einstellungen', label: 'Einstellungen', icon: '⚙️', href: '/einstellungen.html', keywords: ['einstellungen','settings','profil'] },
  { id: 'demo', label: 'Live-Demo', icon: '🚀', href: '/demo.html', keywords: ['demo','tour'] },
  { id: 'honorar-rechner', label: 'Honorar-Rechner', icon: '💶', href: '/honorar-rechner.html', keywords: ['honorar','jveg','bvs','streitwert'] },
  { id: 'cookie-settings', label: 'Cookie-Einstellungen', icon: '🍪', href: '/cookie-einstellungen.html', keywords: ['cookie','consent','dsgvo'] }
];

function matchActions(q) {
  if (!q || q.length < 2) return [];
  const Q = q.toLowerCase();
  return QUICK_ACTIONS.filter(a =>
    a.label.toLowerCase().includes(Q) || a.keywords.some(k => k.includes(Q))
  ).slice(0, 5);
}

module.exports.__matchActions = matchActions;
module.exports.__QUICK_ACTIONS = QUICK_ACTIONS;

// ─── M³⁹ P2: Static-Seed Normen für Server-Side-Volltext ────────────────────
// Subset der wichtigsten DIN/WTA/VOB-Normen — Frontend hat 263 inline,
// Server-Seed deckt die häufigsten 50+ ab. Ziel: Marcel-Direktive
// "Tippe DIN 985 → finde die Norm" funktional via Lambda + Frontend-Cache.
const NORMEN_SEED = [
  { id: 'DIN 4108', titel: 'Wärmeschutz und Energie-Einsparung in Gebäuden', bereich: 'Bauphysik' },
  { id: 'DIN 4108-2', titel: 'Mindestanforderungen Wärmeschutz', bereich: 'Bauphysik' },
  { id: 'DIN 4108-3', titel: 'Klimabedingter Feuchteschutz', bereich: 'Bauphysik' },
  { id: 'DIN 4109', titel: 'Schallschutz im Hochbau', bereich: 'Akustik' },
  { id: 'DIN 18195', titel: 'Bauwerksabdichtungen (zurückgezogen, ersetzt durch DIN 18531-18535)', bereich: 'Abdichtung' },
  { id: 'DIN 18531', titel: 'Abdichtung von Dächern und Balkonen', bereich: 'Abdichtung' },
  { id: 'DIN 18532', titel: 'Abdichtung befahrener Verkehrsflächen', bereich: 'Abdichtung' },
  { id: 'DIN 18533', titel: 'Abdichtung erdberührter Bauteile', bereich: 'Abdichtung' },
  { id: 'DIN 18534', titel: 'Abdichtung in Innenräumen', bereich: 'Abdichtung' },
  { id: 'DIN 18535', titel: 'Abdichtung von Behältern und Becken', bereich: 'Abdichtung' },
  { id: 'DIN 277', titel: 'Grundflächen und Rauminhalte im Bauwesen', bereich: 'Wertgutachten' },
  { id: 'DIN 18065', titel: 'Gebäudetreppen — Begriffe, Messregeln, Hauptmaße', bereich: 'Hochbau' },
  { id: 'DIN 18960', titel: 'Nutzungskosten im Hochbau', bereich: 'Wirtschaftlichkeit' },
  { id: 'DIN EN ISO 13788', titel: 'Wärme- und feuchtetechnisches Verhalten von Bauteilen', bereich: 'Bauphysik' },
  { id: 'DIN ISO 16000-1', titel: 'Innenraumluft — Probenahmestrategie', bereich: 'Innenraum' },
  { id: 'DIN ISO 16000-17', titel: 'Schimmelpilze — Kultivierungsverfahren', bereich: 'Schimmel' },
  { id: 'DIN 68800-1', titel: 'Holzschutz — Allgemeines', bereich: 'Holzschutz' },
  { id: 'DIN 68800-2', titel: 'Holzschutz — Vorbeugende bauliche Maßnahmen', bereich: 'Holzschutz' },
  { id: 'DIN 68800-3', titel: 'Holzschutz — Vorbeugender chemischer Schutz', bereich: 'Holzschutz' },
  { id: 'DIN 68800-4', titel: 'Holzschutz — Bekämpfungsmaßnahmen', bereich: 'Holzschutz' },
  { id: 'DIN 985', titel: 'Selbstsichernde Sechskantmuttern (Stop-Mutter)', bereich: 'Verbindungselemente' },
  { id: 'DIN 988', titel: 'Passscheiben und Sicherungsringe', bereich: 'Verbindungselemente' },
  { id: 'DIN EN 13501-1', titel: 'Klassifizierung Bauprodukte Brandverhalten', bereich: 'Brandschutz' },
  { id: 'DIN 4102-4', titel: 'Brandverhalten Klassifizierung', bereich: 'Brandschutz' },
  { id: 'DIN 18230', titel: 'Baulicher Brandschutz Industriebau', bereich: 'Brandschutz' },
  { id: 'WTA 6-1-01', titel: 'Leitfaden hygrothermische Simulationen', bereich: 'Bauphysik' },
  { id: 'WTA 6-2', titel: 'Bauinstandsetzung — Schimmelpilzbefall', bereich: 'Schimmel' },
  { id: 'WTA 4-5', titel: 'Beurteilung von Mauerwerk', bereich: 'Mauerwerk' },
  { id: 'VdS 3151', titel: 'Leitfaden Wasserschadentrocknung', bereich: 'Wasserschaden' },
  { id: 'VdS 2298', titel: 'Leitfaden Brandschutz', bereich: 'Brandschutz' },
  { id: 'VOB/B', titel: 'Vergabe- und Vertragsordnung für Bauleistungen Teil B', bereich: 'Bau-Vertragsrecht' },
  { id: 'VOB/B § 4', titel: 'Bedenken-Anzeige', bereich: 'Bau-Vertragsrecht' },
  { id: 'VOB/B § 6', titel: 'Behinderungs-Anzeige', bereich: 'Bau-Vertragsrecht' },
  { id: 'EnEV', titel: 'Energieeinsparverordnung (außer Kraft seit GEG)', bereich: 'Energie' },
  { id: 'GEG', titel: 'Gebäudeenergiegesetz', bereich: 'Energie' },
  { id: 'ImmoWertV', titel: 'Immobilienwertermittlungsverordnung', bereich: 'Wertgutachten' },
  { id: 'JVEG', titel: 'Justizvergütungs- und -entschädigungsgesetz', bereich: 'Honorar' },
  { id: 'JVEG § 4', titel: 'Vorschuss', bereich: 'Honorar' },
  { id: 'JVEG § 9', titel: 'Stundensätze für Sachverständige', bereich: 'Honorar' },
  { id: 'ZPO § 407a', titel: 'Weitere Pflichten des Sachverständigen', bereich: 'Prozessrecht' },
  { id: 'ZPO § 411', titel: 'Schriftliches Gutachten + Frist', bereich: 'Prozessrecht' },
  { id: 'ZPO § 406', titel: 'Ablehnung des Sachverständigen', bereich: 'Prozessrecht' },
  { id: 'BGB § 286', titel: 'Verzug — Mahnung', bereich: 'Schuldrecht' },
  { id: 'BGB § 288', titel: 'Verzugszinsen', bereich: 'Schuldrecht' },
  { id: 'UStG § 14', titel: 'Pflichtangaben Rechnung', bereich: 'Steuerrecht' },
  { id: 'DIN 5008', titel: 'Geschäftsbrief — Schreib- und Gestaltungsregeln', bereich: 'Korrespondenz' },
  { id: 'WoFlV', titel: 'Wohnflächenverordnung', bereich: 'Wertgutachten' },
  { id: 'BauO NRW', titel: 'Bauordnung Nordrhein-Westfalen', bereich: 'Baurecht' },
  { id: 'EU AI Act Art. 50', titel: 'Transparenz-Pflicht KI-generierter Inhalte', bereich: 'KI-Recht' },
  { id: 'DSGVO Art. 30', titel: 'Verzeichnis von Verarbeitungstätigkeiten', bereich: 'Datenschutz' },
  { id: 'DSGVO Art. 32', titel: 'Sicherheit der Verarbeitung (TOMs)', bereich: 'Datenschutz' }
];

function matchNormen(q, limit) {
  if (!q || q.length < 2) return [];
  const Q = q.toLowerCase();
  return NORMEN_SEED.filter(n =>
    n.id.toLowerCase().includes(Q) ||
    n.titel.toLowerCase().includes(Q) ||
    n.bereich.toLowerCase().includes(Q)
  ).slice(0, limit);
}

module.exports.__matchNormen = matchNormen;
module.exports.__NORMEN_SEED = NORMEN_SEED;
