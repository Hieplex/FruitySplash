param(
  [string]$BackupRoot = ("C:\Apps\FruitySplash-asset-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$jobs = @(
  @{ Paths = @("C:\Apps\FruitySplash\assets\fruity\gamelogo.png"); MaxWidth = 768; MaxHeight = 768 },
  @{ Paths = @("C:\Apps\FruitySplash\assets\fruity\button-play.png", "C:\Apps\FruitySplash\assets\fruity\button-exit.png"); MaxWidth = 768; MaxHeight = 320 },
  @{ Paths = @(
      "C:\Apps\FruitySplash\assets\fruity\Buttons\Home.png",
      "C:\Apps\FruitySplash\assets\fruity\Buttons\Map_Button.png",
      "C:\Apps\FruitySplash\assets\fruity\Buttons\Hammer.png",
      "C:\Apps\FruitySplash\assets\fruity\Buttons\SettingButton.png",
      "C:\Apps\FruitySplash\assets\fruity\Buttons\Bomb\Bomb.png",
      "C:\Apps\FruitySplash\assets\fruity\Buttons\Bomb\AnimateBomb.png"
    ); MaxWidth = 256; MaxHeight = 256 },
  @{ Paths = @("C:\Apps\FruitySplash\assets\Level\challenges\*.png"); MaxWidth = 256; MaxHeight = 256 },
  @{ Paths = @("C:\Apps\FruitySplash\assets\fruity\Fruit-type\*.png"); MaxWidth = 256; MaxHeight = 256 },
  @{ Paths = @("C:\Apps\FruitySplash\assets\Chapter\Fruits\*.png"); MaxWidth = 256; MaxHeight = 256 },
  @{ Paths = @("C:\Apps\FruitySplash\assets\Chapter\*.png"); MaxWidth = 900; MaxHeight = 900 },
  @{ Paths = @("C:\Apps\FruitySplash\assets\Chapter\Locked\*.png"); MaxWidth = 900; MaxHeight = 900 }
)

function Get-ExpandedPaths {
  param([string[]]$Patterns)

  $resolved = New-Object System.Collections.Generic.List[string]

  foreach ($pattern in $Patterns) {
    if ($pattern.Contains("*") -or $pattern.Contains("?")) {
      Get-ChildItem -Path $pattern -File | ForEach-Object {
        $resolved.Add($_.FullName)
      }
    } elseif (Test-Path -LiteralPath $pattern -PathType Leaf) {
      $resolved.Add((Resolve-Path -LiteralPath $pattern).Path)
    }
  }

  return $resolved.ToArray()
}

function Backup-File {
  param(
    [string]$Path,
    [string]$DestinationRoot
  )

  $relative = $Path.Substring("C:\Apps\FruitySplash\".Length)
  $destination = Join-Path $DestinationRoot $relative
  $destinationDir = Split-Path -Parent $destination
  if (-not (Test-Path -LiteralPath $destinationDir)) {
    New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
  }

  Copy-Item -LiteralPath $Path -Destination $destination -Force
}

function Resize-Png {
  param(
    [string]$Path,
    [int]$MaxWidth,
    [int]$MaxHeight
  )

  $bytes = [System.IO.File]::ReadAllBytes($Path)
  $memoryStream = New-Object System.IO.MemoryStream(,$bytes)
  $source = [System.Drawing.Image]::FromStream($memoryStream)
  try {
    $widthScale = $MaxWidth / [double]$source.Width
    $heightScale = $MaxHeight / [double]$source.Height
    $scale = [Math]::Min([Math]::Min($widthScale, $heightScale), 1.0)

    if ($scale -ge 0.999) {
      return $false
    }

    $targetWidth = [Math]::Max(1, [int][Math]::Round($source.Width * $scale))
    $targetHeight = [Math]::Max(1, [int][Math]::Round($source.Height * $scale))

    $bitmap = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $bitmap.SetResolution($source.HorizontalResolution, $source.VerticalResolution)
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.DrawImage($source, 0, 0, $targetWidth, $targetHeight)
      } finally {
        $graphics.Dispose()
      }

      $tempPath = "$Path.tmp.png"
      $bitmap.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
      Remove-Item -LiteralPath $Path -Force
      Move-Item -LiteralPath $tempPath -Destination $Path
      return $true
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $source.Dispose()
    $memoryStream.Dispose()
  }
}

$allPaths = New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::OrdinalIgnoreCase)
foreach ($job in $jobs) {
  foreach ($path in (Get-ExpandedPaths -Patterns $job.Paths)) {
    [void]$allPaths.Add($path)
  }
}

if ($allPaths.Count -eq 0) {
  Write-Output "No assets matched the optimization rules."
  exit 0
}

foreach ($path in $allPaths) {
  Backup-File -Path $path -DestinationRoot $BackupRoot
}

$optimizedCount = 0

foreach ($job in $jobs) {
  $paths = Get-ExpandedPaths -Patterns $job.Paths
  foreach ($path in $paths) {
    if (Resize-Png -Path $path -MaxWidth $job.MaxWidth -MaxHeight $job.MaxHeight) {
      $optimizedCount += 1
      Write-Output ("Optimized " + $path + " -> max " + $job.MaxWidth + "x" + $job.MaxHeight)
    }
  }
}

Write-Output ("Backup created at " + $BackupRoot)
Write-Output ("Optimized asset count: " + $optimizedCount)
