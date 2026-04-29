/* ════════════════════════════════════════════════════════════════════
   PROVA — auftrag-neu-logic.js (ESM)
   Sprint 06b — Auftrags-Wizard Skeleton

   STATUS: SKELETON — LocalStorage-Draft only.
   Live-Save in DB kommt in Sprint 06c sobald Schema-Migration
   PLANNED_06b_auftraege_extend.sql appliziert ist (siehe
   docs/sprint-status/SCHEMA-GAP-AUDIT.md).

   Phasen:
     1A — Auftraggeber-Stammdaten (Picker auf kontakte-Tabelle ODER
          Hinweis "neuen Kontakt anlegen")
     1B — Vorgangsdaten typ-spezifisch (schadennummer/anwalt_az/
          gericht_az/...)
     2  — Objekt + Beteiligte + Schadensart
     3  — Schadensart-spezifische Detail-Felder

   Pattern: ESM, requires lib/auth-guard, lib/data-store.kontakte
            (Picker), lib/auftrags-schema (Conditional-Logic).

   Auto-Save: alle 1500ms wenn _isDirty, plus on-blur.
              Key: prova:auftrag-neu:draft (1 Draft pro Browser/User).

   Sprint 06c TODO (aktivieren nach Schema-Migration):
     - Live-Save: kontakteStore.create (falls neuer Kontakt) +
       auftraege.createDraft + auftrag_kontakte M:N-Inserts
     - Beteiligte-Picker statt LocalStorage-only
═══════════════════════════════════════════════════════════════════════ */

import { kontakte as kontakteStore, auftraege } from '/lib/data-store.js';
import { requireWorkspace, watchAuthState, bindLogoutButtons } from '/lib/auth-guard.js';
import {
    AUFTRAGGEBER_TYPEN,
    SCHADENSARTEN,
    FELDER,
    getRequiredFields,
    getOptionalFields,
    validateAuftragsPayload
} from '/lib/auftrags-schema.js';

const $ = (id) => document.getElementById(id);
const DRAFT_KEY = 'prova:auftrag-neu:draft';
const PHASES = ['1a', '1b', '2', '3'];

// ─── State ──────────────────────────────────────────────────
let _currentPhase = '1a';
let _payload = {};
let _isDirty = false;
let _autoSaveTimer = null;
let _kontaktSearchTimer = null;

// ─── UI-Helpers ──────────────────────────────────────────────
function toast(kind, text, ms = 2400) {
    const el = $('toast');
    el.className = 'toast ' + kind;
    el.textContent = text;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, ms);
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function setDraftStatus(state, text) {
    const icon = $('draft-icon');
    const txt = $('draft-text');
    const wrap = $('draft-status');
    if (state === 'saved') { wrap.classList.add('saved'); icon.textContent = '✅'; }
    else if (state === 'saving') { wrap.classList.remove('saved'); icon.textContent = '⏳'; }
    else if (state === 'error')  { wrap.classList.remove('saved'); icon.textContent = '⚠️'; }
    else                         { wrap.classList.remove('saved'); icon.textContent = '💾'; }
    txt.textContent = text;
}

// ─── Draft Save/Load ─────────────────────────────────────────
function saveDraft() {
    setDraftStatus('saving', 'Speichere Entwurf …');
    try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
            phase: _currentPhase,
            payload: _payload,
            updated_at: new Date().toISOString()
        }));
        _isDirty = false;
        setDraftStatus('saved', 'Entwurf gespeichert (lokal)');
    } catch (e) {
        console.error('saveDraft:', e);
        setDraftStatus('error', 'Speichern fehlgeschlagen');
    }
}

function loadDraft() {
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return false;
        const draft = JSON.parse(raw);
        _payload = draft.payload || {};
        _currentPhase = PHASES.includes(draft.phase) ? draft.phase : '1a';
        return true;
    } catch (e) {
        console.warn('loadDraft fehlgeschlagen:', e);
        return false;
    }
}

function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    _payload = {};
    _currentPhase = '1a';
    _isDirty = false;
}

function scheduleAutoSave() {
    _isDirty = true;
    setDraftStatus('default', 'Änderungen vorhanden …');
    clearTimeout(_autoSaveTimer);
    _autoSaveTimer = setTimeout(saveDraft, 1500);
}

