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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [signupForm, setSignupForm] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [address, setAddress] = useState({
    name: "",
    phone: "",
    street: "",
    city: "",
    zip: ""
  });
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const limit = 100;

  // API base URL
  const baseUrl = "https://openai-apps-sdk-examples-2-7lml.onrender.com";

  useEffect(() => {
    // Check for stored auth token
    const token = localStorage.getItem('authToken');
    if (token) {
      // Verify token with backend
      fetch(`${baseUrl}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setIsLoggedIn(true);
            setUserId(data.user.id);
            setUserEmail(data.user.email);
            
            // Load cart from database
            return fetch(`${baseUrl}/api/cart?userId=${data.user.id}`);
          } else {
            // Token invalid, clear it
            localStorage.removeItem('authToken');
          }
        })
        .then(res => res && res.json())
        .then(cartData => {
          if (cartData && cartData.success) {
            // Convert DB cart to widget format
            const dbCart = cartData.cart.map(item => ({
              id: item.product_id,
              title: item.title,
              price: parseFloat(item.price),
              thumbnail: item.thumbnail
            }));
            setCart(dbCart);
          }
        })
        .catch(err => {
          console.error('Token verification failed:', err);
          localStorage.removeItem('authToken');
        });
    }
    
    // Get search parameters from tool output
    const toolOutput = window.openai?.toolOutput || {};
    if (toolOutput.query) setQuery(toolOutput.query);
    if (toolOutput.skip !== undefined) setSkip(toolOutput.skip);
  }, []);

  useEffect(() => {
    fetch(`https://dummyjson.com/products/search?q=${query}&limit=${limit}&skip=${skip}`)
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
        setTotal(data.total || 0);
      });
  }, [query, skip]);

  const handleAddToCart = async (product) => {
    try {
      const sessionId = window.openai?.widgetSessionId || Date.now().toString();
      
      const response = await fetch(`${baseUrl}/api/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          productId: product.id,
          title: product.title,
          price: product.price,
          thumbnail: product.thumbnail,
          sessionId: sessionId
        })
      });

      const data = await response.json();
      if (data.success) {
        // Update local cart state
        const dbCart = data.cart.map(item => ({
          id: item.product_id,
          title: item.title,
          price: parseFloat(item.price),
          thumbnail: item.thumbnail
        }));
        setCart(dbCart);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleRemoveFromCart = async (productId) => {
    try {
      const response = await fetch(`${baseUrl}/api/cart/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          productId: productId
        })
      });

      const data = await response.json();
      if (data.success) {
        // Update local cart state
        const dbCart = data.cart.map(item => ({
          id: item.product_id,
          title: item.title,
          price: parseFloat(item.price),
          thumbnail: item.thumbnail
        }));
        setCart(dbCart);
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    
    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.username,
          password: loginForm.password
        })
      });

      const data = await response.json();

      if (data.success) {
        // Store token
        localStorage.setItem('authToken', data.token);
        
        // Update state
        setIsLoggedIn(true);
        setUserId(data.user.id);
        setUserEmail(data.user.email);
        
        // Store user ID in widget state
        window.openai.widgetState = {
          ...window.openai.widgetState,
          userId: data.user.id
        };
      } else {
        setLoginError(data.error || "Login failed");
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError("Network error. Please try again.");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoginError("");

    // Validate passwords match
    if (signupForm.password !== signupForm.confirmPassword) {
      setLoginError("Passwords do not match");
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: signupForm.username,
          email: signupForm.email,
          password: signupForm.password
        })
      });

      const data = await response.json();

      if (data.success) {
        // Store token
        localStorage.setItem('authToken', data.token);
        
        // Update state
        setIsLoggedIn(true);
        setUserId(data.user.id);
        setUserEmail(data.user.email);
        
        // Store user ID in widget state
        window.openai.widgetState = {
          ...window.openai.widgetState,
          userId: data.user.id
        };
      } else {
        setLoginError(data.error || "Signup failed");
      }
    } catch (error) {
      console.error('Signup error:', error);
      setLoginError("Network error. Please try again.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserId(null);
    setUserEmail("");
    setShowAddressForm(false);
    localStorage.removeItem('authToken');
    
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

  const handleProceedToCheckout = async () => {
    setIsProcessingCheckout(true);
    setCheckoutError("");
    
    try {
      const sessionId = window.openai?.widgetSessionId || Date.now().toString();
      
      // Prepare cart data with proper structure for line items
      const cartData = cart.map(item => ({
        product_id: item.id,
        title: item.title,
        price: item.price,
        quantity: 1,
        thumbnail: item.thumbnail,
        description: item.title,
        offer_price: item.price,
        tax_amount: 0
      }));

      const requestBody = {
        cart: cartData,
        userId: userId,
        sessionId: sessionId,
        address: address
      };

      console.log('Creating Razorpay order...', requestBody);

      const response = await fetch(`${baseUrl}/api/checkout/proceed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (data.success) {
        console.log('Order created successfully:', data);
        
        // Clear cart after successful order creation
        await fetch(`${baseUrl}/api/cart/clear`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId })
        });
        setCart([]);
        
        // Reset address form
        setShowAddressForm(false);
        setAddress({ name: "", phone: "", street: "", city: "", zip: "" });
        
        // Open magic checkout URL directly
        const magicCheckoutUrl = `${baseUrl}/api/razorpay/magic-checkout?orderId=${data.order.id}`;
        window.open(magicCheckoutUrl, '_blank');
        
      } else {
        console.error('Order creation failed:', data.error);
        setCheckoutError(data.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setCheckoutError('Network error. Please try again.');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Login/Signup page
  if (!isLoggedIn) {
    return (
      <div className="antialiased w-full text-black px-4 pb-4 border border-black/10 rounded-2xl sm:rounded-3xl overflow-hidden bg-white">
        <div className="max-w-md mx-auto">
          <div className="flex flex-col items-center gap-2 border-b border-black/5 py-6">
            <ShoppingCart className="h-12 w-12 text-blue-600" strokeWidth={1.5} />
            <div className="text-xl sm:text-2xl font-semibold">Product Search</div>
            <div className="text-sm text-black/60">
              {showSignup ? "Create your account" : "Login to continue"}
            </div>
          </div>

          {!showSignup ? (
            <form onSubmit={handleLogin} className="py-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your username"
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
                  placeholder="Enter your password"
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
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowSignup(true);
                    setLoginError("");
                    setLoginForm({ username: "", password: "" });
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Don't have an account? Sign up
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="py-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={signupForm.username}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Choose a username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimum 6 characters"
                  required
                  minLength="6"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={signupForm.confirmPassword}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Re-enter your password"
                  required
                />
              </div>
              {loginError && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {loginError}
                </div>
              )}
              <Button color="primary" variant="solid" size="md" block type="submit">
                Sign Up
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowSignup(false);
                    setLoginError("");
                    setSignupForm({ username: "", email: "", password: "", confirmPassword: "" });
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Already have an account? Login
                </button>
              </div>
            </form>
          )}
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
              onClick={() => {
                setShowAddressForm(false);
                setCheckoutError("");
              }}
              disabled={isProcessingCheckout}
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
                disabled={isProcessingCheckout}
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
                disabled={isProcessingCheckout}
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
                disabled={isProcessingCheckout}
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
                  disabled={isProcessingCheckout}
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
                  disabled={isProcessingCheckout}
                />
              </div>
            </div>
          </div>
          
          {checkoutError && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
              {checkoutError}
            </div>
          )}
          
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
                onClick={handleProceedToCheckout}
                disabled={isProcessingCheckout}
              >
                {isProcessingCheckout ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Order...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Proceed to Checkout
                  </>
                )}
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
