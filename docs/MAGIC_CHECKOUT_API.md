# Razorpay Magic Checkout API Documentation

## GET /api/razorpay/magic-checkout

Returns a fully functional HTML page with Razorpay Magic Checkout embedded, ready to accept payments.

### Endpoint

```
GET http://localhost:8000/api/razorpay/magic-checkout
```

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `orderId` | string | **Yes** | - | Razorpay order ID obtained from creating an order |
| `name` | string | No | "Razorpay Magic Checkout" | Page title |
| `businessName` | string | No | "Acme Corp" | Business name displayed on the checkout |
| `customerName` | string | No | "Guest Customer" | Customer name for prefill |
| `customerEmail` | string | No | "" | Customer email for prefill |
| `customerPhone` | string | No | "" | Customer phone for prefill (10 digits) |
| `couponCode` | string | No | "" | Coupon code to auto-apply |
| `callbackUrl` | string | No | "https://example.com/payment-success" | Success callback URL |
| `showCoupons` | string | No | "true" | Show coupon widget ("true" or "false") |
| `address` | string | No | "" | Customer address for notes |

### Usage Examples

#### Basic Usage (Minimum Required)
```bash
curl "http://localhost:8000/api/razorpay/magic-checkout?orderId=order_EKwxwAgItmXXXX"
```

#### Full Example with All Parameters
```bash
curl "http://localhost:8000/api/razorpay/magic-checkout?orderId=order_EKwxwAgItmXXXX&businessName=MyStore&customerName=John%20Doe&customerEmail=john@example.com&customerPhone=9876543210&couponCode=SAVE500&callbackUrl=https://mystore.com/success&showCoupons=true&address=123%20Main%20Street"
```

#### URL Encoded Example
```
http://localhost:8000/api/razorpay/magic-checkout?
  orderId=order_EKwxwAgItmXXXX
  &businessName=MyStore
  &customerName=John%20Doe
  &customerEmail=john%40example.com
  &customerPhone=9876543210
  &couponCode=SAVE500
  &callbackUrl=https%3A%2F%2Fmystore.com%2Fsuccess
  &showCoupons=true
  &address=123%20Main%20Street
```

### Response

Returns a complete HTML page with:
- ✅ Razorpay Magic Checkout script embedded
- ✅ Beautiful, responsive UI
- ✅ Pre-configured payment button
- ✅ Auto-opens checkout modal on button click
- ✅ Pre-filled customer information
- ✅ Auto-applied coupon (if provided)

### Example Response HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Razorpay Magic Checkout</title>
    <style>
        /* Beautiful gradient background and styling */
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🛒</div>
        <h1>Acme Corp</h1>
        <p>Click the button below to proceed with payment</p>
        <button id="rzp-button1">Pay Now</button>
    </div>

    <script src="https://checkout.razorpay.com/v1/magic-checkout.js"></script>
    <script>
        var options = {
            "key": "YOUR_KEY_ID",
            "one_click_checkout": true,
            "name": "Acme Corp",
            "order_id": "order_EKwxwAgItmXXXX",
            "show_coupons": true,
            "callback_url": "https://example.com/success",
            "redirect": "true",
            "prefill": {
                "name": "John Doe",
                "email": "john@example.com",
                "contact": "9876543210",
                "coupon_code": "SAVE500"
            },
            "notes": {
                "address": "123 Main Street"
            }
        };
        
        var rzp1 = new Razorpay(options);
        document.getElementById('rzp-button1').onclick = function(e){
            rzp1.open();
            e.preventDefault();
        }
    </script>
</body>
</html>
```

## Complete Workflow

### Step 1: Create a Razorpay Order

First, create an order using the Razorpay API or your backend:

```bash
curl -X POST http://localhost:8000/api/checkout/proceed \
  -H "Content-Type: application/json" \
  -d '{
    "cart": [
      {
        "product_id": 1,
        "title": "Product Name",
        "price": 100,
        "quantity": 2
      }
    ],
    "userId": "user123",
    "sessionId": "session456",
    "address": {
      "name": "John Doe",
      "phone": "9876543210",
      "street": "123 Main St",
      "city": "Mumbai",
      "zip": "400001"
    }
  }'
```

Response:
```json
{
  "success": true,
  "order": {
    "id": "order_EKwxwAgItmXXXX",
    "amount": 20000,
    "currency": "INR",
    "status": "created"
  }
}
```

### Step 2: Direct User to Magic Checkout Page

Use the order ID from step 1 to redirect the user:

```html
<!-- In your frontend -->
<a href="http://localhost:8000/api/razorpay/magic-checkout?orderId=order_EKwxwAgItmXXXX&customerName=John%20Doe&customerPhone=9876543210">
  Proceed to Payment
</a>
```

Or redirect programmatically:

```javascript
const orderId = 'order_EKwxwAgItmXXXX';
const checkoutUrl = `http://localhost:8000/api/razorpay/magic-checkout?` +
  `orderId=${orderId}` +
  `&businessName=${encodeURIComponent('My Store')}` +
  `&customerName=${encodeURIComponent('John Doe')}` +
  `&customerEmail=${encodeURIComponent('john@example.com')}` +
  `&customerPhone=9876543210` +
  `&callbackUrl=${encodeURIComponent('https://mystore.com/payment-success')}`;

