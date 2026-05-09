/* PROVA Edge — import-validate (User-JWT, prüft CSV/JSON-Daten vor Import) */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type' };
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const VALID_TYPES = ['kontakte', 'auftraege', 'fristen', 'eintraege'];

const REQUIRED_FIELDS: Record<string, string[]> = {
  kontakte: ['typ', 'name'],
  auftraege: ['az', 'titel'],
  fristen: ['frist_datum', 'betreff'],
  eintraege: ['bezeichnung']
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userErr } = await sb.auth.getUser(auth.slice(7));
  if (userErr || !userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }
  const typ = body?.typ; const rows = body?.rows;
  if (!VALID_TYPES.includes(typ)) return J({ error: 'typ invalid', valid: VALID_TYPES }, 400);
  if (!Array.isArray(rows)) return J({ error: 'rows[] erforderlich' }, 400);
  if (rows.length === 0) return J({ error: 'rows leer' }, 400);
  if (rows.length > 1000) return J({ error: 'max 1000 Zeilen pro Batch' }, 400);

  const required = REQUIRED_FIELDS[typ];
  const errors: any[] = [];
  const warnings: any[] = [];

  rows.forEach((row: any, idx: number) => {
    if (!row || typeof row !== 'object') {
      errors.push({ row: idx, error: 'Row ist kein Objekt' });
      return;
    }
    for (const f of required) {
      if (!row[f] || String(row[f]).trim() === '') {
        errors.push({ row: idx, field: f, error: 'Pflichtfeld fehlt' });
      }
    }
    // Type-spezifische Checks
    if (typ === 'kontakte' && row.email && !/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(row.email)) {
      errors.push({ row: idx, field: 'email', error: 'Ungültiges Email-Format' });
    }
    if (typ === 'fristen' && row.frist_datum && !/^\d{4}-\d{2}-\d{2}$/.test(row.frist_datum)) {
      errors.push({ row: idx, field: 'frist_datum', error: 'Datum-Format YYYY-MM-DD erforderlich' });
    }
    if (typ === 'auftraege' && row.az && row.az.length > 50) {
      warnings.push({ row: idx, field: 'az', warning: 'AZ ungewöhnlich lang (>50 Zeichen)' });
    }
  });

  return J({
    ok: errors.length === 0,
    typ, total_rows: rows.length,
    valid_count: rows.length - errors.length,
    error_count: errors.length, warning_count: warnings.length,
    errors: errors.slice(0, 50), warnings: warnings.slice(0, 50)
  });
});
