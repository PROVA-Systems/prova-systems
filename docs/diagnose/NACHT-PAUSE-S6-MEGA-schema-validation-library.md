# NACHT-PAUSE S6-MEGA — Schema-Validation-Library Architektur-Decision

**Datum:** 03.05.2026 nacht (Mega-Mega-Sprint Sprint X4)
**Sprint:** S6 H-08 (OWASP ASVS V2.1.2)
**Marcel-Decision pflicht:** vor Sprint X5/Phase 5

---

## Was zur Entscheidung steht

PROVA hat aktuell **keine** Schema-Validation-Library. Validation läuft ad-hoc in jeder Function. OWASP ASVS V2.1.2 fordert Schema-basierte Validation.

In Sprint X4 habe ich Validation-Patches direkt in die Functions integriert (CRLF-Schutz, Email-Format, Length-Limits). Funktioniert, aber Code-Duplikation entsteht.

Für saubere Architektur und Sprint 7+ Konsolidierung: Schema-Library wählen.

---

## Optionen

### Option A — `zod` (TypeScript-First, modern)

```js
const z = require('zod');
const sendEmailSchema = z.object({
  to: z.string().email().max(254),
  subject: z.string().max(200).regex(/^[^\r\n]*$/),
  text: z.string().max(100_000).optional(),
  html: z.string().max(100_000).optional()
}).refine(d => d.text || d.html, { message: 'text oder html erforderlich' });

const result = sendEmailSchema.safeParse(body);
if (!result.success) return json(400, { error: result.error.flatten() });
```

**Pros:**
- ~14kB gzipped (kleinster aller Optionen)
- TypeScript-Inferenz hervorragend (zukunftssicher für TS-Migration)
- Modern, gut gewartet
- API ist intuitiv

**Cons:**
- Newer Library — Pattern weniger etabliert in Legacy-Codebases
- Schema-Definition kann verbose werden bei komplexen Refinements

### Option B — `joi` (Industry-Standard, etabliert)

```js
const Joi = require('joi');
const sendEmailSchema = Joi.object({
  to: Joi.string().email().max(254).required(),
  subject: Joi.string().max(200).pattern(/^[^\r\n]*$/).required(),
  text: Joi.string().max(100_000),
  html: Joi.string().max(100_000)
}).or('text', 'html');

const { error, value } = sendEmailSchema.validate(body);
if (error) return json(400, { error: error.message });
```

**Pros:**
- Industry-Standard, sehr etabliert
- Reife API mit umfangreicher Doku
- Große Community, viele Stack-Overflow-Beispiele

**Cons:**
- ~125kB gzipped (10× größer als zod)
- Nicht TS-first — Type-Inferenz limitiert
- Runtime-First-Design

### Option C — `valibot` (zod-Alternative, noch kleiner)

```js
const v = require('valibot');
const schema = v.object({
  to: v.pipe(v.string(), v.email(), v.maxLength(254)),
  subject: v.pipe(v.string(), v.maxLength(200)),
  text: v.optional(v.string())
});

const result = v.safeParse(schema, body);
```

**Pros:**
- ~3kB gzipped (extrem klein, für Bundle-Size-sensitive Frontends)
- TS-First wie zod
- Modular (tree-shakeable)

**Cons:**
- Sehr neu (2024+), kleinere Community
- Verbose API (mehr Pipe-Composition)

### Option D — Manueller Validator-Helper ausbauen

`lib/auth-validate.js` ergänzen mit Schema-DSL:

```js
const Validator = require('./lib/validator');
const sendEmailSchema = Validator.object({
  to: Validator.email().max(254),
  subject: Validator.string().max(200).noControlChars(),
  text: Validator.string().max(100_000).optional()
});
```

**Pros:**
- 0 kB Library-Overhead
- Komplett unter PROVA-Kontrolle
- An PROVA-Anforderungen optimal angepasst

**Cons:**
- Wartungs-Aufwand bleibt bei PROVA
- Test-Coverage und Edge-Cases müssen selbst gewährleistet werden
- Re-Inventing-the-Wheel

---

## Meine Empfehlung

**Option A — zod.**

Begründung:
1. **TS-Zukunft:** wenn PROVA in Folge-Sprint TypeScript für Functions adoptiert, ist zod der TS-Standard-Validator.
2. **Bundle-Size:** 14kB ist akzeptabel für Backend (Frontend nutzt Validierung kaum, hauptsächlich Backend-Functions).
3. **Modern:** zod-Pattern ist auf Stack-Overflow heute am häufigsten.
4. **Refinements:** bei komplexen Cross-Field-Validations stark.

Wenn Bundle-Size kritisch wäre (Frontend): **Option C valibot**. Aber hier haben wir Backend-Use-Case, daher zod.

Wenn Marcel **Industry-Standard + breite Doku** bevorzugt: **Option B joi** ist auch valide.

Wenn Marcel **0-Dependency-Doktrin** vorzieht: **Option D** — aber Aufwand für Folge-Sprint ist signifikant.

---

## Migration-Plan (egal welche Option)

### Phase 1 (Folge-Sprint nach Marcel-Decision)
- [ ] Library installieren: `npm install zod` (oder gewählte Alternative)
- [ ] `lib/schemas.js` zentral mit allen Schemas
- [ ] `requireValidation(schema)`-Wrapper analog zu `requireAuth`
- [ ] 5-10 Functions migrieren (high-impact: stripe-checkout, smtp-senden, dsgvo-*)

### Phase 2
- [ ] Restliche 20 Functions
- [ ] Tests pro Schema

### Phase 3
- [ ] Frontend-Validation-Helpers daraus generieren (optional)

**Aufwand:** ~10-15h für vollständige Migration.

---

## Marcel-Decision

- [ ] Option A — zod (meine Empfehlung)
- [ ] Option B — joi
- [ ] Option C — valibot
- [ ] Option D — manueller Helper
- [ ] anders / Diskussion mit Claude Code

---

## Was Claude Code in Sprint X4 gemacht hat (ohne diese Decision)

- Validation-Patches direkt inline in Functions (smtp-senden, emails, akte-export)
- CRLF-Injection-Schutz, Email-Format-Check, Length-Limits, MIME-Whitelist-Pattern
- Funktioniert, aber Code-Duplikation. Migration auf Schema-Lib in Folge-Sprint sauber.

---

*NACHT-PAUSE 03.05.2026 nacht · Marcel-Review pending*