// ─── Field-Renderer ──────────────────────────────────────────
function renderField(fieldId, opts = {}) {
    const meta = FELDER[fieldId];
    if (!meta) {
        console.warn(`[auftrag-neu] FELDER[${fieldId}] not defined`);
        return '';
    }
    const required = opts.required ?? false;
    const value = _payload[fieldId] ?? '';
    const reqStar = required ? '<span class="req">*</span>' : '';
    const help = meta.help ? `<span class="help">${escapeHtml(meta.help)}</span>` : '';
    const labelHtml = `<label class="form-label" for="f-${fieldId}">${escapeHtml(meta.label)}${reqStar}${help}</label>`;

    if (meta.type === 'textarea') {
        return `<div class="form-grid single"><div>
          ${labelHtml}
          <textarea id="f-${fieldId}" data-fname="${fieldId}" class="form-textarea" data-required="${required ? '1' : '0'}">${escapeHtml(value)}</textarea>
        </div></div>`;
    }

    if (meta.type === 'select') {
        const options = (meta.options || []).map(opt => {
            const v = typeof opt === 'object' ? opt.value : opt;
            const l = typeof opt === 'object' ? opt.label : opt;
            const sel = (v === value) ? ' selected' : '';
            return `<option value="${escapeHtml(v)}"${sel}>${escapeHtml(l)}</option>`;
        }).join('');
        return `<div>
          ${labelHtml}
          <select id="f-${fieldId}" data-fname="${fieldId}" class="form-select" data-required="${required ? '1' : '0'}">
            <option value="">— bitte wählen —</option>
            ${options}
          </select>
        </div>`;
    }

    if (meta.type === 'multi') {
        // simple textarea-fallback fuer multi-select (Skeleton — 06c koennte Tag-Picker)
        const valArr = Array.isArray(value) ? value.join(', ') : value;
        return `<div class="form-grid single"><div>
          ${labelHtml}
          <input id="f-${fieldId}" data-fname="${fieldId}" data-multi="1" type="text" class="form-input" data-required="${required ? '1' : '0'}" value="${escapeHtml(valArr)}" placeholder="kommagetrennt">
        </div></div>`;
    }

    if (meta.type === 'kontakt_picker') {
        // Skeleton: einfaches Text-Feld mit Hint, 06c -> Kontakt-Picker mit dropdown
        return `<div class="form-grid single"><div>
          ${labelHtml}
          <input id="f-${fieldId}" data-fname="${fieldId}" type="text" class="form-input" data-required="${required ? '1' : '0'}" value="${escapeHtml(value)}" placeholder="Name oder Firma — Picker kommt in 06c">
        </div></div>`;
    }

    const t = meta.type === 'tel' ? 'tel' : meta.type === 'email' ? 'email' :
              meta.type === 'date' ? 'date' : meta.type === 'time' ? 'time' :
              meta.type === 'number' ? 'number' : 'text';
    const ph = meta.placeholder ? ` placeholder="${escapeHtml(meta.placeholder)}"` : '';
    return `<div>
      ${labelHtml}
      <input id="f-${fieldId}" data-fname="${fieldId}" type="${t}" class="form-input" data-required="${required ? '1' : '0'}" value="${escapeHtml(value)}"${ph}>
    </div>`;
}

function pairFields(fields, opts) {
    // Pack einzelne Inputs in 2-col grids; textarea/select-single bleiben full-width
    let out = '';
    let buf = [];
    fields.forEach(fieldId => {
        const fragment = renderField(fieldId, opts(fieldId));
        if (fragment.startsWith('<div class="form-grid single">')) {
            if (buf.length) { out += `<div class="form-grid">${buf.join('')}</div>`; buf = []; }
            out += fragment;
        } else {
            buf.push(fragment);
            if (buf.length === 2) { out += `<div class="form-grid">${buf.join('')}</div>`; buf = []; }
        }
    });
    if (buf.length) out += `<div class="form-grid">${buf.join('')}</div>`;
    return out;
}

// ─── Phase-Renderer ──────────────────────────────────────────

