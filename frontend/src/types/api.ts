export type ProductColor = { name: string; hex: string };

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
  material?: string | null;
  lens_width_mm?: number | null;
  bridge_mm?: number | null;
  temple_mm?: number | null;
  lens_features?: string | null;
  colors?: ProductColor[];
  avg_rating?: number | null;
  review_count?: number;
};

export type AdminUser = {
  id: number;
  email: string;
  full_name: string | null;
  created_at: string;
  order_count: number;
  total_spent: string;
  review_count: number;
};

export type AdminUserList = {
  items: AdminUser[];
  total: number;
};

export type AdminAnalytics = {
  sales_by_day: { date: string; revenue: string; orders: number }[];
  top_products: { product_id: number | null; name: string; units_sold: number; revenue: string }[];
  sentiment_breakdown: Record<string, number>;
  rating_distribution: Record<string, number>;
  revenue_total: string;
  orders_total: number;
};

export type WishlistItem = { id: number; product: Product; created_at: string };
export type WishlistResponse = { items: WishlistItem[] };

export type Review = {
  id: number;
  product_id: number;
  rating: number;
  title: string | null;
  body: string | null;
  sentiment: "positive" | "neutral" | "negative";
  author_name: string;
  is_mine: boolean;
  created_at: string;
};

export type ReviewSummary = {
  review_count: number;
  avg_rating: number | null;
  rating_breakdown: Record<string, number>;
  sentiment_breakdown: Record<string, number>;
};

export type ReviewList = {
  summary: ReviewSummary;
  items: Review[];
  my_review: Review | null;
};

export type ReviewPayload = {
  rating: number;
  title?: string | null;
  body?: string | null;
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

export type OrderItemDetail = {
  product_id?: number | null;
  product_name: string;
  product_sku?: string | null;
  product_image?: string | null;
  current_stock?: number | null;
  quantity: number;
  unit_price: string;
  line_total: string;
  color?: string | null;
};

export type AdminOrderSummary = {
  id: number;
  status: string;
  total: string;
  created_at: string;
  user_email: string;
  user_full_name: string | null;
  items?: OrderItemDetail[];
};

export type AdminOrderList = {
  items: AdminOrderSummary[];
  total: number;
};

export type AdminOrderDetail = {
  id: number;
  status: string;
  subtotal?: string | null;
  tax?: string | null;
  shipping_fee?: string | null;
  discount?: string | null;
  coupon_code?: string | null;
  total: string;
  created_at: string;
  payment_reference: string | null;
  tracking_number?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  ship_full_name?: string | null;
  ship_address?: string | null;
  ship_city?: string | null;
  ship_state?: string | null;
  ship_zip?: string | null;
  user_email: string;
  user_full_name: string | null;
  items: OrderItemDetail[];
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
  subtotal: string;
  tax: string;
  shipping_fee: string;
  discount: string;
  total: string;
  payment_reference: string | null;
  message: string;
};

export type CheckoutPayload = {
  shipping: {
    full_name: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    email: string;
    phone: string;
  };
  payment_intent_id: string;
  coupon_code?: string | null;
};

export type ApiErrorBody = {
  detail?: string | { msg: string }[];
};
