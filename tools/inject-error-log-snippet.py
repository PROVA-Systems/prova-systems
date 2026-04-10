# -*- coding: utf-8 -*-
"""Fügt Frontend-Error-Log-Snippet direkt nach <head> in App-HTML ein (ohne legal/, briefe/, formulare/)."""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = frozenset({"legal", "briefe", "formulare", "node_modules", ".git"})

SNIPPET = """<script>
  window.__PROVA_ENV = 'production';
  window.onerror = function(msg, src, line, col, err) {
    if (!navigator.onLine) return;
    fetch('/.netlify/functions/error-log', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        msg: String(msg).slice(0,500),
        src: src, line: line,
        page: window.location.pathname,
        user: localStorage.getItem('prova_sv_email')||'unbekannt',
        ua: navigator.userAgent.slice(0,100),
        ts: new Date().toISOString()
      })
    }).catch(function(){});
  };
</script>
"""

MARKER = "window.__PROVA_ENV = 'production'"


def main():
    updated = 0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if not fn.endswith(".html"):
                continue
            path = os.path.join(dirpath, fn)
            rel = os.path.relpath(path, ROOT)
            first = rel.split(os.sep)[0]
            if first in SKIP_DIRS:
                continue
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            if MARKER in content:
                continue
            m = re.search(r"<head\s*>", content, re.I)
            if not m:
                continue
            end = m.end()
            insert = "\n" + SNIPPET
            newc = content[:end] + insert + content[end:]
            with open(path, "w", encoding="utf-8", newline="") as f:
                f.write(newc)
            print(rel)
            updated += 1
    print("inject-error-log-snippet: %d Dateien aktualisiert." % updated, file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
