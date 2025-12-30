#!/usr/bin/env python3
"""
Start script for shopping cart MCP server with host validation disabled.
This bypasses the 421 Misdirected Request error on Render.
"""
import os
import sys

# Disable Starlette host validation
os.environ.setdefault("STARLETTE_ALLOWED_HOSTS", "*")

# Import and run the app
if __name__ == "__main__":
    # Change to script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Run the main module
    import shopping_cart_python.main as main_module
    
    # If main is callable, run it
    if hasattr(main_module, '__name__') and main_module.__name__ == '__main__':
        # Re-execute as if run directly
        exec(open('shopping_cart_python/main.py').read())

