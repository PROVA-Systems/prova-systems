#!/usr/bin/env python3
"""
PROVA — Design-Drift-Autofix
Ersetzt bekannte inkonsistente Werte in HTML-<style>-Blöcken durch zentrale Tokens.

Nur konservative 1:1-Mappings, die garantiert sicher sind:
  #fff                        →  var(--surface)
  #e5e7eb                     →  var(--border)
  #0b1628                     →  var(--bg3)
  0 1px 4px rgba(0,0,0,.06)   →  var(--shadow-sm)

Läuft NUR gegen .card, .form-section, .form-section-header, .card-header, .card-body
um Button-Farben (color:#fff) nicht zu verändern.

Benutzung:
  python3 scripts/fix-design-drift.py         (Dry-run, zeigt was geändert würde)
  python3 scripts/fix-design-drift.py --apply (führt Änderungen aus)
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APPLY = '--apply' in sys.argv

# Nur diese Selektoren werden angefasst
TARGET_SELECTOR_RE = re.compile(
    r'\.(card|form-section|form-section-body|form-section-header|card-header|card-body|surface|panel)\b',
    re.IGNORECASE
)

# Muster: selector { ... body ... }
STYLE_BLOCK = re.compile(r'<style\b[^>]*>(.*?)</style>', re.DOTALL | re.IGNORECASE)
RULE_RE = re.compile(r'([^\{\}]+)\{([^\}]*)\}', re.DOTALL)

# Welche Property-Values auf welche Tokens gemappt werden
REPLACEMENTS = [
    # (prop_regex, value_regex, new_value)
    (r'background\s*:', r'#fff\b',           'var(--surface)'),
    (r'background-color\s*:', r'#fff\b',     'var(--surface)'),
    (r'background\s*:', r'#0b1628\b',        'var(--bg3)'),
    (r'background-color\s*:', r'#0b1628\b',  'var(--bg3)'),
    (r'border\s*:', r'#e5e7eb\b',            'var(--border)'),  # Wird nur der Farbteil ersetzt
    (r'box-shadow\s*:', r'0\s+1px\s+4px\s+rgba\(0,0,0,\.06\)', 'var(--shadow-sm)'),
]

def fix_rule_body(selector, body):
    """Ersetze Werte, nur wenn selector zu unseren Target-Klassen passt."""
    if not TARGET_SELECTOR_RE.search(selector):
        return body, 0

    changes = 0
    new_body = body

    # Regel-für-Regel ersetzen
    for prop_pattern, val_pattern, new_val in REPLACEMENTS:
        # Finde property-deklarationen im body
        # "background: #fff;" oder "background:#fff;"
        combined = re.compile(
            r'(' + prop_pattern + r')\s*([^;}]+?)(;|$|})',
            re.IGNORECASE
        )
        def repl(m):
            nonlocal changes
            prop = m.group(1)
            value = m.group(2)
            end = m.group(3)
            # nur ersetzen wenn val_pattern im value vorkommt
            if re.search(val_pattern, value, re.IGNORECASE):
                new_value = re.sub(val_pattern, new_val, value, flags=re.IGNORECASE)
                if new_value != value:
                    changes += 1
                    return f'{prop} {new_value.strip()}{end}'
            return m.group(0)
        new_body = combined.sub(repl, new_body)

    return new_body, changes


def fix_html(filepath):
    """Fixt ein HTML-File. Gibt (changes_count, neuer_content) zurück."""
    content = filepath.read_text(encoding='utf-8', errors='ignore')
    total_changes = 0

    def process_style_block(m):
        nonlocal total_changes
        block_content = m.group(1)
        new_block = block_content
        # Jede Rule einzeln abklappern
        def rule_sub(rule_m):
            nonlocal total_changes
            selector = rule_m.group(1)
            body = rule_m.group(2)
            new_body, cnt = fix_rule_body(selector, body)
            total_changes += cnt
            return f'{selector}{{{new_body}}}'
        new_block = RULE_RE.sub(rule_sub, block_content)
        return f'<style>{new_block}</style>'

    new_content = STYLE_BLOCK.sub(process_style_block, content)
    return total_changes, new_content


def main():
    print("=" * 70)
    print(f" PROVA — Design-Drift-Autofix  {'[APPLY]' if APPLY else '[DRY-RUN]'}")
    print("=" * 70)
    print(f" Root: {ROOT}")
    print()

    total_files_touched = 0
    total_changes = 0

    for htmlfile in sorted(ROOT.glob('*.html')):
        try:
            changes, new_content = fix_html(htmlfile)
        except Exception as e:
            print(f"  ⚠️  {htmlfile.name}: {e}")
            continue
        if changes > 0:
            total_files_touched += 1
            total_changes += changes
            print(f"  {htmlfile.name}: {changes} Ersetzungen")
            if APPLY:
                htmlfile.write_text(new_content, encoding='utf-8')

    print()
    print(f"  Files betroffen: {total_files_touched}")
    print(f"  Ersetzungen:     {total_changes}")
    if not APPLY:
        print()
        print("  DRY-RUN. Mit --apply ausführen um zu übernehmen.")
    else:
        print()
        print("  ✅ Änderungen geschrieben.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
