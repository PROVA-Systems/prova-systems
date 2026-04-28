/* ============================================================
   PROVA — onboarding-supabase-logic.js (ESM)
   Sprint K-1.3.A6

   Erst-Onboarding für User ohne Workspace.
   - Voraussetzung: User ist eingeloggt (sonst Redirect zu Login)
   - Wenn User schon Workspace hat: Redirect zu /index.html

   Schreibt:
     1. workspaces (name, typ, abo_tier, briefkopf JSONB)
     2. workspace_memberships (rolle='owner', is_active=true)
     3. users (Profile-Update mit name, anschrift, etc.)
     4. onboarding_progress (Initial-Row)

   ⚠️ RLS-Hinweis: workspaces-Insert kann von User-RLS-Policy blockiert
      werden. Falls 403/permission denied: SECURITY DEFINER RPC
      `create_workspace_for_user()` als K-2 Fix (oder neue Edge Function
      `onboarding-create-workspace`).
   ============================================================ */

import { supabase, getCurrentUser, setActiveWorkspaceId } from '/lib/supabase-client.js';
import { runAuthGuard } from '/lib/auth-guard.js';

const $ = (id) => document.getElementById(id);
let _selectedTier = 'solo';
let _user = null;

function showMsg(kind, text) {
    const el = $('msg');
    el.className = 'msg ' + kind;
    el.textContent = text;
    el.hidden = false;
}

async function checkExistingWorkspace() {
    const { data } = await supabase
        .from('workspace_memberships')
        .select('workspace_id')
        .eq('user_id', _user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
    return !!data;
}

async function init() {
    // Auth-Guard: muss eingeloggt sein
    await runAuthGuard();
    _user = await getCurrentUser();
    if (!_user) return;

    // Wenn schon Workspace: weiter zu Cockpit
    if (await checkExistingWorkspace()) {
        window.location.href = '/index.html?source=onboarding-skip';
        return;
    }

    // Pre-fill Email-Name (best-effort)
    const emailName = _user.email?.split('@')[0]?.replace(/[._-]/g, ' ');
    if (emailName) $('name').value = capitalizeWords(emailName);

    // Tier-Picker
    document.querySelectorAll('.tier-card').forEach((card) => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.tier-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            _selectedTier = card.dataset.tier;
        });
    });

    $('btn-next-1').addEventListener('click', () => {
        if (!$('name').value.trim()) { alert('Name ist Pflichtfeld'); return; }
        $('step-1').classList.remove('active');
        $('step-2').classList.add('active');
    });
    $('btn-back-2').addEventListener('click', () => {
        $('step-2').classList.remove('active');
        $('step-1').classList.add('active');
    });
    $('btn-finish').addEventListener('click', handleFinish);
}

function capitalizeWords(s) {
    return s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

async function handleFinish() {
    const btn = $('btn-finish');
    btn.disabled = true;
    btn.textContent = 'Erstelle…';

    const name = $('name').value.trim();
    const kanzlei = $('kanzlei').value.trim();
    const ihk = $('ihk').value.trim();
    const anschrift = $('anschrift').value.trim();
    const plzOrt = $('plz').value.trim();
    const telefon = $('telefon').value.trim();
    const [plz, ...ortParts] = plzOrt.split(/\s+/);
    const ort = ortParts.join(' ');

    const briefkopf = {
        kanzlei_name: kanzlei || name,
        anschrift, plz, ort, telefon,
        email: _user.email,
        ihk_kammer: ihk
    };

    try {
        // 1. workspace
        const trialEndet = new Date(Date.now() + 14 * 86400000).toISOString();
        const { data: ws, error: wsErr } = await supabase
            .from('workspaces')
            .insert({
                typ: _selectedTier,
                name: kanzlei || `${name} – Sachverständigenbüro`,
                briefkopf,
                abo_tier: _selectedTier,
                abo_status: 'trial',
                abo_trial_endet_am: trialEndet
            })
            .select('id')
            .single();

        if (wsErr) {
            const hint = wsErr.message.includes('permission') || wsErr.code === '42501'
                ? '\n\nHinweis: RLS blockiert Workspace-Erstellung. Marcel muss eine SECURITY DEFINER RPC create_workspace_for_user() anlegen ODER eine Edge Function onboarding-create-workspace nachschieben.'
                : '';
            showMsg('error', `Workspace-Fehler: ${wsErr.message}${hint}`);
            btn.disabled = false; btn.textContent = 'Workspace anlegen';
            return;
        }

        // 2. workspace_memberships (User wird Owner)
        const { error: memErr } = await supabase
            .from('workspace_memberships')
            .insert({
                workspace_id: ws.id,
                user_id: _user.id,
                rolle: 'owner',
                can_invite_members: true,
                can_manage_billing: true,
                can_export_data: true,
                can_delete_records: true,
                invited_at: new Date().toISOString(),
                accepted_at: new Date().toISOString(),
                is_active: true
            });
        if (memErr) {
            showMsg('error', `Membership-Fehler: ${memErr.message}`);
            btn.disabled = false; btn.textContent = 'Workspace anlegen';
            return;
        }

        // 3. users-Profile aktualisieren (best-effort, keine Pflichtfelder)
        await supabase.from('users').update({
            name, anschrift, plz, ort, telefon,
            bestellungsstelle: ihk
        }).eq('id', _user.id);

        // 4. onboarding_progress initial
        await supabase.from('onboarding_progress').insert({
            user_id: _user.id,
            workspace_id: ws.id,
            schritt_1_profil_komplett_at: new Date().toISOString()
        }).select().maybeSingle();

        // 5. Cache + Redirect
        setActiveWorkspaceId(ws.id);
        showMsg('info', '✓ Workspace angelegt. Weiterleitung…');
        setTimeout(() => { window.location.href = '/index.html?source=onboarding-done'; }, 800);

    } catch (e) {
        console.error('onboarding:', e);
        showMsg('error', 'Unerwarteter Fehler: ' + e.message);
        btn.disabled = false; btn.textContent = 'Workspace anlegen';
    }
}

init();
