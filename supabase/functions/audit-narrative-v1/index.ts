// MEGA62 Phase 0 Item 0.9 — audit-narrative-v1 (FULL)
// Datum: 2026-05-12
// Tech-Log -> deutsche Klartext-Narrative. Deterministische Templates.
// KEIN KI-Call. Wird im Historie-Tab live aufgerufen.
//
// Input:  { entries: AuditTrailRow[] }  oder  { auftrag_id?, workspace_id?, limit?, kategorie? }
// Output: { narratives: [{ id, narrative, kategorie, created_at }] }

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

type AuditRow = {
  id: string;
  action: string;
  entity_typ: string | null;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  source: string | null;
  ki_model: string | null;
  kategorie: string | null;
  created_at: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);

  const sb = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData } = await sb.auth.getUser(auth.slice(7));
  if (!userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return J({ error: 'INVALID_JSON' }, 400); }

  let rows: AuditRow[] = [];

  if (Array.isArray(body?.entries) && body.entries.length > 0) {
    rows = body.entries as AuditRow[];
  } else {
    const auftrag_id: string | undefined = body?.auftrag_id;
    const kategorie: string | undefined = body?.kategorie;
    const limit = Math.max(1, Math.min(200, Number(body?.limit ?? 50)));

    let q = sb.from('audit_trail')
      .select('id, action, entity_typ, entity_id, payload, source, ki_model, kategorie, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (auftrag_id) q = q.or(`entity_id.eq.${auftrag_id},payload->>auftrag_id.eq.${auftrag_id}`);
    if (kategorie) q = q.eq('kategorie', kategorie);

    const { data, error } = await q;
    if (error) return J({ error: 'DB_ERROR', detail: error.message }, 500);
    rows = (data ?? []) as AuditRow[];
  }

  const narratives = rows.map((row) => ({
    id: row.id,
    kategorie: row.kategorie,
    created_at: row.created_at,
    narrative: renderNarrative(row)
  }));

  return J({ success: true, count: narratives.length, narratives }, 200);
});

function renderNarrative(row: AuditRow): string {
  const d = new Date(row.created_at);
  const datum = d.toLocaleDateString('de-DE');
  const zeit = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const az = (row.payload?.az as string) || (row.payload?.aktenzeichen as string) || '';
  const titel = (row.payload?.titel as string) || (row.payload?.title as string) || '';
  const entity = row.entity_typ ?? '';

  switch (row.action) {
    case 'create': {
      if (entity === 'auftrag' || entity === 'auftraege') {
        return `Du hast am ${datum} um ${zeit} die Akte ${az || row.entity_id || ''} angelegt.`;
      }
      if (entity === 'dokument' || entity === 'dokumente') {
        return `Du hast am ${datum} um ${zeit} das Dokument ${titel || row.entity_id || ''} erstellt.`;
      }
      return `Du hast am ${datum} um ${zeit} einen Eintrag (${entity || 'unbekannt'}) angelegt.`;
    }
    case 'update': {
      if (entity === 'auftrag' || entity === 'auftraege') {
        return `Du hast am ${datum} um ${zeit} die Akte ${az || row.entity_id || ''} bearbeitet.`;
      }
      return `Du hast am ${datum} um ${zeit} ${entity || 'einen Datensatz'} aktualisiert.`;
    }
    case 'delete': {
      return `Du hast am ${datum} um ${zeit} ${entity || 'einen Datensatz'} ${az ? `(${az}) ` : ''}geloescht.`;
    }
    case 'login': {
      return `Du hast dich am ${datum} um ${zeit} angemeldet.`;
    }
    case 'logout': {
      return `Du hast dich am ${datum} um ${zeit} abgemeldet.`;
    }
    case 'login_failed': {
      return `Am ${datum} um ${zeit} schlug ein Login-Versuch fehl.`;
    }
    case 'ki_request': {
      const purpose = (row.payload?.purpose as string) || (row.payload?.funktion as string) || 'KI-Anfrage';
      return `Du hast am ${datum} um ${zeit} die KI fuer »${purpose}« um Hilfe gebeten.`;
    }
    case 'ki_response': {
      const purpose = (row.payload?.purpose as string) || 'KI-Antwort';
      const wirkung = (row.payload?.wirkung as string) || '';
      if (wirkung === 'uebernommen') return `Du hast am ${datum} um ${zeit} einen KI-Vorschlag (${purpose}) uebernommen.`;
      if (wirkung === 'verworfen') return `Du hast am ${datum} um ${zeit} einen KI-Vorschlag (${purpose}) abgelehnt.`;
      if (wirkung === 'bearbeitet') return `Du hast am ${datum} um ${zeit} einen KI-Vorschlag (${purpose}) angepasst uebernommen.`;
      return `Die KI lieferte am ${datum} um ${zeit} eine Antwort fuer »${purpose}«.`;
    }
    case 'pdf_generate': {
      return `Du hast am ${datum} um ${zeit} ${titel ? `»${titel}« ` : ''}als PDF erstellt.`;
    }
    case 'pdf_view': {
      return `Du hast am ${datum} um ${zeit} ein PDF aufgerufen.`;
    }
    case 'pdf_send': {
      const empfaenger = (row.payload?.empfaenger as string) || (row.payload?.recipient as string) || '';
      return `Du hast am ${datum} um ${zeit} ein PDF ${empfaenger ? `an ${empfaenger} ` : ''}versendet.`;
    }
    case 'export': {
      return `Du hast am ${datum} um ${zeit} Daten exportiert.`;
    }
    case 'import': {
      return `Du hast am ${datum} um ${zeit} Daten importiert.`;
    }
    case 'data_export_dsgvo': {
      return `Am ${datum} um ${zeit} wurde ein DSGVO-Datenexport durchgefuehrt.`;
    }
    case 'data_delete_dsgvo': {
      return `Am ${datum} um ${zeit} wurde eine DSGVO-Loeschung durchgefuehrt.`;
    }
    case 'workspace_invite': {
      const email = (row.payload?.email as string) || (row.payload?.empfaenger as string) || '';
      return `Du hast am ${datum} um ${zeit} ${email ? email + ' ' : ''}in den Workspace eingeladen.`;
    }
    case 'workspace_remove_member': {
      return `Am ${datum} um ${zeit} wurde ein Mitglied aus dem Workspace entfernt.`;
    }
    default: {
      return `Aktion »${row.action}« am ${datum} um ${zeit}${entity ? ` (${entity})` : ''}.`;
    }
  }
}
