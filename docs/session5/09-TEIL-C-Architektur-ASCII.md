# TEIL C — Architektur-Skizzen (ASCII)

6 Datenfluss-Diagramme für die Schlüssel-Pipelines.

---

## C.1 — HERZSTÜCK: Asset → Fragment → Befund → Gutachten

```
┌────────────────────────────────────────────────────────────────────────┐
│                             SV ARBEITET IM FELD                         │
└────────────────────────────────────────────────────────────────────────┘
        │                     │                   │                  │
        ▼                     ▼                   ▼                  ▼
  ┌──────────┐         ┌──────────┐        ┌──────────┐       ┌──────────┐
  │ 🎙️ Diktat │         │ 📸 Foto  │        │ ✏️ Skizze│       │ 📝 Notiz │
  │ .m4a     │         │ .jpg     │        │ .png     │       │ (scan)   │
  └────┬─────┘         └────┬─────┘        └────┬─────┘       └────┬─────┘
       │                    │                   │                   │
       └────────────┬───────┴────────┬──────────┴──────────┬───────┘
                    │                │                     │
                    ▼                ▼                     ▼
            ┌───────────────────────────────────────────────────┐
            │   EBENE 1 — ASSETS (Supabase Storage + Metadaten)   │
            │   ────────────────────────────────────────────────  │
            │   • fotos table (id, exif, raum_bezug, upload_ts)   │
            │   • audio_dateien (id, duration, whisper_transcript)│
            │   • skizzen table                                    │
            │   • notizen table                                    │
            └──────────────────────┬────────────────────────────┘
                                   │
                                   │  SV klickt "Fragmente extrahieren"
                                   │
                                   ▼
            ┌───────────────────────────────────────────────────┐
            │   EDGE FUNCTION: asset-to-fragments-v1             │
            │   ────────────────────────────────────────────────  │
            │   Router by asset_typ:                               │
            │   ├─ audio  → Whisper → chunk(2-3 sentences)        │
            │   ├─ foto   → Vision (GPT-4o) → 1-3 captions        │
            │   ├─ skizze → OCR + Vision → fragment per annotation│
            │   └─ notiz  → OCR → sentences                       │
            │                                                     │
            │   Per fragment: embedding(1536) + auto-tags          │
            │   audit_trail INSERT pro Fragment                    │
            │   ki_protokoll INSERT pro Call                       │
            └──────────────────────┬────────────────────────────┘
                                   │
                                   ▼
            ┌───────────────────────────────────────────────────┐
            │   EBENE 2 — BEFUND-FRAGMENTE (neue Tabelle)        │
            │   ────────────────────────────────────────────────  │
            │   befund_fragmente {                                 │
            │     id, auftrag_id                                   │
            │     quelle_typ, quelle_asset_id                      │
            │     text (2-3 Sätze)                                 │
            │     tags[], raumbezug, gutachten_teil                │
            │     embedding vector(1536)                           │
            │     status (roh/geprüft/verworfen/zusammengelegt)    │
            │     ki_generiert: bool                               │
            │   }                                                  │
            └──────────────────────┬────────────────────────────┘
                                   │
                                   │  SV kuratiert auf "Fragment-Bühne"
                                   │  (verwerfen/zusammenlegen/retaggen)
                                   │
                                   ▼
            ┌───────────────────────────────────────────────────┐
            │   EDGE FUNCTION: fragments-to-befund-v1            │
            │   ────────────────────────────────────────────────  │
            │   Input: kuratierte Fragmente (status=geprüft)      │
            │   1. Gruppiere nach raumbezug + gutachten_teil       │
            │   2. Pro Gruppe: LLM-Call mit Prompt:                │
            │      "Verbinde diese Fragmente zu zusammenhängendem  │
            │       Text. Erhalte Marker [🔗<id>] pro Fragment."    │
            │   3. Output: Markdown mit Inline-Markern             │
            │   audit_trail + ki_protokoll                          │
            └──────────────────────┬────────────────────────────┘
                                   │
                                   ▼
            ┌───────────────────────────────────────────────────┐
            │   EBENE 3 — BEFUND-ENTWURF                          │
            │   (in-memory, wird vom SV in §5-Editor übernommen) │
            └──────────────────────┬────────────────────────────┘
                                   │
                                   │  SV redigiert, bearbeitet (Klasse B/C)
                                   │  Marker bleiben erhalten → Cross-Ref
                                   │
                                   ▼
            ┌───────────────────────────────────────────────────┐
            │   EBENE 4 — FINALES GUTACHTEN                       │
            │   (SV-Eigenverantwortung, in gutachten-Tabelle)    │
            └───────────────────────────────────────────────────┘
```

