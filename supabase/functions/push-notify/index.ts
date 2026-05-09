/* PROVA Edge — push-notify (Welle 7)
   Web Push Subscribe/Unsubscribe/Send + Prefs + Fristen-Cron.
   Aktionen: vapid-key, subscribe, unsubscribe, save-prefs, get-prefs, send (best-effort).
   send-fristen via Cron (X-Cron-Secret) — nutzt npm:web-push für Encryption.
*/
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SB_SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const VAPID_PUB = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIV = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUB = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:kontakt@prova-systems.de';
const CRON_SECRET = Deno.env.get('FRISTEN_CRON_SECRET') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const DEFAULT_PREFS = { bn_fristen: true, bn_zahlung: true, bn_stillezeit: false };

function parsePrefs(p: any) { return { ...DEFAULT_PREFS, ...(p ?? {}) }; }
function istStillezeit(p: any) {
  if (!p?.bn_stillezeit) return false;
  const h = (new Date().getUTCHours() + 2) % 24;
  return h >= 22 || h < 8;
}
function shouldSend(p: any, typ: string) {
  if (istStillezeit(p)) return false;
  if (typ === 'fristen' && p.bn_fristen === false) return false;
  if (typ === 'zahlung' && p.bn_zahlung === false) return false;
  return true;
}

async function sendPushReal(sub: any, payload: object): Promise<{ ok: boolean; status?: number; error?: string }> {
  // Versuche npm:web-push (Supabase Edge npm-Compat)
  try {
    const webpush = await import('npm:web-push@3.6.7');
    webpush.default.setVapidDetails(VAPID_SUB, VAPID_PUB, VAPID_PRIV);
    await webpush.default.sendNotification({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth }
    }, JSON.stringify(payload));
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  let body: any = {};
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }
  const aktion = body?.aktion;

  // VAPID-Key (public, kein Auth)
  if (aktion === 'vapid-key') {
    if (!VAPID_PUB) return J({ error: 'VAPID_PUBLIC_KEY nicht konfiguriert' }, 500);
    return J({ publicKey: VAPID_PUB });
  }

  // Cron-Modus für send-fristen
  if (aktion === 'send-fristen') {
    if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) {
      return J({ error: 'Cron-Secret fehlt' }, 401);
    }
    const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });
    const heute = new Date(); const in7 = new Date(heute.getTime() + 7 * 86400000);
    const { data: termine } = await sb.from('termine')
      .select('id, frist_datum, sv_email, betreff, az, user_id')
      .gt('frist_datum', heute.toISOString().slice(0, 10))
      .lte('frist_datum', in7.toISOString().slice(0, 10))
      .neq('status', 'Erfuellt');
    let gesendet = 0; const errors: any[] = [];
    for (const t of (termine ?? []) as any[]) {
      const tage = Math.ceil((new Date(t.frist_datum).getTime() - heute.getTime()) / 86400000);
      if (![7, 3, 1].includes(tage)) continue;
      const { data: subs } = await sb.from('push_subscriptions')
        .select('*').eq('user_id', t.user_id).eq('aktiv', true);
      for (const sub of (subs ?? []) as any[]) {
        const prefs = parsePrefs(sub.prefs);
        if (!shouldSend(prefs, 'fristen')) continue;
        const dringlichkeit = tage === 1 ? 'DRINGEND' : tage === 3 ? 'Bald fällig' : 'Frist';
        const result = await sendPushReal(sub, {
          title: dringlichkeit + ': ' + (t.betreff ?? 'Frist'),
          body: (t.az ? 'AZ: ' + t.az + ' · ' : '') + 'Noch ' + tage + ' Tag' + (tage === 1 ? '' : 'e'),
          url: '/termine.html' + (t.az ? '?az=' + encodeURIComponent(t.az) : '')
        });
        if (result.ok) gesendet++;
        else { errors.push({ user_id: t.user_id, error: result.error }); }
      }
    }
    return J({ ok: true, gesendet, errors });
  }

  // User-Aktionen brauchen Auth
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const userClient = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(auth.slice(7));
  if (userErr || !userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);
  const userId = userData.user.id;

  const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });

  if (aktion === 'subscribe') {
    const subscription = body?.subscription;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return J({ error: 'subscription mit keys.p256dh und keys.auth erforderlich' }, 400);
    }
    const { data: ws } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', userId).eq('is_active', true).limit(1).maybeSingle();
    const upsert = {
      user_id: userId,
      workspace_id: (ws as any)?.workspace_id ?? null,
      endpoint: subscription.endpoint,
      keys_p256dh: subscription.keys.p256dh,
      keys_auth: subscription.keys.auth,
      user_agent: subscription.userAgent ?? req.headers.get('user-agent'),
      aktiv: true,
      last_seen_at: new Date().toISOString()
    };
    const { error: insErr } = await sb.from('push_subscriptions').upsert(upsert, { onConflict: 'endpoint' });
    if (insErr) return J({ error: insErr.message }, 500);
    return J({ success: true });
  }

  if (aktion === 'unsubscribe') {
    await sb.from('push_subscriptions').update({ aktiv: false }).eq('user_id', userId);
    return J({ success: true });
  }

  if (aktion === 'save-prefs') {
    const prefs = body?.prefs ?? {};
    const cleanPrefs = {
      bn_fristen: prefs.bn_fristen !== false,
      bn_zahlung: prefs.bn_zahlung !== false,
      bn_stillezeit: prefs.bn_stillezeit === true
    };
    const { error } = await sb.from('push_subscriptions').update({ prefs: cleanPrefs }).eq('user_id', userId);
    if (error) return J({ error: error.message, prefs: cleanPrefs }, 500);
    return J({ success: true, prefs: cleanPrefs });
  }

  if (aktion === 'get-prefs') {
    const { data } = await sb.from('push_subscriptions').select('prefs').eq('user_id', userId).limit(1).maybeSingle();
    return J({ prefs: parsePrefs((data as any)?.prefs) });
  }

  if (aktion === 'send') {
    const titel = body?.titel; const nachricht = body?.nachricht; const url = body?.url; const typ = body?.typ ?? 'allgemein';
    if (!titel) return J({ error: 'titel erforderlich' }, 400);
    const { data: subs } = await sb.from('push_subscriptions').select('*').eq('user_id', userId).eq('aktiv', true);
    if (!subs?.length) return J({ error: 'Keine aktive Subscription' }, 404);
    let sentCount = 0; const errors: any[] = [];
    for (const sub of subs as any[]) {
      const prefs = parsePrefs(sub.prefs);
      if (!shouldSend(prefs, typ)) continue;
      const result = await sendPushReal(sub, { title: titel, body: nachricht ?? '', url: url ?? '/dashboard.html' });
      if (result.ok) sentCount++;
      else errors.push({ endpoint: sub.endpoint.slice(0, 50), error: result.error });
    }
    return J({ success: true, gesendet: sentCount, errors });
  }

  return J({ error: 'Unbekannte Aktion: ' + aktion }, 400);
});