window.location.href = checkoutUrl;
```

### Step 3: User Completes Payment

- User clicks "Pay Now" button
- Razorpay Magic Checkout modal opens
- User completes payment
- User is redirected to `callbackUrl` with payment details

### Step 4: Handle Payment Callback

When payment is successful, Razorpay redirects to your callback URL with payment details:

```
https://mystore.com/payment-success?
  razorpay_payment_id=pay_XXXXX
  &razorpay_order_id=order_EKwxwAgItmXXXX
  &razorpay_signature=XXXXXXXX
```

Verify the payment on your backend:

```bash
curl -X POST http://localhost:8000/api/razorpay/verify-payment \
  -H "Content-Type: application/json" \
  -d '{
    "razorpay_order_id": "order_EKwxwAgItmXXXX",
    "razorpay_payment_id": "pay_XXXXX",
    "razorpay_signature": "XXXXXXXX"
  }'
```

## Integration Examples

### React/Next.js

```typescript
import { useRouter } from 'next/router';

function CheckoutButton({ orderId, customerData }) {
  const router = useRouter();
  
  const handleCheckout = () => {
    const params = new URLSearchParams({
      orderId: orderId,
      businessName: 'My Store',
      customerName: customerData.name,
      customerEmail: customerData.email,
      customerPhone: customerData.phone,
      callbackUrl: `${window.location.origin}/payment-success`
    });
    
    router.push(`http://localhost:8000/api/razorpay/magic-checkout?${params}`);
  };
  
  return <button onClick={handleCheckout}>Pay Now</button>;
}
```

### Plain HTML/JavaScript

```html
<!DOCTYPE html>
<html>
<body>
  <button onclick="proceedToCheckout()">Checkout</button>
  
  <script>
    function proceedToCheckout() {
      const orderId = 'order_EKwxwAgItmXXXX';
      const url = new URL('http://localhost:8000/api/razorpay/magic-checkout');
      
      url.searchParams.append('orderId', orderId);
      url.searchParams.append('businessName', 'My Store');
      url.searchParams.append('customerName', 'John Doe');
      url.searchParams.append('customerEmail', 'john@example.com');
      url.searchParams.append('customerPhone', '9876543210');
      url.searchParams.append('callbackUrl', 'https://mystore.com/success');
      
      window.location.href = url.toString();
    }
  </script>
</body>
</html>
```

### Backend Integration (Node.js/Express)

```javascript
app.get('/checkout/:orderId', (req, res) => {
  const { orderId } = req.params;
  const user = req.user; // From session/JWT
  
  const checkoutUrl = `http://localhost:8000/api/razorpay/magic-checkout?` +
    `orderId=${orderId}` +
    `&businessName=My%20Store` +
    `&customerName=${encodeURIComponent(user.name)}` +
    `&customerEmail=${encodeURIComponent(user.email)}` +
    `&customerPhone=${user.phone}` +
    `&callbackUrl=${encodeURIComponent('https://myapp.com/payment-success')}`;
  
  res.redirect(checkoutUrl);
});
```

## Features

### ✨ Beautiful UI
- Modern gradient background
- Responsive design
- Professional styling
- Mobile-friendly

### 🚀 One-Click Checkout
- Pre-filled customer information
- Auto-applied coupons
- Seamless payment experience

### 🔒 Secure
- Official Razorpay Magic Checkout script
- Signature verification
- PCI DSS compliant

### 🎯 Customizable
- Custom business name
- Custom callback URLs
- Toggle coupon widget
- Custom page title

## Error Handling

### Missing Order ID
```bash
curl "http://localhost:8000/api/razorpay/magic-checkout"
```

Response (400):
```json
{
  "success": false,
  "error": "orderId is required in query parameters"
}
```

### Invalid Order ID
If the order ID is invalid, Razorpay will show an error in the checkout modal.

## Testing

### Test with Sample Order

```bash
# 1. Create a test order (replace with your test data)
ORDER_ID="order_test_12345"

# 2. Open in browser
open "http://localhost:8000/api/razorpay/magic-checkout?orderId=$ORDER_ID&customerName=Test%20User&customerEmail=test@example.com&customerPhone=9999999999"
```

## Notes

- 📝 The `orderId` must be created using Razorpay's Orders API first
- 📝 Use Razorpay test keys for testing
- 📝 The callback URL will receive payment details after successful payment
- 📝 All query parameters should be URL encoded
- 📝 Phone numbers should be 10 digits for Indian numbers

## Support

For issues or questions:
- Razorpay Docs: https://razorpay.com/docs/payments/magic-checkout/
- API Support: Contact your backend team
- Razorpay Support: https://razorpay.com/support/

---

**Last Updated**: January 2026
**Version**: 2.0.0

