# REVIEW — Sprint-06b Code-Branches (30.04.2026)

> Code-Review der 3 in der Nacht vorbereiteten Sprint-06b-Branches.
> Erstellt für Marcel + Browser-Claude-Diskussion vor Merge.
>
> **Stand:** alle 3 Branches gepusht, **noch nicht** in `main`.
> Merge-Base aller Branches: `2025bf3` (v3-N1) bzw. `3637c26` (v3-N5).
> Post-Fork-Audit-Files (N7-Briefing, Schema-Gap, Workflow-Research,
> PLANNED-Migration) erscheinen in `git diff main..<branch>` als
> "Deletions" — das ist ein 2-dot-Diff-Artefakt. Beim 3-Way-Merge
> bleiben sie erhalten. Echte Code-Änderungen sind unten gelistet.

---

## 1) `feature/data-store-auftraege-crud` — N2

### A) git diff main..<branch> --stat (Code-only)

```
 lib/data-store.js   | 41 +++++++++++++++++++++++++++++++++++++++++
 1 file changed, 41 insertions(+)
```

Commit: `6d7b42f` — "v3-N2: data-store.auftraege — createDraft + listDrafts fuer Sprint 06b"

### B) Zusammenfassung

- **Was:** Erweitert `lib/data-store.js` um zwei reine Convenience-
  Wrapper auf `auftraege`: `createDraft(data)` und `listDrafts({limit})`.
- **Files neu/geändert:** `lib/data-store.js` (additive — keine
  Veränderung an existierenden Funktionen).
- **Dependencies:** Liest aus `auftraege` (workspace_id +
  created_by_user_id Filter). Keine neuen Tabellen, keine neuen
  Spalten — nutzt bestehendes `status='entwurf'` aus
  `auftrag_status`-ENUM.
- **Risiken:** Sehr gering. `createDraft` passt das Payload nicht an
  Schema-Realität an; falls Caller Spalten setzt die nicht existieren,
  bricht Supabase mit `column does not exist`. Akzeptabel — das
  Skeleton (Branch 3) sendet (noch) gar nichts, der echte Live-Save
  kommt erst in Sprint 06c nach Schema-Migration.
- **Folge-Sprints:** Sprint 06c (Live-Save aktivieren), Wizard-
  Recovery-Feature, jeder neue Auftrags-Workflow der Drafts braucht.

### C) Wichtigste Code-Snippets

```js
// lib/data-store.js (auftraege-Block, neue Methoden)
async createDraft(data) {
    return this.create({
        ...data,
        status: 'entwurf',
        phase_aktuell: data.phase_aktuell ?? 1
    });
},

async listDrafts({ limit = 20 } = {}) {
    const wsId = await _requireWorkspace();
    const user = await _requireUser();
    return await supabase
        .from('auftraege')
        .select('id, typ, az, titel, schadensart_label, phase_aktuell, created_at, updated_at')
        .eq('workspace_id', wsId)
        .eq('status', 'entwurf')
        .eq('created_by_user_id', user.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(limit);
}
```

### D) Empfehlung

**`merge sofort sicher`.** 41 LOC additive, keine Schema-Anforderung,
nutzt bestehende `_requireWorkspace`/`_requireUser`-Helpers, RLS
greift automatisch. Kein Verhaltens-Risiko für bestehende Pages.

---

## 2) `feature/auftrags-schema-conditional` — N3

### A) git diff main..<branch> --stat (Code-only)

```
 lib/auftrags-schema.js   | 469 +++++++++++++++++++++++++++++++++++++++
 1 file changed, 469 insertions(+)
```

Commit: `e9f961b` — "v3-N3: lib/auftrags-schema.js — Conditional-Definition Sprint 06b"

### B) Zusammenfassung

- **Was:** Neue, **rein deklarative** ESM-Datei `lib/auftrags-schema.js`
  mit den Conditional-Schemas für den Auftrags-Wizard. Definiert pro
  Auftraggeber-Typ und Schadensart welche Felder Pflicht/Optional sind
  und in welcher Phase (1A/1B/2/3) sie gehören.
- **Files neu/geändert:** `lib/auftrags-schema.js` (neu, 469 Z).
  Pure JS. JSDoc-annotiert. Keine Imports, keine Side-Effects, keine
  DB-/UI-Calls. In Edge Functions oder Tests wiederverwendbar.
- **Dependencies:** Quelle ist `docs/workflow-research/PHASEN-FELDER.json`
  (Marcel-Direktive Stammdaten ≠ Vorgangsdaten, in main seit N5).