function renderPhase1A() {
    // Phase 1A: Auftraggeber-Typ + Stammdaten
    const at = _payload.auftraggeber_typ;
    let html = '';

    html += `<div class="section-hint">
      <strong>Phase 1A — Auftraggeber wählen.</strong> Wer beauftragt das Gutachten?
      Stammdaten (Adresse, Firma, Email) — diese werden im Adressbuch gespeichert
      und für künftige Aufträge wiederverwendet.
    </div>`;

    // Typ-Selector (Discriminator)
    html += `<div class="form-grid single"><div>
      <label class="form-label" for="f-auftraggeber_typ">Auftraggeber-Typ <span class="req">*</span></label>
      <select id="f-auftraggeber_typ" data-fname="auftraggeber_typ" class="form-select" data-required="1">
        <option value="">— bitte wählen —</option>
        ${Object.keys(AUFTRAGGEBER_TYPEN).map(k => {
          const sel = (k === at) ? ' selected' : '';
          return `<option value="${k}"${sel}>${AUFTRAGGEBER_TYPEN[k].label}</option>`;
        }).join('')}
      </select>
    </div></div>`;

    if (!at) {
        html += `<div class="section-warn" style="margin-top:14px;">
          Bitte zuerst Auftraggeber-Typ wählen — die weiteren Felder erscheinen dann typ-abhängig.
        </div>`;
        return html;
    }

    const required = getRequiredFields(at).phase_1a_stammdaten;
    const optional = getOptionalFields(at).phase_1a_stammdaten_opt;

    html += `<h3 style="font-size:13px; color:var(--text2); margin: 18px 0 8px; font-weight:600;">Stammdaten (Pflicht)</h3>`;
    html += pairFields(required, () => ({ required: true }));

    if (optional.length) {
        html += `<h3 style="font-size:13px; color:var(--text2); margin: 18px 0 8px; font-weight:600;">Optionale Felder</h3>`;
        html += pairFields(optional, () => ({ required: false }));
    }

    // Hinweis: Picker auf existierenden Kontakt — Skeleton
    html += `<div class="section-hint" style="margin-top:18px;">
      💡 <strong>Sprint 06c:</strong> Statt Felder neu auszufüllen kannst du dann
      einen existierenden Kontakt aus dem Adressbuch wählen (Kontakt-Picker).
      Aktuell: Stammdaten direkt hier eingeben → werden in 06c als kontakte-Eintrag gespeichert.
    </div>`;

    return html;
}

function renderPhase1B() {
    const at = _payload.auftraggeber_typ;
    if (!at) return `<div class="section-warn">Phase 1A unvollständig — bitte erst Auftraggeber-Typ wählen.</div>`;

    const cfg = AUFTRAGGEBER_TYPEN[at];
    const required = cfg.vorgangs_pflicht;
    const optional = cfg.vorgangs_opt;

    let html = '';
    html += `<div class="section-hint">
      <strong>Phase 1B — Vorgangsdaten.</strong> Daten die zu DIESEM Auftrag gehören
      (z.&nbsp;B. Schadennummer, Aktenzeichen, Frist). Anders als Stammdaten:
      bei jedem neuen Auftrag des selben Auftraggebers <em>andere</em> Werte.
    </div>`;

    if (required.length === 0 && optional.length === 0) {
        html += `<div class="section-hint" style="background:rgba(16,185,129,0.08); border-left-color:var(--success);">
          ${AUFTRAGGEBER_TYPEN[at].label}: keine vorgangsspezifischen Pflichtfelder.
          Du kannst direkt zu Phase 2.
        </div>`;
        return html;
    }

    if (required.length) {
        html += `<h3 style="font-size:13px; color:var(--text2); margin: 0 0 8px; font-weight:600;">Pflicht für ${escapeHtml(cfg.label)}</h3>`;
        html += pairFields(required, () => ({ required: true }));
    }
    if (optional.length) {
        html += `<h3 style="font-size:13px; color:var(--text2); margin: 18px 0 8px; font-weight:600;">Optional</h3>`;
        html += pairFields(optional, () => ({ required: false }));
    }

    return html;
}

function renderPhase2() {
    let html = '';
    html += `<div class="section-hint">
      <strong>Phase 2 — Objekt &amp; Beteiligte.</strong> Wo befindet sich das
      Schadensobjekt? Welche Schadensart? Wer ist beteiligt
      (Eigentümer, Geschädigter, Anwälte, etc.)?
    </div>`;

    const objektFelder = ['objekt_adresse_strasse','objekt_adresse_plz','objekt_adresse_ort','objekt_typ','baujahr'];
    html += `<h3 style="font-size:13px; color:var(--text2); margin: 0 0 8px; font-weight:600;">Schadens-Objekt</h3>`;
    html += pairFields(objektFelder, (id) => ({ required: ['objekt_adresse_strasse','objekt_adresse_plz','objekt_adresse_ort','objekt_typ'].includes(id) }));

    html += `<h3 style="font-size:13px; color:var(--text2); margin: 18px 0 8px; font-weight:600;">Schadensart</h3>`;
    html += pairFields(['schadensart','schadens_datum'], () => ({ required: true }));

    // Beteiligte (typ-spezifisch)
    const at = _payload.auftraggeber_typ;
    if (at) {
        const cfg = AUFTRAGGEBER_TYPEN[at];
        if (cfg.beteiligte_pflicht.length) {
            html += `<h3 style="font-size:13px; color:var(--text2); margin: 18px 0 8px; font-weight:600;">Beteiligte (Pflicht)</h3>`;
            html += pairFields(cfg.beteiligte_pflicht, () => ({ required: true }));
        }
    }

    // Bei Baumangel kommt bauunternehmen als Pflicht-Beteiligter
    if (_payload.schadensart === 'baumangel') {
        html += pairFields(['bauunternehmen'], () => ({ required: true }));
    }

    html += `<div class="section-hint" style="margin-top:18px;">
      💡 <strong>Sprint 06c:</strong> Beteiligte werden via Kontakt-Picker aus dem
      Adressbuch gewählt + in <code>auftrag_kontakte</code> M:N-Tabelle gespeichert
      mit den passenden Rollen (kläger, beklagter, anwalt_klaeger, etc.).
    </div>`;

    return html;
}

