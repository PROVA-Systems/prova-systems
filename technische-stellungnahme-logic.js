/* ════════════════════════════════════════════════════════════════════
   PROVA — technische-stellungnahme-logic.js (ESM)
   Sprint K-1.3.A2 — Pilot komplett auf Supabase

   Refactor von Skeleton v1 (Sprint 04f P5f.X2):
   - Airtable-TODOs ersetzt durch dataStore.auftraege (Supabase)
   - Edge Function pdf-generate fuer PDF
   - Edge Function audit-write fuer Audit-Log
   - lib/auth-guard.js fuer Session-Pflicht

   Pattern:
     1. Page laedt -> requireWorkspace() -> Workspace-ID
     2. loadDraft() aus localStorage (UX, falls Browser-Crash vor Server-Save)
     3. Auto-Save 30s: lokal + (sobald _auftragId existiert) auch Supabase
     4. tsVersenden -> finalSave + pdf-generate
   ════════════════════════════════════════════════════════════════════ */

import { dataStore } from '/lib/data-store.js';
import { supabase, getCurrentSession } from '/lib/supabase-client.js';
import { requireWorkspace, bindLogoutButtons, watchAuthState } from '/lib/auth-guard.js';

const DRAFT_KEY = 'prova_ts_draft_v1';
const AUTO_SAVE_MS = 30000;
const AUFTRAG_TYP = 'kurzstellungnahme';      // ENUM-Wert; AZ-Pattern bleibt TS-

let _phase = 1;
let _autoSaveTimer = null;
let _workspaceId = null;
let _userId = null;
let _auftragId = null;       // gesetzt nach erstem Server-Save
let _isDirty = false;

// ─── DOM-Helpers ──────────────────────────────────────────────
function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function setVal(id, v) { const el = document.getElementById(id); if (el && v != null) el.value = v; }

// ─── Phasen-Navigation ────────────────────────────────────────
function updateStepper() {
    [1, 2, 3].forEach((n) => {
        const el = document.getElementById('ts-step-' + n);
        if (!el) return;
        el.classList.remove('active', 'done');
        if (n < _phase) el.classList.add('done');
        else if (n === _phase) el.classList.add('active');
    });
}

function showPhase(n) {
    [1, 2, 3].forEach((i) => {
        const p = document.getElementById('ts-phase-' + i);
        if (p) p.classList.toggle('active', i === n);
    });
    const back = document.getElementById('ts-back-btn');
    const next = document.getElementById('ts-next-btn');
    if (back) back.style.display = (n > 1) ? '' : 'none';
    if (next) next.textContent = (n < 3) ? 'Weiter →' : 'Versenden →';
    _phase = n;
    updateStepper();
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* */ }

    // Phase-Wechsel auch in Supabase speichern (falls Auftrag schon existiert)
    if (_auftragId) saveToSupabase({ phase_aktuell: n });
}

window.tsGoTo = function (n) {
    if (n < 1 || n > 3) return;
    if (!validateUpTo(n - 1)) return;
    showPhase(n);
};
window.tsNext = function () {
    if (_phase >= 3) return tsVersenden();
    if (!validatePhase(_phase)) return;
    showPhase(_phase + 1);
};
window.tsBack = function () { if (_phase > 1) showPhase(_phase - 1); };

function validatePhase(n) {
    if (n === 1) {
        const datum = document.getElementById('ts-datum');
        const frage = document.getElementById('ts-frage');
        const artChecked = document.querySelector('input[name="ts-art"]:checked');
        const missing = [];
        if (datum && !datum.value) missing.push('Datum');
        if (!artChecked) missing.push('Art der Anfrage');
        if (frage && !frage.value.trim()) missing.push('Konkrete Frage');
        if (missing.length) {
            alert('Bitte ausfüllen: ' + missing.join(', '));
            return false;
        }
    } else if (n === 2) {
        const antwort = document.getElementById('ts-antwort');
        if (antwort && !antwort.value.trim()) {
            alert('Antwort auf konkrete Frage ist Pflichtfeld.');
            return false;
        }
    }
    return true;
}
function validateUpTo(n) {
    for (let i = 1; i <= n; i++) if (!validatePhase(i)) return false;
    return true;
}

// ─── AZ-Generator ─────────────────────────────────────────────
function generateAz() {
    const year = new Date().getFullYear();
    const lastNum = parseInt(localStorage.getItem('prova_ts_last_num') || '0', 10);
    const next = lastNum + 1;
    localStorage.setItem('prova_ts_last_num', String(next));
    return 'TS-' + year + '-' + String(next).padStart(3, '0');
}

