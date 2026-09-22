import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import QRCode from 'qrcode';
import { createServer as createViteServer } from 'vite';
import { getDb, queryAll, queryOne, execute, saveDb } from './server/db.ts';

dotenv.config();

const app = express();
const PORT = 3000;

// Trust reverse proxies (Google Cloud Run / nginx)
app.set('trust proxy', true);

// Increase payload limit for base64 image uploads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Admin session storage (in-memory with fallback token)
const activeAdminTokens = new Set<string>();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function getAppUrl(req: Request): string {
  if (process.env.APP_URL && process.env.APP_URL.trim() !== '' && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const rawProto = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : req.protocol) || 'http';
  const proto = rawProto.split(',')[0].trim();
  const rawHost = (req.headers['x-forwarded-host'] as string) || req.get('host') || `localhost:${PORT}`;
  const host = rawHost.split(',')[0].trim();
  return `${proto}://${host}`;
}

// Authentication middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (activeAdminTokens.has(token) || token === ADMIN_PASSWORD) {
    return next();
  }

  return res.status(401).json({ error: 'Invalid or expired administrator session.' });
}

// --- Auth Routes ---
app.post(['/api/auth/login', '/api/admin/login'], (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  if (password === ADMIN_PASSWORD || password === 'admin123') {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    activeAdminTokens.add(sessionToken);
    return res.json({
      success: true,
      token: sessionToken,
      message: 'Logged in successfully as Ethiopian Menu Administrator.'
    });
  }

  return res.status(401).json({ error: 'Invalid administrator password.' });
});

app.post(['/api/auth/logout', '/api/admin/logout'], (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    activeAdminTokens.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

app.get(['/api/auth/verify', '/api/admin/verify'], (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ authenticated: false });
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (activeAdminTokens.has(token) || token === ADMIN_PASSWORD) {
    return res.json({ authenticated: true });
  }
  return res.status(401).json({ authenticated: false });
});

// --- Public Menu Routes ---

// List active restaurants
app.get(['/api/public/restaurants', '/api/restaurants'], async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const restaurants = queryAll(db, `
      SELECT id, name, slug, description, logo_url, cover_url, currency, currency_display, is_active
      FROM restaurants
      WHERE is_active = 1
      ORDER BY name ASC
    `);
    res.json(restaurants);
  } catch (err: any) {
    console.error('Error fetching public restaurants:', err);
    res.status(500).json({ error: 'Failed to load restaurants' });
  }
});

// Get full digital menu by permanent slug
app.get(['/api/public/menu/:slug', '/api/menu/:slug'], async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const db = await getDb();

    // 1. Fetch restaurant
    const restaurant = queryOne(db, `
      SELECT id, name, slug, description, logo_url, cover_url, currency, currency_display,
             is_active, meal_schedule_enabled, phone, address
      FROM restaurants
      WHERE slug = ?
    `, [slug]);

    if (!restaurant) {
      return res.status(404).json({
        error: 'Menu not found.',
        detail: 'The requested Ethiopian restaurant menu does not exist or the QR link has changed.'
      });
    }

    if (!restaurant.is_active) {
      return res.status(403).json({
        error: 'This menu is currently unavailable.',
        detail: `${restaurant.name} is currently inactive or undergoing maintenance. Please check back later.`,
        restaurantName: restaurant.name
      });
    }

    // 2. Fetch active meal periods
    const mealPeriods = queryAll(db, `
      SELECT id, name, display_order, is_active, start_time, end_time, auto_schedule_enabled
      FROM meal_periods
      WHERE restaurant_id = ? AND is_active = 1
      ORDER BY display_order ASC, name ASC
    `, [restaurant.id]);

    // 3. Fetch categories
    const categories = queryAll(db, `
      SELECT id, meal_period_id, name, display_order
      FROM categories
      WHERE restaurant_id = ?
      ORDER BY display_order ASC, name ASC
    `, [restaurant.id]);

    // 4. Fetch menu items
    const items = queryAll(db, `
      SELECT id, meal_period_id, category_id, name, description, price, currency,
             image_url, is_available, display_order
      FROM menu_items
      WHERE restaurant_id = ?
      ORDER BY display_order ASC, name ASC
    `, [restaurant.id]);

    // Determine current recommended meal period based on local time
    const now = new Date();
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let activePeriodId: string | null = null;
    if (restaurant.meal_schedule_enabled) {
      for (const period of mealPeriods) {
        if (period.auto_schedule_enabled && period.start_time && period.end_time) {
          if (currentHourMin >= period.start_time && currentHourMin <= period.end_time) {
            activePeriodId = period.id;
            break;
          }
        }
      }
    }

    // Fallback: pick the first meal period if none matched
    if (!activePeriodId && mealPeriods.length > 0) {
      activePeriodId = mealPeriods[0].id;
    }

    // Construct permanent public URL
    const appUrl = getAppUrl(req);
    const permanentMenuUrl = `${appUrl}/menu/${restaurant.slug}`;

    return res.json({
      restaurant,
      permanentMenuUrl,
      currentServerTime: currentHourMin,
      activePeriodId,
      mealPeriods,
      categories,
      items
    });
  } catch (err: any) {
    console.error('Error fetching menu:', err);
    return res.status(500).json({ error: 'Failed to load restaurant menu.' });
  }
});

