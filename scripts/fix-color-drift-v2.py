#!/usr/bin/env python3
"""
PROVA Farb-Drift-Fix v2 (Session 6)
──────────────────────────────────────────────────────────────
Normalisiert alle *.html Files auf die GRUPPE-A-Palette (dunkelblau):
  --bg: #0b1220   (war: #0b0d11, #0d0f14, #0b1120 auf anderen Seiten)

Was sich ändert:
  - 12 Files von Gruppe B (#0b0d11 Fast-Schwarz) → dunkelblau
  - 3 Files von Gruppe C (#0d0f14 Zwischen-Ton) → dunkelblau
  - 1 File von Sonderton (#0b1120) → dunkelblau
  - 14 Files (Gruppe A) bleiben wie sie sind

Was NICHT angefasst wird:
  - app.html (--bg:#F0F4F8 — Light-Mode, beabsichtigt)
  - Legal-Seiten ohne --bg (agb, datenschutz, impressum, index)
  - vorlage-*.html (Print-Templates, eigenes System)

Nutzung:
  cd <repo-root>
  python scripts/fix-color-drift-v2.py              # Dry-Run (nur anzeigen)
  python scripts/fix-color-drift-v2.py --apply      # wirklich schreiben
  python scripts/fix-color-drift-v2.py --apply --verbose
"""

import sys
import re
from pathlib import Path
from collections import defaultdict

# ──────────────────────────────────────────────────────────────────────
# ZIEL-PALETTE (Gruppe A — Dunkelblau, "baubegleitung.html"-Standard)
# ──────────────────────────────────────────────────────────────────────
REPLACEMENTS = [
    # ── Haupt-Hintergründe ──
    ('#0b0d11', '#0b1220'),   # Gruppe B → Gruppe A
    ('#0d0f14', '#0b1220'),   # Gruppe C → Gruppe A
    ('#0b1120', '#0b1220'),   # Sonderton → Gruppe A

    # ── Layer-2-Hintergründe (bg2) ──
    ('#111318', '#111827'),   # Gruppe-B bg2 → A
    ('#111821', '#111827'),   # Varianz
    ('#0d1117', '#111827'),   # Gruppe-C bg2 → A

    # ── Layer-3-Hintergründe (bg3) ──
    ('#161a22', '#161f30'),   # Gruppe-B bg3 → A
    ('#141a25', '#161f30'),   # Varianz

    # ── Surface ──
    ('#1c2130', '#1c2537'),   # Gruppe-B surface → A
    ('#1a1f2e', '#1c2537'),   # Varianz
    ('#151922', '#1c2537'),   # Varianz

    # ── Surface2 / Hover ──
    ('#232a3a', '#222d42'),   # Gruppe-B surface2 → A
    ('#1f2535', '#222d42'),   # Varianz

    # ── Surface3 / Active ──
    ('#2a303e', '#2a3550'),   # Varianz → A

    # ── Borders (minimale Justierung) ──
    # Gruppe B: 0.06 / 0.11 → Gruppe A: 0.07 / 0.12
    ('rgba(255,255,255,0.06)', 'rgba(255,255,255,0.07)'),
    ('rgba(255,255,255,0.11)', 'rgba(255,255,255,0.12)'),
    ('rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.07)'),
    ('rgba(255, 255, 255, 0.11)', 'rgba(255, 255, 255, 0.12)'),

    # ── Text-Farben (Gruppe-B-Text nach A) ──
    ('#eaecf4', '#e8eaf0'),
    ('#a4aec4', '#aab4cb'),
    ('#6e7893', '#6b7a99'),
]

# ──────────────────────────────────────────────────────────────────────
# Files die NICHT angefasst werden
# ──────────────────────────────────────────────────────────────────────
SKIP_FILES = {
    'app.html',                # Light-Mode beabsichtigt
    'agb.html', 'datenschutz.html', 'impressum.html',
    'index.html', 'onboarding-welcome.html',
    # Print-Templates mit eigenem CSS
    '404.html',
}
SKIP_PREFIXES = ('vorlage-',)   # vorlage-01-standard.html etc.


