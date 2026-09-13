<#
.SYNOPSIS
    One-line installer and updater for nikkePwned on Windows.

.DESCRIPTION
    Downloads the latest release of nikkePwned directly from GitHub Releases,
    places it in %LOCALAPPDATA%\Programs\nikkePwned, creates Start Menu and
    Desktop shortcuts, and registers an uninstaller in Windows Settings.

.EXAMPLE
    irm https://raw.githubusercontent.com/ScathachGrip/nikkePwned/master/install.ps1 | iex
#>

[CmdletBinding()]
param(
    [switch]$NoDesktopShortcut,
    [switch]$NoLaunch,
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

# Ensure TLS 1.2+ is active
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$RepoOwner = "ScathachGrip"
$RepoName  = "nikkePwned"
$AppName   = "nikkePwned"
$ExeName   = "nikkepwned.exe"

$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\$AppName"
$TargetExe  = Join-Path $InstallDir $ExeName
$StartMenuDir = [Environment]::GetFolderPath('Programs')
$StartMenuShortcut = Join-Path $StartMenuDir "$AppName.lnk"
$DesktopDir = [Environment]::GetFolderPath('Desktop')
$DesktopShortcut = Join-Path $DesktopDir "$AppName.lnk"
$RegistryPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$AppName"

# ---------------------------------------------------------------------------
# Helper: Create or remove Windows Shell Shortcuts
# ---------------------------------------------------------------------------
function Create-Shortcut {
    param(
        [string]$Path,
        [string]$TargetPath,
        [string]$Description,
        [string]$IconLocation
    )
    $wsh = New-Object -ComObject WScript.Shell
    $sc = $wsh.CreateShortcut($Path)
    $sc.TargetPath = $TargetPath
    $sc.WorkingDirectory = [System.IO.Path]::GetDirectoryName($TargetPath)
    $sc.Description = $Description
    if ($IconLocation) {
        $sc.IconLocation = "$IconLocation,0"
    }
    $sc.Save()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($sc) | Out-Null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($wsh) | Out-Null
}

# ---------------------------------------------------------------------------
# Helper: Uninstall routine
# ---------------------------------------------------------------------------
function Invoke-Uninstall {
    Write-Host "`n[nikkePwned] Starting uninstallation..." -ForegroundColor Yellow

    # Stop any running instances
    Get-Process -Name "nikkepwned" -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "Stopping running nikkePwned process (PID: $($_.Id))..." -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force
    }

    # Remove shortcuts
    if (Test-Path $StartMenuShortcut) {
        Remove-Item -Path $StartMenuShortcut -Force -ErrorAction SilentlyContinue
        Write-Host "Removed Start Menu shortcut." -ForegroundColor Gray
    }
    if (Test-Path $DesktopShortcut) {
        Remove-Item -Path $DesktopShortcut -Force -ErrorAction SilentlyContinue
        Write-Host "Removed Desktop shortcut." -ForegroundColor Gray
    }

    # Remove Registry uninstaller entry
    if (Test-Path $RegistryPath) {
        Remove-Item -Path $RegistryPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Removed Windows Settings uninstall entry." -ForegroundColor Gray
    }

    # Remove installation directory
    if (Test-Path $InstallDir) {
        # If running from inside the install dir, schedule self-deletion
        Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Removed application directory ($InstallDir)." -ForegroundColor Gray
    }

    Write-Host "`nnikkePwned has been successfully uninstalled from your system.`n" -ForegroundColor Green
}

# Check if uninstallation requested via switch
if ($Uninstall) {
    Invoke-Uninstall
    return
}

# ---------------------------------------------------------------------------
# Pre-flight Checks
# ---------------------------------------------------------------------------
Write-Host @"
==================================================================
                 __  __     ____                         __
   ____  ____   / /_/ /__  / __ \_      ______  ___  ___/ /
  / __ \/ __ \ / __/ //_/ / /_/ / | /| / / __ \/ _ \/ __  / 
 / / / / / / // /_/ ,<   / ____/| |/ |/ / / / /  __/ /_/ /  
/_/ /_/_/ /_/ \__/_/|_| /_/     |__/|__/_/ /_/\___/\__,_/   
                                                            
       The Automated Password Manager for NIKKE
==================================================================
"@ -ForegroundColor Cyan

# Check Architecture
$arch = $env:PROCESSOR_ARCHITECTURE
if ($arch -ne "AMD64" -and $arch -ne "x64") {
    Write-Warning "nikkePwned is built for 64-bit Windows ($arch detected). Proceeding, but binary compatibility might fail."
}

# Check running process
$running = Get-Process -Name "nikkepwned" -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "`nNotice: nikkePwned is currently running." -ForegroundColor Yellow
    Write-Host "Closing running process to allow updating binary..." -ForegroundColor Gray
    $running | ForEach-Object { Stop-Process -Id $_.Id -Force }
    Start-Sleep -Milliseconds 500
}

# ---------------------------------------------------------------------------
# Download latest binary
# ---------------------------------------------------------------------------
$downloadUrl = "https://github.com/$RepoOwner/$RepoName/releases/latest/download/$ExeName"
$tempExe = Join-Path $env:TEMP "nikkepwned_update_$([Guid]::NewGuid().ToString('N')).exe"

