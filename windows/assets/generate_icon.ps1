Add-Type -AssemblyName System.Drawing

function Create-PetrosIcon {
    param (
        [string]$icoPath,
        [string]$pngPath
    )

    $sizes = @(256, 128, 64, 48, 32, 16)
    $bitmaps = @()

    foreach ($size in $sizes) {
        $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.Clear([System.Drawing.Color]::Transparent)

        # Scale factor
        $s = $size / 256.0

        # Background rounded shield / rounded rectangle
        $bgRect = New-Object System.Drawing.RectangleF (8 * $s), (8 * $s), (240 * $s), (240 * $s)
        $bgPath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $radius = 48.0 * $s
        $d = $radius * 2
        $bgPath.AddArc($bgRect.X, $bgRect.Y, $d, $d, 180, 90)
        $bgPath.AddArc($bgRect.Right - $d, $bgRect.Y, $d, $d, 270, 90)
        $bgPath.AddArc($bgRect.Right - $d, $bgRect.Bottom - $d, $d, $d, 0, 90)
        $bgPath.AddArc($bgRect.X, $bgRect.Bottom - $d, $d, $d, 90, 90)
        $bgPath.CloseFigure()

        # Dark gradient background
        $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (
            (New-Object System.Drawing.PointF 0, 0),
            (New-Object System.Drawing.PointF ($size), ($size)),
            [System.Drawing.Color]::FromArgb(255, 6, 12, 28),
            [System.Drawing.Color]::FromArgb(255, 2, 4, 10)
        )
        $g.FillPath($bgBrush, $bgPath)

        # Glowing cyan / emerald border
        $penBorder = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(220, 16, 185, 129)), (6 * $s)
        $g.DrawPath($penBorder, $bgPath)
        $penBorder.Dispose()

        # Subtle inner glow line
        $penInner = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(120, 56, 189, 248)), (2 * $s)
        $innerRect = New-Object System.Drawing.RectangleF (14 * $s), (14 * $s), (228 * $s), (228 * $s)
        $innerPath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $inRadius = 42.0 * $s
        $inD = $inRadius * 2
        $innerPath.AddArc($innerRect.X, $innerRect.Y, $inD, $inD, 180, 90)
        $innerPath.AddArc($innerRect.Right - $inD, $innerRect.Y, $inD, $inD, 270, 90)
        $innerPath.AddArc($innerRect.Right - $inD, $innerRect.Bottom - $inD, $inD, $inD, 0, 90)
        $innerPath.AddArc($innerRect.X, $innerRect.Bottom - $inD, $inD, $inD, 90, 90)
        $innerPath.CloseFigure()
        $g.DrawPath($penInner, $innerPath)
        $penInner.Dispose()
        $innerPath.Dispose()
        $bgPath.Dispose()

        # Draw Letter "P" with stylized autonomous tech accents
        $pPath = New-Object System.Drawing.Drawing2D.GraphicsPath
        # Stem of P
        $stemX = 72.0 * $s
        $stemY = 56.0 * $s
        $stemW = 30.0 * $s
        $stemH = 144.0 * $s
        $pPath.AddRectangle((New-Object System.Drawing.RectangleF $stemX, $stemY, $stemW, $stemH))

        # Upper loop of P
        $loopRect = New-Object System.Drawing.RectangleF (72.0 * $s), (56.0 * $s), (105.0 * $s), (85.0 * $s)
        $pPath.AddArc($loopRect.X, $loopRect.Y, $loopRect.Width, $loopRect.Height, 270, 180)
        $pPath.AddLine(($loopRect.X + $loopRect.Width/2), ($loopRect.Y + $loopRect.Height), ($loopRect.X), ($loopRect.Y + $loopRect.Height))
        $pPath.CloseFigure()

        # Cutout inside loop
        $cutRect = New-Object System.Drawing.RectangleF (102.0 * $s), (78.0 * $s), (48.0 * $s), (42.0 * $s)
        $cutPath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $cutPath.AddArc($cutRect.X, $cutRect.Y, $cutRect.Width, $cutRect.Height, 270, 180)
        $cutPath.AddLine(($cutRect.X + $cutRect.Width/2), ($cutRect.Y + $cutRect.Height), ($cutRect.X), ($cutRect.Y + $cutRect.Height))
        $cutPath.CloseFigure()

        $pBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (
            (New-Object System.Drawing.PointF ($stemX), ($stemY)),
            (New-Object System.Drawing.PointF ($stemX + 110 * $s), ($stemY + 144 * $s)),
            [System.Drawing.Color]::FromArgb(255, 52, 211, 153),
            [System.Drawing.Color]::FromArgb(255, 14, 165, 233)
        )
        $g.FillPath($pBrush, $pPath)
        
        # Hollow the loop center
        $g.FillPath($bgBrush, $cutPath)
        $bgBrush.Dispose()

        # Dot / accent core in bottom right
        $coreBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 245, 158, 11))
        $g.FillEllipse($coreBrush, (150.0 * $s), (160.0 * $s), (24.0 * $s), (24.0 * $s))
        $coreBrush.Dispose()

        $pBrush.Dispose()
        $pPath.Dispose()
        $cutPath.Dispose()
        $g.Dispose()

        $bitmaps += $bmp
    }

    # Save 256x256 as PNG
    $bitmaps[0].Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Build multi-resolution ICO file with PNG streams (standard format)
    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter $ms

    # ICO Header: Reserved (0), Type (1 = Icon), Count
    $bw.Write([uint16]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]$sizes.Count)

    $offset = 6 + (16 * $sizes.Count)
    $pngBytesList = @()

    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $bmpMs = New-Object System.IO.MemoryStream
        $bitmaps[$i].Save($bmpMs, [System.Drawing.Imaging.ImageFormat]::Png)
        $bytes = $bmpMs.ToArray()
        $pngBytesList += ,$bytes
        $bmpMs.Dispose()
    }

    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $s = $sizes[$i]
        $w = if ($s -ge 256) { 0 } else { [byte]$s }
        $h = if ($s -ge 256) { 0 } else { [byte]$s }
        $bw.Write([byte]$w)
        $bw.Write([byte]$h)
        $bw.Write([byte]0) # Color palette count
        $bw.Write([byte]0) # Reserved
        $bw.Write([uint16]1) # Color planes
        $bw.Write([uint16]32) # Bits per pixel
        $bw.Write([uint32]$pngBytesList[$i].Length) # Image size in bytes
        $bw.Write([uint32]$offset) # Offset
        $offset += $pngBytesList[$i].Length
    }

    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $bw.Write($pngBytesList[$i])
    }

    $bw.Flush()
    [System.IO.File]::WriteAllBytes($icoPath, $ms.ToArray())
    $bw.Dispose()
    $ms.Dispose()

    foreach ($b in $bitmaps) { $b.Dispose() }
    Write-Output "Successfully generated: $icoPath and $pngPath"
}

Create-PetrosIcon -icoPath "C:\Users\ELI\Petros\windows\assets\petros.ico" -pngPath "C:\Users\ELI\Petros\windows\assets\petros.png"
