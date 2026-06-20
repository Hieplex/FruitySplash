param(
  [string]$PackageName = 'com.hieplex.fruitysplash',
  [int]$Seconds = 30,
  [string]$AdbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $AdbPath)) {
  throw "adb not found at $AdbPath"
}

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outputDir = Join-Path $ProjectRoot "artifacts\perf\$timestamp"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Write-Output "Launching $PackageName and clearing old Android frame/log data..."
& $AdbPath shell monkey -p $PackageName 1 | Out-Null
Start-Sleep -Seconds 2
& $AdbPath logcat -c
& $AdbPath shell dumpsys gfxinfo $PackageName reset | Out-Null

Write-Output "Capture started for $Seconds seconds."
Write-Output "Use boosters and trigger cascades on the phone now."
Start-Sleep -Seconds $Seconds

$gfxInfoPath = Join-Path $outputDir 'gfxinfo.txt'
$frameStatsPath = Join-Path $outputDir 'gfxinfo-framestats.txt'
$logcatPath = Join-Path $outputDir 'logcat.txt'

& $AdbPath shell dumpsys gfxinfo $PackageName | Out-File -Encoding utf8 $gfxInfoPath
& $AdbPath shell dumpsys gfxinfo $PackageName framestats | Out-File -Encoding utf8 $frameStatsPath
& $AdbPath logcat -d -v time | Out-File -Encoding utf8 $logcatPath

Write-Output "Saved Android perf capture:"
Write-Output $outputDir
