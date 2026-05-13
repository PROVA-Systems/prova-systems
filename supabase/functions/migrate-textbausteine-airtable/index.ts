/**
 * PROVA Edge Function — migrate-textbausteine-airtable (MEGA⁶⁹-INTEGRATION-PATCH-2 A.2)
 *
 * One-Off-Migration: Textbausteine aus 2 Airtable-Tabellen → textbausteine.
 *   - tbljPQrdMDsqUzieD (Master)  → is_global=TRUE, workspace_id=NULL
 *   - tblDS8NQxzceGedJO (Custom)  → is_global=FALSE, workspace_id=Marcel-Workspace
 *
 * Idempotent via airtable_record_id.
 * Admin-Only.
 *
 * Marcel-Workspace-ID hardcoded: 65b25a13-17b7-45c0-b567-6edee235dd98
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const AIRTABLE_PAT = Deno.env.get('AIRTABLE_PAT') ?? Deno.env.get('AIRTABLE_API_KEY') ?? '';
const AIRTABLE_BASE = Deno.env.get('AIRTABLE_BASE_ID') ?? 'appJ7bLlAHZoxENWE';

const MASTER_TABLE = 'tbljPQrdMDsqUzieD';
const CUSTOM_TABLE = 'tblDS8NQxzceGedJO';
const MARCEL_WORKSPACE = '65b25a13-17b7-45c0-b567-6edee235dd98';
const ADMIN_EMAIL = 'marcel.schreiber@prova-systems.de';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

interface AirtableRecord { id: string; fields: Record<string, unknown>; createdTime: string; }

async function fetchAll(table: string): Promise<AirtableRecord[]> {
  const all: AirtableRecord[] = [];
  let offset: string | undefined;
  let pageCount = 0;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${table}`);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);
    const resp = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` } });
    if (!resp.ok) throw new Error(`Airtable ${table} ${resp.status}: ${await resp.text()}`);
    const json = await resp.json() as { records: AirtableRecord[]; offset?: string };
    all.push(...(json.records || []));
    offset = json.offset;
    pageCount++;
    if (pageCount > 50) break;
  } while (offset);
  return all;
}

function mapMaster(rec: AirtableRecord) {
  const f = rec.fields as any;
  const text = String(f['Text'] || '');
  const tagsRaw = f['Tags'];
  const tags = typeof tagsRaw === 'string'
    ? tagsRaw.split(',').map((s: string) => s.trim()).filter(Boolean)
    : (Array.isArray(tagsRaw) ? tagsRaw : []);
  return {
    titel: String(f['Titel'] || ''),
    text: text,
    text_kurz: text.slice(0, 200),
    kategorie: f['Kategorie'] ? String(f['Kategorie']) : null,
    schadenart: null,
    tags: tags.length ? tags : null,
    nutzungen: typeof f['Nutzungen'] === 'number' ? f['Nutzungen'] : 0,
    is_global: true,
    workspace_id: null,
    importiert_aus_airtable: true,
    airtable_record_id: rec.id
  };
}

function mapCustom(rec: AirtableRecord) {
  const f = rec.fields as any;
  const text = String(f['text'] || '');
  return {
    titel: String(f['titel'] || ''),
    text: text,
    text_kurz: text.slice(0, 200),
    kategorie: f['kategorie'] ? String(f['kategorie']) : null,
    schadenart: f['schadenart'] ? String(f['schadenart']) : null,
    notiz: f['notiz'] ? String(f['notiz']) : null,
    is_global: false,
    workspace_id: MARCEL_WORKSPACE,
    importiert_aus_airtable: true,
    airtable_record_id: rec.id
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!AIRTABLE_PAT) return J({ error: 'AIRTABLE_PAT not set' }, 500);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);

  const userClient = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData } = await userClient.auth.getUser(auth.slice(7));
  if (!userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);
  if (userData.user.email !== ADMIN_EMAIL) {
    return J({ error: 'FORBIDDEN', detail: `Admin-only (${ADMIN_EMAIL})` }, 403);
  }

  const sb = createClient(SB_URL, SB_SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    // Existing-Map
    const { data: existing } = await sb.from('textbausteine')
      .select('airtable_record_id')
      .not('airtable_record_id', 'is', null);
    const existingIds = new Set((existing || []).map(r => r.airtable_record_id));

    const masterRecs = await fetchAll(MASTER_TABLE);
    const customRecs = await fetchAll(CUSTOM_TABLE);

    let migratedMaster = 0, migratedCustom = 0, skipped = 0;
    const errors: string[] = [];

    for (const rec of masterRecs) {
      if (existingIds.has(rec.id)) { skipped++; continue; }
      try {
        const p = mapMaster(rec);
        if (!p.titel || !p.text) { skipped++; continue; }
        const { error } = await sb.from('textbausteine').insert(p);
        if (error) { errors.push(`master/${rec.id}: ${error.message}`); continue; }
        migratedMaster++;
      } catch (e) { errors.push(`master/${rec.id}: ${e instanceof Error ? e.message : String(e)}`); }
    }
    for (const rec of customRecs) {
      if (existingIds.has(rec.id)) { skipped++; continue; }
      try {
        const p = mapCustom(rec);
        if (!p.titel || !p.text) { skipped++; continue; }
        const { error } = await sb.from('textbausteine').insert(p);
        if (error) { errors.push(`custom/${rec.id}: ${error.message}`); continue; }
        migratedCustom++;
      } catch (e) { errors.push(`custom/${rec.id}: ${e instanceof Error ? e.message : String(e)}`); }
    }

    return J({
      success: true,
      total_master: masterRecs.length,
      total_custom: customRecs.length,
      migrated_master: migratedMaster,
      migrated_custom: migratedCustom,
      migrated: migratedMaster + migratedCustom,
      skipped,
      errors: errors.slice(0, 20),
      error_count: errors.length
    });
  } catch (e) {
    return J({ error: 'MIGRATION_FAILED', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});
