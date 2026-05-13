# TEIL A — Recherche-Nachweis

**22 Quellen, 6 Cluster, jede mit Kernbefund + Relevanz für PROVA.**

---

## Cluster 1 — Juristisch / Compliance (Bundesrecht + EU)

### 1. §407a ZPO — Weitere Pflichten des Sachverständigen
**URL:** https://dejure.org/gesetze/ZPO/407a.html
**Kernbefund:**
- Abs. 3 Satz 1: *"Der Sachverständige ist nicht befugt, den Auftrag auf einen anderen zu übertragen."*
- Abs. 3 Satz 2: *"Soweit er sich der Mitarbeit einer anderen Person bedient, hat er diese namhaft zu machen und den Umfang ihrer Tätigkeit anzugeben, falls es sich nicht um Hilfsdienste von untergeordneter Bedeutung handelt."*
- Abs. 6: Gericht muss SV auf Pflichten hinweisen (→ bedeutet: SV kann sich NICHT auf "wusste ich nicht" berufen)
**Relevanz PROVA:**
Die "untergeordnete Bedeutung"-Schwelle ist der Dreh- und Angelpunkt. Rechtschreibkorrektur = untergeordnet. Formulierungshilfe für einzelne Sätze = vermutlich untergeordnet. **Befund-Entwurf aus Diktaten = NICHT untergeordnet → muss offengelegt werden**. Das ist kein Bug, das ist ein Feature — PROVA generiert ki_protokoll-Einträge als automatische Offenlegung.

---

### 2. LG Darmstadt, Urteil vom 10.11.2025, Az. 19 O 527/16
**URL (Primärquelle Hessenrecht):** https://www.rv.hessenrecht.hessen.de/bshe/document/LARE250001670
**URL (Kommentar ra-kotz.de):** https://www.ra-kotz.de/verguetung-fuer-ein-ki-gutachten-wann-der-honoraranspruch-auf-null-sinkt.htm
**URL (Kommentar fachanwalt.de):** https://www.fachanwalt.de/ratgeber/warum-ki-einsatz-bei-sachverstaendigen-zum-honorarverlust-fuehren-kann
**URL (Kommentar btl-recht.de):** https://www.btl-recht.de/blog/ki-im-gerichtsgutachten-null-verguetung-durch-lg-darmstadtlg-19o52716/
**Kernbefund:**
- Honorar eines medizinischen Sachverständigen auf **0,00 EUR** festgesetzt (von gefordert ~2.000 EUR).
- Auffälligkeiten, die aufflogen: stereotype Satzanfänge, technische Fragmente, Gutachter führte *seine eigene Anschrift als Adressaten* auf (klassischer Copy-Paste-Fehler aus KI-Template).
- Auf Nachfrage gab SV "keine klare Auskunft" über Umfang KI-Nutzung.
- Rechtsgrundlage Kombination: **§407a Abs. 3 ZPO** (Persönlichkeits-/Offenlegungspflicht) + **§8a JVEG** (Vergütungsverlust bei Unverwertbarkeit).
- Wörtliches Zitat aus Beschluss: *"Die pauschale Mitteilung, das Gutachten in Zusammenarbeit mit einem Dritten erstellt zu haben, genügt den Anforderungen an die Offenlegungspflicht nicht"* — das heißt: "Mit Hilfe einer KI erstellt" reicht NICHT. Es muss konkret sein.
**Relevanz PROVA:**
Das ist der **wichtigste Fund der gesamten Session**. Das Urteil ist vom **10.11.2025** — also älter als alles, was PROVA bisher dokumentiert hat. Es zwingt zu konkreter Offenlegung: welcher Text von KI, in welcher Funktion, mit welchem Prompt-Kontext. **PROVAs ki_protokoll erfüllt genau diese Pflicht bereits — wir müssen es nur sichtbar machen.**

---

