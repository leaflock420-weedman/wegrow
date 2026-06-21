# GoDaddy DNS for WeGrow by LeafLock
# Add this CNAME in GoDaddy → leaflock.com.au → DNS Records

Write-Host ""
Write-Host "WeGrow subdomain DNS (GoDaddy)" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Type:  CNAME"
Write-Host "  Name:  wegrow"
Write-Host "  Value: wegrow.onrender.com"
Write-Host "  TTL:   3600"
Write-Host ""
Write-Host "Then in Render.com → wegrow service → Custom Domains → add:"
Write-Host "  wegrow.leaflock.com.au"
Write-Host ""
Write-Host "Live URL after DNS propagates:"
Write-Host "  https://wegrow.leaflock.com.au" -ForegroundColor Green
Write-Host ""