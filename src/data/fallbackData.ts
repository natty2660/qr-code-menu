import { PublicMenuResponse, Restaurant, MealPeriod, Category, MenuItem } from '../types.ts';

export const DEMO_RESTAURANT: Restaurant = {
  id: 'rest-habesha-demo',
  name: 'Habesha Restaurant',
  slug: 'habesha-restaurant',
  description: 'Authentic Ethiopian cuisine, rich spices, fresh injera, and traditional coffee ceremonies.',
  logo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80',
  cover_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
  currency: 'ETB',
  currency_display: 'ETB',
  is_active: 1,
  meal_schedule_enabled: 1,
  phone: '+251 911 234567',
  address: 'Bole Sub-City, Addis Ababa, Ethiopia',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const DEMO_MEAL_PERIODS: MealPeriod[] = [
  {
    id: 'mp-breakfast',
    restaurant_id: 'rest-habesha-demo',
    name: 'Breakfast',
    display_order: 1,
    is_active: 1,
    start_time: '06:00',
    end_time: '11:00',
    auto_schedule_enabled: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mp-lunch',
    restaurant_id: 'rest-habesha-demo',
    name: 'Lunch',
    display_order: 2,
    is_active: 1,
    start_time: '11:00',
    end_time: '16:00',
    auto_schedule_enabled: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mp-dinner',
    restaurant_id: 'rest-habesha-demo',
    name: 'Dinner',
    display_order: 3,
    is_active: 1,
    start_time: '16:00',
    end_time: '22:00',
    auto_schedule_enabled: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mp-drinks',
    restaurant_id: 'rest-habesha-demo',
    name: 'Drinks',
    display_order: 4,
    is_active: 1,
    start_time: '06:00',
    end_time: '23:00',
    auto_schedule_enabled: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const DEMO_CATEGORIES: Category[] = [
  // Breakfast categories
  { id: 'cat-bf-trad', restaurant_id: 'rest-habesha-demo', meal_period_id: 'mp-breakfast', name: 'Traditional Breakfast', display_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'cat-bf-light', restaurant_id: 'rest-habesha-demo', meal_period_id: 'mp-breakfast', name: 'Light & Egg Dishes', display_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Lunch categories
  { id: 'cat-lu-wot', restaurant_id: 'rest-habesha-demo', meal_period_id: 'mp-lunch', name: 'Signature Wot Dishes', display_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'cat-lu-tibs', restaurant_id: 'rest-habesha-demo', meal_period_id: 'mp-lunch', name: 'Tibs & Sautéed Meats', display_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'cat-lu-veg', restaurant_id: 'rest-habesha-demo', meal_period_id: 'mp-lunch', name: 'Vegetarian / Fasting (Beyaynetu)', display_order: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Dinner categories
  { id: 'cat-di-specials', restaurant_id: 'rest-habesha-demo', meal_period_id: 'mp-dinner', name: 'Chef Specials & Kitfo', display_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'cat-di-mains', restaurant_id: 'rest-habesha-demo', meal_period_id: 'mp-dinner', name: 'Traditional Stews & Tibs', display_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Drinks categories
  { id: 'cat-dr-hot', restaurant_id: 'rest-habesha-demo', meal_period_id: 'mp-drinks', name: 'Traditional Coffee & Hot Drinks', display_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'cat-dr-cold', restaurant_id: 'rest-habesha-demo', meal_period_id: 'mp-drinks', name: 'Fresh Juices & Spris', display_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

export const DEMO_MENU_ITEMS: MenuItem[] = [
  // Breakfast items
  {
    id: 'item-chechebsa',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-breakfast',
    category_id: 'cat-bf-trad',
    name: 'Chechebsa (Kita Firfir)',
    description: 'Shredded pan-baked flatbread tossed in spiced clarified butter (niter kibbeh) and berbere, served warm with honey.',
    price: 180,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-ful',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-breakfast',
    category_id: 'cat-bf-trad',
    name: 'Special Ful',
    description: 'Slow-simmered fava beans seasoned with cumin, garlic, diced onions, jalapeños, tomatoes, and topped with boiled egg & fresh bread.',
    price: 150,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-firfir',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-breakfast',
    category_id: 'cat-bf-trad',
    name: 'Breakfast Firfir',
    description: 'Torn pieces of injera simmered in a spiced berbere sauce with garlic, red onions, and seasoned butter.',
    price: 170,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-kinche',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-breakfast',
    category_id: 'cat-bf-trad',
    name: 'Kinche (Qinchie)',
    description: 'Cracked wheat porridge gently simmered in spiced herbal niter kibbeh butter.',
    price: 140,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1505253758473-96b3015f21c9?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-eggs-bread',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-breakfast',
    category_id: 'cat-bf-light',
    name: 'Scrambled Eggs with Bread (Enqulal Tibs)',
    description: 'Scrambled farm eggs sautéed with onions, green chili, and tomatoes, served with crusty dabo bread.',
    price: 130,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  // Lunch items
  {
    id: 'item-doro-wot',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-lunch',
    category_id: 'cat-lu-wot',
    name: 'Doro Wot',
    description: 'Ethiopia’s celebrated national chicken stew, slow-cooked with rich berbere sauce, caramelized red onions, cardamoms, hard-boiled egg, and freshly baked injera.',
    price: 450,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-siga-wot',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-lunch',
    category_id: 'cat-lu-wot',
    name: 'Siga Wot (Beef Stew)',
    description: 'Tender cubed prime beef slowly braised in aromatic spiced red pepper sauce with garlic and ginger.',
    price: 380,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-shiro-wot',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-lunch',
    category_id: 'cat-lu-wot',
    name: 'Shiro Mitten (Tegabino)',
    description: 'Velvety roasted chickpea and split-pea flour stew cooked in a bubbling clay pot with garlic, diced onions, and berbere.',
    price: 250,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-tibs',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-lunch',
    category_id: 'cat-lu-tibs',
    name: 'Awaze Tibs',
    description: 'Succulent cubed beef flash-sautéed with spicy awaze paste, rosemary sprigs, onions, and sliced jalapeños.',
    price: 500,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-shekla-tibs',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-lunch',
    category_id: 'cat-lu-tibs',
    name: 'Shekla Tibs',
    description: 'Grilled tender meat served sizzling hot over a traditional charcoal burner with rosemary and fresh chili peppers.',
    price: 550,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-beyaynetu',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-lunch',
    category_id: 'cat-lu-veg',
    name: 'Yetsom Beyaynetu (Fasting Platter)',
    description: 'A vibrant rainbow feast on fresh teff injera: misir wot (red lentils), gomen (collard greens), kik alicha (yellow split peas), fosolia (green beans & carrots), and cabbage.',
    price: 350,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-bozena-shiro',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-lunch',
    category_id: 'cat-lu-wot',
    name: 'Bozena Shiro',
    description: 'Flavorful chickpea stew simmered together with seasoned ground beef and fragrant niter kibbeh.',
    price: 320,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  // Dinner items
  {
    id: 'item-kitfo',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-dinner',
    category_id: 'cat-di-specials',
    name: 'Special Kitfo (Leb Leb or Raw)',
    description: 'Finely minced lean beef tartare seasoned with rich spiced niter kibbeh and mitmita chili powder, served with ayib (cottage cheese) and gomen.',
    price: 600,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-special-tibs-dinner',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-dinner',
    category_id: 'cat-di-specials',
    name: 'Special Derek Tibs',
    description: 'Crispy fried prime beef cubes tossed with garlic, red onions, hot green peppers, and aromatic herbs.',
    price: 550,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-gomen-dinner',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-dinner',
    category_id: 'cat-di-mains',
    name: 'Gomen Besiga',
    description: 'Tender collard greens braised with beef rib tips, garlic, onions, and mild green peppers.',
    price: 380,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-dulet',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-dinner',
    category_id: 'cat-di-specials',
    name: 'Traditional Dulet',
    description: 'Finely minced tripe, liver, and lean beef sautéed with spiced butter, onions, and spicy mitmita.',
    price: 420,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  // Drinks
  {
    id: 'item-buna',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-drinks',
    category_id: 'cat-dr-hot',
    name: 'Traditional Ethiopian Buna (Coffee)',
    description: 'Freshly roasted Ethiopian highland Arabica beans brewed in a clay jebena pot, served with frankincense aroma and popcorn.',
    price: 80,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-macchiato',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-drinks',
    category_id: 'cat-dr-hot',
    name: 'Ethiopian Style Macchiato',
    description: 'Rich double espresso layered with creamy steamed fresh milk.',
    price: 100,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-shai',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-drinks',
    category_id: 'cat-dr-hot',
    name: 'Spiced Ethiopian Tea (Shai)',
    description: 'Black tea infused with whole cinnamon bark, cardamom pods, and cloves.',
    price: 60,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-spris',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-drinks',
    category_id: 'cat-dr-cold',
    name: 'Special Spris Juice (Avocado & Mango)',
    description: 'Layers of thick fresh avocado puree, sweet mango juice, and lime wedge.',
    price: 150,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-mango-juice',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-drinks',
    category_id: 'cat-dr-cold',
    name: 'Fresh Mango Juice',
    description: 'Pure, chilled 100% Ethiopian mango pulp served with a slice of fresh lime.',
    price: 150,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-water',
    restaurant_id: 'rest-habesha-demo',
    meal_period_id: 'mp-drinks',
    category_id: 'cat-dr-cold',
    name: 'Bottled Mineral Water',
    description: 'Ambo mineral water or pure highland spring water (chilled).',
    price: 50,
    currency: 'ETB',
    image_url: 'https://images.unsplash.com/photo-1559839914-ba2a0f8eb8fa?w=500&auto=format&fit=crop&q=80',
    is_available: 1,
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export function getFallbackMenuResponse(slug?: string): PublicMenuResponse {
  // Determine active meal period based on current local hour
  const now = new Date();
  const currentHour = now.getHours();

  let activePeriodId = 'mp-lunch';
  if (currentHour >= 6 && currentHour < 11) {
    activePeriodId = 'mp-breakfast';
  } else if (currentHour >= 11 && currentHour < 16) {
    activePeriodId = 'mp-lunch';
  } else if (currentHour >= 16 && currentHour < 22) {
    activePeriodId = 'mp-dinner';
  } else {
    activePeriodId = 'mp-drinks';
  }

  // Check if custom data was saved in localStorage for this slug
  try {
    const customData = localStorage.getItem(`ethio_menu_store_${slug || 'habesha-restaurant'}`);
    if (customData) {
      const parsed = JSON.parse(customData);
      if (parsed && parsed.restaurant) {
        return {
          ...parsed,
          activePeriodId: parsed.activePeriodId || activePeriodId,
          permanentMenuUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${slug || 'habesha-restaurant'}`,
          currentServerTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        };
      }
    }
  } catch (e) {
    // Ignore storage errors
  }

  return {
    restaurant: DEMO_RESTAURANT,
    mealPeriods: DEMO_MEAL_PERIODS,
    categories: DEMO_CATEGORIES,
    items: DEMO_MENU_ITEMS,
    activePeriodId,
    permanentMenuUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${slug || 'habesha-restaurant'}`,
    currentServerTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  };
}