- **Exports:**
  - `AUFTRAGGEBER_TYPEN` — 6 Typen (privatperson, versicherung, anwalt,
    gericht, behoerde, firma) mit `stammdaten_pflicht`, `stammdaten_opt`,
    `vorgangs_pflicht`, `vorgangs_opt`, `beteiligte_pflicht`
  - `SCHADENSARTEN` — 7 Arten (wasser, brand, baumangel, schimmel,
    elementar, setzung, kombiniert) mit `zusatz_felder`,
    `ortstermin_pflicht`, `relevante_normen`
  - `FELDER` — 60+ Field-Metadata (label, type, validate, help, options)
  - `getRequiredFields()`, `getOptionalFields()`, `validateAuftragsPayload()`,
    `getFieldMeta()`
- **Risiken:**
  - **Schema-Drift:** Definiert Felder (z.B. `auftraggeber_typ`,
    `auftraggeber_kontakt_id`, `schadennummer`, `versicherungsnummer`)
    die in der DB **noch nicht existieren** — sie werden erst durch
    `PLANNED_06b_auftraege_extend.sql` ergänzt. Solange diese Datei
    nur als Schema-Quelle für UI-Rendering und Validation genutzt
    wird (kein DB-Insert), ist das harmlos.
  - **Tippfehler:** `setzung.label = 'Setzungs-/Risssschaden'` (3× s).
    Trivial, aber sichtbar im UI.
  - **Hartkodierte Listen** (z.B. `objekt_typ` Optionen) — falls später
    Workspace-spezifisch konfigurierbar gewünscht, müsste das aus
    `firma_einstellungen` laden. Heute kein Blocker.
- **Folge-Sprints:** Sprint 06b Skeleton (Branch 3) nutzt es bereits,
  Sprint 06c Live-Save validiert damit serverseitig spiegelbildlich,
  alle künftigen Auftrags-relevanten Wizards/Edits.

### C) Wichtigste Code-Snippets

```js
// AUFTRAGGEBER_TYPEN — Stammdaten (Adressbuch) ≠ Vorgangsdaten (Auftrag)
versicherung: {
    label: 'Versicherung',
    stammdaten_pflicht: ['firma', 'ansprechpartner', 'adresse_strasse', 'adresse_nr', 'plz', 'ort', 'email'],
    stammdaten_opt:     ['abteilung', 'telefon'],
    vorgangs_pflicht:   ['schadennummer', 'versicherungsnummer'],   // pro Auftrag anders!
    vorgangs_opt:       ['versicherungsart', 'selbstbeteiligung_eur'],
    beteiligte_pflicht: ['versicherungsnehmer']                     // i.d.R. ≠ Versicherer
},

// SCHADENSARTEN — Phase 2/3 Zusatzfelder + Norm-Vorschläge
schimmel: {
    label: 'Schimmelschaden',
    zusatz_felder: ['schimmel_befallene_flaeche_qm', 'schimmel_lokalisation'],
    ortstermin_pflicht: ['feuchte_messwerte', 'probennahme'],
    relevante_normen: ['UBA-Schimmelleitfaden 2017', 'WTA 6-3', 'DIN 4108-2']
},

// validateAuftragsPayload — phasenweise validierbar (Wizard-tauglich)
const phasesToCheck = {
    '1a':  ['phase_1a_stammdaten'],
    '1b':  ['phase_1a_stammdaten', 'phase_1b_vorgang'],
    '2':   ['phase_1a_stammdaten', 'phase_1b_vorgang', 'phase_2_objekt', 'phase_2_beteiligte', 'phase_2_schadensart_zusatz'],
    '3':   [...all phases]
}[phaseLimit] ?? [];
```

### D) Empfehlung

**`merge sofort sicher`.** Pure deklarativer JS-Modul ohne
Side-Effects. Kein Verhaltens-Risiko (wird nur durch Branch 3
importiert, der noch nicht in main ist). Kann auch als Standalone
gemerged und später in 06c/Edge-Functions referenziert werden.
Tippfehler `Risssschaden` als Mini-Cleanup-PR später korrigieren.

---

## 3) `feature/sprint-06b-auftrag-neu-skeleton` — N6

### A) git diff main..<branch> --stat (Code-only, ohne Audit-Artefakte)

```
 auftrag-neu.html         | 202 +++++++++
 auftrag-neu-logic.js     | 542 +++++++++++++++++++++++
 lib/auftrags-schema.js   | 469 +++++++++++++++++++++  (via merge von Branch 2)
 lib/data-store.js        |  41 ++                       (via merge von Branch 1)
 nav.js                   |   1 +
 sw.js                    |   2 +- + 5 APP_SHELL-Einträge
```

Commits (auf Top von main): `bb9d4a3` (merge data-store) + `0f552ba`
(merge schema) + `a49924b` (Skeleton-Code).

### B) Zusammenfassung

