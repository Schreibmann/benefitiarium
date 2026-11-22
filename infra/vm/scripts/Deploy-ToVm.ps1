<#
.SYNOPSIS
  Sync the local repo tree to the guest and run guest-bootstrap.sh.

.DESCRIPTION
  Packs the tree with tar.exe, copies via scp, extracts on the guest.
  Excludes node_modules, dist, .git, Playwright reports, and infra/vm/out.

.PARAMETER VmHost
  Guest IPv4 or hostname.

.PARAMETER User
  SSH user (default: benefitiarium).

.PARAMETER IdentityFile
  Optional SSH private key path.

.PARAMETER RemoteRoot
  Destination directory on the guest (default: /opt/benefitiarium).

.PARAMETER SkipBootstrap
  Sync only; do not run guest-bootstrap.sh.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string] $VmHost,

  [string] $User = 'benefitiarium',

  [string] $IdentityFile = '',

  [string] $RemoteRoot = '/opt/benefitiarium',

  [switch] $SkipBootstrap
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$sshTarget = "${User}@${VmHost}"
$sshArgs = @('-o', 'StrictHostKeyChecking=accept-new')
if (-not [string]::IsNullOrWhiteSpace($IdentityFile)) {
  $sshArgs += @('-i', $IdentityFile)
}

$tarCmd = Get-Command tar.exe -ErrorAction SilentlyContinue
if ($null -eq $tarCmd) {
  throw 'tar.exe not found on PATH (comes with modern Windows).'
}

$archive = Join-Path ([System.IO.Path]::GetTempPath()) ("benefitiarium-deploy-" + [guid]::NewGuid().ToString('N') + '.tar')
$remoteArchive = '/tmp/benefitiarium-deploy.tar'

try {
  Write-Host "Ensuring remote directory $RemoteRoot"
  & ssh @sshArgs $sshTarget "sudo install -d -o ${User} -g ${User} -m 0755 '$RemoteRoot'"
  if ($LASTEXITCODE -ne 0) {
    throw "failed to create $RemoteRoot"
  }

  Write-Host "Packing $repoRoot"
  $tarArgs = @(
    '-C', $repoRoot,
    '--exclude=node_modules',
    '--exclude=dist',
    '--exclude=.git',
    '--exclude=infra/vm/out',
    '--exclude=apps/web/test-results',
    '--exclude=apps/web/playwright-report',
    '--exclude=.turbo',
    '-cf', $archive,
    '.'
  )
  & $tarCmd.Source @tarArgs
  if ($LASTEXITCODE -ne 0) {
    throw "tar create failed with exit code $LASTEXITCODE"
  }

  Write-Host "Uploading archive to ${sshTarget}:${remoteArchive}"
  $scpArgs = $sshArgs + @($archive, "${sshTarget}:${remoteArchive}")
  & scp @scpArgs
  if ($LASTEXITCODE -ne 0) {
    throw "scp failed with exit code $LASTEXITCODE"
  }

  Write-Host "Extracting on guest into $RemoteRoot"
  $extractCmd = "tar -C '$RemoteRoot' -xf '$remoteArchive' && rm -f '$remoteArchive' && chmod +x '$RemoteRoot/infra/vm/scripts/guest-bootstrap.sh'"
  & ssh @sshArgs $sshTarget $extractCmd
  if ($LASTEXITCODE -ne 0) {
    throw "remote extract failed with exit code $LASTEXITCODE"
  }

  if ($SkipBootstrap) {
    Write-Host 'Sync complete (-SkipBootstrap). Run guest-bootstrap.sh on the guest when ready.'
    return
  }

  Write-Host 'Running guest-bootstrap.sh on guest (sudo)...'
  & ssh @sshArgs $sshTarget "sudo '$RemoteRoot/infra/vm/scripts/guest-bootstrap.sh'"
  if ($LASTEXITCODE -ne 0) {
    throw "guest-bootstrap.sh failed with exit code $LASTEXITCODE"
  }

  Write-Host "Deploy complete. UI: http://${VmHost}:5173"
  Write-Host 'Remember: Live Mode does not auto-start; use Start in the UI.'
}
finally {
  if (Test-Path -LiteralPath $archive) {
    Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
  }
}
