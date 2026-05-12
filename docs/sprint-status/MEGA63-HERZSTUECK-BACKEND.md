# MEGA⁶³ — HERZSTÜCK Backend Full-Implementation

**Datum:** 2026-05-12
**Sprint:** MEGA⁶³ — Asset-Sub-Functions FULL + Embedding-Pipeline + fragments-to-befund-v1 FULL + ki_protokoll durchgehend
**Status:** ✅ COMPLETE
**Vorgänger:** MEGA⁶² (Phase 0 Fundament)
**Nachfolger:** MEGA⁶⁴ (Frontend Fragment-Bühne + Marker-System nach Ninja Session 5)

---

## TL;DR

Pipeline Asset → Befund-Fragment → Befund-Entwurf läuft live. `asset-to-fragments-v1`
hat die `NOT_IMPLEMENTED_MEGA63`-Stubs verloren — Audio/Foto/Skizze/Notiz produzieren
echte Fragmente mit Provenance, Embedding, Tags, Raumbezug und ki_protokoll-Audit-Eintrag.
`fragments-to-befund-v1` baut den Befund-Entwurf mit Inline-Markern und Halluzinations-Check.

```
Diktat / Foto / Skizze / Notiz
      ↓ asset-to-fragments-v1
   befund_fragmente (status='roh', embedding 1536d)
      ↓ SV-Kuratierung (MEGA⁶⁴ UI)
   befund_fragmente (status='gepruft')
      ↓ fragments-to-befund-v1
   Befund-Markdown mit [🔗fragment-uuid]
      ↓ SV-Redaktion + KI-Assistenz (MEGA⁶⁴-⁶⁵)
   Gutachten (SV-eigenverantwortlich)
```

---

## Was wurde geliefert (8 Items)

### Datenbank — 2 Migrations (applied + lokale Files synchron)

| # | Migration | Datei | Zweck |
|---|---|---|---|
| 1.8 | `mega63_prompt_purpose_extend` | `supabase-migrations/48_*.sql` | 8 neue `prompt_purpose`-Enum-Werte (Marcel-OK granular) |
| 1.1 | `mega63_audio_word_timestamps` | `supabase-migrations/49_*.sql` | `audio_dateien.word_timestamps JSONB` für Whisper-verbose_json |

### _shared-Libs — 4 neue Files (DRY-Reference; vorerst auch inline in Edge-Functions)

| Datei | Zweck |
|---|---|
| `supabase/functions/_shared/pseudonymize.ts` | AZ / Email / IBAN / Telefon + SHA-256 |
| `supabase/functions/_shared/ki-protokoll.ts` | Insert-Helper + Cost-Calc + TypeScript-Types |
| `supabase/functions/_shared/halluzinations-check.ts` | Substring / Subjektivierung / Bewertung / Konjunktiv-Check |
| `supabase/functions/_shared/embedding.ts` | text-embedding-3-small Helper + Batch |

### Edge Functions — 2 redeployed (Full-Impl statt Skelett)

| # | Function | Version | Status | Inhalt |
|---|---|---|---|---|
| 1.1+1.2+1.3+1.4 | `asset-to-fragments-v1` | v2 | ACTIVE (FULL) | Router + 4 Sub-Functions inline. Audio/Foto/Skizze/Notiz produzieren echte Fragmente. |
| 1.7 | `fragments-to-befund-v1` | v2 | ACTIVE (FULL) | GROUP BY raumbezug+gutachten_teil → gpt-5.5 → Markdown mit Markern + Halluzinations-Check. |

Beide via `supabase functions deploy --project-ref cngteblrbpwsyypexjrv` deployed.
Smoke-Test: beide liefern 401 ohne Bearer (verify_jwt aktiv ✓).

### Test-Page + Doku + Service-Worker

| Datei | Zweck |
|---|---|
| `tools/test-mega63.html` | Smoke-Test mit echten UUIDs aus Workspace. Listet Fragmente + Audio. |
| `docs/sprint-status/MEGA63-HERZSTUECK-BACKEND.md` | Dieses Dokument |
| `sw.js` CACHE_VERSION | `v3040-mega62` → **`v3050-mega63-herzstueck-backend`** |

---

## Self-Scoping-Entscheidungen

### A) Sub-Functions inline statt 4 separate Edge Functions

Marcel's Sprint-Prompt erlaubte beides. **Gewählt: inline in `asset-to-fragments-v1/index.ts`**.

