# sync-authkey.ps1
# Extrait automatiquement l'URL authkey du log Genshin Impact et ouvre le Wish Tracker.
#
# UTILISATION :
#   1. Lance Genshin Impact et ouvre l'historique de voeux.
#   2. Ouvre PowerShell et colle ce script (ou le one-liner ci-dessous).
#   3. Le navigateur s'ouvre automatiquement avec le Wish Tracker pret a synchroniser.
#
# ONE-LINER (copier-coller directement dans PowerShell) :
#   $url = Get-Content "$env:APPDATA\..\LocalLow\miHoYo\Genshin Impact\output_log.txt" | Select-String "OnGetWebViewPageFinish:.*getGachaLog" | Select-Object -Last 1 | ForEach-Object { ($_ -split "OnGetWebViewPageFinish:")[1].Trim() }; if ($url) { Start-Process "https://sym-0ne.github.io/wish-counter/?authkey=$([uri]::EscapeDataString($url))" } else { Write-Host "Ouvre d'abord l'historique de voeux dans le jeu." }

$logPath = "$env:APPDATA\..\LocalLow\miHoYo\Genshin Impact\output_log.txt"
$appUrl  = "https://sym-0ne.github.io/wish-counter/"

Write-Host "Wish Tracker — Extraction de l'authkey" -ForegroundColor Cyan
Write-Host ""

# Verifier que le log existe
if (-not (Test-Path $logPath)) {
    Write-Host "Fichier log introuvable : $logPath" -ForegroundColor Red
    Write-Host "Lance Genshin Impact et ouvre l'historique de voeux, puis relance ce script." -ForegroundColor Yellow
    Read-Host "Appuie sur Entree pour quitter"
    exit 1
}

# Extraire la derniere URL getGachaLog du log
$match = Get-Content $logPath |
         Select-String "OnGetWebViewPageFinish:.*getGachaLog" |
         Select-Object -Last 1

if (-not $match) {
    Write-Host "Aucune URL authkey trouvee dans le log." -ForegroundColor Red
    Write-Host ""
    Write-Host "Assure-toi d'avoir :" -ForegroundColor Yellow
    Write-Host "  1. Lance Genshin Impact"
    Write-Host "  2. Ouvert l'historique de voeux depuis le menu"
    Write-Host "  3. Laisse la page se charger completement"
    Write-Host ""
    Write-Host "Puis relance ce script." -ForegroundColor Yellow
    Read-Host "Appuie sur Entree pour quitter"
    exit 1
}

$rawUrl = ($match -split "OnGetWebViewPageFinish:")[1].Trim()
Write-Host "URL trouvee : " -NoNewline
Write-Host $rawUrl.Substring(0, [Math]::Min(80, $rawUrl.Length)) -ForegroundColor Green
Write-Host "..."
Write-Host ""

# Encoder l'URL et construire le lien vers l'app
$encoded = [uri]::EscapeDataString($rawUrl)
$fullUrl  = "${appUrl}?authkey=${encoded}"

Write-Host "Ouverture du Wish Tracker dans le navigateur..." -ForegroundColor Cyan
Start-Process $fullUrl

Write-Host ""
Write-Host "Le Wish Tracker s'est ouvert. Clique sur 'Synchroniser maintenant' dans la fenetre." -ForegroundColor Green
Start-Sleep -Seconds 2
