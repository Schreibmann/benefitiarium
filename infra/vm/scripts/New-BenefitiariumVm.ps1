<#
.SYNOPSIS
  Create a Hyper-V Gen2 Ubuntu 24.04 VM for always-on Benefitiarium.

.DESCRIPTION
  Downloads the Ubuntu 24.04 Hyper-V cloud image (VHDX), attaches a cloud-init
  CIDATA seed (VHDX by default), configures memory/CPU/network, and starts the VM.

.PARAMETER VmName
  Hyper-V VM name.

.PARAMETER SshPublicKeyPath
  Path to an OpenSSH public key (e.g. $env:USERPROFILE\.ssh\id_ed25519.pub).

.PARAMETER SshPublicKey
  Public key string (alternative to -SshPublicKeyPath).

.PARAMETER RepoUrl
  Git URL to clone on first boot. Omit with -SkipClone for Deploy-ToVm.ps1 sync.

.PARAMETER RepoRef
  Branch or tag (default: main).

.PARAMETER SkipClone
  Skip git clone in cloud-init.

.PARAMETER MemoryGB
  Startup memory in GB (default: 6).

.PARAMETER CpuCount
  vCPU count (default: 2).

.PARAMETER VhdSizeGB
  Expand OS disk to this size if larger than the cloud image (default: 40).

.PARAMETER SwitchName
  Hyper-V virtual switch. Default: first External switch, else Default Switch.

.PARAMETER WorkDir
  Directory for VM disks and seeds (default: under infra/vm/out).

.PARAMETER CloudImageUrl
  Override Ubuntu cloud image URL.

.PARAMETER SeedMethod
  Vhd (default) or Iso for the cloud-init seed.
#>
[CmdletBinding()]
param(
  [string] $VmName = 'benefitiarium-vm',

  [string] $SshPublicKeyPath = '',

  [string] $SshPublicKey = '',

  [string] $RepoUrl = '',

  [string] $RepoRef = 'main',

  [switch] $SkipClone,

  [ValidateRange(2, 64)]
  [int] $MemoryGB = 6,

  [ValidateRange(1, 16)]
  [int] $CpuCount = 2,

  [ValidateRange(10, 500)]
  [int] $VhdSizeGB = 40,

  [string] $SwitchName = '',

  [string] $WorkDir = '',

  [string] $CloudImageUrl = 'https://cloud-images.ubuntu.com/releases/24.04/release/ubuntu-24.04-server-cloudimg-amd64.vhdx',

  [ValidateSet('Vhd', 'Iso')]
  [string] $SeedMethod = 'Vhd'
)

$ErrorActionPreference = 'Stop'

function Assert-Admin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run New-BenefitiariumVm.ps1 from an elevated PowerShell (Administrator).'
  }
}

function Resolve-SshPublicKey {
  param([string] $Key, [string] $KeyPath)
  if (-not [string]::IsNullOrWhiteSpace($Key)) {
    return $Key.Trim()
  }
  if ([string]::IsNullOrWhiteSpace($KeyPath)) {
    $defaultPath = Join-Path $env:USERPROFILE '.ssh\id_ed25519.pub'
    if (Test-Path -LiteralPath $defaultPath) {
      $KeyPath = $defaultPath
    }
    else {
      $defaultPath = Join-Path $env:USERPROFILE '.ssh\id_rsa.pub'
      if (Test-Path -LiteralPath $defaultPath) {
        $KeyPath = $defaultPath
      }
    }
  }
  if ([string]::IsNullOrWhiteSpace($KeyPath) -or -not (Test-Path -LiteralPath $KeyPath)) {
    throw 'Provide -SshPublicKey or -SshPublicKeyPath (OpenSSH .pub file).'
  }
  return (Get-Content -LiteralPath $KeyPath -Raw).Trim()
}

function Resolve-VmSwitchName {
  param([string] $Name)
  if (-not [string]::IsNullOrWhiteSpace($Name)) {
    $existing = Get-VMSwitch -Name $Name -ErrorAction SilentlyContinue
    if ($null -eq $existing) {
      throw "Hyper-V switch not found: $Name"
    }
    return $Name
  }
  $external = Get-VMSwitch -SwitchType External -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -ne $external) {
    return $external.Name
  }
  $default = Get-VMSwitch -Name 'Default Switch' -ErrorAction SilentlyContinue
  if ($null -ne $default) {
    return $default.Name
  }
  throw 'No Hyper-V switch found. Create an External switch or enable Default Switch (Client Hyper-V).'
}