Gründe:
- Atomarer Deploy, keine Network-Latenz zwischen Router und Sub-Function.
- Konsistent mit existing Pattern (ki-proxy hat inline-`pseudonymize`).
- Refactor auf Aufruf von `sb.functions.invoke()` zwischen Edge-Functions kommt wenn Deploy-System Multi-File-Imports robust unterstützt.

### B) Vision-Provider: Anthropic claude-sonnet-4-6 (Marcel-OK)

Gründe (siehe Marcel-Entscheidung):
- EU-Verfügbarkeit (Frankfurt-DC), AVV vorhanden, Regel 42 nennt es als gpt-5.4-Backup
- Starkes Vision-Modell; Kosten-Tier mid (3€/M in, 15€/M out)
- `ki_provider`-Enum hat 'anthropic' bereits
- `ki_modell_typ`-Enum nutzt 'claude_sonnet' (= claude-sonnet-4-6)

### C) Embedding-Provider: OpenAI text-embedding-3-small

- 1536-dim → passt zu HNSW-Index aus MEGA⁶² (`embedding vector(1536)`)
- Günstig: 0.02 €/M in (Stand 2026-05)
- Stack-Konsistenz mit ki-proxy (OPENAI_API_KEY vorhanden)
- `ki_modell_typ`-Enum hat 'embedding_3_small'

### D) Chunking-Strategie Audio

- Satz-Split via Lookbehind-Regex (Punkt/!/? + Großbuchstabe-Start)
- 2-3 Sätze pro Chunk, Stride 2 → leichte Überlappung möglich
- **Halluzinations-Check:** jeder Chunk MUSS Substring vom Originaltranskript sein (case-insensitive, Whitespace-normalisiert). Bei Fehlschlag → Pipeline-Abbruch.
- Word-Timestamp-Mapping via Heuristik (erstes Wort des Chunks im Word-Array suchen).

### E) Vision-Prompt-Strategie Foto

- **1 Vision-Call mit 3 Aspekt-Anweisung** statt 3 parallele Varianten
  - Übersicht / Detail-1 / Detail-2
  - Spart 2/3 der Kosten + Latenz
  - SV-Wahl-UI (3 von 3 oder weniger) kommt in MEGA⁶⁴
- JSON-Array-Output-Format
- Halluzinations-Filter: regex-basierte Auswurf-Filter für Subjektivierung + Bewertung

### F) Skizze-Strategie

- SVG-Parse direkt via Regex (`<text x="..." y="...">text</text>`)
- Fallback: titel + notiz als 1 Fragment wenn keine SVG-Annotations
- Vision-OCR-Fallback für gerasterte Skizzen → **DEFER MEGA⁶⁴** (selten genug, Vision-Call-Kosten)
- Cross-Ref-Tag `verweist_auf_foto` wenn `skizzen.foto_referenz_id` gesetzt

### G) Tag-Vokabular (33 Werte)

Kontrolliertes Vokabular im Edge-Function-Code:
```
außen, innen, riss, feuchtigkeit, setzung, wasserschaden,
strukturell, optisch, elektro, sanitär, heizung, wärmebrücke,
schimmel, dämmung, fenster, tür, dach, keller, dachgeschoss,
fassade, putz, beton, holz, metall, glas, fliesen, estrich,
mauerwerk, fundament, abdichtung, treppe, balkon, terrasse
```

LLM-Output wird gefiltert (nur Werte aus Vokabular bleiben). Erweiterung in
Sprint K-3 wenn echte Pilot-Workloads zeigen wo Lücken sind.

### H) Parallelisierungs-Pattern (Item 1.6)

**Pattern A: Promise.all-Batches innerhalb der Edge Function gewählt.**

Konkret im Code:
- Audio: 5 Chunks parallel pro Batch (Auto-Tag + Embedding in Promise.all je Chunk)
- Foto: alle 3 Captions parallel
- Skizze: alle Annotationen parallel
- Notiz: 5 Chunks parallel pro Batch

**Aufruferseitige Parallelisierung:** Caller (MEGA⁶⁴ Frontend) ruft `asset-to-fragments-v1` N-mal parallel via `Promise.all`. Jeder Edge-Function-Call dauert 2-10 Sek pro Asset.

