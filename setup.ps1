#Requires -Version 5.1
<#
.SYNOPSIS
  Fresh-machine setup for Lyze: fetch toolchains, build, stage, package, verify.

.DESCRIPTION
  Chains the whole pipeline so a clean `git clone` becomes a working app
  with one command. Run from the repository root:

    pwsh setup.ps1

  Steps: prerequisite check -> Rust 1.89 toolchain -> vendor download
  (~480 MB) -> release build -> stage portable tree -> zip ->
  --check-resources gate.

  What this does NOT restore (by design, never committed):
    - plugin/data/progress.json and *.local.json (your solved code/notes)
    - %LOCALAPPDATA%\LeetCodeLab (live profile)
  Back those up separately before wiping a machine.

.NOTES
  Unpack/run location must not contain spaces (the bundled MinGW driver
  cannot parse them). The repo checkout itself may live anywhere.
#>
param(
  [switch]$SkipVerify
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Split-Path -Parent $MyInvocation.MyCommand.Path)).Path
$Desktop = Join-Path $RepoRoot 'desktop'
$TargetRel = Join-Path $RepoRoot 'desktop\target\rel-r4'
$AppBin = Join-Path $TargetRel 'release\leetlab-app.exe'
$StageOut = Join-Path $RepoRoot 'desktop\target\pkg-win-final'
$ZipOut = Join-Path $RepoRoot 'desktop\target\LeetCodeLab-win-x64.zip'
$StagedExe = Join-Path $StageOut 'LeetCodeLab\leetlab-app.exe'

function Step([string]$Name) { Write-Output ""; Write-Output "=== $Name ===" }
function Need([string]$Command, [string]$Install) {
  if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
    throw "missing '$Command'. Install: $Install"
  }
}

Step '1/6 prerequisites'
Need 'cargo' 'Rust 1.89 via https://rustup.rs (rust-toolchain.toml pins it)'
Need 'rustc' 'Rust 1.89 via https://rustup.rs'
Need 'node' 'Node 18+ via https://nodejs.org (fixture tooling only)'
Need 'python' 'Python 3.10+ (packaging scripts)'
if (Get-Command 'rustup' -ErrorAction SilentlyContinue) {
  & rustup toolchain install 1.89 --profile minimal --component rustfmt, clippy
  if ($LASTEXITCODE -ne 0) { throw 'rustup toolchain install failed' }
} else {
  Write-Output 'rustup not found; assuming a system Rust 1.89. Remove rustup to silence this.'
}
if ($RepoRoot -match ' ') {
  Write-Output 'NOTE: repo path contains spaces; the build works, but always unzip the app somewhere space-free (e.g. C:\Lyze).'
}

Step '2/6 vendor toolchains (~480 MB download, cached afterwards)'
& python (Join-Path $Desktop 'packaging\fetch-vendor.py')
if ($LASTEXITCODE -ne 0) { throw 'fetch-vendor.py failed' }

Step '3/6 release build'
$env:CARGO_TARGET_DIR = $TargetRel
try {
  Push-Location $Desktop
  & cargo build --locked --release -p leetlab-app
  if ($LASTEXITCODE -ne 0) { throw 'cargo build failed' }
} finally {
  Pop-Location
  Remove-Item Env:\CARGO_TARGET_DIR -ErrorAction SilentlyContinue
}
if (-not (Test-Path $AppBin -PathType Leaf)) { throw "expected binary missing: $AppBin" }

Step '4/6 stage portable tree (close the app first: Windows locks the running exe)'
& python (Join-Path $Desktop 'packaging\stage.py') --os win --app-bin $AppBin --vendor (Join-Path $RepoRoot 'desktop\target\vendor') --out $StageOut
if ($LASTEXITCODE -ne 0) { throw 'stage.py failed' }

Step '5/6 package zip'
& python (Join-Path $Desktop 'packaging\package.py') --os win --stage $StageOut
if ($LASTEXITCODE -ne 0) { throw 'package.py failed' }
if (-not (Test-Path $ZipOut -PathType Leaf)) { throw "expected zip missing: $ZipOut" }

Step '6/6 verify (same gate as CI)'
if (-not $SkipVerify) {
  & $StagedExe --check-resources -- $RepoRoot
  if ($LASTEXITCODE -ne 0) { throw '--check-resources failed' }
} else {
  Write-Output 'skipped (--SkipVerify)'
}

Write-Output ''
Write-Output 'Done. Run it:'
Write-Output ("  <space-free-dir>\LeetCodeLab\leetlab-app.exe   (from $ZipOut)")
Write-Output 'Full test suite (needs JDK + g++ on PATH, writable temp inside checkout):'
Write-Output '  $env:TMP="desktop/target/cargo-tmp"; $env:TEMP="desktop/target/cargo-tmp"'
Write-Output '  cargo test --manifest-path desktop/Cargo.toml --workspace --locked'
