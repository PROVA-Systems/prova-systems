# TEIL E — Pilot-Risiko-Einschätzung

**Frage (Marcel):** *"Was darf beim Pilot NICHT schiefgehen? Welche Teil-Features sind kritisch, welche nice-to-have?"*

---

## Die 3 tödlichen Risiken (show-stopper)

### Risiko 1 — §407a-Verletzung wird bekannt
**Was:** Ein Pilot-SV wird von einem Gericht oder Kammer darauf angesprochen, dass er KI genutzt hat, ohne es sauber offenzulegen. Kammer-Verfahren, Honorar-Streichung, Reputations-Schaden für SV und PROVA.

**Wahrscheinlichkeit:** Mittel (LG Darmstadt hat das Thema in die Öffentlichkeit gebracht, Kammern achten vermehrt)

**Impact:** Existenzbedrohend (für PROVA-Pilot)

**Prävention:**
1. Pilot-SV erhalten ein 30-Min-Onboarding-Gespräch, das die KI-Offenlegung explizit thematisiert
2. Jeder Export enthält automatisch den Zertifikats-PDF-Auszug — **kein Opt-Out**
3. Audit-Trail-Tab prominent in der Nav, SV wird ermutigt, ihn sich anzusehen
4. Legal-Hotline im Pilot-Paket: wenn ein Gericht nachfragt, kann der SV PROVA als Zeugen benennen

**Response-Plan falls doch:**
- Juristischer Beistand (Vertrag mit SV-spezialisierter Kanzlei vorab klären)
- Audit-Log liefert vollständigen Nachweis der SV-Kontrolle
- Zertifikat belegt redaktionelle Kontrolle (Art. 50 Abs. 4 EU AI Act)

---

### Risiko 2 — Datenverlust oder Daten-Leak
**Was:** Auftragsdaten (Fotos, Diktate, personenbezogene Daten) gehen verloren oder werden an Dritte geleakt. DSGVO-Meldepflicht 72h. Vertrauensverlust total.

**Wahrscheinlichkeit:** Niedrig (Supabase ist reif), aber Impact groß

**Impact:** Katastrophal

**Prävention:**
1. Supabase-PITR-Backups aktiviert (Point-in-Time-Recovery für 7 Tage)
2. Täglicher Dump auf separates EU-Bucket (z.B. Hetzner Object Storage)
3. RLS-Policy-Audit: jede Tabelle hat RLS auf `sv_id` oder `mandant_id` gemappt — automatisierter Test im CI
4. Keine Daten verlassen EU (PROVA-Regel 6) — durch DNS-Guard/Proxy erzwungen
5. Pseudonymisierung für OpenAI/Anthropic-Calls (Namen → UUID-Placeholder vor Send, Rück-Ersetzung bei Return)

**Response-Plan:**
- 72h-Meldewesen nach DSGVO Art. 33 vorbereitet (Template + Kontakt-Liste Behörden)
- Incident-Communication-Template pro SV vorbereitet
- Rollback auf letzten PITR-Snapshot < 30 Min

---

### Risiko 3 — KI halluziniert in den Befund, SV merkt es nicht
**Was:** Ein Befund-Fragment enthält eine KI-Halluzination (z.B. Messwert, der im Diktat gar nicht vorkam). SV übernimmt ungeprüft ins Gutachten. Gericht prüft, widerspricht einem Beweisstück, SV blamiert.

**Wahrscheinlichkeit:** Mittel (Multi-Modal-LLMs halluzinieren nach wie vor)

**Impact:** Hoch (Haftungs­frage, Reputationsschaden, PROVA-Verschulden umstritten)

**Prävention:**
1. **Jedes KI-generierte Fragment muss "geprüft" markiert werden bevor es in Befund fließt** — kein Auto-Weiterfluss
2. Vision-Caption-Fragment zeigt **3 Varianten** (nicht 1), SV muss wählen → zwingt zu Bewusstsein
3. Audio-Transkript-Fragmente zeigen **direkten Sprung zum Audio-Ort** (zum Nachhören)
4. KI-Warnung bei ungewöhnlichen Werten (Messwert-Plausibilität aus Thema 1 N6)
5. UI-Disclaimer oben im Fragment-Board: *"Du bist der Autor. KI hat vorgeschlagen. Prüfe jedes Fragment."*

**Response-Plan:**
- Bug-Bounty-System für Pilot-SV: wer eine Halluzination meldet, bekommt Lob + die Frage landet in einem QA-Dataset für Model-Evals
- Monatliches Halluzinations-Rate-Tracking (wie viele KI-Vorschläge werden korrigiert/abgelehnt)

---

## Die 7 mittleren Risiken

