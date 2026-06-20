Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot

$Targets = @(
  @{ Path = 'assets/Coins/Coins.png'; Max = 256 },
  @{ Path = 'assets/Coins/0.png'; Max = 128 },
  @{ Path = 'assets/Coins/1.png'; Max = 128 },
  @{ Path = 'assets/Coins/2.png'; Max = 128 },
  @{ Path = 'assets/Coins/3.png'; Max = 128 },
  @{ Path = 'assets/Coins/4.png'; Max = 128 },
  @{ Path = 'assets/Coins/5.png'; Max = 128 },
  @{ Path = 'assets/Coins/6.png'; Max = 128 },
  @{ Path = 'assets/Coins/7.png'; Max = 128 },
  @{ Path = 'assets/Coins/8.png'; Max = 128 },
  @{ Path = 'assets/Coins/9.png'; Max = 128 },
  @{ Path = 'assets/Level/Sockets/Socket.png'; Max = 256 },
  @{ Path = 'assets/fruity/Bar/emptystar-square.png'; Max = 192 },
  @{ Path = 'assets/fruity/Bar/fullstar-square.png'; Max = 192 },
  @{ Path = 'assets/fruity/Buttons/Bomb/BombButton.png'; Max = 512 },
  @{ Path = 'assets/fruity/Buttons/Bomb/Bomb.png'; Max = 512 },
  @{ Path = 'assets/fruity/Buttons/Bomb/BombExploded.png'; Max = 512 },
  @{ Path = 'assets/fruity/Buttons/Bomb/bomb-shockwave.png'; Max = 512 },
  @{ Path = 'assets/fruity/Buttons/FruityCross/Down.png'; Max = 512 },
  @{ Path = 'assets/fruity/Buttons/FruityCross/FruityCross.png'; Max = 512 },
  @{ Path = 'assets/fruity/Buttons/FruityCross/FruityCrossGroup.png'; Max = 512 },
  @{ Path = 'assets/fruity/Buttons/FruityCross/left.png'; Max = 512 },
  @{ Path = 'assets/fruity/Buttons/FruityCross/Right.png'; Max = 512 },
  @{ Path = 'assets/fruity/Buttons/FruityCross/Top.png'; Max = 512 },
  @{ Path = 'assets/fruity/Buttons/Hammer.png'; Max = 512 },
  @{ Path = 'assets/fruity/Buttons/Home.png'; Max = 384 },
  @{ Path = 'assets/fruity/Buttons/LightningFruits/GroundLightning.png'; Max = 512 },
  @{ Path = 'assets/fruity/Buttons/LightningFruits/LightningComeDown.png'; Max = 768 },
  @{ Path = 'assets/fruity/Buttons/LightningFruits/LightningFruits.png'; Max = 512 },
  @{ Path = 'assets/fruity/Buttons/LineRocket/LineRocket.png'; Max = 512 },
  @{ Path = 'assets/fruity/Buttons/LineRocket/LineRocketImg.png'; Max = 512 },
  @{ Path = 'assets/fruity/Buttons/LineRocket/LineRocketThrustBig.png'; Max = 512 },
  @{ Path = 'assets/fruity/Buttons/LineRocket/LineRocketThrustSmall.png'; Max = 512 },
  @{ Path = 'assets/fruity/Buttons/Map_Button.png'; Max = 384 },
  @{ Path = 'assets/fruity/Buttons/Return.png'; Max = 384 },
  @{ Path = 'assets/fruity/Buttons/SettingScreen/Exit.png'; Max = 384 },
  @{ Path = 'assets/fruity/Buttons/SettingScreen/ScreenSetting.png'; Max = 768 },
  @{ Path = 'assets/fruity/Buttons/SettingScreen/SettingButton.png'; Max = 384 },
  @{ Path = 'assets/fruity/Fruit-type/Apple/AppleCross.png'; Max = 512 },
  @{ Path = 'assets/fruity/Fruit-type/Apple/AppleHorizontal.png'; Max = 512 },
  @{ Path = 'assets/fruity/Fruit-type/Apple/AppleVertical.png'; Max = 512 },
  @{ Path = 'assets/fruity/Fruit-type/Blueberry/BlueberryCross.png'; Max = 512 },
  @{ Path = 'assets/fruity/Fruit-type/Blueberry/BlueberryHorizontal.png'; Max = 512 },
  @{ Path = 'assets/fruity/Fruit-type/Blueberry/BlueberryVertical.png'; Max = 512 },
  @{ Path = 'assets/fruity/Fruit-type/Grape/GrapeCross.png'; Max = 512 },
  @{ Path = 'assets/fruity/Fruit-type/Grape/GrapeHorizontal.png'; Max = 512 },
  @{ Path = 'assets/fruity/Fruit-type/Grape/GrapeVertical.png'; Max = 512 },
  @{ Path = 'assets/fruity/Fruit-type/Orange/OrangeCross.png'; Max = 512 },
  @{ Path = 'assets/fruity/Fruit-type/Orange/OrangeHorizontal.png'; Max = 512 },
  @{ Path = 'assets/fruity/Fruit-type/Orange/OrangeVertical.png'; Max = 512 },
  @{ Path = 'assets/fruity/Fruit-type/Strawberry/StrawberryCross.png'; Max = 512 },
  @{ Path = 'assets/fruity/Fruit-type/Strawberry/StrawberryHorizontal.png'; Max = 512 },
  @{ Path = 'assets/fruity/Fruit-type/Strawberry/StrawberryVertical.png'; Max = 512 }
)

function Save-ResizedPng {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][int]$MaxDimension
  )

  $absolutePath = Join-Path $ProjectRoot $Path
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    Write-Warning "Missing $Path"
    return
  }

  $bytes = [System.IO.File]::ReadAllBytes($absolutePath)
  $stream = New-Object System.IO.MemoryStream(,$bytes)
  $source = [System.Drawing.Image]::FromStream($stream)
  try {
    $oldWidth = $source.Width
    $oldHeight = $source.Height
    $oldSize = (Get-Item -LiteralPath $absolutePath).Length
    $largest = [Math]::Max($oldWidth, $oldHeight)

    if ($largest -le $MaxDimension) {
      Write-Output "skip $Path $oldWidth x $oldHeight"
      return
    }

    $scale = $MaxDimension / $largest
    $newWidth = [Math]::Max(1, [int][Math]::Round($oldWidth * $scale))
    $newHeight = [Math]::Max(1, [int][Math]::Round($oldHeight * $scale))
    $bitmap = New-Object System.Drawing.Bitmap($newWidth, $newHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($source, 0, 0, $newWidth, $newHeight)
      } finally {
        $graphics.Dispose()
      }

      $tempPath = "$absolutePath.tmp.png"
      $bitmap.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
      $newSize = (Get-Item -LiteralPath $tempPath).Length

      if ($newSize -lt $oldSize) {
        Remove-Item -LiteralPath $absolutePath -Force
        Move-Item -LiteralPath $tempPath -Destination $absolutePath
        $savedKb = [Math]::Round(($oldSize - $newSize) / 1KB, 1)
        Write-Output "resize $Path $oldWidth x $oldHeight -> $newWidth x $newHeight saved ${savedKb}KB"
      } else {
        Remove-Item -LiteralPath $tempPath -Force
        Write-Output "keep $Path resized file was not smaller"
      }
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $source.Dispose()
    $stream.Dispose()
  }
}

foreach ($target in $Targets) {
  Save-ResizedPng -Path $target.Path -MaxDimension $target.Max
}
