// Test script for Razorpay Store Parser API
const testRazorpayParser = async () => {
  const serverUrl = process.env.SERVER_URL || 'http://localhost:8000'; // Default port is 8000
  const razorpayStoreUrl = 'https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM';

  try {
    console.log('🚀 Testing Razorpay Store Parser API...\n');
    console.log(`📍 Server: ${serverUrl}`);
    console.log(`🔗 Razorpay URL: ${razorpayStoreUrl}\n`);

    const response = await fetch(`${serverUrl}/api/razorpay/parse-store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: razorpayStoreUrl
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Success! Products parsed successfully\n');
      console.log('📦 Store Information:');
      console.log(`   ID: ${data.store.id}`);
      console.log(`   Title: ${data.store.title}`);
      console.log(`   Currency: ${data.store.currency}`);
      console.log(`   Total Products: ${data.totalProducts}\n`);

      console.log('📋 Categories:');
      data.store.categories.forEach((cat) => {
        console.log(`   - ${cat.categoryName}: ${cat.categoryCount} products`);
      });

      console.log('\n🛍️ Sample Products (first 5):');
      data.products.slice(0, 5).forEach((product, index) => {
        console.log(`\n   ${index + 1}. ${product.name}`);
        console.log(`      ID: ${product.id}`);
        console.log(`      Price: ${product.currency || data.store.currency} ${(product.selling_price / 100).toFixed(2)}`);
        console.log(`      Stock: ${product.stock === -1 ? 'Unlimited' : product.stock}`);
        console.log(`      Status: ${product.status}`);
      });

      console.log('\n📊 Full Response Structure:');
      console.log(JSON.stringify({
        success: data.success,
        store: {
          id: data.store.id,
          title: data.store.title,
          '...': '(truncated)'
        },
        products: `Array(${data.products.length})`,
        totalProducts: data.totalProducts
      }, null, 2));

    } else {
      console.error('❌ Error:', data.error);
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.log('\n💡 Make sure your server is running on port 8000 (or set PORT env variable)');
    console.log('   Start it with: cd pizzaz_server_node && npm start');
  }
};

// Run the test
testRazorpayParser();

