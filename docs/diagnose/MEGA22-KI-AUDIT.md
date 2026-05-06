# MEGA²² — KI-Migration + Beweisbeschluss Tiefen-Audit (KEIN Code, nur Analyse)

**Sprint:** MEGA²² (Hybrid-KI-Migration + Beweisbeschluss-PDF + KI-Statistik)
**Datum:** 2026-05-08
**Status:** ⏸️ **Audit-Checkpoint** — Marcel-Freigabe pflicht vor Implementation
**Vorgaenger-Status-Klaerung:**
- MEGA²⁰ Onboarding ✅ done (commits b990c52..5bf15fa, 567 Tests)
- **MEGA²¹ Admin-Cockpit NICHT implementiert** — nur Audit-Doc geschrieben (lokal, ungewatcht). Marcel-Decisions A-F offen geblieben. Marcel hat MEGA²¹ uebersprungen.

---

## ⚠️ KRITISCH: 4 grosse Konflikte zur Marcel-Direktive

### 🔴 Konflikt 1: **GPT-5.4 existiert NICHT** (im Knowledge-Cutoff Januar 2026)

Marcel-Direktive Block A sagt:
> "KI-DIKTAT-VERFEINERUNG: GPT-4o → **GPT-5.4**"
> "KI-HILFE: GPT-4o → **GPT-5.4**"
> "1M Context Window"

**Status (Cutoff 01/2026):** OpenAI hat **kein GPT-5.4** released. Aktuelle Linie:
- `gpt-4o` (existing in PROVA, ist bereits beste GPT-Linie, ~128k Context)
- `gpt-4o-mini` (existing, schneller + cheaper)
- `o1`, `o1-mini`, `o1-preview` (Reasoning-Models — schon vor Cutoff existent)
- `o3-mini` / `o3` (vermutlich neueste, kein Cutoff-Wissen)

**Anthropic-Linie hat 1M Context** — Claude Opus 4.7 oder Sonnet 4.6 im Extended-Thinking-Mode.

→ **Marcel-Decision G pflicht** (siehe Section 6).

### 🔴 Konflikt 2: ki-proxy.js **lehnt Anthropic-Modelle aktiv ab**

`netlify/functions/ki-proxy.js:307`:
```js
let model = body.model || 'gpt-4o-mini';
if (model.includes('haiku') || model.includes('sonnet') || model.includes('opus')) model = 'gpt-4o-mini';
```

→ **Bewusste Routing-Entscheidung:** Wenn ein Frontend-Caller `claude-sonnet-4-6` anfragt, faellt es auf `gpt-4o-mini` zurueck weil Anthropic-Integration **gar nicht existiert** (kein @anthropic-ai/sdk installiert).

**Konsequenz fuer MEGA²²:**
- npm package `@anthropic-ai/sdk` muss installiert werden (`package.json`-Update)
- `ANTHROPIC_API_KEY` ENV (Marcel: bereits gesetzt, $50 Credit)
- ki-proxy.js braucht Multi-Provider-Routing ODER separate Lambda fuer Claude (Marcel-Direktive nennt `foto-ki-claude.js`)

→ **Marcel-Decision H pflicht (NEU):** Multi-Provider in ki-proxy ODER separate Lambdas?

### 🔴 Konflikt 3: existing `claude_sonnet` ENUM hat **keine Versionierung**

Migration 04 Zeile 79-86:
```sql
CREATE TYPE ki_modell_typ AS ENUM (
    'gpt_4o', 'gpt_4o_mini', 'gpt_4_turbo',
    'whisper_1',
    'claude_4_opus', 'claude_sonnet',
    ...
);
```

`claude_sonnet` ist generisch — Sonnet **4.6** kann via `modell_version TEXT` (existing column) versioniert werden. **Keine Migration noetig.** ✅

Aber: Marcel verlangt `claude-sonnet-4-6` als Modell-String — das ist OK fuer Anthropic-API-Call, aber im DB-Schema bleibt der Enum-Wert `claude_sonnet`.

