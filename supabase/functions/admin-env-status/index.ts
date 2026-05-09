/* PROVA Edge — admin-env-status (Welle 7) */
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

const ENV_KEYS_SAFE = [
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY',
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY',
  'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY', 'PDFMONKEY_API_KEY',
  'SENTRY_DSN', 'AUTH_HMAC_SECRET',
  'PROVA_TOTP_ENCRYPTION_KEY', 'FRISTEN_CRON_SECRET',
  'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'
];

Deno.serve(adminHandler({ functionName: 'admin-env-status' }, async (req, { sb }) => {
  if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);

  const envs: Record<string, any> = {};
  for (const k of ENV_KEYS_SAFE) {
    const v = Deno.env.get(k);
    envs[k] = v ? { set: true, length: v.length, preview: v.slice(0, 4) + '…' } : { set: false };
  }

  let supabaseStatus = 'green';
  try {
    const { error } = await sb.from('workspaces').select('id').limit(1);
    if (error) supabaseStatus = 'red';
  } catch { supabaseStatus = 'red'; }

  const stripeStatus = Deno.env.get('STRIPE_SECRET_KEY') ? 'green' : 'yellow';
  const resendStatus = Deno.env.get('RESEND_API_KEY') ? 'green' : 'yellow';

  return jsonResponse({
    edge_envs: envs,
    supabase_status: supabaseStatus,
    stripe_status: stripeStatus,
    resend_status: resendStatus,
    last_check: new Date().toISOString()
  });
}));
