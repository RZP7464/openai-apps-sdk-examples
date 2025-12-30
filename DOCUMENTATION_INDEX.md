# Documentation Index

This repository contains comprehensive guides for deploying MCP servers to work with ChatGPT via OpenAI Connector Apps.

## 📚 Available Guides

### 1. [OpenAI Connector Apps Guide](./OPENAI_CONNECTOR_APPS_GUIDE.md) 🎯 **START HERE**
Complete reference for integrating MCP servers with ChatGPT, including:
- What are OpenAI Connector Apps?
- MCP server requirements
- The critical `securitySchemes` field
- Host header handling
- Widget integration
- Troubleshooting guide
- Security best practices

### 2. [Deployment Quick Reference](./DEPLOYMENT_QUICK_REFERENCE.md)
Quick commands cheat sheet for both servers:
- Side-by-side comparison of Pizzaz (Node.js) and Shopping Cart (Python)
- Build and start commands
- Environment variables
- Common issues and fixes

### 3. [Pizzaz Server Deployment (Node.js)](./DEPLOYMENT.md)
Detailed guide for deploying the Pizzaz server:
- Multiple demo widgets (map, carousel, albums, list, shop)
- Static file serving
- Render configuration
- Complete troubleshooting section

### 4. [Shopping Cart Server Deployment (Python)](./DEPLOYMENT_SHOPPING_CART.md)
Detailed guide for deploying the Shopping Cart server:
- Stateful widget demonstration
- Session management with `widgetSessionId`
- Production recommendations
- Cart state persistence patterns

### 5. [Fixing Invalid Host Error](./FIXING_INVALID_HOST.md)
Specific troubleshooting for the "Invalid Host" error:
- Root causes
- Solutions for Python and Node.js
- Testing procedures
- Production-ready configurations

## 🚀 Quick Start

### If you're seeing "All tools are hidden":
1. Check that `securitySchemes=[{"type": "noauth"}]` is in your tool definitions
2. See: [Fixing Invalid Host Error](./FIXING_INVALID_HOST.md)

### If you're seeing "Invalid Host" error:
1. Add TrustedHostMiddleware (Python) or improve URL parsing (Node.js)
2. See: [Fixing Invalid Host Error](./FIXING_INVALID_HOST.md)

