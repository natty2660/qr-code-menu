import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

let dbInstance: Database | null = null;
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_FILE = isServerless
  ? path.join('/tmp', 'database.sqlite')
  : path.join(process.cwd(), 'database.sqlite');

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch {
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  // Enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON;');

  // Run migrations
  initSchema(dbInstance);
  saveDb();

  return dbInstance;
}

export function saveDb() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.warn('Could not write database to disk:', err);
  }
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      logo_url TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      currency TEXT NOT NULL DEFAULT 'ETB',
      currency_display TEXT NOT NULL DEFAULT 'ETB',
      is_active INTEGER NOT NULL DEFAULT 1,
      meal_schedule_enabled INTEGER NOT NULL DEFAULT 1,
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meal_periods (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      start_time TEXT DEFAULT '06:00',
      end_time TEXT DEFAULT '11:00',
      auto_schedule_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      meal_period_id TEXT NOT NULL,
      name TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      FOREIGN KEY (meal_period_id) REFERENCES meal_periods(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      meal_period_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'ETB',
      image_url TEXT DEFAULT '',
      is_available INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      FOREIGN KEY (meal_period_id) REFERENCES meal_periods(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
    CREATE INDEX IF NOT EXISTS idx_meal_periods_rest ON meal_periods(restaurant_id, display_order);
    CREATE INDEX IF NOT EXISTS idx_categories_period ON categories(meal_period_id, display_order);
    CREATE INDEX IF NOT EXISTS idx_menu_items_cat ON menu_items(category_id, display_order);
  `);

  // Check if we need to seed demo Ethiopian restaurant
  const checkStmt = db.prepare('SELECT COUNT(*) as count FROM restaurants');
  let hasRestaurants = false;
  if (checkStmt.step()) {
    const row = checkStmt.getAsObject() as { count: number };
    hasRestaurants = row.count > 0;
  }
  checkStmt.free();

  if (!hasRestaurants) {
    seedDemoData(db);
  }
}

function seedDemoData(db: Database) {
  const now = new Date().toISOString();
  const restId = 'rest-habesha-demo';
  const restSlug = 'habesha-restaurant';

  db.run(`
    INSERT INTO restaurants (id, name, slug, description, logo_url, cover_url, currency, currency_display, is_active, meal_schedule_enabled, phone, address, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    restId,
    'Habesha Restaurant',
    restSlug,
    'Authentic Ethiopian cuisine, rich spices, fresh injera, and traditional coffee ceremonies.',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
    'ETB',
    'ETB',
    1,
    1,
    '+251 911 234567',
    'Bole Sub-City, Addis Ababa, Ethiopia',
    now,
    now
  ]);

  // Seed Meal Periods: Breakfast, Lunch, Dinner, Drinks
  const periods = [
    { id: 'mp-breakfast', name: 'Breakfast', order: 1, start: '06:00', end: '11:00' },
    { id: 'mp-lunch', name: 'Lunch', order: 2, start: '11:00', end: '16:00' },
    { id: 'mp-dinner', name: 'Dinner', order: 3, start: '16:00', end: '22:00' },
    { id: 'mp-drinks', name: 'Drinks', order: 4, start: '06:00', end: '23:00' }
  ];

  for (const p of periods) {
    db.run(`
      INSERT INTO meal_periods (id, restaurant_id, name, display_order, is_active, start_time, end_time, auto_schedule_enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [p.id, restId, p.name, p.order, 1, p.start, p.end, 1, now, now]);
  }

  // Seed Categories
  const categories = [
    // Breakfast categories
    { id: 'cat-bf-trad', periodId: 'mp-breakfast', name: 'Traditional Breakfast', order: 1 },
    { id: 'cat-bf-light', periodId: 'mp-breakfast', name: 'Light & Egg Dishes', order: 2 },
    // Lunch categories
    { id: 'cat-lu-wot', periodId: 'mp-lunch', name: 'Signature Wot Dishes', order: 1 },
    { id: 'cat-lu-tibs', periodId: 'mp-lunch', name: 'Tibs & Sautéed Meats', order: 2 },
    { id: 'cat-lu-veg', periodId: 'mp-lunch', name: 'Vegetarian / Fasting (Beyaynetu)', order: 3 },
    // Dinner categories
    { id: 'cat-di-specials', periodId: 'mp-dinner', name: 'Chef Specials & Kitfo', order: 1 },
    { id: 'cat-di-mains', periodId: 'mp-dinner', name: 'Traditional Stews & Tibs', order: 2 },
    // Drinks categories
    { id: 'cat-dr-hot', periodId: 'mp-drinks', name: 'Traditional Coffee & Hot Drinks', order: 1 },
    { id: 'cat-dr-cold', periodId: 'mp-drinks', name: 'Fresh Juices & Spris', order: 2 }
  ];

  for (const c of categories) {
    db.run(`
      INSERT INTO categories (id, restaurant_id, meal_period_id, name, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [c.id, restId, c.periodId, c.name, c.order, now, now]);
  }

  // Seed Menu Items (All prices in ETB)
  const items = [
    // Breakfast items
    {
      id: 'item-chechebsa',
      periodId: 'mp-breakfast',
      catId: 'cat-bf-trad',
      name: 'Chechebsa (Kita Firfir)',
      desc: 'Shredded pan-baked flatbread tossed in spiced clarified butter (niter kibbeh) and berbere, served warm with honey.',
      price: 180,
      image: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=500&auto=format&fit=crop&q=80',
      order: 1
    },
    {
      id: 'item-ful',
      periodId: 'mp-breakfast',
      catId: 'cat-bf-trad',
      name: 'Special Ful',
      desc: 'Slow-simmered fava beans seasoned with cumin, garlic, diced onions, jalapeños, tomatoes, and topped with boiled egg & fresh bread.',
      price: 150,
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=80',
      order: 2
    },
    {
      id: 'item-firfir',
      periodId: 'mp-breakfast',
      catId: 'cat-bf-trad',
      name: 'Breakfast Firfir',
      desc: 'Torn pieces of injera simmered in a spiced berbere sauce with garlic, red onions, and seasoned butter.',
      price: 170,
      image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop&q=80',
      order: 3
    },
    {
      id: 'item-kinche',
      periodId: 'mp-breakfast',
      catId: 'cat-bf-trad',
      name: 'Kinche (Qinchie)',
      desc: 'Cracked wheat porridge gently simmered in spiced herbal niter kibbeh butter.',
      price: 140,
      image: 'https://images.unsplash.com/photo-1505253758473-96b3015f21c9?w=500&auto=format&fit=crop&q=80',
      order: 4
    },
    {
      id: 'item-eggs-bread',
      periodId: 'mp-breakfast',
      catId: 'cat-bf-light',
      name: 'Scrambled Eggs with Bread (Enqulal Tibs)',
      desc: 'Scrambled farm eggs sautéed with onions, green chili, and tomatoes, served with crusty dabo bread.',
      price: 130,
      image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=80',
      order: 1
    },

    // Lunch items
    {
      id: 'item-doro-wot',
      periodId: 'mp-lunch',
      catId: 'cat-lu-wot',
      name: 'Doro Wot',
      desc: 'Ethiopia’s celebrated national chicken stew, slow-cooked with rich berbere sauce, caramelized red onions, cardamoms, hard-boiled egg, and freshly baked injera.',
      price: 450,
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80',
      order: 1
    },
    {
      id: 'item-siga-wot',
      periodId: 'mp-lunch',
      catId: 'cat-lu-wot',
      name: 'Siga Wot (Beef Stew)',
      desc: 'Tender cubed prime beef slowly braised in aromatic spiced red pepper sauce with garlic and ginger.',
      price: 380,
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=80',
      order: 2
    },
    {
      id: 'item-shiro-wot',
      periodId: 'mp-lunch',
      catId: 'cat-lu-wot',
      name: 'Shiro Mitten (Tegabino)',
      desc: 'Velvety roasted chickpea and split-pea flour stew cooked in a bubbling clay pot with garlic, diced onions, and berbere.',
      price: 250,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
      order: 3
    },
    {
      id: 'item-tibs',
      periodId: 'mp-lunch',
      catId: 'cat-lu-tibs',
      name: 'Awaze Tibs',
      desc: 'Succulent cubed beef flash-sautéed with spicy awaze paste, rosemary sprigs, onions, and sliced jalapeños.',
      price: 500,
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80',
      order: 1
    },
    {
      id: 'item-shekla-tibs',
      periodId: 'mp-lunch',
      catId: 'cat-lu-tibs',
      name: 'Shekla Tibs',
      desc: 'Grilled tender meat served sizzling hot over a traditional charcoal burner with rosemary and fresh chili peppers.',
      price: 550,
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80',
      order: 2
    },
    {
      id: 'item-beyaynetu',
      periodId: 'mp-lunch',
      catId: 'cat-lu-veg',
      name: 'Yetsom Beyaynetu (Fasting Platter)',
      desc: 'A vibrant rainbow feast on fresh teff injera: misir wot (red lentils), gomen (collard greens), kik alicha (yellow split peas), fosolia (green beans & carrots), and cabbage.',
      price: 350,
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=80',
      order: 1
    },
    {
      id: 'item-bozena-shiro',
      periodId: 'mp-lunch',
      catId: 'cat-lu-wot',
      name: 'Bozena Shiro',
      desc: 'Flavorful chickpea stew simmered together with seasoned ground beef and fragrant niter kibbeh.',
      price: 320,
      image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=500&auto=format&fit=crop&q=80',
      order: 4
    },

    // Dinner items
    {
      id: 'item-kitfo',
      periodId: 'mp-dinner',
      catId: 'cat-di-specials',
      name: 'Special Kitfo (Leb Leb or Raw)',
      desc: 'Finely minced lean beef tartare seasoned with rich spiced niter kibbeh and mitmita chili powder, served with ayib (cottage cheese) and gomen.',
      price: 600,
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80',
      order: 1
    },
    {
      id: 'item-special-tibs-dinner',
      periodId: 'mp-dinner',
      catId: 'cat-di-specials',
      name: 'Special Derek Tibs',
      desc: 'Crispy fried prime beef cubes tossed with garlic, red onions, hot green peppers, and aromatic herbs.',
      price: 550,
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80',
      order: 2
    },
    {
      id: 'item-gomen-dinner',
      periodId: 'mp-dinner',
      catId: 'cat-di-mains',
      name: 'Gomen Besiga',
      desc: 'Tender collard greens braised with beef rib tips, garlic, onions, and mild green peppers.',
      price: 380,
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=80',
      order: 1
    },
    {
      id: 'item-dulet',
      periodId: 'mp-dinner',
      catId: 'cat-di-specials',
      name: 'Traditional Dulet',
      desc: 'Finely minced tripe, liver, and lean beef sautéed with spiced butter, onions, and spicy mitmita.',
      price: 420,
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=80',
      order: 3
    },

    // Drinks
    {
      id: 'item-buna',
      periodId: 'mp-drinks',
      catId: 'cat-dr-hot',
      name: 'Traditional Ethiopian Buna (Coffee)',
      desc: 'Freshly roasted Ethiopian highland Arabica beans brewed in a clay jebena pot, served with frankincense aroma and popcorn.',
      price: 80,
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
      order: 1
    },
    {
      id: 'item-macchiato',
      periodId: 'mp-drinks',
      catId: 'cat-dr-hot',
      name: 'Ethiopian Style Macchiato',
      desc: 'Rich double espresso layered with creamy steamed fresh milk.',
      price: 100,
      image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&auto=format&fit=crop&q=80',
      order: 2
    },
    {
      id: 'item-shai',
      periodId: 'mp-drinks',
      catId: 'cat-dr-hot',
      name: 'Spiced Ethiopian Tea (Shai)',
      desc: 'Black tea infused with whole cinnamon bark, cardamom pods, and cloves.',
      price: 60,
      image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80',
      order: 3
    },
    {
      id: 'item-spris',
      periodId: 'mp-drinks',
      catId: 'cat-dr-cold',
      name: 'Special Spris Juice (Avocado & Mango)',
      desc: 'Layers of thick fresh avocado puree, sweet mango juice, and lime wedge.',
      price: 150,
      image: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=500&auto=format&fit=crop&q=80',
      order: 1
    },
    {
      id: 'item-mango-juice',
      periodId: 'mp-drinks',
      catId: 'cat-dr-cold',
      name: 'Fresh Mango Juice',
      desc: 'Pure, chilled 100% Ethiopian mango pulp served with a slice of fresh lime.',
      price: 150,
      image: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=500&auto=format&fit=crop&q=80',
      order: 2
    },
    {
      id: 'item-water',
      periodId: 'mp-drinks',
      catId: 'cat-dr-cold',
      name: 'Bottled Mineral Water',
      desc: 'Ambo mineral water or pure highland spring water (chilled).',
      price: 50,
      image: 'https://images.unsplash.com/photo-1559839914-ba2a0f8eb8fa?w=500&auto=format&fit=crop&q=80',
      order: 3
    }
  ];

  for (const item of items) {
    db.run(`
      INSERT INTO menu_items (id, restaurant_id, meal_period_id, category_id, name, description, price, currency, image_url, is_available, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      item.id,
      restId,
      item.periodId,
      item.catId,
      item.name,
      item.desc,
      item.price,
      'ETB',
      item.image,
      1,
      item.order,
      now,
      now
    ]);
  }
}

// SQL query helpers
export function queryAll<T = any>(db: Database, sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T = any>(db: Database, sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(db, sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function execute(db: Database, sql: string, params: any[] = []): void {
  db.run(sql, params);
  saveDb();
}
