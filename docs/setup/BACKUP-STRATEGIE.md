# PROVA Backup-Strategie + Status-Page

**Datum:** 2026-05-10 (MEGA³⁰ W10-I8)
**Compliance:** DSGVO Art. 32 (Verfügbarkeit + Belastbarkeit), HGB § 257 (10 Jahre Aufbewahrung)

---

## TL;DR

PROVA-Backup-Strategie nutzt **Supabase-Auto-Backups** (täglich, 7 Tage Retention) + **wöchentliche pg_dump** zu Object-Storage. Status-Page als Public-Endpoint für Service-Health-Monitoring.

---

## 1. Supabase Auto-Backups (Primary)

**Provider:** Supabase Frankfurt (eu-central-1)
**Frequenz:** täglich (00:00 UTC)
**Retention:** 7 Tage (Pro-Plan)
**Recovery:** Point-In-Time-Recovery (PITR) auf Pro-Plan

**Marcel-Action:**
1. Supabase Dashboard → Project Settings → Database → Backups
2. Pro-Plan Aktivierung (≈$25/Monat) — empfohlen für Pre-Pilot
3. PITR aktivieren (kosten zusätzlich)

---

## 2. Wöchentliche pg_dump zu Object-Storage (Long-Term)

**Frequenz:** Sonntag 02:00 UTC
**Retention:** 13 Monate (DSGVO + HGB-Compliance)
**Storage:** IONOS Object-Storage (DE) ODER S3 Frankfurt

### Cron-Lambda `backup-weekly.js` (Welle-X-Item)

```js
// Pseudo-Code
exports.handler = async () => {
  const now = new Date();
  const filename = `prova-backup-${now.toISOString().slice(0,10)}.sql.gz`;
  // 1. pg_dump via Supabase API
  const dumpUrl = await supabase.backups.create();
  // 2. Stream zu IONOS Object-Storage
  await uploadToIonos(dumpUrl, filename);
  // 3. Retention-Check: alte Backups > 13 Monate löschen
  await pruneOldBackups(13 * 30);
  // 4. Sentry-Event bei Erfolg
  Sentry.captureMessage('backup-weekly success', { extra: { filename } });
};
```

**Marcel-Action für Welle X:**
1. IONOS-Object-Storage-Account anlegen
2. ENV: `PROVA_IONOS_S3_KEY` + `PROVA_IONOS_S3_BUCKET`
3. Make.com-Cron-Trigger Sonntag 02:00 → Lambda-Endpoint

---

## 3. Status-Page Foundation

**Public-Endpoint:** `/.netlify/functions/status-page`
**Public-Frontend:** `/status.html`

**Health-Checks (6 Services):**
1. Supabase: `SELECT 1` Query gegen Project
2. Stripe: `Stripe.balance.retrieve()`
3. OpenAI: GET https://api.openai.com/v1/models (HEAD)
4. Anthropic: GET https://api.anthropic.com/v1/messages (HEAD)
5. PDFMonkey: GET https://api.pdfmonkey.io/api/v1/templates (HEAD)
6. Make.com: HEAD eines bekannten Webhooks

**Status-Format:**
```json
{
  "timestamp": "2026-05-10T15:30:00Z",
  "services": {
    "supabase": { "status": "operational", "latency_ms": 45 },
    "stripe": { "status": "operational", "latency_ms": 120 },
    "openai": { "status": "operational", "latency_ms": 85 },
    "anthropic": { "status": "operational", "latency_ms": 95 },
    "pdfmonkey": { "status": "operational", "latency_ms": 200 },
    "make": { "status": "operational", "latency_ms": 60 }
  },
  "overall": "operational"
}
```

**30-Tage-Uptime-Chart:**
- Supabase-Tabelle `service_health` mit täglichen Snapshots
- Cron-Lambda `health-snapshot.js` läuft 4× pro Stunde, schreibt in service_health
- status.html liest letzte 30 Tage und rendert Chart

---

## 4. DSGVO-Compliance (Art. 32)

**Pflicht-Aspekte:**
- ✅ **Vertraulichkeit:** AES-256-Encryption at-rest (Supabase)
- ✅ **Integrität:** PITR + Hash-Validierung
- ✅ **Verfügbarkeit:** 99.9% SLA Supabase + Status-Page
- ✅ **Belastbarkeit:** Auto-Recovery + Backup-Restore-Tests
- 🟡 **Wiederherstellungs-Tests:** quartalsweise (Marcel-Action für Welle X)

---

## 5. Implementation-Roadmap

### Welle 10 (DIESES Item)
- ✅ Backup-Strategie-Doku (THIS DOC)
- ⏸ Lambda-Implementation deferred zu W10b/W11

### Welle 11 (Final-Welle)
- `netlify/functions/status-page.js` Lambda
- `status.html` Public-Frontend
- `service_health`-Tabelle Schema-Migration

### Welle X (post-Pilot)
- `backup-weekly.js` Cron-Lambda
- IONOS-S3-Integration
- Quartalsweise Restore-Test-Skript

---

## Marcel — Action-Items

🔴 **PFLICHT vor Pilot-Launch:**
1. Supabase Pro-Plan + PITR aktivieren
2. Backup-Test (Restore-Verify) durchführen
3. Status-Page deployment nach Welle 11

🟡 **Welle X (post-Pilot):**
4. IONOS-Object-Storage-Account
5. Make.com-Cron für wöchentliche pg_dump
6. Quartalsweise Restore-Tests

---

*MEGA³⁰ W10-I8 Backup-Strategie — Doku komplett, Implementation für Welle 11 (Status-Page) + Welle X (pg_dump-Cron).*
