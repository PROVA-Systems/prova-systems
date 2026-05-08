/**
 * PROVA — kontakt-360.js (MEGA⁴¹ P7)
 *
 * GET ?kontakt_id=<uuid>
 * → 200 {
 *     kontakt: {...},
 *     statistik: { auftrag_count, rechnungen_offen_eur, gesamtumsatz_eur,
 *                  durchschnitt_bearbeitungstage, letzte_interaktion,
 *                  zahlungsverhalten_score },
 *     tabs: {
 *       auftraege:        [...],
 *       rechnungen:       [...],
 *       bescheinigungen:  [...],
 *       dokumente:        [...],
 *       fotos:            [...],
 *       skizzen:          [...],
 *       eintraege:        [...],  // Diktate + Notizen
 *       termine:          [...],
 *       korrespondenz:    [...]
 *     }
 *   }
 *
 * 9 Tabs für Kontakt-360°-View. Workspace-RLS-isoliert.
 * Performance-Ziel: <2s für Kontakt mit 100+ Bezügen.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

const TAB_KEYS = [
  'auftraege', 'rechnungen', 'bescheinigungen', 'dokumente',
  'fotos', 'skizzen', 'eintraege', 'termine', 'korrespondenz'
];

/**
 * Compute Statistiken aus Tab-Buckets.
 *
 * @param {Object} tabs
 * @returns {Object}
 */
