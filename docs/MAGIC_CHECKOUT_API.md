# Razorpay Magic Checkout Integration

## 🎯 Overview

This API endpoint creates a Razorpay order with line items and generates a Magic Checkout URL/form for seamless checkout experience.

---

## 📋 API Endpoint

**POST** `/api/razorpay/magic-checkout`

### Request Body

```json
{
  "products": [
    {
      "id": "li_RyCva0f2VLjTIW",
      "name": "Samsung Galaxy S10",
      "description": "The Samsung Galaxy S10...",
      "selling_price": 69999,
      "discounted_price": 69999,
      "quantity": 1,
      "images": ["https://..."],
      "sku": "SKU001",
      "variant_id": "VAR001",
      "tax_amount": 0
    }
  ],
  "customer": {
    "name": "John Doe",
    "phone": "+919876543210",
    "email": "john@example.com"
  },
  "callbacks": {
    "success": "https://yoursite.com/success",
    "cancel": "https://yoursite.com/cancel"
  }
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| products | Array | Yes | Array of product objects |
| products[].selling_price | Number | Yes | Price in paise (₹699.99 = 69999) |
| products[].name | String | Yes | Product name |
| products[].quantity | Number | No | Quantity (default: 1) |
| products[].id | String | No | Product/SKU ID |
| products[].images | Array | No | Product image URLs |
| customer | Object | No | Customer information |
| customer.name | String | No | Customer name |
| customer.phone | String | No | Phone with country code |
| customer.email | String | No | Customer email |
| callbacks | Object | No | Redirect URLs |
| callbacks.success | String | No | Success redirect URL |
| callbacks.cancel | String | No | Cancel redirect URL |

---

## ✅ Success Response

```json
{
  "success": true,
  "order": {
    "id": "order_RyuBRx1fcNEurR",
    "entity": "order",
    "amount": 69999,
    "currency": "INR",
    "receipt": "receipt_1767184532",
    "status": "created",
    "line_items": [...]
  },
  "checkout_url": "https://api.razorpay.com/v1/checkout/hosted",
  "form_data": {
    "checkout[key]": "rzp_live_...",
    "checkout[order_id]": "order_...",
    "checkout[name]": "John Doe",
    ...
  },
  "html_form": "<form id='razorpay-magic-checkout' ...>...</form>"
}
```

---

## 🚀 Usage Examples

### Example 1: Basic Checkout

```javascript
const response = await fetch('http://localhost:8000/api/razorpay/magic-checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    products: [
      {
        id: "prod_001",
        name: "Samsung Galaxy S10",
        selling_price: 69999,  // ₹699.99
        quantity: 1,
        images: ["https://example.com/image.jpg"]
      }
    ],
    customer: {
      name: "John Doe",
      phone: "+919876543210",
      email: "john@example.com"
    },
    callbacks: {
      success: "https://mysite.com/order-success",
      cancel: "https://mysite.com/cart"
    }
  })
});

const data = await response.json();

if (data.success) {
  // Option 1: Redirect to checkout_url with form POST
  // Option 2: Use the html_form to auto-submit
  document.body.innerHTML = data.html_form;
}
```

### Example 2: Multiple Products

```javascript
const products = [
  {
    name: "Samsung Galaxy S10",
    selling_price: 69999,
    quantity: 1
  },
  {
    name: "iPhone Case",
    selling_price: 2999,
    quantity: 2
  }
];

const response = await fetch('http://localhost:8000/api/razorpay/magic-checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ products })
});
```

### Example 3: From Parsed Store Products

```javascript
// First, parse a Razorpay store
const storeResponse = await fetch('http://localhost:8000/api/razorpay/parse-store?url=https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM');
const storeData = await storeResponse.json();

// Select products from the store
const selectedProducts = storeData.products.slice(0, 3).map(p => ({
  id: p.id,
  name: p.name,
  selling_price: p.selling_price,
  discounted_price: p.discounted_price,
  quantity: 1,
  images: p.images
}));

// Create checkout
const checkoutResponse = await fetch('http://localhost:8000/api/razorpay/magic-checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    products: selectedProducts,
    customer: {
      name: "Customer Name",
      phone: "+919876543210"
    }
  })
});

const checkoutData = await checkoutResponse.json();
// Redirect to Magic Checkout
window.location.href = checkoutData.checkout_url;
```

---

## 🔧 Complete Workflow

### Step 1: Parse Store (Optional)
```bash
curl "http://localhost:8000/api/razorpay/parse-store?url=https://pages.razorpay.com/stores/st_XXXXX"
```

### Step 2: Create Magic Checkout
```bash
curl -X POST http://localhost:8000/api/razorpay/magic-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "products": [{
      "name": "Product Name",
      "selling_price": 50000,
      "quantity": 1
    }],
    "customer": {
      "name": "John Doe",
      "phone": "+919876543210"
    }
  }'
