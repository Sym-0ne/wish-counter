# sync-authkey.ps1
# Extrait automatiquement l'URL authkey du log Genshin Impact et ouvre le Wish Tracker.
#
# UTILISATION :
#   1. Lance Genshin Impact et ouvre l'historique de voeux depuis Portail des voeux -> Details.
#   2. Laisse la page se charger completement (tu dois voir les voeux listes).
#   3. Ouvre PowerShell et execute ce script (ou colle le one-liner ci-dessous).
#
# ONE-LINER (copier-coller directement dans PowerShell) :
#   $log="$env:APPDATA\..\LocalLow\miHoYo\Genshin Impact\output_log.txt"; $m=Get-Content $log -EA 0|Select-String "web:.*url:.*authkey|OnGetWebViewPageFinish:.*authkey"|Select-Object -Last 1; if($m){$raw=if($m.Line -match "url: (https://\S+)"){$matches[1]}else{($m.Line -split "OnGetWebViewPageFinish:",2)[1].Trim()}; $clean=($raw -split "#")[0]; $qs=($clean -split "\?",2)[1]; $h=if($qs -match "region=cn_"){"public-operation-hk4e.hoyoverse.com"}else{"public-operation-hk4e-sg.hoyoverse.com"}; $api="https://$h/gacha_info/api/getGachaLog?$qs"; Set-Clipboard $api; Write-Host "URL authkey copiee ! Colle-la dans le champ de la fenetre de sync."}else{Write-Host "Ouvre l'historique de voeux dans le jeu et laisse la page se charger."}

$logPath = "$env:APPDATA\..\LocalLow\miHoYo\Genshin Impact\output_log.txt"
$appUrl  = "https://sym-0ne.github.io/wish-counter/"

Write-Host "Wish Tracker - Extraction de l'authkey" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $logPath)) {
    Write-Host "Fichier log introuvable : $logPath" -ForegroundColor Red
    Write-Host "Lance Genshin Impact et ouvre l'historique de voeux, puis relance ce script." -ForegroundColor Yellow
    Read-Host "Appuie sur Entree pour quitter"
    exit 1
}

# Genshin v6.6+ : "web: N url: https://...authkey=..."
# Anciennes versions : "OnGetWebViewPageFinish: https://...authkey=..."
$match = Get-Content $logPath |
         Select-String "web:.*url:.*authkey|OnGetWebViewPageFinish:.*authkey" |
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

# Extraire l'URL selon le format de la ligne
$rawUrl = if ($match.Line -match "url: (https://\S+)") {
    $matches[1]
} else {
    ($match.Line -split "OnGetWebViewPageFinish:", 2)[1].Trim()
}

# Supprimer le fragment (#/log...) ajoute par le jeu en fin d'URL
$cleanUrl = ($rawUrl -split "#")[0]
$qs = ($cleanUrl -split "\?", 2)[1]

if (-not $qs) {
    Write-Host "URL mal formee dans le log." -ForegroundColor Red
    Write-Host "Ligne trouvee : $($match.Line.Substring(0, [Math]::Min(120, $match.Line.Length)))" -ForegroundColor Gray
    Read-Host "Appuie sur Entree pour quitter"
    exit 1
}

# Detecter la region pour construire l'URL API correcte
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

$encoded = [uri]::EscapeDataString($apiUrl)
$fullUrl  = "${appUrl}?authkey=${encoded}"

Set-Clipboard $apiUrl

Write-Host "URL authkey copiee dans le presse-papiers !" -ForegroundColor Green
Write-Host ""
Write-Host $apiUrl -ForegroundColor Cyan
Write-Host ""
Write-Host "Va sur https://sym-0ne.github.io/wish-counter/" -ForegroundColor Yellow
Write-Host "Ouvre la modal de synchronisation, puis colle l'URL dans le champ (Ctrl+V)." -ForegroundColor Yellow
Read-Host "Appuie sur Entree pour quitter"
