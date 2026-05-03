# Audit 13 — PDF-Generation-Sicherheit

**Datum:** 03.05.2026 (Sprint S6 Phase 4)
**Auditor:** Claude Code
**Methodik:** Code-Review `pdf-proxy.js` + `foto-anlage-pdf.js` + PDFMonkey-Integration

---

## Findings-Übersicht

| Severity | Anzahl | Bereich |
|---|---:|---|
| HIGH | 2 | Foto-Anzahl-Limit, RTF-Injection (akte-export überlapp Audit 5 IV-04) |
| MEDIUM | 3 | URL-Whitelist pdf-proxy, Template-Injection-Vektor, Cost-Cap |
| LOW | 2 | Watermark-Tampering, signed-URL-TTL |
| INFO | 1 | PDFMonkey-Templates extern (Marcel-Verantwortung) |

---

## HIGH-1 — `foto-anlage-pdf.js` ohne Foto-Anzahl-Limit (PDFMonkey-Cost)

**File:** `netlify/functions/foto-anlage-pdf.js`

**Problem:** authentifizierter User kann body.fotos[]-Array mit 1000+ Fotos schicken. PDFMonkey rendert 1000 PDF-Pages → ~$10+ Kosten pro Call.

**Fix:**
```js
const MAX_FOTOS = 50;
const fotos = Array.isArray(body.fotos) ? body.fotos : [];
if (fotos.length > MAX_FOTOS) {
  return json(400, { error: `Max ${MAX_FOTOS} Fotos pro PDF` });
}
```

**Severity:** HIGH (Cost-DoS)
**Status:** in BACKLOG (H-24 aus Audit 5)

---

## HIGH-2 — `akte-export.js` RTF-Injection

→ siehe Audit 5 IV-04. Bereits in BACKLOG.

---

## MEDIUM-1 — `pdf-proxy.js` URL-Whitelist fehlt

**File:** `netlify/functions/pdf-proxy.js`

**Problem:** pdf-proxy.js fetched arbitrary PDF-URLs vom Frontend-Body. SSRF-Risiko: User könnte interne URLs (`http://localhost`, AWS Meta-IP `169.254.169.254`) abfragen.

**Fix:**
```js
const ALLOWED_HOSTS = ['files.pdfmonkey.io', '*.supabase.co'];
const url = new URL(body.url);
const allowed = ALLOWED_HOSTS.some(h => {
  if (h.startsWith('*.')) return url.hostname.endsWith(h.slice(1));
  return url.hostname === h;
});
if (!allowed || url.protocol !== 'https:') {
  return json(400, { error: 'URL nicht erlaubt' });
}
```

**Severity:** MEDIUM (SSRF-Vektor)
**Status:** BACKLOG

---

## MEDIUM-2 — Template-Injection-Vektor

**Problem:** PDFMonkey-Templates werden serverseitig mit User-Input (Auftraggeber-Name, Adresse, Diktat-Text) gerendert. Wenn PDFMonkey ein Template-Engine wie Liquid oder Handlebars nutzt: User-Input könnte Template-Code enthalten.

**Test-Cases (Marcel manuell):**
```
Input: { auftraggeber_name: "{{system.password}}" }
Erwartung: literal "{{system.password}}" im PDF, nicht expanded

Input: { adresse: "<script>alert(1)</script>" }
Erwartung: HTML-escaped im PDF, kein Script-Tag

Input: { aktenzeichen: "{% raw %}…{% endraw %}" }
Erwartung: literal-Strings, kein Liquid-Effekt
```

**Mitigation aktuell:** PDFMonkey nutzt **Liquid** als Template-Engine. Liquid escaped per default `{{...}}`-Output → relativ sicher gegen XSS, aber nicht gegen `{% ... %}`-Tags.

**Empfehlung:** Marcel testet 5 Edge-Case-Inputs manuell + dokumentiert in `docs/audit/PDFMONKEY-INJECTION-TEST-RESULTS.md` (Folge-Sprint).

**Severity:** MEDIUM (NEEDS-MARCEL)

---

## MEDIUM-3 — Kein Cost-Cap pro User pro Tag

**Problem:** PDFMonkey-Plan kostet ~$0.01/PDF. Bei 1000 PDFs/h = $10/h Cost-Burn-Risk.

**Mitigation aktuell:** Rate-Limit auf foto-anlage-pdf + pdf-proxy fehlt (Audit 4 RL-06, RL-07).

**Empfehlung:** Tagesquota in Frontend + Server (`workspaces.pdf_quota_pro_tag`-Spalte ergänzen).

**Severity:** MEDIUM
**Status:** BACKLOG

---

## LOW-1 — Watermark-Tampering

**Beobachtung:** PROVA-Gutachten haben kein Watermark / digitale Signatur. Theoretisch könnte SV das PDF nach Generation manipulieren.

**Realität-Check:** SV ist Verantwortlicher des Gutachten-Inhalts. Manipulation wäre Berufsrechts-Verstoß, nicht PROVA-Sicherheits-Issue.

**Empfehlung:** Optional digitale Signatur via signNow-Integration in Folge-Sprint.

**Severity:** LOW (organisatorisch)

---

## LOW-2 — Signed-URL-TTL nicht dokumentiert

**Problem:** PDFMonkey-PDFs werden via signed-URL ausgeliefert. TTL nicht verifiziert.

**Empfehlung:** Marcel prüft im PDFMonkey-Dashboard:
- Default-TTL: 24h
- Bei sensitiven Gutachten: 1h reduzieren?

**Severity:** LOW

---

## INFO-1 — PDFMonkey-Templates extern

**Beobachtung:** 21 PDFMonkey-Templates (siehe `prova-preise.js:251-289`) liegen extern bei PDFMonkey. Nicht im PROVA-Repo versioniert.

**Risiko:** wenn Marcel-PDFMonkey-Account kompromittiert → Templates können geändert werden → korrupte Gutachten generiert.

**Mitigation:**
- 2FA auf PDFMonkey-Account (Marcel-Pflicht)
- Template-Backups in `docs/templates-source/` (Marcel-Pflicht: regelmäßiger Export)

**Severity:** INFO (Marcel-Verantwortung)

---

## Findings → BACKLOG

| ID | Severity | Titel | Action |
|---|---|---|---|
| PDF-01 | HIGH | foto-anlage-pdf max 50 Fotos | siehe H-24 (Sprint X4) |
| PDF-02 | MED | pdf-proxy URL-Whitelist | BACKLOG |
| PDF-03 | MED | PDFMonkey-Template-Injection-Test | NEEDS-MARCEL |
| PDF-04 | MED | PDFMonkey-Cost-Cap pro User/Tag | BACKLOG (Schema-Erweiterung) |
| PDF-05 | LOW | Watermark/Signatur (optional) | Folge-Sprint |
| PDF-06 | LOW | signed-URL-TTL verifizieren | NEEDS-MARCEL |

---

*Audit 13 abgeschlossen 03.05.2026*
