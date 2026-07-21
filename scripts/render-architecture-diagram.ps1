param(
    [string]$OutputPath = (Join-Path $PSScriptRoot "..\docs\proxima-architecture.png")
)

Add-Type -AssemblyName System.Drawing

$width = 1920
$height = 1120
$bitmap = [System.Drawing.Bitmap]::new($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$graphics.Clear([System.Drawing.Color]::FromArgb(248, 250, 252))

$titleFont = [System.Drawing.Font]::new("Segoe UI Semibold", 33)
$subtitleFont = [System.Drawing.Font]::new("Segoe UI", 15)
$nodeTitleFont = [System.Drawing.Font]::new("Segoe UI Semibold", 18)
$nodeBodyFont = [System.Drawing.Font]::new("Segoe UI", 14)
$smallFont = [System.Drawing.Font]::new("Segoe UI Semibold", 12)
$muted = [System.Drawing.Color]::FromArgb(71, 85, 105)
$lineColor = [System.Drawing.Color]::FromArgb(100, 116, 139)

function Color([string]$value) { [System.Drawing.ColorTranslator]::FromHtml($value) }

function Draw-Box([int]$x, [int]$y, [int]$w, [int]$h, [string]$fill, [string]$stroke, [string]$title, [string]$body) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $radius = 20
    $path.AddArc($x, $y, $radius, $radius, 180, 90)
    $path.AddArc($x + $w - $radius, $y, $radius, $radius, 270, 90)
    $path.AddArc($x + $w - $radius, $y + $h - $radius, $radius, $radius, 0, 90)
    $path.AddArc($x, $y + $h - $radius, $radius, $radius, 90, 90)
    $path.CloseFigure()
    $brush = [System.Drawing.SolidBrush]::new((Color $fill))
    $pen = [System.Drawing.Pen]::new((Color $stroke), 2)
    $graphics.FillPath($brush, $path)
    $graphics.DrawPath($pen, $path)
    $titleBrush = [System.Drawing.SolidBrush]::new((Color "#0F172A"))
    $bodyBrush = [System.Drawing.SolidBrush]::new($muted)
    $format = [System.Drawing.StringFormat]::new()
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $graphics.DrawString($title, $nodeTitleFont, $titleBrush, [System.Drawing.RectangleF]::new($x + 15, $y + 16, $w - 30, 31), $format)
    $graphics.DrawString($body, $nodeBodyFont, $bodyBrush, [System.Drawing.RectangleF]::new($x + 18, $y + 54, $w - 36, $h - 65), $format)
    $format.Dispose(); $titleBrush.Dispose(); $bodyBrush.Dispose(); $pen.Dispose(); $brush.Dispose(); $path.Dispose()
}

function Draw-Arrow([int]$x1, [int]$y1, [int]$x2, [int]$y2, [string]$label, [bool]$dashed = $false) {
    $pen = [System.Drawing.Pen]::new($lineColor, 3)
    if ($dashed) { $pen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash }
    $graphics.DrawLine($pen, $x1, $y1, $x2, $y2)
    $dx = [double]($x2 - $x1); $dy = [double]($y2 - $y1); $length = [Math]::Sqrt($dx * $dx + $dy * $dy)
    if ($length -gt 0) {
        $ux = $dx / $length; $uy = $dy / $length; $size = 12
        $points = [System.Drawing.PointF[]]@(
            [System.Drawing.PointF]::new($x2, $y2),
            [System.Drawing.PointF]::new($x2 - $size * $ux + $size * $uy * 0.55, $y2 - $size * $uy - $size * $ux * 0.55),
            [System.Drawing.PointF]::new($x2 - $size * $ux - $size * $uy * 0.55, $y2 - $size * $uy + $size * $ux * 0.55)
        )
        $arrowBrush = [System.Drawing.SolidBrush]::new($lineColor)
        $graphics.FillPolygon($arrowBrush, $points)
        $arrowBrush.Dispose()
    }
    if ($label) {
        $labelBrush = [System.Drawing.SolidBrush]::new($muted)
        $format = [System.Drawing.StringFormat]::new(); $format.Alignment = [System.Drawing.StringAlignment]::Center
        $mx = ($x1 + $x2) / 2; $my = ($y1 + $y2) / 2 - 20
        $graphics.FillRectangle([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(248, 250, 252)), $mx - 70, $my - 3, 140, 23)
        $graphics.DrawString($label, $smallFont, $labelBrush, [System.Drawing.RectangleF]::new($mx - 70, $my, 140, 20), $format)
        $format.Dispose(); $labelBrush.Dispose()
    }
    $pen.Dispose()
}

