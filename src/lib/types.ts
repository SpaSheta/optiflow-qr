export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  instagram: string | null;
  facebook: string | null;
  website: string | null;
  currency: string;
  tax_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestaurantTheme {
  id: string;
  restaurant_id: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  font_family: string;
  intro_video_url: string | null;
  menu_layout: string;
}

export interface Table {
  id: string;
  restaurant_id: string | null;
  table_number: string;
  label: string | null;
  capacity: number;
  is_active: boolean;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string | null;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string | null;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
}

export interface Bill {
  id: string;
  restaurant_id: string | null;
  table_id: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  opened_at: string;
  closed_at: string | null;
  updated_at: string;
}

export interface BillItem {
  id: string;
  bill_id: string | null;
  restaurant_id: string | null;
  menu_item_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  voided: boolean;
  created_at: string;
}

export interface WaiterRequest {
  id: string;
  restaurant_id: string | null;
  table_id: string | null;
  bill_id: string | null;
  type: string;
  message: string | null;
  status: string;
  created_at: string;
}
