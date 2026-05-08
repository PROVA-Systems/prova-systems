# PDFMonkey Live-Audit Runbook (M⁴² P6)

**Datum:** 2026-05-08

Dieser Runbook-Eintrag erklärt wie man die PDFMonkey-Templates regelmäßig auditiert.

---

## 🎯 Was wird geprüft

1. **Drift:** Welche PDFMonkey-Templates sind in Supabase nicht referenziert?
2. **Drift:** Welche Supabase-Refs zeigen auf nicht-existierende PDFMonkey-IDs?
3. **§407a-Compliance:** Haben alle Gutachten-Templates den §407a-ZPO-Hinweis?
4. **EU-AI-Act:** Haben Templates KI-Disclosure (Art. 50)?
5. **gpt-4o-Code-Smell:** Templates die noch auf altes Modell referenzieren (deprecated 2026-02).

---

## 🔧 Lokal-Run (Development)

```bash
PDFMONKEY_API_KEY=mky_xxx \
SUPABASE_URL=https://cngteblrbpwsyypexjrv.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  node scripts/pdfmonkey-audit-runner.js
```

Output:
```
PROVA PDFMonkey-Audit-Runner (M⁴² P6)
Datum: 2026-05-08T18:25:00Z

⏳ Lade PDFMonkey-Templates …
✅ 22 PDFMonkey-Templates geladen
⏳ Lade Supabase dokument_templates …
✅ 18 Supabase-Templates geladen

=== DRIFT ===
  Matched:               16
  Missing in Supabase:   6
  Missing in PDFMonkey:  2
  Details (PDFMonkey hat, Supabase nicht):
    - alt_kurzgutachten (123abc)
    ...

=== COMPLIANCE ===
  §407a-Blocks:          14/22
  EU-AI-Act-Disclosures: 12/22
  gpt-4o References (Code-Smell): 1
  Offenders:
    ❌ alt_legacy_template

Audit fertig in 1247ms
```

---

## 🚀 Live-Run (Production via Lambda)

```bash
curl -H "Authorization: Bearer ${PROVA_ADMIN_TOKEN}" \
     https://prova-systems.de/.netlify/functions/admin-pdfmonkey-inventory
```

→ JSON-Response mit allen Details.

---

## 📊 Erwartete 22+ Templates

PROVA nutzt PDFMonkey für:

| Kategorie | Anzahl | Beispiele |
|-----------|--------|-----------|
| Gutachten-Hauptdoks | 6 | gerichts-, versicherungs-, privat-, schieds-, beweissicherungs-, ergänzungs- |
| Wertgutachten | 3 | sachwert, vergleichswert, ertragswert |
| Kurzformen | 2 | Kurzstellungnahme, Beratung |
| Korrespondenz-Briefe | 11 | Termin-Bestätigung, Rückmeldung, Mahnung, etc. |
| Rechnungen | 2 | JVEG-Rechnung, Privat-Rechnung |
| Sonstige | 2 | Spendenquittung, Verschwiegenheits-Erklärung |
| **Σ** | **26** | |

---

## 🔍 Compliance-Anforderungen

### §407a ZPO
Pflicht für alle gerichtlichen Gutachten-PDFs. Block enthält:
- Aktenzeichen
- Beweisbeschluss-Datum
- Frist-Eintragung
- Kostenobergrenze

### EU AI Act Art. 50
Pflicht für alle PDFs die KI-generierten Inhalt enthalten:
- Transparenz-Hinweis "KI-unterstützt"
- Modell-Identifikation
- Confidence-Score (intern)

### gpt-4o-Smell
Templates die "gpt-4o" referenzieren sind veraltet (Modell deprecated 2026-02). Müssen auf `gpt-5.5` oder Aliase migriert werden.

---

## 🛠️ Drift-Behebung

### Missing in Supabase (PDFMonkey-only)
1. PDFMonkey → Template-Settings → ID kopieren
2. Supabase: `INSERT INTO dokument_templates (code, name, pdfmonkey_template_id, is_active) VALUES (...)`
3. Verlinkung in Frontend (data-store, template-registry)

### Missing in PDFMonkey (Supabase-only)
1. Code-Search nach betroffener `code` finden
2. Entscheiden: Template bauen oder Reference aus Supabase entfernen
3. Bei Bauen: PDFMonkey-Template anlegen, ID in Supabase eintragen

---

## 🔴 Marcel-Pflicht-Items

1. **Setze PDFMONKEY_API_KEY als Netlify ENV** (falls noch nicht)
2. **Ruf Audit-Lambda auf:** `curl /admin-pdfmonkey-inventory`
3. **Drift-Liste ansehen** + entscheiden welche Drift behoben werden muss
4. **Compliance-Counts bewerten:** Liegt das §407a + EU-AI-Act zwischen 80-100%?
5. **gpt-4o-Offenders behebung** (Pflicht vor Pilot, deprecated)

---

*M⁴² P6 — Co-Authored-By Claude Opus 4.7 — 2026-05-08*
