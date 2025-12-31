import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { PlusCircle, MinusCircle, Star, ShoppingCart, Search } from "lucide-react";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Image } from "@openai/apps-sdk-ui/components/Image";

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState("phone");
  const [searchInput, setSearchInput] = useState("phone");
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: "",
    cardName: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: ""
  });
  const [paymentError, setPaymentError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [address, setAddress] = useState({
    name: "",
    phone: "",
    street: "",
    city: "",
    zip: ""
  });
  const limit = 100;

  // Hardcoded demo credentials
  const DEMO_USERNAME = "Demo User";
  const DEMO_PASSWORD = "demo";
  const DEMO_USER_ID = "3e974d44-b8f0-4fe6-b3e7-f69ac5e9eb71";
  
  // Razorpay configuration
  const RAZORPAY_KEY_ID = "rzp_live_I51bxdyuOOsDA7";

  useEffect(() => {
    // Get search parameters from tool output
    const toolOutput = window.openai?.toolOutput || {};
    if (toolOutput.query) setQuery(toolOutput.query);
    if (toolOutput.skip !== undefined) setSkip(toolOutput.skip);
    
    // Load cart and user state from widget state
    const widgetState = window.openai?.widgetState || {};
    const savedCart = widgetState.cart || [];
    const savedUserId = widgetState.userId;
    const savedAddress = widgetState.addresses?.[savedUserId];
    
    setCart(savedCart);
    if (savedUserId) {
      setIsLoggedIn(true);
      setUserId(savedUserId);
      if (savedAddress) {
        setAddress(savedAddress);
      }
    }
  }, []);

  useEffect(() => {
    fetch(`https://dummyjson.com/products/search?q=${query}&limit=${limit}&skip=${skip}`)
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
        setTotal(data.total || 0);
      });
  }, [query, skip]);

  const handleAddToCart = (product) => {
    const newCart = [...cart, { 
      id: product.id, 
      title: product.title, 
      price: product.price,
      thumbnail: product.thumbnail,
      quantity: 1
    }];
    setCart(newCart);
    
    // Store in widget state with session ID
    window.openai.widgetState = {
      ...window.openai.widgetState,
      cart: newCart,
      sessionId: window.openai.widgetSessionId || Date.now().toString()
    };
  };

  const handleRemoveFromCart = (productId) => {
    const itemIndex = cart.findIndex(item => item.id === productId);
    if (itemIndex !== -1) {
      const newCart = [...cart];
      newCart.splice(itemIndex, 1);
      setCart(newCart);
      
      // Update widget state
      window.openai.widgetState = {
        ...window.openai.widgetState,
        cart: newCart,
        sessionId: window.openai.widgetSessionId || Date.now().toString()
      };
    }
  };

  const isProductInCart = (productId) => {
    return cart.some(item => item.id === productId);
  };

  const getTotalItems = () => cart.length;
  const getTotalPrice = () => cart.reduce((sum, item) => sum + item.price, 0).toFixed(2);
  
  const isAddressComplete = () => {
    return address.name && address.phone && address.street && address.city && address.zip;
  };

  const handleAddressChange = (field, value) => {
    const updatedAddress = { ...address, [field]: value };
    setAddress(updatedAddress);
    
    // Save address to widget state with user ID
    if (userId) {
      const widgetState = window.openai?.widgetState || {};
      const addresses = widgetState.addresses || {};
      addresses[userId] = updatedAddress;
      
      window.openai.widgetState = {
        ...widgetState,
        addresses
      };
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError("");
    
    if (loginForm.username === DEMO_USERNAME && loginForm.password === DEMO_PASSWORD) {
      setIsLoggedIn(true);
      setUserId(DEMO_USER_ID);
      
      // Store user ID in widget state
      window.openai.widgetState = {
        ...window.openai.widgetState,
        userId: DEMO_USER_ID
      };
    } else {
      setLoginError("Invalid username or password");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserId(null);
    setShowAddressForm(false);
    
    // Clear user ID from widget state but keep cart
    const widgetState = window.openai?.widgetState || {};
    delete widgetState.userId;
    window.openai.widgetState = widgetState;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setQuery(searchInput);
    setSkip(0); // Reset to first page when searching
  };

  const handleProceedToPayment = () => {
    setShowAddressForm(false);
    setShowPaymentForm(true);
  };

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19); // Max 16 digits + 3 spaces
  };

  const handlePaymentFormChange = (field, value) => {
    if (field === 'cardNumber') {
      value = formatCardNumber(value);
    } else if (field === 'expiryMonth' || field === 'expiryYear') {
      value = value.replace(/\D/g, '').substring(0, field === 'expiryMonth' ? 2 : 4);
    } else if (field === 'cvv') {
      value = value.replace(/\D/g, '').substring(0, 3);
    }
    setPaymentForm(prev => ({ ...prev, [field]: value }));
  };

  const validatePaymentForm = () => {
    const cardNumberDigits = paymentForm.cardNumber.replace(/\s/g, '');
    if (cardNumberDigits.length !== 16) return false;
    if (!paymentForm.cardName.trim()) return false;
    if (!paymentForm.expiryMonth || !paymentForm.expiryYear) return false;
    if (paymentForm.cvv.length !== 3) return false;
    
    const month = parseInt(paymentForm.expiryMonth);
    if (month < 1 || month > 12) return false;
    
    const year = parseInt(paymentForm.expiryYear);
    const currentYear = new Date().getFullYear();
    if (year < currentYear || year > currentYear + 20) return false;
    
    return true;
  };

  const handlePayment = async () => {
    if (!validatePaymentForm()) {
      setPaymentError("Please fill in all card details correctly");
      return;
    }

    setIsProcessing(true);
    setPaymentError("");
    
    const totalAmount = parseFloat(getTotalPrice());
    const sessionId = window.openai?.widgetSessionId || Date.now().toString();
    const baseUrl = window.location.origin;
    
    try {
      // Step 1: Create Razorpay order on backend
      const orderResponse = await fetch(`${baseUrl}/api/razorpay/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalAmount,
          currency: 'INR',
          cart: cart.map(item => ({ id: item.id, title: item.title, price: item.price })),
          userId: userId,
          sessionId: sessionId,
          address: address
        })
      });

      const orderData = await orderResponse.json();
      
      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      const order = orderData.order;

      // Step 2: Create payment using Razorpay Payment API
      const paymentResponse = await fetch('https://api.razorpay.com/v1/payments/create/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key_id: RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency,
          order_id: order.id,
          card: {
            number: paymentForm.cardNumber.replace(/\s/g, ''),
            name: paymentForm.cardName,
            expiry_month: paymentForm.expiryMonth,
            expiry_year: paymentForm.expiryYear,
            cvv: paymentForm.cvv,
          },
          email: address.name ? `${address.name.toLowerCase().replace(/\s/g, '')}@example.com` : 'customer@example.com',
          contact: address.phone,
        })
      });

      const paymentData = await paymentResponse.json();

      if (paymentData.error) {
        throw new Error(paymentData.error.description || 'Payment failed');
      }

      // Step 3: Verify payment signature on backend
      const verifyResponse = await fetch(`${baseUrl}/api/razorpay/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          razorpay_order_id: order.id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature
        })
      });

      const verifyData = await verifyResponse.json();

      if (!verifyData.success) {
        throw new Error('Payment verification failed');
      }

      // Store payment details in widget state
      const paymentRecord = {
        payment_id: paymentData.razorpay_payment_id,
        order_id: order.id,
        amount: totalAmount,
        currency: "INR",
        session_id: sessionId,
        user_id: userId,
        timestamp: new Date().toISOString(),
        cart: cart,
        address: address,
        card_last4: paymentForm.cardNumber.replace(/\s/g, '').slice(-4),
        status: "success"
      };
      
      const widgetState = window.openai?.widgetState || {};
      const payments = widgetState.payments || [];
      payments.push(paymentRecord);
      
      window.openai.widgetState = {
        ...widgetState,
        payments,
        lastPayment: paymentRecord
      };
      
      // Clear cart and forms after successful payment
      setCart([]);
      window.openai.widgetState.cart = [];
      setShowPaymentForm(false);
      setPaymentForm({
        cardNumber: "",
        cardName: "",
        expiryMonth: "",
        expiryYear: "",
        cvv: ""
      });
      setIsProcessing(false);
      
      alert(`Payment successful!\nPayment ID: ${paymentData.razorpay_payment_id}\nOrder ID: ${order.id}\nAmount: ₹${totalAmount}\nSession ID: ${sessionId}`);
      
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError(error.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  // Login page
  if (!isLoggedIn) {
    return (
      <div className="antialiased w-full text-black px-4 pb-4 border border-black/10 rounded-2xl sm:rounded-3xl overflow-hidden bg-white">
        <div className="max-w-md mx-auto">
          <div className="flex flex-col items-center gap-2 border-b border-black/5 py-6">
            <ShoppingCart className="h-12 w-12 text-blue-600" strokeWidth={1.5} />
            <div className="text-xl sm:text-2xl font-semibold">Welcome to Product Search</div>
            <div className="text-sm text-black/60">Please login to continue</div>
          </div>
          <form onSubmit={handleLogin} className="py-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-3 py-2 border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Demo User"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••"
                required
              />
            </div>
            {loginError && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {loginError}
              </div>
            )}
            <Button color="primary" variant="solid" size="md" block type="submit">
              Login
            </Button>
            <div className="text-xs text-center text-black/40 pt-2">
              Demo credentials: Username: "Demo User", Password: "demo"
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (showAddressForm) {
    return (
      <div className="antialiased w-full text-black px-4 pb-4 border border-black/10 rounded-2xl sm:rounded-3xl overflow-hidden bg-white">
        <div className="max-w-full">
          <div className="flex flex-row items-center gap-4 border-b border-black/5 py-4">
            <div className="flex-1">
              <div className="text-base sm:text-xl font-medium">Delivery Address</div>
              <div className="text-sm text-black/60">Enter your delivery details</div>
            </div>
            <Button 
              color="secondary" 
              variant="ghost" 
              size="sm"
              onClick={() => setShowAddressForm(false)}
            >
              Back
            </Button>
          </div>
          <div className="py-4 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                type="text"
                value={address.name}
                onChange={(e) => handleAddressChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input
                type="tel"
                value={address.phone}
                onChange={(e) => handleAddressChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1 234 567 8900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Street Address</label>
              <input
                type="text"
                value={address.street}
                onChange={(e) => handleAddressChange('street', e.target.value)}
                className="w-full px-3 py-2 border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123 Main Street"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">City</label>
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="New York"
                />
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium mb-1">ZIP Code</label>
                <input
                  type="text"
                  value={address.zip}
                  onChange={(e) => handleAddressChange('zip', e.target.value)}
                  className="w-full px-3 py-2 border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10001"
                />
              </div>
            </div>
          </div>
          <div className="border-t border-black/5 pt-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Order Total</span>
              <span className="text-lg font-bold">${getTotalPrice()}</span>
            </div>
            {isAddressComplete() ? (
              <Button 
                color="primary" 
                variant="solid" 
                size="md" 
                block
                onClick={handleProceedToPayment}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Proceed to Payment
              </Button>
            ) : (
              <Button color="primary" variant="solid" size="md" block disabled>
                Please complete all fields
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Payment form
  if (showPaymentForm) {
    return (
      <div className="antialiased w-full text-black px-4 pb-4 border border-black/10 rounded-2xl sm:rounded-3xl overflow-hidden bg-white">
        <div className="max-w-md mx-auto">
          <div className="flex flex-row items-center gap-4 border-b border-black/5 py-4">
            <div className="flex-1">
              <div className="text-base sm:text-xl font-medium">Payment Details</div>
              <div className="text-sm text-black/60">Enter your card information</div>
            </div>
            <Button 
              color="secondary" 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setShowPaymentForm(false);
                setShowAddressForm(true);
              }}
              disabled={isProcessing}
            >
              Back
            </Button>
          </div>
          <div className="py-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Order Total</span>
                <span className="font-bold text-lg">₹{getTotalPrice()}</span>
              </div>
              <div className="text-xs text-black/60">{getTotalItems()} items</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Card Number</label>
              <input
                type="text"
                value={paymentForm.cardNumber}
                onChange={(e) => handlePaymentFormChange('cardNumber', e.target.value)}
                className="w-full px-3 py-2 border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="1234 5678 9012 3456"
                maxLength="19"
                disabled={isProcessing}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Cardholder Name</label>
              <input
                type="text"
                value={paymentForm.cardName}
                onChange={(e) => handlePaymentFormChange('cardName', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="JOHN DOE"
                disabled={isProcessing}
              />
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Expiry Date</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={paymentForm.expiryMonth}
                    onChange={(e) => handlePaymentFormChange('expiryMonth', e.target.value)}
                    className="w-full px-3 py-2 border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="MM"
                    maxLength="2"
                    disabled={isProcessing}
                  />
                  <input
                    type="text"
                    value={paymentForm.expiryYear}
                    onChange={(e) => handlePaymentFormChange('expiryYear', e.target.value)}
                    className="w-full px-3 py-2 border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="YYYY"
                    maxLength="4"
                    disabled={isProcessing}
                  />
                </div>
              </div>
              <div className="w-28">
                <label className="block text-sm font-medium mb-1">CVV</label>
                <input
                  type="text"
                  value={paymentForm.cvv}
                  onChange={(e) => handlePaymentFormChange('cvv', e.target.value)}
                  className="w-full px-3 py-2 border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="123"
                  maxLength="3"
                  disabled={isProcessing}
                />
              </div>
            </div>
            
            {paymentError && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {paymentError}
              </div>
            )}
            
            <div className="bg-black/5 rounded-lg p-3 space-y-1 text-xs text-black/60">
              <div className="flex justify-between">
                <span>Delivery Address:</span>
                <span className="text-right font-medium text-black/80">
                  {address.street}, {address.city} {address.zip}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Contact:</span>
                <span className="font-medium text-black/80">{address.phone}</span>
              </div>
            </div>
          </div>
          <div className="border-t border-black/5 pt-3">
            <Button 
              color="primary" 
              variant="solid" 
              size="md" 
              block
              onClick={handlePayment}
              disabled={isProcessing || !validatePaymentForm()}
            >
              {isProcessing ? (
                "Processing Payment..."
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Pay ₹{getTotalPrice()}
                </>
              )}
            </Button>
            <div className="text-xs text-center text-black/40 mt-2">
              🔒 Secure payment • Session ID: {window.openai?.widgetSessionId?.substring(0, 8)}...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="antialiased w-full text-black px-4 pb-2 border border-black/10 rounded-2xl sm:rounded-3xl overflow-hidden bg-white">
      <div className="max-w-full">
        <div className="flex flex-row items-center gap-4 sm:gap-4 border-b border-black/5 py-4">
          <div
            className="sm:w-18 w-16 aspect-square rounded-xl bg-cover bg-center"
            style={{
              backgroundImage:
                "url(https://persistent.oaistatic.com/pizzaz/title.png)",
            }}
          ></div>
          <div className="flex-1">
            <div className="text-base sm:text-xl font-medium">
              Smartphone Store
            </div>
            <div className="text-sm text-black/60">
              {total} products found for "{query}"
            </div>
          </div>
          {cart.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <ShoppingCart className="h-4 w-4" />
              <span className="font-medium">{getTotalItems()} items</span>
            </div>
          )}
          <Button 
            color="secondary" 
            variant="ghost" 
            size="sm"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
        <div className="py-3 border-b border-black/5">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-black/40" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search for products..."
                className="w-full pl-10 pr-3 py-2 border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <Button 
              color="primary" 
              variant="solid" 
              size="md"
              type="submit"
            >
              Search
            </Button>
          </form>
        </div>
        <div className="min-w-full text-sm flex flex-col">
          {products.map((product, i) => (
            <div
              key={product.id}
              className="px-3 -mx-2 rounded-2xl hover:bg-black/5"
            >
              <div
                style={{
                  borderBottom:
                    i === products.length - 1 ? "none" : "1px solid rgba(0, 0, 0, 0.05)",
                }}
                className="flex w-full items-center hover:border-black/0! gap-2"
              >
                <div className="py-3 pr-3 min-w-0 w-full sm:w-3/5">
                  <div className="flex items-center gap-3">
                    <Image
                      src={product.thumbnail}
                      alt={product.title}
                      className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg object-cover ring ring-black/5"
                    />
                    <div className="min-w-0 sm:pl-1 flex flex-col items-start h-full">
                      <div className="font-medium text-sm sm:text-md truncate max-w-[40ch]">
                        {product.title}
                      </div>
                      <div className="mt-1 sm:mt-0.25 flex items-center gap-3 text-black/70 text-sm">
                        <div className="flex items-center gap-1">
                          <Star
                            strokeWidth={1.5}
                            className="h-3 w-3 text-black"
                          />
                          <span>{product.rating?.toFixed(1)}</span>
                        </div>
                        <div className="whitespace-nowrap font-medium">
                          ${product.price}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="hidden sm:block text-end py-2 px-3 text-sm text-black/60 whitespace-nowrap flex-auto">
                  {product.category || "–"}
                </div>
                <div className="py-2 whitespace-nowrap flex justify-end gap-2">
                  {isProductInCart(product.id) && (
                    <Button
                      aria-label={`Remove ${product.title}`}
                      color="secondary"
                      variant="ghost"
                      size="sm"
                      uniform
                      onClick={() => handleRemoveFromCart(product.id)}
                    >
                      <MinusCircle strokeWidth={1.5} className="h-5 w-5" />
                    </Button>
                  )}
                  <Button
                    aria-label={`Add ${product.title}`}
                    color="secondary"
                    variant="ghost"
                    size="sm"
                    uniform
                    onClick={() => handleAddToCart(product)}
                  >
                    <PlusCircle strokeWidth={1.5} className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div className="py-6 text-center text-black/60">
              No products found.
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 pt-2">
          {total > limit && (
            <div className="flex gap-2">
              <Button 
                color="secondary" 
                variant="outline" 
                size="sm"
                disabled={skip === 0}
                onClick={() => setSkip(Math.max(0, skip - limit))}
              >
                Previous
              </Button>
              <Button 
                color="secondary" 
                variant="outline" 
                size="sm"
                disabled={skip + limit >= total}
                onClick={() => setSkip(skip + limit)}
              >
                Next
              </Button>
              <span className="text-sm text-black/60 self-center ml-2">
                {skip + 1}-{Math.min(skip + limit, total)} of {total}
              </span>
            </div>
          )}
          {cart.length > 0 && (
            <div className="pt-2 border-t border-black/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Cart Summary</span>
                <span className="text-sm font-medium">${getTotalPrice()}</span>
              </div>
              <Button 
                color="primary" 
                variant="solid" 
                size="md" 
                block
                onClick={() => setShowAddressForm(true)}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Proceed to Checkout ({getTotalItems()} items)
          </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("pizzaz-list-root")).render(<App />);