### Risiko 4 — Edge Functions Timeout bei großen Aufträgen
**Was:** Ein Auftrag mit 200 Fotos × Vision-Call dauert ca. 200 × 2 Sek. = ~7 Min. Supabase Edge Functions haben 150-Sek-Limit.

**Prävention:** 
- Parallelisierung (10 Calls gleichzeitig → 20 Sek.)
- Oder: Queue-basierter Ansatz, UI zeigt Progress ("12 von 200 Fotos verarbeitet...")
- UI optimiert für Hintergrund-Jobs (Benachrichtigung bei Abschluss)

### Risiko 5 — Pilot-SV findet das HERZSTÜCK "zu viel"
**Was:** Der SV lädt einfach nur hoch und bekommt 134 Fragmente präsentiert. Findet das einschüchternd, schließt den Tab.

**Prävention:**
- First-Run-Tour (3 Screens)
- Optional-Pfad: "Ich will direkt im Editor schreiben" (Fragment-Extraktion überspringbar)
- Mini-Case-Study (5 Min) im Onboarding: ein Demo-Auftrag mit 3 Diktaten zeigt den Fragment-Flow

### Risiko 6 — TipTap-Integration verzögert alles
**Was:** TipTap-Lernkurve + Custom-Extensions dauern länger als geschätzt, §6-Editor nicht pilotreif.

**Prävention:**
- Phasen-Release: §6-Editor erst mit TipTap, § 5 zunächst weiterhin mit altem Editor
- Zeit-Buffer: Pilot-Zeitplan mit 2 Wochen Puffer für Editor-Feinschliff
- Alternative: wenn TipTap zu lange dauert, MVP-Fallback auf simples contenteditable mit Slash-Menu (nicht optimal, aber funktional)

### Risiko 7 — DSGVO-Anfrage kommt, Self-Service-Export bricht
**Was:** Ein Pilot-SV wird von einem Mandanten um DSGVO-Auskunft gebeten. Unser Export-Feature hat Bug, liefert unvollständige Daten → DSGVO-Verstoß.

**Prävention:**
- Test-Auftrag mit synthetischen Daten, kompletter Auskunfts-Export manuell geprüft
- Fallback: wenn Self-Service bricht, Admin-Tool für manuelle Auskunft (dokumentiert)
- Pro Pilot-SV ein Support-Kontakt bei PROVA für solche Fragen

### Risiko 8 — Whisper-Transkript-Qualität zu schlecht
**Was:** Bayrischer Dialekt, Außengeräusche, mehrere Sprecher → Transkript wird unbrauchbar, Fragmente sind Müll.

**Prävention:**
- Pre-Processing (Noise-Reduction via FFmpeg)
- Whisper-Prompt-Engineering (Hinweis auf SV-Terminologie)
- Fall-back: wenn Qualität < X, SV bekommt Warnung + Option zur manuellen Korrektur vor Fragment-Extraktion
- Evtl. zweiter STT-Provider als Backup (Azure Speech Services EU für bessere deutsche Dialekt-Erkennung)

### Risiko 9 — pgvector-Performance bei vielen Fragmenten
**Was:** Ein SV hat nach 6 Monaten 50.000 Fragmente in `befund_fragmente`. Similarity-Suche dauert Sekunden.

**Prävention:**
- HNSW-Index auf embedding-Column (ab Start)
- Scope-Filter: Similarity-Suche nur innerhalb eines Auftrags ODER auftrags­übergreifend mit Limit 1000
- Monatliches Performance-Monitoring (Alerting ab 500ms)

### Risiko 10 — Export-PDF-Rendering langsam oder fehlerhaft
**Was:** Gutachten mit 50 Fotos, 3 Skizzen, 100 Seiten → PDF-Export bricht ab oder dauert 2 Min.

**Prävention:**
- Puppeteer-basiertes Rendering mit Chunking (je Kapitel separat → merge)
- Async-Pipeline: Export-Job läuft im Hintergrund, SV bekommt Download-Link per Notification
- Max-Größen-Schutz (bei > 500MB → Fehler-UI mit Kontakt-Hinweis)

---

## Die 5 leichten Risiken (manageable)

### Risiko 11 — SV vergisst Passwort für Platform-Share
**Prävention:** Self-Service-Reset, zweiter Token-Mail-Link. Log im audit_trail.

### Risiko 12 — Pilot-SV wünschen spezifische Features, die nicht im Scope sind
**Prävention:** Wunsch-Backlog transparent, monatliches Check-in, Erwartungs­management bei Pilot-Start ("Das sind die Features. Wünsche sammeln wir für V2.").

### Risiko 13 — Laut-/Stille-Mess-Geräte liefern spezielle Formate, die PROVA nicht liest
**Prävention:** Pilot-SV-Auswahl Richtung "klassische Bau-SV", nicht spezielle Messtechnik-Nerds. In V2 spezielle Geräte-Adapter.

