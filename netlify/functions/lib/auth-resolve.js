/* ============================================================
   netlify/functions/lib/auth-resolve.js
   
   STUB — wiederhergestellt nach MEGA⁵⁵ Mass-Delete (08.05.2026).
   Wurde versehentlich gelöscht obwohl rate-limit-user.js +
   jwt-middleware.js es noch importieren.
   
   Auth läuft jetzt via Supabase Edge Functions. Diese Stubs
   halten Legacy-Lambdas (Cron, Webhooks) am Build-Laufen.
   Migration der Importer auf Supabase ist post-Pilot Task.
============================================================ */

async function resolveUser(req) {
  // Legacy path — Auth läuft jetzt über Supabase Edge Functions.
  // Stub returnt null (= "kein User"); Caller handled 401.
  return null;
}

function logAuthFailure(req, reason) {
  // Legacy logging — Audit-Trail läuft jetzt über Supabase.
  // Stub als No-Op mit Console-Warning für Debugging.
  try {
    console.warn('[auth-resolve-stub] auth failure:', reason);
  } catch (e) { /* fail-silent */ }
}

module.exports = { resolveUser, logAuthFailure };