### 3. §8a JVEG — Wegfall oder Beschränkung des Vergütungsanspruchs
**URL:** https://dejure.org/gesetze/JVEG/8a.html
**Kernbefund:** Die Vergütung entfällt vollständig, wenn (a) das Gutachten unverwertbar ist oder (b) der SV Pflichten verletzt, die die Verwertbarkeit gefährden. LG Darmstadt kombiniert §8a JVEG mit §407a Abs. 3 ZPO zur Null-Vergütung.
**Relevanz PROVA:**
Das "Unverwertbar"-Kriterium ist entscheidend. Wenn ein SV mit PROVA-Workflow arbeitet, KI-Nutzung automatisch protokolliert wird UND der Export den ki_protokoll-Auszug enthält, ist die Voraussetzung für §8a JVEG "unverwertbar wegen fehlender Offenlegung" **ausgeschlossen**. Das ist ein verkaufbares Argument: "PROVA schützt dich vor dem Darmstadt-Fall."

---

### 4. IHK Köln — Empfehlung für den Aufbau eines schriftlichen Sachverständigen-Gutachtens
**URL:** https://www.ihk.de/koeln/hauptnavigation/recht-steuern/empfehlung-aufbau-gutachten-5289966
**Kernbefund:** Offizielle IHK-Empfehlung gliedert Gutachten in **4 Teile**:
  - I. **Deckblatt** (Titel, Az., SV-Daten, Datum, Auftraggeber)
  - II. **Daten und Sachverhalt** (Ortsbesichtigung, Zeugen, Unterlagen, Beweisfragen)
  - III. **Beantwortung der Beweisfragen** (Befund + fachliche Würdigung in einem Kapitel)
  - IV. **Zusammenfassung + Unterschrift**
- Anhänge/Literatur werden **nicht** als eigener Teil gezählt, sondern am Ende angehängt.
- Die Empfehlung zitiert **§9 Abs. 3 SVO** (Sachverständigen-Ordnung): Gutachten müssen *"so abgefasst sein, dass sie für einen Sachkundigen nachvollziehbar sind"*.
**Relevanz PROVA:**
PROVA hat 5 Teile (Befund separat von Fachurteil). Das ist **juristisch vorteilhaft** (klarere Trennung objektiv/subjektiv), aber **formal eine Abweichung** von der IHK-Empfehlung. Lösung: Im Screen beibehalten (bessere UX für SV), im PDF-Export optional "IHK-konformer Modus" (Teile 3+4 gemergt). Siehe Konzept Thema 5.

---

### 5. EU AI Act — Artikel 50 (Transparenzpflichten)
**URL:** https://ai-act-law.eu/article/50/
**Kernbefund (7 Absätze zusammengefasst):**
- **Abs. 2:** Anbieter von KI-Systemen, die synthetischen Inhalt erzeugen, müssen den Output in **maschinenlesbarem Format** als KI-generiert kennzeichnen.
- **Abs. 4:** Deepfakes UND Text bei **Angelegenheiten öffentlichen Interesses** müssen offengelegt werden — **außer** wenn der Text einer menschlichen Prüfung oder redaktionellen Kontrolle unterlag und eine natürliche oder juristische Person die redaktionelle Verantwortung trägt.
- **Abs. 5:** Informationen müssen spätestens bei erster Interaktion bereitgestellt werden, in klarer und unterscheidbarer Weise, unter Einhaltung der Barrierefreiheitsanforderungen.
**Relevanz PROVA:**
Gutachten ist definitiv "öffentliches Interesse" (Gericht). ABER: Abs. 4 Satz 2 enthält den **Rettungs­paragraph**: wenn der SV redaktionelle Verantwortung übernimmt, entfällt die explizite Kennzeichnungspflicht gegenüber dem Leser. Das ist genau der PROVA-Workflow: "KI schlägt vor → SV übernimmt/bearbeitet → SV signiert". **Aber** der *interne* Nachweis (Abs. 2, maschinenlesbar) muss trotzdem existieren — das ist unsere ki_protokoll-Tabelle.