---

## C.2 — Audit-Trail Two-View

```
        USER-AKTION                         SYSTEM
             │                                │
             ▼                                │
     ┌──────────────┐                        │
     │ SV klickt    │                        │
     │ "Vorschlag   │                        │
     │  akzeptieren"│                        │
     └───────┬──────┘                        │
             │                                │
             └──────────────┬─────────────────┤
                            ▼                 │
                  ┌─────────────────────┐    │
                  │ INSERT INTO         │    │
                  │ audit_trail {       │    │
                  │   event_type:       │    │
                  │   "ki.vorschlag_    │    │
                  │   akzeptiert",      │    │
                  │   payload: {...},   │    │
                  │   actor, ts, ip     │    │
                  │ }                   │    │
                  └──────────┬──────────┘    │
                             │                │
             ┌───────────────┴──────────┐    │
             │                          │    │
             ▼                          ▼    │
  ┌─────────────────┐      ┌──────────────────────┐
  │   SICHT 1:       │      │   SICHT 2:            │
  │   TECH-LOG       │      │   HUMAN-NARRATIVE     │
  │   (INSERT-only   │      │   (Edge Function       │
  │    raw JSONB)    │      │   generiert on-demand)│
  │                  │      │                       │
  │   DSGVO-Auskunft │      │   audit-narrative-v1: │
  │   Gerichts-CSV   │      │   Template-Mapping    │
  │   100 Jahre      │      │   pro event_type      │
  │   Retention      │      │                       │
  └──────────────────┘      │   → "🤖 14:15         │
                             │      KI-Assistent →    │
                             │      Marcel hat einen  │
                             │      Formulierungs-    │
                             │      Vorschlag in      │
                             │      §6.2 übernommen"  │
                             └──────────┬────────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │  UI: Historie-Tab     │
                             │  (Linear-style feed)  │
                             │  Filter + Cluster     │
                             │  Sidebar-Mini-Stats   │
                             └──────────────────────┘
```

---

## C.3 — Versand Stufen-Modell (Stufe 2 im Detail)

```
  SV IM EDITOR                     PROVA-SYSTEM                      EMPFÄNGER
      │                                  │                              │
      │  "Gutachten freigeben"           │                              │
      ├─────────────────────────────────►│                              │
      │                                  │                              │
      │  Dialog: Empfänger, Passwort,    │                              │
      │  Ablaufdatum, Zugriffs-Limit     │                              │
      │◄─────────────────────────────────┤                              │
      │  [Ausfüllen]                     │                              │
      ├─────────────────────────────────►│                              │
      │                                  │                              │
      │                                  │  1. PDF-Export generieren    │
      │                                  │  2. Storage-Upload (EU-FRA)  │
      │                                  │  3. Share-Token anlegen      │
      │                                  │     shares { token, pdf_id,  │
      │                                  │     empfänger_email,         │
      │                                  │     passwort_hash,           │
      │                                  │     ablauf_ts, zugriffe_max} │
      │                                  │  4. Audit-Trail INSERT       │
      │                                  │                              │
      │                                  │  Mail-Service (Postmark EU)  │
      │                                  │  ─────────────────────────►  │
      │                                  │                              │
      │                                  │                   [📧 Mail]  │
      │                                  │                              │
      │  "Link versendet" ✓              │                              │
      │◄─────────────────────────────────┤                              │
      │                                  │                              │
      │                                  │           "Ich öffne Link"   │
      │                                  │   ◄──────────────────────────┤
      │                                  │                              │
      │                                  │   Landing-Page mit Passwort  │
      │                                  │   ──────────────────────────►│
      │                                  │                              │
      │                                  │          Passwort eingeben   │
      │                                  │   ◄──────────────────────────┤
      │                                  │                              │
      │                                  │   passwort_hash prüfen       │
      │                                  │   audit_trail INSERT         │
      │                                  │   (first_access)             │
      │                                  │                              │
      │  📧 "Anwalt Meier hat das        │                              │
      │   Gutachten um 14:32 geöffnet"   │                              │
      │◄─────────────────────────────────┤                              │
      │                                  │   PDF-Inline-Viewer          │
      │                                  │   ──────────────────────────►│
      │                                  │                              │
      │                                  │   Nach 30 Tagen:             │
      │                                  │   Retention-Job löscht       │
      │                                  │   pdf + share entry          │
      │                                  │                              │
```