### 🔴 Konflikt 4: prova-audit.js loggt zu **Airtable**, nicht ki_protokoll (Supabase)

`prova-audit.js` schreibt zu Airtable-Tabellen (`appJ7bLlAHZoxENWE/tblv9F8LEnUC3mKru = KI_STATISTIK`).
`ki_protokoll` Supabase-Tabelle existiert seit Migration 04 mit kompletter DSGVO-Struktur (token_input/output, kosten_eur, hashes, pseudo-Flags, etc.).

→ Marcel-Direktive `logKiCall(...)` sollte zu **Supabase ki_protokoll** loggen (Cleanup-Direction), nicht parallel zu Airtable. Aber existing prova-audit.js bleibt rueckwaertskompatibel (Force-Later wie MEGA¹⁹).

---

## 1. Existing KI-Infrastructure (was ist da)

### Lambdas
| File | Rolle | Modell |
|---|---|---|
| `netlify/functions/ki-proxy.js` (~600 LOC) | Aufgaben-Router (messages + aufgabe), Pseudonymisierung, Fachwissen-Injection | gpt-4o + gpt-4o-mini |
| `netlify/functions/whisper-diktat.js` | Audio → Text-Transkription | whisper-1 |
| `netlify/functions/foto-captioning.js` | Bild-Vision-Analyse | gpt-4o (Vision) |
| `netlify/functions/foto-anlage-pdf.js` | Foto-Anlagen-PDF-Render | (nicht KI) |
| `netlify/functions/ki-history.js` | Historie der KI-Calls | (Read-only) |
| `netlify/functions/ki-statistik.js` | Statistik-Aggregation | (Read-only) |

### Frontend-Helper
| File | Rolle |
|---|---|
| `prova-audit.js` | Loggt zu Airtable (legacy) — nicht zu ki_protokoll |
| `lib/prova-pseudo.js` (server) + `prova-pseudo.js` (client) | Pseudonymisierung Mirror |
| `lib/prova-fachwissen.js` | Live-Normen mit 3-Schicht-Fallback |

### Schema
| Komponente | Status |
|---|---|
| `ki_modell_typ` ENUM | ✅ inkl. `claude_4_opus`, `claude_sonnet` |
| `prompt_purpose` ENUM | ✅ existing |
| `ki_call_status` ENUM | ✅ erfolg/fehler/timeout/rate_limit/inhaltspolicy_blockiert |
| `ki_protokoll` Tabelle | ✅ vollstaendig mit token_input/output, kosten_eur, dauer_ms, hashes, pseudo-Flags, Halluzinations/Konjunktiv-Check-Flags |
| `ki_prompt_templates` Tabelle | ✅ mit bevorzugtes_modell + fallback_modell |
| `ki_feedback` Tabelle | ✅ User-Feedback zu KI-Outputs |

### Was fehlt fuer MEGA²²
- ❌ Anthropic-SDK-Integration (ki-proxy.js OpenAI-only)
- ❌ Multi-Provider-Router (chooseProvider statt nur chooseModel)
- ❌ Beweisbeschluss-Schema (existing `auftraege.gericht_az` + `auftraege.beweisbeschluss_datum` sind atomar — kein Volltext-Speicher)
- ❌ PDF-Parser-Library (pdf-parse oder pdfjs-dist nicht in package.json)
- ❌ Disclaimer-Library/Helper (Marcel-Direktive: bei jedem KI-Output, jedem Tooltip, AGB-Sektion)

---

## 2. Block A — KI-Modell-Migration

