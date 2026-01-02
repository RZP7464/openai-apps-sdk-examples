# Razorpay Store Parser API - Quick Start Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd pizzaz_server_node
npm install
```

### 2. Start the Server
```bash
npm start
```

The server will start on `http://localhost:8000`

### 3. Test the API

#### Option A: Using the test script
```bash
node test-razorpay-parser.js
```

#### Option B: Using cURL
```bash
curl -X POST http://localhost:8000/api/razorpay/parse-store \
  -H "Content-Type: application/json" \
  -d '{"url": "https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM"}'
```

#### Option C: Run all examples
```bash
node razorpay-parser-examples.js
```

## 📋 API Endpoint

**POST** `/api/razorpay/parse-store`

### Request Body
```json
{
  "url": "https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM"
}
```

### Response
```json
{
  "success": true,
  "store": {
    "id": "st_RvP3FIXbUltGLM",
    "title": "HIMANSHU SHEKHAR",
    "currency": "INR",
    "categories": [...],
    "merchant": {...}
  },
  "products": [
    {
      "id": "li_RyCva0f2VLjTIW",
      "name": "Samsung Galaxy S10",
      "description": "...",
      "selling_price": 69999,
      "stock": 19,
      "status": "in_stock",
      ...
    }
  ],
  "totalProducts": 22
}
```

## 📚 Documentation

For complete documentation, see:
- **[Full API Documentation](./pizzaz_server_node/README_RAZORPAY_PARSER.md)** - Comprehensive API reference
- **[Usage Examples](./razorpay-parser-examples.js)** - Various code examples
- **[Test Script](./test-razorpay-parser.js)** - Simple test to verify setup

## 🔧 Configuration

### Change Server Port
```bash
PORT=3000 npm start
```

### Use Custom URL in Scripts
```bash
SERVER_URL=http://localhost:3000 node test-razorpay-parser.js
```

## 📦 What You Get

The API extracts:
- ✅ All products with details (name, price, description, stock)
- ✅ Store information (name, currency, categories)
- ✅ Merchant details (contact info, branding)
- ✅ Product categories and organization
- ✅ Stock availability and pricing

## 💡 Common Use Cases

1. **E-commerce Integration** - Import products into your platform
2. **Price Monitoring** - Track price changes over time
3. **Inventory Management** - Monitor stock levels
4. **Analytics** - Analyze product catalogs
5. **Data Migration** - Export product data

## 🐛 Troubleshooting

### Connection Refused
Make sure the server is running:
```bash
cd pizzaz_server_node && npm start
```

### Invalid URL Format
Ensure the URL follows this pattern:
```
https://pages.razorpay.com/stores/st_XXXXXXXXXXXXX
```

### No Products Found
- Check if the store URL is correct
- Verify the store is active and has products
- Ensure you have internet connectivity

## 📞 Support

For issues or questions:
- Check the [full documentation](./pizzaz_server_node/README_RAZORPAY_PARSER.md)
- Review [examples](./razorpay-parser-examples.js)
- Run the [test script](./test-razorpay-parser.js)

## 🎯 Next Steps

1. ✅ Start the server
2. ✅ Run the test script
3. ✅ Try the examples
4. ✅ Integrate into your application
5. ✅ Read the full documentation

Happy coding! 🚀

