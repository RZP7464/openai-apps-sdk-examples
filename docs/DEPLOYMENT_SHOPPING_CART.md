# Deployment Guide for Shopping Cart Server on Render

## Overview

The shopping cart server demonstrates stateful widgets with session management. It's been updated to include:
- ✅ `securitySchemes: [{ type: "noauth" }]` - Makes tools visible in ChatGPT
- ✅ `annotations` with hints - Disables approval prompts
- ✅ Port configuration via environment variable
- ✅ CORS enabled for cross-origin requests

## Render Deployment Configuration

### 1. Environment Variables (Set in Render Dashboard)

```
BASE_URL=https://your-shopping-cart-app.onrender.com
PORT=10000
```

**Note**: 
- Replace `your-shopping-cart-app.onrender.com` with your actual Render URL
- Render typically sets `PORT` automatically to 10000
- The `BASE_URL` is critical for building assets with correct URLs

### 2. Build Command

```bash
pip install -r shopping_cart_python/requirements.txt && pnpm install && BASE_URL=$BASE_URL pnpm run build
```

**What this does:**
1. Installs Python dependencies for the server
2. Installs Node.js dependencies for building assets
3. Builds widget assets with your Render URL baked into the HTML files

### 3. Start Command

```bash
python shopping_cart_python/main.py
```

### 4. Important Settings

- **Root Directory**: Leave blank (use repository root)
- **Python Version**: 3.11 or higher
- **Region**: Choose closest to your users
- **Instance Type**: Starter (Free tier should work for testing)
- **Environment**: Python

## How the Shopping Cart Works

### State Management
The shopping cart demonstrates advanced state synchronization:

1. **Session-based state**: Each cart has a unique `cartId` tied to `widgetSessionId`
2. **Widget state persistence**: Uses `window.openai.widgetState` to maintain cart across conversation turns
3. **Bidirectional updates**: UI changes (incrementing quantities) persist through tool calls

### The Flow
```
User: "Add 2 eggs to my cart"
  ↓
Tool Call: add_to_cart({items: [{name: "eggs", quantity: 2}]})
  ↓
Server: Creates cart with ID, returns items + widgetSessionId
  ↓
Widget: Renders cart UI, saves state to window.openai.widgetState
  ↓
User increments eggs to 3 in UI
  ↓
Widget: Updates window.openai.widgetState
  ↓
User: "Add milk"
  ↓
Tool Call: add_to_cart with previous widgetState
  ↓
Server: Sees existing cart, adds milk
  ↓
Widget: Shows eggs (3) + milk (1)
```

## Fixed Issues

### 1. Missing `securitySchemes` Field
**Before:**
```python
types.Tool(
    name=TOOL_NAME,
    title="Add items to cart",
    description="...",
    inputSchema=TOOL_INPUT_SCHEMA,
    _meta=_widget_meta(),
)
```

**After:**
```python
types.Tool(
    name=TOOL_NAME,
    title="Add items to cart",
    description="...",
    inputSchema=TOOL_INPUT_SCHEMA,
    _meta=_widget_meta(),
    securitySchemes=[{"type": "noauth"}],  # ← Required for ChatGPT visibility
    annotations={
        "destructiveHint": False,
        "openWorldHint": False,
        "readOnlyHint": True,
    },
)
```

### 2. Port Configuration
**Before:** Hardcoded to port 8000
**After:** Reads from `PORT` environment variable (defaults to 8001 locally, 10000 on Render)

```python
port = int(os.environ.get("PORT", 8001))
uvicorn.run(app, host="0.0.0.0", port=port)
```

## Testing Locally Before Deploy

### 1. Build Assets
```bash
# From repo root
export BASE_URL=http://localhost:8001
pnpm run build
```

### 2. Start Server
```bash
# Create virtual environment
cd shopping_cart_python
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run server
python main.py
```

The server will run on `http://localhost:8001`

### 3. Test MCP Endpoint
```bash
# Test SSE endpoint
curl http://localhost:8001/mcp

# Should establish SSE connection
```

## ChatGPT Integration

Once deployed on Render:

1. Get your Render URL (e.g., `https://shopping-cart-abc123.onrender.com`)
2. In ChatGPT → Settings → Apps → Add MCP Connector
3. Enter URL: `https://shopping-cart-abc123.onrender.com/mcp`
4. The `add_to_cart` tool should now appear in ChatGPT

