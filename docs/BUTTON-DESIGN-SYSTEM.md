# PROVA Button-Design-System (MEGA-Marathon Phase 3)

**Stand:** 2026-05-19 · `lib/prova-button-tokens.css` (~290 Z) · Marcel-Befund 18.05. addressiert.

---

## Architektur

- **Token-System** via CSS Custom Properties — Light + Dark-Mode-Switch automatisch (über `body.theme-dark` / `[data-theme="dark"]` / `html.dark`)
- **5 Varianten:** primary | secondary | tertiary | destructive | success
- **3 Sizes:** sm (32px) | md (40px) | lg (48px) — sm wird auf Touch-Devices auf 44px upgescalet (WCAG-AAA)
- **States:** default | hover (translateY -1px + shadow upgrade) | active (translateY 0 + inset shadow) | disabled | focus-visible | loading (CSS-Spinner)
- **Legacy-Compat-Bridge:** existing `.btn-primary`, `.es-btn`, `.cp-impersonate-btn`, `.bib-modal-btn` werden auf Tokens gemappt → globaler Visual-Upgrade ohne 200+ HTML-Files anzufassen

## Decision-Tree

| Wann | Variant |
|---|---|
| Haupt-CTA pro Page (max. 1×) | **primary** (Navy-Gradient) |
| Wichtige Sekundär-Aktion | **secondary** (Border + Light-BG) |
| Untergeordnete Navigations-Aktion | **tertiary** (Ghost, kein Border, hover-BG) |
| Lösch/Sperren/Stop | **destructive** (Rot-Gradient) |
| Bestätigen/Speichern/Senden (positiver Vorgang) | **success** (Grün-Gradient) |

## Code-Beispiele

### Neue Pages mit prova-btn-Klassen
```html
<button class="prova-btn prova-btn--primary prova-btn--md">📨 Senden</button>
<button class="prova-btn prova-btn--secondary prova-btn--md">Abbrechen</button>
<button class="prova-btn prova-btn--tertiary prova-btn--sm">Mehr Optionen</button>
<button class="prova-btn prova-btn--destructive prova-btn--sm">🗑 Löschen</button>
<button class="prova-btn prova-btn--success prova-btn--lg">✓ Bestätigen</button>

<!-- Icon-only -->
<button class="prova-btn prova-btn--secondary prova-btn--icon prova-btn--md" aria-label="Schließen">×</button>

<!-- Loading-State -->
<button class="prova-btn prova-btn--primary prova-btn--md prova-btn--loading" aria-busy="true">⏳ Sende…</button>

<!-- Group -->
<div class="prova-btn-group">
  <button class="prova-btn prova-btn--secondary prova-btn--sm">Filter</button>
  <button class="prova-btn prova-btn--secondary prova-btn--sm">Sortieren</button>
  <button class="prova-btn prova-btn--primary prova-btn--sm">Neu</button>
</div>
```

### Legacy-Pages bleiben unverändert
```html
<!-- Bestehend in einstellungen.html — sieht jetzt modern aus -->
<button class="es-btn primary">💾 Speichern</button>
<button class="es-btn danger">🗑 Konto löschen</button>
```
→ Compat-Bridge mappt auf prova-btn-Tokens automatisch.

## Loading-Pattern für async Aktionen

```js
btn.classList.add('prova-btn--loading');
btn.setAttribute('aria-busy', 'true');
try {
  await doAsyncWork();
} finally {
  btn.classList.remove('prova-btn--loading');
  btn.removeAttribute('aria-busy');
}
```

## Accessibility

- `:focus-visible` rendert blauen 3px-Focus-Ring → Keyboard-Nav sichtbar, Mouse-Click blendet ihn aus
- `aria-busy="true"` bei `.prova-btn--loading`
- `aria-disabled="true"` als Alternative zu `disabled`-Attribut
- `prefers-reduced-motion: reduce` deaktiviert Hover-Lift + Spinner-Animation

## Mount

Add to page head **nach** `prova-design.css`:
```html
<link rel="stylesheet" href="/lib/prova-button-tokens.css">
```

Bereits eingebunden in: `einstellungen.html`, `akte.html`, `app.html`, `dashboard.html`, `admin-kpis.html` (Marcel-Befund-Pages priorisiert).

Für andere Pages: Marcel-Manual oder Bulk-Sweep im Folge-Sprint.

## Dark-Mode-Test

Token-Override greift bei body/html mit:
- `body.theme-dark`
- `body[data-theme="dark"]`
- `:root[data-theme="dark"]`
- `html.dark`

Shadows werden dunkler (0.4-0.5 opacity), Secondary-BG wechselt auf `#1c2130`, Text auf `#eaecf4`.

## Vorbilder

- **Stripe-Dashboard:** Multi-Layer-Shadows, subtle Gradients, focus-rings
- **Linear:** Mikro-Lift + Press-Animation, monochrome Defaults
- **Vercel:** Token-System, Dark-Mode-Excellence
- **Notion:** Tertiary-Ghost-Pattern für untergeordnete Actions