### Marcel-Direktive vs Realitaet
| Use-Case | Marcel-Direktive | Pragmatisch |
|---|---|---|
| Foto-KI Vision | GPT-4o → **claude-sonnet-4-6** | ✅ existing Anthropic-ENUM, nur SDK-Install |
| KI-Diktat-Verfeinerung | GPT-4o → GPT-5.4 | ❓ GPT-5.4 existiert nicht — Decision G |
| KI-Hilfe (Plausibilität, Normen, Konjunktiv) | GPT-4o → GPT-5.4 | ❓ Decision G |
| Whisper Transkription | (unveraendert) | ✅ whisper-1 bleibt |
| Fallback-Chain | Primary → Fallback (GPT-4o) → Manual | ✅ bauen |

### Was fehlt fuer Block A
1. `npm install @anthropic-ai/sdk` (package.json-Update)
2. `ANTHROPIC_API_KEY` ENV-Reference (Marcel sagt: bereits gesetzt)
3. ki-proxy.js Multi-Provider-Routing ODER `foto-ki-claude.js` separater Lambda
4. Provider-Pattern analog `lib/pdf-service-interface.js` (MEGA¹⁸ Pattern wiederverwenden!)
5. Disclaimer-Helper-Lib + Integration in alle KI-UIs

**Wiederverwendung MEGA¹⁸-Pattern (Defense-in-Depth):**
- `lib/ki-provider-interface.js` (Service-Abstraction analog pdf-service-interface)
- `lib/ki-provider-anthropic.js` (Implementation, analog pdf-service-pdfmonkey)
- `lib/ki-provider-openai.js` (existing openai-call extracted)
- `lib/ki-provider-fallback-chain.js` (Primary → Fallback → Manual)

→ Service-Abstraction macht Migration sicherer + Future-Proof (z.B. spaeter Mistral, Gemini)

---

## 3. Block B — Beweisbeschluss-PDF-Upload

### Was Marcel will (Foundation, NICHT volle KI)
1. Upload-Interface (Drag-and-Drop, max 10MB, PDF/A or PDF)
2. PDF-Parser (basic Text-Extraction + Layout-Detection)
3. Pattern-Matching: Hauptfragen + Frist + Parteien + Aktenzeichen
4. Speicherung: `auftrag.beweisbeschluss_extrakt JSONB` (NEU)
5. SV-Editor-View fuer Korrektur
6. Schema-Versioniert: v1=manuell, v2=KI (Post-Pilot)

### Was Marcel-Direktive impliziert (Schema-NEU)
**Migration 11 (NEU)**: `auftraege` Erweiterung:
```sql
ALTER TABLE auftraege
  ADD COLUMN IF NOT EXISTS beweisbeschluss_pdf_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS beweisbeschluss_pdf_extrakt JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS beweisbeschluss_pdf_extrakt_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS beweisbeschluss_pdf_uploaded_at TIMESTAMPTZ;
```

**Anmerkung:** existing `auftraege.gericht_az` + `auftraege.details.beweisbeschluss_*` sind atomar gestaltet (Migration 02). Marcel-Beweisbeschluss-PDF + Volltext + Extrakt ist **erweitertes JSONB**.

### PDF-Parser-Decision
| Lib | Pro | Contra |
|---|---|---|
| **pdf-parse** | klein (~50KB), Promise-API, npm install simple | weniger Layout-Info, basic |
| **pdfjs-dist** | Mozilla-Quality, Layout-Coords, Annotations | gross (~5MB Bundle), Lambda-Cold-Start, browser-fokus |
| **pdfreader** | Stream-API, niedrig | unmaintained |

→ **Marcel-Decision B (existing in Direktive)**: B1 (pdf-parse, empfohlen fuer Foundation) ODER B2 (pdfjs-dist).

### Pattern-Matching fuer Hauptfragen
Beweisbeschluss-Texte folgen oft Mustern:
- "1. Es soll Beweis erhoben werden ueber die Frage, ob..."
- "Die Sachverstaendige hat folgende Fragen zu beantworten:"
- "Frist zur Erstattung des Gutachtens: ..."

Pattern-Library kann mit Regex bauen — kein KI noetig fuer Foundation.

