# Razorpay Store Parser API

## Overview
This API endpoint allows you to parse Razorpay store URLs and extract product information in JSON format.

## Endpoint

### Parse Razorpay Store
**URL:** `/api/razorpay/parse-store`  
**Method:** `POST`  
**Content-Type:** `application/json`

## Request Format

```json
{
  "url": "https://pages.razorpay.com/stores/st_XXXXXXXXXXXXXXX"
}
```

### Request Parameters

| Parameter | Type   | Required | Description                           |
|-----------|--------|----------|---------------------------------------|
| url       | string | Yes      | Full URL of the Razorpay store page   |

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "store": {
    "id": "st_RvP3FIXbUltGLM",
    "title": "HIMANSHU SHEKHAR",
    "description": "",
    "currency": "INR",
    "categories": [
      {
        "categoryName": "Smartphone",
        "categoryId": "smartphone",
        "categoryCount": 20,
        "products": [...]
      }
    ],
    "merchant": {
      "id": "QSL0nNNEW3RM7a",
      "name": "HIMANSHU SHEKHAR",
      "image": "",
      "brand_color": "rgb(35,113,236)",
      "support_details": {
        "support_email": "a@a.com",
        "support_mobile": "9999999999"
      }
    }
  },
  "products": [
    {
      "id": "li_RyCva0f2VLjTIW",
      "name": "Samsung Galaxy S10",
      "description": "The Samsung Galaxy S10 is a flagship device...",
      "images": [],
      "selling_price": 69999,
      "discounted_price": 69999,
      "stock": 19,
      "stock_available": 19,
      "stock_sold": 0,
      "status": "in_stock",
      "categories": [
        {
          "id": "cat_RyCAUnKA8Ejino",
          "name": "Smartphone",
          "alias": "smartphone",
          "catalog_count": 0
        }
      ]
    }
  ],
  "totalProducts": 22
}
```

### Error Responses

#### 400 Bad Request - Missing URL
```json
{
  "success": false,
  "error": "Razorpay store URL is required"
}
```

#### 400 Bad Request - Invalid URL Format
```json
{
  "success": false,
  "error": "Invalid Razorpay store URL format"
}
```

#### 404 Not Found - No Products Data
```json
{
  "success": false,
  "error": "No products data found in the page"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to parse Razorpay store"
}
```

## Product Object Schema

Each product in the `products` array contains:

| Field            | Type    | Description                                    |
|------------------|---------|------------------------------------------------|
| id               | string  | Unique product identifier                      |
| name             | string  | Product name                                   |
| description      | string  | Product description                            |
| images           | array   | Array of product image URLs                    |
| selling_price    | number  | Price in smallest currency unit (paise for INR)|
| discounted_price | number  | Discounted price in smallest currency unit     |
| stock            | number  | Available stock (-1 for unlimited)             |
| stock_available  | number  | Available stock quantity                       |
| stock_sold       | number  | Number of units sold                           |
| status           | string  | Stock status: "in_stock", "unlimited", etc.    |
| categories       | array   | Array of category objects                      |

## Usage Examples

### cURL Example

```bash
curl -X POST http://localhost:8000/api/razorpay/parse-store \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM"
  }'
```

### JavaScript/Node.js Example

```javascript
const parseRazorpayStore = async (storeUrl) => {
  const response = await fetch('http://localhost:8000/api/razorpay/parse-store', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: storeUrl })
  });

  const data = await response.json();
  
  if (data.success) {
    console.log(`Found ${data.totalProducts} products`);
    console.log('Products:', data.products);
  } else {
    console.error('Error:', data.error);
  }
};

parseRazorpayStore('https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM');
```

### Python Example

```python
import requests
import json

def parse_razorpay_store(store_url):
    response = requests.post(
        'http://localhost:8000/api/razorpay/parse-store',
        headers={'Content-Type': 'application/json'},
        json={'url': store_url}
    )
    
    data = response.json()
    
    if data.get('success'):
        print(f"Found {data['totalProducts']} products")
        print(f"Store: {data['store']['title']}")
        return data['products']
    else:
        print(f"Error: {data.get('error')}")
        return None

products = parse_razorpay_store('https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM')
```

## Testing

A test script is provided in the root directory:

```bash
node test-razorpay-parser.js
```

## Notes

- Prices are returned in the smallest currency unit (e.g., paise for INR)
- To convert to regular currency: `price / 100`
- Stock value of `-1` indicates unlimited stock
- The API extracts data from the embedded React Query state in the Razorpay page
- CORS is enabled for all origins

## Common Use Cases

1. **E-commerce Integration**: Import Razorpay store products into your own platform
2. **Price Monitoring**: Track product prices and stock levels
3. **Catalog Management**: Sync product catalogs between systems
4. **Analytics**: Analyze product offerings and pricing strategies
5. **Automated Testing**: Verify store content programmatically

## Troubleshooting

### Server Not Running
If you get connection errors, make sure the server is running:
```bash
cd pizzaz_server_node
npm install
npm start
```

The server runs on port 8000 by default. You can change it by setting the PORT environment variable:
```bash
PORT=3000 npm start
```

### Invalid URL Format
Make sure the URL follows this pattern:
```
https://pages.razorpay.com/stores/st_XXXXXXXXXXXXX
```

### No Products Found
This could happen if:
- The store page structure has changed
- The store is empty or disabled
- The URL is incorrect

## Security Considerations

- The API fetches external content - use rate limiting in production
- Validate and sanitize the input URL
- Consider implementing authentication for production use
- Monitor for excessive requests to prevent abuse

