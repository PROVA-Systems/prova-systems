// PROVA Systems — Shared Subscription/Access Helper
const AIRTABLE_API = 'https://api.airtable.com';
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appJ7bLlAHZoxENWE';
const TABLE_SV = process.env.AIRTABLE_TABLE_SV || 'tbladqEQT3tmx4DIB';
const TABLE_FAELLE = 'tblSxV8bsXwd1pwa0';
const TABLE_RECHNUNGEN = 'tblF6MS7uiFAJDjiT';
const TABLE_TERMINE = 'tblyMTTdtfGQjjmc2';
const TABLE_KONTAKTE = 'tblMKmPLjRelr6Hal';
const TABLE_AUDIT =
  process.env.PROVA_AUDIT_TRAIL_TABLE || process.env.AIRTABLE_AUDIT_TRAIL_TABLE || 'tblqQmMwJKxltXXXl';
const TABLE_BRIEFE = process.env.AIRTABLE_BRIEFE_TABLE || 'tblSzxvnkRE6B0thx';

async function fetchSvByEmail(email, pat) {
  const em = String(email || '')
    .trim()
    .toLowerCase();
  if (!em || !pat) return null;
  const filter = encodeURIComponent('{Email}="' + em.replace(/"/g, '\\"') + '"');
  const url =
    AIRTABLE_API +
    '/v0/' +
    BASE_ID +
    '/' +
    TABLE_SV +
    '?filterByFormula=' +
    filter +
    '&maxRecords=1&fields[]=Status&fields[]=trial_end&fields[]=subscription_status&fields[]=Paket';
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + pat } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.records || !data.records.length) return null;
  return data.records[0];
}

/**
 * @returns {{ ok: boolean, reason?: string, trial?: boolean }}
 */
/* In-Memory Cache für SV-Zugriffsprüfung: 60s TTL */
const _accessCache = new Map();

async function hasProvaAccess(email, pat) {
  if (!email || !pat) return { ok: false, reason: 'config' };

  /* Cache-Check: jede Function-Instanz cached 60s */
  const cacheKey = 'access:' + email.toLowerCase();
  const cached = _accessCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) return cached.value;
  const rec = await fetchSvByEmail(email, pat);
  if (!rec) {
    const v = { ok: false, reason: 'no_record' };
    _accessCache.set(cacheKey, { value: v, expires: Date.now() + 30000 });
    return v;
  }
  const f = rec.fields || {};
  const status = String(f.Status || '').trim();
  const sub = String(f.subscription_status || f.Subscription_Status || '')
    .trim()
    .toLowerCase();
  const trialEnd = f.trial_end || f.Trial_End;
  const paket = String(f.Paket || '').trim();

  if (status === 'Gekündigt' || sub === 'canceled' || sub === 'cancelled') {
    return { ok: false, reason: 'canceled' };
  }
  if (status === 'Aktiv') { const v={ok:true}; _accessCache.set(cacheKey,{value:v,expires:Date.now()+60000}); return v; }
  if (sub === 'active') { const v={ok:true}; _accessCache.set(cacheKey,{value:v,expires:Date.now()+60000}); return v; }

  if (status === 'Trial' || paket === 'Trial') {
    if (!trialEnd) return { ok: true, trial: true };
    const end = new Date(String(trialEnd).slice(0, 10) + 'T23:59:59');
    if (isNaN(end.getTime())) return { ok: true, trial: true };
    if (Date.now() > end.getTime()) return { ok: false, reason: 'trial_expired' };
    return { ok: true, trial: true };
  }

  var paidPaket = { Starter: 1, Pro: 1, Enterprise: 1, Solo: 1, Team: 1 };
  if (paidPaket[paket] && status !== 'Gekündigt') {
    return { ok: true };
  }

  const _final = { ok: false, reason: 'inactive' };
  _accessCache.set(cacheKey, { value: _final, expires: Date.now() + 60000 });
  return _final;
}

/* Cache-Invalidierung nach Abo-Änderungen (stripe-webhook, admin) */
function clearAccessCache(email) {
  if (!email) return;
  const key = 'access:' + email.toLowerCase();
  _accessCache.delete(key);
}

module.exports = {
  hasProvaAccess,
  clearAccessCache,
  fetchSvByEmail,
  AIRTABLE_API,
  BASE_ID,
  TABLE_SV,
  TABLE_FAELLE,
  TABLE_RECHNUNGEN,
  TABLE_TERMINE,
  TABLE_KONTAKTE,
  TABLE_AUDIT,
  TABLE_BRIEFE
};
