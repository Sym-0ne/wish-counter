# sync-authkey.ps1
# Extrait automatiquement l'URL authkey du log Genshin Impact et ouvre le Wish Tracker.
#
# UTILISATION :
#   1. Lance Genshin Impact et ouvre l'historique de voeux depuis Portail des voeux -> Details.
#   2. Laisse la page se charger completement (tu dois voir les voeux listes).
#   3. Ouvre PowerShell et execute ce script (ou colle le one-liner ci-dessous).
#
# ONE-LINER (copier-coller directement dans PowerShell) :
#   $m = Get-Content "$env:APPDATA\..\LocalLow\miHoYo\Genshin Impact\output_log.txt" -EA 0 | Select-String "OnGetWebViewPageFinish:.*authkey" | Select-Object -Last 1; if ($m) { $raw = ($m.Line -split "OnGetWebViewPageFinish:",2)[1].Trim(); $qs = ($raw -split "\?",2)[1]; $h = if ($qs -match "region=cn_") { "public-operation-hk4e.hoyoverse.com" } else { "public-operation-hk4e-sg.hoyoverse.com" }; $api = "https://$h/gacha_info/api/getGachaLog?$qs"; Start-Process "https://sym-0ne.github.io/wish-counter/?authkey=$([uri]::EscapeDataString($api))" } else { Write-Host "Ouvre l'historique de voeux dans le jeu et laisse la page se charger." }

$logPath = "$env:APPDATA\..\LocalLow\miHoYo\Genshin Impact\output_log.txt"
$appUrl  = "https://sym-0ne.github.io/wish-counter/"

Write-Host "Wish Tracker - Extraction de l'authkey" -ForegroundColor Cyan
Write-Host ""

# Verifier que le log existe
if (-not (Test-Path $logPath)) {
    Write-Host "Fichier log introuvable : $logPath" -ForegroundColor Red
    Write-Host "Lance Genshin Impact et ouvre l'historique de voeux, puis relance ce script." -ForegroundColor Yellow
    Read-Host "Appuie sur Entree pour quitter"
    exit 1
}

# Chercher la derniere URL contenant "authkey" dans le log.
# Note : le log ecrit l'URL de la PAGE web de l'historique, pas l'URL API.
# Exemple : https://webstatic-sea.hoyoverse.com/genshin/event/e20190909gacha-v3/index.html?authkey_ver=1&...
$match = Get-Content $logPath |
         Select-String "OnGetWebViewPageFinish:.*authkey" |
         Select-Object -Last 1

if (-not $match) {
    Write-Host "Aucune URL authkey trouvee dans le log." -ForegroundColor Red
    Write-Host ""
    Write-Host "Assure-toi d'avoir :" -ForegroundColor Yellow
    Write-Host "  1. Lance Genshin Impact"
    Write-Host "  2. Ouvert l'historique de voeux depuis le menu Portail des voeux"
    Write-Host "  3. Laisse la page se charger completement (les voeux doivent etre visibles)"
    Write-Host ""
    Write-Host "Puis relance ce script." -ForegroundColor Yellow
    Read-Host "Appuie sur Entree pour quitter"
    exit 1
}

# Extraire l'URL de la page web
$rawUrl = ($match.Line -split "OnGetWebViewPageFinish:",2)[1].Trim()
$qs = ($rawUrl -split "\?",2)[1]

if (-not $qs) {
    Write-Host "URL mal formee dans le log." -ForegroundColor Red
    Read-Host "Appuie sur Entree pour quitter"
    exit 1
}

# Detecter la region pour construire l'URL API correcte
# Serveurs globaux (os_*) → hk4e-sg | Serveurs CN (cn_*) → hk4e
$apiHost = if ($qs -match "region=cn_") {
    "public-operation-hk4e.hoyoverse.com"
} else {
    "public-operation-hk4e-sg.hoyoverse.com"
}
$apiUrl = "https://$apiHost/gacha_info/api/getGachaLog?$qs"

Write-Host "Serveur detecte : " -NoNewline
Write-Host $apiHost -ForegroundColor Green
Write-Host "URL authkey extraite avec succes." -ForegroundColor Green
Write-Host ""

# Encoder et ouvrir l'app
$encoded = [uri]::EscapeDataString($apiUrl)
$fullUrl  = "${appUrl}?authkey=${encoded}"

Write-Host "Ouverture du Wish Tracker dans le navigateur..." -ForegroundColor Cyan
Start-Process $fullUrl

Write-Host ""
Write-Host "Le Wish Tracker s'est ouvert. Clique sur 'Synchroniser maintenant'." -ForegroundColor Green
Start-Sleep -Seconds 2
