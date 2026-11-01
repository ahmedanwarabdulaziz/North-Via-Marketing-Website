# Undoes install-windows.ps1 and removes the local Instaloader. Downloaded files are kept.
Remove-Item -Path 'HKCU:\Software\Classes\nvm-instaloader' -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path (Join-Path $env:LOCALAPPDATA 'NVM') -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'Removed.' -ForegroundColor Green
