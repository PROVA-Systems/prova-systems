/* ============================================================
   PROVA Supabase Adapters (MEGA⁷²-Phase-B-mini, 2026-05-14)

   Extracted from akte-logic.js, dashboard-logic.js, freigabe-logic.js
   (originally inline, duplicated 3× from Phase A).

   Convention:
   - All functions adapt Supabase rows → Airtable-style {CapitalCase}
     field objects for backward-compat with downstream render-code.
   - Reference: docs/CLEANUP-FIELD-MAPPING.md
   - Module-Style: ES-Module mit named exports. Consumer-Files importieren
     via dynamic import (`var ad = await import('/lib/prova-supabase-adapters.js');`)
     da bestehende *-logic.js classic scripts sind.
============================================================ */
'use strict';

// ── Supabase Singleton Lazy-Loader ──
let _sb = null;
export async function getSupabase(){
  if (_sb) return _sb;
  try {
    const mod = await import('/lib/supabase-client.js');
    _sb = mod.supabase || mod.default;
  } catch(e){
    console.warn('[prova-supabase-adapters] supabase-client import failed', e);
    _sb = null;
  }
  return _sb;
}

// ── ENUM-Mappings (single source of truth) ──
export const DB_STATUS_TO_UI = {
  'entwurf':       'Entwurf',
  'aktiv':         'In Bearbeitung',
  'abgeschlossen': 'Abgeschlossen',
  'archiv':        'Archiv',
  'storniert':     'Storniert'
};

export const UI_STATUS_TO_DB = {
  'Entwurf':        'entwurf',
  'In Bearbeitung': 'aktiv',
  'Aktiv':          'aktiv',
  'Abgeschlossen':  'abgeschlossen',
  'Freigegeben':    'abgeschlossen',
  'Archiv':         'archiv',
  'Archiviert':     'archiv',
  'Storniert':      'storniert'
};

// ── Adapter: auftraege-Row → Airtable-Style fields ──
export function auftragRowToFields(row){
  if(!row) return {};
  const o = row.objekt || {};
  const d = row.details || {};
  const ag = d.auftraggeber || {};
  return {
    id: row.id,
    Aktenzeichen: row.az || '',
    Titel: row.titel || '',
    Status: DB_STATUS_TO_UI[row.status] || row.status || 'In Bearbeitung',
    Phase: row.phase_aktuell || 1,
    Phase_Max: row.phase_max || 9,
    Typ: row.typ || '',
    Zweck: row.zweck || '',
    Fragestellung: row.fragestellung || '',
    // Schadens-Felder
    Schadensart: row.schadensart_label || '',
    Schadenart: row.schadensart_label || '',
    Schadensdatum: row.schadensstichtag || '',
    Auftragsdatum: row.auftragsdatum || '',
    // objekt jsonb
    Schaden_Strasse: o.adresse || o.strasse || '',
    Schaden_PLZ: o.plz || '',
    Schaden_Ort: o.ort || '',
    PLZ: o.plz || '',
    Ort: o.ort || '',
    Adresse: o.adresse || '',
    Gebaeudetyp: o.objektart || o.gebaeudetyp || '',
    Baujahr: o.baujahr || '',
    // details jsonb (auftraggeber sub-object)
    Auftraggeber_Name: ag.name || '',
    Auftraggeber_Typ: ag.typ_label || row.auftraggeber_typ || '',
    Auftraggeber_Email: ag.email || '',
    Ansprechpartner: ag.ansprechpartner || '',
    Ortstermin_Datum: d.ortstermin_datum || '',
    Beweisfragen: d.beweisfragen || '',
    Schadensnummer_Versicherung: d.schadensnummer_versicherung || '',
    // Fachurteil
    KI_Entwurf: row.fachurteil_text || '',
    Fachurteil: row.fachurteil_text || '',
    Kurzbeantwortung: row.kurzbeantwortung || '',
    // Kosten
    Kosten_Netto: row.kosten_geschaetzt_netto || null,
    Kosten_Brutto: row.kosten_geschaetzt_brutto || null,
    // 4-Flow-Architektur-Mapping
    Flow: row.typ === 'wertgutachten' ? 'B'
        : row.typ === 'beratung'      ? 'C'
        : row.typ === 'baubegleitung' ? 'D'
        : 'A',
    // Timestamps
    Timestamp: row.created_at || '',
    Updated_At: row.updated_at || '',
    // Misc
    SV_Email: typeof localStorage !== 'undefined' ? (localStorage.getItem('prova_sv_email') || '') : '',
    is_demo: row.is_demo || false,
    tags: row.tags || [],
    // Reverse-Refs für State-Mutation
    _supabaseId: row.id,
    _supabaseRow: row
  };
}

