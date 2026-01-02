# Checkout API with Razorpay Line Items Integration

This document describes the new checkout API endpoint that integrates with Razorpay's Order API using line items.

## Overview

The `/api/checkout/proceed` endpoint creates a Razorpay order with detailed line items information when users proceed to checkout. This endpoint uses Razorpay's Orders API with the line items feature for better order tracking and management.

## Endpoint

```
POST /api/checkout/proceed
```

## Authentication

The endpoint uses **Basic Authentication** with Razorpay credentials:

```
Authorization: Basic base64(RAZORPAY_KEY_ID:RAZORPAY_KEY_SECRET)
```

These credentials are read from environment variables:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

## Request Format

### Headers
```
Content-Type: application/json
```

### Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cart` | Array | Yes | Array of cart items to checkout |
| `userId` | String | No | User ID for tracking |
| `sessionId` | String | No | Session ID for tracking |
| `address` | Object | No | Delivery address information |

### Cart Item Structure

Each item in the `cart` array should have:

```json
{
  "product_id": "123",           // Product identifier
  "title": "Product Name",       // Product name
  "price": 500.00,              // Price in INR (will be converted to paise)
  "quantity": 1,                // Quantity
  "thumbnail": "https://...",   // Product image URL
  "description": "...",         // Product description (optional)
  "offer_price": 450.00,        // Discounted price (optional)
  "tax_amount": 50.00,          // Tax amount (optional)
  "weight": 1700,               // Weight in grams (optional)
  "dimensions": {               // Product dimensions (optional)
    "length": 10,
    "width": 10,
    "height": 10
  },
  "variant_id": "v123",         // Variant ID (optional)
  "other_product_codes": {},    // Additional codes like UPC, EAN (optional)
  "notes": {}                   // Additional notes (optional)
}
```

### Example Request

```bash
curl --location 'http://localhost:8000/api/checkout/proceed' \
--header 'Content-Type: application/json' \
--data '{
  "cart": [
    {
      "product_id": "1",
      "title": "iPhone 15 Pro",
      "price": 129999.00,
      "quantity": 1,
      "thumbnail": "https://example.com/iphone.jpg",
      "description": "Latest iPhone with A17 Pro chip",
      "offer_price": 119999.00,
      "tax_amount": 10000.00,
      "weight": 187
    },
    {
      "product_id": "2",
      "title": "AirPods Pro",
      "price": 24900.00,
      "quantity": 2,
      "thumbnail": "https://example.com/airpods.jpg"
    }
  ],
  "userId": "user_123",
  "sessionId": "session_456",
  "address": {
    "name": "John Doe",
    "street": "123 Main St",
    "city": "Mumbai",
    "zip": "400001",
    "phone": "+919876543210"
  }
}'
```

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "order": {
    "id": "order_Nmd4ZgXGKhVJLi",
    "entity": "order",
    "amount": 179898,
    "amount_paid": 0,
    "amount_due": 179898,
    "currency": "INR",
    "receipt": "receipt_session_456_1704196800000",
    "status": "created",
    "attempts": 0,
    "notes": {
      "user_id": "user_123",
      "session_id": "session_456",
      "address": "{\"name\":\"John Doe\",\"street\":\"123 Main St\",\"city\":\"Mumbai\",\"zip\":\"400001\",\"phone\":\"+919876543210\"}"
    },
    "created_at": 1704196800
  },
  "message": "Razorpay order created successfully with line items"
}
```

### Error Response (400/500)

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## Implementation Details

### Price Conversion

All prices are automatically converted from INR (rupees) to paise (1 rupee = 100 paise):

```typescript
const priceInPaise = Math.round(priceInRupees * 100);
```

### Line Items Format

The cart items are transformed into Razorpay's line items format:

```typescript
{
  "sku": "product_id",
  "variant_id": "variant_id",
  "other_product_codes": {},
  "price": 50000,              // in paise
  "offer_price": 50000,        // in paise
  "tax_amount": 0,             // in paise
  "quantity": 1,
  "name": "Product Name",
  "description": "Product Description",
  "weight": 1700,              // in grams
  "dimensions": {
    "length": 1700,
    "width": 1700,
    "height": 1700
  },
  "image_url": "https://...",
  "product_url": "",
  "notes": {}
}
```

### Order Creation Flow

1. **Validate Input**: Ensure cart array is provided and not empty
2. **Calculate Total**: Sum up all line items (price × quantity) in paise
3. **Format Line Items**: Convert cart items to Razorpay line items format
4. **Create Order Payload**: Build complete order object with line items
5. **Call Razorpay API**: Make authenticated request to Razorpay
6. **Return Response**: Send order details back to client

### Error Handling

The endpoint handles various error scenarios:

- **400 Bad Request**: Missing or empty cart array
- **500 Internal Server Error**: 
  - Razorpay API errors
  - Network failures
  - Invalid credentials
  - Malformed data

## Environment Configuration

Make sure to set these environment variables in your `.env` file:

```bash
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_live_I51bxdyuOOsDA7
RAZORPAY_KEY_SECRET=your_secret_key_here
```

## Testing

### Using cURL

```bash
# Test the endpoint
curl -X POST http://localhost:8000/api/checkout/proceed \
  -H "Content-Type: application/json" \
  -d '{
    "cart": [
      {
        "product_id": "1",
        "title": "Test Product",
        "price": 500,
        "quantity": 1,
        "thumbnail": "https://example.com/image.jpg"
      }
    ],
    "userId": "test_user",
    "sessionId": "test_session"
  }'