---

## C.4 — Cross-Reference via pgvector

```
                 SV IM §6-EDITOR
                        │
                        │  Cursor in Absatz X
                        ▼
              ┌──────────────────┐
              │ Client sendet:    │
              │ - absatz_text     │
              │ - auftrag_id      │
              └─────────┬────────┘
                        ▼
              ┌──────────────────┐
              │ Edge Function:    │
              │ similarity-v1     │
              │                   │
              │ embed(absatz)     │
              │   │               │
              │   ▼               │
              │ pgvector-Query:   │
              │                   │
              │ SELECT * FROM     │
              │  befund_fragmente │
              │ WHERE auftrag=X   │
              │ ORDER BY emb <=> ?│
              │ LIMIT 5           │
              │                   │
              │ SELECT * FROM     │
              │  wissen_diagnostik│
              │ WHERE sv_id=Y     │
              │ ORDER BY emb <=> ?│
              │ LIMIT 3           │
              └─────────┬────────┘
                        ▼
              ┌──────────────────┐
              │ Ergebnis:         │
              │ {                 │
              │  verknüpfte_      │
              │    fragmente: [], │
              │  zitat_           │
              │    kandidaten:[], │
              │  ähnliche_fälle:[]│
              │ }                 │
              └─────────┬────────┘
                        ▼
            UI-Sidebar aktualisieren
            (kein Auto-Insert!)
```

---

## C.5 — Externe Dokumente einlesen (Thema 7)

```
       SV lädt Beweisbeschluss.pdf hoch
                      │
                      ▼
       ┌──────────────────────────────┐
       │  externe_dokumente INSERT     │
       │  (typ=pending)                │
       │  → dateien.id                 │
       └────────────────┬─────────────┘
                        ▼
       ┌──────────────────────────────┐
       │  Trigger: Queue-Job           │
       │  extraction-queue             │
       └────────────────┬─────────────┘
                        ▼
       ┌──────────────────────────────┐
       │  Edge Function:               │
       │  external-doc-analyze-v1      │
       │                               │
       │  1. PDF.js → Text + Layout   │
       │     (falls OCR nötig:         │
       │      Tesseract oder Textract) │
       │  2. Typ-Klassifikation (LLM)  │
       │     → beweisbeschluss/        │
       │       vor_gutachten/akte      │
       │  3. Ebene 1: struktur         │
       │     (az, datum, parteien)     │
       │  4. Ebene 2: inhaltlich       │
       │     (JSON-Schema per Typ)     │
       │  5. embedding(volltext)       │
       │  6. UPDATE externe_dokumente  │
       │     SET status=done, ...      │
       │  audit + ki_protokoll         │
       └────────────────┬─────────────┘
                        ▼
       ┌──────────────────────────────┐
       │  UI-Notification an SV:       │
       │  "5 Beweisfragen erkannt.      │
       │   Übernehmen?"                │
       │  [Ja] [Bearbeiten] [Verwerfen]│
       └──────────────────────────────┘
```

---

