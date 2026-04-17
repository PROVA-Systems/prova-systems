#!/usr/bin/env python3
"""
PROVA — Tote-Buttons-Audit
Findet Buttons in HTML-Dateien, die keine Funktion haben:
  • kein onclick
  • kein type="submit" in einer <form>
  • keine event-binding per JS (addEventListener auf id oder class)
  • leere/tote hrefs (#, "")

Benutzung:
  bash prova-audit-buttons.sh          (via Wrapper)
  python3 scripts/audit-tote-buttons.py

Ausgabe:
  Report pro Seite + Gesamt-Zähler + Exit-Code 0 (Warnung, kein Fehler)
"""
import os
import re
import sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
HTML_SKIP = {
    '404.html', 'index.html',
    # Legal-Seiten — rein statisch, keine Actions
    'agb.html', 'datenschutz.html', 'avv.html', 'impressum.html',
    'datenschutz-mandant.html',
    # Onboarding/Register — zum Großteil statische Marketing
    'app-register.html', 'app-login.html', 'admin-login.html',
    'account-gesperrt.html',
    # Mail-Vorlagen / Briefvorlagen (nicht interaktiv)
}

# Heuristik: Welche Klassen deuten auf "Button"?
BUTTON_RE = re.compile(
    r'<(button|a)\b([^>]*)>(.*?)</\1>',
    re.IGNORECASE | re.DOTALL
)

ATTR_RE = re.compile(r'''(\w[\w-]*)\s*=\s*(["'])(.*?)\2''', re.DOTALL)


def parse_attrs(attr_str):
    """Extrahiere Attribute als dict."""
    return {m.group(1).lower(): m.group(3) for m in ATTR_RE.finditer(attr_str)}


def is_button_like(tag, attrs, text):
    """Ist das Element ein interaktiver Button?"""
    classes = attrs.get('class', '').lower()
    if tag.lower() == 'button':
        return True
    # <a class="btn..."> oder <a class="*-btn*"> gilt als Button
    if tag.lower() == 'a' and re.search(r'\b(btn|button|action|cta)\b', classes):
        return True
    return False


def is_alive(attrs, js_references, text):
    """Ist der Button eindeutig lebendig?"""
    # 1. Inline onclick mit Inhalt?
    onclick = attrs.get('onclick', '').strip()
    if onclick and onclick not in ('', 'return false', 'void(0)', 'return false;'):
        return True, 'onclick-inline'

    # 2. type="submit"?
    if attrs.get('type', '').lower() == 'submit':
        return True, 'submit'

    # 3. href mit echtem Link?
    href = attrs.get('href', '').strip()
    if href and href not in ('#', '', 'javascript:void(0)', 'javascript:;'):
        return True, 'href'

    # 4. IRGENDEIN data-*-Attribut mit Wert — Event-Delegation-Pattern
    for k, v in attrs.items():
        if k.startswith('data-') and v.strip():
            return True, f'data-* ({k})'

    # 5. id im JS gebunden?
    btn_id = attrs.get('id', '')
    if btn_id and btn_id in js_references:
        return True, f'js-binding (id={btn_id})'

    # 6. Klasse im JS gebunden
    classes = attrs.get('class', '')
    for cls in classes.split():
        if cls in js_references:
            return True, f'js-binding (class={cls})'

    return False, None


def load_js_references():
    """Sammle alle IDs und Klassen, die in *.js mit addEventListener oder
       getElementById/querySelector referenziert sind."""
    refs = set()
    patterns = [
        # getElementById('xxx') / getElementById("xxx")
        re.compile(r'''getElementById\s*\(\s*['"]([^'"]+)['"]'''),
        # querySelector('#xxx') / querySelector('.xxx')
        re.compile(r'''querySelector(?:All)?\s*\(\s*['"]([^'"]+)['"]'''),
        # $('#xxx') / $('.xxx')
        re.compile(r'''\$\s*\(\s*['"]([^'"]+)['"]'''),
        # window.xxx = function (Handler) — id-Referenzen kommen über id-Suche
    ]

    for jsfile in ROOT.glob('*.js'):
        if jsfile.name == 'audit-tote-buttons.py':
            continue
        try:
            content = jsfile.read_text(encoding='utf-8', errors='ignore')
        except Exception:
            continue
        for pat in patterns:
            for m in pat.finditer(content):
                ref = m.group(1)
                # Selector-Prefix weg: '#xxx' → 'xxx', '.xxx' → 'xxx'
                ref = ref.lstrip('#.').split(' ')[0].split(',')[0].split('[')[0]
                if ref:
                    refs.add(ref)

    # HTML-inline-Scripts auch scannen
    for htmlfile in ROOT.glob('*.html'):
        try:
            content = htmlfile.read_text(encoding='utf-8', errors='ignore')
        except Exception:
            continue
        for pat in patterns:
            for m in pat.finditer(content):
                ref = m.group(1).lstrip('#.').split(' ')[0].split(',')[0].split('[')[0]
                if ref:
                    refs.add(ref)
    return refs


