# One-time setup: lets the admin page's button open a terminal on this PC.
# Only touches the current user's settings; uninstall-windows.ps1 removes it again.
$script = Join-Path $PSScriptRoot 'open-terminal.ps1'
$target = Join-Path $env:LOCALAPPDATA 'NVM\open-terminal.ps1'
New-Item -ItemType Directory -Force (Split-Path $target) | Out-Null
Copy-Item $script $target -Force
Copy-Item (Join-Path $PSScriptRoot 'download.py') (Split-Path $target) -Force

$key = 'HKCU:\Software\Classes\nvm-instaloader'
New-Item -Path "$key\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path $key -Name '(Default)' -Value 'URL:NVM Instagram Downloader'
Set-ItemProperty -Path $key -Name 'URL Protocol' -Value ''
Set-ItemProperty -Path "$key\shell\open\command" -Name '(Default)' -Value "powershell.exe -NoProfile -ExecutionPolicy Bypass -NoExit -File `"$target`" `"%1`""

Write-Host 'Done. The Download in terminal button now works on this PC.' -ForegroundColor Green