## C.6 — Daten-Hoheit & EU-Lokalität (Gesamt-Übersicht)

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                      EU / FRANKFURT REGION                        │
  │  ┌──────────────────────────────────────────────────────────┐   │
  │  │                    SUPABASE (AWS FRA)                     │   │
  │  │                                                            │   │
  │  │  Postgres:  auftraege, fotos, audio_dateien, skizzen,     │   │
  │  │             eintraege, ki_protokoll, audit_trail,          │   │
  │  │             befund_fragmente (NEU), externe_dokumente(NEU),│   │
  │  │             wissen_diagnostik (pgvector)                   │   │
  │  │                                                            │   │
  │  │  Storage:   Fotos, Diktate, Skizzen, Notizen,             │   │
  │  │             Gutachten-PDFs, Export-ZIPs                    │   │
  │  │                                                            │   │
  │  │  Edge Fns:  asset-to-fragments-v1, fragments-to-befund-v1,│   │
  │  │             similarity-v1, audit-narrative-v1,             │   │
  │  │             external-doc-analyze-v1, ...                   │   │
  │  │             (alle 148 bestehenden + ~8 neue)               │   │
  │  │                                                            │   │
  │  │  pgvector:  in gleichen Cluster, keine Extra-Infra          │   │
  │  └──────────────────────────────────────────────────────────┘   │
  │                             │                                     │
  │  ┌──────────────────────────┴───────────────────────────────┐   │
  │  │  Externe EU-gehostete Services (Proxy-Pattern):           │   │
  │  │                                                            │   │
  │  │  • Whisper EU-Proxy (Azure OpenAI Frankfurt)              │   │
  │  │  • GPT-5.5 Proxy (Azure OpenAI Frankfurt)                 │   │
  │  │  • Claude (AWS Bedrock Frankfurt)                         │   │
  │  │  • Mail-Service (Postmark EU / SES eu-central-1)          │   │
  │  │  • LanguageTool (eigener Docker-Container Frankfurt)       │   │
  │  │                                                            │   │
  │  │  ALLE mit DPA + SCCs                                       │   │
  │  │  ALLE pseudonymisiert angesprochen                         │   │
  │  │  KEIN Klartext-PII ausgehend                               │   │
  │  └──────────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────────┘
                             │
                             │  KEIN Datenverkehr außerhalb EU
                             │
                             ▼
                         🚫 US/EMEA-non-EU 🚫
```

Alles was EU-Lokalität verletzen könnte ist **tabu**: kein US-Azure, kein US-AWS, kein US-OpenAI direkt, kein DocuSign, kein Grammarly-Cloud.

---

## Zusammenfassung der neuen Architektur-Bausteine

| Komponente | Neu / Erweiterung | Aufwand |
|---|---|---|
| `befund_fragmente` Tabelle + RLS | NEU | S |
| `externe_dokumente` Tabelle + RLS | NEU | S |
| Edge Fn `asset-to-fragments-v1` (+ 4 Sub-Typen) | NEU | L |
| Edge Fn `fragments-to-befund-v1` | NEU | M |
| Edge Fn `similarity-v1` | NEU | S |
| Edge Fn `audit-narrative-v1` | NEU | S |
| Edge Fn `external-doc-analyze-v1` | NEU | L |
| Edge Fn `mail-share-v1` (für Versand Stufe 2) | NEU | M |
| LanguageTool Docker-Container | NEU | S |
| `ki_protokoll.wirkung` Feld | ERWEITERUNG | XS |
| UI: Fragment-Bühne | NEU | L |
| UI: Marker-System im Editor | NEU | M |
| UI: Historie-Tab | NEU | M |
| UI: Akte-Tab (ext. Dokumente) | NEU | M |
| UI: Versand-Dialog Stufe 2 | NEU | S |
| TipTap-Editor-Integration | BUY (Dependency) | L |

**Summe: ~ 3-4 Monate mit 1 Full-Stack-Dev, 2-2,5 Monate mit 2 Devs.**

Pilot-MVP-Subset (ohne Thema 7, ohne Versand Stufe 2, ohne externe Dokumente): ca. **6-8 Wochen**.
