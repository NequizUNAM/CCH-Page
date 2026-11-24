Add-Type -AssemblyName System.Drawing

function Create-CCH-Icon {
    param(
        [int]$size,
        [string]$type = "standard" # standard, round, foreground
    )
    
    $bmp = [System.Drawing.Bitmap]::new($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $cAzul = [System.Drawing.Color]::FromArgb(0, 38, 99)       # #002663
    $cAzulNoche = [System.Drawing.Color]::FromArgb(0, 20, 56)  # #001438
    $cOro = [System.Drawing.Color]::FromArgb(213, 159, 15)     # #D59F0F
    $cOroClaro = [System.Drawing.Color]::FromArgb(248, 205, 80)# #F8CD50
    $cBlanco = [System.Drawing.Color]::FromArgb(255, 255, 255)
    $cSombra = [System.Drawing.Color]::FromArgb(140, 0, 10, 30)

    $scale = if ($type -eq "foreground") { 0.68 } else { 0.90 }
    $center = [float]($size / 2)

    if ($type -eq "foreground") {
        $g.Clear([System.Drawing.Color]::Transparent)
    } elseif ($type -eq "round") {
        $g.Clear([System.Drawing.Color]::Transparent)
        $brushBg = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
            [System.Drawing.Point]::new(0, 0),
            [System.Drawing.Point]::new(0, $size),
            $cAzul, $cAzulNoche
        )
        $g.FillEllipse($brushBg, 1, 1, ($size - 2), ($size - 2))
        $penOro = [System.Drawing.Pen]::new($cOro, [float]([Math]::Max(2, $size * 0.045)))
        $g.DrawEllipse($penOro, [float]($size * 0.03), [float]($size * 0.03), [float]($size * 0.94), [float]($size * 0.94))
    } else {
        # Standard: squircle / rounded rect
        $g.Clear([System.Drawing.Color]::Transparent)
        $radius = [float]($size * 0.22)
        $rect = [System.Drawing.RectangleF]::new(1, 1, ($size - 2), ($size - 2))
        $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $path.AddArc($rect.X, $rect.Y, $radius * 2, $radius * 2, 180, 90)
        $path.AddArc($rect.Right - 2 * $radius, $rect.Y, $radius * 2, $radius * 2, 270, 90)
        $path.AddArc($rect.Right - 2 * $radius, $rect.Bottom - 2 * $radius, $radius * 2, $radius * 2, 0, 90)
        $path.AddArc($rect.X, $rect.Bottom - 2 * $radius, $radius * 2, $radius * 2, 90, 90)
        $path.CloseFigure()

        $brushBg = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
            [System.Drawing.Point]::new(0, 0),
            [System.Drawing.Point]::new(0, $size),
            $cAzul, $cAzulNoche
        )
        $g.FillPath($brushBg, $path)

        $penOro = [System.Drawing.Pen]::new($cOro, [float]([Math]::Max(2, $size * 0.038)))
        $g.DrawPath($penOro, $path)
    }

    # Círculo interior decorativo
    if ($type -eq "foreground" -or $size -ge 72) {
        $ringRadius = [float]($size * $scale * 0.46)
        $penRing = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(180, 213, 159, 15), [float]([Math]::Max(1.5, $size * 0.02)))
        $g.DrawEllipse($penRing, [float]($center - $ringRadius), [float]($center - $ringRadius), [float]($ringRadius * 2), [float]($ringRadius * 2))
    }

    $sf = [System.Drawing.StringFormat]::new()
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $brushOro = [System.Drawing.SolidBrush]::new($cOroClaro)
    $brushBlanco = [System.Drawing.SolidBrush]::new($cBlanco)
    $brushSombra = [System.Drawing.SolidBrush]::new($cSombra)

    # 1. Encabezado "UNAM"
    $fontUnamSize = [Math]::Max(5.5, [float]($size * $scale * 0.12))
    $fontUnam = [System.Drawing.Font]::new("Segoe UI", [float]$fontUnamSize, [System.Drawing.FontStyle]::Bold)
    $yUnam = [float]($center - ($size * $scale * 0.27))
    $g.DrawString("UNAM", $fontUnam, $brushSombra, [float]($center + 1), [float]($yUnam + 1), $sf)
    $g.DrawString("UNAM", $fontUnam, $brushOro, $center, $yUnam, $sf)

    # 2. Siglas centrales "CCH"
    $fontCchSize = [Math]::Max(9.0, [float]($size * $scale * 0.38))
    $fontCch = [System.Drawing.Font]::new("Arial Black", [float]$fontCchSize, [System.Drawing.FontStyle]::Bold)
    $yCch = [float]($center + ($size * $scale * 0.01))
    
    # Sombra doble
    $offset = [Math]::Max(1.0, [float]($size * 0.018))
    $g.DrawString("CCH", $fontCch, $brushSombra, [float]($center + $offset), [float]($yCch + $offset), $sf)
    # Contorno o relleno blanco con oro
    $g.DrawString("CCH", $fontCch, $brushBlanco, $center, $yCch, $sf)

    # 3. Dibujo de Laurel / Libro abierto estilizado en la parte inferior
    $yBook = [float]($center + ($size * $scale * 0.30))
    $bw = [float]($size * $scale * 0.32)
    $bh = [float]($size * $scale * 0.09)
    $penBook = [System.Drawing.Pen]::new($cOroClaro, [float]([Math]::Max(1.5, $size * 0.022)))
    
    # Páginas izquierda y derecha
    $g.DrawArc($penBook, [float]($center - $bw), [float]($yBook - $bh), [float]$bw, [float]($bh * 2), 0, -140)
    $g.DrawArc($penBook, [float]$center, [float]($yBook - $bh), [float]$bw, [float]($bh * 2), 180, 140)
    $g.DrawLine($penBook, $center, $yBook, $center, [float]($yBook + $bh * 0.6))

    $g.Dispose()
    return $bmp
}

