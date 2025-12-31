# OpenAI Connector Apps (MCP) Integration Guide

## What are OpenAI Connector Apps?

OpenAI Connector Apps (now called "Apps") enable ChatGPT to integrate with third-party services using the **Model Context Protocol (MCP)**. This allows ChatGPT to:

- Access external tools and data sources
- Render rich UI components (widgets) in chat
- Perform actions on external services
- Maintain stateful interactions across conversation turns

## MCP Server Requirements for ChatGPT

### 1. Essential Endpoints

Your MCP server MUST expose these two endpoints:

```
GET  /mcp                        # SSE (Server-Sent Events) stream
POST /mcp/messages?sessionId=... # Message handler for tool calls
```

### 2. Required Response Headers

**For SSE endpoint (`GET /mcp`):**
```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Access-Control-Allow-Origin: *
```

**For message endpoint (`POST /mcp/messages`):**
```http
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: content-type
```

### 3. MCP Capabilities

Your server must implement these core MCP capabilities:

#### a) **List Tools**
Advertise available tools with their schemas:

```python
# Python example
types.Tool(
    name="my_tool",
    title="My Tool Title",
    description="What this tool does",
    inputSchema={...},              # JSON Schema for inputs
    _meta={...},                    # Widget metadata
    securitySchemes=[...],          # ⚠️ REQUIRED for ChatGPT
    annotations={...}               # Optional hints
)
```

#### b) **Call Tools**
Handle tool invocations and return results:

```python
types.CallToolResult(
    content=[...],                  # Text/image content
    structuredContent={...},        # Structured data
    _meta={...}                     # Widget rendering info
)
```

#### c) **Return Widgets** (Optional but recommended)
Include widget HTML for rich UI:

```python
_meta={
    "openai/outputTemplate": "ui://widget/my-widget.html",
    "openai/toolInvocation/invoking": "Loading...",
    "openai/toolInvocation/invoked": "Done!",
    "openai/widgetAccessible": True
}
```

## Critical: The `securitySchemes` Field

### Why It Matters

ChatGPT uses the `securitySchemes` field to determine:
- If a tool is public or requires authentication
- Whether to show the tool in the UI
- What authentication flow to trigger

**Without `securitySchemes`, tools will be HIDDEN** ❌

### Correct Implementation

**For public tools (no auth):**
```python
securitySchemes=[{"type": "noauth"}]
```

**For OAuth-protected tools:**
```python
securitySchemes=[{
    "type": "oauth2",
    "scopes": ["read:data", "write:data"]
}]
```

**For mixed auth tools:**
```python
securitySchemes=[
    {"type": "noauth"},
    {"type": "oauth2", "scopes": ["premium:access"]}
]
```

## Deployment Configuration

### Host Header Handling

**Problem:** Deployment platforms like Render use reverse proxies that modify the `Host` header, causing "Invalid Host" errors.

**Solution for Python (FastAPI/Uvicorn):**

```python
# Add TrustedHostMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Or specify your domain
)

# Configure Uvicorn for proxy
uvicorn.run(
    app,
    host="0.0.0.0",
    port=port,
    forwarded_allow_ips="*",  # Trust proxy headers
    proxy_headers=True         # Enable X-Forwarded-* headers
)
```

**Solution for Node.js:**

