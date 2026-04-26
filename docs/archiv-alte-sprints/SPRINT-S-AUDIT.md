# Sprint S-AUDIT — Sicherheitsaudit (NUR LESEN, KEIN CODE-CHANGE)

> **PRIORITÄT 1 — ALLERERSTER Sprint vor allem anderen.**
> Pilotkunden-Sicherheit hat absolute Priorität.
> Dieser Sprint ändert KEINEN Code, sondern erstellt nur einen Audit-Report.

---

## Ziel

Systematische Überprüfung aller Sicherheitsaspekte von PROVA. Output: `docs/AUDIT-REPORT.md` mit **jeder gefundenen Lücke** und Empfehlungen wie sie behoben wird.

**Du fixt NICHTS in diesem Sprint.** Marcel reviewt den Report, dann startet `SPRINT-S-SICHER.md` mit der Behebung der freigegebenen Findings.

---

## Aufgaben

### Phase 1 — Multi-Tenant-Filter-Audit

Die größte Angst von Marcel: **dass ein SV die Daten eines anderen SV sehen könnte.**

**Aufgabe:**
- Suche in der gesamten Codebase nach allen Stellen wo Airtable angesprochen wird
- Suchmuster: `airtable`, `fetch.*\/v0\/`, `filterByFormula`, `tbl[A-Za-z0-9]+`
- Liste **jede einzelne** Stelle auf

**Für jede Stelle prüfe:**
- Ist `sv_email`-Filter im `filterByFormula` enthalten?
- Wird `sv_email` aus Server-Token geholt oder aus `localStorage`/`Request-Body`? (manipulierbar!)
- Gibt es Fallback-Logik wenn `sv_email` leer ist? (kritisch!)
- Wird beim Schreiben (POST/PATCH) die `sv_email` mitgegeben?

**Output:**
```
🔴 SICHERHEITSLÜCKE: <File>:<Zeile>
   Beschreibung: <was ist das Problem>
   Risiko: <was kann passieren>
   Behebung: <konkreter Fix-Vorschlag>
```

### Phase 2 — DSGVO-Pseudonymisierung-Audit

**Aufgabe:**
- Liste alle Stellen wo OpenAI angesprochen wird (`ki-proxy.js`, `whisper-diktat.js`, `foto-captioning.js`, etc.)
- Prüfe für jede Stelle: werden vor dem API-Call personenbezogene Daten ersetzt?
- Erwartete Pseudonymisierung: Vorname, Nachname, Adresse, Email, Telefon, IBAN, Steuernummer

**Für jede Stelle dokumentiere:**
- Wird Pseudonymisierung angewandt? (Ja/Nein/Teilweise)
- Welche Daten werden NICHT pseudonymisiert?
- Ist die Mapping-Tabelle (Original → Platzhalter) sicher (nur im Memory der Function)?

### Phase 3 — localStorage-Audit

**Aufgabe:**
- Suche jede Stelle mit `localStorage.setItem`/`getItem`
- Klassifiziere jede Verwendung:
  - **OK:** UI-Präferenzen (Theme, Sidebar-Zustand, last viewed page)
  - **GRENZWERTIG:** Cache-Daten die parallel in Airtable existieren
  - **🔴 KRITISCH:** primäre Speicherung von Geschäftsdaten (Kontakte, Fälle, Bausteine)

**Wichtige Suchstellen:**
- `import-assistent-logic.js` — Marcel weiß: Kontakte landen fälschlich in localStorage
- `kontakte-logic.js`
- `briefvorlagen-logic.js`
- `textbausteine-logic.js`

### Phase 4 — API-Endpoint-Auth-Audit

**Aufgabe:**
- Liste alle Netlify Functions in `/.netlify/functions/`
- Für jede Function:
  - Wird Authentifizierung verlangt? Wie?
  - Ist Rate-Limiting aktiviert? Wo?
  - Sind CORS-Header korrekt? (nicht `*` für sensitive Endpoints!)
  - Wird Input validiert? (XSS-Risiko bei reflection in HTML)
  - Werden Fehler-Messages preisgeben? (z.B. Stack-Traces nach außen)

### Phase 5 — PDF-URL-Sicherheits-Audit

