# Session 4 — Architektur-Sparring · PROVA Systems
## Co-Founder-Level Concept Document · KEIN Code, nur Konzepte

**An:** Marcel + Co-Founder-Claude
**Von:** NinjaAI (Co-Founder-Modus)
**Datum:** Session 4 — Architektur-Sparring
**Scope:** 6+1 Themen, Sparring auf Augenhöhe, nicht Validierung

---

## Deliverables in dieser Lieferung

| Datei | Inhalt | Länge |
|-------|--------|-------|
| `00-README.md` | Diese Übersicht + Executive Summary | kurz |
| `01-TEIL-A-Recherche-Nachweis.md` | 22 Quellen mit URL + Kernbefund + Relevanz | mittel |
| `02-TEIL-B-Thema1-KI-maximal-helfen.md` | Was KI JETZT darf — 10 neue erlaubte Hilfen + Rote Linien | lang |
| `03-TEIL-B-Thema2-Audit-Trail.md` | Two-View-Strategie: Tech-Log + Human-Narrative | mittel |
| `04-TEIL-B-Thema3-HERZSTUECK-Asset-Fusion.md` | N×M×K×L → 1 Gutachten. Der Kern des Sparrings. | XXL |
| `05-TEIL-B-Thema4-Paragraph6-Werkzeuge.md` | Werkzeuge erreichbar ohne Toolbar-Wall | mittel |
| `06-TEIL-B-Thema5-IHK-Struktur-Inhaltsangabe.md` | IHK 4-Teile vs. PROVA 5-Teile — Hybrid-Lösung | lang |
| `07-TEIL-B-Thema6-Versand.md` | Download vs. SMTP vs. Plattform — DSGVO-Matrix + Empfehlung | lang |
| `08-TEIL-B-Thema7-Externe-Dokumente.md` | Bonus: Beweisbeschluss/Gegen-Gutachten einlesen | mittel |
| `09-TEIL-C-Architektur-ASCII.md` | 6 ASCII-Datenfluss-Diagramme | lang |
| `10-TEIL-D-UI-Patterns-Wireframes.md` | 8 ASCII-Wireframes für Schlüssel-Screens | lang |
| `11-TEIL-E-Pilot-Risiko.md` | Was darf im Pilot NICHT schiefgehen | mittel |
| `12-TEIL-F-Implementierungs-Reihenfolge.md` | 18 Items nach Aufwand S/M/L/XL + Abhängigkeiten | lang |

---

## Executive Summary (1 Seite)

### Die 7 Kernbefunde

**1. Die juristische Rückwand hat sich verschoben. Aggressiv.**
Das LG Darmstadt hat am 10.11.2025 (Az. 19 O 527/16) einem Sachverständigen das Honorar auf **0,00 EUR** festgesetzt, weil er KI nutzte und es verschleierte. Das Urteil ist das erste seiner Art — und es wird zitiert werden, bis der BGH etwas anderes sagt. Für PROVA ist das nicht Bedrohung, sondern **Wettbewerbs­vorteil**: Wir sind das erste System, das §407a-Compliance in die DNA einbaut, statt sie zu verstecken.

**2. Die IHK-Struktur ist 4-teilig, nicht 5-teilig — und das ist okay.**
PROVA verwendet 5 Teile (Deckblatt / Daten / Befund / Fachurteil / Zusammenfassung + Anhänge separat). Die IHK Köln empfiehlt 4 Teile (Deckblatt / Daten / Beantwortung / Zusammenfassung). Der Unterschied ist **keine Abweichung**, sondern eine **Verfeinerung**: PROVA splittet "Beantwortung" in "Befund" (objektiv) und "Fachurteil" (subjektiv). Das ist juristisch vorteilhaft — **solange der Export als IHK-konforme 4-Teile-PDF mit Vor-/Nachteils-Umschaltung möglich ist.**

**3. Das HERZSTÜCK (Thema 3) braucht eine neue Datenklasse: das "Befund-Fragment".**
N Diktate + M Fotos + K Skizzen + L Notizen fusionieren nicht zu "einem Gutachten" — sondern zunächst zu **Fragmenten** (atomaren Beobachtungen mit Provenance). Daraus baut KI einen **Befund-Entwurf mit Nachweiskette**. Der SV kann jede Aussage bis zum Ursprungs-Asset zurückverfolgen. Das ist nicht nur UX, das ist **§407a-Beweiskette in Code**.

**4. Audit-Trail muss zwei Leser bedienen — gleichzeitig.**
Technischer Log (INSERT-only, JSON) bleibt Pflicht. Darüber hinaus brauchen wir einen **Human-Readable-View**, der dem Gericht auf Nachfrage "was hat die KI gemacht" in 5 Minuten erklärt. Vorbild: Notion Audit Log (Event-Taxonomie) + Stripe Activity Logs (Aktor/Zeit/Ressource) + GitHub Activity Feed (natürliche Sprache).

