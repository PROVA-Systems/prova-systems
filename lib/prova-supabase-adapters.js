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
