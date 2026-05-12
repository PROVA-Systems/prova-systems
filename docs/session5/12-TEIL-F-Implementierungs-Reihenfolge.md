# TEIL F — Implementierungs-Reihenfolge

**Frage:** *"In welcher Reihenfolge würde man das alles umsetzen? Was ist Aufwand S/M/L/XL? Was blockt was?"*

---

## Aufwands-Skala

- **XS** (≤ 0,5 Tage, 1 Person)
- **S** (1-3 Tage, 1 Person)
- **M** (1-2 Wochen, 1 Person)
- **L** (3-4 Wochen, 1 Person)
- **XL** (6-10 Wochen, 1 Person oder 3-5 Wochen mit 2 Personen)

---

## Phase 0 — Fundament (Woche 1-2 vor Pilot-Kick-off)

Diese Items haben keine funktionalen Abhängigkeiten zu anderen Themen. Einfach bauen.

| # | Item | Aufwand | Abhängigkeit | Thema |
|---|---|:-:|---|:-:|
| 0.1 | DB-Migration: Tabelle `befund_fragmente` + RLS | S | — | 3 |
| 0.2 | DB-Migration: `ki_protokoll.wirkung` enum-Feld | XS | — | 1/2 |
| 0.3 | DB-Migration: Tabelle `externe_dokumente` + RLS | S | — | 7 |
| 0.4 | DB-Migration: Tabelle `shares` (für Versand Stufe 2) | S | — | 6 |
| 0.5 | LanguageTool Docker-Container in Frankfurt deployed | S | — | 4 |
| 0.6 | DPA/AV-Vertrag-Template für Pilot-SV | M | (Legal-Review extern) | alle |
| 0.7 | TOMs-Dokument (DSGVO Art. 32) | M | 0.6 | alle |
| 0.8 | pgvector-HNSW-Indizes erstellt | XS | 0.1 | 3 |
| 0.9 | Audit-Trail-Schema-Erweiterung (5 Kategorien, Notion-inspiriert) | S | — | 2 |

**Phase 0 gesamt:** ~ 2-3 Wochen mit 1 Full-Stack-Dev + Legal-Unterstützung.

---

## Phase 1 — Pilot-MVP (Woche 3-10)

### Block A — HERZSTÜCK (Thema 3)
| # | Item | Aufwand | Abhängigkeit |
|---|---|:-:|---|
| 1.1 | Edge Function `asset-to-fragments-v1` · Sub-Function Audio (Whisper → Chunks) | M | 0.1, 0.2 |
| 1.2 | Edge Function `asset-to-fragments-v1` · Sub-Function Foto (Vision → Captions) | M | 1.1 |
| 1.3 | Edge Function `asset-to-fragments-v1` · Sub-Function Skizze | M | 1.1 |
| 1.4 | Edge Function `asset-to-fragments-v1` · Sub-Function Notiz (OCR) | S | 1.1 |
| 1.5 | Embedding-Pipeline (OpenAI text-embedding-3-small via EU-Proxy) | S | 0.1 |
| 1.6 | UI: Fragment-Bühne (neue Seite) | L | 1.1-1.5 |
| 1.7 | Edge Function `fragments-to-befund-v1` | M | 1.6 |
| 1.8 | Edge Function `similarity-v1` (pgvector API) | S | 0.8, 1.5 |

**Block A Summe:** ~ 7-8 Wochen mit 1 Dev, ~ 4 Wochen mit 2 Devs.

### Block B — Audit & Compliance (Thema 2)
| # | Item | Aufwand | Abhängigkeit |
|---|---|:-:|---|
| 1.9 | Edge Function `audit-narrative-v1` (Event → natürliche Sprache) | S | 0.9 |
| 1.10 | UI: Historie-Tab im Auftragsdetail | M | 1.9 |
| 1.11 | UI: Sidebar-Mini-Widget "Historie" auf allen Screens | S | 1.9 |
| 1.12 | KI-Cluster-UI (gruppierte KI-Events im Historie-Tab) | S | 1.10 |
| 1.13 | Export: Kompakt-Zertifikat (1-Seite-PDF) | M | 0.2, 1.9 |
| 1.14 | Export: Detail-PDF (volle Narrated History) | S | 1.13 |
| 1.15 | Export: Forensik-CSV (raw audit dump) | XS | 1.9 |

**Block B Summe:** ~ 3 Wochen mit 1 Dev.

