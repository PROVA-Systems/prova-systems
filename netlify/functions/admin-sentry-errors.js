/**
 * PROVA — admin-sentry-errors.js
 * MEGA-MEGA N3 (03.05.2026) — Admin-Cockpit Bereich 3
 *
 * Liest die letzten Errors aus Sentry-API.
 * Voraussetzung: SENTRY_AUTH_TOKEN + SENTRY_ORG_SLUG + SENTRY_PROJECT_SLUG_FUNCTIONS/BROWSER in ENV.
 *
 * Wenn nicht konfiguriert: liefert leere Liste mit Hinweis.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse } = require('./lib/admin-auth-guard');

const SENTRY_REGION = 'de';   // Sentry EU-Region

async function fetchSentryIssues(orgSlug, projectSlug, authToken) {
  const url = 'https://' + SENTRY_REGION + '.sentry.io/api/0/projects/' + orgSlug + '/' + projectSlug + '/issues/?statsPeriod=24h&query=is%3Aunresolved&limit=10';
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + authToken }
  });
  if (!res.ok) {
    return { error: 'Sentry-API ' + res.status, issues: [] };
  }
  const issues = await res.json();
  return {
    issues: issues.map(i => ({
      id: i.id,
      title: i.title,
      culprit: i.culprit,
      level: i.level,
      count: i.count,
      userCount: i.userCount,
      lastSeen: i.lastSeen,
      firstSeen: i.firstSeen,
      permalink: i.permalink,
      status: i.status,
      shortId: i.shortId
    }))
  };
}

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(event, 405, { error: 'Method Not Allowed' });
  }

  const authToken = process.env.SENTRY_AUTH_TOKEN;
  const orgSlug = process.env.SENTRY_ORG_SLUG;
  const projectFunctions = process.env.SENTRY_PROJECT_SLUG_FUNCTIONS;
  const projectBrowser = process.env.SENTRY_PROJECT_SLUG_BROWSER;

  if (!authToken || !orgSlug) {
    return jsonResponse(event, 200, {
      ok: true,
      configured: false,
      hint: 'SENTRY_AUTH_TOKEN + SENTRY_ORG_SLUG in Netlify-ENV setzen. Auth-Token unter sentry.io → Settings → Auth Tokens (Scope: project:read).',
      projects: []
    });
  }

  const projects = [];

  if (projectFunctions) {
    try {
      const r = await fetchSentryIssues(orgSlug, projectFunctions, authToken);
      projects.push({ name: 'Functions (Backend)', slug: projectFunctions, ...r });
    } catch (e) {
      projects.push({ name: 'Functions (Backend)', slug: projectFunctions, error: e.message, issues: [] });
    }
  }

  if (projectBrowser) {
    try {
      const r = await fetchSentryIssues(orgSlug, projectBrowser, authToken);
      projects.push({ name: 'Browser (Frontend)', slug: projectBrowser, ...r });
    } catch (e) {
      projects.push({ name: 'Browser (Frontend)', slug: projectBrowser, error: e.message, issues: [] });
    }
  }

  return jsonResponse(event, 200, {
    ok: true,
    configured: true,
    fetched_at: new Date().toISOString(),
    region: SENTRY_REGION,
    projects: projects
  });
}, { functionName: 'admin-sentry-errors', rateLimit: { max: 30, windowSec: 60 } }), { functionName: 'admin-sentry-errors' });
