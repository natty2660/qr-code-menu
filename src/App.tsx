/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import PublicMenu from './components/PublicMenu.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import AdminLogin from './components/AdminLogin.tsx';
import QRStudio from './components/QRStudio.tsx';
import { Restaurant } from './types.ts';
import { getFallbackMenuResponse } from './data/fallbackData.ts';
import { UtensilsCrossed, QrCode, Lock, ArrowRight, Eye, ShieldCheck, X } from 'lucide-react';

export default function App() {
  // Current route parsing: path can be '/menu/:slug', '/admin', or '/'
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [adminToken, setAdminToken] = useState<string | null>(
    localStorage.getItem('ethio_menu_admin_token')
  );
  const [qrModalSlug, setQrModalSlug] = useState<string | null>(null);
  const [qrModalRestaurant, setQrModalRestaurant] = useState<Restaurant | null>(null);

  // Sync with browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  const handleLoginSuccess = (token: string) => {
    localStorage.setItem('ethio_menu_admin_token', token);
    setAdminToken(token);
    navigateTo('/admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('ethio_menu_admin_token');
    setAdminToken(null);
    navigateTo('/');
  };

  // Open QR modal helper
  const handleShowQR = async (slug: string) => {
    try {
      const res = await fetch(`/api/public/menu/${slug}`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setQrModalRestaurant(data.restaurant);
        setQrModalSlug(slug);
        return;
      }
      const fallback = getFallbackMenuResponse(slug);
      setQrModalRestaurant(fallback.restaurant);
      setQrModalSlug(slug);
    } catch (e) {
      const fallback = getFallbackMenuResponse(slug);
      setQrModalRestaurant(fallback.restaurant);
      setQrModalSlug(slug);
    }
  };

  // Route 1: Admin Route (/admin)
  if (currentPath.startsWith('/admin')) {
    if (!adminToken) {
      return (
        <AdminLogin
          onLoginSuccess={handleLoginSuccess}
          onBackToMenu={() => navigateTo('/menu/habesha-restaurant')}
        />
      );
    }

    return (
      <AdminDashboard
        token={adminToken}
        onLogout={handleLogout}
        onOpenPublicMenu={(slug) => navigateTo(`/menu/${slug}`)}
      />
    );
  }

  // Route 2: Public Menu by permanent slug (/menu/:slug)
  const menuMatch = currentPath.match(/^\/menu\/([a-zA-Z0-9_-]+)/);
  if (menuMatch) {
    const slug = menuMatch[1];
    return (
      <>
        {/* Floating Quick Switcher for preview / testing */}
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
          <button
            id="switch-to-admin-floating-btn"
            onClick={() => navigateTo('/admin')}
            className="px-3.5 py-2 bg-stone-900/90 hover:bg-stone-850 text-stone-200 hover:text-white border border-stone-700/80 rounded-full text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-1.5 transition"
            title="Open restaurant owner dashboard"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin</span>
          </button>
        </div>

        <PublicMenu
          slug={slug}
          onOpenAdmin={() => navigateTo('/admin')}
          onShowQR={(s) => handleShowQR(s)}
        />

        {/* QR Modal when requested */}
        {qrModalSlug && qrModalRestaurant && (
          <div
            id="app-qr-modal-backdrop"
            onClick={() => setQrModalSlug(null)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-2xl w-full relative"
            >
              <button
                onClick={() => setQrModalSlug(null)}
                className="absolute -top-3 -right-3 z-10 p-2 rounded-full bg-stone-800 text-stone-300 hover:text-white border border-stone-700 shadow-xl"
              >
                <X className="w-4 h-4" />
              </button>
              <QRStudio
                restaurant={qrModalRestaurant}
                onClose={() => setQrModalSlug(null)}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  // Default Route (/) -> Directly display the demo Ethiopian menu (/menu/habesha-restaurant)
  // This satisfies the prompt's #1 ABSOLUTE PRODUCT PURPOSE:
  // "CUSTOMER SCANS QR CODE → ETHIOPIAN RESTAURANT MENU OPENS IMMEDIATELY"
  return (
    <>
      {/* Floating Quick Switcher */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
        <button
          id="root-switch-to-admin-btn"
          onClick={() => navigateTo('/admin')}
          className="px-3.5 py-2 bg-stone-900/90 hover:bg-stone-850 text-stone-200 hover:text-white border border-stone-700/80 rounded-full text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-1.5 transition"
          title="Open restaurant owner dashboard"
        >
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Admin</span>
        </button>
      </div>

      <PublicMenu
        slug="habesha-restaurant"
        onOpenAdmin={() => navigateTo('/admin')}
        onShowQR={(s) => handleShowQR(s)}
      />

      {/* QR Modal when requested */}
      {qrModalSlug && qrModalRestaurant && (
        <div
          id="root-qr-modal-backdrop"
          onClick={() => setQrModalSlug(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl w-full relative"
          >
            <button
              onClick={() => setQrModalSlug(null)}
              className="absolute -top-3 -right-3 z-10 p-2 rounded-full bg-stone-800 text-stone-300 hover:text-white border border-stone-700 shadow-xl"
            >
              <X className="w-4 h-4" />
            </button>
            <QRStudio
              restaurant={qrModalRestaurant}
              onClose={() => setQrModalSlug(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