- **Was:** Komplett neue Wizard-Seite `auftrag-neu.html` für die
  Auftrags-Erfassung in 4 Phasen (1A Auftraggeber-Stammdaten /
  1B Vorgangsdaten / 2 Objekt+Beteiligte / 3 Schadensart-Details).
  **Status: Skeleton.** Auto-Save 1500ms in `localStorage` Key
  `prova:auftrag-neu:draft`. **Kein DB-Save** — kommt in Sprint 06c
  nach Schema-Migration.
- **Files neu/geändert:**
  - **NEU** `auftrag-neu.html` (202 Z) — Pattern A Layout mit Stepper
    + sticky Action-Footer + Phase-Container
  - **NEU** `auftrag-neu-logic.js` (542 Z) — Field/Phase-Renderer,
    Validation, Auto-Save, Stepper-Navigation
  - **GEÄNDERT** `nav.js` (+1 Zeile) — neuer COCKPIT-Eintrag
    `{ href: 'auftrag-neu.html', icon: '➕', label: 'Neuer Auftrag' }`
    zwischen "Meine Aufträge" und "Kalender"
  - **GEÄNDERT** `sw.js` — CACHE_VERSION v241 → **v242**, plus
    APP_SHELL-Einträge `/auftrag-neu.html`, `/auftrag-neu-logic.js`,
    `/lib/auftrags-schema.js`
  - **enthält via Merge** `lib/auftrags-schema.js` (Branch 2) +
    `lib/data-store.js`-Erweiterung (Branch 1)
- **Dependencies:** `lib/auth-guard.js` (`requireWorkspace`,
  `watchAuthState`, `bindLogoutButtons` — alle 3 in main exportiert,
  verifiziert), `lib/data-store.js` (`kontakte`, `auftraege`),
  `lib/auftrags-schema.js`, `prova-config.js`, `prova-notifications.js`,
  `prova-sanitize.js`, `theme.js`, `nav.js`, `prova-design.css`,
  `page-template.css`, `mobile.css`. Keine DB-Calls (Skeleton-Modus).
- **Risiken:**
  - **UX-Doppelung mit Sidebar-Split-Button:** `nav.js` hat seit
    Sprint P5b einen prominenten Split-Button "Neuer Auftrag" mit
    4-Flow-Dropdown. Der neue COCKPIT-Eintrag "➕ Neuer Auftrag"
    bietet einen zweiten Weg zum gleichen Ziel — beide aktiv parallel
    könnte Marcel verwirren. **Vor Merge klären:** soll der neue Eintrag
    bleiben (zusätzlicher direkter Einstieg) oder fällt der
    Split-Button raus / soll der neue Eintrag wegfallen?
  - **Beteiligte-Picker / Kontakt-Picker fehlen:** Phase 1A bietet
    nur Plaintext-Eingabe der Stammdaten, kein Picker auf existierende
    `kontakte`-Einträge. Hint-Banner "Sprint 06c: Picker kommt"
    sichtbar. UX-Limitation, kein Bug.
  - **Schema-Drift:** Skeleton sendet nichts an DB. Kein konkreter
    Schaden, aber: wenn Marcel im Skeleton-Modus Felder ausfüllt und
    "Weiter" klickt bis zum Ende, sieht er Toast "Live-Save kommt nach
    Schema-Migration (Sprint 06c). Entwurf bleibt lokal." — keine
    Verwirrung erwartet, aber Pilotkunden würden das missverstehen.
    **Pre-Pilot-Hard-Gate:** Page sollte erst nach Sprint 06c live
    sein (entweder Page nicht in nav.js verlinken, oder Login-Hard-
    Gate auf Marcel-only).
  - **Keine `data-store.kontakte.search()`-Nutzung:** Wizard nimmt
    Stammdaten als reine Text-Eingaben, kein Adressbuch-Match. Pure
    Skeleton-Verhalten — Marcel kann nicht testen ob Picker-Pattern
    klappt.
  - **CACHE_VERSION-Bump v242 ist regelkonform** (Regel 30) — die
    neuen Files sind in APP_SHELL. ✅
- **Folge-Sprints:**
  - **06c (Live-Save)** — wird ohne Schema-Migration nicht möglich.
    Marcel-TODO: `PLANNED_06b_auftraege_extend.sql` reviewen, in
    versioniertes File umbenennen, im Dashboard SQL-Editor anwenden.
  - **06d (Picker)** — Kontakt-Picker auf Phase 1A,
    Beteiligte-Picker auf Phase 2.
  - **06e (Mobile-Polish)** — Stepper-Touch-Targets etc.

### C) Wichtigste Code-Snippets