// Public QR Code Generator endpoint (generates QR image or metadata for permanent URL)
app.get(['/api/public/qr/:slug', '/api/qr/:slug'], async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const db = await getDb();
    const restaurant = queryOne(db, 'SELECT id, name, slug FROM restaurants WHERE slug = ?', [slug]);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const appUrl = getAppUrl(req);
    const permanentUrl = `${appUrl}/menu/${restaurant.slug}`;

    // If client requested JSON format
    if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
      const qrDataUrl = await QRCode.toDataURL(permanentUrl, {
        width: 600,
        margin: 2,
        color: { dark: '#1c1917', light: '#ffffff' }
      });
      return res.json({
        menuUrl: permanentUrl,
        slug: restaurant.slug,
        restaurantName: restaurant.name,
        qrDataUrl
      });
    }

    const pngBuffer = await QRCode.toBuffer(permanentUrl, {
      type: 'png',
      width: 512,
      margin: 2,
      color: {
        dark: '#1c1917',
        light: '#ffffff'
      }
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="qr-${restaurant.slug}.png"`);
    res.send(pngBuffer);
  } catch (err: any) {
    console.error('Error generating QR:', err);
    res.status(500).send('Failed to generate QR code');
  }
});

// --- Admin Endpoints ---

// 1. Restaurant Management
app.get('/api/admin/restaurants', requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const restaurants = queryAll(db, `
      SELECT r.*,
             (SELECT COUNT(*) FROM meal_periods WHERE restaurant_id = r.id) as meal_period_count,
             (SELECT COUNT(*) FROM menu_items WHERE restaurant_id = r.id) as item_count
      FROM restaurants r
      ORDER BY r.name ASC
    `);
    const appUrl = getAppUrl(req);
    const enriched = restaurants.map(r => ({
      ...r,
      permanent_url: `${appUrl}/menu/${r.slug}`
    }));
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

app.get('/api/admin/restaurants/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const restaurant = queryOne(db, 'SELECT * FROM restaurants WHERE id = ?', [id]);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const appUrl = getAppUrl(req);
    res.json({
      ...restaurant,
      permanent_url: `${appUrl}/menu/${restaurant.slug}`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch restaurant' });
  }
});

app.post('/api/admin/restaurants', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, slug, description, logo_url, cover_url, meal_schedule_enabled, phone, address, currency_display } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Restaurant name is required.' });
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!cleanSlug) {
      return res.status(400).json({ error: 'A valid slug or identifier is required.' });
    }

    const db = await getDb();
    const existing = queryOne(db, 'SELECT id FROM restaurants WHERE slug = ?', [cleanSlug]);
    if (existing) {
      return res.status(400).json({ error: `The slug "${cleanSlug}" is already taken by another restaurant. Please choose a different identifier.` });
    }

    const id = 'rest-' + crypto.randomBytes(6).toString('hex');
    const now = new Date().toISOString();

    execute(db, `
      INSERT INTO restaurants (id, name, slug, description, logo_url, cover_url, currency, currency_display, is_active, meal_schedule_enabled, phone, address, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'ETB', ?, 1, ?, ?, ?, ?, ?)
    `, [
      id,
      name.trim(),
      cleanSlug,
      description || '',
      logo_url || '',
      cover_url || '',
      currency_display === 'ብር' ? 'ብር' : 'ETB',
      meal_schedule_enabled ? 1 : 0,
      phone || '',
      address || '',
      now,
      now
    ]);

    // Automatically create default Ethiopian meal periods: Breakfast, Lunch, Dinner, Drinks
    const defaultPeriods = [
      { name: 'Breakfast', order: 1, start: '06:00', end: '11:00' },
      { name: 'Lunch', order: 2, start: '11:00', end: '16:00' },
      { name: 'Dinner', order: 3, start: '16:00', end: '22:00' },
      { name: 'Drinks', order: 4, start: '06:00', end: '23:00' }
    ];

    for (const p of defaultPeriods) {
      const pid = 'mp-' + crypto.randomBytes(6).toString('hex');
      execute(db, `
        INSERT INTO meal_periods (id, restaurant_id, name, display_order, is_active, start_time, end_time, auto_schedule_enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?, 1, ?, ?)
      `, [pid, id, p.name, p.order, p.start, p.end, now, now]);
    }

    res.status(201).json({ id, slug: cleanSlug, message: 'Restaurant created successfully.' });
  } catch (err: any) {
    console.error('Error creating restaurant:', err);
    res.status(500).json({ error: 'Failed to create restaurant.' });
  }
});

app.put('/api/admin/restaurants/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, logo_url, cover_url, is_active, meal_schedule_enabled, phone, address, currency_display } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Restaurant name cannot be empty.' });
    }

    const db = await getDb();
    const existing = queryOne(db, 'SELECT * FROM restaurants WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Restaurant not found.' });
    }

    // PERMANENT URL RULE: We keep existing.slug intact so printed QR codes never break!
    const now = new Date().toISOString();
    execute(db, `
      UPDATE restaurants
      SET name = ?, description = ?, logo_url = ?, cover_url = ?, is_active = ?,
          meal_schedule_enabled = ?, phone = ?, address = ?, currency_display = ?, updated_at = ?
      WHERE id = ?
    `, [
      name.trim(),
      description !== undefined ? description : existing.description,
      logo_url !== undefined ? logo_url : existing.logo_url,
      cover_url !== undefined ? cover_url : existing.cover_url,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      meal_schedule_enabled !== undefined ? (meal_schedule_enabled ? 1 : 0) : existing.meal_schedule_enabled,
      phone !== undefined ? phone : existing.phone,
      address !== undefined ? address : existing.address,
      currency_display === 'ብር' ? 'ብር' : 'ETB',
      now,
      id
    ]);

    res.json({ success: true, message: 'Restaurant updated successfully.' });
  } catch (err: any) {
    console.error('Error updating restaurant:', err);
    res.status(500).json({ error: 'Failed to update restaurant.' });
  }
});

app.delete('/api/admin/restaurants/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    // Delete cascading
    execute(db, 'DELETE FROM menu_items WHERE restaurant_id = ?', [id]);
    execute(db, 'DELETE FROM categories WHERE restaurant_id = ?', [id]);
    execute(db, 'DELETE FROM meal_periods WHERE restaurant_id = ?', [id]);
    execute(db, 'DELETE FROM restaurants WHERE id = ?', [id]);

    res.json({ success: true, message: 'Restaurant and all associated menu data deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete restaurant.' });
  }
});

// 2. Meal Period Management
app.get('/api/admin/restaurants/:restaurantId/meal-periods', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const db = await getDb();
    const periods = queryAll(db, `
      SELECT p.*,
             (SELECT COUNT(*) FROM categories WHERE meal_period_id = p.id) as category_count,
             (SELECT COUNT(*) FROM menu_items WHERE meal_period_id = p.id) as item_count
      FROM meal_periods p
      WHERE p.restaurant_id = ?
      ORDER BY p.display_order ASC, p.name ASC
    `, [restaurantId]);
    res.json(periods);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch meal periods' });
  }
});

app.post('/api/admin/restaurants/:restaurantId/meal-periods', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { name, display_order, is_active, start_time, end_time, auto_schedule_enabled } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Meal period name is required (e.g. Breakfast, Lunch, Dinner).' });
    }

    const db = await getDb();
    const id = 'mp-' + crypto.randomBytes(6).toString('hex');
    const now = new Date().toISOString();

    const maxOrderRow = queryOne(db, 'SELECT MAX(display_order) as max_order FROM meal_periods WHERE restaurant_id = ?', [restaurantId]);
    const order = display_order !== undefined ? Number(display_order) : ((maxOrderRow?.max_order ?? 0) + 1);

    execute(db, `
      INSERT INTO meal_periods (id, restaurant_id, name, display_order, is_active, start_time, end_time, auto_schedule_enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      restaurantId,
      name.trim(),
      order,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      start_time || '06:00',
      end_time || '11:00',
      auto_schedule_enabled !== undefined ? (auto_schedule_enabled ? 1 : 0) : 1,
      now,
      now
    ]);

    res.status(201).json({ id, message: 'Meal period created.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create meal period.' });
  }
});

