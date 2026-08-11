<#
.SYNOPSIS
    Asset Guardian - Tracker Agent
.DESCRIPTION
    Silently collects local hardware/network telemetry via WMI/CIM and
    transmits it as a JSON payload to the Asset Guardian staging API
    (POST /api/agent/stage). Designed to run hidden, on a schedule,
    via Windows Task Scheduler (see install-agent.bat).
.NOTES
    Runs with no visible UI. All output is written only to the local
    log file for troubleshooting purposes.
#>

# ── Configuration ──────────────────────────────────────────────────────
# Update these two values to match your deployment before distributing
# this script (or inject them via GPO / environment variables).
$ApiBaseUrl   = "http://10.20.1.19:5000"          # Asset Guardian backend base URL
$ApiKey       = "aa52806b1137fb306f25235e26ba269a60dd1b35a0c0c5c18ff5ed79ed151953" # Must match backend AGENT_API_KEY
$StageRoute   = "$ApiBaseUrl/api/agent/stage"
$LogPath      = "$env:ProgramData\AssetGuardian\agent.log"
$AgentVersion = "2.1.4"

function Write-AgentLog {
    param([string]$Message)
    $logDir = Split-Path $LogPath -Parent
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LogPath -Value "[$timestamp] $Message"
}

function Get-PrimaryMacAddress {
    try {
        $nic = Get-CimInstance -ClassName Win32_NetworkAdapterConfiguration -Filter "IPEnabled = TRUE" |
            Where-Object { $_.MACAddress } | Select-Object -First 1
        return $nic.MACAddress
    } catch {
        Write-AgentLog "Failed to read MAC address: $($_.Exception.Message)"
        return $null
    }
}

function Get-PrimaryIPAddress {
    try {
        $nic = Get-CimInstance -ClassName Win32_NetworkAdapterConfiguration -Filter "IPEnabled = TRUE" |
            Where-Object { $_.IPAddress } | Select-Object -First 1
        return ($nic.IPAddress | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' } | Select-Object -First 1)
    } catch {
        Write-AgentLog "Failed to read IP address: $($_.Exception.Message)"
        return $null
    }
}

function Get-DeviceTypeGuess {
    try {
        $chassis = (Get-CimInstance -ClassName Win32_SystemEnclosure).ChassisTypes | Select-Object -First 1
        $laptopChassisTypes = @(8, 9, 10, 11, 12, 14, 18, 21, 30, 31, 32)
        if ($laptopChassisTypes -contains $chassis) { return "Laptop" }
        return "PC"
    } catch {
        return "PC"
    }
}

function Get-TotalDiskStorageGB {
    try {
        $disks = Get-CimInstance -ClassName Win32_DiskDrive
        $totalBytes = ($disks | Measure-Object -Property Size -Sum).Sum
        return [Math]::Round(($totalBytes / 1GB), 0)
    } catch {
        Write-AgentLog "Failed to read disk storage: $($_.Exception.Message)"
        return 0
    }
}

function Get-InstalledApplications {
    $uninstallPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"
    )

    $apps = @()

    foreach ($basePath in $uninstallPaths) {
        if (-not (Test-Path $basePath)) { continue }

        $subKeys = Get-ChildItem -Path $basePath -ErrorAction SilentlyContinue
        foreach ($key in $subKeys) {
            try {
                $displayName = $key.GetValue("DisplayName")
                if ([string]::IsNullOrWhiteSpace($displayName)) { continue }

                $systemComponent = $key.GetValue("SystemComponent")
                if ($systemComponent -eq 1) { continue }

                $parentKeyName = $key.GetValue("ParentKeyName")
                if ($parentKeyName) { continue }

                if ($displayName -match "Update for|Security Update|Hotfix") { continue }

                $displayVersion = $key.GetValue("DisplayVersion")

                $apps += [PSCustomObject]@{
                    name    = [string]$displayName
                    version = if ($displayVersion) { [string]$displayVersion } else { $null }
                }
            } catch {
                continue
            }
        }
    }

    try {
        return @($apps | Sort-Object name -Unique)
    } catch {
        Write-AgentLog "Failed to sort installed applications list: $($_.Exception.Message)"
        return @($apps)
    }
}

try {
    Write-AgentLog "Tracker agent run started (v$AgentVersion)."

    $computerSystem = Get-CimInstance -ClassName Win32_ComputerSystem
    $bios           = Get-CimInstance -ClassName Win32_BIOS
    $os             = Get-CimInstance -ClassName Win32_OperatingSystem
    $processor      = Get-CimInstance -ClassName Win32_Processor | Select-Object -First 1
    $physicalMemory = Get-CimInstance -ClassName Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum

    $totalMemoryGB = [Math]::Round(($physicalMemory.Sum / 1GB), 0)
    $totalDiskGB = Get-TotalDiskStorageGB
    $installedApps = Get-InstalledApplications
    Write-AgentLog "DEBUG: installedApps count = $($installedApps.Count)"

    $payload = @{
        hostName         = $env:COMPUTERNAME
        ipAddress        = Get-PrimaryIPAddress
        macAddress       = Get-PrimaryMacAddress
        serialNumber     = $bios.SerialNumber
        manufacturer     = $computerSystem.Manufacturer
        model            = $computerSystem.Model
        processor        = $processor.Name
        memory           = $totalMemoryGB
        diskStorageGB    = $totalDiskGB
        installedApps    = $installedApps
        operatingSystem  = "$($os.Caption) $($os.Version)"
        deviceType       = Get-DeviceTypeGuess
        agentVersion     = $AgentVersion
        collectedAt      = (Get-Date).ToString("o")
    }

    $json = $payload | ConvertTo-Json -Depth 4
    Write-AgentLog "Collected payload: $json"

    $headers = @{
        "Content-Type" = "application/json"
        "x-agent-key"  = $ApiKey
    }

    $response = Invoke-RestMethod -Uri $StageRoute -Method Post -Headers $headers -Body $json -TimeoutSec 30 -ErrorAction Stop

    Write-AgentLog "Successfully staged telemetry. Server response: $($response | ConvertTo-Json -Compress)"
}
catch {
    Write-AgentLog "ERROR: $($_.Exception.Message)"
}
finally {
    Write-AgentLog "Tracker agent run completed."
}