### Marcel-Decision C (Aggressivitaet)
- C1 (empfohlen): Nur Pattern-Matching (basic, sicher, kein Halluzinations-Risiko)
- C2: Pattern + Light-LLM (Claude Sonnet 4.6 fuer Strukturierung) — extra Kosten + Latency
- C3: Volle KI-Analyse (Marcel-Direktive: "ZU FRÜH!")

### Disclaimer (Marcel-Pflicht)
> "📌 Hinweis: Die automatische Erkennung von Hauptfragen ist eine ERSTE STRUKTURIERUNGS-HILFE. Bitte pruefen Sie die Vollstaendigkeit anhand des Original-Beweisbeschlusses sorgfaeltig. Sie als bestellter SV bleiben nach §407a ZPO letztverantwortlich."

---

## 4. Block C — KI-Statistik-Tracking

### Marcel-Direktive
- Token-Cost pro User (fuer Admin-Cockpit)
- Model-Distribution (Claude vs GPT-4o vs Future-Models)
- Foto-KI-Usage (fuer 10/Monat-Limit Solo)
- Diktat-Minutes
- Avg-Response-Time

### Existing Schema (Migration 04 ki_protokoll)
✅ token_input, token_output, kosten_eur (6 decimals), dauer_ms, modell, provider, purpose
✅ aggregierbar via SQL: `GROUP BY modell, workspace_id, DATE_TRUNC('day', started_at)`

### Was fehlt
- Aggregation-View `v_ki_kosten_je_user_monat` (oder analog)
- Lambda-Endpoint `admin-ki-costs` existiert bereits (siehe MEGA²¹-Audit)
- Frontend-Charts im Admin-Cockpit (siehe MEGA²¹)

→ **Marcel-Decision (NEU):** Block C im Scope von MEGA²² (Aggregation-View + logKiCall) ODER nur Logging-Pflicht (Aggregation in MEGA²¹+)?

---

## 5. Disclaimer-Integration

Marcel-Direktive: PFLICHT bei
- ✅ Jedem KI-Output (HTML)
- ✅ PDF-Outputs (existing EU AI Act Box, MEGA¹⁸ W69 in MODE_C_GENERIC)
- ✅ Tooltip bei KI-Buttons
- ✅ AGB-Sektion erweitern

### Empfehlung: zentrale Library
`lib/prova-ki-disclaimer.js`:
```js
ProvaKiDisclaimer.html()           // HTML-Block fuer Frontend
ProvaKiDisclaimer.tooltipText()    // Plain-Text fuer title=""
ProvaKiDisclaimer.short()          // Kurzform fuer Modal-Header
```

→ Single-Source, alle Frontend-Pages laden + verwenden. AGB-Update **fuer Anwalt-Decision** (Marcel E1 aus MEGA²⁰: AGB-Page nicht selbst refactoren).

---

## 6. Marcel-Decisions pflicht (8x — 3 aus Direktive + 5 NEU)

### Aus Direktive
| # | Frage | Empfehlung |
|---|---|---|
| **A** | Foto-KI-Migration-Strategy | **A3** (Feature-Flag) — sicherer als Hard-Switch |
| **B** | PDF-Parser | **B1** (pdf-parse) — Foundation reicht |
| **C** | Beweisbeschluss-Aggressivitaet | **C1** (Pattern-Matching only) — Marcel-Direktive selbst sagt "C3 zu früh" |

### NEU (kritisch)
| # | Frage | Empfehlung |
|---|---|---|
| **G** | Was wirklich statt **GPT-5.4**? | **G2**: gpt-4o-mini (schnell) + gpt-4o (komplex) bleibt — existing Logic. ODER **G3**: o1-mini fuer Reasoning |
| **H** | Multi-Provider in ki-proxy ODER separat? | **H1**: Service-Abstraction-Pattern (lib/ki-provider-*) analog MEGA¹⁸ pdf-service. Marcel-Direktive nennt zwar `foto-ki-claude.js`, aber Service-Layer ist Future-Proof |
| **I** | logKiCall: Supabase ki_protokoll oder Airtable? | **I1**: Supabase ki_protokoll (existing Schema, Cleanup-Direction). Existing prova-audit.js bleibt rueckwaertskompatibel |
| **J** | Schema-Migration 11 Beweisbeschluss-Felder? | **J1**: ALTER TABLE auftraege ADD beweisbeschluss_pdf_* JSONB. Idempotent. |
| **K** | KI-Statistik-Aggregation in MEGA²² oder MEGA²¹? | **K1**: Logging in MEGA²², Aggregation-Views + Frontend in MEGA²¹ |

