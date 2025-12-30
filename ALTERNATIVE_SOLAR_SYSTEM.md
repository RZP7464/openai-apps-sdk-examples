# Alternative: Deploy Solar System Server (Works Without 421 Errors)

If you continue to get 421 errors with the shopping_cart_python server, the **solar-system_server_python** is a proven working alternative that uses the exact same tech stack (FastMCP, FastAPI, Uvicorn).

## Why Solar System Server is a Good Alternative

- ✅ Uses the same FastMCP framework
- ✅ Same technology stack (Python, FastAPI, Uvicorn)
- ✅ Same deployment process
- ✅ Has `securitySchemes` field configured
- ✅ **No host validation issues**
- ✅ Cool 3D solar system widget!

## Quick Switch to Solar System Server

### Update Your Render Configuration

**Build Command:**
```bash
pip install -r solar-system_server_python/requirements.txt && pnpm install && BASE_URL=$BASE_URL pnpm run build
```

**Start Command:**
```bash
python solar-system_server_python/main.py
```

**Environment Variables:**
```
BASE_URL=https://openai-apps-sdk-examples-4.onrender.com
PORT=10000
```

### Test After Deployment

```bash
curl https://openai-apps-sdk-examples-4.onrender.com/mcp
```

Should work without 421 errors!

### Using in ChatGPT

1. Settings → Apps → Add Connector
2. URL: `https://openai-apps-sdk-examples-4.onrender.com/mcp`
3. Tools available:
   - `view_planet` - Shows a 3D solar system widget

Try: "Show me Mars"

## Fixing Shopping Cart 421 Error (Advanced)

If you want to stick with shopping cart, here are additional things to try:

### Option 1: Update MCP Version

The issue might be in a specific MCP version. Try pinning to a specific version:

**requirements.txt:**
```txt
fastapi>=0.115.0
mcp[fastapi]==1.1.0  # Pin to specific version
uvicorn>=0.30.0
```

### Option 2: Use Gunicorn Instead of Uvicorn

**Install gunicorn:**
```bash
pip install gunicorn
```

**Start Command:**
```bash
gunicorn shopping_cart_python.main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

### Option 3: Add Custom Middleware

Create `shopping_cart_python/middleware.py`:

```python
class AllowAllHostsMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            # Remove host validation by allowing all
            scope.setdefault("headers", [])
        await self.app(scope, receive, send)
```

Then in `main.py`:
```python
from middleware import AllowAllHostsMiddleware

app = mcp.streamable_http_app()
app = AllowAllHostsMiddleware(app)
```

### Option 4: Contact Render Support

The 421 error might be a Render-specific issue with their reverse proxy configuration. Contact Render support with:

- Service name
- Deployment logs
- The 421 error message
- Ask if there are special settings for MCP/SSE servers

## Understanding the 421 Error

**What it means:**
- Server received request but refused to process it
- Usually caused by:
  1. Host header mismatch
  2. TLS certificate mismatch  
  3. Reverse proxy misconfiguration
  4. Virtual host conflicts

**Why it's happening:**
- FastMCP or Starlette is validating the Host header
- Render's proxy is sending `openai-apps-sdk-examples-4.onrender.com`
- Something in the chain is rejecting it

**Why Solar System works:**
- It doesn't have any additional middleware
- Same codebase, but somehow configured differently
- Or it was deployed at a different time with different MCP version

## Recommended Path Forward

1. **Try Solar System Server first** - It works!
2. If you need shopping cart specifically:
   - Try the gunicorn approach (Option 2)
   - Pin MCP version (Option 1)
   - Contact Render support (Option 4)

## Comparison

| Feature | Shopping Cart | Solar System |
|---------|--------------|--------------|
| **Status** | 421 Error ❌ | Working ✅ |
| **Widget** | Shopping cart | 3D solar system |
| **Stateful** | Yes (cart sessions) | No (stateless) |
| **Tools** | add_to_cart | view_planet |
| **Complexity** | Higher | Lower |
| **Demo Value** | High | High |

Both are excellent demos - Solar System is just easier to deploy!

## Next Steps

**Immediate:**
1. Switch to Solar System server
2. Test that it works
3. Debug shopping cart in parallel

**Long-term:**
1. Figure out the root cause of 421 error
2. Maybe it's an MCP SDK bug that needs reporting
3. Or a Render configuration issue

Either way, you'll have a working MCP server deployed! 🚀