### If widgets aren't loading:
1. Check `BASE_URL` environment variable
2. Rebuild with correct BASE_URL
3. See: [OpenAI Connector Apps Guide - Troubleshooting](./OPENAI_CONNECTOR_APPS_GUIDE.md#troubleshooting-guide)

### First time deploying to Render:
1. Read: [Deployment Quick Reference](./DEPLOYMENT_QUICK_REFERENCE.md)
2. Choose your server (Node.js or Python)
3. Follow the detailed guide for your chosen server
4. Use the OpenAI Connector Apps Guide for ChatGPT integration

## 🔧 Fixed Issues in This Repository

Both servers have been updated to fix common deployment issues:

### ✅ Added `securitySchemes` Field
**Files modified:**
- `pizzaz_server_node/src/server.ts` (line 172)
- `shopping_cart_python/main.py` (line 111)

Without this field, ChatGPT hides all tools.

### ✅ Added Host Header Handling
**Files modified:**
- `pizzaz_server_node/src/server.ts` (line 362)
- `shopping_cart_python/main.py` (line 211)

Fixes "Invalid Host" errors on deployment platforms like Render.

### ✅ Added Static File Serving (Pizzaz)
**Files modified:**
- `pizzaz_server_node/src/server.ts` (lines 387-421)

Server now serves its own widget assets.

### ✅ Added Port Configuration (Shopping Cart)
**Files modified:**
- `shopping_cart_python/main.py` (line 231)

Reads `PORT` from environment variable.

## 🎯 Deployment Checklist

Before deploying, ensure:

- [ ] Code changes committed to Git
- [ ] `BASE_URL` environment variable set
- [ ] Build command includes `BASE_URL=$BASE_URL pnpm run build`
- [ ] Start command is correct for your server
- [ ] PORT environment variable set (if needed)
- [ ] All dependencies listed in requirements.txt or package.json

After deploying:

- [ ] MCP endpoint accessible: `https://your-app.com/mcp`
- [ ] Widget assets loading: `https://your-app.com/widget-xyz.js`
- [ ] No errors in Render logs
- [ ] Added to ChatGPT Settings → Apps
- [ ] Tools appear in ChatGPT (not hidden)
- [ ] Tool calls work correctly
- [ ] Widgets render properly

## 📋 Server Comparison

| Feature | Pizzaz (Node.js) | Shopping Cart (Python) |
|---------|------------------|------------------------|
| **Language** | TypeScript | Python |
| **Runtime** | Node.js 18+ | Python 3.11+ |
| **Framework** | Native HTTP | FastAPI + Uvicorn |
| **Tools** | 5 pizza widgets | 1 cart widget |
| **State** | Stateless | Stateful (session-based) |
| **Default Port** | 8000 | 8001 (local), 10000 (Render) |
| **Dependencies** | MCP SDK, Zod | FastAPI, MCP, Uvicorn |

## 🔗 External Resources

- **OpenAI Apps SDK**: https://developers.openai.com/apps-sdk
- **MCP Specification**: https://modelcontextprotocol.io
- **ChatGPT Help**: https://help.openai.com/en/articles/12503483-apps-in-chatgpt-and-the-apps-sdk
- **Developer Mode**: https://platform.openai.com/docs/guides/developer-mode
- **Render Documentation**: https://render.com/docs
- **ngrok** (local testing): https://ngrok.com

## 💡 Common Scenarios

### Scenario 1: Local Development
1. Run server locally
2. Use ngrok to expose to internet
3. Add ngrok URL to ChatGPT
4. Test and iterate

### Scenario 2: Deploying to Render
1. Set `BASE_URL` environment variable
2. Use build command from Quick Reference
3. Deploy to Render
4. Add Render URL to ChatGPT

### Scenario 3: "Invalid Host" Error
1. Read: [Fixing Invalid Host Error](./FIXING_INVALID_HOST.md)
2. Apply fixes to your code
3. Redeploy
4. Test endpoint

### Scenario 4: Tools Hidden in ChatGPT
1. Add `securitySchemes=[{"type": "noauth"}]`
2. Redeploy
3. Remove and re-add connector in ChatGPT
4. Tools should now appear

## 📝 Example Commands

### Build with custom URL:
```bash
BASE_URL=https://my-app.onrender.com pnpm run build
```

### Test MCP endpoint:
```bash
curl -H "Accept: text/event-stream" https://my-app.com/mcp
```

### Check server logs on Render:
```bash
# Via Render Dashboard → Logs tab
```

### Local testing with ngrok:
```bash
ngrok http 8000
# Use the provided URL in ChatGPT
```

## 🆘 Getting Help

If you're stuck:

1. **Check the logs** - Render Dashboard → Logs tab
2. **Search this documentation** - Use Ctrl+F / Cmd+F
3. **Check the guides** - Start with OpenAI Connector Apps Guide
4. **Test locally first** - Use ngrok to test before deploying
5. **Verify basics** - Port, BASE_URL, securitySchemes

## 🎉 Success Indicators

You know it's working when:

- ✅ `curl https://your-app.com/mcp` returns SSE stream
- ✅ Widget assets accessible at `https://your-app.com/widget-xyz.js`
- ✅ Tools appear in ChatGPT (Settings → Apps)
- ✅ Tool calls succeed and widgets render
- ✅ No errors in Render logs
- ✅ State persists across conversation turns (for stateful widgets)

---

**Ready to deploy?** Start with the [OpenAI Connector Apps Guide](./OPENAI_CONNECTOR_APPS_GUIDE.md) and then proceed to your specific server's deployment guide!