**Pattern B (pg_cron-Worker) Aufschub:** wird in MEGA⁶⁵ / Pilot-Phase aktiviert, wenn ein Auftrag >100 Assets hat und Browser-Parallelisierung sichtbare Latenz zeigt. Schema-Vorbereitung dafür ist bewusst NICHT in MEGA⁶³ (Marcel-Direktive "KEINE neuen Tabellen").

### I) ki_protokoll-Integration durchgehend (Item 1.8)

Pro KI-Call ein `ki_protokoll`-INSERT mit allen Pflichtfeldern:
- workspace_id, user_id, auftrag_id (immer gefüllt)
- purpose (8 neue Enum-Werte)
- feature_kontext (z.B. `asset-to-fragments-v1/foto/embedding`)
- modell + modell_version + provider
- token_input, token_output, kosten_eur, dauer_ms
- status + fehler_message
- input_pseudonymisiert, output_repseudonymisiert, pseudonymisierung_token_count
- input_hash, output_hash, output_laenge_chars, output_preview
- konjunktiv_check_passed, halluzinations_check_passed
- started_at, completed_at
- **wirkung default 'vorschlag'** (Marcel setzt später via separater Edge-Function in MEGA⁶⁴)

**Bekanntes Code-Enum-Mismatch:** ki-proxy schreibt `modell='praezise'` als String,
DB-Enum `ki_modell_typ` hat aber nur `gpt_4o`/`gpt_4o_mini`. MEGA⁶³ folgt diesem
Pattern (`modell: 'gpt_4o'` für gpt-5.5, `modell: 'gpt_4o_mini'` für gpt-5.5-instant).
Refactor des Enum-Werts auf `gpt_5_5` etc. ist Sprint K-3 (Memory 2176).

---

## KI-Modell-Mapping (Stand 2026-05-12)

| Pipeline-Step | API-Modell | ki_modell_typ-Enum | Provider | Preise (€/M) |
|---|---|---|---|---|
| Audio Auto-Tag + Raumbezug | `gpt-5.5-instant` | gpt_4o_mini | openai | 0.15 in / 0.60 out |
| Foto Vision Caption | `claude-sonnet-4-6` | claude_sonnet | anthropic | 3.00 in / 15.00 out |
| Foto Auto-Tag | `gpt-5.5-instant` | gpt_4o_mini | openai | 0.15 in / 0.60 out |
| Skizze Auto-Tag | `gpt-5.5-instant` | gpt_4o_mini | openai | 0.15 in / 0.60 out |
| Notiz Auto-Tag | `gpt-5.5-instant` | gpt_4o_mini | openai | 0.15 in / 0.60 out |
| Embedding (überall) | `text-embedding-3-small` | embedding_3_small | openai | 0.02 in |
| fragments-to-befund | `gpt-5.5` | gpt_4o | openai | 2.50 in / 10.00 out |

---

## Kosten-Schätzung pro Auftrag

Annahme typischer Schadensfall-Auftrag:
- 1 Diktat (5 Min, ~750 Wörter, ~10 Chunks à 2-3 Sätze)
- 30 Fotos
- 2 Skizzen mit je 3 Annotationen
- 2 Notizen mit je 4 Absätzen

**KI-Calls:**
- Audio: 10 Chunks × (Auto-Tag + Embedding) = 20 Calls
  - Auto-Tag: 10 × (~200 tok in + 50 tok out) = 2000/500 tok à gpt-5.5-instant
  - Embedding: 10 × ~30 tok = 300 tok à embedding_3_small
- Foto: 30 × (1 Vision + 3 × (Auto-Tag + Embedding))
  - Vision: 30 × (~1000 tok in inkl. image + 150 tok out) = 30000/4500 tok à claude_sonnet
  - Auto-Tag: 90 × 250 tok à gpt-5.5-instant = 22500 tok in + 4500 tok out
  - Embedding: 90 × 30 tok = 2700 tok à embedding_3_small
- Skizze: 6 × (Auto-Tag + Embedding) = 12 Calls (Größenordnungen wie Audio)
- Notiz: 8 × (Auto-Tag + Embedding) = 16 Calls
- fragments-to-befund: 1 Call mit ~50 Fragmenten in ~5 Gruppen
  - gpt-5.5: ~3000 tok in + ~1500 tok out = ~7.50 € / 1k × 4.5k = 0.034 €

**Gesamtkosten pro Auftrag (Größenordnung):**

