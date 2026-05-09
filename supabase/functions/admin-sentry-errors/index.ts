/* PROVA Edge — admin-sentry-errors (Welle 7) Sentry API Issues-Fetch */
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

const SENTRY_REGION = 'de';

async function fetchIssues(orgSlug: string, projSlug: string, token: string) {
  const url = 'https://' + SENTRY_REGION + '.sentry.io/api/0/projects/' + orgSlug + '/' + projSlug + '/issues/?statsPeriod=24h&query=is%3Aunresolved&limit=10';
  const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
  if (!res.ok) return { error: 'Sentry-API ' + res.status, issues: [] };
  const issues = await res.json();
  return {
    issues: issues.map((i: any) => ({
      id: i.id, title: i.title, culprit: i.culprit, level: i.level,
      count: i.count, userCount: i.userCount, lastSeen: i.lastSeen, firstSeen: i.firstSeen,
      permalink: i.permalink, status: i.status, shortId: i.shortId
    }))
  };
}

Deno.serve(adminHandler({ functionName: 'admin-sentry-errors' }, async (req) => {
  if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const token = Deno.env.get('SENTRY_AUTH_TOKEN') ?? '';
  const orgSlug = Deno.env.get('SENTRY_ORG_SLUG') ?? '';
  const projFn = Deno.env.get('SENTRY_PROJECT_SLUG_FUNCTIONS') ?? '';
  const projBr = Deno.env.get('SENTRY_PROJECT_SLUG_BROWSER') ?? '';

  if (!token || !orgSlug) {
    return jsonResponse({
      ok: true, configured: false,
      hint: 'SENTRY_AUTH_TOKEN + SENTRY_ORG_SLUG in Edge-Env setzen.',
      projects: []
    });
  }

  const projects: any[] = [];
  if (projFn) {
    try { projects.push({ name: 'Functions (Backend)', slug: projFn, ...(await fetchIssues(orgSlug, projFn, token)) }); }
    catch (e) { projects.push({ name: 'Functions (Backend)', slug: projFn, error: e instanceof Error ? e.message : String(e), issues: [] }); }
  }
  if (projBr) {
    try { projects.push({ name: 'Browser (Frontend)', slug: projBr, ...(await fetchIssues(orgSlug, projBr, token)) }); }
    catch (e) { projects.push({ name: 'Browser (Frontend)', slug: projBr, error: e instanceof Error ? e.message : String(e), issues: [] }); }
  }

  return jsonResponse({ ok: true, configured: true, fetched_at: new Date().toISOString(), region: SENTRY_REGION, projects });
}));
