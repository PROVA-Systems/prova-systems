# MEGA¹⁷ — Mode-C-Completion Plan + Brutal-Critique

**Datum:** 2026-05-08
**Vorgaenger-Tag:** v223 (MEGA¹⁶ TRIPLE-MODE-COMPLETION) + Hotfix MEGA¹⁶.5
**Modus:** Implementation (Mode C VOLLSTAENDIG pilot-ready)

---

## 1. Brutal-Honesty: Was ist Mode C HEUTE?

### Was MEGA¹⁶ geliefert hat (60% Mode C):
- ✅ Schema `user_vorlagen` (Migration 08)
- ✅ Backend `parse-docx.js`: Upload + Parse + List + Delete
- ✅ Variable-Detection: `$Var` und `{{Var}}`
- ✅ einstellungen.html: Vorlage hochladen + Liste anzeigen + loeschen

### Was FEHLT fuer "echt nutzbar" (40%):
1. **Variable-Mapping-UI** — User kann erkannte Variablen NICHT mit PROVA-Feldern verknuepfen. `vorlage.variable_mapping JSONB` ist leer.
2. **Mode-C-Picker im Akten-Workflow** — User kann Vorlage nirgends auswaehlen.
3. **`auftraege.vorlage_id`** — Schema hat KEINE Referenz von Auftrag → Vorlage.
4. **PDF-Generation aus Mode-C-Vorlage** — keine Function existiert.
5. **Mobile-Restriction** — Mode C wird auf Mobile angeboten, Upload klappt nicht ohne File-Picker.

### Inventur: Was existiert technisch nicht?
- ❌ Es gibt KEINE `auftrag-anlegen.html` Page — Akten werden via `akte.html` und Edge-Functions angelegt
- ❌ PDFMonkey arbeitet mit pre-definierten Templates — Mode C ist user-uploaded HTML, das passt nicht ins PDFMonkey-Modell
- ❌ Puppeteer in Lambda waere 50MB+ (over Lambda-Limit)

---

## 2. Strategische Entscheidungen (Capacity-Honest)

### PDF-Generation: Stub statt Vollstaendig

**Begruendung:**
- PDFMonkey braucht JSON-Schema → user-HTML passt nicht
- Puppeteer-in-Lambda ist groesser als ENV-Limit
- HTML→PDF via Cloud-Service braucht Konto-Decision (DocRaptor, GotenbergCloud, etc.)
- KEIN Tag-Recommendation kann Marcel testen ohne PDF-Service-Decision

**Mein Approach:** `generate-pdf-mode-c.js` als Stub mit:
- Lade Vorlage + Akte aus DB
- Apply Variable-Mapping → returnt interpolated_html
- TODO-Block: PDF-Service-Decision (Marcel-Pflicht)
- 200-Response mit `{ html, mapping_applied: N, todo: 'pdf-service' }`
- Frontend: User sieht "Vorschau" mit interpoliertem HTML
- Pilotkunde kann noch nicht klicken "PDF speichern", sieht aber dass Mode C grundsaetzlich funktioniert

**Risiko:** Marcel waehlt PDF-Service spaeter, aber das ist akzeptabel — Vorlage-Upload + Mapping + Akten-Integration testbar ohne PDF.

### Mode-C-Picker im Akten-Workflow: in akte.html

**Begruendung:** akte.html ist die Detail-Seite fuer einen einzelnen Auftrag. Hier kann User:
- Mode auswaehlen (Indikator)
- Bei Mode C: Vorlage-Selector zeigen
- Vorlage speichern auf `auftraege.vorlage_id`

Das ist der natuerliche Ort. Eine `auftrag-anlegen.html` existiert nicht — Marcel-Spec war vmtl. konzeptuell.

### Variable-Mapping-UI: Modal in einstellungen.html

**Begruendung:** Mapping passiert PRO Vorlage, nicht pro Akte. User mapped einmal `$Aktenzeichen → akte.az`, danach gilt es fuer alle Akten mit dieser Vorlage. Im Settings-Kontext richtig.

---

## 3. Capacity-Estimate (ehrlich nach 16 MEGA-Sprints)

| Tier | Tasks | Token-Estimate | Confidence |
|---|---|---:|---:|
| **PRIMARY** | W48-W54 (Plan + Schema + Mapping-UI + Picker + Stub + Mobile + Tests) | ~75k | 85% |
| **STRETCH** | + Onboarding-Wizard (3 Mode-Cards Modal) | +20k | 50% |
| **ULTIMATE** | + Mode B in 2 weitere Pages + KI-Editor-Plugin-Skeleton | +30k | 25% |

**Token-Realismus:** Restbudget in dieser Session schaetze ich auf 80-100k. PRIMARY sollte schaffbar sein, STRETCH wird knapp.

**Decision:** **PRIMARY confirmed**, STRETCH nur wenn nach W54 noch >25k Restbudget. ULTIMATE bewusst NICHT versprochen.

---

## 4. Implementation-Plan PRIMARY (W48-W55)

### W48: Plan-File (this file) — DONE

### W49: Schema-Migration 09 — `auftraege.vorlage_id`
```sql
ALTER TABLE auftraege
  ADD COLUMN IF NOT EXISTS vorlage_id UUID REFERENCES user_vorlagen(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vorlage_variable_values JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_auftraege_vorlage ON auftraege(vorlage_id) WHERE vorlage_id IS NOT NULL;
```

