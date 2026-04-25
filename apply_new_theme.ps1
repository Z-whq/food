$html = Get-Content index.html -Raw -Encoding UTF8

if (-not $html.Contains("tailwind.config")) {
    $tailwindConfig = @"
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        theme: {
                            pink: '#F3D8C3',
                            blue: '#6090B8',
                            white: '#FFFFFF',
                        }
                    }
                }
            }
        }
    </script>
</head>
"@
    $html = $html -replace "</head>", $tailwindConfig
}

$html = $html -replace "bg-pink-50", "bg-theme-pink/40"
$html = $html -replace "bg-fuchsia-100", "bg-theme-pink"
$html = $html -replace "bg-fuchsia-200", "bg-theme-blue/20"
$html = $html -replace "bg-fuchsia-400", "bg-theme-blue"
$html = $html -replace "bg-\[\#fff5f8\]", "bg-theme-white"
$html = $html -replace "bg-white", "bg-theme-white"
$html = $html -replace "bg-green-50", "bg-theme-pink/60"
$html = $html -replace "bg-red-50", "bg-theme-pink/80"
$html = $html -replace "bg-red-100", "bg-theme-pink/80"
$html = $html -replace "bg-blue-100", "bg-theme-blue/20"
$html = $html -replace "bg-black\/50", "bg-theme-blue/50"

$html = $html -replace "border-pink-400", "border-theme-blue"
$html = $html -replace "border-pink-300", "border-theme-blue/50"
$html = $html -replace "border-pink-200", "border-theme-blue/30"
$html = $html -replace "border-red-300", "border-theme-blue/50"
$html = $html -replace "border-blue-300", "border-theme-blue/50"

$html = $html -replace "text-slate-700", "text-theme-blue"
$html = $html -replace "text-purple-900", "text-theme-blue"
$html = $html -replace "text-purple-800", "text-theme-blue"
$html = $html -replace "text-fuchsia-700", "text-theme-blue/90"
$html = $html -replace "text-gray-800", "text-theme-blue"
$html = $html -replace "text-gray-600", "text-theme-blue/70"
$html = $html -replace "text-gray-500", "text-theme-blue/60"
$html = $html -replace "text-green-700", "text-theme-blue"
$html = $html -replace "text-green-600", "text-theme-blue"
$html = $html -replace "text-red-700", "text-theme-blue"
$html = $html -replace "text-red-500", "text-theme-blue"
$html = $html -replace "text-blue-700", "text-theme-blue"
$html = $html -replace "text-blue-600", "text-theme-blue"
$html = $html -replace "text-white", "text-theme-white"
$html = $html -replace "text-\[\#fdfbf7\]", "text-theme-white"

$html | Out-File index.html -Encoding UTF8
Write-Host "Theme updated!"
