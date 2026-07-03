export type Product = {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  price: string;
  image_url: string | null;
  front_view: string | null;
  side_view: string | null;
  lifestyle_images: string | null;
  thumbnail: string | null;
  stock_quantity: number;
  category?: string | null;
};

export type User = {
  id: number;
  email: string;
  full_name: string | null;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  role: "user" | "admin";
};

export type Admin = {
  id: number;
  email: string;
  full_name: string | null;
  created_at: string;
};

export type AdminStats = {
  product_count: number;
  order_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  orders_by_status: Record<string, number>;
  total_sales: string;
  total_users: number;
};

export type AdminOrderSummary = {
  id: number;
  status: string;
  total: string;
  created_at: string;
  user_email: string;
  user_full_name: string | null;
};

export type AdminOrderList = {
  items: AdminOrderSummary[];
  total: number;
};

export type AdminOrderDetail = {
  id: number;
  status: string;
  total: string;
  created_at: string;
  payment_reference: string | null;
  user_email: string;
  user_full_name: string | null;
  items: {
    product_name: string;
    quantity: number;
    unit_price: string;
    line_total: string;
  }[];
};

export type CartLine = {
  id: number;
  product_id: number;
  quantity: number;
  product: Product;
};

export type CartResponse = {
  items: CartLine[];
  subtotal: string;
};

export type CheckoutResult = {
  order_id: number;
  status: string;
  total: string;
  payment_reference: string | null;
  message: string;
};

export type ApiErrorBody = {
  detail?: string | { msg: string }[];
};