### Example Conversation Flow

```
You: "Add 2 eggs to my cart"
→ Widget shows: Eggs (2)

You: "Add milk"
→ Widget shows: Eggs (2), Milk (1)

[User clicks + button on eggs in widget]
→ Widget shows: Eggs (3), Milk (1)

You: "Add tomatoes"
→ Widget shows: Eggs (3), Milk (1), Tomatoes (1)
```

## Architecture

### Server Structure
```
shopping_cart_python/
├── main.py              # FastMCP server with add_to_cart tool
├── requirements.txt     # Python dependencies
└── .venv/              # Virtual environment (created on setup)

assets/
├── shopping-cart-{hash}.html  # Widget HTML (points to JS/CSS)
├── shopping-cart-{hash}.js    # Widget React code
└── shopping-cart-{hash}.css   # Widget styles
```

### Key Components

1. **FastMCP Server** (`main.py`):
   - Exposes `add_to_cart` tool
   - Manages cart state in-memory (production: use database)
   - Returns `widgetSessionId` for state continuity

2. **Widget** (`shopping-cart.tsx`):
   - Reads `window.openai.widgetState`
   - Displays cart items with increment/decrement UI
   - Persists changes back to `widgetState`

3. **Assets** (built by Vite):
   - Self-contained HTML with embedded JS/CSS references
   - Served from same domain as MCP server

## Troubleshooting

### Tools Still Hidden in ChatGPT

**Check:**
- Verify `securitySchemes: [{"type": "noauth"}]` is in tool definition (line 111 in main.py)
- Restart Render service after deploying changes
- Check Render logs for startup errors

### Widget Not Loading

**Check:**
- `BASE_URL` environment variable matches your Render URL
- Assets were rebuilt after setting `BASE_URL`
- Try accessing `https://your-app.onrender.com/shopping-cart-{hash}.js` directly
- Check browser console for CORS or network errors

### Cart State Not Persisting

**This is expected behavior in the current implementation:**
- Cart state is stored in-memory on the server
- Server restarts (on Render) will clear all carts
- For production, implement persistent storage (Redis, PostgreSQL, etc.)

**To fix:**
- Add database for cart storage
- Modify `_get_or_create_cart()` to read/write from DB
- See README.md "Recommended production pattern" section

### Port Binding Errors Locally

**If you see "Address already in use":**
```bash
# Find process on port 8001
lsof -i :8001

# Kill it
kill -9 <PID>

# Or run on different port
PORT=8002 python main.py
```

### CORS Errors

The server already includes CORS middleware:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

If you still see CORS errors, check Render logs for details.

## Production Recommendations

### 1. Add Persistent Storage
```python
# Example with Redis
import redis

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def _get_or_create_cart(cart_id: str | None) -> str:
    if cart_id:
        cart_data = redis_client.get(f"cart:{cart_id}")
        if cart_data:
            return cart_id
    
    new_id = cart_id or uuid4().hex
    redis_client.set(f"cart:{new_id}", json.dumps([]))
    return new_id
```

### 2. Add Authentication
For production, consider adding user authentication:
```python
securitySchemes=[{
    "type": "oauth2",
    "scopes": ["cart:read", "cart:write"]
}]
```

### 3. Add Rate Limiting
Protect your API from abuse:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@limiter.limit("10/minute")
async def _handle_call_tool(req: types.CallToolRequest):
    # ... existing code
```

### 4. Add Logging
```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@mcp._mcp_server.list_tools()
async def _list_tools():
    logger.info("Tools requested")
    # ... existing code
```

## Files Modified

- `shopping_cart_python/main.py`:
  - Added `securitySchemes: [{"type": "noauth"}]` (line 111)
  - Added `annotations` dict (lines 113-117)
  - Added PORT environment variable support (line 223)

## Next Steps

1. Commit changes to your Git repository
2. Create a new Web Service on Render
3. Connect your GitHub/GitLab repository
4. Set environment variables in Render dashboard
5. Deploy!
6. Test MCP endpoint: `https://your-app.onrender.com/mcp`
7. Add to ChatGPT and start shopping! 🛒

## Support

If you encounter issues:
- Check Render logs for server errors
- Check browser console for client errors
- Verify BASE_URL matches deployment URL
- Ensure assets directory has the built files

