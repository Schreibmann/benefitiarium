<#
.SYNOPSIS
  Copy a local .env into the guest as /etc/benefitiarium/env and restart services.

.PARAMETER VmHost
  Guest IPv4 or hostname.

.PARAMETER EnvFile
  Local env file (default: repo root .env).

.PARAMETER User
  SSH user (default: benefitiarium).

.PARAMETER IdentityFile
  Optional SSH private key path.

.PARAMETER SkipRestart
  Copy env only; do not systemctl restart.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string] $VmHost,

  [string] $EnvFile = '',

  [string] $User = 'benefitiarium',

  [string] $IdentityFile = '',

  [switch] $SkipRestart
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
if ([string]::IsNullOrWhiteSpace($EnvFile)) {
  $EnvFile = Join-Path $repoRoot '.env'
}
if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "Env file not found: $EnvFile (copy .env.example to .env and fill secrets first)"
}

$sshTarget = "${User}@${VmHost}"
$sshArgs = @('-o', 'StrictHostKeyChecking=accept-new')
if (-not [string]::IsNullOrWhiteSpace($IdentityFile)) {
  $sshArgs += @('-i', $IdentityFile)
}

$remoteTmp = '/tmp/benefitiarium.env.upload'
Write-Host "Uploading $EnvFile -> ${sshTarget}:/etc/benefitiarium/env"

$scpArgs = $sshArgs + @($EnvFile, "${sshTarget}:${remoteTmp}")
& scp @scpArgs
if ($LASTEXITCODE -ne 0) {
  throw "scp failed with exit code $LASTEXITCODE"
}

$remoteCmd = @"
set -euo pipefail
sudo install -d -m 0750 -o root -g benefitiarium /etc/benefitiarium
sudo install -m 0640 -o root -g benefitiarium '$remoteTmp' /etc/benefitiarium/env
rm -f '$remoteTmp'
if [[ ! -e /opt/benefitiarium/.env ]]; then
  sudo ln -sfn /etc/benefitiarium/env /opt/benefitiarium/.env
elif [[ -L /opt/benefitiarium/.env ]]; then
  sudo ln -sfn /etc/benefitiarium/env /opt/benefitiarium/.env
fi
"@

if (-not $SkipRestart) {
  $remoteCmd += @"

if systemctl list-unit-files benefitiarium-api.service >/dev/null 2>&1; then
  sudo systemctl restart benefitiarium-api.service benefitiarium-web.service benefitiarium-worker-notifier.service
fi
"@
}

& ssh @sshArgs $sshTarget $remoteCmd
if ($LASTEXITCODE -ne 0) {
  throw "remote env install failed with exit code $LASTEXITCODE"
}

Write-Host "Env installed on $VmHost"
if (-not $SkipRestart) {
  Write-Host 'Services restarted (if units were already installed).'
}
