$env:Path = "C:\Program Files\Git\cmd;C:\Program Files\nodejs;" + $env:Path
Set-Location $PSScriptRoot

if (-not (Test-Path .git)) {
    git init
    git add .
    git commit -m "WeGrow by LeafLock — weed farm game"
    Write-Host "Git repo created." -ForegroundColor Green
}

Write-Host ""
Write-Host "Push to GitHub:" -ForegroundColor Cyan
Write-Host "  git remote add origin https://github.com/leaflock420-weedman/wegrow.git"
Write-Host "  git branch -M main"
Write-Host "  git push -u origin main"
Write-Host ""
Write-Host "Then Render.com → New → Blueprint → connect wegrow repo"
Write-Host "Run godaddy-wegrow-dns.ps1 for subdomain DNS"
Write-Host ""