---

## 7. Capacity-Estimate (sehr ehrlich)

**Token-Realismus:** Session ist sehr lang (>22 Sprints). Restbudget realistisch ~50-70k.

Marcel-Direktive ist **sehr umfangreich** (3 Bloecke, 80+ Tests, alle 3 KI-Provider migrieren, PDF-Parser, Disclaimer-Integration ueberall).

| Tier | Tasks | Token | Confidence |
|---|---|---:|---:|
| **PRIMARY** | Service-Abstraction-Layer + Foto-KI-Claude (1 Use-Case) + Disclaimer-Lib + Migration 11 + Tests | ~60k | **55%** |
| STRETCH | + ki-proxy Multi-Provider-Routing fuer Text-Use-Cases (mit Marcel-G-Decision) | +20k | 25% |
| ULTIMATE | + PDF-Upload-UI + parse-beweisbeschluss.js + KI-Statistik-Aggregation | +35k | 5% |

**Ehrliche Einschaetzung:** Restbudget knapp. **MEGA²² in 2 Tranchen** ist sicherer als alles in einen Sprint:
- **MEGA²² (jetzt):** Block A Phase 1 — KI-Service-Abstraction + Foto-KI-Claude + Disclaimer-Lib
- **MEGA²² Phase 2 (eigener Sprint):** Block B Beweisbeschluss-PDF + Block C Aggregation

→ **Marcel-Decision L (NEU):** Tranchierung OK?
- L1: Alles in einem Sprint versuchen (Risiko: viele halbfertige Stuecke)
- **L2 (empfohlen)**: Nur Block A in MEGA²², Block B+C in MEGA²³

**Tests:** Ehrlich liefere ich **40-60** (nicht 80). Marcel-Wunsch 80 wahrscheinlich Stretch.

---

## 8. Empfohlener Implementation-Plan PRIMARY (NACH Marcel-OK)

```
W99   — npm install @anthropic-ai/sdk + package.json-Update + Tests
W100  — lib/ki-provider-interface.js (Service-Abstraction analog pdf-service)
W101  — lib/ki-provider-anthropic.js + lib/ki-provider-openai.js (Implementation)
W102  — netlify/functions/foto-ki-claude.js (existing foto-captioning.js erweitert oder separat)
W103  — lib/prova-ki-disclaimer.js (zentrale Disclaimer-Lib)
W104  — Disclaimer-Integration in 5+ KI-Pages (Tooltip + Output-Section)
W105  — Migration 11 Beweisbeschluss-PDF-Felder (PLANNED + versioniert)
W106  — Tests durchgehend (ehrlich 40-60)
W107  — Final-Report + sw.js v281
```

**STRETCH:**
- `parse-beweisbeschluss.js` Lambda + Pattern-Matching
- Beweisbeschluss-Upload-UI in Mode A (akte.html)
- ki-proxy.js Multi-Provider-Routing fuer Text

**ULTIMATE (NICHT versprochen):**
- KI-Statistik Aggregation-Views
- Frontend-Charts im Admin-Cockpit
- Vollst. KI-Migration (Diktat + KI-Hilfe)

---

## 9. Risk-Mitigation