function computeStatistik(tabs) {
  const auftraege = tabs.auftraege || [];
  const rechnungen = tabs.rechnungen || [];
  const termine = tabs.termine || [];
  const eintraege = tabs.eintraege || [];

  const offene_rechnungen = rechnungen.filter(r => r.status === 'offen' || r.status === 'mahnstufe_1' || r.status === 'mahnstufe_2');
  const bezahlte_rechnungen = rechnungen.filter(r => r.status === 'bezahlt');

  const rechnungen_offen_eur = offene_rechnungen.reduce((s, r) => s + (parseFloat(r.betrag_brutto || 0)), 0);
  const gesamtumsatz_eur = rechnungen.reduce((s, r) => s + (parseFloat(r.betrag_brutto || 0)), 0);

  // Durchschnittliche Bearbeitungszeit: completed_at - created_at pro Auftrag
  const completed = auftraege.filter(a => a.status === 'abgeschlossen' && a.created_at && a.abgeschlossen_at);
  const totalDays = completed.reduce((s, a) => {
    const start = new Date(a.created_at).getTime();
    const end = new Date(a.abgeschlossen_at).getTime();
    return s + (end - start) / (1000 * 60 * 60 * 24);
  }, 0);
  const durchschnitt_bearbeitungstage = completed.length > 0 ? Math.round(totalDays / completed.length) : null;

  // Letzte Interaktion: max(created_at) über alle Tabs
  let letzte_interaktion = null;
  TAB_KEYS.forEach(k => {
    (tabs[k] || []).forEach(item => {
      const dt = item.updated_at || item.created_at || item.start_at;
      if (dt && (!letzte_interaktion || dt > letzte_interaktion)) letzte_interaktion = dt;
    });
  });

  // Zahlungsverhalten-Score: 0-100
  // 100 = alle bezahlt rechtzeitig, 0 = alle in Mahnstufe
  let zahlungsverhalten_score = null;
  if (rechnungen.length > 0) {
    const mahnstufen = rechnungen.filter(r => /mahn/.test(r.status || ''));
    const score = Math.round((1 - mahnstufen.length / rechnungen.length) * 100);
    zahlungsverhalten_score = score;
  }

  return {
    auftrag_count: auftraege.length,
    rechnungen_offen_count: offene_rechnungen.length,
    rechnungen_offen_eur: Math.round(rechnungen_offen_eur * 100) / 100,
    rechnungen_bezahlt_count: bezahlte_rechnungen.length,
    gesamtumsatz_eur: Math.round(gesamtumsatz_eur * 100) / 100,
    durchschnitt_bearbeitungstage: durchschnitt_bearbeitungstage,
    letzte_interaktion: letzte_interaktion,
    zahlungsverhalten_score: zahlungsverhalten_score,
    fotos_count: (tabs.fotos || []).length,
    skizzen_count: (tabs.skizzen || []).length,
    eintraege_count: (tabs.eintraege || []).length,
    termine_count: termine.length,
    bescheinigungen_count: (tabs.bescheinigungen || []).length,
    dokumente_count: (tabs.dokumente || []).length,
    korrespondenz_count: (tabs.korrespondenz || []).length
  };
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const q = event.queryStringParameters || {};
  if (!q.kontakt_id) return jsonResponse(event, 400, { error: 'kontakt_id pflicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  const t0 = Date.now();
  try {
    // Workspace-Resolve
    const { data: profile } = await sb.from('profiles').select('id').eq('email', context.userEmail).maybeSingle();
    if (!profile) return jsonResponse(event, 404, { error: 'Profile nicht gefunden' });
    const { data: ms } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', profile.id).limit(1).maybeSingle();
    if (!ms) return jsonResponse(event, 404, { error: 'Kein Workspace' });

    // Kontakt
    const { data: kontakt, error: kErr } = await sb.from('kontakte')
      .select('id, workspace_id, name, vorname, firma, email, telefon, strasse, plz, ort, typ, created_at')
      .eq('id', q.kontakt_id).maybeSingle();
    if (kErr) return jsonResponse(event, 500, { error: kErr.message });
    if (!kontakt) return jsonResponse(event, 404, { error: 'Kontakt nicht gefunden' });
    if (kontakt.workspace_id !== ms.workspace_id) return jsonResponse(event, 403, { error: 'Workspace-Zugriff verweigert' });

    // Aufträge via auftrag_kontakte (M:N) ODER direktes kontakt_id-FK
    let auftragIds = [];
    try {
      const { data: linked } = await sb.from('auftrag_kontakte')
        .select('auftrag_id').eq('kontakt_id', q.kontakt_id);
      auftragIds = (linked || []).map(x => x.auftrag_id);
    } catch (_) { /* auftrag_kontakte fehlt evtl. — fallback below */ }

    const { data: directAuftraege } = await sb.from('auftraege')
      .select('id, az, aktenzeichen, titel, status, gegenstand, beauftragt_am, created_at, abgeschlossen_at, updated_at, kontakt_id')
      .or('kontakt_id.eq.' + q.kontakt_id + (auftragIds.length > 0 ? ',id.in.(' + auftragIds.join(',') + ')' : ''))
      .order('created_at', { ascending: false }).limit(200);

    const auftraege = directAuftraege || [];
    const allAuftragIds = auftraege.map(a => a.id);

    // Parallel: Rechnungen + Termine + Eintraege + Dokumente + Bescheinigungen + Korrespondenz
    const queries = allAuftragIds.length > 0 ? Promise.all([
      sb.from('rechnungen').select('id, rechnungsnr, betrag_brutto, status, created_at, faellig_am, bezahlt_am, auftrag_id').in('auftrag_id', allAuftragIds).order('created_at', { ascending: false }),
      sb.from('termine').select('id, titel, start_at, end_at, status, auftrag_id, created_at').in('auftrag_id', allAuftragIds).order('start_at', { ascending: false }),
      sb.from('eintraege').select('id, typ, titel, content, datum, nr, auftrag_id, created_at').in('auftrag_id', allAuftragIds).order('datum', { ascending: false }).limit(100),
      sb.from('dokumente').select('id, betreff, typ, status, created_at, auftrag_id').in('auftrag_id', allAuftragIds).order('created_at', { ascending: false })
    ]) : Promise.resolve([{ data: [] }, { data: [] }, { data: [] }, { data: [] }]);

    const [rechRes, termRes, eintRes, dokRes] = await queries;

    // Fotos via eintraege (foto_ids[])
    const fotoIds = [];
    (eintRes.data || []).forEach(e => (e.foto_ids || []).forEach(f => fotoIds.push(f)));
    let fotos = [];
    if (fotoIds.length > 0) {
      const { data: fotoData } = await sb.from('fotos')
        .select('id, url, public_url, beschreibung, alt, created_at')
        .in('id', fotoIds).limit(200);
      fotos = fotoData || [];
    }

    // Skizzen = Untermenge der eintraege mit typ='skizze'
    const skizzen = (eintRes.data || []).filter(e => e.typ === 'skizze');

    // Korrespondenz: spezielle dokumente mit typ='brief' oder eigene Tabelle
    const korrespondenz = (dokRes.data || []).filter(d => /brief|korrespondenz|email/i.test(d.typ || ''));

    // Bescheinigungen: dokumente mit typ='bescheinigung-*' oder eigene
    const bescheinigungen = (dokRes.data || []).filter(d => /bescheinigung|bes-/i.test(d.typ || ''));

    const tabs = {
      auftraege: auftraege,
      rechnungen: rechRes.data || [],
      termine: termRes.data || [],
      eintraege: eintRes.data || [],
      dokumente: dokRes.data || [],
      fotos: fotos,
      skizzen: skizzen,
      korrespondenz: korrespondenz,
      bescheinigungen: bescheinigungen
    };

    const statistik = computeStatistik(tabs);

    return jsonResponse(event, 200, {
      kontakt: kontakt,
      statistik: statistik,
      tabs: tabs,
      duration_ms: Date.now() - t0,
      tab_count: TAB_KEYS.length
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'kontakt-360' });

module.exports.__internals = {
  TAB_KEYS,
  computeStatistik
};
