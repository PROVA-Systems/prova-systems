/* ============================================================
   PROVA Dashboard 2FA-Empfehlungs-Banner (MEGA⁵²)

   Zeigt ein dezentes Banner für non-2FA-User auf dem Dashboard:
   "🔐 2FA aktivieren — Mandanten-Daten extra schützen"

   Pflicht für Admins (PROVA_ADMIN_EMAILS), Empfehlung für Solo/Team.
   Banner kann via X-Button für 7 Tage ausgeblendet werden.

   Pflicht-Pattern in HTML:
     <script src="lib/prova-config.js"></script>
     <script src="lib/edge-shim.js"></script>
     <script type="module" src="lib/dashboard-2fa-banner.js"></script>
   ============================================================ */
(async function () {
    'use strict';
    if (typeof document === 'undefined') return;

    // Skip falls bereits dismissed in den letzten 7 Tagen
    try {
        var dismissed = parseInt(localStorage.getItem('prova_2fa_banner_dismissed_until') || '0', 10);
        if (dismissed && dismissed > Date.now()) return;
    } catch (_) {}

    let supabase;
    try {
        const m = await import('/lib/supabase-client.js');
        supabase = m.supabase || (m.getSupabase && m.getSupabase());
        if (!supabase) return;
    } catch (e) {
        console.debug('[2fa-banner] supabase-client import failed:', e && e.message);
        return;
    }

    try {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const hasVerifiedTotp = (factors?.totp ?? []).some(f => f.status === 'verified');
        if (hasVerifiedTotp) return;  // 2FA aktiv → kein Banner

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Admin-Liste (vereinfacht client-side; echte Prüfung erfolgt server-side)
        const ADMIN_EMAILS = [
            'marcel.schreiber891@gmail.com',
            'marcel.schreiber@prova-systems.de',
            'marcel@prova-systems.de',
            'kontakt@prova-systems.de',
            'admin@prova-systems.de'
        ];
        const isAdmin = ADMIN_EMAILS.includes(String(user.email || '').toLowerCase());
        const severity = isAdmin ? 'critical' : 'recommended';

        injectBanner(severity);
    } catch (e) {
        console.debug('[2fa-banner] check failed:', e && e.message);
    }

    function injectBanner(severity) {
        const isCritical = severity === 'critical';
        const bg = isCritical ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#f59e0b,#d97706)';
        const text = isCritical
            ? '🔐 <strong>2FA-Pflicht für Admins</strong> — Bitte sofort aktivieren um Mandanten-Daten zu schützen.'
            : '🔐 <strong>2FA empfohlen</strong> — Schützt deine Mandanten-Daten gegen Passwort-Kompromittierung.';
        const banner = document.createElement('div');
        banner.id = 'prova-2fa-banner';
        banner.style.cssText = 'position:sticky;top:0;z-index:9000;background:' + bg + ';color:#fff;padding:10px 16px;font-size:13px;font-weight:500;display:flex;align-items:center;justify-content:space-between;gap:14px;box-shadow:0 2px 8px rgba(0,0,0,.15);';
        banner.innerHTML = ''
            + '<div style="flex:1;">' + text + '</div>'
            + '<a href="/setup-2fa.html" style="background:#fff;color:#1c2130;padding:6px 14px;border-radius:6px;text-decoration:none;font-weight:700;font-size:12px;white-space:nowrap;">Jetzt einrichten →</a>'
            + (isCritical ? '' : '<button type="button" id="prova-2fa-banner-dismiss" aria-label="Banner ausblenden" style="background:transparent;border:0;color:#fff;font-size:18px;cursor:pointer;padding:0 4px;">×</button>');
        if (document.body) document.body.insertBefore(banner, document.body.firstChild);
        const dismissBtn = document.getElementById('prova-2fa-banner-dismiss');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', function () {
                try {
                    localStorage.setItem('prova_2fa_banner_dismissed_until', String(Date.now() + 7 * 86400000));
                } catch (_) {}
                banner.remove();
            });
        }
    }
})();
