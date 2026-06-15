# Stop only OSA Next.js dev listeners on ports 3000/3001/3002.
# Does NOT kill unrelated node processes or other apps on those ports.

$ErrorActionPreference = "SilentlyContinue"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ProjectMarkers = @(
    $ProjectRoot
    ($ProjectRoot -replace "\\", "/")
    "OSA\osa-app"
    "OSA/osa-app"
)

function Test-OsaNextDevProcess {
    param([string]$CommandLine)

    if ([string]::IsNullOrWhiteSpace($CommandLine)) {
        return $false
    }

    $isNextDev = $CommandLine -match "next[\\/]dist[\\/]server|next dev|start-server\.js"
    if (-not $isNextDev) {
        return $false
    }

    foreach ($marker in $ProjectMarkers) {
        if ($CommandLine -like "*$marker*") {
            return $true
        }
    }

    return $false
}

$ports = @(3000, 3001, 3002)
$stopped = @()

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    if (-not $connections) {
        continue
    }

    $procIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $procIds) {
        if (-not $procId -or $procId -eq 0) {
            continue
        }

        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$procId" -ErrorAction SilentlyContinue
        if (-not $proc) {
            continue
        }

        if (Test-OsaNextDevProcess -CommandLine $proc.CommandLine) {
            Write-Host "[OSA] Stopping PID $procId on port $port ($($proc.Name))"
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            $stopped += [PSCustomObject]@{ Port = $port; Pid = $procId; Name = $proc.Name }
        } else {
            Write-Host "[OSA] Skipping PID $procId on port $port (not OSA Next dev)"
        }
    }
}

if ($stopped.Count -eq 0) {
    Write-Host "[OSA] No OSA dev processes found on ports 3000/3001/3002."
} else {
    Write-Host "[OSA] Stopped $($stopped.Count) OSA dev process(es)."
}

exit 0
