/**
 * PROVA — onboarding-create-demo.js (MEGA³² W11-I4)
 *
 * Erstellt einen Demo-Auftrag SCH-DEMO-001 für Onboarding-Erkundung.
 * Idempotent: wenn az='SCH-DEMO-001' für Workspace existiert, kein Re-Create.
 *
 * POST (Auth-Pflicht). Returns { auftrag_id, created: bool, eintraege: int, fristen: int }.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

const DEMO_AZ = 'SCH-DEMO-001';

const DEMO_AUFTRAG = {
  az: DEMO_AZ,
  typ: 'kurzstellungnahme',
  status: 'aktiv',
  zweck: 'privat',
  titel: 'Demo: Wasserschaden Beispiel-Akte',
  fragestellung: 'Liegt eine fachgerechte Verlegung der Sanitär-Leitungen vor und wie hoch ist der Sanierungsaufwand?',
  kurzbeantwortung: 'Beispiel: Die Begutachtung zeigte unsachgemäß verlegte Wasserleitungen ohne ordnungsgemäße Frostsicherung. Empfohlene Sanierung: kompletter Austausch der betroffenen Leitungsabschnitte (geschätzte Kosten ca. 4.500 € netto).',
  schadensart_label: 'Wasserschaden — Leitungswasser',
  schadensart_kategorie: 'wasser',
  schadensstichtag: '2026-04-15',
  objekt: {
    adresse_strasse: 'Musterstraße',
    adresse_nr: '12',
    plz: '12345',
    ort: 'Musterstadt',
    typ: 'einfamilienhaus',
    baujahr: 1985
  },
  details: {
    versicherung: { schadennummer: 'V-DEMO-2026-001', versicherungsart: 'gebaeude' },
    wasser: { wasser_eintrittspunkt: 'Heizungs-Steigleitung 1.OG', wasser_dauer: '3 Tage unbemerkt' }
  },
  is_demo: true
};

const DEMO_EINTRAEGE = [
  { typ: 'text', titel: 'Auftrags-Eingang', content: 'Demo-Eintrag: Auftrag von Privatperson via Email erhalten. Wasserschaden im 1. OG seit ca. 3 Tagen unbemerkt.', dauer_min: 5 },
  { typ: 'diktat', titel: 'Ortstermin-Vorbereitung', content: 'Demo-Diktat: Hilfsmittel-Liste für Ortstermin: Feuchte-Messgerät Trotec T660, Kamera, Stift, Notizblock. Kontakt mit Versicherer aufgenommen.', dauer_min: 30 },
  { typ: 'mix', titel: 'Ortstermin-Durchführung', content: 'Demo-Eintrag: Vor-Ort-Begehung durchgeführt. 3 Feuchte-Messpunkte aufgenommen, alle > 80% Materialfeuchte. Fotos angefertigt. Ursache: undichte Verschraubung an Steigleitung.', dauer_min: 90 }
];

const DEMO_FRISTEN = [
  { frist_typ: 'gutachten-erstattung', datum_offset_days: 7, notiz: 'Demo: Gutachten-Erstattung Frist', rechtsgrundlage: 'IHK-SVO § 8' },
  { frist_typ: 'honorar', datum_offset_days: 14, notiz: 'Demo: Honorar-Rechnung', rechtsgrundlage: 'JVEG § 8' }
];

const DEMO_SKIZZE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect x="20" y="20" width="360" height="260" fill="none" stroke="#1f2937" stroke-width="2"/><line x1="20" y1="150" x2="380" y2="150" stroke="#1f2937" stroke-width="1.5"/><line x1="200" y1="20" x2="200" y2="280" stroke="#1f2937" stroke-width="1.5"/><circle cx="270" cy="90" r="12" fill="none" stroke="#ef4444" stroke-width="2"/><text x="240" y="115" font-family="sans-serif" font-size="11" fill="#ef4444">Schaden 1.OG</text><text x="30" y="40" font-family="sans-serif" font-size="10" fill="#1f2937">Demo-Skizze: Grundriss</text></svg>';

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 5, 60, { event: event, functionName: 'onboarding-create-demo' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  const userId = context.userId;
  if (!userId) return jsonResponse(event, 401, { error: 'Auth required' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    // 1. Workspace-Resolve über workspace_memberships (RLS-konform)
    const { data: membership, error: mErr } = await sb.from('workspace_memberships')
      .select('workspace_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
    if (mErr) return jsonResponse(event, 500, { error: mErr.message });
    if (!membership) return jsonResponse(event, 404, { error: 'Kein aktiver Workspace gefunden' });
    const workspaceId = membership.workspace_id;

    // 2. Idempotenz: prüfen ob Demo-Auftrag schon existiert für diesen Workspace
    const { data: existing } = await sb.from('auftraege')
      .select('id').eq('workspace_id', workspaceId).eq('az', DEMO_AZ).is('deleted_at', null).maybeSingle();
    if (existing) {
      return jsonResponse(event, 200, {
        auftrag_id: existing.id, created: false,
        message: 'Demo-Fall existiert bereits'
      });
    }

    // 3. Auftrag erstellen
    const { data: auftrag, error: aErr } = await sb.from('auftraege').insert({
      ...DEMO_AUFTRAG,
      workspace_id: workspaceId,
      created_by_user_id: userId
    }).select().single();
    if (aErr) return jsonResponse(event, 500, { error: 'Auftrag-Insert fehlgeschlagen', detail: aErr.message });

    const auftragId = auftrag.id;

    // 4. Einträge
    const eintraegePayload = DEMO_EINTRAEGE.map((e, i) => ({
      ...e,
      auftrag_id: auftragId,
      workspace_id: workspaceId,
      datum: new Date(Date.now() - (DEMO_EINTRAEGE.length - i) * 86400000).toISOString().slice(0, 10),
      pseudonymisiert: true,
      konjunktiv_check_passed: false,
      abrechenbar: true,
      created_by_user_id: userId
    }));
    const { data: eintraege } = await sb.from('eintraege').insert(eintraegePayload).select('id');

    // 5. Skizze
    const { data: skizze } = await sb.from('skizzen').insert({
      auftrag_id: auftragId,
      workspace_id: workspaceId,
      titel: 'Demo: Grundriss 1.OG',
      svg_content: DEMO_SKIZZE_SVG,
      massstab: '1:50',
      notiz: 'Demo-Skizze für Schadenslokalisation',
      pseudonymisiert: true,
      created_by_user_id: userId
    }).select('id').single();

    // 6. Fristen
    const fristenPayload = DEMO_FRISTEN.map(f => ({
      auftrag_id: auftragId,
      workspace_id: workspaceId,
      frist_typ: f.frist_typ,
      pipeline: 'demo',
      datum_soll: new Date(Date.now() + f.datum_offset_days * 86400000).toISOString().slice(0, 10),
      status: 'offen',
      notiz: f.notiz,
      rechtsgrundlage: f.rechtsgrundlage,
      created_by_user_id: userId
    }));
    const { data: fristen } = await sb.from('fristen').insert(fristenPayload).select('id');

    return jsonResponse(event, 201, {
      auftrag_id: auftragId,
      created: true,
      eintraege: (eintraege || []).length,
      skizzen: skizze ? 1 : 0,
      fristen: (fristen || []).length,
      demo_url: '/akte.html?id=' + auftragId
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'onboarding-create-demo' });

module.exports.__DEMO_AZ = DEMO_AZ;
module.exports.__DEMO_AUFTRAG = DEMO_AUFTRAG;
module.exports.__DEMO_EINTRAEGE = DEMO_EINTRAEGE;