| Item | Risiko | Mitigation |
|---|---|---|
| GPT-5.4 nicht existent | 🔴 hoch | Marcel-Decision G pflicht — sonst stoppe ich bei W101 |
| @anthropic-ai/sdk Lambda-Bundle-Size | 🟡 mittel | Anthropic-SDK ~1-2MB, Lambda-Limit 50MB unzipped → OK |
| Anthropic-API-Latency vs OpenAI | 🟢 niedrig | Sonnet 4.6 ist schnell genug (~2-3s typisch) |
| Migration 11 idempotent | 🟢 niedrig | ADD COLUMN IF NOT EXISTS Pattern (bewährt) |
| Disclaimer-Visibility (CSS-z-index) | 🟢 niedrig | Inline mit hoher Specificity |
| Service-Abstraction-Overhead | 🟢 niedrig | Pattern aus MEGA¹⁸ pdf-service bewährt, 0 Regressions damals |

---

## 10. Was MEGA²² NICHT machen wird (ehrlich)

- ❌ GPT-5.4 (existiert nicht)
- ❌ Vollstaendige KI-Migration aller 8+ Use-Cases (PRIMARY nur Foto-Vision-Claude)
- ❌ Beweisbeschluss-Volltext-Auto-Strukturierung (Marcel selbst sagt "Post-Pilot August")
- ❌ KI-Statistik Frontend-Charts (Admin-Cockpit ist MEGA²¹ Backlog)
- ❌ AGB-Sektion erweitern (Marcel-Decision E1 aus MEGA²⁰: Anwalt-Pflicht)
- ❌ Email-Notification bei KI-Disclaimer-Update
- ❌ A/B-Testing-Setup (kein Feature-Flag-System im Repo, ausser CSS-Coming-Soon)

---

## 11. ⏸️ STOPP-CHECKPOINT

**Marcel — bevor ich irgendwas baue:**

### 8 Decisions pflicht (3 alte + 5 NEUE)
| # | Frage | Empfehlung |
|---|---|---|
| **A** | Foto-KI-Migration-Strategy | A3 (Feature-Flag) |
| **B** | PDF-Parser | B1 (pdf-parse) |
| **C** | Beweisbeschluss-Aggressivitaet | C1 (Pattern-Matching) |
| **G** | Was statt GPT-5.4? | **G2** (gpt-4o-mini + gpt-4o behalten) ODER G3 (o1-mini fuer Reasoning) |
| **H** | Multi-Provider in ki-proxy oder separat? | **H1** (Service-Abstraction analog MEGA¹⁸) |
| **I** | logKiCall Target | **I1** (Supabase ki_protokoll) |
| **J** | Schema Migration 11 Beweisbeschluss | **J1** (ALTER TABLE auftraege idempotent) |
| **K** | KI-Statistik in welchem Sprint | **K1** (Logging MEGA²², Aggregation+Frontend MEGA²¹+) |

### Plus Capacity-Decision
- [ ] **L1**: Alles MEGA²² versuchen (Risiko)
- [ ] **L2 (empfohlen)**: Block A in MEGA²², Block B+C in MEGA²³

### Plus MEGA²¹-Klaerung
- [ ] **M1**: MEGA²¹ Audit-Doc als single docs-only Commit ablegen + spaeter implementieren
- [ ] M2: MEGA²¹ jetzt vor MEGA²² implementieren (Decisions A-F + Token-Budget)
- [ ] M3: MEGA²¹ komplett verwerfen (existing Admin-Cockpit reicht)

**Antwort bitte (Minimum):**
> A?, B?, C?, G?, H?, I?, J?, K?, L?, M? + Test-Erwartung 40-60 OK?

Falls alles **A3/B1/C1/G2/H1/I1/J1/K1/L2/M1** + 40-60 Tests OK → starte ich sofort mit W99.

Falls eine Annahme falsch ist (z.B. GPT-5.4 ist doch released, oder ich habe die existing ki-proxy.js falsch gelesen), jetzt korrigieren.

---

*Audit-Stand: 2026-05-08. KEIN Code geschrieben. Marcel-Freigabe pflicht.*
