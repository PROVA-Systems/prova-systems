/**
 * PROVA — prova-sv-airtable.js
 * MEGA⁷⁵-F-Batch2 B10 (2026-05-14): Wrapper deaktiviert.
 *
 * Stub mit 4 window-Globals die Caller noch erwarten könnten:
 *   - provaProvisionSVAfterLogin
 *   - provaLoadSVProfilNachLogin
 *   - provaAfterIdentityLogin
 *   - provaSetOnboardingDone
 *
 * Diese 4 Funktionen sind seit MEGA⁴⁵/MEGA⁷⁵-A obsolet: SV-Provisionierung
 * läuft jetzt direkt im Login-Flow (app-login-logic.js → prova_workspace_id
 * + users-Row via auth.users-Trigger). onboarding via
 * users.onboarding_completed_at (siehe prova-context.provaMarkOnboardingDone).
 *
 * Hier nur No-Op-Stubs mit Deprecation-Warn damit nichts crasht.
 */
(function () {
  var _warned = false;
  function warn(name) {
    if (_warned) return;
    _warned = true;
    console.warn('[prova-sv-airtable] deprecated seit MEGA⁷⁵-A — Login-Flow erledigt SV-Setup direkt. Call:', name);
  }

  window.provaProvisionSVAfterLogin = async function (_identityUser) {
    warn('provaProvisionSVAfterLogin');
    return null;
  };

  window.provaLoadSVProfilNachLogin = async function (_email) {
    warn('provaLoadSVProfilNachLogin');
    return null;
  };

  window.provaAfterIdentityLogin = async function (_email, _identityUser) {
    warn('provaAfterIdentityLogin');
    return null;
  };

  window.provaSetOnboardingDone = async function () {
    warn('provaSetOnboardingDone');
    if (typeof window.provaMarkOnboardingDone === 'function') {
      return window.provaMarkOnboardingDone();
    }
    return { ok: false, grund: 'kein_helper' };
  };
})();
