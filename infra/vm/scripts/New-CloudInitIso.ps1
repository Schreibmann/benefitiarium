<#
.SYNOPSIS
  Build a NoCloud cloud-init seed (CIDATA ISO or VHDX) for Benefitiarium Hyper-V VMs.

.DESCRIPTION
  Renders infra/vm/cloud-init templates with SSH key / repo placeholders, then builds:
    - Vhd (default): small FAT VHDX labeled CIDATA (no ADK required)
    - Iso: CIDATA ISO via oscdimg.exe (Windows ADK Deployment Tools)

.PARAMETER SshPublicKey
  OpenSSH public key line for the benefitiarium user.

.PARAMETER RepoUrl
  Git clone URL. Ignored when -SkipClone is set.

.PARAMETER RepoRef
  Branch or tag to clone (default: main).

.PARAMETER SkipClone
  Do not clone in cloud-init; use Deploy-ToVm.ps1 afterwards.

.PARAMETER Method
  Vhd or Iso.

.PARAMETER OutputPath
  Destination .vhdx or .iso path.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string] $SshPublicKey,

  [string] $RepoUrl = '',

  [string] $RepoRef = 'main',

  [switch] $SkipClone,

  [ValidateSet('Vhd', 'Iso')]
  [string] $Method = 'Vhd',

  [string] $OutputPath = ''
)

$ErrorActionPreference = 'Stop'

function Get-RepoVmRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Find-Oscdimg {
  $candidates = @(
    "${env:ProgramFiles(x86)}\Windows Kits\10\Assessment and Deployment Kit\Deployment Tools\amd64\Oscdimg\oscdimg.exe",
    "${env:ProgramFiles}\Windows Kits\10\Assessment and Deployment Kit\Deployment Tools\amd64\Oscdimg\oscdimg.exe"
  )
  foreach ($path in $candidates) {
    if (Test-Path -LiteralPath $path) {
      return $path
    }
  }
  $fromPath = Get-Command oscdimg.exe -ErrorAction SilentlyContinue
  if ($null -ne $fromPath) {
    return $fromPath.Source
  }
  return $null
}

function Render-CloudInitFiles {
  param(
    [string] $VmRoot,
    [string] $StagingDir,
    [string] $SshPublicKey,
    [string] $RepoUrl,
    [string] $RepoRef,
    [bool] $SkipClone
  )

  $skipValue = if ($SkipClone) { 'true' } else { 'false' }
  $userDataTemplate = Get-Content -LiteralPath (Join-Path $VmRoot 'cloud-init\user-data.yaml') -Raw
  $metaDataTemplate = Get-Content -LiteralPath (Join-Path $VmRoot 'cloud-init\meta-data.yaml') -Raw

  $userData = $userDataTemplate.
    Replace('__SSH_PUBKEY__', $SshPublicKey.Trim()).
    Replace('__REPO_URL__', $RepoUrl.Trim()).
    Replace('__REPO_REF__', $RepoRef.Trim()).
    Replace('__SKIP_CLONE__', $skipValue)

  # NoCloud expects files named user-data and meta-data (no extension).
  $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText((Join-Path $StagingDir 'user-data'), $userData, $utf8NoBom)
  [System.IO.File]::WriteAllText((Join-Path $StagingDir 'meta-data'), $metaDataTemplate, $utf8NoBom)
}

function New-CidataVhd {
  param(
    [string] $StagingDir,
    [string] $VhdPath
  )

  if (-not (Get-Module -ListAvailable -Name Hyper-V)) {
    throw 'Hyper-V PowerShell module is required for -Method Vhd. Enable Hyper-V or use -Method Iso with oscdimg.'
  }
  Import-Module Hyper-V -ErrorAction Stop

  if (Test-Path -LiteralPath $VhdPath) {
    Remove-Item -LiteralPath $VhdPath -Force
  }

  $parent = Split-Path -Parent $VhdPath
  if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }

  New-VHD -Path $VhdPath -SizeBytes 64MB -Fixed | Out-Null
  $disk = Mount-VHD -Path $VhdPath -Passthru
  try {
    $diskNumber = $disk.Number
    Initialize-Disk -Number $diskNumber -PartitionStyle MBR -PassThru | Out-Null
    $partition = New-Partition -DiskNumber $diskNumber -UseMaximumSize -AssignDriveLetter -IsActive
    $driveLetter = $partition.DriveLetter
    Format-Volume -DriveLetter $driveLetter -FileSystem FAT -NewFileSystemLabel 'CIDATA' -Confirm:$false | Out-Null
    Copy-Item -LiteralPath (Join-Path $StagingDir 'user-data') -Destination "${driveLetter}:\user-data" -Force
    Copy-Item -LiteralPath (Join-Path $StagingDir 'meta-data') -Destination "${driveLetter}:\meta-data" -Force
  }
  finally {
    Dismount-VHD -Path $VhdPath -ErrorAction SilentlyContinue
  }
}

function New-CidataIso {
  param(
    [string] $StagingDir,
    [string] $IsoPath,
    [string] $OscdimgPath
  )

  $parent = Split-Path -Parent $IsoPath
  if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
  if (Test-Path -LiteralPath $IsoPath) {
    Remove-Item -LiteralPath $IsoPath -Force
  }

  # -lCIDATA sets volume label; -n allows long names; -m ignores max size warnings.
  & $OscdimgPath -j1 -lcidata -m $StagingDir $IsoPath
  if ($LASTEXITCODE -ne 0) {
    throw "oscdimg failed with exit code $LASTEXITCODE"
  }
}

$vmRoot = Get-RepoVmRoot
$staging = Join-Path ([System.IO.Path]::GetTempPath()) ("benefitiarium-cidata-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $staging -Force | Out-Null

try {
  if ([string]::IsNullOrWhiteSpace($SshPublicKey)) {
    throw 'SshPublicKey must not be empty'
  }
  if (-not $SkipClone -and [string]::IsNullOrWhiteSpace($RepoUrl)) {
    Write-Warning 'RepoUrl is empty; cloud-init will skip clone. Prefer -SkipClone or pass -RepoUrl.'
    $SkipClone = $true
  }

  Render-CloudInitFiles -VmRoot $vmRoot -StagingDir $staging -SshPublicKey $SshPublicKey `
    -RepoUrl $RepoUrl -RepoRef $RepoRef -SkipClone:$SkipClone

  if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $outDir = Join-Path $vmRoot 'out'
    if ($Method -eq 'Vhd') {
      $OutputPath = Join-Path $outDir 'benefitiarium-cidata.vhdx'
    }
    else {
      $OutputPath = Join-Path $outDir 'benefitiarium-cidata.iso'
    }
  }

  if ($Method -eq 'Vhd') {
    New-CidataVhd -StagingDir $staging -VhdPath $OutputPath
  }
  else {
    $oscdimg = Find-Oscdimg
    if ($null -eq $oscdimg) {
      throw @'
oscdimg.exe not found. Install Windows ADK (Deployment Tools), or re-run with -Method Vhd (default).
ADK: https://learn.microsoft.com/windows/deployment/windows-adk
'@
    }
    New-CidataIso -StagingDir $staging -IsoPath $OutputPath -OscdimgPath $oscdimg
  }

  Write-Host "Cloud-init seed written: $OutputPath"
  Write-Output $OutputPath
}
finally {
  if (Test-Path -LiteralPath $staging) {
    Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
  }
}
