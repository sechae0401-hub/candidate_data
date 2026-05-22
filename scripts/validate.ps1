# scripts/validate.ps1
# Epic 완료 검증: typecheck + lint + build
# 재개: .\scripts\validate.ps1 -From build

param([string]$From = "")

$StartTime = Get-Date
$LogDir = "state\validate\latest"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Mode = $env:VALIDATE_OUTPUT_MODE ?? "summary"
$SkipUntil = $From

function Invoke-Stage {
  param([string]$Name, [scriptblock]$Command)
  if ($SkipUntil -and $SkipUntil -ne $Name) {
    Write-Host "[SKIP] $Name"
    return
  }
  $script:SkipUntil = ""
  $Log = "$LogDir\$Name.log"
  try {
    if ($Mode -eq "verbose") {
      & $Command 2>&1 | Tee-Object -FilePath $Log
    } else {
      & $Command 2>&1 | Out-File -FilePath $Log
    }
    if ($LASTEXITCODE -ne 0) { throw "exit $LASTEXITCODE" }
    $elapsed = [int](New-TimeSpan -Start $StartTime -End (Get-Date)).TotalSeconds
    Write-Host "[PASS] $Name ($($elapsed)s)"
  } catch {
    Write-Host "[FAIL] $Name"
    Write-Host "  -> Log: $Log"
    exit 2
  }
}

Write-Host "=== validate: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==="

Invoke-Stage "typecheck" { npx tsc --noEmit }
Invoke-Stage "lint"      { npm run lint }
Invoke-Stage "build"     { npm run build }

$elapsed = [int](New-TimeSpan -Start $StartTime -End (Get-Date)).TotalSeconds
Write-Host "=== PASSED ($($elapsed)s) ==="