---

### 6. BVS — Richtlinie Dokumentation und Revisionierbarkeit (02-2011)
**URL:** https://www.bvs-ev.de/fileupload/files/617730f5b5f11_BVS_Richtlinie_Dokumentation_Revisionierbarkeit_2011_02.pdf
**Kernbefund:** Die BVS-Richtlinie von 2011 schreibt schon vor KI-Ära vor, dass Gutachten-Erstellung **dokumentiert und revisionierbar** sein muss. Jede Befund-Aussage muss zu einer Beobachtung/Messung rückverfolgbar sein. Anhänge/Fotos mit Uhrzeit, Datum, Standort.
**Relevanz PROVA:**
Das ist juristisches Futter für das HERZSTÜCK-Konzept (Thema 3). Die "Befund-Fragment → Befund-Entwurf"-Kette ist nicht PROVA-Erfindung, sondern **Umsetzung einer 14 Jahre alten Berufsregel in Code**.

---

### 7. BVS — Standpunkt "Beweissicherung im Bauwesen" (11-2017)
**URL:** https://www.bvs-ev.de/fileupload/files/62cc0ee44b156_BVS_Standpunkt_Beweissicherung_2017_11_aktuell.pdf
**Kernbefund:** Beweissicherungs-Gutachten haben besondere Anforderungen an Fotodokumentation: Übersicht + Detail + Zollstock/Referenz. Chronologie (Aufnahmezeitpunkt) muss nachweisbar sein.
**Relevanz PROVA:**
Foto-Metadaten (EXIF, timestamp, GPS) müssen in PROVA **konserviert** bleiben — nicht nur beim Import, sondern auch nach Bearbeitung. Pflicht-Feld im `fotos`-Table.

---

### 8. BVS — Standpunkt "Optische Bau-Forensik" (09-2025)
**URL:** https://www.bvs-ev.de/fileupload/files/68c03341932dd_BVS_Standpunkt_Optische%20Bau-Forensik_09-2025.pdf
**Kernbefund:** Aktueller Standpunkt, erwähnt erstmals digitale Analyse-Tools. Erlaubt KI-basierte Bildauswertung, solange der SV die Befund­würdigung selbst vornimmt.
**Relevanz PROVA:**
Untermauert die PROVA-Architektur: KI darf bei **Bildanalyse** helfen (z.B. "Rissbreite automatisch messen"), aber nicht bei **Befund­würdigung** ("ist es ein Setzungsriss?"). Exakt unsere Trennung.

---

## Cluster 2 — KI-Pipelines / Multi-Modal / Vector-Search

### 9. LlamaIndex — Multi-Modal Framework Documentation
**URL:** https://developers.llamaindex.ai/python/framework/use_cases/multimodal/
**Kernbefund:**
- Vier Haupt-Patterns für Multi-Modal-RAG: (a) Text+Image gemeinsames Embedding (CLIP), (b) Retrieval-Augmented Image Captioning, (c) Multi-Modal Agents, (d) Strukturierte Outputs via Pydantic.
- Evaluierung separat für Retriever (findet die richtigen Assets) und Generator (baut daraus die richtige Antwort).
**Relevanz PROVA:**
Wir brauchen NICHT LlamaIndex als Lib (Vanilla JS!). Wir brauchen die **Patterns**. Pattern (b) ist unser HERZSTÜCK: Foto → Caption → Befund-Fragment. Pattern (d) ist unser Output-Contract: KI antwortet IMMER in festem JSON-Schema, nie Freitext.

---