### Risiko 14 — Mobile-UX unzureichend (SV will auf Baustelle iPad nutzen)
**Prävention:** Im Pilot nur Desktop/Laptop. Mobile explizit als "V2"-Feature kommuniziert. Aber: Upload-Flow mobil funktional (nur Upload, nicht Editing).

### Risiko 15 — Sprach-/Terminologie-Inkonsistenzen (PROVA-Regel 11)
**Prävention:** Master-Sprachregel-Liste, Review-Check in CI, Linguistischer Review pre-Launch.

---

## Pilot-Kritische Features (MUST-HAVE zum Start)

| Feature | Warum kritisch |
|---|---|
| Fragment-Extraktion aus Audio/Foto/Notiz | Herzstück, ohne geht's nicht |
| Fragment-Bühne mit Kurierungs-UI | Ohne Kurierung ist §407a verletzt |
| Marker-System im §5-Editor | Cross-Ref ohne Marker = Chaos |
| §6-Editor mit Slash-Menu + Bubble-Menu + Belege-Sidebar | Ohne ist Excel-Rückfall |
| Audit-Trail + Historie-Tab | Darmstadt-Schutz |
| PDF-Export mit Zertifikat | Ohne ist kein Darmstadt-Schutz |
| Download-Versand (Stufe 1) | Ohne kann SV nichts versenden |
| LanguageTool self-hosted | Rechtschreibung ist Basis |
| pgvector für Similarity (min. innerhalb Auftrag) | Cross-Ref braucht es |
| ki_protokoll.wirkung Feld + Aggregation | Zertifikat braucht es |

---

## Pilot-Optionale Features (NICE-TO-HAVE, können folgen)

| Feature | Wann? |
|---|---|
| Platform-Share (Stufe 2 Versand) | Q2 2026 |
| Externe Dokumente / Akte-Tab | Q3 2026 |
| Gegenüberstellungs-Modus für Vor-Gutachten | Q4 2026 |
| Auftrags­übergreifende Similarity | Nach Pilot-Feedback |
| Command-Palette (Cmd+K) | Pilot-Sprint 3-4 |
| First-Run-Tour | Pilot-Sprint 3 |
| Mobile-Upload | Q2 2026 |
| N8 Zusammenfassungs-Entwurf | Q3 2026 |

---

## Pilot-VERBOTENE Features (kommen nicht in den Pilot)

| Feature | Warum verboten |
|---|---|
| Automatisches Freigeben von Gutachten | §407a-Risiko |
| KI-Paragraphen-Vorschläge (N12) | §407a-Graubereich |
| Direkter SMTP-Versand im SV-Namen | DSGVO + Spoofing |
| Cross-Mandant-Lernen | DSGVO + PROVA-Regel 5 |
| KI-Provider-Namen im UI | PROVA-Regel 10 |
| Tier-Namen außer "Solo"/"Team" | PROVA-Regel 13 |
| Mandats-/Flow-Begriffe (A/B/C/D) | PROVA-Regel 16 |

---

## Success-Kriterien für den Pilot

Der Pilot ist erfolgreich, wenn nach 3 Monaten:

1. **Mind. 5 Pilot-SV** haben PROVA produktiv im Einsatz (>1 Gutachten pro Woche)
2. **Null Darmstadt-Vorfälle** (keine Kammer-/Gerichts-Beanstandung wegen KI-Offenlegung)
3. **Null DSGVO-Meldungen** (keine Datenschutz-Verstöße)
4. **Durchschnittliche Zeitersparnis ≥ 30%** pro Gutachten (SV-Selbstauskunft)
5. **NPS ≥ 50** (würde PROVA weiterempfehlen)
6. **KI-Akzeptanzrate > 60%** (Vorschläge werden akzeptiert statt abgelehnt, Messung über ki_protokoll.wirkung)
7. **Bug-Rate < 1 pro Pilot-SV pro Woche** (in den letzten 4 Wochen des Pilots)

Wenn 5 von 7 erreicht → Pilot verlängern / öffnen.
Wenn <5 von 7 → Ursachenanalyse + Pivot.

---

## Der 1-Satz-Pilot-Risk-Summary

> *Das größte Risiko ist NICHT technischer Natur, sondern juristisch-kommunikativ: Wenn ein Pilot-SV mit PROVA-generiertem Text vor Gericht auffliegt, ohne dass der Audit-Trail ihn schützt, ist der Pilot tot. Der Audit-Trail + Zertifikat ist deshalb nicht "Compliance-Ballast", sondern **die kritischste Feature im Pilot** — noch vor dem Editor.*
