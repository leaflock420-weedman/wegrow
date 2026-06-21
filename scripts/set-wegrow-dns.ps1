# Add wegrow CNAME on GoDaddy for GitHub Pages
param(
    [string]$ApiKey = $env:GODADDY_API_KEY,
    [string]$ApiSecret = $env:GODADDY_API_SECRET
)

$domain = "leaflock.com.au"
$name = "wegrow"
$value = "wegrow.onrender.com"

if (-not $ApiKey -or -not $ApiSecret) {
    Write-Host "No GoDaddy API keys in environment." -ForegroundColor Yellow
    Write-Host "Run: node scripts/setup-godaddy-dns.mjs" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or add manually in GoDaddy DNS:" -ForegroundColor Cyan
    Write-Host "  Type:  CNAME"
    Write-Host "  Name:  $name"
    Write-Host "  Value: $value"
    Write-Host "  TTL:   600"
    exit 1
}

$headers = @{
    Authorization = "sso-key ${ApiKey}:${ApiSecret}"
    Accept = "application/json"
}

$records = Invoke-RestMethod -Uri "https://api.godaddy.com/v1/domains/$domain/records/CNAME/$name" -Headers $headers -Method Get -ErrorAction SilentlyContinue
$body = @(@{ type = "CNAME"; name = $name; data = $value; ttl = 600 }) | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "https://api.godaddy.com/v1/domains/$domain/records/CNAME/$name" -Headers $headers -Method Put -Body $body -ContentType "application/json"
    Write-Host "Updated CNAME $name.$domain -> $value" -ForegroundColor Green
} catch {
    Invoke-RestMethod -Uri "https://api.godaddy.com/v1/domains/$domain/records" -Headers $headers -Method Patch -Body $body -ContentType "application/json"
    Write-Host "Added CNAME $name.$domain -> $value" -ForegroundColor Green
}