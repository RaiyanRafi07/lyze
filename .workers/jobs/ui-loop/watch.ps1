#Requires -Version 5.1
<#
.SYNOPSIS
  UI loop watcher (task-8): rebuild the release binary when Rust sources change.

.DESCRIPTION
  Watches desktop/crates (recursively, *.rs only) with a FileSystemWatcher.
  Changes are debounced (default 5s); once quiet, runs a headless release
  build from the desktop/ workdir:

    cargo build --locked --offline --release -p leetlab-app

  with CARGO_TARGET_DIR=desktop/target/rel-r4,
  TMP/TEMP/TMPDIR=desktop/target/cargo-tmp and
  CARGO_PROFILE_DEV_DEBUG=false.

  On build exit code 0 it invokes drive.ps1 (same folder) to refresh the
  Display5 screenshots. This script never launches a window itself and never
  synthesizes input.

.NOTES
  Owns ONLY this file + drive.ps1 (task-8). diff.py / baselines / LOOP.md
  belong to the teammate (task-9) — do not create them here.
#>
[CmdletBinding()]
param(
  [int]$DebounceSeconds = 5
)

$ErrorActionPreference = 'Stop'

$RepoRoot   = Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
$CratesDir  = Join-Path $RepoRoot 'desktop\crates'
$DesktopDir = Join-Path $RepoRoot 'desktop'
$CargoTgt   = Join-Path $RepoRoot 'desktop\target\rel-r4'
$CargoTmp   = Join-Path $RepoRoot 'desktop\target\cargo-tmp'
$Drive      = Join-Path $PSScriptRoot 'drive.ps1'

if (-not (Test-Path $CratesDir -PathType Container)) { throw "crates dir missing: $CratesDir" }
if (-not (Test-Path $Drive -PathType Leaf)) { throw "drive.ps1 missing: $Drive" }
New-Item -ItemType Directory -Force -Path $CargoTmp | Out-Null

function Write-Stamp([string]$Message) {
  Write-Output ("[{0:o}] {1}" -f (Get-Date), $Message)
}

function Invoke-UiLoopBuild {
  $env:CARGO_TARGET_DIR       = $CargoTgt
  $env:TMP                   = $CargoTmp
  $env:TEMP                  = $CargoTmp
  $env:TMPDIR                = $CargoTmp
  $env:CARGO_PROFILE_DEV_DEBUG = 'false'
  Push-Location -Path $DesktopDir
  try {
    Write-Stamp "build start: cargo build --locked --offline --release -p leetlab-app"
    & cargo build --locked --offline --release -p leetlab-app
    $code = $LASTEXITCODE
    Write-Stamp "build exit: $code"
    return $code
  } finally {
    Pop-Location
  }
}

Write-Stamp "watching $CratesDir (*.rs, debounce ${DebounceSeconds}s)"

# Baseline build at startup so the loop starts from a known state.
if ((Invoke-UiLoopBuild) -eq 0) {
  Write-Stamp "startup build OK -> running drive.ps1"
  & $Drive
} else {
  Write-Stamp "startup build FAILED -> drive.ps1 skipped"
}

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $CratesDir
$watcher.Filter = '*.rs'
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]'LastWrite, CreationTime, FileName, DirectoryName'
$watcher.EnableRaisingEvents = $true

$subs = @()
foreach ($ev in @('Changed', 'Created', 'Renamed')) {
  $subs += Register-ObjectEvent -InputObject $watcher -EventName $ev
}

try {
  $pendingAt = $null
  while ($true) {
    $evt = Wait-Event -Timeout 1
    if ($null -ne $evt) {
      $path = $evt.SourceEventArgs.FullPath
      Remove-Event -EventIdentifier $evt.EventIdentifier
      if ($path -like '*.rs') { $pendingAt = [DateTime]::UtcNow }
    }
    if (($null -ne $pendingAt) -and ((([DateTime]::UtcNow) - $pendingAt).TotalSeconds -ge $DebounceSeconds)) {
      $pendingAt = $null
      Write-Stamp "change quiet for ${DebounceSeconds}s -> rebuilding"
      if ((Invoke-UiLoopBuild) -eq 0) {
        Write-Stamp "build OK -> running drive.ps1"
        & $Drive
      } else {
        Write-Stamp "build FAILED -> drive.ps1 skipped"
      }
    }
  }
} finally {
  foreach ($s in $subs) { Unregister-Event -SubscriptionId $s.Id -ErrorAction SilentlyContinue }
  $watcher.Dispose()
  Write-Stamp "watcher stopped"
}
