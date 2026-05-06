# Airtable Quick-Cleanup — MEGA¹⁹ W79

**Datum:** 2026-05-08
**Sprint:** MEGA¹⁹ Final-Push
**Scope:** NUR User-sichtbare Console-Errors eliminieren. KEINE komplette
Airtable-Migration (das ist MEGA²¹).

---

## 1. Audit: Top 5 lauteste Functions

Functions die im Frontend bei normalen User-Sessions Console-Errors/Warnings
generieren:

### 🔴 #1 — honorar-tracker.js (Dashboard-Widget)
**Wo:** `dashboard.html:991` laedt `honorar-tracker.js`
**Problem:** Macht `provaFetch('/.netlify/functions/airtable', { POST tabelle:'RECHNUNGEN' })`
→ wird von `prova-fetch-auth.js:isDisabledAirtableUrl` mit 410 abgewiesen
→ `console.warn('[HonorarTracker] Airtable Fehler: HTTP 410')` bei JEDEM Dashboard-Load.
**Impact:** Pilot-User sieht im DevTools-Console eine rote Warning.
**Fix:** Silent-Cache-Fallback bei Status 410 (kein console.warn mehr).

### 🔴 #2 — prova-fetch-auth.js console.info
**Wo:** `prova-fetch-auth.js:184`: `console.info('[airtable-cleanup] blocked legacy call:', url)`
**Problem:** Bei jedem Legacy-Airtable-Call ein info-Log → spammt Console.
**Fix:** `console.info` → `console.debug` (nur bei verbose-mode sichtbar).

### 🟡 #3 — Andere Functions die /.netlify/functions/airtable rufen
**Wo:** prova-fetch-auth.js Zeile 6 (selbst), honorar-tracker.js (3 Calls)
**Strategie:** Lassen wir bestehen (wuerden bei vollem Cleanup in MEGA²¹ entfernt).
Per fetch-Wrapper bekommen sie 410 → muss honorar-tracker.js abfangen.

### 🟢 #4-5 — Backend-Functions mit Airtable-Reads (audit-log.js, dsgvo-*, etc.)
**Wo:** netlify/functions/audit-log.js, dsgvo-auskunft.js etc.
**Status:** Nicht User-Frontend-sichtbar — Backend-only. Kein Console-Spam fuer User.
**Strategie:** UNANGETASTET in MEGA¹⁹ (MEGA²¹ Tier 4 Voll-Cleanup).

---

## 2. Quick-Fixes in MEGA¹⁹

### Fix 1: honorar-tracker.js — Silent Cache-Fallback
**Vorher:**
```js
if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
// ...
} catch (err) {
  console.warn('[HonorarTracker] Airtable Fehler:', err.message);
  return cached;
}
```
**Nachher:**
```js
// Status 410 = Airtable-Endpoint absichtlich disabled (Cleanup-Sprint)
if (resp.status === 410) {
  return cached;  // silent fallback, kein Console-Spam
}
if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
// ...
} catch (err) {
  // Nur loggen wenn nicht 410 (das ist erwarteter Disable-Zustand)
  if (!/410/.test(err.message)) {
    console.warn('[HonorarTracker] Airtable Fehler:', err.message);
  }
  return cached;
}
```

### Fix 2: prova-fetch-auth.js — debug statt info
**Vorher:**
```js
console.info('[airtable-cleanup] blocked legacy call:', url);
```
**Nachher:**
```js
console.debug('[airtable-cleanup] blocked legacy call:', url);
```
DevTools-Default-Filter zeigt INFO an, DEBUG nicht. User sieht clean console.

---

## 3. Was NICHT in MEGA¹⁹

**Voll-Migration** (das ist MEGA²¹ Tier 4):
- audit-log.js — Audit-Daten zu Supabase audit_trail migrieren
- dsgvo-auskunft.js + dsgvo-loeschen.js — DSGVO-Functions auf Supabase
- ki-statistik.js — KI-Logs zu ki_protokoll
- mein-aktivitaetsprotokoll.js — Aktivitaeten zu Supabase
- normen.js, smtp-credentials.js, push-notify.js — diverse Migrations
- team-interest.js, error-log.js, provision-sv.js — diverse Migrations
- pdf-proxy.js, health.js — Backend-Read-Only, niedrig prio

**Schaetzung MEGA²¹:** ~14 Functions, je ~30-60min = 7-14h Sprint-Tiefe.

---

## 4. Verification (Marcel-Test)

Nach Deploy MEGA¹⁹:
1. Browser Hard-Refresh (Strg-Shift-F5) auf dashboard.html
2. F12 → Console aufmachen
3. **Erwartung:** KEIN `[HonorarTracker] Airtable Fehler: HTTP 410`
4. **Erwartung:** KEIN `[airtable-cleanup] blocked legacy call:` (es sei denn DevTools-Filter zeigt DEBUG)
5. Honorar-Widget zeigt Cache-Daten oder Empty-State

**Falls Console doch laut:** Marcel meldet, ich prufe weitere Calls in MEGA²⁰.

---

*Stand 2026-05-08. Quick-Cleanup, kein Voll-Migration. Tier 4 voll in MEGA²¹.*
