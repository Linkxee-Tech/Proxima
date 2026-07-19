param(
    [int]$Port = 8000
)

if (-not $env:PROXIMA_STORAGE_BACKEND) {
    $env:PROXIMA_STORAGE_BACKEND = "local"
}
& "$PSScriptRoot\.venv\Scripts\uvicorn.exe" app.main:app --host localhost --port $Port
