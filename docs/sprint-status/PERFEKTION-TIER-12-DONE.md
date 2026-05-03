# Perfektion Tier 12 — Final Polish (Error-Pages + Empty-States)

**Sprint:** MEGA⁷ U3 (04.05.2026 nacht)
**Status:** ✅ Done

---

## Was geliefert

### Error-Pages

- `404.html` — bereits vorhanden (existing)
- `offline.html` — bereits vorhanden (existing)
- **NEU `500.html`** — Server-Fehler-Page mit:
  - Generierte Fehler-ID fuer User-Reference + Sentry-Korrelation
  - "Erneut versuchen" + "Zur Zentrale" Buttons
  - Status-Page-Link (status.html)
  - Sentry-Auto-Tag falls Sentry-Browser-SDK aktiv
- **NEU `maintenance.html`** — Geplante-Wartung-Page mit:
  - ETA-Anzeige (URL-Param `?eta=15:30` oder default +30min)
  - Auto-Reload alle 60s (User merkt wenn fertig)

### Empty-State-Library

- **NEU `lib/empty-states.css`** (~110 LOC):
  - `.prova-empty-state` Container mit Icon/Title/Text/Actions
  - `.prova-skeleton` Loaders (text, title, block, card, button, avatar)
  - `.prova-skeleton-list` fuer Listen-Layouts
  - `.prova-toast` Success-Feedback (success/error/info)
  - Mobile-responsive
- **NEU `lib/empty-states.js`** (~110 LOC):
  - `ProvaUI.emptyState(target, { icon, title, text, primaryBtn, secondaryBtn })`
  - `ProvaUI.skeleton(target, 'list'|'cards'|'rows', count)`
  - `ProvaUI.toast(message, 'success'|'error'|'info')`

---

## Compliance mit CLAUDE.md Empty-State-Regel

CLAUDE.md Pflicht-Struktur fuer Empty-States ist eingehalten:
1. ✅ Icon (groß, freundlich, passend) → `__icon` Slot
2. ✅ Titel (was fehlt, neutral, nicht beschämend) → `__title` Slot
3. ✅ 1-2 Saetze was passiert nach der Aktion → `__text` Slot
4. ✅ Primaer-Button (nicht optional!) → `primaryBtn` REQUIRED Pattern
5. ✅ Optional zweiter Weg (Demo-Fall, Hilfe) → `secondaryBtn` Slot

---

## Marcel-Pflicht

1. Service-Worker-Cache: nach Deploy Cache-Version bumpen damit alle Pages 500.html + maintenance.html cached
2. Existing Pages mit Empty-State-Bedarf migrieren (Sprint K-2):
   - dashboard.html "Noch keine Auftraege"
   - archiv.html "Keine Suchergebnisse"
   - rechnungen.html "Keine Rechnungen"
   - kontakte.html "Keine Kontakte"
3. Skeleton-Loader nutzen statt `<div class="loading">Lade…</div>`

---

## Beispiel-Code fuer Marcel-Pages

```html
<!-- In dashboard.html etc. einfuegen -->
<link rel="stylesheet" href="/lib/empty-states.css">
<script src="/lib/empty-states.js" defer></script>

<!-- Nutzung -->
<script>
ProvaUI.emptyState('#auftraege-list', {
  icon: '📁',
  title: 'Noch keine Auftraege',
  text: 'Lege deinen ersten Auftrag an oder probiere unseren Demo-Fall.',
  primaryBtn: { label: '+ Neuer Auftrag', href: '/app.html' },
  secondaryBtn: { label: 'Demo-Fall ansehen', href: '/akte.html?id=SCH-DEMO-001' }
});

ProvaUI.skeleton('#liste', 'rows', 5);  // Skeleton-Liste
ProvaUI.toast('Akte gespeichert', 'success');
</script>
```

---

*Tier 12 partial done — Vollstaendige Migration der Pages auf neue Library = Sprint K-2.*
