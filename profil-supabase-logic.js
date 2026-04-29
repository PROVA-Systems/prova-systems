/* ════════════════════════════════════════════════════════════════════
   PROVA — profil-supabase-logic.js (ESM)
   Sprint K-UI Item 1 — Profil + Briefkopf-Konfig

   Speichert:
     - Stammdaten in users-Tabelle (name, titel, qualifikation, ...)
     - Briefkopf in users.letterhead_config JSONB
     - Logo/Stempel/Unterschrift in letterheads-Storage-Bucket
       Pfad-Konvention: <auth.uid()>/{logo|stempel|unterschrift}.<ext>

   Pattern: ESM, lib/auth-guard, dataStore (für users-Update), supabase
   direkt für Storage-Uploads. Auto-Save NICHT — explizit per Speichern-Button.
═══════════════════════════════════════════════════════════════════════ */

import { supabase, getCurrentUser } from '/lib/supabase-client.js';
import { requireWorkspace, watchAuthState, bindLogoutButtons } from '/lib/auth-guard.js';

const BUCKET = 'letterheads';
const MAX_BYTES = 5 * 1024 * 1024;     // 5 MB (K-UI/X1: relaxed von 200 KB)
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/svg+xml'];
const MIME_TO_EXT = {
    'image/png':     'png',
    'image/jpeg':    'jpg',
    'image/svg+xml': 'svg'
};
const SIGNED_TTL = 3600;

const $ = (id) => document.getElementById(id);

let _user = null;
let _userRow = null;
let _isDirty = false;
let _uploadingType = null;             // {'logo'|'stempel'|'unterschrift'} während Upload

const TYPE_TO_FIELD = {
    logo: 'logo_url',
    stempel: 'stempel_url',
    unterschrift: 'unterschrift_url'
};

// ─── UI-Helpers ──────────────────────────────────────────────
function toast(kind, text, ms = 2400) {
    const el = $('toast');
    el.className = 'toast ' + kind;
    el.textContent = text;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, ms);
}

function setDirty(d) {
    _isDirty = d;
    $('dirty-ind').classList.toggle('visible', d);
    $('btn-save').disabled = !d;
}

function getVal(id) { return ($(id)?.value ?? '').trim(); }
function setVal(id, v) { const el = $(id); if (el) el.value = v ?? ''; }

// ─── Form ↔ Data ─────────────────────────────────────────────
function fillForm() {
    if (!_userRow) return;
    setVal('p-name',              _userRow.name);
    setVal('p-titel',             _userRow.titel);
    setVal('p-qualifikation',     _userRow.qualifikation);
    setVal('p-sachgebiet',        _userRow.sachgebiet);
    setVal('p-bestellungsstelle', _userRow.bestellungsstelle);
    setVal('p-anschrift',         _userRow.anschrift);
    const plz = _userRow.plz ?? '';
    const ort = _userRow.ort ?? '';
    setVal('p-plz-ort', (plz || ort) ? `${plz} ${ort}`.trim() : '');
    setVal('p-telefon', _userRow.telefon);
    setVal('p-mobil',   _userRow.mobil);

    const lh = _userRow.letterhead_config ?? {};
    setVal('p-bk-1',         lh.briefkopf_zeile_1);
    setVal('p-bk-2',         lh.briefkopf_zeile_2);
    setVal('p-bk-3',         lh.briefkopf_zeile_3);
    setVal('p-bank-inhaber', lh.bank_inhaber);
    setVal('p-bank-name',    lh.bank_name);
    setVal('p-iban',         lh.bank_iban);
    setVal('p-bic',          lh.bank_bic);
    setVal('p-ust-id',       lh.ust_id);
    setVal('p-steuernummer', lh.steuernummer);

    // Bilder-Previews
    refreshImagePreview('logo',         lh.logo_url);
    refreshImagePreview('stempel',      lh.stempel_url);
    refreshImagePreview('unterschrift', lh.unterschrift_url);

    setDirty(false);
}

