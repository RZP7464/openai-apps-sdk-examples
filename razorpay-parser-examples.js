/**
 * Razorpay Store Parser - Usage Examples
 * 
 * This file demonstrates various ways to use the Razorpay Store Parser API
 */

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8000';

// ==================== EXAMPLE 1: Basic Usage ====================
async function basicExample() {
  console.log('=== Example 1: Basic Usage ===\n');
  
  const response = await fetch(`${SERVER_URL}/api/razorpay/parse-store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM'
    })
  });

  const data = await response.json();
  console.log('Total Products:', data.totalProducts);
  console.log('Store Name:', data.store.title);
  console.log('\n');
}

// ==================== EXAMPLE 2: Filter Products by Category ====================
async function filterByCategory(categoryName) {
  console.log(`=== Example 2: Filter by Category (${categoryName}) ===\n`);
  
  const response = await fetch(`${SERVER_URL}/api/razorpay/parse-store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM'
    })
  });

  const data = await response.json();
  
  if (data.success) {
    const filteredProducts = data.products.filter(product => 
      product.categories.some(cat => cat.name === categoryName)
    );
    
    console.log(`Found ${filteredProducts.length} products in ${categoryName} category:`);
    filteredProducts.forEach(p => {
      console.log(`  - ${p.name}: ₹${(p.selling_price / 100).toFixed(2)}`);
    });
  }
  console.log('\n');
}

// ==================== EXAMPLE 3: Find Products by Price Range ====================
async function findByPriceRange(minPrice, maxPrice) {
  console.log(`=== Example 3: Products between ₹${minPrice} - ₹${maxPrice} ===\n`);
  
  const response = await fetch(`${SERVER_URL}/api/razorpay/parse-store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM'
    })
  });

  const data = await response.json();
  
  if (data.success) {
    const minPriceInPaise = minPrice * 100;
    const maxPriceInPaise = maxPrice * 100;
    
    const filteredProducts = data.products.filter(p => 
      p.selling_price >= minPriceInPaise && p.selling_price <= maxPriceInPaise
    );
    
    console.log(`Found ${filteredProducts.length} products:`);
    filteredProducts.forEach(p => {
      console.log(`  - ${p.name}: ₹${(p.selling_price / 100).toFixed(2)}`);
    });
  }
  console.log('\n');
}

// ==================== EXAMPLE 4: Check Stock Availability ====================
async function checkStockStatus() {
  console.log('=== Example 4: Stock Status Report ===\n');
  
  const response = await fetch(`${SERVER_URL}/api/razorpay/parse-store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM'
    })
  });

  const data = await response.json();
  
  if (data.success) {
    const inStock = data.products.filter(p => p.status === 'in_stock');
    const unlimited = data.products.filter(p => p.status === 'unlimited');
    const lowStock = data.products.filter(p => p.status === 'in_stock' && p.stock < 20);
    
    console.log(`In Stock: ${inStock.length} products`);
    console.log(`Unlimited: ${unlimited.length} products`);
    console.log(`Low Stock (< 20): ${lowStock.length} products`);
    
    if (lowStock.length > 0) {
      console.log('\nLow Stock Items:');
      lowStock.forEach(p => {
        console.log(`  - ${p.name}: ${p.stock} units`);
      });
    }
  }
  console.log('\n');
}

// ==================== EXAMPLE 5: Get Most Expensive Products ====================
async function getMostExpensive(count = 5) {
  console.log(`=== Example 5: Top ${count} Most Expensive Products ===\n`);
  
  const response = await fetch(`${SERVER_URL}/api/razorpay/parse-store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM'
    })
  });

  const data = await response.json();
  
  if (data.success) {
    const sorted = [...data.products].sort((a, b) => b.selling_price - a.selling_price);
    const top = sorted.slice(0, count);
    
    top.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}: ₹${(p.selling_price / 100).toFixed(2)}`);
    });
  }
  console.log('\n');
}

// ==================== EXAMPLE 6: Export to CSV Format ====================
async function exportToCSV() {
  console.log('=== Example 6: Export Products to CSV ===\n');
  
  const response = await fetch(`${SERVER_URL}/api/razorpay/parse-store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM'
    })
  });

  const data = await response.json();
  
  if (data.success) {
    console.log('ID,Name,Price,Stock,Status,Category');
    data.products.forEach(p => {
      const category = p.categories[0]?.name || 'N/A';
      console.log(
        `"${p.id}","${p.name}",${(p.selling_price / 100).toFixed(2)},${p.stock},"${p.status}","${category}"`
      );
    });
  }
  console.log('\n');
}

// ==================== EXAMPLE 7: Get Store Summary ====================
async function getStoreSummary() {
  console.log('=== Example 7: Store Summary ===\n');
  
  const response = await fetch(`${SERVER_URL}/api/razorpay/parse-store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM'
    })
  });

  const data = await response.json();
  
  if (data.success) {
    const totalValue = data.products.reduce((sum, p) => sum + (p.selling_price * p.stock), 0);
    const avgPrice = data.products.reduce((sum, p) => sum + p.selling_price, 0) / data.products.length;
    
    console.log('📊 Store Analytics:');
    console.log(`   Store: ${data.store.title}`);
    console.log(`   Total Products: ${data.totalProducts}`);
    console.log(`   Categories: ${data.store.categories.length}`);
    console.log(`   Average Price: ₹${(avgPrice / 100).toFixed(2)}`);
    console.log(`   Total Inventory Value: ₹${(totalValue / 100).toFixed(2)}`);
    console.log(`   Currency: ${data.store.currency}`);
    console.log(`\n📞 Contact:`, data.store.merchant.support_details);
  }
  console.log('\n');
}

// ==================== Run All Examples ====================
async function runAllExamples() {
  try {
    await basicExample();
    await filterByCategory('Smartphone');
    await findByPriceRange(100, 500);
    await checkStockStatus();
    await getMostExpensive(5);
    await exportToCSV();
    await getStoreSummary();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure your server is running on port 8000 (or set SERVER_URL env variable)');
  }
}

// Run examples
runAllExamples();