function Wait-VmIpv4 {
  param(
    [string] $Name,
    [int] $TimeoutSec = 300
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    $addresses = Get-VMNetworkAdapter -VMName $Name | Select-Object -ExpandProperty IPAddresses
    foreach ($ip in $addresses) {
      if ($ip -match '^\d+\.\d+\.\d+\.\d+$' -and $ip -notlike '169.254.*') {
        return $ip
      }
    }
    Start-Sleep -Seconds 5
  }
  return $null
}

Assert-Admin
Import-Module Hyper-V -ErrorAction Stop

$scriptDir = $PSScriptRoot
$vmRoot = (Resolve-Path (Join-Path $scriptDir '..')).Path
if ([string]::IsNullOrWhiteSpace($WorkDir)) {
  $WorkDir = Join-Path $vmRoot 'out'
}
New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null

$sshKey = Resolve-SshPublicKey -Key $SshPublicKey -KeyPath $SshPublicKeyPath
$switch = Resolve-VmSwitchName -Name $SwitchName

$existing = Get-VM -Name $VmName -ErrorAction SilentlyContinue
if ($null -ne $existing) {
  throw "VM '$VmName' already exists. Remove it first or choose another -VmName."
}

$osVhdPath = Join-Path $WorkDir "$VmName-ubuntu-24.04.vhdx"
$cloudImageCache = Join-Path $WorkDir 'ubuntu-24.04-server-cloudimg-amd64.vhdx'

if (-not (Test-Path -LiteralPath $cloudImageCache)) {
  Write-Host "Downloading Ubuntu 24.04 cloud image..."
  Write-Host $CloudImageUrl
  Invoke-WebRequest -Uri $CloudImageUrl -OutFile $cloudImageCache -UseBasicParsing
}

Write-Host "Copying OS disk to $osVhdPath"
Copy-Item -LiteralPath $cloudImageCache -Destination $osVhdPath -Force

$targetBytes = [uint64]$VhdSizeGB * 1GB
$current = Get-VHD -Path $osVhdPath
if ($current.Size -lt $targetBytes) {
  Resize-VHD -Path $osVhdPath -SizeBytes $targetBytes
}

$seedArgs = @{
  SshPublicKey = $sshKey
  RepoUrl      = $RepoUrl
  RepoRef      = $RepoRef
  Method       = $SeedMethod
}
if ($SkipClone) {
  $seedArgs['SkipClone'] = $true
}
if ($SeedMethod -eq 'Vhd') {
  $seedArgs['OutputPath'] = Join-Path $WorkDir "$VmName-cidata.vhdx"
}
else {
  $seedArgs['OutputPath'] = Join-Path $WorkDir "$VmName-cidata.iso"
}

$seedPath = & (Join-Path $scriptDir 'New-CloudInitIso.ps1') @seedArgs
if ([string]::IsNullOrWhiteSpace($seedPath)) {
  throw 'Cloud-init seed build returned an empty path'
}

Write-Host "Creating VM $VmName on switch '$switch'"
$memoryBytes = [int64]$MemoryGB * 1GB
New-VM -Name $VmName -Generation 2 -MemoryStartupBytes $memoryBytes -VHDPath $osVhdPath -SwitchName $switch | Out-Null
Set-VMProcessor -VMName $VmName -Count $CpuCount
Set-VMMemory -VMName $VmName -DynamicMemoryEnabled $false
Set-VMFirmware -VMName $VmName -EnableSecureBoot Off
Set-VM -VMName $VmName -AutomaticCheckpointsEnabled $false -CheckpointType Disabled

if ($SeedMethod -eq 'Vhd') {
  Add-VMHardDiskDrive -VMName $VmName -Path $seedPath
}
else {
  Add-VMDvdDrive -VMName $VmName -Path $seedPath
}

Start-VM -Name $VmName
Write-Host "VM started. Waiting for IPv4 (cloud-init + DHCP can take several minutes)..."
$ip = Wait-VmIpv4 -Name $VmName -TimeoutSec 420

Write-Host ''
Write-Host "VM name:     $VmName"
Write-Host "Switch:      $switch"
Write-Host "OS disk:     $osVhdPath"
Write-Host "Seed:        $seedPath"
if ($null -ne $ip) {
  Write-Host "Guest IPv4:  $ip"
  Write-Host "SSH:         ssh benefitiarium@$ip"
  Write-Host "UI (later):  http://${ip}:5173"
}
else {
  Write-Warning 'No IPv4 yet. Check: Get-VMNetworkAdapter -VMName benefitiarium-vm | Select IPAddresses'
  Write-Warning 'Default Switch may need Hyper-V Guest Services / longer wait after first boot.'
}
Write-Host ''
Write-Host 'Next: Set-BenefitiariumEnv.ps1 -VmHost <ip>  (and Deploy-ToVm.ps1 if -SkipClone)'