```typescript
// Robust URL parsing
const host = req.headers.host || "localhost";
let url: URL;
try {
    url = new URL(req.url, `http://${host}`);
} catch (error) {
    res.writeHead(400).end("Invalid URL");
    return;
}
```

### Environment Variables

**Required:**
```bash
BASE_URL=https://your-app.onrender.com  # For building widget assets
PORT=10000                               # Server port (Render sets automatically)
```

**Optional (for production):**
```bash
ALLOWED_HOSTS=your-app.onrender.com,*.onrender.com
NODE_ENV=production
```

### CORS Configuration

**Python:**
```python
from starlette.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           # Or specific domains
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False
)
```

**Node.js:**
```typescript
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "content-type");
```

## Connecting to ChatGPT

### Step 1: Enable Developer Mode

1. Go to [OpenAI Platform](https://platform.openai.com/docs/guides/developer-mode)
2. Enable Developer Mode
3. This allows custom MCP connectors

### Step 2: Add Your MCP Server

1. Open ChatGPT
2. Go to **Settings** → **Apps** → **Connectors**
3. Click **Add Connector**
4. Enter your MCP server URL:
   ```
   https://your-app.onrender.com/mcp
   ```
5. Click **Connect**

### Step 3: Verify Connection

**Tools should appear in the Tools section:**
- Green checkmark = Connected successfully
- Red X = Connection failed (check logs)

**Common connection issues:**
- ❌ Invalid Host error → Add TrustedHostMiddleware
- ❌ Tools hidden → Add securitySchemes field
- ❌ CORS error → Add CORS headers
- ❌ 404 error → Check endpoint path is `/mcp`
- ❌ Timeout → Check port and firewall

### Step 4: Use in Conversations

1. Start a new chat in ChatGPT
2. Click the **"+"** or **"More"** button
3. Select your app from the list
4. Tools are now available in context
5. Ask questions that trigger your tools

**Example:**
```
User: "Add eggs and milk to my cart"
→ ChatGPT calls add_to_cart tool
→ Widget renders with cart items
```

## Testing Locally with ngrok

Before deploying, test locally:

### 1. Start Your Server
```bash
# Python
python shopping_cart_python/main.py

# Node.js
cd pizzaz_server_node && pnpm start
```

### 2. Expose with ngrok
```bash
ngrok http 8000
```

You'll get a public URL:
```
https://abc123.ngrok-free.app
```

### 3. Add to ChatGPT
Use the ngrok URL:
```
https://abc123.ngrok-free.app/mcp
```

### 4. Test Your Tools
Try invoking your tools in ChatGPT and check:
- Tools appear in UI ✓
- Tool calls succeed ✓
- Widgets render correctly ✓
- Errors are handled gracefully ✓

## Widget Integration

### Widget Metadata

Include in tool `_meta` field:

```python
_meta={
    # Required: Widget template URI
    "openai/outputTemplate": "ui://widget/my-widget.html",
    
    # Optional: Loading states
    "openai/toolInvocation/invoking": "Loading widget...",
    "openai/toolInvocation/invoked": "Widget loaded!",
    
    # Required: Widget accessibility
    "openai/widgetAccessible": True,
    
    # Optional: Session for stateful widgets
    "openai/widgetSessionId": session_id
}
```

### Widget HTML

Widgets are served as HTML with embedded JS/CSS:

```html
<!doctype html>
<html>
<head>
    <script type="module" src="https://your-server.com/widget.js"></script>
    <link rel="stylesheet" href="https://your-server.com/widget.css">
</head>
<body>
    <div id="widget-root"></div>
</body>
</html>
```

### Building Widgets

Use the provided build system:

```bash
# Set your deployment URL
export BASE_URL=https://your-app.onrender.com

# Build all widgets
pnpm run build
```

This generates:
```
assets/
├── my-widget-{hash}.html   # Widget HTML
├── my-widget-{hash}.js     # Widget code
└── my-widget-{hash}.css    # Widget styles
```

### Serving Widget Assets

**Option 1: Same server (recommended)**

```python
# Python - FastAPI serves from static directory
from fastapi.staticfiles import StaticFiles
app.mount("/assets", StaticFiles(directory="assets"), name="assets")
```

```typescript
// Node.js - serve from assets directory
if (fileName.endsWith(".js") || fileName.endsWith(".css")) {
    const content = fs.readFileSync(path.join(ASSETS_DIR, fileName));
    res.writeHead(200, {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*"
    });
    res.end(content);
}
```

**Option 2: CDN (production)**

Upload assets to CDN and set BASE_URL to CDN URL.

## Stateful Widgets

For widgets that maintain state across turns:

### 1. Use widgetSessionId

```python
_meta={
    "openai/widgetSessionId": cart_id,  # Unique session ID
    "openai/outputTemplate": "ui://widget/cart.html"
}
```

### 2. Widget State Management

In your widget code:

```typescript
// Read previous state
const previousState = window.openai.widgetState || {};