**Aufgabe:**
- Wo werden PDF-URLs generiert? (`pdf-proxy`, `mahnung-pdf.js`, `rechnung-pdf.js`, `brief-pdf-senden.js`, `foto-anlage-pdf.js`, etc.)
- Sind die generierten URLs öffentlich raterbar?
- Haben sie Ablaufzeiten?
- Wer kann auf eine URL zugreifen wenn er sie kennt?

### Phase 6 — XSS und Input-Validation

**Aufgabe:**
- Suche nach Stellen wo User-Input direkt in HTML gerendert wird (`innerHTML`, Template Literals)
- Werden HTML-Sonderzeichen escaped? (`&lt;`, `&gt;`, `&amp;`)
- Besonders kritisch: Brief-Inhalte, Stellungnahmen, alles was aus Airtable kommt UND in HTML angezeigt wird

### Phase 7 — Auth-Flow-Audit

**Aufgabe:**
- Wie wird Login implementiert? (`auth-guard.js`, `app-login.html`)
- Was wird im localStorage gespeichert? (`prova_user`, `prova_sv_email`)
- Kann jemand `prova_sv_email` einfach umändern und sich als anderer User ausgeben?
- Gibt es Server-seitige Token-Verifikation?
- Auto-Logout nach Inaktivität? (Timeout?)

### Phase 8 — Error-Handler-Audit

**Aufgabe:**
- Werden Fehler an User angezeigt mit oder ohne sensiblen Inhalt?
- Wird `prova-error-handler.js` konsequent genutzt?
- Gibt es Stellen wo `try/catch` fehlt und die App komplett crasht?

---

## Output-Format

Erstelle die Datei `docs/AUDIT-REPORT.md` mit folgendem Aufbau:

```markdown
# PROVA Sicherheits-Audit-Report

Erstellt: <DATUM>
Code-Stand: <git commit hash>

## Zusammenfassung

- 🔴 Kritisch: X Findings
- 🟠 Hoch: Y Findings
- 🟡 Medium: Z Findings
- 🟢 OK: <Anzahl> geprüfte Stellen

## Phase 1 — Multi-Tenant-Filter

### 🔴 KRITISCH

#### Finding 1.1: archiv-logic.js Zeile XX
**Problem:** GET ohne sv_email-Filter
**Risiko:** SV könnte alle Fälle aller SVs sehen
**Behebung:** Filter ergänzen
**Empfohlener Code-Diff:**
```diff
- var url = '/v0/...' + table;
+ var url = '/v0/...' + table + '?filterByFormula={sv_email}=...';
```

[... weitere Findings ...]

## Phase 2 — DSGVO-Pseudonymisierung

[...]

## Phase 3 — localStorage-Audit

[...]

## Empfehlungen (Reihenfolge der Behebung)

1. Alle 🔴 sofort
2. Alle 🟠 vor Pilotkunden
3. Alle 🟡 in nächstem Quartal
```

---

## Akzeptanzkriterien

- [ ] `docs/AUDIT-REPORT.md` existiert
- [ ] Alle 8 Phasen abgearbeitet
- [ ] Jedes Finding hat: Datei + Zeile + Problem + Risiko + Behebungs-Vorschlag
- [ ] Zusammenfassung am Anfang mit Anzahl pro Schweregrad
- [ ] **KEIN Code wurde geändert** (es ist ein reiner Lese-Sprint)
- [ ] Liefere am Ende: "X kritische, Y hohe, Z mittlere Findings. Marcel sollte review entscheiden welche im Sprint S-Sicher gefixt werden."

---

## WICHTIGE Hinweise

- **Du fixt nichts.** Auch wenn ein Bug klein ist und schnell gefixt wäre — nicht jetzt. Marcel will erst den Überblick.
- **Sei brutal ehrlich.** Es ist besser 50 kleine Findings zu listen als nur 5 große. Lieber zu viel als zu wenig.
- **Empfehlungen müssen umsetzbar sein.** Schreib was konkret zu tun ist, nicht "sollte besser gemacht werden".
- **Wenn du unsicher bist ob es ein Problem ist:** als Finding listen, kommentieren "(unsicher, bitte verifizieren)".

---

## Nach Abschluss

Liefere:
1. `docs/AUDIT-REPORT.md`
2. Kurzes Status-Statement: "Audit fertig. X/Y/Z Findings. Empfehlung: zuerst kritische beheben."

**STOPPE dann** und warte auf Marcels Review. Erst nach seiner Freigabe startet Sprint S-Sicher.