// ── Adapter: termine-Row → Airtable-Style ──
export function terminRowToFields(t){
  if(!t) return {};
  return {
    id: t.id,
    titel: t.titel,
    Titel: t.titel,
    termin_typ: t.typ,
    Termin_Typ: t.typ,
    termin_datum: t.datum,
    Termin_Datum: t.datum,
    Datum: t.datum,
    Uhrzeit_Von: t.uhrzeit_von,
    Uhrzeit_Bis: t.uhrzeit_bis,
    beschreibung: t.beschreibung,
    Beschreibung: t.beschreibung,
    Ort_Adresse: t.ort_adresse,
    Ort_PLZ: t.ort_plz,
    Ort_Ort: t.ort_ort,
    Status: t.status,
    status: t.status,
    Auftrag_Id: t.auftrag_id,
    Kontakt_Id: t.kontakt_id,
    Timestamp: t.created_at,
    _supabaseRow: t
  };
}

// ── Adapter: fristen-Row → Airtable-Style ──
export function fristRowToFields(f){
  if(!f) return {};
  return {
    id: f.id,
    Frist_Typ: f.frist_typ,
    frist_typ: f.frist_typ,
    Datum_Soll: f.datum_soll,
    datum_soll: f.datum_soll,
    Datum_Ist: f.datum_ist,
    Status: f.status,
    status: f.status,
    Notiz: f.notiz,
    notiz: f.notiz,
    Rechtsgrundlage: f.rechtsgrundlage,
    rechtsgrundlage: f.rechtsgrundlage,
    Pipeline: f.pipeline,
    pipeline: f.pipeline,
    Auftrag_Id: f.auftrag_id,
    auftrag_id: f.auftrag_id,
    Timestamp: f.created_at,
    _supabaseRow: f
  };
}

// ── Adapter: dokumente-Row (Rechnung/Brief/Mahnung) → Airtable-Style ──
export function dokumentRowToFields(d){
  if(!d) return {};
  return {
    id: d.id,
    Doc_Nummer: d.doc_nummer,
    doc_nummer: d.doc_nummer,
    Rechnungsnummer: d.doc_nummer,
    Briefnummer: d.doc_nummer,
    Typ: d.typ,
    typ: d.typ,
    Betreff: d.betreff,
    betreff: d.betreff,
    Inhalt: d.inhalt_text,
    inhalt_text: d.inhalt_text,
    Betrag_Netto: d.betrag_netto,
    Betrag_Brutto: d.betrag_brutto,
    Status: d.status,
    status: d.status,
    Faelligkeit: d.faelligkeit,
    Rechnungsdatum: d.rechnungsdatum || d.created_at,
    Bezahlt_At: d.bezahlt_at,
    Mahn_Stufe: d.mahn_stufe || 0,
    Mahn_Datum_Letzte: d.mahn_datum_letzte,
    Auftrag_Id: d.auftrag_id,
    auftrag_id: d.auftrag_id,
    Kontakt_Id: d.kontakt_id,
    Storage_Path: d.storage_path,
    Timestamp: d.created_at,
    Updated_At: d.updated_at,
    _supabaseRow: d
  };
}