// Update with new data
const newState = {
    ...previousState,
    items: toolOutput.items
};

// Save for next turn
window.openai.widgetState = newState;
```

### 3. Server-side State (Production)

For production, store state server-side:

```python
# Use Redis, PostgreSQL, etc.
cart = redis.get(f"cart:{cart_id}")
cart["items"].append(new_item)
redis.set(f"cart:{cart_id}", cart)
```

## Troubleshooting Guide

### Tools Not Showing ("All tools are hidden")

**Cause:** Missing `securitySchemes` field

**Fix:**
```python
securitySchemes=[{"type": "noauth"}]
```

### Invalid Host Error

**Cause:** Server doesn't trust proxy headers

**Fix:** Add TrustedHostMiddleware and proxy settings (see above)

### Widget Not Rendering

**Causes:**
- Wrong BASE_URL during build
- Assets not accessible (404)
- CORS errors

**Fixes:**
1. Rebuild with correct BASE_URL
2. Verify assets are served: `curl https://your-app.com/widget.js`
3. Check browser console for errors
4. Add CORS headers to asset serving

### Connection Timeout

**Causes:**
- Server not listening on correct port
- Firewall blocking requests
- Server crashed

**Fixes:**
1. Check `PORT` environment variable
2. Check Render logs for errors
3. Restart service
4. Verify health endpoint works

### SSE Connection Drops

**Causes:**
- Load balancer timeout
- Keep-alive not configured
- Server doesn't support streaming

**Fixes:**
1. Send periodic keep-alive events
2. Configure platform timeout (e.g., Render allows 120s)
3. Implement reconnection logic

## Security Best Practices

### 1. Validate Inputs

```python
from pydantic import BaseModel, Field

class ToolInput(BaseModel):
    query: str = Field(..., max_length=1000)
    limit: int = Field(10, ge=1, le=100)
```

### 2. Rate Limiting

```python
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@limiter.limit("10/minute")
async def handle_tool_call(request):
    # ... handle request
```

### 3. Authentication (when needed)

```python
securitySchemes=[{
    "type": "oauth2",
    "scopes": ["read:data"]
}]

# Validate token in tool handler
if not validate_oauth_token(request.headers.get("Authorization")):
    return error_response("Unauthorized")
```

### 4. Input Sanitization

```python
import html

def sanitize_input(text: str) -> str:
    return html.escape(text)
```

### 5. Error Handling

```python
try:
    result = call_external_api()
except Exception as e:
    return types.CallToolResult(
        content=[types.TextContent(
            type="text",
            text=f"Error: {str(e)}"
        )],
        isError=True
    )
```

## Resources

- **OpenAI Apps SDK**: https://developers.openai.com/apps-sdk
- **MCP Specification**: https://modelcontextprotocol.io
- **ChatGPT Developer Mode**: https://platform.openai.com/docs/guides/developer-mode
- **This Repository**: Example implementations and widgets

## Summary

**Required for ChatGPT Integration:**
1. ✅ MCP endpoints: `GET /mcp` and `POST /mcp/messages`
2. ✅ `securitySchemes` field in tool definitions
3. ✅ Proper CORS headers
4. ✅ Trusted host middleware (for deployment)
5. ✅ Widget assets served from BASE_URL

**Optional but Recommended:**
- Widget UI for rich interactions
- State management for multi-turn experiences
- Authentication for protected resources
- Rate limiting and security measures

Follow this guide and your MCP server will integrate seamlessly with ChatGPT! 🚀

