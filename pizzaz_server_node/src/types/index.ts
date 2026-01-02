export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface CartItem {
  id: string;
  userId: string;
  productId: number;
  title: string;
  price: number;
  thumbnail?: string;
  quantity: number;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  zip: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  lineItems: any;
  notes: any;
  sessionId?: string;
  createdAt: number;
  updatedAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  sessionId?: string;
  cartData?: any;
  addressData?: any;
  createdAt: string;
}

export interface PizzazWidget {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  responseText: string;
}

export interface SessionRecord {
  server: any;
  transport: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

