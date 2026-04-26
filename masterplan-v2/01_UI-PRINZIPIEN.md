# UI/UX-Prinzipien für PROVA Systems v2.1

**Referenz-Systeme:** Linear, Stripe, Notion, Superhuman, Vercel Dashboard, Airtable  
**Zielgruppe:** Öffentlich bestellte Sachverständige, Alter 35-65, technisch interessiert aber nicht Digital-Native  
**Grundprinzip:** Ruhiges, fokussiertes, professionelles SaaS-Erlebnis für Profis

**Änderung v2.0 → v2.1:** KI-Regeln, Empty-States geschärft, Positive-Marker-Prinzip

---

## 1. Visual Hierarchie

### Weißraum-Regel
**80% Luft, 20% Content.** Wenn eine Seite wirkt "voll", ist sie voll. Reduzieren.

### Typografie
- **Inter** (Google Font) als Haupt-Font (Design-System v1.0)
- **JetBrains Mono** für Zahlen, §§, Aktenzeichen
- **Schriftgrößen:**
  - Display (Seitentitel): 32px / 1.2 / bold
  - H1 (Section): 24px / 1.3 / semibold
  - H2: 18px / 1.4 / semibold
  - Body: 15px / 1.6 / regular
  - Small (Labels, Meta): 13px / 1.5 / medium
  - Tiny (Audit-Refs): 11px / 1.4 / mono

### Farben (Design-System v1.0)
- Primary: #1a3a6b
- Accent: #3b82f6
- Muted: #64748b
- Success: #10b981
- Warning: #f59e0b
- Danger: #ef4444

**Verboten:** Source Serif 4, Helvetica, Arial, Montserrat.

---

## 2. Layout & Spacing

### Spacing-Skala (8px-Raster)
`4, 8, 12, 16, 24, 32, 48, 64, 96`. Keine willkürlichen Werte.

### Container
- Mobile: 100% mit 16px Padding
- Tablet: max 720px
- Desktop Content: max 960px
- Desktop Full: max 1440px

### Sidebar (v2.1 — neue Struktur)
- Collapsed: 64px (nur Icons)
- Expanded: 260px
- Auto-Collapse bei < 1100px Viewport (reagiert auf Resize-Event, nicht nur Load)
- **4-Gruppen-Struktur:** ARBEIT / WERKZEUGE / DOKUMENTE / BÜRO
- **Aktiver-Fall-Anker** oben (wenn Fall offen)

---

## 3. Interaktions-Patterns

### EINE Primär-Aktion pro Screen (Stripe)
Jede Seite hat genau **eine** Hauptaktion — einziger Button mit Accent-Farbe.

### Keine Dropdown-Menüs tiefer als 1 Ebene (Notion)
Flach halten.

### Keyboard-Shortcuts (Linear)
- `⌘/Ctrl + K` Quick-Search
- `⌘/Ctrl + N` Neuer Fall
- `⌘/Ctrl + D` Neues Diktat
- `Esc` schließt alle Overlays
- `⌘/Ctrl + Enter` Primär-Aktion

Shortcut-Hilfe mit `?` aufrufbar.

### Unsichtbare Ladezustände (Superhuman)
- < 200ms: nichts anzeigen
- 200-2000ms: Skelett-Loading
- > 2s: Progress mit Text ("KI analysiert… ~30 Sek")
- > 10s: Hintergrund-Processing + Push bei Abschluss

---

## 4. KI-Prinzipien (NEU in v2.1)

### Regel 1 — KI-Vorschläge sind opt-in, nicht default
Keine KI-Anzeige ohne expliziten Klick des SVs. **Ausnahme:** Automatische Pre-Freigabe-Checks (Halluzinations-Check, §407a-Check) — diese laufen **vor** Freigabe-Modal.

**Warum?** §407a-Compliance. Wenn KI "immer da ist", argumentiert Anwalt vor Gericht: "SV wurde beeinflusst."

### Regel 2 — Positive Qualitäts-Marker statt Warnungen
Statt "Fehler: Sie haben keinen Konjunktiv verwendet!" →  "✓ Konjunktiv II erkannt" / "⭕ Norm-Referenz noch ausbauen"

**Warum?** SVs sind Profis. Belehrender Ton nervt. Positive Bestätigung motiviert.