function readForm() {
    const plzOrt = getVal('p-plz-ort');
    const [plz, ...ortParts] = plzOrt.split(/\s+/);
    return {
        users: {
            name:              getVal('p-name')              || null,
            titel:             getVal('p-titel')             || null,
            qualifikation:     getVal('p-qualifikation')     || null,
            sachgebiet:        getVal('p-sachgebiet')        || null,
            bestellungsstelle: getVal('p-bestellungsstelle') || null,
            anschrift:         getVal('p-anschrift')         || null,
            plz:               plz || null,
            ort:               ortParts.join(' ') || null,
            telefon:           getVal('p-telefon') || null,
            mobil:             getVal('p-mobil')   || null
        },
        letterhead: {
            briefkopf_zeile_1: getVal('p-bk-1') || null,
            briefkopf_zeile_2: getVal('p-bk-2') || null,
            briefkopf_zeile_3: getVal('p-bk-3') || null,
            bank_inhaber:      getVal('p-bank-inhaber') || null,
            bank_name:         getVal('p-bank-name')    || null,
            bank_iban:         getVal('p-iban')         || null,
            bank_bic:          getVal('p-bic')          || null,
            ust_id:            getVal('p-ust-id')       || null,
            steuernummer:      getVal('p-steuernummer') || null
            // logo_url/stempel_url/unterschrift_url werden separat
            // bei Upload gesetzt, NICHT vom Form überschrieben
        }
    };
}

// ─── Bilder ───────────────────────────────────────────────────
async function refreshImagePreview(type, storagePath) {
    const prev = $('prev-' + type);
    const fnEl = $('filename-' + type);
    const delBtn = $('btn-del-' + type);

    if (!storagePath) {
        prev.innerHTML = '<span>Kein ' + (type === 'logo' ? 'Logo' : type === 'stempel' ? 'Stempel' : 'Unterschrift') + '</span>';
        fnEl.textContent = '—';
        delBtn.disabled = true;
        return;
    }

    fnEl.textContent = storagePath.split('/').pop();
    delBtn.disabled = false;

    // Signed URL für Preview
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, SIGNED_TTL);
    if (error || !data?.signedUrl) {
        prev.innerHTML = '<span style="color:var(--danger)">Fehler</span>';
        return;
    }
    prev.innerHTML = `<img src="${data.signedUrl}" alt="${type}">`;
}

async function handleUpload(type, file) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
        toast('error', `Datei zu groß: ${(file.size/1024/1024).toFixed(2)} MB (max. 5 MB)`, 4000); return;
    }
    if (!ALLOWED_MIME.includes(file.type)) {
        toast('error', `Format "${file.type || 'unbekannt'}" nicht unterstützt — nur PNG, JPG oder SVG`, 4000); return;
    }

    _uploadingType = type;
    toast('info', 'Lade ' + type + ' hoch…', 8000);

    const ext = MIME_TO_EXT[file.type] || 'png';
    const path = `${_user.id}/${type}.${ext}`;

    // Old-File entfernen (idempotent — RLS erlaubt Delete eigener Files)
    const oldPath = (_userRow.letterhead_config ?? {})[TYPE_TO_FIELD[type]];
    if (oldPath && oldPath !== path) {
        try { await supabase.storage.from(BUCKET).remove([oldPath]); } catch { /* ignore */ }
    }

    // Upload mit Upsert (überschreibt bei gleichem Pfad)
    const { error: upErr } = await supabase.storage.from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });

    if (upErr) {
        toast('error', 'Upload fehlgeschlagen: ' + upErr.message, 4000);
        _uploadingType = null;
        return;
    }

    // letterhead_config-Field updaten
    const updatedLh = { ..._userRow.letterhead_config, [TYPE_TO_FIELD[type]]: path };
    const { error: dbErr } = await supabase.from('users')
        .update({ letterhead_config: updatedLh })
        .eq('id', _user.id);

    if (dbErr) {
        toast('error', 'DB-Update fehlgeschlagen: ' + dbErr.message, 4000);
        _uploadingType = null;
        return;
    }

    _userRow.letterhead_config = updatedLh;
    await refreshImagePreview(type, path);
    toast('success', type.charAt(0).toUpperCase() + type.slice(1) + ' gespeichert');
    _uploadingType = null;
}

// ─── Drag & Drop ───────────────────────────────────────────────
// K-UI/X1: jede Upload-Card wird zur Drop-Zone — Datei reinziehen ODER
// File-Picker. Visual Feedback: Border-Highlight beim dragover.
function bindDropZone(type) {
    // Wir nehmen die ganze .upload-card als Drop-Zone (Preview + Actions)
    const previewEl = $('prev-' + type);
    if (!previewEl) return;
    const card = previewEl.closest('.upload-card');
    if (!card) return;

    const onDragEnter = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (_uploadingType) return;
        card.classList.add('drag-over');
    };
    const onDragLeave = (e) => {
        e.preventDefault(); e.stopPropagation();
        // Nur wenn wirklich aus dem Element raus (relatedTarget noch innerhalb? -> ignore)
        if (e.relatedTarget && card.contains(e.relatedTarget)) return;
        card.classList.remove('drag-over');
    };
    const onDragOver = (e) => {
        e.preventDefault(); e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    };
    const onDrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        card.classList.remove('drag-over');
        if (_uploadingType) { toast('info', 'Bitte aktuellen Upload abwarten'); return; }
        const file = e.dataTransfer?.files?.[0];
        if (!file) return;
        handleUpload(type, file);
    };

    card.addEventListener('dragenter', onDragEnter);
    card.addEventListener('dragleave', onDragLeave);
    card.addEventListener('dragover',  onDragOver);
    card.addEventListener('drop',      onDrop);
}