`db/PLANNED-auftraege-vorlage.sql` + `supabase-migrations/09_auftraege_vorlage.sql`.

### W50: Variable-Mapping-UI in einstellungen.html
- Modal nach Upload-Success: zeigt erkannte Variablen
- Pro Variable: Dropdown mit PROVA-Fields (akte.az, akte.titel, akte.objekt.adresse, ...)
- Auto-Detection: `$Aktenzeichen → akte.az`, `$Auftraggeber → kunde.name`
- Save → POST parse-docx mit `mapping` field → speichert auf `user_vorlagen.variable_mapping`
- Mapping editieren: Click auf Vorlage → Modal nochmal

### W51: Mode-C-Picker in akte.html
- Mode-Resolver checkt `default_mode === 'C'`
- Bei Mode C: Vorlage-Selector im Header der Akte
- Dropdown mit aktiven user_vorlagen (GET parse-docx)
- onChange: PATCH auftraege via data-store `setVorlageId(auftrag_id, vorlage_id)`
- Falls keine Vorlage: Hint "Erst Vorlage in Einstellungen hochladen"
- Vorschau-Button: zeigt interpoliertes HTML in Modal

### W52: generate-pdf-mode-c.js (Backend-Stub)
- Auth + RLS-Check
- Lade `auftraege` + `user_vorlagen` + `kontakte` (auftraggeber)
- Apply Variable-Mapping: `$Aktenzeichen → akte.az` etc.
- Pure-Function `interpolateHtml(html, mapping, dataContext)`
- Returnt `{ interpolated_html, mapping_applied_count, missing_keys, todo: 'pdf-service' }`
- TODO-Comment: PDF-Service-Decision (DocRaptor / Gotenberg / cloud-Puppeteer)

### W53: Mobile-Restriction
- CSS `@media (max-width: 768px)`: `.mode-c-section { display: none; }`
- Hint-Element: "Word-Vorlagen am Desktop verwalten"
- in einstellungen.html + Onboarding-Hinweis

### W54: Tests durchgehend
- Pure-Function `interpolateHtml`: 8+ Tests (basic, missing-key, multi-var, escape)
- Auto-Detection: `$Aktenzeichen → akte.az` mapping logic
- Migration 09 versioniert
- HTML-Page-Asserts (akte.html Mode-C-Selector vorhanden, einstellungen.html Mapping-Modal-Markup)
- Mobile-CSS Pattern-Match

### W55: Final-Report
- `docs/sprint-status/MEGA-SEPTUM-DECIMA-2026-05-FINAL.md`
- Honesty-Note: was geliefert vs nicht
- Marcel-Pflicht-Aktionen
- Tag-Empfehlung `v224-mode-c-akten-integration`
- sw.js v275 → v276

---

## 5. Was NICHT in MEGA¹⁷ (ehrlich → MEGA¹⁸+)

### PDF-Service-Wahl + Implementierung
**Begruendung:** Marcel-Decision noetig (DocRaptor 99$/mo? Gotenberg self-host? cloud-Puppeteer?). Ich liefere Stub mit klar dokumentiertem TODO.

### Onboarding-Wizard
**STRETCH bei Capacity** — bewusst nicht PRIMARY, weil 3-Mode-Cards-Modal mit Demo-Animationen eigene Sprint-Tiefe.

### KI-Editor-Plugin (TipTap-Extensions)
**ULTIMATE** — TipTap-ProseMirror-Plugin-API ist nicht trivial.

### Mode B in mehr Pages (gutachterliche-stellungnahme.html etc.)
**STRETCH** — Pattern-Reuse machbar, aber lower Priority als Mode C.

### Drag-and-Drop fuer Variable-Mapping
**Backlog** — Dropdown-only ist UX-Minimum, Drag-and-Drop ist Nice-to-Have.

---

## 6. Anti-Patterns vermeiden

❌ **PDFMonkey-Integration trotz Mismatch erzwingen** — PDFMonkey ist Template-driven, Mode C ist User-HTML
❌ **Puppeteer in Lambda** — Bundle-Size-Limit
❌ **Mapping nur per name-match** — User muss explizit waehlen koennen, Auto-Detection ist nur Vorschlag
❌ **Vorlage-Selector ohne Validation** — wenn Vorlage geloescht, Auftrag-Reference muss SET NULL handeln
❌ **Mode-C ohne Mobile-Hinweis** — Mobile-User wuerde frustriert sein
❌ **Migration-Script ohne idempotent IF NOT EXISTS** — siehe CLAUDE.md Regel 36

---

## 7. Erwartete Quality-Metrics

- **Tests:** 990 → 1020+ (~30 neue)
- **Mode-C-Status nach MEGA¹⁷:** vom MVP zur Akten-Integration (PDF-Stub)
- **Pattern-Copy:** 0
- **sw.js:** v275 → v276

---

## 8. Marcel-Pflicht-Aktionen vor Pilot

1. Migration 09 applyen (Supabase)
2. PDF-Service-Decision (DocRaptor / Gotenberg / Puppeteer-Cloud)
3. Browser-Tests fuer Mode C Akten-Integration

---

*Plan-Stand 2026-05-08. Start: W49 (Schema-Migration 09).*