Write-Host "`nDownloading latest release..." -ForegroundColor Green
Write-Host "URL: $downloadUrl" -ForegroundColor Gray

try {
    # Use WebClient for smoother download progress
    $webClient = New-Object System.Net.WebClient
    $webClient.Headers.Add("User-Agent", "nikkePwned-Installer")
    $webClient.DownloadFile($downloadUrl, $tempExe)
}
catch {
    Write-Error "Failed to download $ExeName from GitHub Releases: $($_.Exception.Message)"
    if (Test-Path $tempExe) { Remove-Item -Force $tempExe }
    return
}

# ---------------------------------------------------------------------------
# Install binary
# ---------------------------------------------------------------------------
Write-Host "Installing to: $InstallDir" -ForegroundColor Green

if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

Move-Item -Path $tempExe -Destination $TargetExe -Force

# Create self-contained uninstall.ps1 in the installation directory
$uninstallerScript = @'
$InstallDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppName = "nikkePwned"
$StartMenuShortcut = Join-Path ([Environment]::GetFolderPath('Programs')) "$AppName.lnk"
$DesktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) "$AppName.lnk"
$RegistryPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$AppName"

Get-Process -Name "nikkepwned" -ErrorAction SilentlyContinue | Stop-Process -Force
if (Test-Path $StartMenuShortcut) { Remove-Item -Path $StartMenuShortcut -Force -ErrorAction SilentlyContinue }
if (Test-Path $DesktopShortcut) { Remove-Item -Path $DesktopShortcut -Force -ErrorAction SilentlyContinue }
if (Test-Path $RegistryPath) { Remove-Item -Path $RegistryPath -Recurse -Force -ErrorAction SilentlyContinue }

# Spawn independent cleanup job to delete folder after script exits
Start-Process powershell.exe -ArgumentList "-NoProfile -Command `"Start-Sleep -Seconds 1; Remove-Item -Path '$InstallDir' -Recurse -Force -ErrorAction SilentlyContinue`"" -WindowStyle Hidden
Write-Host "nikkePwned uninstalled successfully." -ForegroundColor Green
'@
Set-Content -Path (Join-Path $InstallDir "uninstall.ps1") -Value $uninstallerScript -Force -Encoding utf8

# ---------------------------------------------------------------------------
# Create Shortcuts
# ---------------------------------------------------------------------------
Write-Host "Creating shortcuts..." -ForegroundColor Green

# Start Menu
Create-Shortcut -Path $StartMenuShortcut -TargetPath $TargetExe -Description "The Password Manager for NIKKE" -IconLocation $TargetExe
Write-Host "  [+] Start Menu: $StartMenuShortcut" -ForegroundColor Gray

# Desktop (optional)
if (-not $NoDesktopShortcut) {
    Create-Shortcut -Path $DesktopShortcut -TargetPath $TargetExe -Description "The Password Manager for NIKKE" -IconLocation $TargetExe
    Write-Host "  [+] Desktop: $DesktopShortcut" -ForegroundColor Gray
}

# ---------------------------------------------------------------------------
# Register in Windows Add/Remove Programs (HKCU)
# ---------------------------------------------------------------------------
try {
    if (-not (Test-Path $RegistryPath)) {
        New-Item -Path $RegistryPath -Force | Out-Null
    }

    # Extract version if possible from file
    $fileVersion = (Get-Item $TargetExe).VersionInfo.ProductVersion
    if (-not $fileVersion) { $fileVersion = "Latest" }

    Set-ItemProperty -Path $RegistryPath -Name "DisplayName" -Value "nikkePwned"
    Set-ItemProperty -Path $RegistryPath -Name "DisplayVersion" -Value $fileVersion
    Set-ItemProperty -Path $RegistryPath -Name "Publisher" -Value "ScathachGrip"
    Set-ItemProperty -Path $RegistryPath -Name "DisplayIcon" -Value "$TargetExe,0"
    Set-ItemProperty -Path $RegistryPath -Name "InstallLocation" -Value $InstallDir
    Set-ItemProperty -Path $RegistryPath -Name "UninstallString" -Value "powershell.exe -ExecutionPolicy Bypass -File `"$InstallDir\uninstall.ps1`""
    Set-ItemProperty -Path $RegistryPath -Name "QuietUninstallString" -Value "powershell.exe -ExecutionPolicy Bypass -File `"$InstallDir\uninstall.ps1`""
    Set-ItemProperty -Path $RegistryPath -Name "HelpLink" -Value "https://github.com/$RepoOwner/$RepoName"
    Set-ItemProperty -Path $RegistryPath -Name "URLInfoAbout" -Value "https://github.com/$RepoOwner/$RepoName"
}
catch {
    Write-Warning "Could not register Windows uninstall entry: $($_.Exception.Message)"
}

# ---------------------------------------------------------------------------
# Complete & Optional Launch
# ---------------------------------------------------------------------------
Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host "nikkePwned has been successfully installed/updated!" -ForegroundColor Green
Write-Host "Location: $TargetExe" -ForegroundColor Gray
Write-Host "==================================================================`n" -ForegroundColor Cyan

if (-not $NoLaunch) {
    Write-Host "Launching nikkePwned..." -ForegroundColor Cyan
    Start-Process -FilePath $TargetExe
}