async function handleDelete(type) {
    if (!confirm('Wirklich entfernen?')) return;
    const lh = _userRow.letterhead_config ?? {};
    const oldPath = lh[TYPE_TO_FIELD[type]];
    if (!oldPath) return;

    try { await supabase.storage.from(BUCKET).remove([oldPath]); } catch { /* ignore */ }

    const updatedLh = { ...lh };
    delete updatedLh[TYPE_TO_FIELD[type]];

    const { error } = await supabase.from('users')
        .update({ letterhead_config: updatedLh })
        .eq('id', _user.id);
    if (error) { toast('error', error.message); return; }

    _userRow.letterhead_config = updatedLh;
    await refreshImagePreview(type, null);
    toast('success', 'Entfernt');
}

// ─── Save / Reload ────────────────────────────────────────────
async function saveProfile() {
    const f = readForm();
    const btn = $('btn-save');
    btn.disabled = true; btn.textContent = 'Speichere…';

    // letterhead_config mit URL-Feldern aus Server-State mergen
    const lhMerged = {
        ..._userRow.letterhead_config,    // Bild-URLs aus Server bleiben
        ...f.letterhead                     // Form-Felder überschreiben Text-Felder
    };
    // null-Felder cleanen
    Object.keys(lhMerged).forEach(k => { if (lhMerged[k] === null) delete lhMerged[k]; });

    const update = { ...f.users, letterhead_config: lhMerged };
    const { error } = await supabase.from('users').update(update).eq('id', _user.id);

    btn.textContent = 'Speichern';
    if (error) {
        toast('error', 'Fehler: ' + error.message, 4000);
        btn.disabled = false;
        return;
    }
    Object.assign(_userRow, update);
    setDirty(false);
    toast('success', 'Profil gespeichert');
}

async function reload() {
    if (_isDirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
    const { data, error } = await supabase.from('users')
        .select('*').eq('id', _user.id).single();
    if (error) { toast('error', error.message); return; }
    _userRow = data;
    fillForm();
}

// ─── Init ─────────────────────────────────────────────────────
async function init() {
    try {
        await requireWorkspace();
    } catch (e) {
        console.error('Auth:', e);
        return;
    }

    _user = await getCurrentUser();
    if (!_user) { toast('error', 'Nicht eingeloggt'); return; }

    // Initialer Lade
    const { data, error } = await supabase.from('users')
        .select('*').eq('id', _user.id).maybeSingle();
    if (error) { toast('error', error.message, 5000); return; }
    if (!data) {
        // User-Row existiert nicht → neu anlegen
        const { data: created, error: insErr } = await supabase.from('users')
            .insert({ id: _user.id, email: _user.email })
            .select().single();
        if (insErr) { toast('error', 'User-Init: ' + insErr.message, 5000); return; }
        _userRow = created;
    } else {
        _userRow = data;
    }

    fillForm();

    // Dirty-Tracking auf Text-Inputs
    document.querySelectorAll('.profil-input, .profil-select, .profil-textarea').forEach(el => {
        el.addEventListener('input', () => setDirty(true));
    });

    // File-Inputs
    $('file-logo').addEventListener('change',         (e) => handleUpload('logo', e.target.files[0]));
    $('file-stempel').addEventListener('change',      (e) => handleUpload('stempel', e.target.files[0]));
    $('file-unterschrift').addEventListener('change', (e) => handleUpload('unterschrift', e.target.files[0]));

    // Drag&Drop fuer alle 3 Bild-Felder (K-UI/X1)
    bindDropZone('logo');
    bindDropZone('stempel');
    bindDropZone('unterschrift');

    $('btn-del-logo').addEventListener('click',         () => handleDelete('logo'));
    $('btn-del-stempel').addEventListener('click',      () => handleDelete('stempel'));
    $('btn-del-unterschrift').addEventListener('click', () => handleDelete('unterschrift'));

    $('btn-save').addEventListener('click',   saveProfile);
    $('btn-reload').addEventListener('click', reload);

    watchAuthState();
    bindLogoutButtons();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
