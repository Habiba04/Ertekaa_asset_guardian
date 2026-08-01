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
$ApiBaseUrl   = "http://localhost:5000"          # Asset Guardian backend base URL
$ApiKey       = "6cd3489d92d309a5b959120e8b4dfbe16634979455c7c53ba51c9208169d2587" # Must match backend AGENT_API_KEY
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
    # Reads the standard Windows Uninstall registry locations rather than
    # the Win32_Product WMI class, which is deliberately avoided here: it
    # is known to silently trigger MSI package reconfiguration/repair on
    # every query, causing slowdowns and unintended side effects.
    $uninstallPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )

    try {
        $apps = Get-ItemProperty -Path $uninstallPaths -ErrorAction SilentlyContinue |
            Where-Object {
                $_.DisplayName -and
                -not $_.SystemComponent -and
                -not $_.ParentKeyName -and
                $_.DisplayName -notmatch "Update for|Security Update|Hotfix"
            } |
            Select-Object @{Name = "name"; Expression = { $_.DisplayName } },
                          @{Name = "version"; Expression = { $_.DisplayVersion } } |
            Sort-Object name -Unique

        return @($apps)
    } catch {
        Write-AgentLog "Failed to read installed applications: $($_.Exception.Message)"
        return @()
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