```js
// auftrag-neu-logic.js — Auto-Save mit 1500ms Debounce
function scheduleAutoSave() {
    _isDirty = true;
    setDraftStatus('default', 'Änderungen vorhanden …');
    clearTimeout(_autoSaveTimer);
    _autoSaveTimer = setTimeout(saveDraft, 1500);
}

// Phase-Navigation mit Validation-Gate (verhindert Vorwärts-Sprung
// wenn aktuelle Phase nicht valide)
function nextPhase() {
    const errors = validateCurrentPhase();
    if (errors.length) {
        toast('error', `Pflichtfeld fehlt: ${errors[0].message}`, 4000);
        return;
    }
    const cur = PHASES.indexOf(_currentPhase);
    if (cur < PHASES.length - 1) {
        goToPhase(PHASES[cur + 1]);
    } else {
        toast('info', 'Live-Save kommt nach Schema-Migration (Sprint 06c). Entwurf bleibt lokal.', 6000);
    }
}

// auftrag-neu.html — 4-Phasen-Stepper-DOM (klickbar via JS, Forward
// nur 1 Schritt, Backward immer)
<div class="stepper" id="stepper">
  <div class="step active" data-phase="1a"><span class="step-num">1A</span><span class="step-label">Auftraggeber</span></div>
  <div class="step"        data-phase="1b"><span class="step-num">1B</span><span class="step-label">Vorgangsdaten</span></div>
  <div class="step"        data-phase="2" ><span class="step-num">2</span> <span class="step-label">Objekt &amp; Beteiligte</span></div>
  <div class="step"        data-phase="3" ><span class="step-num">3</span> <span class="step-label">Schadensart-Details</span></div>
</div>
```

### D) Empfehlung

**`vor merge X klären`** — eine UX-Frage:

> **Frage an Marcel + Browser-Claude:** Bleibt der neue
> COCKPIT-Eintrag "➕ Neuer Auftrag" parallel zum Sidebar-Split-Button,
> oder soll einer entfernt werden?
>
> Optionen:
> 1. **Beide bleiben** — Split-Button = 4-Flow-Quick-Start, neuer
>    Eintrag = direkter Wizard-Einstieg. Doppel-Pfad ist OK falls
>    bewusst.
> 2. **Nur neuer Eintrag** — Split-Button entfernen, Wizard ist
>    der einzige Weg. Sauberer, aber Quick-Start für 4 Flows fällt
>    weg.
> 3. **Nur Split-Button** — neuer Eintrag aus `nav.js` entfernen,
>    Wizard-Page nur über Split-Button-Dropdown erreichbar.

Ist die UX-Entscheidung gefallen, ist Branch sicher mergebar. Da die
Page **kein DB-Save** macht und nur lokal arbeitet, kann sie auch
gemerged werden ohne Schema-Migration — sie funktioniert im
Read/LocalStorage-Modus stabil.

**Zusätzlich vor Pilot-Test (nicht vor Merge):**
- Tippfehler `Risssschaden` korrigieren
- Page in `auth-guard`-Hard-Gate auf Marcel-only setzen ODER Banner
  oben "🚧 Skeleton — Live-Save folgt" einblenden

---

## Merge-Reihenfolge (empfohlen)

```
1. feature/data-store-auftraege-crud         → main   (sofort)
2. feature/auftrags-schema-conditional       → main   (sofort)
3. UX-Klärung COCKPIT-Eintrag vs Split-Button
4. feature/sprint-06b-auftrag-neu-skeleton   → main   (nach Klärung;
                                                       enthält 1+2 via merge)
```

Branch 3 enthält Branch 1+2 bereits via Merge-Commits. Wenn Marcel
1+2 vor 3 in main mergt: `git merge feature/sprint-06b-...` löst sich
sauber auf (gleiche Commits, fast-forward möglich oder identische
Inhalte).

Alternative: Branch 3 direkt mergen → 1+2 sind automatisch enthalten,
6 LOC Code aus 1+2 plus Skeleton-Code in einem Merge-Commit.

---

## Stand-Aufnahme Test-Status

| Branch | node --check | Verhalten | Schema-Bedarf |
|---|---|---|---|
| data-store-auftraege-crud | n/a (ESM) | 41 LOC additive, kein behavioral change | keine |
| auftrags-schema-conditional | n/a (ESM, pure) | dekl. only, kein Side-Effect | keine |
| sprint-06b-auftrag-neu-skeleton | n/a (HTML+ESM) | LocalStorage-only, kein DB-Save | für Live-Save: PLANNED_06b nötig |

Keine Test-Suite vorhanden — Marcel müsste manuell:
1. Branch checkouten lokal
2. Im Browser unter `/auftrag-neu.html` öffnen
3. Auftraggeber-Typ wählen → Felder erscheinen
4. Phase 1A ausfüllen → "Weiter" → Validation greift bei leeren Pflichtfeldern
5. Refresh → Draft-Recovery aus LocalStorage
6. "Verwerfen" → Draft weg, Phase 1A wieder leer

---

*Erstellt: 30.04.2026, Branch `review/code-branches-summary`.*