$darkBrush = [System.Drawing.SolidBrush]::new((Color "#0F172A"))
$subBrush = [System.Drawing.SolidBrush]::new($muted)
$graphics.DrawString("Proxima Architecture", $titleFont, $darkBrush, 70, 52)
$graphics.DrawString("Production request paths, state boundaries, and scheduled social work", $subtitleFont, $subBrush, 72, 104)

Draw-Box 70 340 210 120 "#E0F2FE" "#38BDF8" "Browser" "Next.js interface`nAuthenticated user session"
Draw-Box 360 340 220 120 "#DBEAFE" "#60A5FA" "Next.js app" "Pages, components,`nand API route handler"
Draw-Box 660 340 210 120 "#EDE9FE" "#A78BFA" "API proxy" "/api/* to /api/v1/*`nServer-side forwarding"
Draw-Box 950 225 410 370 "#ECFDF5" "#34D399" "FastAPI service" "Auth and workflows`nApprovals and history`nSocial, tools, integrations`nMemory, health, and metrics"
Draw-Box 1480 150 310 120 "#FEF3C7" "#F59E0B" "State store" "Users, workflows, approvals,`nconnections, campaigns, audit"
Draw-Box 1480 360 310 115 "#FCE7F3" "#F472B6" "Media storage" "Uploads and generated images`nserved from /media"
Draw-Box 1480 570 310 130 "#FFF7ED" "#FB923C" "Provider APIs" "OAuth providers, Slack, Gmail,`nCalendar, Notion, X, LinkedIn,`nFacebook Pages, WhatsApp"
Draw-Box 950 760 410 125 "#F1F5F9" "#94A3B8" "Social scheduler" "In-process loop checks due posts`nand recurring campaigns every 30s"
Draw-Box 1435 805 165 100 "#F8FAFC" "#CBD5E1" "Local JSON" "state.json"
Draw-Box 1630 805 165 100 "#F8FAFC" "#CBD5E1" "PostgreSQL" "JSONB state"

Draw-Arrow 280 400 360 400 "renders"
Draw-Arrow 580 400 660 400 "/api"
Draw-Arrow 870 400 950 400 "/api/v1"
Draw-Arrow 1360 300 1480 230 "read / write"
Draw-Arrow 1360 405 1480 417 "stores"
Draw-Arrow 1360 530 1480 635 "OAuth + delivery"
Draw-Arrow 1155 760 1155 595 "due work"
Draw-Arrow 1535 270 1515 805 ""
Draw-Arrow 1735 270 1712 805 ""
Draw-Arrow 175 460 1030 595 "WebSocket /ws" $true

$legendPen = [System.Drawing.Pen]::new($lineColor, 3); $legendPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
$graphics.DrawLine($legendPen, 78, 1002, 132, 1002)
$graphics.DrawString("Direct browser-to-backend live updates", $subtitleFont, $subBrush, 145, 990)
$graphics.DrawString("Scheduled publishing requires the backend process to stay awake.", $subtitleFont, $subBrush, 970, 990)

$outputDirectory = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$legendPen.Dispose(); $darkBrush.Dispose(); $subBrush.Dispose()
$titleFont.Dispose(); $subtitleFont.Dispose(); $nodeTitleFont.Dispose(); $nodeBodyFont.Dispose(); $smallFont.Dispose()
$graphics.Dispose(); $bitmap.Dispose()

Write-Output "Rendered $OutputPath"