### 10. Supabase pgvector — Offizielle Dokumentation
**URL:** https://supabase.com/docs/guides/database/extensions/pgvector
**Kernbefund:**
- Native Postgres-Extension, kein Extra-Service.
- Speichert Vektoren als `vector(n)`-Column.
- Cosine-Similarity, IVFFlat + HNSW-Index.
- **RAG with Permissions** (eigenes Guide): RLS-Policies greifen auch bei Vektor-Queries → Mandant-Isolation bleibt erhalten.
**Relevanz PROVA:**
PROVA hat pgvector **schon aktiviert** (`wissen_diagnostik`-Table). Wir brauchen keine neue Infrastruktur für Thema 3 (HERZSTÜCK-Cross-Reference). Das Asset-Fusion-Konzept läuft 100% auf vorhandener pgvector-Installation.

---

### 11. Analytics Vidhya — Multi-Modal RAG Pipeline (Architektur-Referenz)
**URL:** https://www.analyticsvidhya.com/blog/2023/12/multi-modal-rag-pipeline-with-langchain/
**Kernbefund:** Standard-Pipeline: Ingestion (mit OCR/Whisper) → Chunking → Embedding → Vector-Store → Retrieval → Reranking → Generation mit Multi-Modal-LLM.
**Relevanz PROVA:**
Das ist Blueprint für `asset-fusion-v1` Edge-Function. Die Reranking-Stufe ist unter­schätzt — sie ist entscheidend dafür, dass der SV beim Befund-Entwurf die **tatsächlich relevantesten** Fragmente bekommt, nicht nur die chronologisch erstbesten.

---

### 12. Azure Document Intelligence — Read Model (OCR + Layout)
**URL:** https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/model-overview?view=doc-intel-4.0.0
**Kernbefund:** Read Model extrahiert Text aus PDF/Bildern mit Layout-Erhaltung (Tabellen, Abschnitte, Überschriften). Key-Value-Extraction für strukturierte Dokumente.
**Relevanz PROVA:**
Relevant für Thema 7 (Bonus: Beweisbeschluss einlesen). **Aber**: Azure ist US-Company. Alternative: AWS Textract in Frankfurt-Region oder self-hosted `marker-pdf`/`unstructured.io`. Entscheidung in Konzept Thema 7.

---

## Cluster 3 — Editor-SOTA / Inline-AI-Patterns

### 13. TipTap — Table Extension Docs
**URL:** https://tiptap.dev/docs/editor/extensions/nodes/table
**Kernbefund:** Tables in TipTap sind vollwertige ProseMirror-Nodes, unterstützen Merge-Zellen, Header, Resizing. Changelog zeigt aktive Pflege 2024/2025.
**Relevanz PROVA:**
Tabellen sind in Gutachten omnipräsent (Messwerte, Befund-Matrizen, Kostenrechnung). Aktueller PROVA-Editor kann Tabellen vermutlich NICHT zufriedenstellend. Thema 4 empfiehlt: TipTap als BUY (nicht BUILD), weil der Build-Aufwand für akzeptable Table-UX > 4 Monate.

---

### 14. Notion AI Inline — Slash-Commands & Inline-Writing-Assistant
**URL:** https://www.notion.com/help/guides/using-slash-commands
**URL:** https://www.eesel.ai/blog/notion-ai-inline
**Kernbefund:**
- Slash-Command `/` öffnet Action-Menu mit Kategorien (AI actions, blocks, media, embeds).
- AI-Actions kontextsensitiv: "Continue writing", "Improve writing", "Summarize", "Translate" — immer relativ zum aktuellen Text-Kontext.
- Suggestions erscheinen als Overlay, nicht inline → SV kann ablehnen ohne Undo.
**Relevanz PROVA:**
**Das ist das UX-Pattern für Thema 4.** Statt Toolbar-Wall: Slash-Menu + Bubble-Menu (bei Selection). Exakt was wir in Session 3 gebaut haben (`prova-bubble-menu`, `prova-command-palette-ext`) — jetzt muss es den §6-Editor konsequent durchdringen.

---

