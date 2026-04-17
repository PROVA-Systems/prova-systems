#!/usr/bin/env python3
"""
PROVA — Design-Drift-Audit
Findet Inkonsistenzen im CSS durch Analyse aller Inline-<style>-Blöcke in HTML-
Dateien. Prüft für die zentralen Layout-Klassen (.card, .kpi, .panel, .form-section
etc.), welche Werte für background, border, border-radius, padding gesetzt werden.

Ziel: Ein Bild davon bekommen, welche Seiten welche Werte nutzen, um Drift zu
identifizieren. Output = Markdown-Tabelle für manuellen Review.

Benutzung:
  python3 scripts/audit-design-drift.py

Exit-Code: immer 0 (Informations-Tool, kein Blocker).
"""
import re
import sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
SKIP = {'404.html', 'index.html', 'app-login.html', 'app-register.html',
        'agb.html', 'datenschutz.html', 'avv.html', 'impressum.html',
        'onboarding.html', 'onboarding-welcome.html', 'onboarding-schnellstart.html',
        'admin-login.html'}

# Die Klassen, deren Styles wir vergleichen wollen — alles was "Container" ist
TARGET_CLASSES = [
    'card', 'kpi', 'panel', 'form-section', 'form-section-body',
    'doku-card', 'surface', 'pkg-card', 'tile', 'stat', 'box',
]

# Properties, die wir tracken (was der Nutzer als Drift wahrnimmt)
TARGET_PROPS = ['background', 'background-color', 'border', 'border-radius', 'padding', 'box-shadow']

STYLE_BLOCK = re.compile(r'<style\b[^>]*>(.*?)</style>', re.DOTALL | re.IGNORECASE)
RULE_RE = re.compile(r'([^\{\}]+)\{([^\}]*)\}', re.DOTALL)

def extract_inline_styles(html_content):
    """Gibt Dict {selector: {prop: value}} für TARGET_CLASSES zurück."""
    styles = {}
    for block_match in STYLE_BLOCK.finditer(html_content):
        block = block_match.group(1)
        for rule_match in RULE_RE.finditer(block):
            selector = rule_match.group(1).strip()
            body = rule_match.group(2)

            # Nur Regeln, die mindestens eine Target-Klasse matchen
            matched_class = None
            for cls in TARGET_CLASSES:
                # Akzeptiert .card, .card:hover, .card.active etc.
                if re.search(r'\.' + re.escape(cls) + r'\b', selector):
                    matched_class = cls
                    break
            if not matched_class:
                continue

            # Properties extrahieren
            props = {}
            for prop_match in re.finditer(
                r'([a-z-]+)\s*:\s*([^;]+);?', body, re.IGNORECASE
            ):
                prop = prop_match.group(1).strip().lower()
                val = prop_match.group(2).strip().rstrip(';').strip()
                if prop in TARGET_PROPS:
                    props[prop] = val

            if props:
                key = f'{matched_class}: {selector}'
                styles[key] = props
    return styles


def normalize_value(v):
    """Normalisiert einen CSS-Wert für Vergleichszwecke."""
    if not v:
        return ''
    v = re.sub(r'\s+', ' ', v.strip().lower())
    v = v.rstrip(';').strip()
    return v


def main():
    print("=" * 74)
    print(" PROVA — Design-Drift-Audit")
    print("=" * 74)
    print(f" Root: {ROOT}")
    print(f" Prüft Klassen: {', '.join(TARGET_CLASSES)}")
    print(f" Properties: {', '.join(TARGET_PROPS)}")
    print()

    # Pro Klasse: {property: {normalized_value: [seiten, die das nutzen]}}
    drift = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    pages_scanned = 0

    for htmlfile in sorted(ROOT.glob('*.html')):
        if htmlfile.name in SKIP:
            continue
        try:
            html = htmlfile.read_text(encoding='utf-8', errors='ignore')
        except Exception:
            continue
        pages_scanned += 1
        styles = extract_inline_styles(html)
        for selector_key, props in styles.items():
            cls = selector_key.split(':', 1)[0].strip()
            for prop, val in props.items():
                norm_val = normalize_value(val)
                drift[cls][prop][norm_val].append(htmlfile.name)

    print(f" Gescannt: {pages_scanned} HTML-Dateien")
    print()

    total_drift_points = 0

    for cls in TARGET_CLASSES:
        if cls not in drift:
            continue
        cls_drift_lines = []
        for prop in TARGET_PROPS:
            if prop not in drift[cls]:
                continue
            values = drift[cls][prop]
            if len(values) < 2:
                # Nur ein Wert → kein Drift
                continue
            # Mehrere unterschiedliche Werte → Drift
            total_drift_points += 1
            cls_drift_lines.append(f"  · {prop}: {len(values)} verschiedene Werte")
            # Top-3 Wert-Varianten mit Seiten-Zähler
            sorted_vals = sorted(values.items(), key=lambda x: -len(x[1]))
            for val, pages in sorted_vals[:4]:
                preview = val[:60] + ('…' if len(val) > 60 else '')
                page_preview = ', '.join(pages[:3])
                if len(pages) > 3:
                    page_preview += f' (+{len(pages)-3})'
                cls_drift_lines.append(f'      "{preview}"  → {len(pages)}× ({page_preview})')

        if cls_drift_lines:
            print(f"▸ .{cls}")
            for line in cls_drift_lines:
                print(line)
            print()

    if total_drift_points == 0:
        print("✅ Keine signifikante Drift in den geprüften Klassen gefunden.")
    else:
        print("─" * 74)
        print(f" {total_drift_points} Drift-Punkte gefunden — priorisiert auf die häufigsten")
        print(" Klassen eingehen und auf zentrale CSS-Tokens in prova-design.css umstellen.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