function renderPhase3() {
    const sa = _payload.schadensart;
    let html = '';

    html += `<div class="section-hint">
      <strong>Phase 3 — Schadensart-Details &amp; Ortstermin.</strong>
      Spezifische Felder für ${sa ? `<strong>${escapeHtml(SCHADENSARTEN[sa]?.label || sa)}</strong>` : 'die gewählte Schadensart'}
      plus Ortstermin-Daten.
    </div>`;

    if (!sa) {
        html += `<div class="section-warn">Phase 2 unvollständig — bitte erst Schadensart wählen.</div>`;
        return html;
    }

    const sacfg = SCHADENSARTEN[sa];
    if (sacfg && sacfg.zusatz_felder.length) {
        html += `<h3 style="font-size:13px; color:var(--text2); margin: 0 0 8px; font-weight:600;">Schadensart-Details (${escapeHtml(sacfg.label)})</h3>`;
        html += pairFields(sacfg.zusatz_felder, () => ({ required: true }));
    }

    if (sacfg && sacfg.relevante_normen.length) {
        html += `<div class="section-hint" style="margin: 14px 0;">
          📚 <strong>Relevante Normen:</strong> ${sacfg.relevante_normen.map(n => `<code>${escapeHtml(n)}</code>`).join(' · ')}
        </div>`;
    }

    html += `<h3 style="font-size:13px; color:var(--text2); margin: 18px 0 8px; font-weight:600;">Ortstermin</h3>`;
    html += pairFields(['ortstermin_datum','ortstermin_uhrzeit'], () => ({ required: true }));
    html += pairFields(['anwesende'], () => ({ required: true }));
    if (sacfg) {
        const ots = sacfg.ortstermin_pflicht;
        if (ots.length) html += pairFields(ots, () => ({ required: true }));
    }
    html += pairFields(['schadensbeschreibung'], () => ({ required: true }));

    return html;
}

function renderCurrentPhase() {
    const container = $('phase-container');
    let html = '';
    if (_currentPhase === '1a') html = renderPhase1A();
    else if (_currentPhase === '1b') html = renderPhase1B();
    else if (_currentPhase === '2') html = renderPhase2();
    else if (_currentPhase === '3') html = renderPhase3();
    container.innerHTML = html;

    // Wire up field change handlers
    container.querySelectorAll('[data-fname]').forEach(el => {
        const fname = el.dataset.fname;
        const handler = () => {
            const val = (el.tagName === 'SELECT') ? el.value : el.value;
            // multi: comma-split to array
            if (el.dataset.multi === '1') {
                _payload[fname] = val.split(',').map(v => v.trim()).filter(Boolean);
            } else {
                _payload[fname] = val;
            }
            scheduleAutoSave();
            // Bei Auftraggeber-Typ-Wechsel oder Schadensart-Wechsel: re-render Phase
            if (fname === 'auftraggeber_typ' || fname === 'schadensart') {
                renderCurrentPhase();
            }
        };
        el.addEventListener('input', handler);
        el.addEventListener('change', handler);
    });

    updateStepperHighlight();
    updateFooterButtons();
}

function updateStepperHighlight() {
    document.querySelectorAll('.step').forEach(el => {
        const p = el.dataset.phase;
        const idx = PHASES.indexOf(p);
        const cur = PHASES.indexOf(_currentPhase);
        el.classList.remove('active', 'done');
        if (idx === cur) el.classList.add('active');
        else if (idx < cur) el.classList.add('done');
    });
}