def get_button_label(text, attrs):
    """Button-Text extrahieren (HTML-Tags raus, gekürzt)."""
    clean = re.sub(r'<[^>]+>', '', text).strip()
    clean = re.sub(r'\s+', ' ', clean)
    if clean:
        return (clean[:40] + '…') if len(clean) > 40 else clean
    return f'<{attrs.get("id") or attrs.get("class") or "?"}>'


def audit_file(filepath, js_references):
    """Audit einer HTML-Datei — gibt Liste toter Buttons zurück."""
    content = filepath.read_text(encoding='utf-8', errors='ignore')
    dead = []
    for m in BUTTON_RE.finditer(content):
        tag = m.group(1)
        attr_str = m.group(2)
        text = m.group(3)
        attrs = parse_attrs(attr_str)
        if not is_button_like(tag, attrs, text):
            continue
        # disabled-Buttons übergehen (bewusste UX)
        if 'disabled' in attr_str.lower():
            continue
        alive, reason = is_alive(attrs, js_references, text)
        if not alive:
            # Vor-Check: Parent-Element (300 Zeichen zurück) hat onclick oder href?
            # Pattern: <div class="xxx" onclick="..."> ... <button>...</button> ... </div>
            window_start = max(0, m.start() - 600)
            before = content[window_start:m.start()]
            # Letztes öffnendes Tag finden
            parent_match = re.search(r'<(\w+)([^>]*)>(?!.*</\1>)',
                                     before[::-1] if False else before)
            # Pragmatischer: Hat IRGENDEIN offenes Tag innerhalb der letzten 400 Zeichen
            # einen onclick oder data-*?
            if re.search(r'onclick\s*=\s*["\'][^"\']+["\']', before[-400:]) or \
               re.search(r'data-[a-z-]+\s*=\s*["\'][^"\']+["\']', before[-400:]):
                continue
            # Zeilennummer bestimmen
            line = content[:m.start()].count('\n') + 1
            dead.append({
                'line': line,
                'label': get_button_label(text, attrs),
                'tag': tag,
                'has_id': bool(attrs.get('id')),
                'has_class': bool(attrs.get('class')),
            })
    return dead


def main():
    print("=" * 70)
    print(" PROVA — Tote-Buttons-Audit")
    print("=" * 70)
    print(f" Repo: {ROOT}")
    print(" Sammle JS-References (addEventListener, getElementById, ...)")
    js_refs = load_js_references()
    print(f" → {len(js_refs)} IDs/Classes im JS referenziert")
    print()

    results = defaultdict(list)
    total = 0
    checked = 0

    for htmlfile in sorted(ROOT.glob('*.html')):
        if htmlfile.name in HTML_SKIP:
            continue
        checked += 1
        dead = audit_file(htmlfile, js_refs)
        if dead:
            results[htmlfile.name] = dead
            total += len(dead)

    if total == 0:
        print(f" ✅ Alle Buttons auf {checked} geprüften Seiten sind aktiv.")
        return 0

    print(f" ⚠️  {total} potentiell tote Buttons auf {len(results)} Seiten:")
    print()
    print(f" {'Seite':<36} {'Zeile':>5}  Label")
    print(" " + "─" * 68)

    for page, items in sorted(results.items(), key=lambda x: -len(x[1])):
        for i, it in enumerate(items):
            prefix = page if i == 0 else ''
            print(f" {prefix:<36} {it['line']:>5}  {it['label']}")
        if len(items) > 1:
            print()

    print()
    print(" Hinweis: Einige Treffer können false-positives sein, wenn Handler")
    print(" dynamisch via Delegation oder MutationObserver gebunden werden.")
    print(" Liste ist für MANUELLEN Review gedacht, kein Build-Blocker.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
