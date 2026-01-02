# 🧪 Test Files

This directory contains test files for various API endpoints and features.

## 📁 Test Files Overview

### 1. `test-checkout-api.js`
**Purpose**: Test the checkout API endpoint  
**Tests**: 
- Order creation with line items
- Razorpay order API integration
- Cart to order conversion

**Usage**:
```bash
node tests/test-checkout-api.js
```

**Requirements**:
- Server running on `http://localhost:8000`
- Valid Razorpay credentials configured

---

### 2. `test-cors.html`
**Purpose**: Test CORS (Cross-Origin Resource Sharing) configuration  
**Tests**:
- Cross-origin requests
- CORS headers
- Preflight OPTIONS requests

**Usage**:
```bash
# Open in browser
open tests/test-cors.html

# Or serve via HTTP server
npx http-server tests -p 3000
# Then open http://localhost:3000/test-cors.html
```

**What it tests**:
- API accessibility from different origins
- CORS header presence
- POST/GET request handling

---

### 3. `test-magic-checkout.html`
**Purpose**: Test Razorpay Magic Checkout integration  
**Tests**:
- Magic Checkout HTML generation
- Razorpay script loading
- Payment flow initialization
- Query parameter handling

**Usage**:
```bash
# Open in browser
open tests/test-magic-checkout.html

# Or serve via HTTP server
npx http-server tests -p 3000
```

**Features Tested**:
- Order ID validation
- Customer prefill data
- Coupon code auto-apply
- Callback URL handling
- Checkout modal opening

---

### 4. `test-razorpay-parser.js`
**Purpose**: Test Razorpay store parsing functionality  
**Tests**:
- Razorpay store URL parsing
- Product data extraction
- Store information retrieval

**Usage**:
```bash
node tests/test-razorpay-parser.js
```

**What it tests**:
- Fetching Razorpay store pages
- Extracting product information
- Parsing store metadata
- Error handling

---

## 🚀 Running All Tests

### Quick Test Suite

```bash
# Test 1: Razorpay Parser
echo "Testing Razorpay Parser..."
node tests/test-razorpay-parser.js

# Test 2: Checkout API
echo "Testing Checkout API..."
node tests/test-checkout-api.js

# Test 3: Open browser tests
echo "Opening browser tests..."
open tests/test-cors.html
open tests/test-magic-checkout.html
```

### Using npm script (if configured)

```bash
npm test
# or
pnpm test
```

---

## 📋 Prerequisites

### For Node.js Tests
- Node.js 18+
- Server running on port 8000
- Environment variables configured:
  ```bash
  export RAZORPAY_KEY_ID="your_key_id"
  export RAZORPAY_KEY_SECRET="your_key_secret"
  ```

### For Browser Tests
- Modern web browser (Chrome, Firefox, Safari)
- Server running on port 8000
- CORS enabled on server

---

## 🎯 Test Scenarios

### API Tests
1. **Authentication**
   - User signup
   - User login
   - Token verification

2. **Cart Management**
   - Add items to cart
   - Remove items from cart
   - Clear cart
   - Get cart items

3. **Checkout Flow**
   - Create order
   - Process payment
   - Verify payment
   - Handle callbacks

4. **Razorpay Integration**
   - Parse store
   - Create order
   - Magic checkout
   - Payment verification

### Browser Tests
1. **CORS Configuration**
   - Cross-origin requests
   - Preflight handling
   - Header validation

2. **Magic Checkout UI**
   - Page rendering
   - Script loading
   - Modal interaction
   - Payment flow

---

## 🔧 Configuration

### Update Test URLs

If your server runs on a different port, update the URLs in test files:

```javascript
// In .js files
const BASE_URL = 'http://localhost:YOUR_PORT';

// In .html files
<script>
  const BASE_URL = 'http://localhost:YOUR_PORT';
</script>
```

### Update Razorpay Credentials

For testing, use Razorpay test mode credentials:

```javascript
const RAZORPAY_KEY_ID = 'rzp_test_XXXXXXXX';
```

---

## 📊 Expected Results

### Successful Test Output

**test-checkout-api.js**:
```
✅ Order created successfully
Order ID: order_XXXXXX
Amount: 20000
Status: created
```

**test-razorpay-parser.js**:
```
✅ Store parsed successfully
Products found: 25
Store name: Example Store
```

**test-cors.html** (in browser console):
```
✅ CORS test passed
✅ All endpoints accessible
```

**test-magic-checkout.html**:
```
✅ Page loaded
✅ Razorpay script loaded
✅ Checkout initialized
```

---

## 🐛 Troubleshooting

### Common Issues

**1. Connection Refused**
```
Error: connect ECONNREFUSED 127.0.0.1:8000
```
**Solution**: Start the server first
```bash
cd pizzaz_server_node
pnpm run dev
```

**2. CORS Error**
```
Access to fetch has been blocked by CORS policy
```
**Solution**: Ensure server has CORS enabled (already configured)

**3. Invalid Order ID**
```
Error: orderId is required
```
**Solution**: Create an order first, then use the returned order ID

**4. Razorpay Script Not Loading**
```
ReferenceError: Razorpay is not defined
```
**Solution**: Check internet connection, Razorpay CDN might be blocked

---

## 📝 Adding New Tests

### Creating a New Test File

```javascript
// tests/test-new-feature.js
const BASE_URL = 'http://localhost:8000';

async function testNewFeature() {
  try {
    const response = await fetch(`${BASE_URL}/api/new-endpoint`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Test passed');
    } else {
      console.log('❌ Test failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testNewFeature();
```

### Best Practices

1. ✅ Use descriptive test names
2. ✅ Include clear console output
3. ✅ Handle errors gracefully
4. ✅ Document prerequisites
5. ✅ Provide expected results
6. ✅ Update this README

---

## 🔗 Related Documentation

- [API Documentation](../pizzaz_server_node/docs/MAGIC_CHECKOUT_API.md)
- [Architecture Guide](../pizzaz_server_node/docs/ARCHITECTURE.md)
- [Razorpay Integration](../pizzaz_server_node/docs/MAGIC_CHECKOUT_IMPLEMENTATION.md)

---

## 📞 Support

If tests fail:
1. Check server is running
2. Verify environment variables
3. Check network connectivity
4. Review server logs
5. Check API endpoint documentation

---

**Last Updated**: January 2, 2026  
**Test Files**: 4  
**Status**: ✅ All organized

