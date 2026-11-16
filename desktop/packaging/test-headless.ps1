# Headless test entry: workspace cargo tests plus optional real-toolchain and
# binary checks under an isolated TEMP/profile root. Params: -AppBinary for the
# --check-resources probe, -JdkHome/-Cxx for ignored judge tests, -FullCurriculum
# for the parity export + curriculum suite. Gotcha: env vars are restored in
# `finally`; the isolated root is kept and its path printed for inspection.
param(
    [string]$AppBinary,
    [string]$JdkHome,
    [string]$Cxx,
    [switch]$FullCurriculum
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$manifest = Join-Path $repoRoot 'desktop/Cargo.toml'
$isolatedRoot = Join-Path $repoRoot ("desktop/target/headless test " + [guid]::NewGuid().ToString('N'))
$testTemp = Join-Path $isolatedRoot 'temp'
$testProfile = Join-Path $isolatedRoot 'profile'
New-Item -ItemType Directory -Path $testTemp, $testProfile | Out-Null
$previousTemp = $env:TEMP
$previousTmp = $env:TMP
$previousLocalAppData = $env:LOCALAPPDATA
$previousJdk = $env:LCLAB_JDK_HOME
$previousCxx = $env:LCLAB_CXX

function Invoke-HeadlessCheck([string]$Command, [string[]]$Arguments) {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command exited with code $LASTEXITCODE"
    }
}

try {
    $env:TEMP = $testTemp
    $env:TMP = $testTemp
    $env:LOCALAPPDATA = $testProfile
    $cargoTest = @('test', '--manifest-path', $manifest, '--locked', '--offline')
    Invoke-HeadlessCheck 'cargo' ($cargoTest + @('--workspace'))
    if ($JdkHome) { $env:LCLAB_JDK_HOME = (Resolve-Path -LiteralPath $JdkHome).Path }
    if ($Cxx) { $env:LCLAB_CXX = (Resolve-Path -LiteralPath $Cxx).Path }
    $appTest = $cargoTest + @('-p', 'leetlab-app')
    foreach ($filter in @('runs_real_java_and_cpp_cases', 'cancel_aborts_hung_run', 'run_timeout_fires_on_hung_solution')) {
        Invoke-HeadlessCheck 'cargo' ($appTest + @($filter, '--', '--ignored', '--test-threads=1'))
    }
    if ($FullCurriculum) {
        Invoke-HeadlessCheck 'node' @((Join-Path $repoRoot 'desktop/fixtures/export-parity-refs.mjs'))
        foreach ($filter in @('runs_curriculum_references', 'overlay_lessons_verify')) {
            Invoke-HeadlessCheck 'cargo' ($appTest + @($filter, '--', '--ignored', '--test-threads=1'))
        }
    }
    if ($AppBinary) {
        $app = (Resolve-Path -LiteralPath $AppBinary).Path
        Invoke-HeadlessCheck $app @('--check-resources')
    }
} finally {
    $env:TEMP = $previousTemp
    $env:TMP = $previousTmp
    $env:LOCALAPPDATA = $previousLocalAppData
    $env:LCLAB_JDK_HOME = $previousJdk
    $env:LCLAB_CXX = $previousCxx
    Write-Output "Isolated test files: $isolatedRoot"
}
