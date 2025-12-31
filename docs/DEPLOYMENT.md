# Deployment Guide for Pizzaz Server on Render

## The Problem You Were Facing

The "All tools are hidden. Make at least one tool public to use it in ChatGPT" error was caused by:

1. **Missing `securitySchemes` field**: ChatGPT requires all tools to have a `securitySchemes` field, even for public/unauthenticated tools. Without this field, ChatGPT treats them as hidden.

2. **Missing static file serving**: The server wasn't serving the JS/CSS assets that the widgets need to render.

## Fixed Issues

✅ **Added `securitySchemes: [{ type: "noauth" }]`** to all tool definitions
✅ **Added static file serving** for `.js`, `.css`, `.html`, and `.map` files from the `assets` directory

## Render Deployment Configuration

### 1. Environment Variables (Set in Render Dashboard)

```
BASE_URL=https://your-app-name.onrender.com
PORT=10000
```

**Note**: 
- Replace `your-app-name.onrender.com` with your actual Render URL
- Render usually sets `PORT` automatically, but set it to match what Render assigns
- The `BASE_URL` is critical - it tells the build process where the static assets will be served from

### 2. Build Command

```bash
pnpm install && BASE_URL=$BASE_URL pnpm run build && cd pizzaz_server_node && pnpm install
```

**What this does:**
- Installs root dependencies
- Builds widget assets with your Render URL baked into the HTML files
- Installs pizzaz_server_node dependencies

### 3. Start Command

```bash
cd pizzaz_server_node && pnpm start
```

### 4. Important Settings

- **Root Directory**: Leave blank (use repository root)
- **Node Version**: 18 or higher
- **Region**: Choose closest to your users
- **Instance Type**: Starter (Free tier should work for testing)

## How It Works Now

1. **Build Process**: 
   - The `build-all.mts` script reads the `BASE_URL` environment variable
   - Generates HTML files with script/link tags pointing to `https://your-app-name.onrender.com/pizzaz-xxx.js`

2. **Runtime**:
   - The server listens on the port Render assigns (usually 10000)
   - Serves MCP endpoints at `/mcp` (SSE) and `/mcp/messages` (POST)
   - Serves static assets (JS, CSS) from the `/` path
   - Tools are now marked as `noauth` so ChatGPT shows them as public

3. **ChatGPT Integration**:
   - ChatGPT can now see all tools as public (not hidden)
   - When a tool is called, the server returns widget HTML
   - The HTML loads JS/CSS from your Render URL
   - Widgets render properly in ChatGPT

## Testing Locally Before Deploy

To test with the same setup locally:

```bash
# Set BASE_URL to localhost
export BASE_URL=http://localhost:8000

# Build assets
pnpm run build

# Start server
cd pizzaz_server_node && pnpm start
```

The server will run on port 8000 (or whatever PORT env var you set).

## Troubleshooting

### Tools still showing as hidden
- **Check**: Make sure your Render service is actually running
- **Check**: Verify the MCP connector URL in ChatGPT points to your Render URL + `/mcp`
- **Check**: Look at Render logs for any errors during startup

### Widgets not loading/showing blank
- **Check**: BASE_URL environment variable is set correctly in Render
- **Check**: Rebuild after changing BASE_URL (old HTML files will have wrong URLs)
- **Check**: Assets are being served - try accessing `https://your-app.onrender.com/pizzaz-2d2b.js` directly

### CORS errors
- The server already has CORS enabled with `Access-Control-Allow-Origin: *`
- If you still see CORS errors, check Render logs for details

### Server crashes on startup
- **Check**: `assets` directory exists and has the built files
- **Check**: You ran the full build command before starting
- **Check**: Node version is 18 or higher

## Files Modified

- `pizzaz_server_node/src/server.ts`:
  - Added `securitySchemes: [{ type: "noauth" }]` to tool definitions (line ~172)
  - Added static file serving middleware (lines ~385-420)

## Next Steps After Deployment

1. Get your Render URL (e.g., `https://pizzaz-server-abc123.onrender.com`)
2. In ChatGPT, go to Settings > Apps
3. Add MCP connector with URL: `https://pizzaz-server-abc123.onrender.com/mcp`
4. Tools should now appear and work properly!

