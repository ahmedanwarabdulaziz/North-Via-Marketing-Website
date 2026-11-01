# Runs Instaloader for one account. Started by the admin page's button through the
# nvm-instaloader:// link, which any website could open, so the link is checked strictly
# and nothing from it reaches the command unless it matches.
param([string]$Link)

$pattern = '^nvm-instaloader://(?<name>[a-z0-9_][a-z0-9._]{0,29})/?(\?(count=(?<count>[1-9][0-9]{0,4}))?&?(?<videos>videos=1)?)?$'
if ($Link -notmatch $pattern) {
    Write-Host "This link isn't valid, so nothing was run." -ForegroundColor Red
    exit 1
}
$username = $Matches['name']
$count = $Matches['count']
$videosOnly = [bool]$Matches['videos']

$home_ = Join-Path $env:LOCALAPPDATA 'NVM\instaloader'
$python = Join-Path $home_ 'Scripts\python.exe'
$folder = if ($env:NVM_INSTAGRAM_DIR) { $env:NVM_INSTAGRAM_DIR } else { Join-Path $env:USERPROFILE 'Downloads\Instagram' }

if (-not (Test-Path $python)) {
    Write-Host 'First run: setting up Instaloader...'
    python -m venv $home_
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Python could not be started. Install it from python.org and try again.' -ForegroundColor Red
        exit 1
    }
}
# Kept current, because Instagram's changes are fixed in new versions.
& $python -m pip install --quiet --upgrade --disable-pip-version-check instaloader

Write-Host "Downloading @$username to $folder\$username" -ForegroundColor Cyan
& $python (Join-Path $PSScriptRoot 'download.py') $username $folder $(if ($count) { $count } else { '0' }) $(if ($videosOnly) { '1' } else { '0' })
$code = $LASTEXITCODE

if ($code -eq 0) {
    Write-Host "Finished. Files are in $folder\$username" -ForegroundColor Green
} else {
    Write-Host 'Instaloader reported a problem; see the messages above.' -ForegroundColor Yellow
}
exit $code