// ── Adapter: ki_protokoll-Row → Airtable-Style (für statistiken) ──
export function kiProtokollRowToFields(k){
  if(!k) return {};
  return {
    id: k.id,
    Purpose: k.purpose,
    purpose: k.purpose,
    Funktion: k.funktion,
    Modell: k.modell,
    modell: k.modell,
    Provider: k.provider,
    Tokens_In: k.tokens_in,
    Tokens_Out: k.tokens_out,
    Token_Total: k.token_total,
    Kosten_EUR: k.kosten_eur,
    Status: k.status,
    Wirkung: k.wirkung,
    Created_At: k.created_at,
    User_Id: k.user_id,
    Auftrag_Id: k.auftrag_id,
    _supabaseRow: k
  };
}

// ── Workspace-ID-Lookup für Filter-Queries (wo RLS nicht ausreicht) ──
export async function getCurrentWorkspaceId(){
  // localStorage-Fallback aus auth-guard.js setup
  if (typeof localStorage !== 'undefined') {
    var ws = localStorage.getItem('prova_workspace_id');
    if (ws) return ws;
  }
  // Resolve via Supabase memberships
  try {
    const sb = await getSupabase();
    if (!sb) return null;
    const sess = await sb.auth.getSession();
    const userId = sess?.data?.session?.user?.id;
    if (!userId) return null;
    const r = await sb.from('workspace_memberships')
      .select('workspace_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
    return r?.data?.workspace_id || null;
  } catch(e){ return null; }
}

// ── 4-Flow Type-Mapping (Auftragstyp → Flow-Letter) ──
export function typToFlow(typ){
  if (!typ) return 'A';
  if (typ === 'wertgutachten') return 'B';
  if (typ === 'beratung')      return 'C';
  if (typ === 'baubegleitung') return 'D';
  return 'A';
}

// ════════════════════════════════════════════════════════════
//  MEGA⁷⁵-F Erweiterungen (Sprint F Phase 3 Batch 1)
// ════════════════════════════════════════════════════════════

// ── Adapter: kontakte-Row → Airtable-Style ──
export function kontaktRowToFields(k){
  if(!k) return {};
  return {
    id: k.id,
    Name: k.nachname || '',
    Nachname: k.nachname || '',
    Vorname: k.vorname || '',
    Firma: k.firma || '',
    Email: k.email || '',
    Telefon: k.telefon || '',
    Adresse: k.adresse_strasse || '',
    PLZ: k.adresse_plz || '',
    Ort: k.adresse_ort || '',
    Typ: k.kontakt_typ || '',
    Kontakt_Typ: k.kontakt_typ || '',
    Notiz: k.notizen || '',
    Notizen: k.notizen || '',
    Timestamp: k.created_at,
    _supabaseRow: k
  };
}

// ── Adapter: users + workspaces (SV-Profil) → Airtable-Style ──
// Aufruf: usersRowToFields(userRow, workspaceRow?)
export function usersRowToFields(u, ws){
  if(!u) return {};
  ws = ws || {};
  return {
    id: u.id,
    Email: u.email || '',
    Vorname: u.vorname || '',
    Nachname: u.nachname || '',
    Name: ((u.vorname || '') + ' ' + (u.nachname || '')).trim(),
    Telefon: u.telefon || '',
    Adresse: u.adresse_strasse || '',
    PLZ: u.adresse_plz || '',
    Ort: u.adresse_ort || '',
    Qualifikation: u.qualifikation_jsonb || [],
    Founding_Member: !!u.founding_member,
    Buero_Name: ws.buero_name || '',
    Buero_Adresse: ws.buero_adresse_strasse || '',
    Buero_PLZ: ws.buero_adresse_plz || '',
    Buero_Ort: ws.buero_adresse_ort || '',
    Paket: ws.paket || u.paket || 'Solo',
    Abo_Status: ws.abo_status || '',
    Trial_Endet_Am: ws.trial_endet_am || '',
    Onboarding_Completed_At: u.onboarding_completed_at || '',
    _supabaseUser: u,
    _supabaseWorkspace: ws
  };
}

// ── Inverse: Airtable-Style fields → users-Row-Update ──
// Nur erlaubte users-Spalten, Rest in workspaces.
export function fieldsToUsersUpdate(fields){
  const out = {};
  if (fields.Vorname !== undefined)      out.vorname = fields.Vorname;
  if (fields.Nachname !== undefined)     out.nachname = fields.Nachname;
  if (fields.Telefon !== undefined)      out.telefon = fields.Telefon;
  if (fields.Adresse !== undefined)      out.adresse_strasse = fields.Adresse;
  if (fields.PLZ !== undefined)          out.adresse_plz = fields.PLZ;
  if (fields.Ort !== undefined)          out.adresse_ort = fields.Ort;
  if (fields.Qualifikation !== undefined) out.qualifikation_jsonb = fields.Qualifikation;
  return out;
}

export function fieldsToWorkspacesUpdate(fields){
  const out = {};
  if (fields.Buero_Name !== undefined)     out.buero_name = fields.Buero_Name;
  if (fields.Buero_Adresse !== undefined)  out.buero_adresse_strasse = fields.Buero_Adresse;
  if (fields.Buero_PLZ !== undefined)      out.buero_adresse_plz = fields.Buero_PLZ;
  if (fields.Buero_Ort !== undefined)      out.buero_adresse_ort = fields.Buero_Ort;
  return out;
}

// ── Helper: Aktuellen User + Workspace-Profil laden ──
// Liefert { user, workspace, error? } für SV-Profile-Reads.
export async function loadSvProfile(){
  try {
    const sb = await getSupabase();
    if (!sb) return { error: 'no-supabase' };
    const sess = await sb.auth.getSession();
    const userId = sess?.data?.session?.user?.id;
    if (!userId) return { error: 'no-session' };
    const wsId = await getCurrentWorkspaceId();
    const [uRes, wRes] = await Promise.all([
      sb.from('users').select('*').eq('id', userId).maybeSingle(),
      wsId ? sb.from('workspaces').select('*').eq('id', wsId).maybeSingle() : Promise.resolve({ data: null })
    ]);
    if (uRes.error) return { error: uRes.error.message };
    return { user: uRes.data, workspace: wRes.data, userId, workspaceId: wsId };
  } catch(e) {
    return { error: e.message || String(e) };
  }
}

// ── Helper: Audit-Trail-Insert (RLS-konform, mit workspace_id-Auto) ──
// Aufruf-Style identisch zu früherem Airtable-Pattern. Schluckt Fehler
// damit Caller bei Audit-Fail nicht crashen.
// ── Helper: Audit-Trail-Insert (MEGA⁷⁶ Schema-konform) ──
// audit_action-Enum (Anhang B.16): create|read|update|delete|login|logout|
// login_failed|export|import|pdf_generate|pdf_view|pdf_send|ki_request|
// ki_response|workspace_invite|workspace_remove_member|data_export_dsgvo|
// data_delete_dsgvo
// Semantische Sub-Actions gehören in `kategorie` (text) oder `payload`.
// audit_source-Enum (B.17): ki|sv_eigen|sv_uebernommen|system|admin_impersonate
export async function auditTrailInsert(row){
  try {
    const sb = await getSupabase();
    if (!sb) return { ok: false, error: 'no-supabase' };
    const wsId = await getCurrentWorkspaceId();
    const sess = await sb.auth.getSession();
    const userId = sess?.data?.session?.user?.id;
    const r = row || {};
    // MEGA⁷⁶: Legacy-Action-Mapping. Frühere Caller schickten 'sv.audit.407a',
    // 'stat.jahresbericht', 'stat.ki_nutzung', 'dsgvo.einwilligung', 'create'
    // — Enum kennt nur die ~17 Werte. Mappen + Original in payload.
    const VALID_ACTIONS = new Set(['create','read','update','delete','login','logout','login_failed','export','import','pdf_generate','pdf_view','pdf_send','ki_request','ki_response','workspace_invite','workspace_remove_member','data_export_dsgvo','data_delete_dsgvo']);
    let action = r.action || 'create';
    const origAction = r.action || '';
    const kategorie = r.kategorie || (origAction.includes('.') ? origAction : null);
    if (!VALID_ACTIONS.has(action)) {
      // Heuristik
      if (/import/i.test(origAction)) action = 'import';
      else if (/export/i.test(origAction)) action = 'export';
      else if (/pdf.*send|send.*pdf/i.test(origAction)) action = 'pdf_send';
      else if (/pdf.*gen/i.test(origAction))  action = 'pdf_generate';
      else if (/ki.*request|ki_call|ki-nutzung|ki_nutzung/i.test(origAction)) action = 'ki_request';
      else if (/delete|remove/i.test(origAction)) action = 'delete';
      else if (/update|patch/i.test(origAction)) action = 'update';
      else action = 'create';
    }
    const payload = Object.assign({}, r.payload || {});
    if (r.function_name) payload._function_name = r.function_name;
    if (r.result)        payload._result = r.result;
    if (origAction && origAction !== action) payload._action_orig = origAction;
    const insertRow = {
      workspace_id: wsId,
      user_id: userId,
      action,
      entity_typ: r.entity_typ || null,
      entity_id:  r.entity_id  || null,
      kategorie:  kategorie,
      source:     r.source || 'sv_eigen',
      payload:    payload,
      ki_model:        r.ki_model || null,
      ki_confidence:   r.ki_confidence || null,
      original_ki_ref: r.original_ki_ref || null,
      eu_ai_act_disclosed: r.eu_ai_act_disclosed || null
    };
    const { error } = await sb.from('audit_trail').insert(insertRow);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch(e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// ── Helper: Brief-Generierung in dokumente loggen + Audit-Trail ──
// MEGA⁷⁶ erweitert: az-Lookup für auftrag_id, dokument_typ-Enum erlaubt,
// PDFMonkey-Refs, Audit-Trail mit kategorie=brief_typ.
//
// Aufruf:
//   logBriefGenerated({
//     az,                    // → auftrag_id Lookup
//     brief_typ,             // semantic, geht in kategorie + inhalt_strukturiert
//     dokument_typ_enum,     // dokument_typ-Enum (default 'brief')
//     betreff,
//     empfaenger_name,
//     empfaenger_email,
//     kontakt_id,
//     inhalt_text,
//     inhalt_strukturiert,   // jsonb
//     pdfmonkey_template_id,
//     pdfmonkey_document_id,
//     pdf_url,
//     status                 // dokument_status (default 'generiert')
//   })
export async function logBriefGenerated(opts){
  try {
    const sb = await getSupabase();
    if (!sb) return { ok: false, error: 'no-supabase' };
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { ok: false, error: 'no-workspace' };
    const sess = await sb.auth.getSession();
    const userId = sess?.data?.session?.user?.id || null;
    const o = opts || {};

    // az → auftrag_id Lookup
    let auftragId = o.auftrag_id || null;
    if (!auftragId && o.az) {
      try {
        const a = await sb.from('auftraege').select('id').eq('az', o.az).is('deleted_at', null).maybeSingle();
        if (a.data) auftragId = a.data.id;
      } catch(_) {}
    }

    const inhalt = o.inhalt_text || o.inhalt || o.body || '';
    const inhalt_strukturiert = Object.assign({}, o.inhalt_strukturiert || {});
    if (o.brief_typ)        inhalt_strukturiert.brief_typ = o.brief_typ;
    if (o.empfaenger_name)  inhalt_strukturiert.empfaenger_name = o.empfaenger_name;
    if (o.empfaenger_email) inhalt_strukturiert.empfaenger_email = o.empfaenger_email;
    if (o.anrede)           inhalt_strukturiert.anrede = o.anrede;
    if (o.gruss)            inhalt_strukturiert.gruss = o.gruss;

    const row = {
      workspace_id: wsId,
      typ:          o.dokument_typ_enum || 'brief',
      betreff:      o.betreff || o.subject || '',
      inhalt_text:  inhalt,
      inhalt_strukturiert,
      auftrag_id:   auftragId,
      kontakt_id:   o.kontakt_id || null,
      status:       o.status || 'generiert',
      pdfmonkey_template_id: o.pdfmonkey_template_id || null,
      pdfmonkey_document_id: o.pdfmonkey_document_id || null,
      pdf_url:      o.pdf_url || null,
      generated_at: new Date().toISOString(),
      sent_to_email: o.empfaenger_email || null,
      created_by_user_id: userId
    };
    const { data, error } = await sb.from('dokumente').insert(row).select('id').maybeSingle();
    if (error) return { ok: false, error: error.message };

    // Audit-Trail (DSGVO/§407a-Pflicht für versendete Briefe)
    if (data && data.id) {
      await auditTrailInsert({
        action:     'create',
        entity_typ: 'dokument',
        entity_id:  data.id,
        kategorie:  o.brief_typ || 'brief',
        source:     'sv_eigen',
        payload: {
          brief_typ: o.brief_typ,
          empfaenger_name: o.empfaenger_name,
          empfaenger_email: o.empfaenger_email,
          az: o.az,
          status: row.status
        }
      });
    }
    return { ok: true, id: data?.id };
  } catch(e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// ── Helper: DSGVO-Einwilligung in einwilligungen-Tabelle (MEGA⁷⁶) ──
// Tabelle EXISTIERT (Anhang A.11). Pflicht: workspace_id, user_id, typ,
// version, inhalt_hash, erteilt_at.
// einwilligung_typ-Enum (B.18): agb|datenschutzerklaerung|avv_auftragsverarbeitung|
// newsletter|cookies_marketing|cookies_analytics|ki_einsatz|407a_zpo_anzeige|
// widerruf_sofortbeginn|sonstiges
export async function logEinwilligung(opts){
  try {
    const sb = await getSupabase();
    if (!sb) return { ok: false, error: 'no-supabase' };
    const wsId = await getCurrentWorkspaceId();
    const sess = await sb.auth.getSession();
    const userId = sess?.data?.session?.user?.id;
    if (!wsId || !userId) return { ok: false, error: 'no-workspace-or-user' };
    const o = opts || {};
    // dokTyp-Mapping für Legacy-Caller (onboarding-logic schickt 'AVV','AGB','Datenschutz')
    const TYP_MAP = {
      'AVV':                       'avv_auftragsverarbeitung',
      'AGB':                       'agb',
      'Datenschutz':               'datenschutzerklaerung',
      'Datenschutzerklaerung':     'datenschutzerklaerung',
      'KI':                        'ki_einsatz',
      'KI-Einsatz':                'ki_einsatz',
      '407a':                      '407a_zpo_anzeige',
      'Newsletter':                'newsletter',
      'Cookies-Marketing':         'cookies_marketing',
      'Cookies-Analytics':         'cookies_analytics',
      'Widerruf-Sofortbeginn':     'widerruf_sofortbeginn'
    };
    const rawTyp = o.typ || o.dokTyp || o.dok_typ || '';
    const typ = TYP_MAP[rawTyp] || (typeof rawTyp === 'string' && /^[a-z_0-9]+$/.test(rawTyp) ? rawTyp : 'sonstiges');
    const row = {
      workspace_id:    wsId,
      user_id:         userId,
      typ:             typ,
      version:         String(o.version || '1.0'),
      inhalt_hash:     o.hash || o.inhalt_hash || '',
      erteilt_at:      new Date().toISOString(),
      ip_address:      o.ip_address || null,
      user_agent:      (typeof navigator !== 'undefined' ? navigator.userAgent : null),
      session_id:      o.sessionId || o.session_id || null,
      onboarding_schritt: o.onboarding_schritt || null,
      page_url:        (typeof location !== 'undefined' ? location.pathname : null)
    };
    const { error } = await sb.from('einwilligungen').insert(row);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch(e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// ── Helper: Support-Ticket schreiben (MEGA⁷⁶ A.1+A.2 DRY) ──
// Aufruf: sendSupportTicket({ titel, beschreibung, kategorie, page_url })
// Schreibt nach support_tickets + audit_trail.
export async function sendSupportTicket(opts){
  try {
    const sb = await getSupabase();
    if (!sb) return { ok: false, error: 'no-supabase' };
    const wsId = await getCurrentWorkspaceId();
    const sess = await sb.auth.getSession();
    const userId = sess?.data?.session?.user?.id || null;
    const o = opts || {};
    const userEmail = o.user_email || (typeof localStorage !== 'undefined' ? localStorage.getItem('prova_sv_email') : '') || '';
    if (!userEmail || !o.titel || !o.beschreibung) {
      return { ok: false, error: 'missing-fields' };
    }
    const row = {
      workspace_id:    wsId,
      user_id:         userId,
      user_email:      userEmail,
      titel:           o.titel,
      beschreibung:    o.beschreibung,
      typ:             o.typ || 'frage',
      prioritaet:      o.prioritaet || 'normal',
      kategorie:       o.kategorie || null,
      page_url:        o.page_url || (typeof location !== 'undefined' ? location.pathname : null),
      page_titel:      o.page_titel || (typeof document !== 'undefined' ? document.title : null),
      referrer_url:    o.referrer_url || (typeof document !== 'undefined' ? document.referrer : null) || null,
      user_agent:      (typeof navigator !== 'undefined' ? navigator.userAgent : null),
      sprach_einstellung: (typeof navigator !== 'undefined' ? navigator.language : null),
      viewport_breite: (typeof window !== 'undefined' ? window.innerWidth : null),
      viewport_hoehe:  (typeof window !== 'undefined' ? window.innerHeight : null)
    };
    const { data, error } = await sb.from('support_tickets').insert(row).select('id').maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (data && data.id) {
      await auditTrailInsert({
        action: 'create', entity_typ: 'support_ticket', entity_id: data.id,
        kategorie: o.kategorie || 'support', source: 'sv_eigen',
        payload: { quelle: o.kategorie, titel: o.titel }
      });
    }
    return { ok: true, id: data?.id };
  } catch(e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// ── Helper: Input-String → auftrag_typ-Enum-Mapping (MEGA⁷⁶A) ──
// Enum: schaden | beweis | ergaenzung | gegen | kurzstellungnahme |
//       wertgutachten | beratung | baubegleitung | schied | gericht
export function mapAuftragTyp(input){
  const s = String(input || '').trim().toLowerCase();
  if (!s) return 'schaden';
  // Reihenfolge wichtig: spezifische Tests zuerst (sonst matched 'beweissicherung' versehentlich nicht 'beweis')
  if (/baubegleit/.test(s))            return 'baubegleitung';
  if (/schiedsgut|schied/.test(s))     return 'schied';
  if (/gerichts|gericht/.test(s))      return 'gericht';
  if (/wertgut|wert/.test(s))          return 'wertgutachten';
  if (/kurzstellung|kurz/.test(s))     return 'kurzstellungnahme';
  if (/erg[aä]nz/.test(s))              return 'ergaenzung';
  if (/gegen/.test(s))                  return 'gegen';
  if (/beweis/.test(s))                 return 'beweis';
  if (/beratung/.test(s))               return 'beratung';
  if (/schaden|versicher|privat/.test(s)) return 'schaden';
  return 'schaden';
}

// ── Helper: CSV-String → kontakt_typ-Enum-Mapping (MEGA⁷⁶ A.3) ──
// Enum (B.11): privat | firma | anwalt | versicherung | gericht | behoerde |
//              sv_kollege | handwerker | sonstiges
export function mapKontaktTyp(input){
  const s = String(input || '').trim().toLowerCase();
  if (!s) return 'sonstiges';
  if (/privat|eigent|mieter|verbraucher/.test(s))           return 'privat';
  if (/firma|gmbh|\bag\b|unternehmen|kg|ohg|ug\b|gewerbe/.test(s))  return 'firma';
  if (/anwalt|kanzlei|rechtsanwalt|jurist/.test(s))         return 'anwalt';
  if (/versich/.test(s))                                     return 'versicherung';
  if (/gericht|amtsgericht|landgericht|olg|bgh/.test(s))     return 'gericht';
  if (/beh[oö]rde|amt|stadt|gemeinde|landratsamt/.test(s))  return 'behoerde';
  if (/sv\b|sachverst|kollege|gutachter/.test(s))            return 'sv_kollege';
  if (/handwerk|fachbetrieb|dachdecker|maler|elektriker|installateur/.test(s)) return 'handwerker';
  return 'sonstiges';
}