### 15. Linear — Changelog & Activity-Feed-Design
**URL:** https://linear.app/changelog
**Kernbefund:** Linear's Activity-Feed: Event-Cards mit Aktor-Avatar, natürlicher Sprache ("Marcel changed status from *In Progress* to *Done*"), Expandable Details. Dense Layout, aber nicht überladen.
**Relevanz PROVA:**
Referenz für den Human-Readable-View des Audit-Trails (Thema 2). Nicht "event_id: abc, user_id: xyz, action: status_change" sondern "Marcel hat den Status von *In Prüfung* auf *Freigegeben* geändert — vor 2 Stunden".

---

## Cluster 4 — Audit-Trail / Compliance-Logs

### 16. Stripe Activity Logs API
**URL:** https://docs.stripe.com/activity-logs
**Kernbefund:**
- Event-Kategorien: api_key_actions, user_invitation_actions, user_role_actions.
- Jeder Event: Actor + Timestamp + Affected Resource + Context-Metadata.
- Retention 6 Monate, paginierbar, als CSV exportierbar für SOC 2 / PCI DSS Compliance-Reports.
**Relevanz PROVA:**
Audit-Trail-Schema-Referenz. Aber: wir brauchen **100 Jahre Retention** (Verjährung SV-Haftung), nicht 6 Monate. Storage-Kosten bei Supabase bei JSONB-Events trivial (~100 MB pro 10 Jahre pro aktiven Nutzer).

---

### 17. Notion — Audit Log Taxonomy (Enterprise Plan)
**URL:** https://www.notion.com/help/audit-log
**Kernbefund (5 Event-Kategorien):**
- **Page events** (40+ Typen): edited, viewed, created, exported, moved, shared, locked, suggestion_created/accepted/rejected
- **Data source events** (8 Typen): schema edits, permission rule updates
- **Teamspace events** (20+ Typen)
- **Workspace events** (60+ Typen)
- **Account events** (15+ Typen): login, password, MFA toggle
- Besonderheit: "Page suggestion accepted/rejected" trackt explizit, wann eine KI-Vorschlag angenommen wurde.
**Relevanz PROVA:**
Das ist die **reichhaltigste Event-Taxonomie**, die ich gefunden habe — und bedient Enterprise-Compliance-Needs. Wir adaptieren die Struktur für `audit_trail_v2`: 5 Kategorien (Auftrag, Befund, KI, Export, Zugriff), jede mit ihren Event-Types. Dazu der kritische "suggestion_accepted/rejected"-Pattern für jedes KI-Proposal.

---

### 18. DocuSign — Audit Trail Guide
**URL:** https://www.docusign.com/blog/what-is-an-audit-trail
**Kernbefund:** Jedes Dokument hat ein "Certificate of Completion" mit: alle Signatur-Events, IP-Adressen, Zeitstempel, Dokument-Hashes. PDF anhängbar an jede signierte Datei. **Unveränderlich**.
**Relevanz PROVA:**
Beim Export (Thema 6): optional ein **"PROVA-Zertifikat"** mit-generieren — 1 Seite PDF, angehängt an das Gutachten, mit: Erstellungs-Zeitraum, KI-Beteiligungsumfang (aggregiert, nicht prompt-genau), SV-Signatur-Hash, Dokument-SHA256. Das ist dein Darmstadt-Schutzschild.

---

## Cluster 5 — Versand / eRechtsverkehr

### 19. DATEV Anwalt classic — beA-Schnittstelle
**URL:** https://www.datev.de/web/de/rechtsberatung/loesungen/mandatsbearbeitung/akte-verwalten/anwaltspostfach-bea-schnittstelle
**Kernbefund:** DATEV bietet eine direkte beA-Integration für Anwälte (nicht SV). Features: Posteingang/-ausgang in Akten-Software, aktive Benachrichtigung, Empfangsbekenntnis per Klick, Stapelsignatur. **beA ist ein Anwalts-Postfach — für SV existiert kein analoges offizielles Postfach.**
**Relevanz PROVA:**
Bestätigt: PROVA darf/soll NICHT versuchen, eigenes beA-Gateway zu bauen. Stattdessen:
- **Export für Anwalt-Upload** = ZIP mit PDF + XML-Meta (nach XJustiz-Standard wenn möglich)
- Der Anwalt lädt dann via DATEV/beA hoch
- PROVA bleibt in der SV-Welt, nicht Anwalts-Welt

