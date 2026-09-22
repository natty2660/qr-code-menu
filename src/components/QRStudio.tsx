import { useState, useEffect } from 'react';
import {
  QrCode,
  Download,
  Printer,
  Copy,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import QRCode from 'qrcode';
import { Restaurant } from '../types.ts';

interface QRStudioProps {
  restaurant: Restaurant;
  onClose?: () => void;
}

export default function QRStudio({ restaurant, onClose }: QRStudioProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(true);

  // Compute permanent URL
  const publicMenuUrl = `${window.location.origin}/menu/${restaurant.slug}`;

  useEffect(() => {
    async function generateCode() {
      try {
        setGenerating(true);
        // Generate high resolution QR code for crisp printing & scanning
        const url = await QRCode.toDataURL(publicMenuUrl, {
          width: 800,
          margin: 2,
          color: {
            dark: '#1c1917',
            light: '#ffffff'
          }
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('Error generating QR code:', err);
      } finally {
        setGenerating(false);
      }
    }
    generateCode();
  }, [publicMenuUrl]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicMenuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-menu-${restaurant.slug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintTableCard = () => {
    if (!qrDataUrl) return;

    // Use hidden iframe to avoid popup blocker issues in iframes
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Digital Menu QR Stand — ${restaurant.name}</title>
        <style>
          @page { size: auto; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 90vh;
            background: #fff;
            color: #1c1917;
            margin: 0;
            padding: 20px;
          }
          .card {
            max-width: 420px;
            width: 100%;
            border: 3px solid #78350f;
            border-radius: 24px;
            padding: 40px 32px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          }
          .eyebrow {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #b45309;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          .title {
            font-size: 28px;
            font-weight: 900;
            margin: 0 0 8px 0;
            color: #1c1917;
          }
          .desc {
            font-size: 14px;
            color: #78716c;
            margin: 0 0 28px 0;
            line-height: 1.5;
          }
          .qr-box {
            background: #fff;
            padding: 16px;
            border-radius: 16px;
            display: inline-block;
            border: 2px solid #e7e5e4;
            margin-bottom: 24px;
          }
          .qr-box img {
            width: 260px;
            height: 260px;
            display: block;
          }
          .instruction {
            font-size: 16px;
            font-weight: 700;
            color: #1c1917;
            margin-bottom: 6px;
          }
          .subtext {
            font-size: 12px;
            color: #a8a29e;
            margin: 0;
          }
          .url-pill {
            display: inline-block;
            margin-top: 16px;
            padding: 6px 14px;
            background: #f5f5f4;
            border-radius: 999px;
            font-size: 11px;
            font-family: monospace;
            color: #57534e;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="eyebrow">Ethiopian Cuisine & Hospitality</div>
          <h1 class="title">${restaurant.name}</h1>
          <p class="desc">${restaurant.description || 'Scan with your camera phone to explore our full Ethiopian food & drinks menu.'}</p>
          <div class="qr-box">
            <img src="${qrDataUrl}" alt="Permanent QR Menu" />
          </div>
          <div class="instruction">Scan with phone camera to view menu</div>
          <p class="subtext">Breakfast • Lunch • Dinner • Ethiopian Buna & Spris</p>
          <div class="url-pill">${publicMenuUrl}</div>
        </div>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print error:', e);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 400);
  };

  return (
    <div id="qr-studio-panel" className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 text-stone-100 shadow-2xl">
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Left: High-contrast QR Canvas Preview */}
        <div className="flex flex-col items-center shrink-0">
          <div className="relative p-5 bg-white rounded-2xl shadow-xl border-4 border-amber-600/30">
            {generating ? (
              <div className="w-56 h-56 flex flex-col items-center justify-center text-stone-500">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-600 mb-2" />
                <span className="text-xs">Generating QR...</span>
              </div>
            ) : (
              <img
                src={qrDataUrl}
                alt={`QR code for ${restaurant.name}`}
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain block"
              />
            )}
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Permanent QR: Never Expires</span>
          </div>
        </div>

        {/* Right: Info, Instructions & Actions */}
        <div className="flex-1 w-full space-y-5 text-center md:text-left">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 mb-2">
              <Sparkles className="w-3 h-3" />
              <span>Table Stand & Print Ready</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Permanent QR Code for {restaurant.name}
            </h2>
            <p className="text-stone-300 text-sm mt-1 leading-relaxed">
              Customers scan this code with their phone camera to open the Ethiopian digital menu immediately without any app download or sign-in.
            </p>
          </div>

          {/* Permanent URL Box */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="text-left overflow-hidden">
              <div className="text-[10px] uppercase font-bold text-stone-300 tracking-wider">
                Permanent Public URL:
              </div>
              <div className="text-xs sm:text-sm font-mono text-amber-300 truncate">
                {publicMenuUrl}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                id="copy-qr-url-btn"
                onClick={handleCopyUrl}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-stone-700"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              <a
                id="visit-qr-url-link"
                href={publicMenuUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-stone-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Visit</span>
              </a>
            </div>
          </div>

          {/* Action Buttons: PNG & Print Table Tent */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
            <button
              id="download-qr-png-btn"
              onClick={handleDownloadPng}
              disabled={generating}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-amber-950/50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download High-Res PNG</span>
            </button>

            <button
              id="print-table-card-btn"
              onClick={handlePrintTableCard}
              disabled={generating}
              className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-bold rounded-xl text-sm transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Table Card</span>
            </button>

            {onClose && (
              <button
                id="close-qr-studio-btn"
                onClick={onClose}
                className="px-4 py-2.5 text-stone-400 hover:text-stone-200 text-sm font-medium transition"
              >
                Close
              </button>
            )}
          </div>

          {/* Golden Rule Note */}
          <div className="bg-stone-950/50 border border-amber-900/40 rounded-xl p-3 text-xs text-stone-300 leading-relaxed">
            <strong className="text-amber-400 font-bold block mb-0.5">Permanent QR Guarantee:</strong>
            You can change food prices (e.g. from 400 ETB to 450 ETB), add new dishes, upload photos, or toggle availability at any time. You <span className="underline decoration-amber-500">never</span> need to reprint or regenerate this QR code!
          </div>
        </div>
      </div>
    </div>
  );
}
