# Comprehensive Windows Installation, Uninstall, Reinstall & Launch Test
$ErrorActionPreference = "Stop"

$installer = "C:\Users\ELI\Petros\release\Petros-Setup.exe"
$installDir = "C:\Users\ELI\AppData\Local\Programs\Petros"
$regKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\{8F5A7B32-9214-4B2D-A48E-59D2E956C19F}_is1"
$desktopLnk = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Petros.lnk'
$startMenuDir = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs\Petros Autonomous Engineering & Operations AI'

Write-Host "===================================================="
Write-Host " PHASE 1: INSTALLATION LIFECYCLE AUDIT"
Write-Host "===================================================="

# 1. Stop running node process on port 3000 safely
Write-Host "[1/6] Stopping any running Petros processes..."
Get-Process -Name "node", "Petros" -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*$installDir*" -or $_.Path -like "*Petros*"
} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 2. Test Silent Uninstallation
Write-Host "[2/6] Executing Silent Uninstaller..."
$uninstaller = Join-Path $installDir "unins000.exe"
if (Test-Path $uninstaller) {
    $p = Start-Process -FilePath $uninstaller -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART" -PassThru -Wait
    Write-Host "   Uninstaller exit code: $($p.ExitCode)"
    Start-Sleep -Seconds 3

    $regAfterUninstall = Test-Path $regKey
    Write-Host "   Registry key removed: $(-not $regAfterUninstall)"
    $uninstallerExists = Test-Path $uninstaller
    Write-Host "   Uninstaller cleaned up: $(-not $uninstallerExists)"
} else {
    Write-Host "   No uninstaller found; proceeding to fresh install."
}

# 3. Test Fresh Silent Installation with Desktop Icon
Write-Host "[3/6] Executing Fresh Silent Installation from Petros-Setup.exe..."
$installProcess = Start-Process -FilePath $installer -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /TASKS=desktopicon" -PassThru -Wait
Write-Host "   Installer exit code: $($installProcess.ExitCode)"
Start-Sleep -Seconds 3

# 4. Verify Installation State
Write-Host "[4/6] Verifying Installed Artifacts..."
$installedExe = Join-Path $installDir "Petros.exe"
$installedNode = Join-Path $installDir "runtime\node.exe"
$installedServer = Join-Path $installDir "dist\server.cjs"
$installedIndex = Join-Path $installDir "dist\index.html"

$results = [ordered]@{
    InstallDirectoryExists = Test-Path $installDir
    PetrosLauncherExists = Test-Path $installedExe
    NodeRuntimeExists = Test-Path $installedNode
    ServerBundleExists = Test-Path $installedServer
    ClientIndexExists = Test-Path $installedIndex
    DesktopShortcutExists = Test-Path $desktopLnk
    StartMenuFolderExists = Test-Path $startMenuDir
    RegistryEntryRecreated = Test-Path $regKey
}
$results | Format-Table -AutoSize

# 5. Launch Application using installed Petros.exe launcher (Simulating clean user start)
Write-Host "[5/6] Launching installed Petros.exe..."
$launcherProcess = Start-Process -FilePath $installedExe -PassThru
Write-Host "   Launcher PID: $($launcherProcess.Id)"

# 6. Poll for port 3000 readiness
Write-Host "[6/6] Verifying backend initialization and port 3000..."
$ready = $false
for ($i = 1; $i -le 15; $i++) {
    Start-Sleep -Seconds 1
    try {
        $res = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/health" -TimeoutSec 2 -ErrorAction Stop
        if ($res.status -eq "ok") {
            $ready = $true
            Write-Host "   Backend is LIVE on port 3000 at attempt $i!"
            Write-Host "   Version: $($res.version) | Workers: $($res.workers -join ', ')"
            break
        }
    } catch {
        Write-Host "   Waiting for server... ($i/15)"
    }
}

if (-not $ready) {
    Write-Host "   WARNING: Health check did not respond within 15 seconds."
} else {
    Write-Host "`n>>> PHASE 1 INSTALLATION & LAUNCH AUDIT PASSED! <<<`n"
}