```

### Step 3: Use Response to Open Checkout

**Option A: HTML Form (Auto-submit)**
```javascript
document.body.innerHTML = response.html_form;
```

**Option B: Manual Form Submission**
```javascript
const form = document.createElement('form');
form.method = 'POST';
form.action = response.checkout_url;

Object.entries(response.form_data).forEach(([key, value]) => {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = key;
  input.value = value;
  form.appendChild(input);
});

document.body.appendChild(form);
form.submit();
```

---

## 💰 Price Formatting

Razorpay uses **paise** (smallest currency unit):
- ₹1.00 = 100 paise
- ₹699.99 = 69999 paise
- ₹10,000 = 1000000 paise

```javascript
// Convert rupees to paise
const priceInPaise = priceInRupees * 100;

// Convert paise to rupees
const priceInRupees = priceInPaise / 100;
```

---

## ❌ Error Responses

### 400 - Missing Products
```json
{
  "success": false,
  "error": "Products array is required"
}
```

### 500 - Razorpay API Error
```json
{
  "success": false,
  "error": "Razorpay API Error: 401 - Invalid credentials"
}
```

---

## 🔐 Configuration

Set these environment variables:

```bash
RAZORPAY_KEY_ID=rzp_live_XXXXX
RAZORPAY_KEY_SECRET=your_secret_key
```

Get your keys from: [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys)

---

## 🎨 Frontend Integration Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Razorpay Checkout</title>
</head>
<body>
  <button onclick="openCheckout()">Buy Now</button>

  <script>
    async function openCheckout() {
      const response = await fetch('http://localhost:8000/api/razorpay/magic-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: [{
            name: "Product Name",
            selling_price: 50000,
            quantity: 1
          }],
          customer: {
            name: "John Doe",
            phone: "+919876543210"
          },
          callbacks: {
            success: window.location.origin + '/success',
            cancel: window.location.origin + '/cart'
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Auto-submit form to open Magic Checkout
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = data.html_form;
        document.body.appendChild(tempDiv);
      } else {
        alert('Error: ' + data.error);
      }
    }
  </script>
</body>
</html>
```

---

## 🔄 Complete E-commerce Flow

### 1. Browse Products
```javascript
// Get products from store
const store = await fetch('/api/razorpay/parse-store?url=STORE_URL');
const products = await store.json();
```

### 2. Add to Cart
```javascript
// User selects products
const cart = [
  { ...products[0], quantity: 1 },
  { ...products[2], quantity: 2 }
];
```

### 3. Checkout
```javascript
// Create checkout
const checkout = await fetch('/api/razorpay/magic-checkout', {
  method: 'POST',
  body: JSON.stringify({ 
    products: cart,
    customer: userInfo,
    callbacks: redirectUrls
  })
});
```

### 4. Payment
```javascript
// Open Magic Checkout
document.body.innerHTML = checkout.html_form;
```

### 5. Handle Callback
```javascript
// On success URL
const params = new URLSearchParams(window.location.search);
const razorpay_payment_id = params.get('razorpay_payment_id');
const razorpay_order_id = params.get('razorpay_order_id');
```

---

## 📊 Response Fields Explained

| Field | Description |
|-------|-------------|
| `success` | Boolean indicating API call success |
| `order` | Razorpay order object with full details |
| `order.id` | Order ID to track the order |
| `order.amount` | Total amount in paise |
| `checkout_url` | URL to POST form data to |
| `form_data` | Key-value pairs for form fields |
| `html_form` | Ready-to-use HTML form with auto-submit |

---

## 🔥 Live API Endpoint

```
https://openai-apps-sdk-examples-2-7lml.onrender.com/api/razorpay/magic-checkout
```

Test it now:
```bash
curl -X POST https://openai-apps-sdk-examples-2-7lml.onrender.com/api/razorpay/magic-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "products": [{
      "name": "Test Product",
      "selling_price": 10000,
      "quantity": 1
    }]
  }'
```

---

## 💡 Pro Tips

1. **Test Mode**: Use test keys for development
2. **Price Validation**: Always validate prices server-side
3. **Stock Check**: Verify product availability before checkout
4. **Customer Data**: Pre-fill customer data for better UX
5. **Callback URLs**: Use HTTPS URLs in production
6. **Order Tracking**: Store `order.id` in your database

---

## 🆘 Troubleshooting

### "Invalid credentials"
- Check `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
- Ensure keys are not expired

### "Amount validation failed"
- Verify amount is in paise (multiply by 100)
- Check line_items_total matches sum of products

### Checkout doesn't open
- Verify form is being submitted
- Check browser console for errors
- Ensure callback URLs are valid

---

**Ready to use!** 🚀

Integrate Magic Checkout in your app and provide seamless payment experience to your customers!