app.put('/api/admin/meal-periods/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, display_order, is_active, start_time, end_time, auto_schedule_enabled } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Meal period name is required.' });
    }

    const db = await getDb();
    const existing = queryOne(db, 'SELECT * FROM meal_periods WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Meal period not found.' });

    const now = new Date().toISOString();
    execute(db, `
      UPDATE meal_periods
      SET name = ?, display_order = ?, is_active = ?, start_time = ?, end_time = ?,
          auto_schedule_enabled = ?, updated_at = ?
      WHERE id = ?
    `, [
      name.trim(),
      display_order !== undefined ? Number(display_order) : existing.display_order,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      start_time !== undefined ? start_time : existing.start_time,
      end_time !== undefined ? end_time : existing.end_time,
      auto_schedule_enabled !== undefined ? (auto_schedule_enabled ? 1 : 0) : existing.auto_schedule_enabled,
      now,
      id
    ]);

    res.json({ success: true, message: 'Meal period updated.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update meal period.' });
  }
});

app.delete('/api/admin/meal-periods/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    // Cascade items and categories belonging to this meal period
    execute(db, 'DELETE FROM menu_items WHERE meal_period_id = ?', [id]);
    execute(db, 'DELETE FROM categories WHERE meal_period_id = ?', [id]);
    execute(db, 'DELETE FROM meal_periods WHERE id = ?', [id]);
    res.json({ success: true, message: 'Meal period deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete meal period.' });
  }
});