def is_skipped(filename: str) -> bool:
    if filename in SKIP_FILES:
        return True
    return any(filename.startswith(p) for p in SKIP_PREFIXES)


def process_file(path: Path, apply: bool, verbose: bool) -> dict:
    """Verarbeitet ein HTML-File. Gibt Statistik zurück."""
    content = path.read_text(encoding='utf-8')
    original = content
    replacements_made = defaultdict(int)

    for needle, replacement in REPLACEMENTS:
        if needle in content:
            count = content.count(needle)
            content = content.replace(needle, replacement)
            replacements_made[f'{needle} → {replacement}'] += count

    if content != original:
        if apply:
            path.write_text(content, encoding='utf-8')
        return {
            'changed': True,
            'replacements': dict(replacements_made),
            'total': sum(replacements_made.values())
        }
    return {'changed': False, 'replacements': {}, 'total': 0}


def main():
    apply = '--apply' in sys.argv
    verbose = '--verbose' in sys.argv

    # Repo-Root ermitteln — alle *.html im aktuellen Verzeichnis
    root = Path.cwd()
    html_files = sorted([p for p in root.glob('*.html')])

    if not html_files:
        print('❌ Keine *.html Files im aktuellen Verzeichnis gefunden.')
        print(f'   Bitte cd zum Repo-Root wechseln (wo alle HTML-Files liegen).')
        sys.exit(1)

    print('═══════════════════════════════════════════════════════')
    print(' PROVA FARB-DRIFT-FIX v2 (Session 6)')
    print('═══════════════════════════════════════════════════════')
    print(f' Verzeichnis:  {root}')
    print(f' HTML-Files:   {len(html_files)}')
    print(f' Modus:        {"APPLY (wird geschrieben)" if apply else "DRY-RUN (nichts geändert)"}')
    print('═══════════════════════════════════════════════════════\n')

    total_files_changed = 0
    total_replacements = 0
    skipped = []
    changed_files = []
    unchanged_files = []

    for path in html_files:
        if is_skipped(path.name):
            skipped.append(path.name)
            continue

        result = process_file(path, apply, verbose)
        if result['changed']:
            total_files_changed += 1
            total_replacements += result['total']
            changed_files.append((path.name, result['total']))

            if verbose or len(changed_files) <= 5:
                print(f'  ✏️  {path.name}  ({result["total"]} Ersetzungen)')
                if verbose:
                    for k, v in result['replacements'].items():
                        print(f'       {v}× {k}')
        else:
            unchanged_files.append(path.name)

    # ── Zusammenfassung ──
    print('\n═══════════════════════════════════════════════════════')
    print(' ZUSAMMENFASSUNG')
    print('═══════════════════════════════════════════════════════')
    print(f' Geändert:      {total_files_changed} Files  ({total_replacements} Ersetzungen)')
    print(f' Unverändert:   {len(unchanged_files)} Files (schon auf Gruppe A)')
    print(f' Übersprungen:  {len(skipped)} Files (Light-Mode / Legal / Templates)')

    if changed_files and not verbose:
        print('\n Geänderte Files:')
        for name, cnt in sorted(changed_files, key=lambda x: -x[1])[:20]:
            print(f'   {cnt:>3}× {name}')

    if skipped:
        print(f'\n Übersprungen (beabsichtigt):')
        for name in skipped:
            print(f'   · {name}')

    print('═══════════════════════════════════════════════════════')
    if not apply and total_files_changed > 0:
        print('\n ℹ️  Das war ein Dry-Run. Zum Anwenden:')
        print('     python scripts/fix-color-drift-v2.py --apply')
    elif apply and total_files_changed > 0:
        print('\n ✅ Fertig — bitte prüfen, committen und deployen.')
        print('    git diff              # Review')
        print('    git add -A')
        print('    git commit -m "Session 6: Farb-Drift-Fix — alle Seiten auf Gruppe A (dunkelblau)"')
        print('    git push')
    print()


if __name__ == '__main__':
    main()
