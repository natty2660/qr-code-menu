export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  cover_url: string;
  currency: 'ETB';
  currency_display: 'ETB' | 'ብር';
  is_active: number | boolean;
  meal_schedule_enabled: number | boolean;
  phone?: string;
  address?: string;
  permanent_url?: string;
  meal_period_count?: number;
  item_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MealPeriod {
  id: string;
  restaurant_id: string;
  name: string;
  display_order: number;
  is_active: number | boolean;
  start_time: string;
  end_time: string;
  auto_schedule_enabled: number | boolean;
  category_count?: number;
  item_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  meal_period_id: string;
  name: string;
  display_order: number;
  meal_period_name?: string;
  item_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  meal_period_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  currency: 'ETB';
  image_url: string;
  is_available: number | boolean;
  display_order: number;
  meal_period_name?: string;
  category_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PublicMenuResponse {
  restaurant: Restaurant;
  permanentMenuUrl: string;
  currentServerTime: string;
  activePeriodId: string | null;
  mealPeriods: MealPeriod[];
  categories: Category[];
  items: MenuItem[];
}
