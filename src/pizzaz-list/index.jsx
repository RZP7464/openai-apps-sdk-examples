import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { PlusCircle, Star, ShoppingCart } from "lucide-react";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Image } from "@openai/apps-sdk-ui/components/Image";

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState("phone");
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 100;

  useEffect(() => {
    // Get search parameters from tool output
    const toolOutput = window.openai?.toolOutput || {};
    if (toolOutput.query) setQuery(toolOutput.query);
    if (toolOutput.skip !== undefined) setSkip(toolOutput.skip);
    
    // Load cart from widget state (persisted across conversation turns)
    const savedCart = window.openai?.widgetState?.cart || [];
    setCart(savedCart);
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

  const getTotalItems = () => cart.length;
  const getTotalPrice = () => cart.reduce((sum, item) => sum + item.price, 0).toFixed(2);

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
              Product Search Results
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
                <div className="py-2 whitespace-nowrap flex justify-end">
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
              <a 
                href={`https://pages.razorpay.com/pl_QSiWE4HOKMKQHh/view?amount=${getTotalPrice()}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button 
                  color="primary" 
                  variant="solid" 
                  size="md" 
                  block
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Pay Now ({getTotalItems()} items)
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("pizzaz-list-root")).render(<App />);
