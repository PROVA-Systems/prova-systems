# Mobile Real-Device-Tests — Test-Plan (M⁴² P7)

**Datum:** 2026-05-08
**Owner:** Marcel Schreiber

---

## 🎯 Devices die abgedeckt werden müssen

| Device | OS / Browser | Pflicht-Coverage |
|--------|-------------|------------------|
| **iPhone (Safari)** | iOS 17/18 | Foto-Upload, Diktat, Pull-to-Refresh, Skizzen, Voice-Input |
| **iPhone + Apple Pencil 1** | iOS 17/18 + iPad-Verbindung oder Apple Pencil 2 | Skizzen-Canvas Drawing |
| **iPhone + Apple Pencil 2** | iOS 17/18 | Skizzen mit Druck-Sensitivity |
| **Android (Chrome)** | Android 14/15 | Foto-Upload, PWA-Install, Notifications |
| **Samsung Galaxy + S Pen** | Samsung One UI 6 | Skizzen-Canvas |

---

## 📋 Test-Cases (24 Punkte)

### A. PWA-Install (3)

- [ ] iOS Safari → Add to Home Screen → App startet im Standalone-Mode
- [ ] Android Chrome → Install-Banner erscheint nach 2-3 Visits
- [ ] PWA Offline-Mode: `/offline.html` lädt wenn kein Netz

### B. Foto-Upload (5)

- [ ] iOS Camera → Foto direkt nehmen → Upload via foto-upload-mobile.js
- [ ] iOS Galerie → Mehrere Fotos auswählen → Sequenzieller Upload
- [ ] Android Chrome → Camera + Galerie analog
- [ ] EXIF-GPS-Strip: Foto mit GPS aufnehmen → in Production: GPS-Tag entfernt (Foto kann mit/ohne, Setting-Pflicht)
- [ ] Geo-Tag (PROVA-managed): Foto bekommt PROVA-Standort-Bookmark

### C. Skizzen mit Stylus (4)

- [ ] Apple Pencil 1: Linie zeichnen → präzise Lines, kein Lag
- [ ] Apple Pencil 2: Druck-Sensitivity wirkt auf Strichbreite
- [ ] Samsung S Pen: Drawing analog
- [ ] Skizzen speichern → in Supabase Storage abrufbar

### D. Diktat (3)

- [ ] iOS: Mikro-Berechtigung erteilen → Diktat → Whisper-Roundtrip
- [ ] iOS: Diktat länger als 25MB (Chunking-Test)
- [ ] Android: Diktat analog

### E. Push-Notifications (3)

- [ ] iOS Safari ≥16.4: Push-Subscription via push-setup.html
- [ ] Android Chrome: Push-Subscription
- [ ] Test-Push: ankommt, klick öffnet PROVA-App

### F. Auto-Sync (3)

- [ ] Offline-Mode aktivieren (Flugmodus) → Schaden anlegen
- [ ] Online wieder → Sync läuft automatisch
- [ ] Konflikt-Test: Andere Session ändert dieselbe Akte → sync-conflict-resolver.js zeigt Optionen

### G. UX (3)

- [ ] Pull-to-Refresh auf Listen-Pages funktioniert
- [ ] Bottom-Sheet öffnet sich smooth
- [ ] Swipe-Gestures (links/rechts) auf Karten funktionieren

---

## 🛠️ Vorbereitung

1. Marcel deployed mega41 (oder mega42-final) zu main → Netlify-Deploy
2. Marcel installiert PROVA als PWA auf jedem Test-Device
3. Marcel hat 1 Demo-Akte angelegt
4. Browser-DevTools aktivieren für iOS:
   - iPhone → Settings → Safari → Advanced → Web Inspector
   - Mac → Safari → Develop → [iPhone] → [Tab]
5. Browser-DevTools für Android Chrome:
   - chrome://inspect/#devices auf Desktop

---

## 📝 Test-Protokoll-Template

```
Device: [iPhone 15 Pro / Apple Pencil 2 / iOS 18.1 / Safari]
Datum: [YYYY-MM-DD]
Tester: Marcel

=== A. PWA-Install ===
[ ] iOS Add to Home Screen → ✓/✗
    Bemerkungen: ...

=== B. Foto-Upload ===
[ ] Camera-Direct → ✓/✗
[ ] Galerie-Multi → ✓/✗
...

=== Bugs / Issues gefunden ===
1. [Beschreibung] — Schweregrad: [Blocker/Medium/Low]
2. ...

=== Conclusion ===
[ ] PILOT-READY ✅
[ ] PILOT-BLOCKING-ISSUES ❌ (siehe oben)
```

---

## 🔴 Marcel-Pflicht-Items

1. Test-Plan durchgehen pro Device
2. Bugs in `docs/sprint-status/MEGA42-PHASE-7-MOBILE-TEST-RESULTS.md` dokumentieren
3. Bei Blockern: Phase 13 FINAL erst nach Behebung
4. Kein Code-Substitut: CC kann Mobile-Tests **nicht** automatisieren (DevTools-Subset reicht nicht)

---

## ⚠️ Was CC NICHT testen kann

- Reale Touch-Latenz / Stylus-Pressure-Sensitivity
- iOS-spezifische Quirks (Safari Push, Standalone-Mode-Behaviour)
- Real-World-Network-Conditions (LTE, 5G, WiFi mit Drop)
- Dual-Monitor-Setup mit iPhone als Pencil-Companion

→ Diese Tests sind ausschließlich Marcel-Pflicht.

---

*M⁴² P7 — Co-Authored-By Claude Opus 4.7 — 2026-05-08*
