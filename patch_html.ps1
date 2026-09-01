$file = "index.html"
$content = Get-Content $file -Raw
if (-not $content.Contains("kentang.js")) {
    $content = $content -replace '(<script src="/assets/js/main.js"></script>)', "<script src=`"/assets/js/kentang.js`"></script>`n`$1"
    Set-Content $file $content -Encoding UTF8
    Write-Host "Patched index.html"
}