### Regel 3 — Drei KI-Verantwortungs-Stufen
- **S1 Mechanisch** (Rechtschreibung, Kommas, Grammatik) — live erlaubt
- **S2 Strukturell** (Absätze, Überschriften) — auf Klick mit Diff
- **S3 Inhaltlich** (Konjunktiv II, Halluzinations-Check, Fachsprache) — auf Klick mit Begründung

### Regel 4 — Änderungen brauchen Zustimmung
Keine KI-Funktion ändert Text ohne expliziten Klick des SVs. Pro-Befund-Entscheidung.

### Regel 5 — Copy/Paste erlaubt, aber dokumentiert
Kein `user-select: none`. Paste-Events werden in AUDIT_TRAIL geloggt. Bei > 50% Paste-Anteil: Hinweis "Bitte bestätigen Sie Eigenleistung."

### Regel 6 — KI-Kosten transparent
SV sieht in Einstellungen eigene KI-Kosten und Umsatz-Quote. Kein Geheimnis.

### Regel 7 — Profi-Modus
Erfahrene SVs können alle Live-Funktionen deaktivieren. Ein Toggle in Einstellungen.

### Regel 8 — "KI-Funktions-Garantie"
Jede KI-Funktion muss 5 Tests bestehen (Funktionalität, Edge-Cases, Präzision, Konsistenz, Zeit). Bei rot → Funktion ausgeblendet im UI bis grün.

---

## 5. Komponenten-Standards

### Buttons
- Primär: Accent, weiß, 44px Höhe, 16-24px Padding
- Sekundär: Outline
- Tertiär: Nur Text
- Destruktiv: `--danger` nur bei finaler Bestätigung

### Input-Felder
- **Label immer sichtbar** (nicht nur Placeholder)
- **Pflicht-Marker `*`**
- **Helper-Text unter Feld** statt Tooltip
- Error: Roter Rand + Text unter Feld

### Empty States sind eigene Features (geschärft v2.1)

**Struktur (Pflicht, nicht optional):**
1. Icon (groß, freundlich, passend)
2. Titel (was fehlt, neutral)
3. 1-2 Sätze was passiert nach der Aktion
4. **Primär-Button** (nicht optional!)
5. **Optional zweiter Weg** (Video, Demo-Fall-Link)

**Beispiel:**
```
    🗂️
  Noch keine Fälle angelegt
  Erstellen Sie Ihren ersten Fall — PROVA
  führt Sie durch den gesamten Workflow.
  
  [ + Ersten Fall anlegen → ]
  
  Oder: [🧪 Demo-Fall anschauen]
```

**Bei neuen Usern:** Demo-Fall-Link zeigt auf SCH-DEMO-001 (aus Sprint 20).

### Modals & Overlays
- Nur für kritische Entscheidungen oder kurze Formulare (max 5 Felder)
- Längere Formulare: eigene Seite
- `Esc` schließt immer
- Backdrop-Klick schließt außer bei Unsaved-Changes

### Destruktive Aktionen
Nie Ein-Klick-Löschen. Modal mit Bestätigung, bei wichtigen Aktionen Textbestätigung "LÖSCHEN".

### Tables
- Sortierbar per Header-Klick
- Filter oberhalb
- Zeilen klickbar → Detail
- Inline-Actions rechts bei Hover
- Pagination bei > 50 Zeilen
- Empty-Filter-State: "Keine Ergebnisse — Filter zurücksetzen"

---

## 6. Copywriting

### Tonalität
- Professionell, nicht förmlich
- Klar, nicht clever
- Aktiv, nicht passiv

### Label-Konsistenz
- Nie synonym (immer "Auftraggeber", nicht "Kunde" oder "Mandant")
- Aktions-Buttons als Verben
- Fall-Status: Entwurf / In Bearbeitung / In Freigabe / Freigegeben / Exportiert / Archiviert

### Fehlermeldungen
Struktur: Was ging schief + was kann User tun.

```
GUT:      "Die KI konnte das Diktat nicht verarbeiten — zu wenig Text.
          Bitte nehmen Sie mindestens 2 Sätze auf und versuchen Sie es erneut."
SCHLECHT: "Error: DIKTAT_ZU_KURZ"
```

### Erfolgs-Meldungen
Kurz, positiv, mit nächstem Schritt.

