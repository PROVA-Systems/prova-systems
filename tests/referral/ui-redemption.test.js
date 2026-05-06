/**
 * PROVA — referral-ui.js + referral-redemption.js Tests (MEGA²⁷)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const UI = require(path.join(ROOT, 'lib', 'referral-ui.js'));
const Redemption = require(path.join(ROOT, 'lib', 'referral-redemption.js'));

describe('referral-ui — renderCard', () => {
  test('Founding-Member-Karte mit aktiviertem Button', () => {
    const html = UI.renderCard({ stats: { total_rewarded: 0 }, isFoundingMember: true });
    assert.match(html, /Empfehlen lohnt sich/);
    assert.match(html, /Kollegen einladen/);
    assert.doesNotMatch(html, /disabled aria-disabled/);
  });

  test('Non-Founding: Button disabled', () => {
    const html = UI.renderCard({ stats: {}, isFoundingMember: false });
    assert.match(html, /disabled aria-disabled/);
    assert.match(html, /Founding-Members/);
  });

  test('Counter zeigt 5/12 bei 5 active', () => {
    const html = UI.renderCard({ stats: { total_active: 5 }, isFoundingMember: true });
    assert.match(html, /5 \/ 12/);
  });

  test('Progress-Bar mit ARIA-Attributen', () => {
    const html = UI.renderCard({ stats: { total_active: 6 }, isFoundingMember: true });
    assert.match(html, /role="progressbar"/);
    assert.match(html, /aria-valuemax="100"/);
  });

  test('Touch-Target ≥44px', () => {
    const html = UI.renderCard({ isFoundingMember: true });
    assert.match(html, /min-height:44px/);
  });
});

describe('referral-ui — buildCreateModalHtml', () => {
  test('Modal-Form mit Email + Message Inputs', () => {
    const html = UI.buildCreateModalHtml({});
    assert.match(html, /name="email"/);
    assert.match(html, /name="message"/);
    assert.match(html, /required/);
  });

  test('Maxlength 500 für message', () => {
    const html = UI.buildCreateModalHtml({});
    assert.match(html, /maxlength="500"/);
  });

  test('Hinweise: 1 Monat gratis + 50€ Rabatt', () => {
    const html = UI.buildCreateModalHtml({});
    assert.match(html, /1 Monat gratis/);
    assert.match(html, /50 € Rabatt/);
  });

  test('Reward-Hold-Hinweis 30 Tage', () => {
    const html = UI.buildCreateModalHtml({});
    assert.match(html, /30 Tagen/);
  });

  test('Counter zeigt Verbleibende', () => {
    const html = UI.buildCreateModalHtml({ stats: { total_active: 4 } });
    assert.match(html, /4 \/ 12/);
    assert.match(html, /8 verbleibend/);
  });

  test('Submit + Cancel Buttons', () => {
    const html = UI.buildCreateModalHtml({});
    assert.match(html, /class="prova-referral-submit"/);
    assert.match(html, /class="prova-referral-cancel"/);
  });
});

describe('referral-ui — buildHistoryModalHtml', () => {
  test('Empty-State bei 0 Items', () => {
    const html = UI.buildHistoryModalHtml({ items: [] });
    assert.match(html, /Noch keine Empfehlungen/);
  });

  test('Tabelle mit 3 Spalten (Email/Datum/Status)', () => {
    const html = UI.buildHistoryModalHtml({ items: [] });
    assert.match(html, /Email/);
    assert.match(html, /Datum/);
    assert.match(html, /Status/);
  });

  test('Items werden gerendert', () => {
    const html = UI.buildHistoryModalHtml({
      items: [
        { referred_email: 'lisa@x.de', created_at: '2026-05-01T10:00:00Z', status: 'rewarded' },
        { referred_email: 'peter@y.de', created_at: '2026-05-02T10:00:00Z', status: 'pending' }
      ]
    });
    assert.match(html, /lisa@x\.de/);
    assert.match(html, /peter@y\.de/);
  });

  test('Total-Stats werden angezeigt', () => {
    const html = UI.buildHistoryModalHtml({
      items: [],
      stats: { total_active: 2, total_rewarded: 3 }
    });
    assert.match(html, /5/);
    assert.match(html, /3/);
    assert.match(html, /297 € Wert/);
  });

  test('XSS-Schutz bei Email', () => {
    const html = UI.buildHistoryModalHtml({
      items: [{ referred_email: '<script>x</script>', created_at: '2026-05-01', status: 'pending' }]
    });
    assert.doesNotMatch(html, /<script>x<\/script>/);
  });
});

describe('referral-redemption — detectCodeFromUrl', () => {
  test('Path-Pattern /r/CODE', () => {
    const r = Redemption.detectCodeFromUrl('https://prova-systems.de/r/PROVA-FRIEND-HM-A7B3K2');
    assert.equal(r.found, true);
    assert.equal(r.code, 'PROVA-FRIEND-HM-A7B3K2');
    assert.equal(r.source, 'path');
  });

  test('Path mit Query-Suffix', () => {
    const r = Redemption.detectCodeFromUrl('https://prova-systems.de/r/PROVA-FRIEND-HM-A7B3K2?utm=email');
    assert.equal(r.found, true);
    assert.equal(r.code, 'PROVA-FRIEND-HM-A7B3K2');
  });

  test('Query-Pattern ?ref=CODE', () => {
    const r = Redemption.detectCodeFromUrl('https://prova-systems.de/pricing?ref=PROVA-FRIEND-HM-A7B3K2');
    assert.equal(r.found, true);
    assert.equal(r.code, 'PROVA-FRIEND-HM-A7B3K2');
    assert.equal(r.source, 'query');
  });

  test('Query-Pattern ?code=CODE', () => {
    const r = Redemption.detectCodeFromUrl('https://prova-systems.de/pricing?code=PROVA-FRIEND-HM-A7B3K2');
    assert.equal(r.found, true);
  });

  test('Lowercase-Code wird auf Uppercase normalisiert', () => {
    const r = Redemption.detectCodeFromUrl('https://prova-systems.de/r/prova-friend-hm-a7b3k2');
    assert.equal(r.found, true);
    assert.equal(r.code, 'PROVA-FRIEND-HM-A7B3K2');
  });

  test('Kein Code → found:false', () => {
    assert.equal(Redemption.detectCodeFromUrl('https://prova-systems.de/').found, false);
    assert.equal(Redemption.detectCodeFromUrl('').found, false);
    assert.equal(Redemption.detectCodeFromUrl(null).found, false);
  });

  test('Invalides Format → found:false', () => {
    assert.equal(Redemption.detectCodeFromUrl('https://prova-systems.de/r/NOT-A-CODE').found, false);
    assert.equal(Redemption.detectCodeFromUrl('https://prova-systems.de/r/PROVA-FOO-XX-YYYYYY').found, false);
  });
});

describe('referral-redemption — renderBanner', () => {
  test('Valid-Banner mit Werber + Discount + Code', () => {
    const html = Redemption.renderBanner({
      valid: true, referrer_name: 'Hans Mueller', discount_amount: 50,
      code: 'PROVA-FRIEND-HM-A7B3K2', expires_in_hours: 144
    });
    assert.match(html, /Hans Mueller hat dich empfohlen/);
    assert.match(html, /50 € Rabatt/);
    assert.match(html, /PROVA-FRIEND-HM-A7B3K2/);
    assert.match(html, /6 Tage/);
  });

  test('XSS-Schutz auf referrer_name', () => {
    const html = Redemption.renderBanner({
      valid: true, referrer_name: '<script>x</script>', discount_amount: 50,
      code: 'PROVA-FRIEND-HM-A7B3K2', expires_in_hours: 24
    });
    assert.doesNotMatch(html, /<script>x<\/script>/);
  });

  test('Invalid-Banner mit Error', () => {
    const html = Redemption.renderBanner({ valid: false, error: 'Code abgelaufen' });
    assert.match(html, /Code abgelaufen/);
    assert.match(html, /role="alert"/);
  });

  test('Copy-Button mit data-code attribut', () => {
    const html = Redemption.renderBanner({
      valid: true, referrer_name: 'X', discount_amount: 50,
      code: 'PROVA-FRIEND-XX-AAAAAA', expires_in_hours: 100
    });
    assert.match(html, /data-code="PROVA-FRIEND-XX-AAAAAA"/);
  });

  test('Hours-Format bei < 24h', () => {
    const html = Redemption.renderBanner({
      valid: true, referrer_name: 'X', discount_amount: 50,
      code: 'PROVA-FRIEND-XX-AAAAAA', expires_in_hours: 12
    });
    assert.match(html, /12 Stunden/);
  });
});

describe('referral-redemption — validate (mit fetchImpl-Mock)', () => {
  test('returnt invalid bei missing Code', async () => {
    const r = await Redemption.validate('', () => Promise.reject('not-called'));
    assert.equal(r.valid, false);
    assert.match(r.error, /ungueltig/);
  });

  test('returnt invalid bei format-error', async () => {
    const r = await Redemption.validate('NOT-A-CODE', () => Promise.reject('not-called'));
    assert.equal(r.valid, false);
  });

  test('rufft fetch mit GET-URL korrekt', async () => {
    let calledWith = null;
    const fakeFetch = (url) => { calledWith = url; return Promise.resolve({ json: () => Promise.resolve({ valid: true }) }); };
    await Redemption.validate('PROVA-FRIEND-XX-AAAAAA', fakeFetch);
    assert.match(calledWith, /redeem-referral-code\?code=PROVA-FRIEND-XX-AAAAAA/);
  });
});
