# Razorpay Integration Guide

This document explains how the Razorpay payment integration works in the Product Search widget.

## Overview

The payment integration uses **actual Razorpay APIs** (not simulated) with a secure backend implementation. No iframes are used, making it compatible with OpenAI's environment.

## Architecture

### Frontend (React Component)
- Custom payment form UI built in React
- Collects card details securely
- Calls backend APIs for order creation and verification

### Backend (Node.js Server)
- Two secure API endpoints for Razorpay operations
- Handles order creation with Razorpay Orders API
- Verifies payment signatures for security

## Setup Instructions

### 1. Get Razorpay Credentials

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys)
2. Copy your **Key ID** (starts with `rzp_live_` or `rzp_test_`)
3. Copy your **Key Secret** (keep this secure!)

### 2. Configure Environment Variables

Create a `.env` file in `pizzaz_server_node/` directory:

```bash
# Server Configuration
PORT=8000
BASE_URL=http://localhost:8000

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_live_I51bxdyuOOsDA7
RAZORPAY_KEY_SECRET=your_actual_secret_here
```

**Important:** Never commit the `.env` file to git!

### 3. For Render Deployment

Add environment variables in Render dashboard:
- `RAZORPAY_KEY_ID`: Your Razorpay Key ID
- `RAZORPAY_KEY_SECRET`: Your Razorpay Key Secret
- `BASE_URL`: Your deployed URL (e.g., `https://your-app.onrender.com`)

## Payment Flow

### Step 1: User Journey
1. User logs in with demo credentials
2. Searches and adds products to cart
3. Clicks "Proceed to Checkout"
4. Fills delivery address
5. Clicks "Proceed to Payment"

### Step 2: Payment Form
- Custom card form (no iframe!)
- Fields: Card Number, Name, Expiry, CVV
- Real-time validation
- Shows order summary

### Step 3: Payment Processing

```
Frontend                    Backend                     Razorpay
   |                           |                            |
   |-- Create Order Request -->|                            |
   |                           |-- POST /v1/orders -------->|
   |                           |<-- Order ID & Details -----|
   |<-- Order ID --------------|                            |
   |                                                        |
   |-- Card Details + Order ID --------------------------->|
   |<-- Payment ID + Signature -----------------------------|
   |                                                        |
   |-- Verify Payment -------->|                            |
   |                           |-- Verify Signature         |
   |<-- Verification Success --|                            |
   |                                                        |
   |-- Update UI & Clear Cart                              |
```

## API Endpoints

### POST `/api/razorpay/create-order`

Creates a Razorpay order with cart and user details.

**Request:**
```json
{
  "amount": 1234.56,
  "currency": "INR",
  "cart": [{ "id": 1, "title": "Product", "price": 1234.56 }],
  "userId": "3e974d44-b8f0-4fe6-b3e7-f69ac5e9eb71",
  "sessionId": "session_123",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "zip": "400001"
  }
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_xyz",
    "entity": "order",
    "amount": 123456,
    "currency": "INR",
    "receipt": "receipt_session_123_timestamp",
    "notes": {
      "user_id": "3e974d44-b8f0-4fe6-b3e7-f69ac5e9eb71",
      "session_id": "session_123",
      "cart_items": "[...]",
      "address": "{...}"
    }
  }
}
```

### POST `/api/razorpay/verify-payment`

Verifies payment signature for security.

**Request:**
```json
{
  "razorpay_order_id": "order_xyz",
  "razorpay_payment_id": "pay_abc",
  "razorpay_signature": "signature_hash"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "payment_id": "pay_abc"
}
```

## Security Features

### Backend Security
- ✅ API secret key stored on server only
- ✅ Order creation happens on backend
- ✅ Payment signature verification on backend
- ✅ CORS enabled for frontend access

### Frontend Security
- ✅ No sensitive keys in frontend code
- ✅ Card details sent directly to Razorpay
- ✅ HTTPS enforced in production
- ✅ Session ID tracking for audit trail

## Data Stored in Widget State

After successful payment:

```javascript
{
  payment_id: "pay_xyz123",
  order_id: "order_abc456",
  amount: 1234.56,
  currency: "INR",
  session_id: "session_unique_id",
  user_id: "3e974d44-b8f0-4fe6-b3e7-f69ac5e9eb71",
  timestamp: "2025-12-31T10:00:00.000Z",
  cart: [...],
  address: {...},
  card_last4: "3456",
  status: "success"
}
```

## Testing

### Test Mode
Use Razorpay test credentials (`rzp_test_...`) for testing:

**Test Card Numbers:**
- Success: `4111 1111 1111 1111`
- Failure: `4000 0000 0000 0002`
- CVV: Any 3 digits
- Expiry: Any future date

### Live Mode
Use actual Razorpay live credentials (`rzp_live_...`) for real transactions.

## Error Handling

The integration handles:
- Invalid card details
- Network failures
- Order creation errors
- Payment verification failures
- Razorpay API errors

All errors are displayed to the user with clear messages.

## Monitoring

Payment records are stored in:
```javascript
window.openai.widgetState.payments[] // Array of all payments
window.openai.widgetState.lastPayment // Most recent payment
```

You can also monitor payments in:
- [Razorpay Dashboard](https://dashboard.razorpay.com/app/payments)

## Next Steps

For production deployment:
1. Set up Razorpay webhook endpoints for payment status updates
2. Implement database storage for orders and payments
3. Add order confirmation emails
4. Set up payment reconciliation
5. Enable refund functionality
6. Add invoice generation

## Support

- **Razorpay Docs:** https://razorpay.com/docs/
- **API Reference:** https://razorpay.com/docs/api/
- **Integration Guide:** https://razorpay.com/docs/payments/

## Important Notes

⚠️ **Never expose your Razorpay Key Secret in frontend code!**  
⚠️ **Always verify payment signatures on the backend!**  
⚠️ **Use HTTPS in production!**  
⚠️ **Keep your `.env` file out of version control!**

