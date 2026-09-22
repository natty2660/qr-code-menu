import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Clock,
  Layers,
  ShoppingBag,
  QrCode,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ExternalLink,
  Upload,
  ArrowRight,
  Store,
  Calendar,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Restaurant, MealPeriod, Category, MenuItem } from '../types.ts';
import { formatPrice, formatTimeRange, FALLBACK_FOOD_IMAGE } from '../utils.ts';
import QRStudio from './QRStudio.tsx';

interface AdminDashboardProps {
  onLogout: () => void;
  token: string;
  onOpenPublicMenu: (slug: string) => void;
}

type TabType = 'overview' | 'restaurant' | 'meal-periods' | 'categories' | 'items' | 'qr';

export default function AdminDashboard({ onLogout, token, onOpenPublicMenu }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // State
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  const [mealPeriods, setMealPeriods] = useState<MealPeriod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals & forms state
  const [isEditingRestaurant, setIsEditingRestaurant] = useState(false);
  const [restaurantForm, setRestaurantForm] = useState<Partial<Restaurant>>({});

  const [isMealPeriodModalOpen, setIsMealPeriodModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<MealPeriod | null>(null);
  const [periodForm, setPeriodForm] = useState({
    name: '',
    start_time: '06:00',
    end_time: '11:00',
    is_active: 1,
    auto_schedule_enabled: 1
  });

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    meal_period_id: ''
  });

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    meal_period_id: '',
    category_id: '',
    image_url: '',
    is_available: 1
  });

  // Filters for items tab
  const [filterPeriodId, setFilterPeriodId] = useState<string>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [searchItemQuery, setSearchItemQuery] = useState('');

  // Upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  // 1. Load initial restaurants
  useEffect(() => {
    loadRestaurants();
  }, []);

  async function loadRestaurants() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/restaurants', { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to load restaurants');
      const data: Restaurant[] = await res.json();
      setRestaurants(data);
      if (data.length > 0) {
        // Select first restaurant or preserve existing selected
        setSelectedRestaurant(prev => (prev ? data.find(r => r.id === prev.id) || data[0] : data[0]));
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Could not load restaurants.');
    } finally {
      setLoading(false);
    }
  }

  // 2. Load restaurant details (periods, categories, items) whenever selectedRestaurant changes
  useEffect(() => {
    if (!selectedRestaurant) return;
    loadRestaurantData(selectedRestaurant.id);
  }, [selectedRestaurant?.id]);

  async function loadRestaurantData(restaurantId: string) {
    try {
      const [periodsRes, catsRes, itemsRes] = await Promise.all([
        fetch(`/api/admin/restaurants/${restaurantId}/meal-periods`, { headers: authHeaders }),
        fetch(`/api/admin/restaurants/${restaurantId}/categories`, { headers: authHeaders }),
        fetch(`/api/admin/restaurants/${restaurantId}/items`, { headers: authHeaders })
      ]);

      if (periodsRes.ok) setMealPeriods(await periodsRes.json());
      if (catsRes.ok) setCategories(await catsRes.json());
      if (itemsRes.ok) setItems(await itemsRes.json());
    } catch (err) {
      console.error('Failed to load restaurant details:', err);
    }
  }

  // Handle Restaurant Settings Update
  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;

    try {
      const res = await fetch(`/api/admin/restaurants/${selectedRestaurant.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(restaurantForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update restaurant');

      showToast('Restaurant profile updated successfully!');
      setIsEditingRestaurant(false);
      loadRestaurants();
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Handle Meal Period Save
  const handleSaveMealPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;
    if (!periodForm.name.trim()) return showError('Meal period name is required.');

    try {
      const url = editingPeriod
        ? `/api/admin/meal-periods/${editingPeriod.id}`
        : `/api/admin/restaurants/${selectedRestaurant.id}/meal-periods`;
      const method = editingPeriod ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(periodForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save meal period');

      showToast(editingPeriod ? 'Meal period updated!' : 'Meal period created!');
      setIsMealPeriodModalOpen(false);
      setEditingPeriod(null);
      loadRestaurantData(selectedRestaurant.id);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleDeleteMealPeriod = (id: string, name: string) => {
    setDeleteConfirm({
      title: `Delete Meal Period "${name}"?`,
      message: `All categories and items under this meal period will also be permanently deleted. This cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/meal-periods/${id}`, {
            method: 'DELETE',
            headers: authHeaders
          });
          if (!res.ok) throw new Error('Failed to delete meal period');
          showToast(`Meal period "${name}" deleted.`);
          if (selectedRestaurant) loadRestaurantData(selectedRestaurant.id);
        } catch (err: any) {
          showError(err.message);
        }
      }
    });
  };

  // Handle Category Save
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;
    if (!categoryForm.name.trim()) return showError('Category name is required.');
    if (!categoryForm.meal_period_id) return showError('Please assign a meal period.');

    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : `/api/admin/restaurants/${selectedRestaurant.id}/categories`;
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(categoryForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save category');

      showToast(editingCategory ? 'Category updated!' : 'Category created!');
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      loadRestaurantData(selectedRestaurant.id);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleDeleteCategory = (id: string, name: string) => {
    setDeleteConfirm({
      title: `Delete Category "${name}"?`,
      message: `All menu items under this category will also be deleted.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/categories/${id}`, {
            method: 'DELETE',
            headers: authHeaders
          });
          if (!res.ok) throw new Error('Failed to delete category');
          showToast(`Category "${name}" deleted.`);
          if (selectedRestaurant) loadRestaurantData(selectedRestaurant.id);
        } catch (err: any) {
          showError(err.message);
        }
      }
    });
  };

  // Handle Menu Item Save (STRICT PRICE VALIDATION ETB ONLY)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;
    if (!itemForm.name.trim()) return showError('Item name is required.');
    if (!itemForm.meal_period_id) return showError('Meal period is required.');
    if (!itemForm.category_id) return showError('Category is required.');

    // Price validation
    const rawPrice = itemForm.price.trim();
    if (/[\$€£¥]/.test(rawPrice) || /usd|eur|gbp/i.test(rawPrice)) {
      return showError('Invalid currency. Please use Ethiopian Birr (ETB) only. Do not use $, USD, or foreign currency.');
    }
    const cleanNum = Number(rawPrice.replace(/etb|ብር/gi, '').trim());
    if (isNaN(cleanNum) || cleanNum < 0) {
      return showError('Price must be a valid positive number in Ethiopian Birr (ETB).');
    }

    try {
      const url = editingItem
        ? `/api/admin/items/${editingItem.id}`
        : `/api/admin/restaurants/${selectedRestaurant.id}/items`;
      const method = editingItem ? 'PUT' : 'POST';

      const payload = {
        ...itemForm,
        price: cleanNum
      };

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save menu item');

      showToast(editingItem ? 'Menu item updated!' : 'Menu item created!');
      setIsItemModalOpen(false);
      setEditingItem(null);
      loadRestaurantData(selectedRestaurant.id);
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Toggle Availability
  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const newStatus = item.is_available ? 0 : 1;
      const res = await fetch(`/api/admin/items/${item.id}/availability`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ is_available: newStatus })
      });
      if (!res.ok) throw new Error('Failed to toggle availability');

      // Update state locally immediately
      setItems(prev => prev.map(i => (i.id === item.id ? { ...i, is_available: newStatus } : i)));
      showToast(`${item.name} marked as ${newStatus ? 'Available' : 'Unavailable'}.`);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleDeleteItem = (id: string, name: string) => {
    setDeleteConfirm({
      title: `Delete Dish "${name}"?`,
      message: `Are you sure you want to remove this dish from the menu?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/items/${id}`, {
            method: 'DELETE',
            headers: authHeaders
          });
          if (!res.ok) throw new Error('Failed to delete item');
          showToast(`Item "${name}" removed.`);
          if (selectedRestaurant) loadRestaurantData(selectedRestaurant.id);
        } catch (err: any) {
          showError(err.message);
        }
      }
    });
  };

  // Image File Upload Helper
  const handleImageFileUpload = async (file: File, target: 'item' | 'logo' | 'cover') => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      return showError('File size too large. Maximum file size allowed is 5MB.');
    }

    try {
      setUploadingImage(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ dataUrl, filename: file.name })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Upload failed');

        if (target === 'item') {
          setItemForm(prev => ({ ...prev, image_url: json.url }));
        } else if (target === 'logo') {
          setRestaurantForm(prev => ({ ...prev, logo_url: json.url }));
        } else if (target === 'cover') {
          setRestaurantForm(prev => ({ ...prev, cover_url: json.url }));
        }
        showToast('Image uploaded successfully!');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showError(err.message);
      setUploadingImage(false);
    }
  };

  // Filtered Items for List view
  const displayItems = items.filter(item => {
    if (filterPeriodId !== 'all' && item.meal_period_id !== filterPeriodId) return false;
    if (filterCategoryId !== 'all' && item.category_id !== filterCategoryId) return false;
    if (searchItemQuery.trim()) {
      const q = searchItemQuery.toLowerCase();
      if (!item.name.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-stone-200">
        <RefreshCw className="w-10 h-10 animate-spin text-amber-500 mb-3" />
        <p className="text-sm font-medium">Loading Ethiopian Restaurant Dashboard...</p>
      </div>
    );
  }

  return (
    <div id="admin-dashboard-container" className="min-h-screen bg-[#100e0c] text-stone-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-stone-950/95 backdrop-blur-md border-b border-stone-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                {selectedRestaurant?.name || 'Ethiopian Restaurant Admin'}
              </h1>
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-wider">
                Manager Portal
              </span>
            </div>
            <p className="text-stone-300 text-xs hidden sm:block">
              Permanent QR Digital Menu • Currency: <strong className="text-amber-400">{selectedRestaurant?.currency_display || 'ETB'}</strong>
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          {selectedRestaurant && (
            <button
              id="header-view-menu-btn"
              onClick={() => onOpenPublicMenu(selectedRestaurant.slug)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              title="Open customer digital menu"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">View Live Menu</span>
            </button>
          )}

          <button
            id="admin-logout-btn"
            onClick={onLogout}
            className="p-2 text-stone-400 hover:text-rose-400 hover:bg-stone-900 rounded-lg transition"
            title="Log out of manager session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-60 shrink-0">
          <nav className="bg-stone-900/80 border border-stone-800 rounded-2xl p-2.5 space-y-1 shadow-lg">
            <button
              id="admin-tab-overview"
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition ${
                activeTab === 'overview'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              id="admin-tab-restaurant"
              onClick={() => {
                setActiveTab('restaurant');
                if (selectedRestaurant) {
                  setRestaurantForm({
                    name: selectedRestaurant.name,
                    description: selectedRestaurant.description,
                    logo_url: selectedRestaurant.logo_url,
                    cover_url: selectedRestaurant.cover_url,
                    is_active: selectedRestaurant.is_active,
                    meal_schedule_enabled: selectedRestaurant.meal_schedule_enabled,
                    phone: selectedRestaurant.phone,
                    address: selectedRestaurant.address,
                    currency_display: selectedRestaurant.currency_display || 'ETB'
                  });
                }
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition ${
                activeTab === 'restaurant'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Restaurant Profile</span>
            </button>

            <button
              id="admin-tab-meal-periods"
              onClick={() => setActiveTab('meal-periods')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition ${
                activeTab === 'meal-periods'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Clock className="w-4 h-4" />
                <span>Meal Times</span>
              </span>
              <span className="text-xs bg-stone-950/60 px-2 py-0.5 rounded-full font-mono">
                {mealPeriods.length}
              </span>
            </button>

            <button
              id="admin-tab-categories"
              onClick={() => setActiveTab('categories')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition ${
                activeTab === 'categories'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>Categories</span>
              </span>
              <span className="text-xs bg-stone-950/60 px-2 py-0.5 rounded-full font-mono">
                {categories.length}
              </span>
            </button>

            <button
              id="admin-tab-items"
              onClick={() => setActiveTab('items')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition ${
                activeTab === 'items'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4" />
                <span>Menu Items</span>
              </span>
              <span className="text-xs bg-stone-950/60 px-2 py-0.5 rounded-full font-mono">
                {items.length}
              </span>
            </button>

            <button
              id="admin-tab-qr"
              onClick={() => setActiveTab('qr')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition ${
                activeTab === 'qr'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>Permanent QR</span>
            </button>
          </nav>

          {/* Quick Permanent Link Widget */}
          {selectedRestaurant && (
            <div className="mt-4 p-4 bg-stone-900/60 border border-stone-800/80 rounded-2xl text-xs text-stone-400 space-y-2">
              <div className="font-bold text-stone-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Permanent Menu Link</span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Scan once, updates live forever.
              </p>
              <a
                href={`/menu/${selectedRestaurant.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 font-mono break-all hover:underline block text-[11px]"
              >
                /menu/{selectedRestaurant.slug}
              </a>
            </div>
          )}
        </aside>

        {/* Content Pane */}
        <main className="flex-1 min-w-0">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && selectedRestaurant && (
            <div className="space-y-6">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4">
                  <span className="text-xs font-bold text-stone-300 uppercase tracking-wider block mb-1">
                    Meal Times
                  </span>
                  <span className="text-3xl font-black text-amber-400 font-mono">
                    {mealPeriods.length}
                  </span>
                  <span className="text-[11px] text-stone-400 block mt-1">
                    Breakfast, Lunch, Dinner...
                  </span>
                </div>

                <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4">
                  <span className="text-xs font-bold text-stone-300 uppercase tracking-wider block mb-1">
                    Categories
                  </span>
                  <span className="text-3xl font-black text-amber-400 font-mono">
                    {categories.length}
                  </span>
                  <span className="text-[11px] text-stone-400 block mt-1">
                    Wot, Tibs, Drinks...
                  </span>
                </div>

                <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4">
                  <span className="text-xs font-bold text-stone-300 uppercase tracking-wider block mb-1">
                    Total Dishes
                  </span>
                  <span className="text-3xl font-black text-white font-mono">
                    {items.length}
                  </span>
                  <span className="text-[11px] text-emerald-400 block mt-1">
                    {items.filter(i => i.is_available).length} available today
                  </span>
                </div>

                <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4">
                  <span className="text-xs font-bold text-stone-300 uppercase tracking-wider block mb-1">
                    Currency
                  </span>
                  <span className="text-2xl font-black text-amber-400">
                    {selectedRestaurant.currency_display || 'ETB'}
                  </span>
                  <span className="text-[11px] text-stone-400 block mt-1">
                    Ethiopian Birr Only
                  </span>
                </div>
              </div>

              {/* QR Spotlight Card */}
              <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/20 border border-amber-900/40 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
                <div className="space-y-2 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Permanent QR Active</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    Ready for Customer Tables
                  </h3>
                  <p className="text-stone-300 text-sm max-w-md leading-relaxed">
                    Download your permanent QR code or print table stands. Food prices and availability update instantly without changing the QR code.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                  <button
                    id="overview-open-qr-studio-btn"
                    onClick={() => setActiveTab('qr')}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Open QR Studio</span>
                  </button>
                  <button
                    id="overview-open-live-menu-btn"
                    onClick={() => onOpenPublicMenu(selectedRestaurant.slug)}
                    className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-bold rounded-xl text-sm transition flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4 text-amber-400" />
                    <span>Customer View</span>
                  </button>
                </div>
              </div>

              {/* Meal Periods Summary Table */}
              <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Configured Meal Times</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('meal-periods')}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    Manage Times →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {mealPeriods.map(p => (
                    <div
                      key={p.id}
                      className="bg-stone-950/70 border border-stone-800/80 rounded-xl p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-200 text-sm">{p.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-500" />
                        <span>{formatTimeRange(p.start_time, p.end_time)}</span>
                      </p>
                      <div className="pt-1 text-[11px] text-stone-400 flex justify-between">
                        <span>{p.category_count || 0} categories</span>
                        <span>{p.item_count || 0} items</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RESTAURANT PROFILE SETTINGS */}
          {activeTab === 'restaurant' && selectedRestaurant && (
            <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-black text-white">Restaurant Profile & Settings</h2>
                <p className="text-stone-400 text-xs sm:text-sm mt-0.5">
                  Configure restaurant identity, currency format, and automated meal schedule behavior.
                </p>
              </div>

              <form onSubmit={handleSaveRestaurant} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                      Restaurant Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={restaurantForm.name || ''}
                      onChange={e => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                      Permanent URL Identifier (Slug)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={selectedRestaurant.slug}
                      className="w-full bg-stone-950/60 border border-stone-800 text-stone-400 rounded-xl px-3.5 py-2.5 text-sm font-mono cursor-not-allowed"
                    />
                    <span className="text-[11px] text-stone-300 mt-1 block">
                      Permanent identifier remains stable so printed QR codes never break.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                    Description / Welcome Note
                  </label>
                  <textarea
                    rows={3}
                    value={restaurantForm.description || ''}
                    onChange={e => setRestaurantForm({ ...restaurantForm, description: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={restaurantForm.phone || ''}
                      onChange={e => setRestaurantForm({ ...restaurantForm, phone: e.target.value })}
                      placeholder="+251 911 234567"
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                      Address / Location
                    </label>
                    <input
                      type="text"
                      value={restaurantForm.address || ''}
                      onChange={e => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
                      placeholder="Bole, Addis Ababa, Ethiopia"
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Logo and Cover URL / Upload */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                      Restaurant Logo
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-stone-950 border border-stone-700 overflow-hidden shrink-0">
                        <img
                          src={restaurantForm.logo_url || FALLBACK_FOOD_IMAGE}
                          alt="Logo Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="text"
                          value={restaurantForm.logo_url || ''}
                          onChange={e => setRestaurantForm({ ...restaurantForm, logo_url: e.target.value })}
                          placeholder="Image URL or upload"
                          className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                        <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg cursor-pointer transition border border-stone-700">
                          <Upload className="w-3.5 h-3.5 text-amber-400" />
                          <span>Upload File</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => e.target.files?.[0] && handleImageFileUpload(e.target.files[0], 'logo')}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                      Cover Banner Image
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-16 rounded-xl bg-stone-950 border border-stone-700 overflow-hidden shrink-0">
                        <img
                          src={restaurantForm.cover_url || FALLBACK_FOOD_IMAGE}
                          alt="Cover Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="text"
                          value={restaurantForm.cover_url || ''}
                          onChange={e => setRestaurantForm({ ...restaurantForm, cover_url: e.target.value })}
                          placeholder="Cover URL or upload"
                          className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                        <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg cursor-pointer transition border border-stone-700">
                          <Upload className="w-3.5 h-3.5 text-amber-400" />
                          <span>Upload File</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => e.target.files?.[0] && handleImageFileUpload(e.target.files[0], 'cover')}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Currency Display & Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-stone-800">
                  <div>
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                      Currency Display
                    </label>
                    <select
                      value={restaurantForm.currency_display || 'ETB'}
                      onChange={e => setRestaurantForm({ ...restaurantForm, currency_display: e.target.value as 'ETB' | 'ብር' })}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="ETB">ETB (Ethiopian Birr - Latin)</option>
                      <option value="ብር">ብር (Ethiopian Birr - Amharic)</option>
                    </select>
                    <span className="text-[11px] text-amber-400/80 block mt-1">
                      Strictly Ethiopian Birr. Foreign currencies disabled.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                      Restaurant Active
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer mt-2">
                      <input
                        type="checkbox"
                        checked={Boolean(restaurantForm.is_active)}
                        onChange={e => setRestaurantForm({ ...restaurantForm, is_active: e.target.checked ? 1 : 0 })}
                        className="w-4 h-4 accent-amber-500 rounded"
                      />
                      <span className="text-sm font-medium text-stone-200">
                        {restaurantForm.is_active ? 'Active (Publicly Visible)' : 'Inactive (Hidden)'}
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                      Auto-Schedule Meal Times
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer mt-2">
                      <input
                        type="checkbox"
                        checked={Boolean(restaurantForm.meal_schedule_enabled)}
                        onChange={e => setRestaurantForm({ ...restaurantForm, meal_schedule_enabled: e.target.checked ? 1 : 0 })}
                        className="w-4 h-4 accent-amber-500 rounded"
                      />
                      <span className="text-sm font-medium text-stone-200">
                        {restaurantForm.meal_schedule_enabled ? 'Auto-highlight active time' : 'Manual selector only'}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-amber-950/50"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: MEAL PERIODS */}
          {activeTab === 'meal-periods' && selectedRestaurant && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white">Meal Times Management</h2>
                  <p className="text-stone-300 text-xs sm:text-sm mt-0.5">
                    Define Breakfast, Lunch, Dinner, and special periods for your Ethiopian menu.
                  </p>
                </div>
                <button
                  id="add-meal-period-btn"
                  onClick={() => {
                    setEditingPeriod(null);
                    setPeriodForm({
                      name: '',
                      start_time: '06:00',
                      end_time: '11:00',
                      is_active: 1,
                      auto_schedule_enabled: 1
                    });
                    setIsMealPeriodModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-amber-950/50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Meal Time</span>
                </button>
              </div>

              {/* Meal Periods List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mealPeriods.map(period => (
                  <div
                    key={period.id}
                    id={`meal-period-card-${period.id}`}
                    className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{period.name}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            period.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {period.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-xs text-stone-300 mt-1 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{formatTimeRange(period.start_time, period.end_time)}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingPeriod(period);
                            setPeriodForm({
                              name: period.name,
                              start_time: period.start_time || '06:00',
                              end_time: period.end_time || '11:00',
                              is_active: period.is_active ? 1 : 0,
                              auto_schedule_enabled: period.auto_schedule_enabled ? 1 : 0
                            });
                            setIsMealPeriodModalOpen(true);
                          }}
                          className="p-2 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded-lg transition"
                          title="Edit meal time"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMealPeriod(period.id, period.name)}
                          className="p-2 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition"
                          title="Delete meal time"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs text-stone-300">
                      <span>{period.category_count || 0} categories</span>
                      <span>{period.item_count || 0} menu items</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CATEGORIES */}
          {activeTab === 'categories' && selectedRestaurant && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white">Menu Categories</h2>
                  <p className="text-stone-300 text-xs sm:text-sm mt-0.5">
                    Organize your dishes into categories (e.g. Wot, Tibs, Vegetarian Platter, Hot Drinks).
                  </p>
                </div>
                <button
                  id="add-category-btn"
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryForm({
                      name: '',
                      meal_period_id: mealPeriods[0]?.id || ''
                    });
                    setIsCategoryModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-amber-950/50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
                </button>
              </div>

              {/* Categories Grouped by Meal Period */}
              <div className="space-y-6">
                {mealPeriods.map(period => {
                  const periodCategories = categories.filter(c => c.meal_period_id === period.id);

                  return (
                    <div key={period.id} className="bg-stone-900/70 border border-stone-800 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-800">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-amber-400 text-base">{period.name}</span>
                          <span className="text-xs text-stone-300">({periodCategories.length} categories)</span>
                        </div>
                      </div>

                      {periodCategories.length === 0 ? (
                        <p className="text-xs text-stone-400 italic py-2">No categories yet in {period.name}.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {periodCategories.map(cat => (
                            <div
                              key={cat.id}
                              id={`category-card-${cat.id}`}
                              className="bg-stone-950/80 border border-stone-800/80 rounded-xl p-3 flex items-center justify-between"
                            >
                              <div>
                                <h4 className="font-bold text-stone-200 text-sm">{cat.name}</h4>
                                <span className="text-[11px] text-stone-400">{cat.item_count || 0} items</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingCategory(cat);
                                    setCategoryForm({
                                      name: cat.name,
                                      meal_period_id: cat.meal_period_id
                                    });
                                    setIsCategoryModalOpen(true);
                                  }}
                                  className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded-lg transition"
                                  title="Edit category"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                  className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition"
                                  title="Delete category"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: MENU ITEMS */}
          {activeTab === 'items' && selectedRestaurant && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white">Menu Items</h2>
                  <p className="text-stone-300 text-xs sm:text-sm mt-0.5">
                    Add Ethiopian dishes, update prices in ETB, upload photos, and toggle availability.
                  </p>
                </div>
                <button
                  id="add-item-btn"
                  onClick={() => {
                    setEditingItem(null);
                    const defaultPeriod = mealPeriods[0]?.id || '';
                    const defaultCats = categories.filter(c => c.meal_period_id === defaultPeriod);
                    setItemForm({
                      name: '',
                      description: '',
                      price: '',
                      meal_period_id: defaultPeriod,
                      category_id: defaultCats[0]?.id || '',
                      image_url: '',
                      is_available: 1
                    });
                    setIsItemModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-amber-950/50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Menu Item</span>
                </button>
              </div>

              {/* Filters Bar */}
              <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                {/* Search */}
                <input
                  type="text"
                  placeholder="Filter items by name or description..."
                  value={searchItemQuery}
                  onChange={e => setSearchItemQuery(e.target.value)}
                  className="flex-1 bg-stone-950 border border-stone-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-amber-500"
                />

                {/* Period Filter */}
                <select
                  value={filterPeriodId}
                  onChange={e => {
                    setFilterPeriodId(e.target.value);
                    setFilterCategoryId('all');
                  }}
                  className="bg-stone-950 border border-stone-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-200"
                >
                  <option value="all">All Meal Times</option>
                  {mealPeriods.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                {/* Category Filter */}
                <select
                  value={filterCategoryId}
                  onChange={e => setFilterCategoryId(e.target.value)}
                  className="bg-stone-950 border border-stone-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-200"
                >
                  <option value="all">All Categories</option>
                  {categories
                    .filter(c => filterPeriodId === 'all' || c.meal_period_id === filterPeriodId)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>

              {/* Menu Items Table / Grid */}
              <div className="bg-stone-900/80 border border-stone-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-stone-950/80 text-[11px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-800">
                      <tr>
                        <th className="py-3 px-4">Item</th>
                        <th className="py-3 px-4">Meal Period / Category</th>
                        <th className="py-3 px-4">Price (ETB)</th>
                        <th className="py-3 px-4 text-center">Availability</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/60">
                      {displayItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-stone-500">
                            No menu items found matching the selected filters.
                          </td>
                        </tr>
                      ) : (
                        displayItems.map(item => (
                          <tr key={item.id} className="hover:bg-stone-850/50 transition">
                            {/* Item Photo & Name */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-stone-950 border border-stone-800 overflow-hidden shrink-0">
                                  <img
                                    src={item.image_url || FALLBACK_FOOD_IMAGE}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-white text-sm truncate">{item.name}</h4>
                                  <p className="text-xs text-stone-400 truncate max-w-xs">{item.description}</p>
                                </div>
                              </div>
                            </td>

                            {/* Period & Category */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="text-xs text-amber-400 font-semibold block">
                                {item.meal_period_name || 'Period'}
                              </span>
                              <span className="text-xs text-stone-400">
                                {item.category_name || 'Category'}
                              </span>
                            </td>

                            {/* Price STRICT ETB */}
                            <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-amber-400 text-sm">
                              {formatPrice(item.price, selectedRestaurant.currency_display || 'ETB')}
                            </td>

                            {/* Availability Toggle */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <button
                                onClick={() => handleToggleAvailability(item)}
                                className={`px-2.5 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 mx-auto ${
                                  item.is_available
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                                    : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                                }`}
                              >
                                {item.is_available ? (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <span>Available</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                    <span>Unavailable</span>
                                  </>
                                )}
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingItem(item);
                                    setItemForm({
                                      name: item.name,
                                      description: item.description,
                                      price: String(item.price),
                                      meal_period_id: item.meal_period_id,
                                      category_id: item.category_id,
                                      image_url: item.image_url,
                                      is_available: item.is_available ? 1 : 0
                                    });
                                    setIsItemModalOpen(true);
                                  }}
                                  className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded-lg transition"
                                  title="Edit dish"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id, item.name)}
                                  className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition"
                                  title="Delete dish"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PERMANENT QR CODE STUDIO */}
          {activeTab === 'qr' && selectedRestaurant && (
            <div className="space-y-6">
              <QRStudio restaurant={selectedRestaurant} />
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: ADD/EDIT MEAL PERIOD */}
      {isMealPeriodModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">
              {editingPeriod ? 'Edit Meal Time' : 'Add New Meal Time'}
            </h3>

            <form onSubmit={handleSaveMealPeriod} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                  Name (e.g. Breakfast, Lunch, Dinner, Drinks) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Breakfast"
                  value={periodForm.name}
                  onChange={e => setPeriodForm({ ...periodForm, name: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={periodForm.start_time}
                    onChange={e => setPeriodForm({ ...periodForm, start_time: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={periodForm.end_time}
                    onChange={e => setPeriodForm({ ...periodForm, end_time: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(periodForm.is_active)}
                    onChange={e => setPeriodForm({ ...periodForm, is_active: e.target.checked ? 1 : 0 })}
                    className="accent-amber-500"
                  />
                  <span className="text-xs text-stone-300 font-medium">Meal Time Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(periodForm.auto_schedule_enabled)}
                    onChange={e => setPeriodForm({ ...periodForm, auto_schedule_enabled: e.target.checked ? 1 : 0 })}
                    className="accent-amber-500"
                  />
                  <span className="text-xs text-stone-300 font-medium">Auto-schedule by local time</span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsMealPeriodModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg"
                >
                  Save Meal Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD/EDIT CATEGORY */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h3>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                  Assign to Meal Time *
                </label>
                <select
                  required
                  value={categoryForm.meal_period_id}
                  onChange={e => setCategoryForm({ ...categoryForm, meal_period_id: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {mealPeriods.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Traditional Stews, Tibs, Hot Drinks"
                  value={categoryForm.name}
                  onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD/EDIT MENU ITEM (CRITICAL PRICE VALIDATION ETB ONLY) */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 my-8">
            <h3 className="text-xl font-bold text-white">
              {editingItem ? 'Edit Ethiopian Dish' : 'Add New Ethiopian Dish'}
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                  Dish / Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Doro Wot, Kitfo, Awaze Tibs..."
                  value={itemForm.name}
                  onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Meal Time *
                  </label>
                  <select
                    required
                    value={itemForm.meal_period_id}
                    onChange={e => {
                      const newPeriod = e.target.value;
                      const validCats = categories.filter(c => c.meal_period_id === newPeriod);
                      setItemForm({
                        ...itemForm,
                        meal_period_id: newPeriod,
                        category_id: validCats[0]?.id || ''
                      });
                    }}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {mealPeriods.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={itemForm.category_id}
                    onChange={e => setItemForm({ ...itemForm, category_id: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {categories
                      .filter(c => c.meal_period_id === itemForm.meal_period_id)
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Price Field - STRICT ETB VALIDATION */}
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                  Price (Ethiopian Birr / ETB) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 450"
                    value={itemForm.price}
                    onChange={e => setItemForm({ ...itemForm, price: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-3.5 pr-16 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">
                    {selectedRestaurant?.currency_display || 'ETB'}
                  </div>
                </div>
                <span className="text-[11px] text-stone-300 mt-1 block">
                  Numeric value only. System stores numeric price separately. Do not type $ or foreign currency symbols.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                  Description & Ingredients
                </label>
                <textarea
                  rows={2}
                  placeholder="Ingredients, preparation, spices..."
                  value={itemForm.description}
                  onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Photo Input and Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                  Dish Photo
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-stone-950 border border-stone-800 overflow-hidden shrink-0">
                    <img
                      src={itemForm.image_url || FALLBACK_FOOD_IMAGE}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      placeholder="Paste image URL..."
                      value={itemForm.image_url}
                      onChange={e => setItemForm({ ...itemForm, image_url: e.target.value })}
                      className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg cursor-pointer transition border border-stone-700">
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingImage}
                        className="hidden"
                        onChange={e => e.target.files?.[0] && handleImageFileUpload(e.target.files[0], 'item')}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(itemForm.is_available)}
                    onChange={e => setItemForm({ ...itemForm, is_available: e.target.checked ? 1 : 0 })}
                    className="accent-amber-500"
                  />
                  <span className="text-xs text-stone-200 font-semibold">
                    Available for customers today (Uncheck if sold out)
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-950/50"
                >
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-850 border border-stone-700 text-white px-4 py-2.5 rounded-2xl text-xs font-medium shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Error Notification */}
      {errorMessage && (
        <div className="fixed bottom-20 right-6 z-50 bg-rose-950/95 border border-rose-800 text-rose-100 px-4 py-2.5 rounded-2xl text-xs font-medium shadow-2xl flex items-center gap-2 max-w-md animate-in fade-in slide-in-from-bottom-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white p-1 transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800 flex items-center justify-center text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-100">{deleteConfirm.title}</h3>
              <p className="text-sm text-stone-400 mt-1">{deleteConfirm.message}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = deleteConfirm.onConfirm;
                  setDeleteConfirm(null);
                  action();
                }}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-rose-900/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