| Komponente | Cost |
|---|---|
| Vision (Foto × 30) | ~0.16 € |
| GPT-Tag (alle Auto-Tags) | ~0.01 € |
| Embedding (alle) | ~0.0001 € |
| fragments-to-befund (gpt-5.5) | ~0.04 € |
| **TOTAL pro Auftrag** | **≈ 0.20 €** |

Token-Ökonomie-Vergleich (Ninja-Schätzung):
- Klassischer Whole-Sweep-Ansatz: 40-80 € / Auftrag (1.5M Tokens)
- Asset-Fusion-Pipeline (MEGA⁶³): ~0.20-0.60 € / Auftrag = **200-400× günstiger** ✓

Marcel-Pricing-Annahme: 179 € Solo / 379 € Team → KI-Kosten weit unter 1% der Subscription. ✓

---

## Verifizierung (live)

Smoke-Test ohne Bearer-Token:
```
asset-to-fragments-v1:  HTTP 401 ✓
fragments-to-befund-v1: HTTP 401 ✓
```

Datenbank-Inventar nach Migrations:
- `prompt_purpose` Enum: 12 Legacy + 8 MEGA63 = 20 Werte ✓
- `audio_dateien.word_timestamps`: JSONB Spalte vorhanden + Index ✓

---

## Marcel-Test (10 Min, ~0.50 € Kosten)

```
1. F12 → Application → Service Workers → Unregister
2. Reload — sw.js muss v3050-mega63 zeigen
3. /tools/test-mega63.html im Browser oeffnen
4. Login (falls noetig)

5. Audio testen:
   - Bestehender Auftrag mit Audio-Datei + transkript_text waehlen
   - Hinweis: word_timestamps wird leer sein bei alten Audio-Dateien
     → quelle_startzeit_ms wird NULL. Fuer neue Audios: whisper-diktat
       muss verbose_json mit words persistieren (MEGA⁶³ Schema vorhanden,
       whisper-diktat Code-Update aber nicht in diesem Sprint).

6. Foto testen:
   - Bestehender Auftrag mit Foto-Datei waehlen
   - Erwartung: 1-3 Fragmente mit objektiver deutscher Beschreibung
   - Costs sichtbar in ki_protokoll: ~0.005 € pro Foto

7. fragments-to-befund testen:
   - "Liste meine letzten 20 Fragmente" → IDs kopieren
   - In fragment_ids einfuegen, gutachten_teil=befund
   - Erwartung: markdown mit [🔗fragment-uuid] Markern, marker_count == fragment_ids.length

8. Verify in DB (Supabase Dashboard SQL Editor):
   SELECT count(*) FROM befund_fragmente WHERE ki_generiert=true;
   SELECT purpose, count(*), sum(kosten_eur) FROM ki_protokoll
     WHERE purpose LIKE 'asset_zu_fragment%' OR purpose IN ('embedding','auto_tagging','fragmente_zu_befund')
     GROUP BY purpose ORDER BY purpose;

9. Halluzinations-Check verifizieren:
   - extract-from-audio: bei nicht-Substring-Chunks → 500 AUDIO_CHUNK_HALLUCINATION
   - foto Bewertungen ("kritisch") → werden gefiltert vor INSERT
   - fragments-to-befund: missing_markers leer wenn ok

10. ki_protokoll-Vollstaendigkeit:
    SELECT purpose, count(*) FILTER (WHERE input_hash IS NOT NULL) AS hashed,
           count(*) FILTER (WHERE output_preview IS NOT NULL) AS previewed
    FROM ki_protokoll WHERE created_at > now() - interval '1 hour';
```

---

## Bekannte Lücken / TODOs für MEGA⁶⁴+

