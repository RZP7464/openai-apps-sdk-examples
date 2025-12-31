# Fixing "Invalid Host" Error on Render

## The Problem

When accessing `https://openai-apps-sdk-examples-4.onrender.com/mcp`, you get an "Invalid Host" error.

## Root Cause

This error occurs when:
1. **FastAPI/Uvicorn (Python)**: The server has host validation enabled and doesn't trust the incoming host header from Render's proxy
2. **Node.js**: URL parsing fails because the host header isn't being properly handled

## Solutions Applied

### For Shopping Cart Python (FastAPI/Uvicorn)

#### Fix 1: Added Trusted Host Middleware

```python
# Added to shopping_cart_python/main.py
from starlette.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Allow all hosts
)
```

#### Fix 2: Updated Uvicorn Configuration

```python
# Updated uvicorn.run() call
uvicorn.run(
    app,
    host="0.0.0.0",
    port=port,
    forwarded_allow_ips="*",  # Trust forwarded headers from proxy
    proxy_headers=True        # Enable proxy header support
)
```

### For Pizzaz Node (Node.js)

#### Fix: Improved URL Parsing with Error Handling

```typescript
// Updated pizzaz_server_node/src/server.ts
const host = req.headers.host || "localhost";
let url: URL;
try {
    url = new URL(req.url, `http://${host}`);
} catch (error) {
    console.error("Invalid URL", error);
    res.writeHead(400).end("Invalid URL");
    return;
}
```

## How to Apply the Fix

### Option 1: Redeploy on Render (Recommended)

1. **Commit the changes:**
   ```bash
   git add .
   git commit -m "Fix invalid host error for Render deployment"
   git push
   ```

2. **Render will auto-deploy** if you have auto-deploy enabled, or manually trigger a deploy from the Render dashboard.

3. **Wait for deployment** to complete (usually 2-5 minutes)

4. **Test the endpoint:**
   ```bash
   curl https://openai-apps-sdk-examples-4.onrender.com/mcp
   ```

### Option 2: Manual Deploy

If you're not using Git auto-deploy:

1. Go to Render Dashboard → Your Service
2. Click "Manual Deploy" → "Deploy latest commit"
3. Wait for completion
4. Test the endpoint

## Testing the Fix

### Test 1: MCP Endpoint
```bash
curl -i https://openai-apps-sdk-examples-4.onrender.com/mcp
```

**Expected Response:**
```
HTTP/2 200
content-type: text/event-stream
...

event: endpoint
data: /mcp/messages
```

### Test 2: From ChatGPT

1. Open ChatGPT → Settings → Apps
2. Add MCP Connector
3. URL: `https://openai-apps-sdk-examples-4.onrender.com/mcp`
4. Should connect successfully

## Alternative: Specify Allowed Hosts (More Secure)

Instead of allowing all hosts (`"*"`), you can specify your exact Render domain:

### For Python:
```python
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "openai-apps-sdk-examples-4.onrender.com",
        "*.onrender.com",  # Allow any Render subdomain
        "localhost",
        "127.0.0.1"
    ]
)
```

### For Node.js:
```typescript
// Add host validation
const allowedHosts = [
    "openai-apps-sdk-examples-4.onrender.com",
    "localhost"
];

const host = req.headers.host || "localhost";
const hostWithoutPort = host.split(":")[0];

if (!allowedHosts.includes(hostWithoutPort) && 
    !hostWithoutPort.endsWith(".onrender.com")) {
    res.writeHead(400).end("Invalid Host");
    return;
}
```

## Common Issues After Applying Fix

### Issue: Still Getting Invalid Host Error

**Cause**: Old deployment still running

**Fix:**
1. Force a new deployment on Render
2. Check Render logs to confirm the new code is running
3. Clear browser cache
4. Try accessing from a new incognito window

### Issue: Connection Timeout

**Cause**: Server not binding to correct port

**Fix:**
Check that `PORT` environment variable is set correctly:
```bash
# In Render dashboard → Environment
PORT=10000
```

### Issue: 404 Not Found

**Cause**: Wrong endpoint path

**Fix:**
- Correct path: `/mcp` (not `/MCP` or `/api/mcp`)
- Full URL: `https://your-app.onrender.com/mcp`

## Verify Deployment Settings

### Python Server (Shopping Cart)

**Environment Variables:**
```
BASE_URL=https://openai-apps-sdk-examples-4.onrender.com
PORT=10000
```

**Start Command:**
```bash
python shopping_cart_python/main.py
```

**Python Version:** 3.11 or higher

### Node.js Server (Pizzaz)

**Environment Variables:**
```
BASE_URL=https://openai-apps-sdk-examples-4.onrender.com
```

**Start Command:**
```bash
cd pizzaz_server_node && pnpm start
```

**Node Version:** 18 or higher

## Check Render Logs

To see what's actually happening:

1. Go to Render Dashboard → Your Service
2. Click "Logs" tab
3. Look for errors like:
   ```
   ERROR: Invalid Host header
   ValueError: Invalid host header
   ```

If you see these, the fix should resolve them after redeployment.

## Production-Ready Configuration

For production, add these additional settings:

### Python:
```python
# Use specific allowed hosts
allowed_hosts = os.environ.get("ALLOWED_HOSTS", "").split(",")
if not allowed_hosts or allowed_hosts == [""]:
    allowed_hosts = ["*"]  # Fallback for development

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=allowed_hosts
)
```

**Render Environment Variable:**
```
ALLOWED_HOSTS=openai-apps-sdk-examples-4.onrender.com,*.onrender.com
```

### Node.js:
```typescript
const allowedHostsEnv = process.env.ALLOWED_HOSTS;
const allowedHosts = allowedHostsEnv 
    ? allowedHostsEnv.split(",")
    : ["*"];  // Fallback for development
```

**Render Environment Variable:**
```
ALLOWED_HOSTS=openai-apps-sdk-examples-4.onrender.com,*.onrender.com
```

## Summary

✅ **Changes Made:**
- Added `TrustedHostMiddleware` to Python server
- Added `forwarded_allow_ips="*"` and `proxy_headers=True` to uvicorn
- Improved URL parsing in Node.js server
- Added error handling for invalid hosts

✅ **Next Steps:**
1. Commit and push changes
2. Redeploy on Render
3. Test MCP endpoint
4. Add to ChatGPT

The "Invalid Host" error should now be resolved! 🎉

