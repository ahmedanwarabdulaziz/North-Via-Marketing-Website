# Fix ChunkLoadError - Step by Step Guide

## Problem
ChunkLoadError: Loading chunk app/layout failed (timeout)

## Solution Steps

### Step 1: Stop All Node Processes
```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Step 2: Clear All Caches
```powershell
# Delete Next.js build cache
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }

# Delete node_modules cache
if (Test-Path "node_modules\.cache") { Remove-Item -Recurse -Force "node_modules\.cache" }

# Clear npm cache (optional)
npm cache clean --force
```

### Step 3: Verify Port 3000 is Free
```powershell
# Check if port 3000 is in use
netstat -ano | findstr :3000

# If something is using it, kill it (replace PID with actual process ID)
# taskkill /PID <PID> /F
```

### Step 4: Reinstall Dependencies (if needed)
```powershell
# Remove node_modules and package-lock.json
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# Reinstall
npm install
```

### Step 5: Start Fresh Dev Server
```powershell
npm run dev
```

## Alternative: Use Different Port
If port 3000 is problematic, use a different port:
```powershell
$env:PORT=3001; npm run dev
```

## If Issue Persists

1. **Check for file system permissions** - Ensure you have write access to the project folder
2. **Check antivirus** - Some antivirus software can interfere with file watching
3. **Try running as administrator** - Right-click PowerShell and "Run as Administrator"
4. **Check Next.js version compatibility** - Ensure all dependencies are compatible with Next.js 15.5.4

## Quick Fix Command (Run All At Once)
```powershell
# Stop processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Clear caches
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }
if (Test-Path "node_modules\.cache") { Remove-Item -Recurse -Force "node_modules\.cache" }

# Start server
npm run dev
```