```

### Using JavaScript/Fetch

```javascript
const response = await fetch('http://localhost:8000/api/checkout/proceed', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    cart: [
      {
        product_id: "1",
        title: "Test Product",
        price: 500,
        quantity: 1,
        thumbnail: "https://example.com/image.jpg"
      }
    ],
    userId: "test_user",
    sessionId: "test_session",
    address: {
      name: "John Doe",
      street: "123 Main St",
      city: "Mumbai",
      zip: "400001",
      phone: "+919876543210"
    }
  })
});

const data = await response.json();
console.log(data);
```

## Integration with Frontend

After receiving the order response, you can:

1. **Open Razorpay Checkout**: Use the order ID to initialize Razorpay Checkout UI
2. **Redirect to Payment**: Direct user to payment page with order details
3. **Store Order Info**: Save order details for tracking and verification

### Example Razorpay Checkout Integration

```javascript
const options = {
  key: RAZORPAY_KEY_ID,
  amount: orderData.order.amount,
  currency: orderData.order.currency,
  name: "Your Store Name",
  description: "Order Payment",
  order_id: orderData.order.id,
  handler: function(response) {
    // Payment successful
    console.log(response.razorpay_payment_id);
    console.log(response.razorpay_order_id);
    console.log(response.razorpay_signature);
    
    // Verify payment on backend
    verifyPayment(response);
  },
  prefill: {
    name: address.name,
    contact: address.phone,
    email: "customer@example.com"
  },
  theme: {
    color: "#3399cc"
  }
};

const rzp = new Razorpay(options);
rzp.open();
```

## Related Endpoints

- **POST /api/razorpay/verify-payment**: Verify payment signature after successful payment
- **POST /api/razorpay/create-order**: Legacy order creation (without line items)
- **POST /api/razorpay/magic-checkout**: Create Magic Checkout URL with line items

## Security Considerations

1. **Environment Variables**: Never expose `RAZORPAY_KEY_SECRET` in client-side code
2. **HTTPS**: Use HTTPS in production to protect sensitive data
3. **Signature Verification**: Always verify payment signatures on the server
4. **CORS**: Configure CORS appropriately for your domain
5. **Input Validation**: Validate all input data before processing

## Troubleshooting

### Common Issues

**Issue**: "Razorpay API Error: 401 Unauthorized"
- **Solution**: Check if `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are correctly set

**Issue**: "Cart items are required"
- **Solution**: Ensure you're sending a non-empty cart array in the request body

**Issue**: Amount mismatch errors
- **Solution**: Verify price calculations and ensure all values are positive numbers

## Additional Resources

- [Razorpay Orders API Documentation](https://razorpay.com/docs/api/orders/)
- [Razorpay Line Items Guide](https://razorpay.com/docs/payments/payment-gateway/line-items/)
- [Razorpay Checkout Integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/)

## Changelog

### Version 1.0.0 (2025-01-02)
- Initial implementation of `/api/checkout/proceed` endpoint
- Support for Razorpay line items
- Basic authentication using Razorpay credentials
- Comprehensive error handling and logging