### Block C — §6-Editor (Thema 4)
| # | Item | Aufwand | Abhängigkeit |
|---|---|:-:|---|
| 1.16 | TipTap als Dependency integrieren, Basis-Setup | M | — |
| 1.17 | TipTap Custom-Extension: Fragment-Marker | M | 1.6, 1.16 |
| 1.18 | TipTap Slash-Menu mit 10-12 Commands | M | 1.16 |
| 1.19 | TipTap Bubble-Menu (aus Session 3 portiert) | S | 1.16 |
| 1.20 | Kontext-Sidebar mit 5 Tabs (Belege, Literatur, Ähnlich, KI-Warnung, Struktur) | L | 1.17, 1.8 |
| 1.21 | Tabellen-Presets (Messwerte, Kosten, Schäden-mit-Fotos) | M | 1.16 |
| 1.22 | LanguageTool-Integration im Editor (passive underlines) | S | 0.5, 1.16 |
| 1.23 | §5-Editor analog zu §6 (oder Fallback auf contenteditable) | M | 1.16-1.22 |

**Block C Summe:** ~ 5-6 Wochen mit 1 Dev, ~ 3 Wochen mit 2 Devs.

### Block D — Versand Stufe 1 (Thema 6)
| # | Item | Aufwand | Abhängigkeit |
|---|---|:-:|---|
| 1.24 | PDF-Export Basis (mit Zertifikat + Anlagen-ZIP-Option) | M | 1.13 |
| 1.25 | PAdES-Signatur-Integration (D-Trust-API) | M | 1.24 |
| 1.26 | Download-UI mit Filename-Conventions | S | 1.24 |

**Block D Summe:** ~ 2 Wochen mit 1 Dev.

---

## Phase 2 — Nach Pilot-Start (Q2 2026, Woche 11-22)

| # | Item | Aufwand | Abhängigkeit | Thema |
|---|---|:-:|---|:-:|
| 2.1 | Versand Stufe 2: Tabelle `shares`, Edge Fn `mail-share-v1` | M | 0.4 | 6 |
| 2.2 | Versand Stufe 2: Empfänger-Landing-Page mit Passwort | M | 2.1 | 6 |
| 2.3 | Versand Stufe 2: Zugriffs-Notifications per E-Mail | S | 2.1 | 6 |
| 2.4 | Versand Stufe 2: Retention-Job (30 Tage auto-löschen) | S | 2.1 | 6 |
| 2.5 | Command-Palette (Cmd+K) mit allen Actions | M | 1.16-1.23 | 4 |
| 2.6 | First-Run-Tour (einmalig, überspringbar) | S | 1.6 | 4 |
| 2.7 | Plugin Vorschlag-Akzeptanz-Rate Dashboard (für PROVA-Team) | S | 0.2, 1.9 | — |
| 2.8 | Density-Toggle in User-Settings | XS | — | 4 |
| 2.9 | Auftrags­übergreifende Similarity (pgvector-Search erweitern) | S | 1.8 | 3 |

**Phase 2 Summe:** ~ 4-5 Wochen.

---

## Phase 3 — Q3 2026 (Woche 23-34)

| # | Item | Aufwand | Abhängigkeit | Thema |
|---|---|:-:|---|:-:|
| 3.1 | Edge Fn `external-doc-analyze-v1` (OCR + JSON-Schema-Extract) | L | 0.3 | 7 |
| 3.2 | UI: Akte-Tab für externe Dokumente | M | 3.1 | 7 |
| 3.3 | Beweisbeschluss-Auto-Übernahme in Beweisfragen | M | 3.1 | 7 |
| 3.4 | N8 Zusammenfassungs-Entwurf mit Schutz-UI (Pflichtfeld "geprüft") | M | 1.7 | 1 |
| 3.5 | beA-kompatibles Export-ZIP (XJustiz-Schema) | L | 1.24 | 6 |
| 3.6 | IHK-Export-Modus (4-Teile-Mapping) | M | 1.24 | 5 |
| 3.7 | TOC-Auto-Generator (2-Pass-PDF-Render) | M | 1.24 | 5 |
| 3.8 | DIN-1505-Literaturverzeichnis-Export | S | 1.24 | 5 |

**Phase 3 Summe:** ~ 7-8 Wochen.

---

## Phase 4 — Q4 2026 / Q1 2027

| # | Item | Aufwand | Abhängigkeit | Thema |
|---|---|:-:|---|:-:|
| 4.1 | Gegenüberstellungs-Modus (Split-View Vor-Gutachten vs. Befund) | L | 3.2 | 7 |
| 4.2 | Widerspruchs-Assistent (Text-Markierung + Cross-Ref) | M | 4.1 | 7 |
| 4.3 | Baupläne-Vision-Integration | L | — | 7 |
| 4.4 | Mobile-Upload-App (nur Upload, kein Editing) | XL | — | — |
| 4.5 | Multi-User-Collaboration im §6-Editor (Y.js) | XL | 1.16 | 4 |

