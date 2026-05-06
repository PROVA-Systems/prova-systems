# PROVA Mode-Switcher UX-Design

**Datum:** 2026-05-06
**Sprint:** MEGA¹⁴ W28 (Foundation)
**Status:** UX-Mockups, Implementation MEGA¹⁵+¹⁶

---

## 1. Onboarding (Erste Mode-Wahl)

Triggert bei: 3. Akte erstellt ODER Settings → "Workflow konfigurieren" geklickt.

```
╔════════════════════════════════════════════════════════════════╗
║  Wie schreibst du am liebsten?                                  ║
║  ────────────────────────────────────                           ║
║                                                                 ║
║  Du kannst pro Akte den Modus wechseln, aber waehle hier        ║
║  deinen "Standard-Modus".                                       ║
║                                                                 ║
║  ┌──────────────────────────────────────────────────────────┐   ║
║  │ ⦿ 🚀 Vorgegebene Templates ausfuellen                      │   ║
║  │     Schnell, strukturiert, IHK-SVO-konform.                │   ║
║  │     Ideal fuer 80% der Standardfaelle.                     │   ║
║  └──────────────────────────────────────────────────────────┘   ║
║                                                                 ║
║  ┌──────────────────────────────────────────────────────────┐   ║
║  │ ⚪ ✏️ Frei tippen wie in Word                              │   ║
║  │     Flexibler Editor mit Konjunktiv-II-Pruefung.           │   ║
║  │     Ideal wenn du gerne erzaehlend formulierst.            │   ║
║  └──────────────────────────────────────────────────────────┘   ║
║                                                                 ║
║  ┌──────────────────────────────────────────────────────────┐   ║
║  │ ⚪ 📁 Eigene Vorlagen hochladen                            │   ║
║  │     Migration deiner bestehenden Word-Dokumente.           │   ║
║  │     Ideal wenn du langjaehrige Eigen-Patterns hast.        │   ║
║  └──────────────────────────────────────────────────────────┘   ║
║                                                                 ║
║                                       [Spaeter entscheiden]    ║
║                                       [Standard speichern →]   ║
╚════════════════════════════════════════════════════════════════╝
```

**Default wenn "Spaeter":** Mode A (PROVA-Standard).

---

## 2. Settings → Workflow

Sub-Section in `einstellungen.html`:

```
┌─ Workflow-Modus ────────────────────────────────────────┐
│                                                         │
│  Standard-Modus                                          │
│  ───────────────                                         │
│  Was du standardmaessig oeffnest, wenn du eine neue      │
│  Akte anlegst (kannst du pro Akte uebersteuern).         │
│                                                         │
│  Aktueller Standard: 🚀 PROVA-Standard                  │
│                                                         │
│  [Aendern ▼]                                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Aenderungs-Flow:** Modal mit gleichen 3 Optionen wie Onboarding.

---

## 3. Pro-Akte-Override

Im Akte-Header (oder Onboarding-Schritt fuer neue Akte):

```
┌─ Aktenkopf ─────────────────────────────────────────┐
│ Akte SCH-2026-0089 · Wasserschaden                   │
│                                                      │
│ Workflow:  🚀 PROVA-Standard ▼                       │
│            (Mein Standard. Klicken zum Wechseln.)   │
└─────────────────────────────────────────────────────┘
```

**Click → Dropdown:**
```
┌──────────────────────────┐
│ ✓ 🚀 PROVA-Standard      │  ← aktuell aktiv
│   ✏️ Editor (Mode B)     │
│   📁 Eigene Vorlage       │
│ ────────────────────────  │
│   Standard fuer alle Akten│
│   (Settings)              │
└──────────────────────────┘
```

**Wichtig:** Wechsel auf B/C bei existierender Akte zeigt Confirm-Dialog:

```
┌────────────────────────────────────────────────────┐
│ Modus wechseln?                                     │
│                                                     │
│ Du wechselst von 🚀 PROVA-Standard zu ✏️ Editor.    │
│                                                     │
│ Bisherige Eingaben werden in den Editor uebertragen │
│ (kann minimal abweichen).                           │
│                                                     │
│ Du kannst jederzeit zurueck wechseln.               │
│                                                     │
│           [Abbrechen]  [Wechseln →]                 │
└────────────────────────────────────────────────────┘
```

---

## 4. Visual-Differenzierung pro Mode

### Mode A — PROVA-Standard
- Icon: 🚀 (Rakete = "schnell, strukturiert")
- Color: Blue (var(--accent, #4f8ef7))
- Layout: Strukturierte Forms

### Mode B — PROVA+Editor
- Icon: ✏️ (Stift = "frei schreiben")
- Color: Purple (var(--purple, #9333ea))
- Layout: TipTap-Editor mit Toolbar

### Mode C — Eigene Vorlagen
- Icon: 📁 (Ordner = "deine Sammlung")
- Color: Orange (var(--warning, #d97706))
- Layout: Vorlagen-Picker + Inline-Forms fuer Variablen

---

## 5. Empty-States pro Mode

Wenn ein User auf einen Mode wechselt aber noch nichts hat:

### Mode B Empty-State (erstmaliger Editor-Wechsel)
```
✏️ Erste Akte im Editor-Modus
Hier startest du mit einem leeren Editor.
Konjunktiv-II-Pruefung laeuft live mit.

[ Tutorial anschauen ]   [ Loslegen ]
```

### Mode C Empty-State (keine eigenen Vorlagen)
```
📁 Noch keine eigenen Vorlagen
Lade dein Word-Dokument hoch und PROVA macht
es zu einer wiederverwendbaren Vorlage.

[ Word-Datei waehlen ]   [ Tutorial ]
```

---

## 6. Fehler-Cases

### Mode B nicht verfuegbar (Browser zu alt)
```
⚠️ Editor-Modus funktioniert nicht in deinem Browser.
   Wir empfehlen Chrome/Safari/Firefox letzte 2 Versionen.
   
   Alternative: 🚀 PROVA-Standard nutzen (funktioniert ueberall).
```

### Mode C: Word-Datei korrupt
```
⚠️ Word-Datei konnte nicht gelesen werden.
   Mögliche Ursache: passwortgeschuetzt, älter als .docx.
   
   [Andere Datei]   [Hilfe]
```

---

## 7. Marcel-Pflicht-UX-Decisions

Bevor MEGA¹⁵ implementiert:

- [ ] Default-Mode bei Pilot-Phase: A (Standard) oder Onboarding-Frage?
- [ ] Mode-Switch in Akte: Inline-Dropdown oder Modal-Confirm?
- [ ] Tutorial-Format: Video, GIF, oder schreitt-fuer-Schritt-Hint-Layer?
- [ ] Mode-Color-Differenzierung: subtle (Border-Color) oder prominent (Background)?

---

*UX-Foundation done. Implementation in MEGA¹⁵+¹⁶.*