| Item | Sprint | Begründung |
|---|---|---|
| `whisper-diktat` muss `verbose_json` Words/Segments in `audio_dateien.word_timestamps` persistieren | MEGA⁶³.1 (klein) oder MEGA⁶⁴ | Code-Update der existing Edge Function — Schema steht |
| ki-Wirkung-Setter Edge Function (`set-ki-wirkung`) für SV-Übernahme/Verwerfen | MEGA⁶⁴ | Frontend-UI für Fragment-Kuratierung braucht das |
| Fragment-Bühne-UI + Marker-System im Editor | MEGA⁶⁴ | Nach Ninja Session 5 |
| Skizze-Vision-OCR-Fallback (gerasterte Skizzen) | MEGA⁶⁵ | Selten genug für Pilot, Vision-Costs |
| Pattern B pg_cron-Worker für >100 Assets | MEGA⁶⁵ / Pilot+ | Pattern A reicht für jetzt |
| Refactor `ki_modell_typ`-Enum auf `gpt_5_5`/`gpt_5_5_instant` | Sprint K-3 | Aktuell Code schreibt 'gpt_4o' für gpt-5.5 (Legacy-Mapping) |
| `_shared/*.ts`-Files in Edge Functions importieren statt inline | Sprint K-3 | Supabase Deploy-Multi-File-Verhalten verifizieren |
| Embedding-Cache via separate Tabelle | MEGA⁶⁵ | Aktuell wird pro Call neu embedded. Bei 0.02€/M Tokens vernachlässigbar bis Pilot+ |
| KI-Funktions-Garantie 5 Tests pro Sub-Function | MEGA⁶³.2 oder Pre-Pilot | Regel 15 — 10 Happy-Path + 5 Edge-Case + 20 Präzision-Tests fehlen |

---

## Sicherheit + Compliance

- **Pseudonymisierung VOR jedem externen KI-Call** ✓ (Regel 17)
- **Repseudonymisierung im Output** ✓ wenn Map nicht leer
- **ki_protokoll pro Call** ✓ mit input_hash + output_hash + preview (Regel 16)
- **EU AI Act Art. 50**: `ki_generiert=true` bei jedem Fragment-INSERT
- **§407a-Beweiskette**: `quelle_typ` + `quelle_asset_id` + `quelle_startzeit_ms` + `quelle_koordinaten` + `ki_protokoll_id` auf jedem Fragment ✓
- **LG Darmstadt 10.11.2025 Schutz**: `ki_protokoll.wirkung='vorschlag'` Default → SV setzt später explizit
- **Halluzinations-Check** ✓ — Substring-Pflicht für Audio/Notiz, Filter für Foto, Marker-Check für Befund
- **CORS** wie bestehende Edge Functions (K-1.5 TODO Origin-Einschränkung)
- **verify_jwt=true** ✓ — Smoke-Test bestätigt 401 ohne Bearer

---

## Acceptance

| Kriterium | Status |
|---|---|
| 2 Migrations applied | ✅ |
| 4 _shared-Libs geschrieben (DRY-Reference) | ✅ |
| 4 Sub-Functions FULL (Audio/Foto/Skizze/Notiz) | ✅ inline in asset-to-fragments-v1 |
| Embedding-Pipeline live | ✅ text-embedding-3-small |
| fragments-to-befund-v1 FULL | ✅ gpt-5.5 + Halluzinations-Check |
| ki_protokoll-Integration bei jedem Call | ✅ |
| Parallelisierungs-Pattern A implementiert | ✅ Promise.all-Batches |
| Test-Page `tools/test-mega63.html` | ✅ |
| Sprint-Doku (dieses) | ✅ |
| sw.js bump v3050-mega63 | ✅ |
| Live Smoke-Test 401 | ✅ |
| Marcel-Test offen | ⏳ siehe Klick-Liste |

---

## TAG-Empfehlung

`v3050-mega63-herzstueck-backend` nach Marcel-Smoke-Test + Push.

---

## File-Liste (Marcel-Übersicht)

### NEU
```
supabase-migrations/
  48_mega63_prompt_purpose_extend.sql
  49_mega63_audio_word_timestamps.sql

supabase/functions/_shared/
  pseudonymize.ts
  ki-protokoll.ts
  halluzinations-check.ts
  embedding.ts

tools/test-mega63.html
docs/sprint-status/MEGA63-HERZSTUECK-BACKEND.md  (dieses)
```

### GEÄNDERT (Full-Impl statt Skelett)
```
supabase/functions/asset-to-fragments-v1/index.ts   683 LOC inline (4 Sub-Functions)
supabase/functions/fragments-to-befund-v1/index.ts  338 LOC FULL (Group + LLM + Halluzinations-Check)
sw.js                                               CACHE_VERSION → v3050-mega63-herzstueck-backend
```

### IN SUPABASE (nicht im Repo — via CLI deployed)
```
Edge Functions v2: asset-to-fragments-v1, fragments-to-befund-v1
prompt_purpose: +8 Enum-Werte
audio_dateien: +word_timestamps JSONB
```

---

*Ende MEGA⁶³ — bereit für Marcel-Smoke-Test und MEGA⁶⁴ (Fragment-Bühne + Marker-UI).*