# 1. Generar para Android mipmaps
$androidRes = "apk/android/app/src/main/res"
$densities = @(
    @{ Name = "mdpi"; Size = 48; ForeSize = 108 },
    @{ Name = "hdpi"; Size = 72; ForeSize = 162 },
    @{ Name = "xhdpi"; Size = 96; ForeSize = 216 },
    @{ Name = "xxhdpi"; Size = 144; ForeSize = 324 },
    @{ Name = "xxxhdpi"; Size = 192; ForeSize = 432 }
)

foreach ($d in $densities) {
    $dir = Join-Path $androidRes "mipmap-$($d.Name)"
    if (Test-Path $dir) {
        # ic_launcher.png
        $std = Create-CCH-Icon $d.Size "standard"
        $std.Save((Join-Path $dir "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $std.Dispose()

        # ic_launcher_round.png
        $rnd = Create-CCH-Icon $d.Size "round"
        $rnd.Save((Join-Path $dir "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $rnd.Dispose()

        # ic_launcher_foreground.png
        $fore = Create-CCH-Icon $d.ForeSize "foreground"
        $fore.Save((Join-Path $dir "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $fore.Dispose()

        Write-Output "Generated Android icons for $($d.Name)"
    }
}

# 2. Generar iconos PWA / Web para apk/www
$pwa512 = Create-CCH-Icon 512 "standard"
$pwa512.Save("apk/www/icon-512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$pwa512.Dispose()

$pwa192 = Create-CCH-Icon 192 "standard"
$pwa192.Save("apk/www/icon-192.png", [System.Drawing.Imaging.ImageFormat]::Png)
$pwa192.Dispose()

$favicon = Create-CCH-Icon 64 "round"
$favicon.Save("apk/www/favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$favicon.Dispose()

Write-Output "Generated PWA web icons in apk/www"
