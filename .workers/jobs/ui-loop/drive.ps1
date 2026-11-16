#Requires -Version 5.1
<#
.SYNOPSIS
  UI loop driver (task-8): capture the AUTOSTART matrix on Display5.

.DESCRIPTION
  For each LCLAB_AUTOSTART state (see desktop/crates/app/src/main.rs
  TEMP-SCREENSHOT scaffolding, "slug,panel,theme[,settings]"):
    home     = ''                          (plain launch)
    solve    = 'two-sum,solve,light'
    learn    = 'two-sum,learn,light'
    practice = 'two-sum,practice,light'
    settings = 'two-sum,solve,light,settings'
    darkplus = 'two-sum,solve,darkplus'

  launches desktop/target/pkg-win-final/LeetCodeLab/leetlab-app.exe, waits
  for MainWindowHandle, moves it to (2570,330,1130x840) on Display5, waits
  for paint, captures with CopyFromScreen to shots/<name>.png, kills the
  process, then writes shots/latest.json { at, shots[] }.

  Hard rules (task-8):
    - AUTOSTART navigation ONLY. No SendKeys/SendInput/SetCursorPos/mouse_event,
      no clipboard use anywhere in this script.
    - Every launched process is killed (per-state try/finally).
    - Primary display is never touched: window/capture X is always >= 2570
      (Display5 starts at X=2560). The script aborts if WinX < 2570 or the
      rect is not fully inside a non-primary screen.

.PARAMETER DryRun
  Validate only: list screens, check the exe, the matrix and rect
  containment, show the latest.json shape. Launches nothing.

.NOTES
  Owns ONLY this file + watch.ps1 (task-8). diff.py / baselines / LOOP.md
  belong to the teammate (task-9) — do not create them here.
#>
[CmdletBinding()]
param(
  [switch]$DryRun,
  [int]$LaunchTimeoutSeconds = 30,
  [int]$SettleSeconds = 3,
  [int]$WinX = 2570,
  [int]$WinY = 330,
  [int]$WinW = 1130,
  [int]$WinH = 840
)

$ErrorActionPreference = 'Stop'

# --- safety: never touch the primary display --------------------------------
if ($WinX -lt 2570) { throw "refusing: WinX=$WinX < 2570 would touch the primary display" }

$RepoRoot  = Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
$Exe       = Join-Path $RepoRoot 'desktop\target\pkg-win-final\LeetCodeLab\leetlab-app.exe'
$ShotsDir  = Join-Path $PSScriptRoot 'shots'
$Latest    = Join-Path $PSScriptRoot 'shots\latest.json'

