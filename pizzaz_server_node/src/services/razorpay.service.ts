import Razorpay from "razorpay";
import crypto from "node:crypto";
import config from "../config/index.js";

export class RazorpayService {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }

  /**
   * Create a Razorpay order
   */
  async createOrder(
    amount: number,
    currency: string,
    cart: any[],
    userId: string,
    sessionId: string,
    address: any
  ) {
    const options = {
      amount: Math.round(amount * 100), // amount in paise
      currency: currency || "INR",
      receipt: `receipt_${sessionId}_${Date.now()}`,
      notes: {
        user_id: userId,
        session_id: sessionId,
        cart_items: JSON.stringify(cart),
        address: JSON.stringify(address),
      },
    };

    return this.razorpay.orders.create(options);
  }

  /**
   * Verify payment signature
   */
  verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): boolean {
    const sign = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSign = crypto
      .createHmac("sha256", config.razorpay.keySecret)
      .update(sign)
      .digest("hex");

    return expectedSign === razorpaySignature;
  }

  /**
   * Parse Razorpay store from URL
   */
  async parseStore(razorpayUrl: string) {
    if (!razorpayUrl) {
      throw new Error("Razorpay store URL is required");
    }

    // Validate URL format
    if (!razorpayUrl.includes("pages.razorpay.com/stores/")) {
      throw new Error("Invalid Razorpay store URL format");
    }

    // Fetch the HTML page
    const response = await fetch(razorpayUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract the window.__REACT_QUERY_STATE__ data
    const scriptMatch = html.match(/window\.__REACT_QUERY_STATE__\s*=\s*({.*?});/s);
    
    if (!scriptMatch || !scriptMatch[1]) {
      throw new Error("No products data found in the page");
    }

    // Parse the JSON data
    const reactQueryState = JSON.parse(scriptMatch[1]);
    
    // Extract products from the nested structure
    const storeQuery = reactQueryState.queries?.find((q: any) => 
      q.queryKey && q.queryKey[0] && q.queryKey[0].startsWith('store-st_')
    );

    if (!storeQuery || !storeQuery.state?.data?.store?.products) {
      throw new Error("Products data not found in the expected format");
    }

    const products = storeQuery.state.data.store.products;
    const storeInfo = {
      id: storeQuery.state.data.store.id,
      title: storeQuery.state.data.store.title,
      description: storeQuery.state.data.store.description,
      currency: storeQuery.state.data.store.currency,
      categories: storeQuery.state.data.store.categories,
      merchant: storeQuery.state.data.merchant
    };

    return {
      store: storeInfo,
      products: products,
      totalProducts: products.length
    };
  }

  /**
   * Create Magic Checkout order
   */
  async createMagicCheckout(products: any[], customer: any, callbacks: any) {
    if (!products || !Array.isArray(products) || products.length === 0) {
      throw new Error("Products array is required");
    }

    // Calculate totals
    const lineItemsTotal = products.reduce((sum: number, p: any) => 
      sum + (p.selling_price * (p.quantity || 1)), 0
    );

    // Format line items for Razorpay
    const lineItems = products.map((p: any) => ({
      sku: p.id || p.sku || "default-sku",
      variant_id: p.variant_id || p.id || "",
      price: p.selling_price,
      offer_price: p.discounted_price || p.selling_price,
      tax_amount: p.tax_amount || 0,
      quantity: p.quantity || 1,
      name: p.name,
      description: p.description || p.name,
      image_url: p.images && p.images[0] ? p.images[0] : "",
      product_url: p.product_url || "",
      notes: p.notes || {}
    }));

    // Create order on Razorpay
    const orderPayload = {
      amount: lineItemsTotal,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {},
      line_items_total: lineItemsTotal,
      line_items: lineItems
    };

    const razorpayAuth = Buffer.from(
      `${config.razorpay.keyId}:${config.razorpay.keySecret}`
    ).toString('base64');

    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${razorpayAuth}`
      },
      body: JSON.stringify(orderPayload)
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.text();
      throw new Error(`Razorpay API Error: ${orderResponse.status} - ${errorData}`);
    }

    const orderData = await orderResponse.json();

    // Generate Magic Checkout URL form data
    const checkoutParams = new URLSearchParams({
      'checkout[key]': config.razorpay.keyId,
      'checkout[order_id]': orderData.id,
      'checkout[name]': customer?.name || 'Customer',
      'checkout[prefill][contact]': customer?.phone || '',
      'checkout[prefill][email]': customer?.email || '',
      'checkout[notes][mode]': 'live',
      'url[callback]': callbacks?.success || 'https://google.com',
      'url[cancel]': callbacks?.cancel || 'https://yahoo.com'
    });

    return {
      order: orderData,
      checkout_url: 'https://api.razorpay.com/v1/checkout/hosted',
      form_data: Object.fromEntries(checkoutParams),
      html_form: this.generateMagicCheckoutForm(orderData.id, customer, callbacks)
    };
  }

  /**
   * Generate HTML form for Magic Checkout
   */
  private generateMagicCheckoutForm(orderId: string, customer: any, callbacks: any): string {
    return `
      <form id="razorpay-magic-checkout" action="https://api.razorpay.com/v1/checkout/hosted" method="POST">
        <input type="hidden" name="checkout[key]" value="${config.razorpay.keyId}" />
        <input type="hidden" name="checkout[order_id]" value="${orderId}" />
        <input type="hidden" name="checkout[name]" value="${customer?.name || 'Customer'}" />
        <input type="hidden" name="checkout[prefill][contact]" value="${customer?.phone || ''}" />
        <input type="hidden" name="checkout[prefill][email]" value="${customer?.email || ''}" />
        <input type="hidden" name="checkout[notes][mode]" value="live" />
        <input type="hidden" name="url[callback]" value="${callbacks?.success || 'https://google.com'}" />
        <input type="hidden" name="url[cancel]" value="${callbacks?.cancel || 'https://yahoo.com'}" />
        <button type="submit">Proceed to Magic Checkout</button>
      </form>
      <script>document.getElementById('razorpay-magic-checkout').submit();</script>
    `;
  }

  /**
   * Generate Magic Checkout HTML page with embedded script
   */
  generateMagicCheckoutHTML(params: {
    orderId: string;
    name?: string;
    businessName?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    couponCode?: string;
    callbackUrl?: string;
    showCoupons?: string;
    address?: string;
  }): string {
    const {
      orderId,
      name = 'Razorpay Magic Checkout',
      businessName = 'Acme Corp',
      customerName = 'Guest Customer',
      customerEmail = '',
      customerPhone = '',
      couponCode = '',
      callbackUrl = 'https://example.com/payment-success',
      showCoupons = 'true',
      address = ''
    } = params;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            text-align: center;
            background: white;
            padding: 3rem;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 400px;
        }
        h1 {
            color: #333;
            margin-bottom: 0.5rem;
            font-size: 1.75rem;
        }
        p {
            color: #666;
            margin-bottom: 2rem;
        }
        #rzp-button1 {
            background: #528FF0;
            color: white;
            border: none;
            padding: 16px 48px;
            font-size: 18px;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(82, 143, 240, 0.4);
        }
        #rzp-button1:hover {
            background: #3d7bd9;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(82, 143, 240, 0.6);
        }
        #rzp-button1:active {
            transform: translateY(0);
        }
        .info {
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #999;
        }
        .logo {
            width: 120px;
            height: 120px;
            margin: 0 auto 1.5rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🛒</div>
        <h1>${businessName}</h1>
        <p>Click the button below to proceed with payment</p>
        <button id="rzp-button1">Pay Now</button>
        <div class="info">
            <p>Secure payment powered by Razorpay</p>
        </div>
    </div>

    <script src="https://checkout.razorpay.com/v1/magic-checkout.js"></script>
    <script>
        var options = {
            "key": "${config.razorpay.keyId}",
            "one_click_checkout": true,
            "name": "${businessName}",
            "order_id": "${orderId}",
            "show_coupons": ${showCoupons},
            "callback_url": "${callbackUrl}",
            "redirect": "true",
            "prefill": {
                "name": "${customerName}",
                "email": "${customerEmail}",
                "contact": "${customerPhone}"${couponCode ? `,\n                "coupon_code": "${couponCode}"` : ''}
            },
            "notes": {
                "address": "${address}"
            }
        };
        
        var rzp1 = new Razorpay(options);
        
        document.getElementById('rzp-button1').onclick = function(e){
            rzp1.open();
            e.preventDefault();
        }
    </script>
</body>
</html>`;
  }
}

export default RazorpayService;

