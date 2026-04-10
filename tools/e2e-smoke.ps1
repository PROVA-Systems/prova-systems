param(
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"

$script:SmokeResults = @()

function Add-SmokeResult {
  param(
    [string]$Status,
    [string]$Label,
    [string]$File,
    [string]$Note = ""
  )
  $script:SmokeResults += [pscustomobject]@{
    Status = $Status
    Label  = $Label
    File   = $File
    Note   = $Note
  }
}

function Assert-Contains {
  param(
    [string]$File,
    [string]$Pattern,
    [string]$Label
  )
  $path = Join-Path (Get-Location) $File
  if (-not (Test-Path -LiteralPath $path)) {
    Write-Host "[FAIL] $Label (file missing: $File)" -ForegroundColor Red
    Add-SmokeResult -Status "FAIL" -Label $Label -File $File -Note "file not found"
    return $false
  }
  $content = Get-Content -Path $path -Raw -Encoding UTF8
  if ($content -match $Pattern) {
    Write-Host "[PASS] $Label" -ForegroundColor Green
    Add-SmokeResult -Status "PASS" -Label $Label -File $File
    return $true
  }
  Write-Host "[FAIL] $Label" -ForegroundColor Red
  Add-SmokeResult -Status "FAIL" -Label $Label -File $File -Note "pattern not found"
  return $false
}

function Write-E2EResultMarkdown {
  param(
    [string]$RootPath,
    [bool]$AllOk
  )
  $outPath = Join-Path $PSScriptRoot "E2E-RESULT.md"
  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $overall = if ($AllOk) { "PASS" } else { "FAIL" }

  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine('# PROVA E2E Smoke - Result')
  [void]$sb.AppendLine('')
  [void]$sb.AppendLine('> **Hinweis:** Die automatisierten Zeilen sind ein **statischer Code-/Verkabelungs-Check** (kein Browser, kein Live-Workflow). Manuelle Browser-Checks unten ausfuellen.')
  [void]$sb.AppendLine('')
  [void]$sb.AppendLine('| Feld | Wert |')
  [void]$sb.AppendLine('|------|------|')
  [void]$sb.AppendLine("| **Generiert** | $ts |")
  [void]$sb.AppendLine('| **Projektroot** | `' + $RootPath + '` |')
  [void]$sb.AppendLine("| **Gesamt (Code-Wiring)** | **$overall** |")
  [void]$sb.AppendLine('')
  [void]$sb.AppendLine('## Automatisierte Checks')
  [void]$sb.AppendLine('')
  [void]$sb.AppendLine('| Status | Check | Datei |')
  [void]$sb.AppendLine('|--------|-------|-------|')
  foreach ($r in $script:SmokeResults) {
    $st = $r.Status
    $lb = ($r.Label -replace '\|', '/')
    $fl = ($r.File -replace '\|', '/')
    if ($r.Note) {
      $note = ($r.Note -replace '\|', '/')
      [void]$sb.AppendLine("| $st | $lb | ``$fl`` ($note) |")
    } else {
      [void]$sb.AppendLine("| $st | $lb | ``$fl`` |")
    }
  }
  [void]$sb.AppendLine('')
  [void]$sb.AppendLine('## Manuelle Browser-Checks')
  [void]$sb.AppendLine('')
  [void]$sb.AppendLine('Siehe `tools/E2E-CHECKLIST.md`. Nach dem Durchlauf hier ergaenzen:')
  [void]$sb.AppendLine('')
  [void]$sb.AppendLine('- Dashboard: ')
  [void]$sb.AppendLine('- Akte Tabs: ')
  [void]$sb.AppendLine('- Akte Links (az): ')
  [void]$sb.AppendLine('- Termine speichern: ')
  [void]$sb.AppendLine('- Import: ')
  [void]$sb.AppendLine('- Freigabe: ')
  [void]$sb.AppendLine('- Rechnungen F1: ')
  [void]$sb.AppendLine('- Onboarding: ')
  [void]$sb.AppendLine('- Navigation: ')
  [void]$sb.AppendLine('')

  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($outPath, $sb.ToString(), $utf8NoBom)
  Write-Host ""
  Write-Host "Written: $outPath" -ForegroundColor Cyan
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "PROVA Smoke: statischer Verkabelungs-Check (kein Browser, keine Netlify-/Airtable-Laufzeit)" -ForegroundColor Cyan
Write-Host "Root: $root"
Write-Host ""

$allOk = $true

$checks = @(
  @{ File = "dashboard.html"; Pattern = "dashboard-logic\.js"; Label = "Dashboard loads dashboard logic" },
  @{ File = "dashboard.html"; Pattern = "frist-guard\.js"; Label = "Dashboard loads frist-guard" },
  @{ File = "dashboard-logic.js"; Pattern = "TABLE_FAELLE"; Label = "Dashboard uses FAELLE table" },
  @{ File = "dashboard-logic.js"; Pattern = "TABLE_RECHNUNGEN"; Label = "Dashboard uses RECHNUNGEN table" },
  @{ File = "dashboard-logic.js"; Pattern = "TABLE_TERMINE"; Label = "Dashboard uses TERMINE table" },
  @{ File = "akte.html"; Pattern = "data-tab=""ue"""; Label = "Akte tab Overview exists" },
  @{ File = "akte.html"; Pattern = "data-tab=""gu"""; Label = "Akte tab Gutachten exists" },
  @{ File = "akte.html"; Pattern = "data-tab=""re"""; Label = "Akte tab Rechnung exists" },
  @{ File = "akte.html"; Pattern = "data-tab=""te"""; Label = "Akte tab Termine exists" },
  @{ File = "akte.html"; Pattern = "data-tab=""ko"""; Label = "Akte tab Kommunikation exists" },
  @{ File = "akte.html"; Pattern = "data-tab=""un"""; Label = "Akte tab Unterlagen exists" },
  @{ File = "akte.html"; Pattern = "data-tab=""no"""; Label = "Akte tab Notizen exists" },
  @{ File = "termine.html"; Pattern = "Abgabefrist"; Label = "Termine includes Abgabefrist type" },
  @{ File = "termine.html"; Pattern = "Gerichtstermin"; Label = "Termine includes Gerichtstermin type" },
  @{ File = "termine.html"; Pattern = "provaPushNotify"; Label = "Termine has Frist-Guard push hook" },
  @{ File = "freigabe.html"; Pattern = "MAKE_PROXY_FREIGABE_G3"; Label = "Freigabe uses make-proxy g3 (no hardcoded Make URL)" },
  @{ File = "freigabe.html"; Pattern = "MAKE_PROXY_KORREKTUR_S1"; Label = "Korrektur uses make-proxy s1 (no hardcoded Make URL)" },
  @{ File = "freigabe.html"; Pattern = "Timeout nach 120 Sekunden"; Label = "Freigabe has 120s timeout handling" },
  @{ File = "rechnungen-logic.js"; Pattern = "make-proxy\?key=f1"; Label = "Rechnungen uses make-proxy f1" },
  @{ File = "onboarding.html"; Pattern = "make-proxy\?key=l8"; Label = "Onboarding uses make-proxy l8" },
  @{ File = "netlify/functions/make-proxy.js"; Pattern = "key !== 'k3' && key !== 'a5' && key !== 'f1' && key !== 'g3' && key !== 'l8' && key !== 's1'"; Label = "make-proxy accepts k3,a5,f1,g3,l8,s1" },
  @{ File = "nav.js"; Pattern = "widerspruch-gutachten\.html"; Label = "Nav contains Widerspruch entry" },
  @{ File = "nav.js"; Pattern = "jahresbericht\.html"; Label = "Nav contains Jahresbericht entry" },
  @{ File = "nav.js"; Pattern = "hilfe\.html"; Label = "Nav contains Hilfe entry" }
)

foreach ($c in $checks) {
  if (-not (Assert-Contains -File $c.File -Pattern $c.Pattern -Label $c.Label)) {
    $allOk = $false
  }
}

# Dedicated duplicate check for import-assistent in nav.js
$navPath = Join-Path (Get-Location) "nav.js"
if (-not (Test-Path -LiteralPath $navPath)) {
  Write-Host "[FAIL] Nav import entry check (nav.js missing)" -ForegroundColor Red
  Add-SmokeResult -Status "FAIL" -Label "Nav import entry appears exactly once" -File "nav.js" -Note "file not found"
  $allOk = $false
} else {
  $navRaw = Get-Content -Path $navPath -Raw -Encoding UTF8
  $importMatches = [regex]::Matches($navRaw, "import-assistent\.html").Count
  if ($importMatches -eq 1) {
    Write-Host "[PASS] Nav import entry appears exactly once" -ForegroundColor Green
    Add-SmokeResult -Status "PASS" -Label "Nav import entry appears exactly once" -File "nav.js"
  } else {
    Write-Host "[FAIL] Nav import entry count = $importMatches (expected 1)" -ForegroundColor Red
    Add-SmokeResult -Status "FAIL" -Label "Nav import entry appears exactly once" -File "nav.js" -Note "count=$importMatches"
    $allOk = $false
  }
}

Write-Host ""
if ($allOk) {
  Write-Host "Result: PASS (nur statische Verkabelung - kein E2E-Browser)" -ForegroundColor Green
} else {
  Write-Host "Result: FAIL (see checks above)" -ForegroundColor Red
}

Write-E2EResultMarkdown -RootPath $root -AllOk $allOk

if ($OpenBrowser) {
  Write-Host ""
  Write-Host "Opening manual E2E pages in browser..." -ForegroundColor Cyan
  $pages = @(
    "dashboard.html",
    "akte.html?az=E2E-001",
    "termine.html?az=E2E-001",
    "import-assistent.html",
    "freigabe.html?fall=E2E-001",
    "rechnungen.html?az=E2E-001",
    "onboarding.html"
  )
  foreach ($p in $pages) {
    $url = "file:///" + (($root + "\" + $p) -replace "\\", "/")
    Start-Process $url
  }
}