$Matrix = @(
  @{ Name = 'home';     Autostart = '' },
  @{ Name = 'solve';    Autostart = 'two-sum,solve,light' },
  @{ Name = 'learn';    Autostart = 'two-sum,learn,light' },
  @{ Name = 'practice'; Autostart = 'two-sum,practice,light' },
  @{ Name = 'settings'; Autostart = 'two-sum,solve,light,settings' },
  @{ Name = 'darkplus'; Autostart = 'two-sum,solve,darkplus' }
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$moveSig = '[DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int W, int H, bool repaint);'
$winApi = Add-Type -MemberDefinition $moveSig -Name WinMoveUiLoop -Namespace UiLoop -PassThru

function Get-ScreenReport {
  [System.Windows.Forms.Screen]::AllScreens | ForEach-Object {
    [pscustomobject]@{
      Device  = $_.DeviceName
      Primary = $_.Primary
      X       = $_.Bounds.X
      Y       = $_.Bounds.Y
      W       = $_.Bounds.Width
      H       = $_.Bounds.Height
    }
  }
}

function Test-RectOnSecondary($Screens) {
  foreach ($s in $Screens) {
    if (-not $s.Primary -and
        $WinX -ge $s.X -and $WinY -ge $s.Y -and
        ($WinX + $WinW) -le ($s.X + $s.W) -and
        ($WinY + $WinH) -le ($s.Y + $s.H)) {
      return $s.Device
    }
  }
  return $null
}

$screens = Get-ScreenReport
Write-Output 'SCREENS:'
$screens | ForEach-Object {
  Write-Output ("  {0} primary={1} bounds=({2},{3},{4}x{5})" -f $_.Device, $_.Primary, $_.X, $_.Y, $_.W, $_.H)
}

$hostScreen = Test-RectOnSecondary $screens
if ($null -eq $hostScreen) {
  throw ("rect ({0},{1},{2}x{3}) is not fully inside a non-primary screen; aborting" -f $WinX, $WinY, $WinW, $WinH)
}
Write-Output "RECT_OK: ($WinX,$WinY,${WinW}x${WinH}) inside $hostScreen"

if (-not (Test-Path $Exe -PathType Leaf)) { throw "staged exe missing: $Exe" }
Write-Output "EXE_OK: $Exe"

if ($DryRun) {
  Write-Output 'DRYRUN_MATRIX:'
  foreach ($m in $Matrix) { Write-Output ("  {0} <- LCLAB_AUTOSTART='{1}'" -f $m.Name, $m.Autostart) }
  Write-Output ("DRYRUN_SHOTS_DIR: {0}" -f $ShotsDir)
  Write-Output 'DRYRUN_LATEST_SHAPE: { at: <iso8601>, shots: [ { name, file, autostart, at } ] }'
  Write-Output 'DRYRUN_DONE: launched nothing, captured nothing'
  return
}

New-Item -ItemType Directory -Force -Path $ShotsDir | Out-Null
$results = @()

foreach ($state in $Matrix) {
  $shotPath = Join-Path $ShotsDir ("{0}.png" -f $state.Name)
  $p = $null
  try {
    if ([string]::IsNullOrEmpty($state.Autostart)) {
      Remove-Item Env:\LCLAB_AUTOSTART -ErrorAction SilentlyContinue
    } else {
      $env:LCLAB_AUTOSTART = $state.Autostart
    }
    Write-Output ("LAUNCH: {0} (LCLAB_AUTOSTART='{1}')" -f $state.Name, $state.Autostart)
    $p = Start-Process -FilePath $Exe -PassThru
    $tries = 0
    while ($tries -lt ($LaunchTimeoutSeconds * 2) -and $p.MainWindowHandle -eq 0) {
      Start-Sleep -Milliseconds 500
      $p.Refresh()
      $tries++
    }
    if ($p.MainWindowHandle -eq 0) { throw ("no MainWindowHandle for {0} after {1}s" -f $state.Name, $LaunchTimeoutSeconds) }
    [void]$winApi::MoveWindow($p.MainWindowHandle, $WinX, $WinY, $WinW, $WinH, $true)
    Start-Sleep -Seconds $SettleSeconds
    $rect = New-Object System.Drawing.Rectangle($WinX, $WinY, $WinW, $WinH)
    $bmp = New-Object System.Drawing.Bitmap($rect.Width, $rect.Height)
    try {
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      try {
        $g.CopyFromScreen($rect.Location, [System.Drawing.Point]::Empty, $rect.Size)
      } finally {
        $g.Dispose()
      }
      $bmp.Save($shotPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $bmp.Dispose()
    }
    Write-Output "SHOT_OK: $shotPath"
    $results += [pscustomobject]@{
      name      = $state.Name
      file      = ("shots/{0}.png" -f $state.Name)
      autostart = $state.Autostart
      at        = (Get-Date).ToString('o')
    }
  } catch {
    Write-Output ("SHOT_FAIL: {0}: {1}" -f $state.Name, $_.Exception.Message)
    throw
  } finally {
    Remove-Item Env:\LCLAB_AUTOSTART -ErrorAction SilentlyContinue
    if ($null -ne $p -and -not $p.HasExited) {
      Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
      Write-Output ("KILLED: {0} (pid {1})" -f $state.Name, $p.Id)
    }
  }
}

$latest = [pscustomobject]@{
  at    = (Get-Date).ToString('o')
  shots = $results
}
($latest | ConvertTo-Json -Depth 4) | Set-Content -Path $Latest -Encoding UTF8
Write-Output "LATEST_JSON: $Latest ($($results.Count) shots)"