**Phase 4 Summe:** ~ 10-14 Wochen (parallel mit Team von 3).

---

## Abhängigkeits-Diagramm (kritischer Pfad)

```
                    Phase 0 (alle unabhängig)
                         │
                         ▼
            ┌────────────┴────────────┐
            │                         │
            ▼                         ▼
         Block A                   Block C
        (HERZSTÜCK)               (§6-Editor)
        1.1→1.2→1.6              1.16→1.17→1.20
           │                         │
           └────────┬────────────────┘
                    │
                    ▼
                Block B (Audit)
                1.9→1.10→1.13
                    │
                    ▼
               Block D (Versand S1)
                1.24→1.25→1.26
                    │
                    ▼
            ┌─── PILOT GO-LIVE ───┐
            │                      │
            └─── Phase 2 ──────────┘
                Versand S2 + Command-Palette
                         │
                         ▼
                    Phase 3
                    Externe Dokumente + N8 + beA-ZIP
                         │
                         ▼
                    Phase 4
                    Gegenüberstellung + Collab + Mobile
```

**Kritischer Pfad bis Pilot-Go-Live:** Phase 0 → Block A → Block B (parallel) → Block D.
Block C kann parallel zu A/B laufen (unabhängig bis 1.17, das braucht 1.6).

---

## Team-Szenarien

### Szenario 1 — Solo-Dev (Marcel)
Pilot-MVP: ~ 16-18 Wochen (4-4,5 Monate)
Dabei reicht die Kraft für Block A oder C primär; das jeweils andere wird Compromise.

### Szenario 2 — 1 Full-Stack + 1 Front-End
Pilot-MVP: ~ 8-10 Wochen (2-2,5 Monate)
Full-Stack macht Block A (Edge Fns + DB), Front-End macht Block C (§6-Editor).
Block B + D zwischen beiden geteilt.

### Szenario 3 — 2 Full-Stack + 1 Designer/UX
Pilot-MVP: ~ 6-7 Wochen (1,5 Monate)
Parallelisierung über alle Blöcke, Design-Review laufend.

**Empfehlung:** Szenario 2 ist realistisch und anstrebbar. Szenario 1 ist möglich, aber anstrengend und spart nicht genug Zeit um den Markt-Vorsprung zu sichern.

---

## Die 10 wichtigsten Entscheidungen — in Reihenfolge

| # | Entscheidung | Deadline | Impact |
|---|---|---|---|
| 1 | TipTap JA/NEIN (oder custom Editor?) | Woche 1 | Hoch (Block C) |
| 2 | Vision-Provider: GPT-4o vs. Claude 3.7 vs. beide | Woche 1 | Mittel (Block A, Kosten) |
| 3 | Embedding-Provider: OpenAI via Azure vs. self-hosted | Woche 1 | Mittel (DSGVO) |
| 4 | OCR für externe Dokumente: Tesseract vs. Textract Frankfurt | Woche 2 | Mittel (Phase 3) |
| 5 | Fragment-Generierung automatisch nach Upload vs. manuell getriggert | Woche 3 | Hoch (UX) |
| 6 | Wie viele Pilot-SV? 3 / 5 / 10? | Woche 4 | Hoch (Feedback-Qualität) |
| 7 | Pilot-Honorar/Kostenmodell (kostenlos vs. symbolisch) | Woche 4 | Mittel (Bindung) |
| 8 | Externe Rechtsberatung (Vertrag, Darmstadt-Strategie) | Woche 2 | Hoch (Risiko) |
| 9 | TOMs-Dokument + AV-Vertrag-Template von Anwalt | Woche 3 | Pflicht (DSGVO) |
| 10 | Monitoring-Setup (Error, Performance, LLM-Rate) | Woche 5 | Hoch (Ops) |

---

## Was NICHT jetzt entscheiden müssen

- Pricing-Modell für V2 (erst nach Pilot-Feedback)
- Konkretes Branding/Design-Refresh (Session-3-Design ist "OUTSTANDING" — reicht)
- Mobile-App (Q1 2027 frühestens)
- Internationalisierung (erst nach deutschem Produkt-Market-Fit)
- Partner-Integrationen (DATEV-Buchhaltung etc.) — Q2 2027

---

## Die eine Zeile Zusammenfassung

**Pilot-Go-Live in ~ 10 Wochen mit 2 Devs, wenn Entscheidung #1 (TipTap) innerhalb Woche 1 fällt.**
