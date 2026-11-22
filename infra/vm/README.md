# Benefitiarium Hyper-V VM / Benefitiarium Hyper-V VM

**RU.** Скрипты и cloud-init для долгоживущей Ubuntu VM на Windows 11 (Hyper-V): стек крутится в госте 24/7, браузер на хосте открывает UI.

**EN.** Scripts and cloud-init for an always-on Ubuntu VM on Windows 11 (Hyper-V): the stack runs in the guest 24/7; the host browser opens the UI.

**RU.** Полная инструкция: [`docs/LOCAL_VM.md`](../../docs/LOCAL_VM.md).

**EN.** Full guide: [`docs/LOCAL_VM.md`](../../docs/LOCAL_VM.md).

## Quick path / Быстрый путь

```powershell
# Elevated PowerShell
cd infra\vm\scripts
.\New-BenefitiariumVm.ps1 -SkipClone -SshPublicKeyPath $env:USERPROFILE\.ssh\id_ed25519.pub
.\Set-BenefitiariumEnv.ps1 -VmHost <guest-ip>
.\Deploy-ToVm.ps1 -VmHost <guest-ip>
```

**RU.** Затем откройте `http://<guest-ip>:5173`. Live Mode **не** стартует сам — только Start в UI.

**EN.** Then open `http://<guest-ip>:5173`. Live Mode does **not** auto-start — only UI Start.
