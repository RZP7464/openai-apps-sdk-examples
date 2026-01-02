# Razorpay Store Parser - GET API

## 🎯 Test the API Directly in Your Browser!

You can now test the Razorpay Store Parser API using a simple GET request with query parameters.

---

## 📋 API Endpoint

**Method**: `GET`  
**URL**: `http://localhost:8000/api/razorpay/parse-store`  
**Query Parameter**: `url` (required)

---

## 🚀 Test URLs - Click to Open in Browser

### Example 1: Parse the Demo Store
```
http://localhost:8000/api/razorpay/parse-store?url=https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM
```

**Click here to test**: [http://localhost:8000/api/razorpay/parse-store?url=https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM](http://localhost:8000/api/razorpay/parse-store?url=https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM)

---

## 📊 Response Format

You'll get a JSON response like this:

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
      "description": "The Samsung Galaxy S10...",
      "images": [],
      "selling_price": 69999,
      "discounted_price": 69999,
      "stock": 19,
      "stock_available": 19,
      "stock_sold": 0,
      "status": "in_stock",
      "categories": [...]
    }
  ],
  "totalProducts": 22
}
```

---

## 🔧 How to Use

### Method 1: Browser Address Bar (Easiest!)
1. Make sure your server is running: `cd pizzaz_server_node && npm start`
2. Copy and paste this URL into your browser:
   ```
   http://localhost:8000/api/razorpay/parse-store?url=https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM
   ```
3. Press Enter
4. See the JSON response directly in your browser!

### Method 2: cURL Command
```bash
curl "http://localhost:8000/api/razorpay/parse-store?url=https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM"
```

### Method 3: JavaScript Fetch
```javascript
fetch('http://localhost:8000/api/razorpay/parse-store?url=https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM')
  .then(res => res.json())
  .then(data => console.log(data));
```

### Method 4: Python Requests
```python
import requests

url = "http://localhost:8000/api/razorpay/parse-store"
params = {"url": "https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM"}
response = requests.get(url, params=params)
print(response.json())
```

---

## 🎨 View in Browser with Pretty Formatting

Install a JSON viewer extension for your browser:
- Chrome: [JSON Formatter](https://chrome.google.com/webstore/detail/json-formatter/bcjindcccaagfpapjjmafapmmgkkhgoa)
- Firefox: [JSONView](https://addons.mozilla.org/en-US/firefox/addon/jsonview/)

Then open the URL and see beautifully formatted JSON!

---

## ❌ Error Responses

### Missing URL Parameter
```json
{
  "success": false,
  "error": "Razorpay store URL is required. Use ?url=https://pages.razorpay.com/stores/st_XXXXX"
}
```

### Invalid URL Format
```json
{
  "success": false,
  "error": "Invalid Razorpay store URL format"
}
```

---

## 🆚 GET vs POST

### GET Endpoint (New!)
- **URL**: `GET /api/razorpay/parse-store?url=STORE_URL`
- **Best for**: Testing in browser, simple integrations
- **Test in**: Browser address bar, Postman GET request

### POST Endpoint (Original)
- **URL**: `POST /api/razorpay/parse-store`
- **Body**: `{"url": "STORE_URL"}`
- **Best for**: Production apps, when URL is very long
- **Test in**: Postman, cURL with -X POST

Both endpoints return the same data format!

---

## 🎯 Quick Test Commands

### Test if server is running:
```bash
curl http://localhost:8000/api/razorpay/parse-store?url=https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM
```

### Test with different store (replace STORE_ID):
```bash
curl "http://localhost:8000/api/razorpay/parse-store?url=https://pages.razorpay.com/stores/STORE_ID"
```

---

## 💡 Pro Tips

1. **URL Encoding**: If the store URL has special characters, URL-encode it:
   ```
   http://localhost:8000/api/razorpay/parse-store?url=https%3A%2F%2Fpages.razorpay.com%2Fstores%2Fst_RvP3FIXbUltGLM
   ```

2. **Save Response**: Save JSON to file using cURL:
   ```bash
   curl "http://localhost:8000/api/razorpay/parse-store?url=https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM" > output.json
   ```

3. **Pretty Print**: Use jq for formatted output:
   ```bash
   curl -s "http://localhost:8000/api/razorpay/parse-store?url=https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM" | jq
   ```

---

## 🔥 Ready to Test!

**Copy this URL and paste it in your browser now:**
```
http://localhost:8000/api/razorpay/parse-store?url=https://pages.razorpay.com/stores/st_RvP3FIXbUltGLM
```

You'll see all 22 products with full details in JSON format! 🎉