// ─── Draft-Gathering ──────────────────────────────────────────
function gatherDraft() {
    return {
        ts: Date.now(),
        phase: _phase,
        az: getVal('ts-az'),
        datum: getVal('ts-datum'),
        auftraggeber_name: getVal('ts-auftraggeber-name'),
        auftraggeber_email: getVal('ts-auftraggeber-email'),
        auftraggeber_adresse: getVal('ts-auftraggeber-adresse'),
        art: (document.querySelector('input[name="ts-art"]:checked') || {}).value || '',
        frage: getVal('ts-frage'),
        sachverhalt: getVal('ts-sachverhalt'),
        bewertung: getVal('ts-bewertung'),
        antwort: getVal('ts-antwort'),
        normen: getVal('ts-normen'),
        honorar: getVal('ts-honorar'),
        honorar_typ: getVal('ts-honorar-typ')
    };
}

function draftToAuftragRow(d) {
    return {
        typ: AUFTRAG_TYP,
        az: d.az || generateAz(),
        status: 'entwurf',
        zweck: 'privat',
        phase_aktuell: d.phase || 1,
        phase_max: 3,
        titel: 'Technische Stellungnahme',
        fragestellung: d.frage,
        auftragsdatum: d.datum || null,
        objekt: {
            adresse: d.auftraggeber_adresse,
            land: 'DE'
        },
        details: {
            art: d.art,
            sachverhalt: d.sachverhalt,
            bewertung: d.bewertung,
            antwort: d.antwort,
            normen: d.normen,
            honorar: d.honorar,
            honorar_typ: d.honorar_typ,
            auftraggeber: {
                name: d.auftraggeber_name,
                email: d.auftraggeber_email,
                adresse: d.auftraggeber_adresse
            }
        }
    };
}

// ─── Auto-Save (lokal + Supabase) ─────────────────────────────
function autoSaveLocal() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(gatherDraft())); } catch { /* */ }
}

async function saveToSupabase(partial) {
    if (!_workspaceId) return;
    try {
        if (!_auftragId) {
            const draft = gatherDraft();
            const row = draftToAuftragRow(draft);
            const { data, error } = await dataStore.auftraege.create(row);
            if (error) { console.warn('TS create:', error); return; }
            _auftragId = data.id;
            await dataStore.auditLog('create', 'auftrag', _auftragId, { typ: AUFTRAG_TYP, source: 'ts-pilot' });
        } else {
            const updates = partial || draftToAuftragRow(gatherDraft());
            // Trigger updated_at, partial-update OK
            await dataStore.auftraege.update(_auftragId, updates);
        }
        _isDirty = false;
        flashSaveBadge('☁ Supabase-Save');
    } catch (e) {
        console.error('TS saveToSupabase:', e);
    }
}

async function autoSave() {
    autoSaveLocal();
    if (_isDirty && _workspaceId) {
        await saveToSupabase();
    }
}

function loadDraft() {
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);
        if (!d) return;
        setVal('ts-az', d.az || '');
        setVal('ts-datum', d.datum || '');
        setVal('ts-auftraggeber-name', d.auftraggeber_name || '');
        setVal('ts-auftraggeber-email', d.auftraggeber_email || '');
        setVal('ts-auftraggeber-adresse', d.auftraggeber_adresse || '');
        if (d.art) {
            const radio = document.querySelector('input[name="ts-art"][value="' + d.art + '"]');
            if (radio) { radio.checked = true; updateRadioHighlight(); }
        }
        setVal('ts-frage', d.frage || '');
        setVal('ts-sachverhalt', d.sachverhalt || '');
        setVal('ts-bewertung', d.bewertung || '');
        setVal('ts-antwort', d.antwort || '');
        setVal('ts-normen', d.normen || '');
        setVal('ts-honorar', d.honorar || '');
        setVal('ts-honorar-typ', d.honorar_typ || 'pauschal');
        updateFrageCounter();
    } catch { /* */ }
}

function flashSaveBadge(text) {
    let saved = document.getElementById('ts-saved-toast');
    if (!saved) {
        saved = document.createElement('div');
        saved.id = 'ts-saved-toast';
        saved.style.cssText = 'position:fixed;bottom:30px;right:30px;background:var(--success);color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(16,185,129,.4);';
        document.body.appendChild(saved);
    }
    saved.textContent = text;
    saved.style.display = 'block';
    setTimeout(() => { if (saved) saved.style.display = 'none'; }, 2400);
}

window.tsSpeichern = async function () {
    autoSaveLocal();
    if (_workspaceId) {
        await saveToSupabase();
    } else {
        flashSaveBadge('💾 Lokal gespeichert');
    }
};

