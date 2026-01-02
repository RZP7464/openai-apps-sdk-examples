/**
 * Test script for the Checkout API with Razorpay Line Items
 * 
 * This script tests the /api/checkout/proceed endpoint
 * 
 * Usage:
 *   node test-checkout-api.js
 */

const BASE_URL = 'http://localhost:8000';

// Sample cart data for testing
const testCart = [
  {
    product_id: 1,
    title: "iPhone 15 Pro",
    price: 500, // ₹500 = 50000 paise
    quantity: 1,
    thumbnail: "https://cdn.dummyjson.com/products/images/smartphones/iPhone%206/1.png",
    description: "Latest iPhone with amazing features",
    offer_price: 450,
    tax_amount: 0,
    weight: 187
  },
  {
    product_id: 2,
    title: "Apple AirPods Max Silver",
    price: 500, // ₹500 = 50000 paise
    quantity: 1,
    thumbnail: "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/1.webp",
    description: "Premium wireless headphones",
    weight: 380
  }
];

const testAddress = {
  name: "John Doe",
  street: "123 Main Street, Apartment 4B",
  city: "Mumbai",
  zip: "400001",
  phone: "+919876543210"
};

async function testCheckoutAPI() {
  console.log('🚀 Testing Checkout API with Razorpay Line Items\n');
  console.log('📍 Endpoint:', `${BASE_URL}/api/checkout/proceed`);
  console.log('🛒 Cart Items:', testCart.length);
  console.log('💰 Total Amount:', testCart.reduce((sum, item) => sum + (item.price * item.quantity), 0), 'INR\n');

  try {
    const requestBody = {
      cart: testCart,
      userId: 'test_user_123',
      sessionId: 'test_session_' + Date.now(),
      address: testAddress
    };

    console.log('📤 Request Body:');
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('\n⏳ Sending request...\n');

    const response = await fetch(`${BASE_URL}/api/checkout/proceed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📊 Response Status:', response.status, response.statusText);
    
    const data = await response.json();

    if (data.success) {
      console.log('\n✅ SUCCESS! Razorpay order created\n');
      console.log('📦 Order Details:');
      console.log('─────────────────────────────────────────');
      console.log('Order ID:', data.order.id);
      console.log('Amount:', data.order.amount, 'paise (₹' + (data.order.amount / 100) + ')');
      console.log('Currency:', data.order.currency);
      console.log('Receipt:', data.order.receipt);
      console.log('Status:', data.order.status);
      console.log('Created At:', new Date(data.order.created_at * 1000).toLocaleString());
      
      if (data.order.notes) {
        console.log('\n📝 Notes:');
        console.log(JSON.stringify(data.order.notes, null, 2));
      }
      
      console.log('\n💡 Next Steps:');
      console.log('1. Use this order_id to initialize Razorpay Checkout');
      console.log('2. After payment, verify the signature using /api/razorpay/verify-payment');
      console.log('\n🎉 Test completed successfully!');
      
    } else {
      console.log('\n❌ FAILED! Error creating order\n');
      console.log('Error:', data.error);
    }

  } catch (error) {
    console.error('\n💥 ERROR:', error.message);
    console.error('\nPossible reasons:');
    console.error('- Server is not running (make sure to start: npm run dev)');
    console.error('- Network connection issues');
    console.error('- Invalid Razorpay credentials in .env file');
    console.error('- RAZORPAY_KEY_SECRET not set properly\n');
  }
}

// Test with invalid data (empty cart)
async function testInvalidCart() {
  console.log('\n\n🧪 Testing with Invalid Data (Empty Cart)\n');
  console.log('⏳ Sending request...\n');

  try {
    const response = await fetch(`${BASE_URL}/api/checkout/proceed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cart: [],
        userId: 'test_user',
        sessionId: 'test_session'
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      console.log('✅ Validation working correctly!');
      console.log('Expected Error:', data.error);
    } else {
      console.log('❌ Validation failed - should not allow empty cart');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run tests
async function runAllTests() {
  console.clear();
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Checkout API Test Suite');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Test 1: Valid checkout
  await testCheckoutAPI();
  
  // Test 2: Invalid cart
  await testInvalidCart();
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  All Tests Completed');
  console.log('═══════════════════════════════════════════════════════════\n');
}

// Execute tests
runAllTests().catch(console.error);

