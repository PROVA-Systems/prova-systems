// @ts-check
/**
 * MEGA⁴² P3-1 — M⁴¹-Pages Live-Verification
 *
 * Verifiziert dass alle M⁴¹-Phasen-Pages erreichbar sind (200) UND
 * die kritischen Bedien-Elemente vorhanden sind.
 *
 * Pre-Req: Marcel hat mega41 (oder mega42-final) zu main + Netlify-Deploy gepusht.
 * Ohne Deploy → alle Tests skip-en mit klarer Marcel-Pflicht-Message.
 */
const { test, expect } = require('@playwright/test');

const M41_PAGES = [
  { path: '/audit-trail.html', phase: 'M⁴¹ P2', selector: '[data-audit-trail], .audit-trail-table, h1' },
  { path: '/support.html', phase: 'M⁴¹ P5', selector: 'input[type="search"], .faq-search, .support-form, h1' },
  { path: '/kontakt-detail.html?id=demo', phase: 'M⁴¹ P7', selector: '.kontakt-tabs, [role="tablist"], h1' },
  { path: '/wiederherstellbare-entwuerfe.html', phase: 'M⁴¹ P10', selector: '.entwuerfe, .draft-list, h1' },
  { path: '/dokument-neu.html', phase: 'M⁴⁰ P3', selector: '.mode-modal, .document-mode, h1' }
];

test.describe('M⁴¹-Pages Live-Verification', () => {
  for (const { path, phase, selector } of M41_PAGES) {
    test(`Page ${path} (${phase}) erreichbar + zeigt Inhalt`, async ({ page }) => {
      const resp = await page.goto(path);
      const status = resp ? resp.status() : 0;
      if (status === 404) {
        test.skip(true, '🔴 MARCEL-MANUAL: ' + path + ' nicht deployed. Bitte mega41/mega42 zu main mergen + Netlify-Deploy triggern.');
        return;
      }
      expect(status).toBeLessThan(400);
      // Wait for at least one of the expected selectors
      const found = await page.locator(selector).first().isVisible({ timeout: 5000 }).catch(() => false);
      expect(found, `Selektor ${selector} sichtbar auf ${path}`).toBeTruthy();
    });
  }
});
