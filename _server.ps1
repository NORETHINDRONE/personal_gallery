$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8080/')
$listener.Start()

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css' = 'text/css; charset=utf-8'
    '.js' = 'application/javascript'
    '.jpg' = 'image/jpeg'
    '.png' = 'image/png'
    '.ico' = 'image/x-icon'
    '.ttf' = 'font/ttf'
    '.otf' = 'font/otf'
}

$basePath = 'E:\Codex\personal_gallery'

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    $urlPath = $request.Url.AbsolutePath
    if ($urlPath -eq '/') {
        $response.StatusCode = 302
        $response.RedirectLocation = '/Home/Home.html'
        $response.Close()
        continue
    }
    
    $filePath = Join-Path $basePath $urlPath.TrimStart('/')
    
    if (Test-Path $filePath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
        $response.ContentType = $contentType
        
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $response.StatusCode = 404
    }
    $response.Close()
}