**5. §6 Fachurteil-Werkzeuge: Kontext statt Toolbar.**
Die SV-Denke ist nicht "welches Werkzeug brauche ich", sondern "welche Aussage muss ich belegen". Deshalb: **Inline-Actions am Text**, nicht oben an der Toolbar. Bubble-Menu + Slash-Command-Register + "Werkzeug­leiste wenn Cursor in Tabelle" (kontextsensitiv).

**6. Versand ist DSGVO-rechtlich ein Minenfeld — Hybrid ist richtig.**
- Download (sicher, aber UX-schwach) = Basis (Stufe 1, ab Tag 1)
- Platform-Link mit Passwort + Ablauf = Premium (Stufe 2, Q2 2026)
- Eigenes SMTP im SV-Namen = Enterprise (Stufe 3, Q4 2026)
- Direkt-beA/DATEV = **NICHT bauen**, Konkurrenz zu DATEV wäre Selbstmord. Stattdessen: Export-Adapter.

**7. Bonus Thema 7 ist kein Bonus, es ist der zweite Moat.**
Wer Beweisbeschluss + Gegen-Gutachten + Akte einlesen kann und daraus strukturiert die Beweis­fragen extrahiert, hat etwas, das keine Konkurrenz hat. Das ist aber **Q4 2026 / Q1 2027** — nicht Pilot.

---

## Wie ich mit deinen Leitplanken umgegangen bin

| Deine Leitplanke | Mein Umgang |
|---|---|
| Vanilla JS, keine Frameworks | Alle Konzepte kommen ohne React/Vue/Alpine aus. TipTap als *einzige* Empfehlung für §6-Editor — aber als Buy-vs-Build entschieden mit Begründung |
| Nur Supabase Edge, keine neuen Netlify Fns | Alle neuen Pipelines laufen in Edge Functions. HERZSTÜCK-Fusion ist eine einzige neue Edge Function `asset-fusion-v1` |
| EU / Frankfurt | Whisper-Proxy, OpenAI-Proxy, pgvector alle Frankfurt. LanguageTool als self-hosted Docker-Container (EU-Pflicht) |
| §407a sacred | Jede KI-Aktion erzeugt ki_protokoll-Eintrag. Neu: "ki_protokoll.wirkung" = {vorschlag, übernommen, verworfen, bearbeitet} |
| KI-Provider-Namen niemals im UI | Durchgehalten. Einziger sichtbarer Name: "KI-Assistent" oder "Assistent" |
| "KI lernt dazu" verboten | Durchgehalten. Alternative: "Wissensbasis wächst" / "Fachdatenbank aktualisiert" |
| 15px+ / 44×44px | In UI-Wireframes berücksichtigt |

---

## Wo ich WIDERSPRECHE (Sparring, nicht Validierung)

1. **Thema 5 — IHK-Struktur:** Du fragst "5 Teile passt zu IHK?". Antwort: JA, aber anders als du denkst. Die IHK Köln sagt 4 Teile. Die 5 Teile von PROVA sind eine **Verfeinerung**, keine Abweichung. Ich schlage vor, beim 5-Teile-Modell zu bleiben UND einen **IHK-Export-Mode** anzubieten, der im PDF-Export die Teile 3+4 zu einem Kapitel mergt.

2. **Thema 6 — Versand:** Du listest 4 Optionen. Ich sage: baue **NICHT** beA/DATEV-Anbindung. Das ist deren Spielfeld, nicht deins. Stattdessen **beA-kompatibler Export-Adapter** (ZIP mit signierter PDF + XML-Metadaten). Der Anwalt lädt hoch, nicht du.

3. **Thema 3 — HERZSTÜCK:** Du denkst "N Diktate + M Fotos → 1 Gutachten". Ich sage: das ist zu grob. Der richtige Schritt ist **N+M+K+L → X Befund-Fragmente → 1 Befund-Entwurf**. Die Zwischenschicht ist nicht optional. Sie ist **die §407a-Beweis­kette**.

4. **Thema 1 — KI-Hilfe:** Du fragst "10 neue erlaubte Hilfen". Ich liefere 12, aber **eine davon rate ich ab**: Automatische Paragraphen-Vorschläge aus BGB/ZPO. Das ist §407a-grenzwertig, weil "Rechtsanwendung durch Hilfskraft" vorwerfbar. Stattdessen: Gerichtsurteils-Ähnlichkeits-Suche ohne Paragraphen-Vorschlag.

5. **Thema 4 — Werkzeuge:** Du willst "alle Werkzeuge einfach erreichbar". Ich sage: das ist falsch formuliert. Du willst "Werkzeuge erscheinen wenn gebraucht". Unterschied: Discoverability vs. Immer-sichtbarkeit. Toolbar-Wall vs. Contextual-Invocation.

---

**Start hier:** `01-TEIL-A-Recherche-Nachweis.md` — dort siehst du die 22 Quellen, auf denen alles folgende steht.

Alles andere baut darauf auf.
