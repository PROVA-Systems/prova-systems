/**
 * PROVA Native-Share-API-Wrapper
 * MEGA¹⁴ W24 (Tier 1, 2026-05-06)
 *
 * Wrapper um Web-Share-API mit Clipboard-Fallback.
 *
 * USAGE:
 *   await ProvaShare.share({
 *     title: 'Gutachten SCH-2026-0089',
 *     text: 'Hier mein aktuelles Gutachten zum Wasserschaden.',
 *     url: 'https://app.prova-systems.de/akte/SCH-2026-0089'
 *   });
 *
 *   await ProvaShare.shareFiles({ files: [pdfFile], title: '...' });
 *
 *   ProvaShare.canShare()       // true wenn navigator.share() supported
 *   ProvaShare.canShareFiles()  // true wenn navigator.canShare({files:...}) ok
 *
 * Anti-Pattern vermieden:
 *   - User-Aktivierung-Pflicht beachtet (share() nur in click/touch-Handler)
 *   - Clipboard-Fallback wenn Web-Share-API nicht da
 *   - aria-live Toast bei Erfolg/Fehler
 *   - Cancel-by-User wird NICHT als Error gewertet
 */
'use strict';

(function () {

  function canShare() {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  }

  function canShareFiles() {
    return canShare() && typeof navigator.canShare === 'function';
  }

  /**
   * Share via Web-Share-API mit Clipboard-Fallback.
   *
   * @param {object} data { title?, text?, url? }
   * @returns {Promise<{shared: boolean, method: 'share'|'clipboard'|'cancelled'}>}
   */
  async function share(data) {
    data = data || {};
    if (!data.url && !data.text && !data.title) {
      console.warn('[ProvaShare] no data to share');
      return { shared: false, method: 'noop' };
    }

    if (canShare()) {
      try {
        await navigator.share({
          title: data.title || '',
          text: data.text || '',
          url: data.url || ''
        });
        _toastSuccess('Geteilt');
        return { shared: true, method: 'share' };
      } catch (e) {
        // AbortError = User cancelled — nicht als Fehler werten
        if (e.name === 'AbortError' || /abort|cancel/i.test(e.message || '')) {
          return { shared: false, method: 'cancelled' };
        }
        // Sonst: Clipboard-Fallback
        console.warn('[ProvaShare] share() failed, fallback to clipboard:', e.message);
      }
    }

    // Clipboard-Fallback
    return _clipboardFallback(data);
  }

  /**
   * Share Files via Web-Share-API.
   *
   * @param {object} opts { files: File[], title?, text? }
   * @returns {Promise<{shared, method}>}
   */
  async function shareFiles(opts) {
    opts = opts || {};
    if (!opts.files || !opts.files.length) {
      return { shared: false, method: 'noop' };
    }

    if (!canShareFiles()) {
      // Fallback: Download oder Toast-Hint
      _toastInfo('Datei-Sharing wird vom Browser nicht unterstuetzt');
      return { shared: false, method: 'unsupported' };
    }

    const data = { title: opts.title || '', text: opts.text || '', files: opts.files };
    if (!navigator.canShare(data)) {
      _toastInfo('Diese Dateien koennen nicht geteilt werden');
      return { shared: false, method: 'unsupported' };
    }

    try {
      await navigator.share(data);
      _toastSuccess('Dateien geteilt');
      return { shared: true, method: 'share' };
    } catch (e) {
      if (e.name === 'AbortError') {
        return { shared: false, method: 'cancelled' };
      }
      _toastError('Teilen fehlgeschlagen: ' + (e.message || ''));
      return { shared: false, method: 'error' };
    }
  }

  async function _clipboardFallback(data) {
    const text = [data.title, data.text, data.url].filter(Boolean).join('\n');
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      _toastError('Browser unterstuetzt weder Sharing noch Clipboard');
      return { shared: false, method: 'unsupported' };
    }
    try {
      await navigator.clipboard.writeText(text);
      _toastSuccess('In Zwischenablage kopiert');
      return { shared: true, method: 'clipboard' };
    } catch (e) {
      _toastError('Clipboard-Zugriff abgelehnt');
      return { shared: false, method: 'error' };
    }
  }

  // Toast-Helpers — nutzen prova-alert wenn verfuegbar, sonst Console
  function _toastSuccess(msg) {
    if (window.provaAlert) window.provaAlert(msg, 'success');
    else if (window.ProvaUI && window.ProvaUI.toast) window.ProvaUI.toast(msg, 'success');
    else console.log('[ProvaShare] ' + msg);
  }
  function _toastInfo(msg) {
    if (window.provaAlert) window.provaAlert(msg, 'info');
    else console.log('[ProvaShare] ' + msg);
  }
  function _toastError(msg) {
    if (window.provaAlert) window.provaAlert(msg, 'error');
    else console.warn('[ProvaShare] ' + msg);
  }

  window.ProvaShare = {
    share: share,
    shareFiles: shareFiles,
    canShare: canShare,
    canShareFiles: canShareFiles
  };
})();