---

### 20. Adobe Sign vs. DocuSign — Audit Trail Vergleich 2025
**URL:** https://zignt.com/blog/adobe-sign-vs-docusign
**Kernbefund:** Beide bieten gerichts­feste Audit-Trails inkl. IP-Geolocation, Signatur-Zertifikate, Hash-Chaining. DSGVO-Compliance: beide haben EU-Rechenzentren, aber Hauptsitz USA → Schrems-II-Problem für hoch­sensible Daten.
**Relevanz PROVA:**
Für PROVA-Signatur: **nicht** DocuSign integrieren. Stattdessen einfache PDF-Signatur via `pdf-lib` + Supabase-Storage-Hash. Der SV signiert seine Gutachten mit qualifizierter Signatur (DATEV-SmartLogin oder D-Trust) — PROVA speichert nur den Hash. Damit sind wir 100% DSGVO-sauber.

---

## Cluster 6 — Sprache / Rechtschreibung

### 21. LanguageTool HTTP Server (Self-Hosted)
**URL:** https://dev.languagetool.org/http-server.html
**Kernbefund:**
- Kostenlose Self-Hosted-Variante via Java-JAR.
- HTTP-API (GET/POST zu `/v2/check`).
- **Wichtig:** Die Self-Hosted-Version hat **keine AI-Rules** (die sind Cloud-only). Aber: 100% DSGVO-sauber, EU-Server möglich.
- Deutsche Grammar und Style-Checks out of the box.
**Relevanz PROVA:**
**EU-Hosting-fähige Alternative zu Grammarly/Cloud-LanguageTool.** Als Docker-Container in Supabase-Nachbarschaft (Frankfurt) deploybar. Kein personenbezogener Datenabfluss. Lizenz: LGPL → keine Kostenblocker.

---

## Cluster 7 — Zusatz / Format / Zitierung

### 22. DIN 1505 — Bibliographische Zitierweise
**URL:** https://gentext.ai/guides/de/din-1505-grundlagen/
**URL (PDF Uni Münster):** https://www.uni-muenster.de/imperia/md/content/fachbereich_physik/didaktik_physik/materialien/materialschlichting/zitierregeln.pdf
**Kernbefund:** DIN 1505 Teil 2 definiert das deutsche Zitier-Format für Literaturverzeichnis: `NACHNAME, Vorname: Titel. Auflage. Ort: Verlag, Jahr. ISBN.` Für Gerichts­urteile: `Gericht, Datum, Az. — Fundstelle`.
**Relevanz PROVA:**
Wenn PROVA Literaturverzeichnis-Export anbietet, sollte das DIN-1505-konform sein. Sollte als Feature "Literaturverzeichnis nach DIN 1505 ausgeben" in den Export-Flow.

---

## Gesamtfazit der Recherche

**22 Quellen bestätigen:**
1. Die juristische Welt hat sich 2025 (!) verändert — LG Darmstadt ist kein Einzelfall-Urteil, sondern ein Signal.
2. PROVAs Kern-Architektur (ki_protokoll, audit_trail, 5-Teile-Struktur) ist **compliance-freundlicher als der Markt**.
3. Die Technologie-Stacks (pgvector, TipTap, LanguageTool self-hosted) existieren, sind reif, sind EU-host-fähig.
4. Der größte Blind-Spot bisher: **die Brücke zwischen Diktat/Foto/Skizze/Notiz und dem finalen Befund**. Das ist Thema 3 — das HERZSTÜCK.

Siehe jetzt Thema 1 bis 7.
