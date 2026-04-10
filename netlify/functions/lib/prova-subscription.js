// PROVA Systems — Shared Subscription/Access Helper
// Zentrales Modul für Airtable-Konstanten und Zugangsprüfung

const AIRTABLE_API = 'https://api.airtable.com';
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appJ7bLlAHZoxENWE';
const TABLE_SV = process.env.AIRTABLE_TABLE_SV || 'tbladqEQT3tmx4DIB';
const TABLE_FAELLE = 'tblSxV8bsXwd1pwa0';
const TABLE_RECHNUNGEN = 'tblF6MS7uiFAJDjiT';
const TABLE_TERMINE = 'tblyMTTdtfGQjjmc2';
const TABLE_KONTAKTE = 'tblMKmPLjRelr6Hal';
const TABLE_AUDIT = process.env.PROVA_AUDIT_TRAIL_TABLE || 'tblqQmMwJKxltXXXl';

/**
 * hasProvaAccess — prüft ob ein User Zugriff hat (Trial aktiv oder Aktiv)
 * @param {string} email - sv_email des Users
 * @param {string} pat - Airtable PAT
 * @returns {Promise<boolean>}
 */
async function hasProvaAccess(email, pat) {
  if (!email || !pat) return false;
  try {
    const formula = encodeURIComponent(`{Email}="${email.toLowerCase().replace(/"/g, '\\"')}"`);
    const url = `${AIRTABLE_API}/v0/${BASE_ID}/${TABLE_SV}?filterByFormula=${formula}&maxRecords=1&fields[]=Status&fields[]=Trial_End&fields[]=subscription_status`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${pat}` }
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.records || data.records.length === 0) return false;

    const f = data.records[0].fields;
    const status = (f.Status || '').toLowerCase();
    const subStatus = (f.subscription_status || '').toLowerCase();

    // Aktiv oder bezahltes Abo
    if (status === 'aktiv' || subStatus === 'active') return true;

    // Trial: prüfen ob noch nicht abgelaufen
    if (status === 'trial' || subStatus === 'trialing') {
      const trialEnd = f.Trial_End || '';
      if (!trialEnd) return true; // kein Enddatum = Trial läuft
      return new Date(trialEnd) > new Date();
    }

    return false;
  } catch (e) {
    console.error('[prova-subscription] hasProvaAccess error:', e.message);
    return false;
  }
}

module.exports = {
  AIRTABLE_API,
  BASE_ID,
  TABLE_SV,
  TABLE_FAELLE,
  TABLE_RECHNUNGEN,
  TABLE_TERMINE,
  TABLE_KONTAKTE,
  TABLE_AUDIT,
  hasProvaAccess,
};
