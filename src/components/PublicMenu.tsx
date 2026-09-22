import { useState, useEffect, useMemo } from 'react';
import {
  UtensilsCrossed,
  Clock,
  MapPin,
  Phone,
  Search,
  AlertCircle,
  X,
  Sparkles,
  Info,
  CheckCircle2,
  Share2,
  QrCode
} from 'lucide-react';
import { PublicMenuResponse, MenuItem, MealPeriod, Category } from '../types.ts';
import { formatPrice, formatTimeRange, FALLBACK_FOOD_IMAGE, FALLBACK_RESTAURANT_COVER } from '../utils.ts';

interface PublicMenuProps {
  slug: string;
  onOpenAdmin?: () => void;
  onShowQR?: (slug: string) => void;
}

export default function PublicMenu({ slug, onOpenAdmin, onShowQR }: PublicMenuProps) {
  const [data, setData] = useState<PublicMenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ title: string; detail?: string } | null>(null);

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fastingOnly, setFastingOnly] = useState(false);
  const [activeItemModal, setActiveItemModal] = useState<MenuItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function loadMenu() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/public/menu/${slug}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 404) {
            setError({
              title: errData.error || 'Menu not found.',
              detail: errData.detail || 'The requested Ethiopian restaurant menu does not exist.'
            });
          } else if (res.status === 403) {
            setError({
              title: errData.error || 'This menu is currently unavailable.',
              detail: errData.detail || 'The restaurant is currently inactive.'
            });
          } else {
            setError({
              title: 'Unable to load menu.',
              detail: 'Please check your connection and try again.'
            });
          }
          setData(null);
          return;
        }

        const menuData: PublicMenuResponse = await res.json();
        setData(menuData);

        // Set default meal period from server recommendation or first available
        if (menuData.activePeriodId) {
          setSelectedPeriodId(menuData.activePeriodId);
        } else if (menuData.mealPeriods.length > 0) {
          setSelectedPeriodId(menuData.mealPeriods[0].id);
        }
      } catch (err) {
        console.error('Failed to load menu:', err);
        setError({
          title: 'Connection error.',
          detail: 'Unable to reach the server. Please check your internet connection.'
        });
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, [slug]);

  const activePeriod = useMemo(() => {
    if (!data || !selectedPeriodId) return null;
    return data.mealPeriods.find(p => p.id === selectedPeriodId) || data.mealPeriods[0] || null;
  }, [data, selectedPeriodId]);

  const availableCategories = useMemo(() => {
    if (!data || !activePeriod) return [];
    return data.categories.filter(c => c.meal_period_id === activePeriod.id);
  }, [data, activePeriod]);

  // Reset category filter when meal period changes
  useEffect(() => {
    setSelectedCategoryId(null);
  }, [selectedPeriodId]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    if (!data || !activePeriod) return [];

    let items = data.items.filter(item => item.meal_period_id === activePeriod.id);

    if (selectedCategoryId) {
      items = items.filter(item => item.category_id === selectedCategoryId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        item =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      );
    }

    if (fastingOnly) {
      const fastingKeywords = ['shiro', 'beyaynetu', 'misir', 'gomen', 'kik', 'fosolia', 'fasting', 'yetsom', 'vegetarian', 'salad', 'ful'];
      items = items.filter(item => {
        const text = `${item.name} ${item.description}`.toLowerCase();
        return fastingKeywords.some(kw => text.includes(kw));
      });
    }

    return items;
  }, [data, activePeriod, selectedCategoryId, searchQuery, fastingOnly]);

  // Group items by category for structured display
  const itemsByCategory = useMemo(() => {
    const map = new Map<string, { category: Category; items: MenuItem[] }>();

    for (const cat of availableCategories) {
      map.set(cat.id, { category: cat, items: [] });
    }

    for (const item of filteredItems) {
      if (map.has(item.category_id)) {
        map.get(item.category_id)!.items.push(item);
      } else {
        // Fallback for items with unmapped category
        const fallbackCat: Category = {
          id: 'misc',
          restaurant_id: data?.restaurant.id || '',
          meal_period_id: activePeriod?.id || '',
          name: 'Other Selections',
          display_order: 999
        };
        if (!map.has('misc')) {
          map.set('misc', { category: fallbackCat, items: [] });
        }
        map.get('misc')!.items.push(item);
      }
    }

    return Array.from(map.values()).filter(group => group.items.length > 0);
  }, [availableCategories, filteredItems, data, activePeriod]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: data?.restaurant.name || 'Ethiopian Digital Menu',
        text: `Check out the digital menu for ${data?.restaurant.name}!`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading) {
    return (
      <div id="loading-screen" className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-6 text-stone-200">
        <div className="w-12 h-12 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-stone-300 font-medium tracking-wide">Opening Ethiopian digital menu...</p>
        <p className="text-stone-500 text-xs mt-1">Authentic Habesha Flavors</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div id="error-screen" className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-6 text-stone-200">
        <div className="max-w-md w-full bg-stone-800/90 border border-stone-700/80 rounded-2xl p-8 text-center shadow-2xl backdrop-blur-sm">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">{error?.title || 'Menu Unavailable'}</h1>
          <p className="text-stone-400 text-sm leading-relaxed mb-6">
            {error?.detail || 'This menu is not currently accessible.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              id="reload-menu-btn"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-amber-900/40"
            >
              Try Again
            </button>
            {onOpenAdmin && (
              <button
                id="goto-admin-btn"
                onClick={onOpenAdmin}
                className="px-5 py-2.5 bg-stone-700 hover:bg-stone-600 text-stone-200 font-medium rounded-xl text-sm transition"
              >
                Go to Admin
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { restaurant, mealPeriods } = data;
  const currencyDisplay = restaurant.currency_display || 'ETB';

  return (
    <div id="public-menu-page" className="min-h-screen bg-[#141210] text-stone-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200 font-sans">
      {/* Cover Header */}
      <header className="relative w-full overflow-hidden bg-stone-950 border-b border-stone-800/80">
        <div className="relative h-48 sm:h-64 md:h-72 w-full overflow-hidden">
          <img
            src={restaurant.cover_url || FALLBACK_RESTAURANT_COVER}
            alt={`${restaurant.name} cover`}
            className="w-full h-full object-cover object-center filter brightness-60 scale-105 transition duration-700"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_RESTAURANT_COVER;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141210] via-[#141210]/60 to-transparent" />

          {/* Top Quick Actions */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              id="qr-preview-button"
              onClick={() => onShowQR && onShowQR(restaurant.slug)}
              className="px-3 py-1.5 bg-stone-900/80 hover:bg-stone-800 backdrop-blur-md border border-stone-700/60 rounded-full text-xs font-medium text-stone-200 flex items-center gap-1.5 transition shadow-lg"
              title="View permanent QR code"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-400" />
              <span>QR Code</span>
            </button>
            <button
              id="share-menu-button"
              onClick={handleShare}
              className="p-2 bg-stone-900/80 hover:bg-stone-800 backdrop-blur-md border border-stone-700/60 rounded-full text-stone-200 transition shadow-lg"
              title="Share menu"
            >
              <Share2 className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>

        {/* Restaurant Identity Card */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-16 sm:-mt-20 relative z-10 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 text-center sm:text-left">
            {/* Logo */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-stone-800 border-2 border-amber-500/40 overflow-hidden shadow-2xl shrink-0 p-1 flex items-center justify-center">
              <img
                src={restaurant.logo_url || FALLBACK_FOOD_IMAGE}
                alt={`${restaurant.name} logo`}
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_FOOD_IMAGE;
                }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30 mb-1.5">
                <Sparkles className="w-3 h-3" />
                <span>Authentic Ethiopian Dining</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {restaurant.name}
              </h1>
              {restaurant.description && (
                <p className="text-stone-300 text-sm sm:text-base mt-1 line-clamp-2 max-w-2xl leading-relaxed">
                  {restaurant.description}
                </p>
              )}

              {/* Meta pills: Location & Phone */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 mt-2.5 text-xs text-stone-400">
                {restaurant.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{restaurant.address}</span>
                  </span>
                )}
                {restaurant.phone && (
                  <a
                    href={`tel:${restaurant.phone}`}
                    className="flex items-center gap-1 hover:text-amber-300 transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{restaurant.phone}</span>
                  </a>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-800/80 border border-stone-700/60 text-stone-300">
                  <span>Currency:</span>
                  <strong className="text-amber-400 font-bold">{currencyDisplay}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Meal Period Navigation Tabs (REQUIRED CORE FEATURE) */}
        {mealPeriods.length === 0 ? (
          <div className="text-center py-16 bg-stone-900/50 rounded-2xl border border-stone-800 p-8 my-6">
            <UtensilsCrossed className="w-12 h-12 text-stone-600 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-stone-300">Menu Coming Soon</h2>
            <p className="text-stone-500 text-sm mt-1">This restaurant is configuring their meal periods.</p>
          </div>
        ) : (
          <div>
            {/* Meal Time Selector Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold tracking-wider text-amber-400 uppercase">
                  Select Meal Time
                </span>
                {activePeriod?.start_time && activePeriod?.end_time && (
                  <span className="inline-flex items-center gap-1 text-xs text-stone-400 bg-stone-800/60 px-2.5 py-1 rounded-full border border-stone-700/50">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>{formatTimeRange(activePeriod.start_time, activePeriod.end_time)}</span>
                  </span>
                )}
              </div>

              {/* Horizontal Scrollable Touch Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                {mealPeriods.map((period) => {
                  const isSelected = period.id === selectedPeriodId;
                  const isScheduledNow = period.id === data.activePeriodId && restaurant.meal_schedule_enabled;

                  return (
                    <button
                      key={period.id}
                      id={`meal-period-tab-${period.id}`}
                      onClick={() => setSelectedPeriodId(period.id)}
                      className={`relative shrink-0 px-5 py-3 rounded-xl font-bold text-sm sm:text-base tracking-wide transition-all duration-200 flex items-center gap-2 shadow-md ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-amber-950/60 border border-amber-400/40 ring-2 ring-amber-500/20'
                          : 'bg-stone-800/90 text-stone-300 hover:bg-stone-700/90 hover:text-white border border-stone-700/70'
                      }`}
                    >
                      <span>{period.name}</span>
                      {isScheduledNow && (
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 tracking-tight">
                          Serving Now
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="my-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="menu-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activePeriod?.name || 'menu'} (e.g. Kitfo, Shiro, Tibs...)`}
                  className="w-full bg-stone-900/90 border border-stone-700/80 rounded-xl pl-10 pr-9 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Fasting (Yetsom) filter toggle */}
              <button
                id="toggle-fasting-filter"
                onClick={() => setFastingOnly(!fastingOnly)}
                className={`px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition shrink-0 ${
                  fastingOnly
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-md shadow-emerald-950/50'
                    : 'bg-stone-900/80 border-stone-700/70 text-stone-300 hover:bg-stone-800'
                }`}
                title="Filter traditional fasting & vegetarian dishes"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Fasting / Yetsom (የጾም)</span>
                {fastingOnly && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />}
              </button>
            </div>

            {/* Category Pills under current Meal Period */}
            {availableCategories.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
                <button
                  id="category-pill-all"
                  onClick={() => setSelectedCategoryId(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategoryId === null
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      : 'bg-stone-900/70 text-stone-400 hover:text-stone-200 border border-stone-800'
                  }`}
                >
                  All {activePeriod?.name}
                </button>
                {availableCategories.map((cat) => {
                  const isSelected = cat.id === selectedCategoryId;
                  return (
                    <button
                      key={cat.id}
                      id={`category-pill-${cat.id}`}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                          : 'bg-stone-900/70 text-stone-400 hover:text-stone-200 border border-stone-800'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Menu Items List */}
            {itemsByCategory.length === 0 ? (
              <div className="text-center py-16 bg-stone-900/40 rounded-2xl border border-stone-800/80 p-8 my-4">
                <UtensilsCrossed className="w-12 h-12 text-stone-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-stone-300">
                  {searchQuery || fastingOnly
                    ? 'No matching dishes found.'
                    : `No items available in ${activePeriod?.name || 'this period'}.`}
                </h3>
                <p className="text-stone-500 text-sm mt-1 max-w-sm mx-auto">
                  {searchQuery || fastingOnly
                    ? 'Try clearing the search query or vegetarian filter.'
                    : 'The restaurant has not listed dishes for this meal time yet.'}
                </p>
                {(searchQuery || fastingOnly) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFastingOnly(false);
                      setSelectedCategoryId(null);
                    }}
                    className="mt-4 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg transition"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {itemsByCategory.map(({ category, items }) => (
                  <section key={category.id} className="scroll-mt-6">
                    {/* Category Title */}
                    <div className="flex items-center gap-3 mb-3.5 pb-2 border-b border-stone-800/80">
                      <h2 className="text-lg sm:text-xl font-bold text-amber-400 tracking-tight">
                        {category.name}
                      </h2>
                      <span className="text-xs text-stone-500 font-mono">
                        ({items.length} {items.length === 1 ? 'item' : 'items'})
                      </span>
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      {items.map((item) => {
                        const isAvailable = Boolean(item.is_available);

                        return (
                          <div
                            key={item.id}
                            id={`menu-item-card-${item.id}`}
                            onClick={() => setActiveItemModal(item)}
                            className={`group relative bg-stone-900/80 hover:bg-stone-850 border border-stone-800/90 hover:border-amber-500/40 rounded-2xl p-3.5 sm:p-4 flex gap-3 sm:gap-4 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl ${
                              !isAvailable ? 'opacity-70 grayscale-[25%]' : ''
                            }`}
                          >
                            {/* Item Photo */}
                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-stone-800 overflow-hidden shrink-0 border border-stone-700/50">
                              <img
                                src={item.image_url || FALLBACK_FOOD_IMAGE}
                                alt={item.name}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = FALLBACK_FOOD_IMAGE;
                                }}
                              />
                              {!isAvailable && (
                                <div className="absolute inset-0 bg-stone-950/75 backdrop-blur-[1px] flex items-center justify-center p-1 text-center">
                                  <span className="text-[10px] font-bold text-rose-300 uppercase tracking-tighter bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-800/60">
                                    Sold Out
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Item Text & Price */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="font-bold text-stone-100 text-sm sm:text-base leading-snug group-hover:text-amber-300 transition line-clamp-2">
                                    {item.name}
                                  </h3>
                                </div>
                                {item.description && (
                                  <p className="text-stone-400 text-xs sm:text-sm mt-1 line-clamp-2 leading-relaxed">
                                    {item.description}
                                  </p>
                                )}
                              </div>

                              {/* Price Row (STRICT ETB FORMATTING) */}
                              <div className="mt-2.5 flex items-center justify-between pt-1">
                                <span className="text-base sm:text-lg font-black text-amber-400 tracking-tight">
                                  {formatPrice(item.price, currencyDisplay)}
                                </span>

                                {isAvailable ? (
                                  <span className="text-[11px] font-medium text-stone-400 group-hover:text-stone-200 transition">
                                    View Details →
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-semibold text-rose-400/90 bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-900/40">
                                    Currently Unavailable
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Item Detail Modal */}
      {activeItemModal && (
        <div
          id="item-detail-modal-backdrop"
          onClick={() => setActiveItemModal(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            id="item-detail-modal"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
          >
            {/* Modal Image */}
            <div className="relative h-60 sm:h-72 w-full bg-stone-950 shrink-0">
              <img
                src={activeItemModal.image_url || FALLBACK_FOOD_IMAGE}
                alt={activeItemModal.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_FOOD_IMAGE;
                }}
              />
              <button
                id="close-item-modal-btn"
                onClick={() => setActiveItemModal(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition"
              >
                <X className="w-5 h-5" />
              </button>

              {!activeItemModal.is_available && (
                <div className="absolute bottom-4 left-4 bg-rose-900/90 border border-rose-700 text-rose-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                  Currently Sold Out / Unavailable
                </div>
              )}
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    {activePeriod?.name}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                    {activeItemModal.name}
                  </h2>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-black text-amber-400">
                    {formatPrice(activeItemModal.price, currencyDisplay)}
                  </span>
                </div>
              </div>

              {activeItemModal.description && (
                <div className="mt-4 pt-4 border-t border-stone-800 text-stone-300 text-sm leading-relaxed">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    <span>Description & Preparation</span>
                  </h4>
                  <p>{activeItemModal.description}</p>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
                <span>Restaurant: <strong className="text-stone-200">{restaurant.name}</strong></span>
                <span className="text-emerald-400 font-medium">Digital QR Menu</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {copiedLink && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-800 border border-stone-700 text-white px-4 py-2 rounded-full text-xs font-medium shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Menu link copied to clipboard!</span>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full border-t border-stone-800/80 bg-stone-950 py-8 text-center text-xs text-stone-400 mt-auto">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-stone-300">{restaurant.name}</p>
            <p className="text-stone-400 text-[11px] mt-0.5">Permanent Ethiopian QR Digital Menu</p>
          </div>
          <div className="flex items-center gap-3">
            {onOpenAdmin && (
              <button
                id="footer-admin-link"
                onClick={onOpenAdmin}
                className="text-stone-400 hover:text-amber-400 transition underline underline-offset-4"
              >
                Restaurant Manager
              </button>
            )}
            <span className="text-stone-700">•</span>
            <span>All prices in <strong className="text-amber-400 font-bold">{currencyDisplay}</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
