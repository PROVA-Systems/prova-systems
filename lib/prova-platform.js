/**
 * MEGA62 Phase 0 Item 0.11 — ProvaPlatform
 * Datum: 2026-05-12
 *
 * Plattform-Awareness-Library: ⌘ vs Ctrl etc. plattform-aware.
 * Wird in ALLEN UI-Shortcuts genutzt.
 *
 * Usage:
 *   <script src="/lib/prova-platform.js"></script>
 *   ProvaPlatform.keys.mod          // '⌘' auf macOS, 'Ctrl' sonst
 *   ProvaPlatform.fmt('S', {mod:true})        // '⌘S' oder 'Ctrl+S'
 *   ProvaPlatform.kbd('S', {mod:true})        // '<kbd aria-label="Befehlstaste plus S">⌘S</kbd>'
 *   ProvaPlatform.isModPressed(event)         // true bei Cmd (Mac) ODER Ctrl (Win/Linux)
 */
'use strict';

(function (global) {
    var nav = typeof navigator !== 'undefined' ? navigator : null;
    var platformString = '';
    if (nav) {
        if (nav.userAgentData && typeof nav.userAgentData.platform === 'string') {
            platformString = nav.userAgentData.platform;
        } else if (typeof nav.platform === 'string') {
            platformString = nav.platform;
        }
    }
    var ua = (nav && typeof nav.userAgent === 'string') ? nav.userAgent : '';

    var _isMac = /Mac|iPhone|iPad|iPod/i.test(platformString);
    var _isWin = /Win/i.test(platformString);
    var _isLinux = /Linux/i.test(platformString) && !/Android/i.test(ua);
    var _isTouch = typeof window !== 'undefined' && (
        ('ontouchstart' in window) ||
        (nav && typeof nav.maxTouchPoints === 'number' && nav.maxTouchPoints > 0)
    );
    var _hasKeyboard = !_isTouch || (nav && typeof nav.maxTouchPoints === 'number' && nav.maxTouchPoints === 0);

    var ProvaPlatform = {
        isMac: _isMac,
        isWindows: _isWin,
        isLinux: _isLinux,
        isTouch: _isTouch,
        hasKeyboard: _hasKeyboard,

        keys: {
            mod:       _isMac ? '⌘' : 'Ctrl',
            alt:       _isMac ? '⌥' : 'Alt',
            shift:     _isMac ? '⇧' : 'Shift',
            ctrl:      _isMac ? '⌃' : 'Ctrl',
            enter:     _isMac ? '↩' : 'Enter',
            esc:       _isMac ? 'esc' : 'Esc',
            tab:       _isMac ? '⇥' : 'Tab',
            backspace: _isMac ? '⌫' : 'Backspace'
        },

        /**
         * Prueft ob Mod-Taste gedrueckt ist (Cmd auf Mac, Ctrl sonst).
         */
        isModPressed: function (event) {
            if (!event) return false;
            return _isMac ? !!event.metaKey : !!event.ctrlKey;
        },

        /**
         * Formatiert Shortcut-String. Reihenfolge: Mod, Alt, Shift, Key.
         * Mac: ohne Separator ("⌘⇧S"), sonst mit "+": "Ctrl+Shift+S".
         */
        fmt: function (key, opts) {
            opts = opts || {};
            var parts = [];
            if (opts.mod) parts.push(this.keys.mod);
            if (opts.alt) parts.push(this.keys.alt);
            if (opts.shift) parts.push(this.keys.shift);
            parts.push(key);
            return _isMac ? parts.join('') : parts.join('+');
        },

        /**
         * Generiert <kbd>-Element-HTML mit aria-label fuer Accessibility.
         */
        kbd: function (key, opts) {
            opts = opts || {};
            var html = this.fmt(key, opts);
            var ariaParts = [];
            if (opts.mod) ariaParts.push(_isMac ? 'Befehlstaste' : 'Steuerung');
            if (opts.alt) ariaParts.push(_isMac ? 'Wahltaste' : 'Alt');
            if (opts.shift) ariaParts.push('Umschalttaste');
            ariaParts.push(key);
            var aria = ariaParts.join(' plus ');
            var safeHtml = html
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            var safeAria = aria
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;');
            return '<kbd aria-label="' + safeAria + '">' + safeHtml + '</kbd>';
        }
    };

    global.ProvaPlatform = ProvaPlatform;
})(typeof window !== 'undefined' ? window : globalThis);
