/* PROVA Edge — admin-time-tracking (Welle 7)
   Lifecycle-Dauer aus audit_trail (auftrag.created → auftrag.freigegeben/pdf.generated).
*/
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

function parseSince(s: string): string {
  const m = s.match(/^(\d+)([hd])$/);
  if (!m) return new Date(Date.now() - 30 * 86400000).toISOString();
  const ms = parseInt(m[1]) * (m[2] === 'h' ? 3600000 : 86400000);
  return new Date(Date.now() - ms).toISOString();
}

Deno.serve(adminHandler({ functionName: 'admin-time-tracking' }, async (req, { sb }) => {
  if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const url = new URL(req.url);
  const since = parseSince(url.searchParams.get('since') ?? '30d');

  const { data: events, error } = await sb.from('audit_trail')
    .select('action, entity_typ, entity_id, user_id, payload, created_at')
    .in('action', ['create', 'update', 'pdf_generate'])
    .eq('entity_typ', 'auftrag')
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(5000);

  if (error) {
    return jsonResponse({ ok: true, configured: false, error: error.message });
  }

  const pairs: Record<string, any> = {};
  for (const e of (events ?? [])) {
    const p = (e.payload ?? {}) as any;
    const az = p.aktenzeichen ?? p.az ?? null;
    const typ = p.auftragstyp ?? 'unknown';
    if (!az || !e.user_id) continue;
    const k = e.user_id + '|' + az;
    if (!pairs[k]) pairs[k] = { user_id: e.user_id, az, typ };
    if (e.action === 'create' && p.event === 'auftrag.created') pairs[k].started = e.created_at;
    else if (e.action === 'create') pairs[k].started = pairs[k].started ?? e.created_at;
    if ((e.action === 'update' && (p.status === 'freigegeben' || p.event === 'auftrag.freigegeben')) || e.action === 'pdf_generate') {
      pairs[k].completed = pairs[k].completed ?? e.created_at;
    }
  }

  const completed = Object.values(pairs).filter((p: any) => p.started && p.completed).map((p: any) => ({
    user_id: p.user_id, aktenzeichen: p.az, typ: p.typ,
    started: p.started, completed: p.completed,
    duration_min: Math.round((new Date(p.completed).getTime() - new Date(p.started).getTime()) / 60000)
  }));

  const perUser: Record<string, any> = {};
  const perTyp: Record<string, any> = {};
  for (const c of completed) {
    perUser[c.user_id] = perUser[c.user_id] ?? { user_id: c.user_id, count: 0, total_min: 0 };
    perUser[c.user_id].count++; perUser[c.user_id].total_min += c.duration_min;
    perTyp[c.typ] = perTyp[c.typ] ?? { typ: c.typ, count: 0, total_min: 0 };
    perTyp[c.typ].count++; perTyp[c.typ].total_min += c.duration_min;
  }
  const userStats = Object.values(perUser).map((u: any) => ({ ...u, avg_min: Math.round(u.total_min / u.count) })).sort((a: any, b: any) => b.count - a.count);
  const typStats = Object.values(perTyp).map((t: any) => ({ ...t, avg_min: Math.round(t.total_min / t.count) })).sort((a: any, b: any) => b.count - a.count);

  return jsonResponse({
    ok: true, configured: true,
    fetched_at: new Date().toISOString(),
    since, completed_total: completed.length,
    per_user: userStats.slice(0, 20),
    per_typ: typStats,
    recent: completed.slice(-10).reverse()
  });
}));
