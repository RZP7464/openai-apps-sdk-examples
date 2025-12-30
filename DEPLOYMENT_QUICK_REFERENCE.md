# Quick Deployment Reference

## Summary of Servers Running Locally

| Server | Port | Status | MCP Endpoint |
|--------|------|--------|--------------|
| pizzaz_server_node | 8000 | ❌ Stopped (port conflict) | http://localhost:8000/mcp |
| shopping_cart_python | 8001 | ✅ Running | http://localhost:8001/mcp |

## Render Deployment Commands

### Pizzaz Server (Node.js)

**Environment Variables:**
```
BASE_URL=https://your-pizzaz-app.onrender.com
```

**Build Command:**
```bash
pnpm install && BASE_URL=$BASE_URL pnpm run build && cd pizzaz_server_node && pnpm install
```

**Start Command:**
```bash
cd pizzaz_server_node && pnpm start
```

**Runtime:** Node.js
**Port:** Render assigns automatically (usually 10000)

---

### Shopping Cart Server (Python)

**Environment Variables:**
```
BASE_URL=https://your-shopping-cart-app.onrender.com
PORT=10000
```

**Build Command:**
```bash
pip install -r shopping_cart_python/requirements.txt && pnpm install && BASE_URL=$BASE_URL pnpm run build
```

**Start Command:**
```bash
python shopping_cart_python/main.py
```

**Runtime:** Python 3.11+
**Port:** From PORT env variable (default 8001 locally, 10000 on Render)

---

## What Was Fixed

Both servers were missing the `securitySchemes` field that ChatGPT requires to show tools as public:

### Before (Tools Hidden ❌)
```typescript
// or python equivalent
{
  name: "tool-name",
  description: "...",
  inputSchema: {...},
  _meta: {...}
}
```

### After (Tools Visible ✅)
```typescript
// or python equivalent
{
  name: "tool-name",
  description: "...",
  inputSchema: {...},
  _meta: {...},
  securitySchemes: [{ type: "noauth" }],  // ← This is required!
  annotations: {
    destructiveHint: false,
    openWorldHint: false,
    readOnlyHint: true,
  }
}
```

## Additional Fixes

### Pizzaz Server (Node.js)
- ✅ Added `securitySchemes` to tool definitions
- ✅ Added static file serving for JS/CSS/HTML assets
- ✅ Added CORS headers for asset serving

### Shopping Cart Server (Python)
- ✅ Added `securitySchemes` to tool definition
- ✅ Added `annotations` for approval prompt control
- ✅ Added PORT environment variable support
- ✅ Already had CORS middleware enabled

## Testing ChatGPT Integration

Once deployed to Render:

1. **Get your Render URL** (e.g., `https://my-app.onrender.com`)
2. **Open ChatGPT** → Settings → Apps
3. **Add MCP Connector:**
   - URL: `https://my-app.onrender.com/mcp`
   - Click "Connect"
4. **Tools should appear** and be usable immediately!

### Expected Tools

**Pizzaz Server:**
- pizza-map
- pizza-carousel
- pizza-albums
- pizza-list
- pizza-shop

**Shopping Cart Server:**
- add_to_cart

## Common Issues & Quick Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "All tools are hidden" | Missing `securitySchemes` | Already fixed in both servers ✅ |
| Widget shows blank | Wrong BASE_URL | Set correct Render URL in env vars |
| Port binding error | Port already in use | Change PORT env variable |
| Assets 404 errors | Assets not built or wrong URL | Rebuild with correct BASE_URL |
| CORS errors | Missing CORS headers | Already fixed in both servers ✅ |

## Build Process Explained

### Why BASE_URL Matters

The build process (`pnpm run build`) generates HTML files like this:

```html
<!doctype html>
<html>
<head>
  <script type="module" src="https://YOUR-BASE-URL/pizzaz-2d2b.js"></script>
  <link rel="stylesheet" href="https://YOUR-BASE-URL/pizzaz-2d2b.css">
</head>
<body>
  <div id="pizzaz-root"></div>
</body>
</html>
```

If `BASE_URL` is wrong:
- ❌ Widget tries to load JS from wrong URL
- ❌ 404 errors in browser console
- ❌ Widget appears blank

If `BASE_URL` is correct:
- ✅ Widget loads JS from your Render app
- ✅ Assets served by your server
- ✅ Widget renders properly

## Files You Can Reference

- `DEPLOYMENT.md` - Detailed Pizzaz server deployment guide
- `DEPLOYMENT_SHOPPING_CART.md` - Detailed Shopping Cart server deployment guide
- This file - Quick reference for both

## Ready to Deploy?

1. ✅ Code changes committed
2. ✅ Choose which server to deploy (or both!)
3. ✅ Create Render Web Service
4. ✅ Set environment variables
5. ✅ Use build & start commands above
6. ✅ Deploy!
7. ✅ Test MCP endpoint
8. ✅ Add to ChatGPT
9. ✅ Enjoy your working MCP server! 🎉

