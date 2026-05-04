/**
 * PROVA — Welcome-Wizard 4-Step Tests (MEGA²⁰ W87)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const WIZARD = fs.readFileSync(path.join(ROOT, 'lib', 'welcome-wizard.js'), 'utf8');
const DEMO_AKTE = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'create-demo-akte.js'), 'utf8');
const DASHBOARD = fs.readFileSync(path.join(ROOT, 'dashboard.html'), 'utf8');

describe('welcome-wizard.js — Public API', () => {
  test('window.ProvaWelcomeWizard exposed', () => {
    assert.match(WIZARD, /window\.ProvaWelcomeWizard\s*=/);
    assert.match(WIZARD, /maybeShow:\s*maybeShow/);
    assert.match(WIZARD, /forceShow:\s*forceShow/);
    assert.match(WIZARD, /isDone:\s*isDone/);
  });

  test('STORAGE_KEY = prova_welcome_wizard_done (separate von Mode-Wizard)', () => {
    assert.match(WIZARD, /['"]prova_welcome_wizard_done['"]/);
  });

  test('STEPS Array: persona, mode, tour, demo', () => {
    assert.match(WIZARD, /STEPS\s*=\s*\['persona',\s*'mode',\s*'tour',\s*'demo'\]/);
  });
});

describe('welcome-wizard.js — DB-Trigger via existing fetchSettings', () => {
  test('ProvaWorkflowMode.fetchSettings genutzt', () => {
    assert.match(WIZARD, /window\.ProvaWorkflowMode\.fetchSettings/);
  });

  test('_fallback-Defense (defensive skip bei API-Outage)', () => {
    assert.match(WIZARD, /settings\._fallback/);
    assert.match(WIZARD, /defensive skip bei API-Outage/);
  });

  test('welcome_wizard_completed-Check', () => {
    assert.match(WIZARD, /settings\.welcome_wizard_completed === true/);
  });

  test('URL-Param ?welcome=force', () => {
    assert.match(WIZARD, /params\.get\(['"]welcome['"]\) === ['"]force['"]/);
  });
});

describe('welcome-wizard.js — A11y (Esc + Click-outside + Focus-Trap + Backdrop-Blur)', () => {
  test('Backdrop-Blur 6px', () => {
    assert.match(WIZARD, /backdrop-filter:blur\(6px\)/);
  });

  test('Animations: provaWwFadeIn + provaWwScaleIn', () => {
    assert.match(WIZARD, /provaWwFadeIn/);
    assert.match(WIZARD, /provaWwScaleIn/);
  });

  test('Esc-Key-Handler', () => {
    assert.match(WIZARD, /ev\.key === ['"]Escape['"]/);
    assert.match(WIZARD, /document\.addEventListener\(['"]keydown['"], escHandler\)/);
  });

  test('Click-outside auf Backdrop', () => {
    assert.match(WIZARD, /ev\.target === overlay/);
  });

  test('ARIA: role=dialog + aria-modal + aria-labelledby', () => {
    assert.match(WIZARD, /setAttribute\(['"]role['"],\s*['"]dialog['"]\)/);
    assert.match(WIZARD, /setAttribute\(['"]aria-modal['"],\s*['"]true['"]\)/);
    assert.match(WIZARD, /setAttribute\(['"]aria-labelledby['"],\s*['"]prova-ww-title['"]\)/);
  });

  test('Mobile-responsive @media 540px', () => {
    assert.match(WIZARD, /@media \(max-width:540px\)/);
  });

  test('_closeOverlay mit Cleanup + Fade-Out', () => {
    assert.match(WIZARD, /function _closeOverlay/);
    assert.match(WIZARD, /opacity 0\.2s ease-out/);
  });
});

describe('welcome-wizard.js — Step 1 PERSONA', () => {
  test('3 Buero-Groesse-Cards (solo/small/large)', () => {
    assert.match(WIZARD, /data-size="solo"/);
    assert.match(WIZARD, /data-size="small"/);
    assert.match(WIZARD, /data-size="large"/);
  });

  test('4 Auftragsarten-Checkboxes', () => {
    ['schadensgutachten', 'wertgutachten', 'beratung', 'baubegleitung'].forEach(t => {
      assert.match(WIZARD, new RegExp("_renderTypeCb\\(['\"]" + t + "['\"]"), 'missing typ: ' + t);
    });
  });

  test('Volume-Slider 1-50', () => {
    assert.match(WIZARD, /min="1" max="50"/);
  });

  test('Persona-Save via PATCH /user-workflow-settings', () => {
    assert.match(WIZARD, /persona_size:\s*_state\.persona_size/);
    assert.match(WIZARD, /persona_types:\s*_state\.persona_types/);
    assert.match(WIZARD, /persona_volume:\s*_state\.persona_volume/);
  });
});

describe('welcome-wizard.js — Step 2 MODE (Triple-Mode)', () => {
  test('3 Mode-Cards (A/B/C)', () => {
    ['"A"', '"B"', '"C"'].forEach(m => {
      assert.match(WIZARD, new RegExp('data-mode=' + m));
    });
  });

  test('Mode A als EMPFOHLEN markiert', () => {
    assert.match(WIZARD, /EMPFOHLEN/);
  });

  test('Mode C als MIGRATION markiert', () => {
    assert.match(WIZARD, /MIGRATION/);
  });

  test('Mode-Save via existing ProvaWorkflowMode.updateDefault', () => {
    assert.match(WIZARD, /ProvaWorkflowMode\.updateDefault\(_state\.selected_mode\)/);
  });
});

describe('welcome-wizard.js — Step 3 TOUR', () => {
  test('Tour startet existing onboarding-tour.js', () => {
    assert.match(WIZARD, /onboarding-tour\.js/);
  });

  test('Tour-Trigger setzt prova_tour_done zurueck', () => {
    assert.match(WIZARD, /removeItem\(['"]prova_tour_done['"]\)/);
  });

  test('Tour-Lib lazy geladen falls noch nicht vorhanden', () => {
    assert.match(WIZARD, /script\[src\*="onboarding-tour\.js"\]/);
    assert.match(WIZARD, /document\.body\.appendChild\(newScript\)/);
  });
});

describe('welcome-wizard.js — Step 4 DEMO-AKTE (Marcel-Decision D2)', () => {
  test('POST create-demo-akte', () => {
    assert.match(WIZARD, /\/\.netlify\/functions\/create-demo-akte/);
  });

  test('Toast nach Erfolg "🎭 Demo-Akte erstellt"', () => {
    assert.match(WIZARD, /🎭 Demo-Akte erstellt/);
  });
});

describe('welcome-wizard.js — Persistenz welcome_wizard_completed', () => {
  test('_persistCompletion via PATCH user-workflow-settings', () => {
    assert.match(WIZARD, /async function _persistCompletion/);
    assert.match(WIZARD, /welcome_wizard_completed:\s*!!completed/);
  });

  test('Best-Effort: console.warn bei Fail, kein Block', () => {
    assert.match(WIZARD, /completion-save failed/);
  });
});

describe('welcome-wizard.js — Step-Navigation', () => {
  test('Step-Indicator "Schritt X von 4"', () => {
    assert.match(WIZARD, /'Schritt ' \+ \(_state\.currentStep \+ 1\) \+ ' von 4'/);
  });

  test('Step-Dots-Visualisierung (active/done)', () => {
    assert.match(WIZARD, /\.ww-step-dot\.active/);
    assert.match(WIZARD, /\.ww-step-dot\.done/);
  });

  test('Zurueck-Button wird ab Step 2 sichtbar', () => {
    assert.match(WIZARD, /backBtn\.style\.display = _state\.currentStep > 0/);
  });

  test('Weiter→ wird zu Fertig✓ in Step 4', () => {
    assert.match(WIZARD, /'Fertig ✓'/);
  });

  test('_validateNext disabled bei unvollstaendiger Persona', () => {
    assert.match(WIZARD, /!!_state\.persona_size && _state\.persona_types\.length > 0/);
  });

  test('_validateNext disabled bei keiner Mode-Wahl', () => {
    assert.match(WIZARD, /step === 'mode'[\s\S]{0,100}!!_state\.selected_mode/);
  });
});

describe('create-demo-akte.js — Marcel-Decision D2', () => {
  test('is_template=TRUE als Demo-Marker (existing column)', () => {
    assert.match(DEMO_AKTE, /is_template:\s*true/);
  });

  test('tags enthalten "demo" + "onboarding-wizard"', () => {
    assert.match(DEMO_AKTE, /tags:\s*\['demo',\s*'onboarding-wizard'\]/);
  });

  test('Idempotenz: existing Demo-Akte zurueckgeben', () => {
    assert.match(DEMO_AKTE, /\.contains\(['"]tags['"], \['demo'\]\)/);
    assert.match(DEMO_AKTE, /existing: true/);
  });

  test('POST-only Method', () => {
    assert.match(DEMO_AKTE, /event\.httpMethod !== ['"]POST['"]/);
  });

  test('Workspace-Lookup via existing memberships', () => {
    assert.match(DEMO_AKTE, /\.from\(['"]workspace_memberships['"]\)/);
    assert.match(DEMO_AKTE, /\.eq\(['"]is_active['"],\s*true\)/);
  });

  test('Beispiel-Daten: Feuchteschaden Demo', () => {
    assert.match(DEMO_AKTE, /Feuchteschaden/);
    assert.match(DEMO_AKTE, /🎭 Demo-Akte/);
  });

  test('Audit-Log fire-and-forget', () => {
    assert.match(DEMO_AKTE, /audit_trail/);
    assert.match(DEMO_AKTE, /demo\.akte\.created/);
  });
});

describe('dashboard.html — welcome-wizard.js eingebunden', () => {
  test('Script-Tag mit defer', () => {
    assert.match(DASHBOARD, /<script src="\/lib\/welcome-wizard\.js" defer><\/script>/);
  });

  test('Nach onboarding-trigger.js (Reihenfolge)', () => {
    const triggerIdx = DASHBOARD.indexOf('onboarding-trigger.js');
    const wizardIdx = DASHBOARD.indexOf('welcome-wizard.js');
    assert.ok(triggerIdx > 0);
    assert.ok(wizardIdx > triggerIdx);
  });
});
