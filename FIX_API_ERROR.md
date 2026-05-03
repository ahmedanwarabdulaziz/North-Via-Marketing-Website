# Fix API Connection Refused Error

## Problem
- `ERR_CONNECTION_REFUSED` for `/api/contact`
- Form submission fails with "Failed to fetch"

## Root Cause
The Next.js dev server needs to be restarted to recognize API routes after code changes or cache clearing.

## Solution

### Step 1: Stop the Current Dev Server
Press `Ctrl+C` in the terminal where `npm run dev` is running, or:

```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Step 2: Clear Cache (if needed)
```powershell
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }
```

### Step 3: Restart Dev Server
```powershell
npm run dev
```

### Step 4: Wait for Compilation
Wait until you see:
```
✓ Ready in X seconds
○ Compiling /api/contact ...
✓ Compiled /api/contact in XXXms
```

### Step 5: Test the Form
1. Open http://localhost:3000
2. Navigate to the contact form
3. Submit the form
4. Check browser console - should see successful API call

## Verification

Check that API route is registered:
- Visit: http://localhost:3000/api/contact
- Should see: `{"error":"Method not allowed"}` or similar (not 404)

## Additional Fixes Applied
- ✅ Created missing `site.webmanifest` file
- ✅ Verified API route exists at `app/api/contact/route.ts`


