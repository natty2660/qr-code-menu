import React, { useState } from 'react';
import { Lock, UtensilsCrossed, ArrowRight, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (token: string) => void;
  onBackToMenu: () => void;
}

export default function AdminLogin({ onLoginSuccess, onBackToMenu }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid administrator password.');
      }

      onLoginSuccess(data.token);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="admin-login-screen" className="min-h-screen bg-[#100e0c] flex items-center justify-center p-4 sm:p-6 text-stone-100">
      <div className="w-full max-w-md bg-stone-900/90 border border-stone-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-md space-y-6">
        {/* Back Link */}
        <button
          onClick={onBackToMenu}
          className="text-stone-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Ethiopian Menu</span>
        </button>

        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-600/20 border border-amber-500/40 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Restaurant Manager
          </h1>
          <p className="text-stone-300 text-xs sm:text-sm">
            Sign in to manage dishes, Ethiopian Birr prices, meal periods, and permanent QR cards.
          </p>
        </div>

        {/* Error notice */}
        {error && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-300 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="admin-password-input"
                type="password"
                required
                autoFocus
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
              />
            </div>
          </div>

          <button
            id="admin-login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-amber-950/60 flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Verifying...' : 'Access Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Helper */}
        <div className="pt-4 border-t border-stone-800 text-center">
          <p className="text-xs text-stone-300 mb-2">Default demo password:</p>
          <button
            id="quick-demo-password-btn"
            onClick={() => setPassword('admin123')}
            className="px-3 py-1 bg-stone-950 border border-stone-700/80 hover:border-amber-500/50 rounded-lg text-xs font-mono text-amber-300 transition"
          >
            admin123 (Click to fill)
          </button>
        </div>
      </div>
    </div>
  );
}
