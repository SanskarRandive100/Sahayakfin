# One-time setup for Windows. Run from the repo root:
#   powershell -ExecutionPolicy Bypass -File scripts/setup-dev.ps1
git config core.hooksPath .githooks
if (-not (Test-Path .env)) { Copy-Item .env.example .env; Write-Host "Created .env from .env.example" }
Write-Host ("git user.name  = " + (git config user.name))
Write-Host ("git user.email = " + (git config user.email))
if (-not (git config user.name)) { Write-Host 'WARNING: run git config user.name "Your Name"; git config user.email "you@example.com"' }
Write-Host ("Hooks path     = " + (git config core.hooksPath))
Write-Host "Setup done. (Git for Windows runs the hooks with its bundled sh.)"