// ─── Versenden / Final-Save + PDF ─────────────────────────────
async function tsVersenden() {
    if (!validatePhase(2)) return;

    // Sicherstellen dass Auftrag in Supabase steht
    await saveToSupabase({
        ...draftToAuftragRow(gatherDraft()),
        status: 'aktiv',
        phase_aktuell: 3,
        gutachtendatum: new Date().toISOString().slice(0, 10)
    });

    if (!_auftragId) {
        alert('Speichern fehlgeschlagen — bitte später erneut versuchen.');
        return;
    }

    // PDF generieren via Edge Function
    flashSaveBadge('📄 PDF wird generiert…');
    try {
        const session = await getCurrentSession();
        const url = `${window.PROVA_CONFIG.SUPABASE_URL}/functions/v1/pdf-generate`;
        const draft = gatherDraft();
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session?.access_token ?? ''}`,
                'apikey': window.PROVA_CONFIG.SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                template_key: 'kurzstellungnahme',
                payload: {
                    az: draft.az,
                    datum: draft.datum,
                    empfaenger_name: draft.auftraggeber_name,
                    empfaenger_email: draft.auftraggeber_email,
                    empfaenger_adresse: draft.auftraggeber_adresse,
                    art: draft.art,
                    frage: draft.frage,
                    sachverhalt: draft.sachverhalt,
                    bewertung: draft.bewertung,
                    antwort: draft.antwort,
                    normen: draft.normen
                },
                auftrag_id: _auftragId,
                typ: 'kurzstellungnahme_pdf',
                betreff: 'Technische Stellungnahme · ' + draft.az
            })
        });
        const json = await resp.json();
        if (!resp.ok) {
            alert('PDF-Generation Fehler: ' + (json.error || resp.status));
            return;
        }

        // Audit
        await dataStore.auditLog('pdf_generate', 'dokument', json.dokument_id, {
            template_key: 'kurzstellungnahme',
            auftrag_id: _auftragId
        });

        flashSaveBadge('✓ PDF fertig');
        // Redirect zur Akte
        setTimeout(() => {
            window.location.href = '/akte.html?id=' + _auftragId + '&pdf=' + encodeURIComponent(json.pdf_url || '');
        }, 1200);
    } catch (e) {
        console.error('PDF-Generation:', e);
        alert('PDF-Generation Fehler: ' + e.message);
    }
}

// ─── Radio-Item-Highlight ─────────────────────────────────────
function updateRadioHighlight() {
    document.querySelectorAll('.ts-radio-item').forEach((el) => {
        const inp = el.querySelector('input[type=radio]');
        el.classList.toggle('checked', !!(inp && inp.checked));
    });
}

// ─── Frage-Zeichenzaehler ─────────────────────────────────────
function updateFrageCounter() {
    const inp = document.getElementById('ts-frage');
    const cnt = document.getElementById('ts-frage-count');
    if (inp && cnt) cnt.textContent = String(inp.value.length);
}

// ─── Init ─────────────────────────────────────────────────────
async function init() {
    // 1. Auth + Workspace
    try {
        const ctx = await requireWorkspace();
        _workspaceId = ctx.workspaceId;
        _userId = ctx.user.id;
    } catch (e) {
        console.error('Auth:', e);
        return;
    }

    // 2. UI-Defaults
    const datum = document.getElementById('ts-datum');
    if (datum && !datum.value) datum.value = new Date().toISOString().slice(0, 10);

    const az = document.getElementById('ts-az');
    if (az && !az.value) az.value = generateAz();

    // 3. Draft restore
    loadDraft();

    // 4. TODO-Banner verstecken (Backend ist jetzt da)
    const banner = document.getElementById('ts-todo');
    if (banner) banner.style.display = 'none';

    // 5. Frage-Counter
    const frage = document.getElementById('ts-frage');
    if (frage) frage.addEventListener('input', () => { updateFrageCounter(); _isDirty = true; });

    // 6. Radio-Highlights
    document.querySelectorAll('input[name="ts-art"]').forEach((r) => {
        r.addEventListener('change', () => { updateRadioHighlight(); _isDirty = true; });
    });
    updateRadioHighlight();

    // 7. Generic dirty-tracking
    document.querySelectorAll('.ts-input, .ts-textarea, .ts-select').forEach((el) => {
        el.addEventListener('input', () => { _isDirty = true; });
    });

    // 8. Auto-Save Timer
    if (_autoSaveTimer) clearInterval(_autoSaveTimer);
    _autoSaveTimer = setInterval(autoSave, AUTO_SAVE_MS);
    window.addEventListener('beforeunload', autoSaveLocal);

    // 9. Stepper init
    updateStepper();

    // 10. Auth-Watcher (Multi-Tab-Logout)
    watchAuthState();
    bindLogoutButtons();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