```
GUT:      "Gutachten erstellt und an Versicherung@example.de versendet.
          → Zum Fall  |  → Nächsten Fall anlegen"
SCHLECHT: "Erfolgreich abgeschlossen."
```

---

## 7. Accessibility

### Kontrast
- Text: min 4.5:1
- Große Texte 18px+: min 3:1
- Interaktive Elemente: min 3:1

### Keyboard
- Tab-Reihenfolge logisch
- Fokus-Indikator sichtbar (2px Accent Outline)
- Skip-Link am Seitenbeginn

### Screen-Reader
- `aria-label` an Icon-Buttons
- `<button>` statt `<div onclick>`
- `<label>` mit `for=id`
- Live-Regions für dynamische Updates

### Motion
- `prefers-reduced-motion: reduce` respektieren
- Animationen < 300ms
- Keine Auto-Play-Videos

### Ältere-Nutzer
- **Body-Schrift min 15px** (keine 12px)
- **Klickflächen min 44×44 px**
- **Keine reinen Hover-States**
- **Bestätigungs-Modals** bei destruktiv
- **Undo** für 10s nach jeder Aktion

---

## 8. Navigation & Informations-Architektur

### Sidebar (v2.1 — neue Struktur)

```
[ + Fall aufmachen ]
Aktiver Fall (wenn einer offen)
── ARBEIT ──
  Zentrale, Meine Fälle, Kalender
── WERKZEUGE ──
  Normen, Textbausteine, JVEG-Rechner, Positionen & Preise, Bescheinigungen
── DOKUMENTE ──
  Rechnungen, Briefe & Vorlagen, Mahnwesen
── BÜRO ──
  Kontakte, Daten importieren, Jahresbericht
── Footer ──
  Einstellungen, Hilfe, Abmelden
```

### Breadcrumbs
Auf Detail-Seiten:
```
← Fälle / SCH-2026-031 / Akte
```

### Quick-Search (⌘K)
Sucht global: Fälle, Kontakte, Rechnungen, Normen, Textbausteine, Bescheinigungen.

---

## 9. Mobile-Spezifika

- Touch-Targets min 44×44 px
- Bottom-Nav auf Mobile (Daumen-Erreichbarkeit)
- iOS-Safari: -webkit-overflow-scrolling, 100vh-Fix, font-size 16px auf Inputs
- Safe-Area-Insets
- PWA: Add-to-Homescreen, Offline-Hinweis, Share-Target

---

## 10. Dos & Don'ts — Quick-Reference

| ✅ DO | ❌ DON'T |
|---|---|
| Primär-Button pro Screen | 3 Buttons nebeneinander |
| Labels sichtbar | Nur Placeholder |
| Empty States mit Action + Demo-Link | "Keine Daten" als Dead-End |
| **Positive Qualitäts-Marker** | **Warnende Grammatik-Pop-Ups** |
| **KI opt-in mit Klick** | **KI-Text sofort sichtbar** |
| **KI-Kosten transparent** | **Versteckte Kosten** |
| Spacing-Skala (8px) | Willkürliche Werte |
| Keyboard-Shortcuts | Mouse-only |
| Bestätigung bei destruktiv | Ein-Klick-Löschen |
| Konsistente Labels | Synonyme |
| 15px+ Body-Schrift | 12px Kleinschrift |
| 44px+ Touch-Targets | 24×24 Icons |
| Undo-Toasts | Sofort-Vernichtung |
| Progress bei > 2s Load | Endlos-Spinner |

---

## 11. Messung: Woran erkenne ich gutes UX?

### Quantitative Signale
- Time-to-First-Gutachten < 30 Min
- Click-Depth häufige Aktionen: max 3
- Error-Rate (User-Fehler): < 5%
- Drop-off pro Phase: < 15%
- Lighthouse: > 90

### Qualitative Signale
- Marcel findet intuitiv Hauptaktionen
- Neuer Tester erreicht ohne Hilfe erstes PDF
- Feedback "Fühlt sich an wie Linear/Stripe"
- **Keine Support-Frage "Wie mache ich X?"**
- **Keine KI-Funktion wird als nervig empfunden** (Profi-Modus-Aktivierung wäre rotes Signal)

---

**Dieses Dokument ist Pflicht-Lektüre vor jedem Produkt-Sprint (Phase B).**