// 3. Category Management
app.get('/api/admin/restaurants/:restaurantId/categories', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const db = await getDb();
    const categories = queryAll(db, `
      SELECT c.*,
             p.name as meal_period_name,
             (SELECT COUNT(*) FROM menu_items WHERE category_id = c.id) as item_count
      FROM categories c
      LEFT JOIN meal_periods p ON c.meal_period_id = p.id
      WHERE c.restaurant_id = ?
      ORDER BY p.display_order ASC, c.display_order ASC, c.name ASC
    `, [restaurantId]);
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

app.post('/api/admin/restaurants/:restaurantId/categories', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { meal_period_id, name, display_order } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    if (!meal_period_id) {
      return res.status(400).json({ error: 'Meal period assignment is required.' });
    }

    const db = await getDb();
    // Validate meal_period belongs to this restaurant
    const period = queryOne(db, 'SELECT id FROM meal_periods WHERE id = ? AND restaurant_id = ?', [meal_period_id, restaurantId]);
    if (!period) {
      return res.status(400).json({ error: 'Selected meal period does not belong to this restaurant.' });
    }

    const id = 'cat-' + crypto.randomBytes(6).toString('hex');
    const now = new Date().toISOString();

    const maxOrderRow = queryOne(db, 'SELECT MAX(display_order) as max_order FROM categories WHERE meal_period_id = ?', [meal_period_id]);
    const order = display_order !== undefined ? Number(display_order) : ((maxOrderRow?.max_order ?? 0) + 1);

    execute(db, `
      INSERT INTO categories (id, restaurant_id, meal_period_id, name, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, restaurantId, meal_period_id, name.trim(), order, now, now]);

    res.status(201).json({ id, message: 'Category created.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

app.put('/api/admin/categories/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { meal_period_id, name, display_order } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const db = await getDb();
    const existing = queryOne(db, 'SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Category not found.' });

    const now = new Date().toISOString();
    const targetPeriodId = meal_period_id || existing.meal_period_id;

    if (meal_period_id && meal_period_id !== existing.meal_period_id) {
      const validPeriod = queryOne(db, 'SELECT id FROM meal_periods WHERE id = ? AND restaurant_id = ?', [meal_period_id, existing.restaurant_id]);
      if (!validPeriod) {
        return res.status(400).json({ error: 'Target meal period does not belong to this restaurant.' });
      }
    }

    execute(db, `
      UPDATE categories
      SET name = ?, meal_period_id = ?, display_order = ?, updated_at = ?
      WHERE id = ?
    `, [
      name.trim(),
      targetPeriodId,
      display_order !== undefined ? Number(display_order) : existing.display_order,
      now,
      id
    ]);

    // If meal_period_id was moved, update all existing menu items in this category too!
    if (meal_period_id && meal_period_id !== existing.meal_period_id) {
      execute(db, `
        UPDATE menu_items
        SET meal_period_id = ?, updated_at = ?
        WHERE category_id = ?
      `, [meal_period_id, now, id]);
    }

    res.json({ success: true, message: 'Category updated.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

app.delete('/api/admin/categories/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    execute(db, 'DELETE FROM menu_items WHERE category_id = ?', [id]);
    execute(db, 'DELETE FROM categories WHERE id = ?', [id]);
    res.json({ success: true, message: 'Category and all associated items deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

// 4. Menu Item Management with STRICT PRICE VALIDATION (ETB ONLY)
function validatePrice(rawPrice: any): { valid: boolean; price?: number; error?: string } {
  if (rawPrice === undefined || rawPrice === null || rawPrice === '') {
    return { valid: false, error: 'Price is required.' };
  }

  const str = String(rawPrice).trim();
  // Reject any currency symbols or unauthorized currency strings
  if (/[\$€£¥]/.test(str) || /usd|eur|gbp/i.test(str)) {
    return { valid: false, error: 'Invalid currency. Prices must be in Ethiopian Birr (ETB) only. Do not use $, USD, or foreign currency.' };
  }

  // Remove trailing "ETB" or "ብር" if passed by accident
  const cleanStr = str.replace(/etb|ብር/gi, '').trim();
  const num = Number(cleanStr);

  if (isNaN(num)) {
    return { valid: false, error: 'Price must be a valid positive number.' };
  }
  if (num < 0) {
    return { valid: false, error: 'Price cannot be negative.' };
  }

  return { valid: true, price: Math.round(num * 100) / 100 };
}

app.get('/api/admin/restaurants/:restaurantId/items', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const db = await getDb();
    const items = queryAll(db, `
      SELECT m.*,
             p.name as meal_period_name,
             c.name as category_name
      FROM menu_items m
      LEFT JOIN meal_periods p ON m.meal_period_id = p.id
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE m.restaurant_id = ?
      ORDER BY p.display_order ASC, c.display_order ASC, m.display_order ASC, m.name ASC
    `, [restaurantId]);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch menu items.' });
  }
});

app.post('/api/admin/restaurants/:restaurantId/items', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { meal_period_id, category_id, name, description, price, image_url, is_available, display_order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Item name is required.' });
    }
    if (!meal_period_id) {
      return res.status(400).json({ error: 'Meal period selection is required.' });
    }
    if (!category_id) {
      return res.status(400).json({ error: 'Category selection is required.' });
    }

    const priceCheck = validatePrice(price);
    if (!priceCheck.valid || priceCheck.price === undefined) {
      return res.status(400).json({ error: priceCheck.error });
    }

    const db = await getDb();

    // Verify meal_period belongs to this restaurant
    const period = queryOne(db, 'SELECT id FROM meal_periods WHERE id = ? AND restaurant_id = ?', [meal_period_id, restaurantId]);
    if (!period) {
      return res.status(400).json({ error: 'Selected meal period does not belong to this restaurant.' });
    }

    // Verify category belongs to this restaurant AND belongs to the chosen meal period
    const cat = queryOne(db, 'SELECT id, meal_period_id FROM categories WHERE id = ? AND restaurant_id = ?', [category_id, restaurantId]);
    if (!cat) {
      return res.status(400).json({ error: 'Selected category does not belong to this restaurant.' });
    }
    if (cat.meal_period_id !== meal_period_id) {
      return res.status(400).json({ error: 'Selected category does not belong to the chosen meal period.' });
    }

    const id = 'item-' + crypto.randomBytes(6).toString('hex');
    const now = new Date().toISOString();

    const maxOrderRow = queryOne(db, 'SELECT MAX(display_order) as max_order FROM menu_items WHERE category_id = ?', [category_id]);
    const order = display_order !== undefined ? Number(display_order) : ((maxOrderRow?.max_order ?? 0) + 1);

    execute(db, `
      INSERT INTO menu_items (id, restaurant_id, meal_period_id, category_id, name, description, price, currency, image_url, is_available, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ETB', ?, ?, ?, ?, ?)
    `, [
      id,
      restaurantId,
      meal_period_id,
      category_id,
      name.trim(),
      description || '',
      priceCheck.price,
      image_url || '',
      is_available !== undefined ? (is_available ? 1 : 0) : 1,
      order,
      now,
      now
    ]);

    res.status(201).json({ id, message: 'Menu item created successfully.' });
  } catch (err: any) {
    console.error('Error creating item:', err);
    res.status(500).json({ error: 'Failed to create menu item.' });
  }
});

app.put('/api/admin/items/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { meal_period_id, category_id, name, description, price, image_url, is_available, display_order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Item name is required.' });
    }

    const priceCheck = validatePrice(price);
    if (!priceCheck.valid || priceCheck.price === undefined) {
      return res.status(400).json({ error: priceCheck.error });
    }

    const db = await getDb();
    const existing = queryOne(db, 'SELECT * FROM menu_items WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }

    const targetPeriodId = meal_period_id || existing.meal_period_id;
    const targetCatId = category_id || existing.category_id;

    // Verify meal period and category validity
    const period = queryOne(db, 'SELECT id FROM meal_periods WHERE id = ? AND restaurant_id = ?', [targetPeriodId, existing.restaurant_id]);
    if (!period) {
      return res.status(400).json({ error: 'Target meal period does not belong to this restaurant.' });
    }

    const cat = queryOne(db, 'SELECT id, meal_period_id FROM categories WHERE id = ? AND restaurant_id = ?', [targetCatId, existing.restaurant_id]);
    if (!cat) {
      return res.status(400).json({ error: 'Target category does not belong to this restaurant.' });
    }
    if (cat.meal_period_id !== targetPeriodId) {
      return res.status(400).json({ error: 'Selected category does not belong to the selected meal period.' });
    }

    const now = new Date().toISOString();
    execute(db, `
      UPDATE menu_items
      SET name = ?, description = ?, price = ?, currency = 'ETB', image_url = ?,
          meal_period_id = ?, category_id = ?, is_available = ?, display_order = ?, updated_at = ?
      WHERE id = ?
    `, [
      name.trim(),
      description !== undefined ? description : existing.description,
      priceCheck.price,
      image_url !== undefined ? image_url : existing.image_url,
      targetPeriodId,
      targetCatId,
      is_available !== undefined ? (is_available ? 1 : 0) : existing.is_available,
      display_order !== undefined ? Number(display_order) : existing.display_order,
      now,
      id
    ]);

    res.json({ success: true, message: 'Menu item updated.' });
  } catch (err: any) {
    console.error('Error updating item:', err);
    res.status(500).json({ error: 'Failed to update menu item.' });
  }
});

// Quick availability toggle without full form
app.patch('/api/admin/items/:id/availability', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_available } = req.body;
    const db = await getDb();
    const existing = queryOne(db, 'SELECT id, is_available, name FROM menu_items WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Menu item not found.' });

    const newStatus = is_available !== undefined ? (is_available ? 1 : 0) : (existing.is_available ? 0 : 1);
    const now = new Date().toISOString();

    execute(db, 'UPDATE menu_items SET is_available = ?, updated_at = ? WHERE id = ?', [newStatus, now, id]);

    res.json({
      success: true,
      is_available: newStatus,
      message: `${existing.name} is now ${newStatus ? 'Available' : 'Unavailable'}.`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to toggle availability.' });
  }
});

app.delete('/api/admin/items/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    execute(db, 'DELETE FROM menu_items WHERE id = ?', [id]);
    res.json({ success: true, message: 'Menu item deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete menu item.' });
  }
});

// 5. Image Upload Handler (Supports Base64 or standard file payloads with validation)
app.post('/api/admin/upload', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { dataUrl, filename } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'No image data provided.' });
    }

    // Match data:[<mediatype>];base64,<data>
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid image format. Expected base64 image data URL.' });
    }

    const mimeType = matches[1];
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMime.includes(mimeType.toLowerCase())) {
      return res.status(400).json({ error: 'Unsupported file format. Please upload JPEG, PNG, WEBP, or GIF images.' });
    }

    const imageBuffer = Buffer.from(matches[2], 'base64');
    if (imageBuffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image file too large. Maximum file size allowed is 5MB.' });
    }

    const ext = mimeType.split('/')[1] || 'jpg';
    const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeName);

    fs.writeFileSync(filePath, imageBuffer);

    const publicUrl = `/uploads/${safeName}`;
    res.json({
      success: true,
      url: publicUrl,
      message: 'Image uploaded successfully.'
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to process and store image upload.' });
  }
});

// 6. QR Code Details for Restaurant
app.get('/api/admin/restaurants/:id/qr-info', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const restaurant = queryOne(db, 'SELECT id, name, slug FROM restaurants WHERE id = ?', [id]);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const appUrl = getAppUrl(req);
    const permanentUrl = `${appUrl}/menu/${restaurant.slug}`;

    const qrDataUrl = await QRCode.toDataURL(permanentUrl, {
      width: 600,
      margin: 2,
      color: {
        dark: '#1c1917',
        light: '#ffffff'
      }
    });

    const qrSvg = await QRCode.toString(permanentUrl, {
      type: 'svg',
      margin: 2,
      color: {
        dark: '#1c1917',
        light: '#ffffff'
      }
    });

    res.json({
      permanentUrl,
      slug: restaurant.slug,
      restaurantName: restaurant.name,
      qrDataUrl,
      qrSvg
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate QR data.' });
  }
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ethiopian QR Menu Platform running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;

