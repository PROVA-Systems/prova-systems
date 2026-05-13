/**
 * PROVA Edge Function — migrate-normen-airtable (MEGA⁶⁹-INTEGRATION-PATCH-2 A.1)
 *
 * One-Off-Migration: 100+ Normen aus Airtable tblnceVJIW7BjHsPF → normen_bibliothek.
 * Idempotent via airtable_record_id-Check.
 *
 * Admin-Only: Email-Match auf marcel.schreiber@prova-systems.de + JWT-validiert.
 *
 * Secrets:
 *   AIRTABLE_PAT (Personal Access Token, primary)
 *   AIRTABLE_API_KEY (alias-Fallback)
 *
 * Response:
 *   { migrated, skipped, errors[], total, page_count }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const AIRTABLE_PAT = Deno.env.get('AIRTABLE_PAT') ?? Deno.env.get('AIRTABLE_API_KEY') ?? '';
const AIRTABLE_BASE = Deno.env.get('AIRTABLE_BASE_ID') ?? 'appJ7bLlAHZoxENWE';
const NORMEN_TABLE = 'tblnceVJIW7BjHsPF';

const ADMIN_EMAIL = 'marcel.schreiber@prova-systems.de';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}
interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

async function fetchAllRecords(): Promise<AirtableRecord[]> {
  const all: AirtableRecord[] = [];
  let offset: string | undefined;
  let pageCount = 0;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${NORMEN_TABLE}`);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);
    const resp = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` }
    });
    if (!resp.ok) throw new Error(`Airtable ${resp.status}: ${await resp.text()}`);
    const json = await resp.json() as AirtableResponse;
    all.push(...(json.records || []));
    offset = json.offset;
    pageCount++;
    if (pageCount > 50) break; // safety: 5000 records max
  } while (offset);
  return all;
}

function mapRecord(rec: AirtableRecord) {
  const f = rec.fields;
  // Field-IDs aus Airtable-Schema
  const get = (key: string): any => (f as any)[key];
  return {
    norm_nr: String(get('Norm-Nummer') || get('Norm-Nr') || rec.id),
    titel: String(get('Titel') || ''),
    bereich: get('Bereich') ? String(get('Bereich')) : null,
    schadensarten: Array.isArray(get('Schadensarten')) ? get('Schadensarten') : null,
    anwendung: get('Anwendung') ? String(get('Anwendung')) : null,
    grenzwerte: get('Grenzwerte') ? String(get('Grenzwerte')) : null,
    messtechnik: get('Messtechnik') ? String(get('Messtechnik')) : null,
    gutachter_hinweis: get('Gutachter-Hinweis') ? String(get('Gutachter-Hinweis')) : null,
    haeufigkeit: get('Häufigkeit') ? String(get('Häufigkeit')) : null,
    aktiv: typeof get('Aktiv') === 'boolean' ? get('Aktiv') : true,
    letzte_pruefung: get('Letzte_Pruefung') ? String(get('Letzte_Pruefung')) : null,
    is_master: true,
    is_global: true,
    importiert_aus_airtable: true,
    airtable_record_id: rec.id,
    workspace_id: null,
    quelle: 'airtable-migration-2026-05-13'
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!AIRTABLE_PAT) return J({ error: 'AIRTABLE_PAT not set in Supabase Edge Function Secrets' }, 500);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);

  // Verify caller is admin
  const userClient = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData } = await userClient.auth.getUser(auth.slice(7));
  if (!userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);
  if (userData.user.email !== ADMIN_EMAIL) {
    return J({ error: 'FORBIDDEN', detail: `Admin-only (${ADMIN_EMAIL})` }, 403);
  }

  // Service-Role-Client for migrations (bypasses RLS, needed for is_global rows with workspace_id=NULL)
  const sb = createClient(SB_URL, SB_SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    // 1. Existing-Map laden
    const { data: existing } = await sb.from('normen_bibliothek')
      .select('airtable_record_id')
      .not('airtable_record_id', 'is', null);
    const existingIds = new Set((existing || []).map(r => r.airtable_record_id));

    // 2. Airtable holen (paginiert)
    const records = await fetchAllRecords();

    // 3. Pro Record: INSERT wenn nicht existing
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const rec of records) {
      if (existingIds.has(rec.id)) { skipped++; continue; }
      try {
        const payload = mapRecord(rec);
        if (!payload.norm_nr || !payload.titel) { skipped++; continue; }
        const { error } = await sb.from('normen_bibliothek').insert(payload);
        if (error) {
          errors.push(`${rec.id}: ${error.message}`);
          continue;
        }
        migrated++;
      } catch (e) {
        errors.push(`${rec.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return J({
      success: true,
      total: records.length,
      migrated,
      skipped,
      errors: errors.slice(0, 20),  // truncate
      error_count: errors.length
    });
  } catch (e) {
    return J({ error: 'MIGRATION_FAILED', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});
