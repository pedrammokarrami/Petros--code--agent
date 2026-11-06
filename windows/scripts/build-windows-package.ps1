# Build script for Petros Windows Desktop Application
# Produces Petros.exe, Petros-Setup.exe, and Petros-Portable.zip

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$windowsDir = Join-Path $root "windows"
$stagingDir = Join-Path $windowsDir "staging"
$releaseDir = Join-Path $root "release"

Write-Host "===================================================="
Write-Host " Building Petros Windows Desktop Application"
Write-Host " Root: $root"
Write-Host "===================================================="

# 1. Ensure icons exist
Write-Host "[1/7] Generating icons..."
& powershell -ExecutionPolicy Bypass -File (Join-Path $windowsDir "assets\generate_icon.ps1")

# 2. Build production web and server bundles
Write-Host "[2/7] Bundling server..."
Set-Location $root
& npx esbuild server.ts --bundle --platform=node --format=cjs --external:vite --external:esbuild --external:@vitejs/* --external:lightningcss --outfile=dist/server.cjs

# 3. Compile native C# GUI Launcher (Petros.exe)
Write-Host "[3/7] Compiling native Petros.exe launcher..."
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    throw "C# compiler not found at $csc"
}
$launcherCs = Join-Path $windowsDir "launcher\PetrosLauncher.cs"
$launcherOut = Join-Path $windowsDir "launcher\Petros.exe"
$iconPath = Join-Path $windowsDir "assets\petros.ico"

& $csc /target:winexe /platform:x64 /optimize+ "/win32icon:$iconPath" "/out:$launcherOut" "$launcherCs"

# 4. Assemble staging directory
Write-Host "[4/7] Assembling staging directory..."
if (Test-Path $stagingDir) { Remove-Item $stagingDir -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $stagingDir "runtime") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stagingDir "scripts") -Force | Out-Null
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

Copy-Item $launcherOut (Join-Path $stagingDir "Petros.exe") -Force
Copy-Item $iconPath (Join-Path $stagingDir "petros.ico") -Force
Copy-Item "C:\Program Files\nodejs\node.exe" (Join-Path $stagingDir "runtime\node.exe") -Force
Copy-Item (Join-Path $root "dist") (Join-Path $stagingDir "dist") -Recurse -Force
Copy-Item (Join-Path $root "package.json") (Join-Path $stagingDir "package.json") -Force
Copy-Item (Join-Path $root "README-WINDOWS.md") (Join-Path $stagingDir "README-WINDOWS.md") -Force
Copy-Item (Join-Path $root "scripts\run-petros-windows.bat") (Join-Path $stagingDir "scripts\run-petros-windows.bat") -Force

# Clean unwanted artifacts from dist in staging
Remove-Item (Join-Path $stagingDir "dist\screenshots") -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $stagingDir "dist\server.cjs.orig") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $stagingDir "dist\server.bundle.cjs") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $stagingDir "dist\server.cjs.map") -Force -ErrorAction SilentlyContinue

# 5. Compile Inno Setup installer
Write-Host "[5/7] Compiling installer with Inno Setup..."
$isccCandidates = @(
    "C:\Users\ELI\AppData\Local\Programs\Inno Setup 6\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe"
)
$iscc = $isccCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($iscc) {
    & $iscc (Join-Path $windowsDir "installer\petros_setup.iss")
} else {
    Write-Warning "ISCC.exe not found. Skipping Inno Setup installer compilation."
}

# 6. Create Portable Zip
Write-Host "[6/7] Creating Petros-Portable.zip..."
$portableZip = Join-Path $releaseDir "Petros-Portable.zip"
if (Test-Path $portableZip) { Remove-Item $portableZip -Force }
Compress-Archive -Path "$stagingDir\*" -DestinationPath $portableZip -Force

# 7. Generate Checksums
Write-Host "[7/7] Generating SHA-256 checksums..."
Set-Location $releaseDir
$files = Get-ChildItem -Path $releaseDir | Where-Object { $_.Extension -in ".exe", ".zip" }
$files | Get-FileHash -Algorithm SHA256 | ForEach-Object { "$($_.Hash)  $($_.Path | Split-Path -Leaf)" } | Set-Content (Join-Path $releaseDir "SHA256SUMS.txt")

Write-Host "===================================================="
Write-Host " Windows Desktop Build Complete!"
Write-Host " Artifacts in: $releaseDir"
Get-ChildItem -Path $releaseDir | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
Write-Host "===================================================="