function updateFooterButtons() {
    const cur = PHASES.indexOf(_currentPhase);
    $('btn-back').disabled = cur === 0;
    $('btn-next').textContent = (cur === PHASES.length - 1) ? 'Abschluss-Vorschau' : 'Weiter →';
}

// ─── Phase-Navigation ───────────────────────────────────────
function validateCurrentPhase() {
    const errors = validateAuftragsPayload(_payload, { phaseLimit: _currentPhase });
    // Filter only errors for the current phase or earlier (validateAuftragsPayload
    // checks cumulative; we want to highlight current phase fields).
    const phaseKey = {
        '1a': 'phase_1a_stammdaten',
        '1b': 'phase_1b_vorgang',
        '2':  ['phase_2_objekt', 'phase_2_beteiligte', 'phase_2_schadensart_zusatz'],
        '3':  'phase_3_ortstermin'
    }[_currentPhase];
    const phaseKeys = Array.isArray(phaseKey) ? phaseKey : [phaseKey];
    const phaseErrors = errors.filter(e => phaseKeys.includes(e.phase));

    // Highlight Felder
    document.querySelectorAll('[data-fname]').forEach(el => el.classList.remove('error'));
    phaseErrors.forEach(e => {
        const el = document.querySelector(`[data-fname="${e.field}"]`);
        if (el) el.classList.add('error');
    });

    return phaseErrors;
}

function goToPhase(phase) {
    if (!PHASES.includes(phase)) return;
    saveDraft();
    _currentPhase = phase;
    renderCurrentPhase();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

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
        // Letzter Schritt — Skeleton-Ende
        toast('info', 'Live-Save kommt nach Schema-Migration (Sprint 06c). Entwurf bleibt lokal.', 6000);
    }
}

function prevPhase() {
    const cur = PHASES.indexOf(_currentPhase);
    if (cur > 0) goToPhase(PHASES[cur - 1]);
}

function discardDraft() {
    if (!confirm('Entwurf wirklich verwerfen? Lokale Eingaben gehen verloren.')) return;
    clearDraft();
    renderCurrentPhase();
    setDraftStatus('default', 'Entwurf verworfen');
    toast('info', 'Entwurf zurueckgesetzt');
}

// ─── Init ────────────────────────────────────────────────────
async function init() {
    try {
        await requireWorkspace();
    } catch (e) {
        console.error('Auth:', e);
        return;
    }

    // Stepper-Click
    document.querySelectorAll('.step').forEach(el => {
        el.addEventListener('click', () => {
            // Erlaube Sprung nur zu phasen die schon erreicht oder nahe sind
            const target = el.dataset.phase;
            const targetIdx = PHASES.indexOf(target);
            const curIdx = PHASES.indexOf(_currentPhase);
            // Erlaube Rueck-Navigation immer, Vorwaerts-Sprung nur 1 Schritt
            if (targetIdx <= curIdx + 1) goToPhase(target);
        });
    });

    // Action-Buttons
    $('btn-next').addEventListener('click', nextPhase);
    $('btn-back').addEventListener('click', prevPhase);
    $('btn-discard').addEventListener('click', discardDraft);

    // Beforeunload — wenn dirty noch nicht gespeichert, warnen
    window.addEventListener('beforeunload', (e) => {
        if (_isDirty) {
            saveDraft();
            // Kein confirm-Dialog mehr noetig wenn saveDraft synchron klappt
        }
    });

    // Load Draft
    const hadDraft = loadDraft();
    if (hadDraft) {
        toast('info', 'Entwurf wiederhergestellt', 3000);
        setDraftStatus('saved', 'Entwurf geladen');
    } else {
        setDraftStatus('default', 'Bereit');
    }

    renderCurrentPhase();
    watchAuthState();
    bindLogoutButtons();

    // Sprint 06b/06c-Hinweis fuer Marcel im Browser-Console
    console.info('[auftrag-neu] Skeleton aktiv. Live-Save in DB kommt nach Schema-Migration PLANNED_06b_auftraege_extend.sql.');
    console.info('[auftrag-neu] Verwendet: lib/auftrags-schema (Conditional), lib/data-store.kontakte+auftraege (Picker+Draft).');
    // Marcel-DEBUG via window.PROVA_DEBUG
    if (window.PROVA_DEBUG) {
        window.PROVA_DEBUG.auftragNeu = {
            getPayload: () => _payload,
            getCurrentPhase: () => _currentPhase,
            saveDraft, loadDraft, clearDraft,
            goToPhase
        };
    }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
