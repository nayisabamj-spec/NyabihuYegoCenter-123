import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Laptop,
  CheckCircle2,
  X,
  Share2,
  PlusSquare,
  Sparkles,
  ArrowUpRight,
  Monitor
} from 'lucide-react';
import { BRAND_CONFIG } from '../../constants/branding';
import { usePWA } from '../../context/PWAContext';

interface PWAInstallPromptProps {
  variant?: 'banner' | 'button' | 'card' | 'mobile-bar' | 'compact-btn';
  className?: string;
  onInstallStarted?: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  variant = 'banner',
  className = '',
  onInstallStarted,
}) => {
  const {
    isInstalled,
    isIOS,
    isAndroid,
    isMobile,
    showInstallModal,
    setShowInstallModal,
    promptToInstall,
    deferredPrompt,
  } = usePWA();

  const [isDismissed, setIsDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  const handleInstallClick = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setInstalling(true);
    if (onInstallStarted) onInstallStarted();
    try {
      await promptToInstall();
    } finally {
      setInstalling(false);
    }
  };

  // If already running inside standalone app, do not show install triggers
  if (isInstalled || (isDismissed && (variant === 'banner' || variant === 'mobile-bar'))) {
    return null;
  }

  // Compact Header Button (perfect for mobile and desktop headers)
  if (variant === 'compact-btn' || variant === 'button') {
    return (
      <>
        <button
          type="button"
          onClick={handleInstallClick}
          id="pwa-install-header-btn"
          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-[#3591C8]/15 hover:bg-[#3591C8]/25 text-[#23285E] transition-all border border-[#3591C8]/30 shadow-xs active:scale-95 cursor-pointer whitespace-nowrap ${className}`}
          title="Install NYABIHU YEGO Application on your device"
          aria-label="Install App"
        >
          <Download className="w-3.5 h-3.5 text-[#23285E] shrink-0" />
          <span className="hidden xs:inline">Install App</span>
          <span className="xs:hidden inline">Install</span>
        </button>

        {showInstallModal && (
          <InstallInstructionsModal
            isIOS={isIOS}
            isAndroid={isAndroid}
            isMobile={isMobile}
            hasNativePrompt={Boolean(deferredPrompt)}
            onClose={() => setShowInstallModal(false)}
            onRetryPrompt={handleInstallClick}
          />
        )}
      </>
    );
  }

  // Card Variant for Landing Page, Admin & Profile
  if (variant === 'card') {
    return (
      <>
        <div
          className={`bg-gradient-to-br from-[#23285E] via-[#1f2452] to-[#161a3d] text-white rounded-2xl p-5 sm:p-6 shadow-lg border border-[#3591C8]/30 relative overflow-hidden ${className}`}
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#3591C8]/20 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#E6E65A]/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-md border border-white/20">
              <img
                src={BRAND_CONFIG.logoUrl}
                alt="Nyabihu Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">
                  Install NYABIHU YEGO App
                </h3>
                <span className="text-[10px] bg-[#E6E65A] text-[#23285E] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Native PWA
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Add to your phone, tablet, or laptop home screen for instant 1-tap access, offline visit entry, and push notifications.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={installing}
                  id="install-pwa-card-action"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E6E65A] hover:bg-[#d8d84e] text-[#23285E] font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>{installing ? 'Opening Install...' : 'Install App Now'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowInstallModal(true)}
                  className="text-xs text-slate-300 hover:text-white font-medium underline underline-offset-4 cursor-pointer"
                >
                  Installation Guide
                </button>
              </div>
            </div>
          </div>
        </div>

        {showInstallModal && (
          <InstallInstructionsModal
            isIOS={isIOS}
            isAndroid={isAndroid}
            isMobile={isMobile}
            hasNativePrompt={Boolean(deferredPrompt)}
            onClose={() => setShowInstallModal(false)}
            onRetryPrompt={handleInstallClick}
          />
        )}
      </>
    );
  }

  // Mobile Bottom Banner
  if (variant === 'mobile-bar') {
    return (
      <>
        <div className="bg-[#23285E] text-white p-3 rounded-xl border border-[#3591C8]/40 shadow-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white p-1 shrink-0">
              <img
                src={BRAND_CONFIG.logoUrl}
                alt="Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">Install Nyabihu App</p>
              <p className="text-[10px] text-slate-300 truncate">1-tap home screen access</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-[#E6E65A] text-[#23285E] font-extrabold text-xs rounded-lg shadow-xs hover:bg-yellow-300 transition-transform active:scale-95 shrink-0"
          >
            Install
          </button>
        </div>

        {showInstallModal && (
          <InstallInstructionsModal
            isIOS={isIOS}
            isAndroid={isAndroid}
            isMobile={isMobile}
            hasNativePrompt={Boolean(deferredPrompt)}
            onClose={() => setShowInstallModal(false)}
            onRetryPrompt={handleInstallClick}
          />
        )}
      </>
    );
  }

  // Default Top / Header Banner
  return (
    <>
      <div
        className={`bg-gradient-to-r from-[#23285E] via-[#2d3478] to-[#23285E] text-white px-4 py-2.5 shadow-sm border-b border-[#3591C8]/30 flex items-center justify-between gap-3 text-xs ${className}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white p-0.5 flex items-center justify-center shrink-0">
            <img
              src={BRAND_CONFIG.logoUrl}
              alt="Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="truncate text-xs">
            <span className="font-bold text-[#E6E65A]">Install App:</span> Add NYABIHU YEGO to your phone or laptop for instant access.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            id="pwa-install-banner-btn"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#E6E65A] hover:bg-[#d8d84e] text-[#23285E] font-extrabold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Install</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 text-slate-300 hover:text-white rounded-md transition-colors cursor-pointer"
            title="Dismiss Banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showInstallModal && (
        <InstallInstructionsModal
          isIOS={isIOS}
          isAndroid={isAndroid}
          isMobile={isMobile}
          hasNativePrompt={Boolean(deferredPrompt)}
          onClose={() => setShowInstallModal(false)}
          onRetryPrompt={handleInstallClick}
        />
      )}
    </>
  );
};

function InstallInstructionsModal({
  isIOS,
  isAndroid,
  isMobile,
  hasNativePrompt,
  onClose,
  onRetryPrompt,
}: {
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  hasNativePrompt: boolean;
  onClose: () => void;
  onRetryPrompt: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-5 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-white p-1 shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
            <img
              src={BRAND_CONFIG.logoUrl}
              alt="Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#23285E] leading-tight">
              Install NYABIHU YEGO App
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Works smoothly on Phones, Tablets & Laptops</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-600">
          {hasNativePrompt && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
              <span className="font-semibold text-amber-900">Ready to install instantly:</span>
              <button
                onClick={onRetryPrompt}
                className="px-3 py-1 bg-[#23285E] text-[#E6E65A] font-bold rounded-lg hover:bg-black transition-colors"
              >
                Trigger Install Prompt
              </button>
            </div>
          )}

          {isIOS ? (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2.5">
              <div className="font-bold text-blue-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-700" />
                <span>iPhone / iPad (Safari) Instructions:</span>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-blue-800 leading-relaxed text-xs pl-1">
                <li>
                  Tap the <strong className="inline-flex items-center gap-1 bg-blue-100 px-1.5 py-0.5 rounded text-blue-900"><Share2 className="w-3 h-3 inline" /> Share</strong> button at the bottom of Safari.
                </li>
                <li>
                  Scroll down and select <strong className="inline-flex items-center gap-1 bg-blue-100 px-1.5 py-0.5 rounded text-blue-900"><PlusSquare className="w-3 h-3 inline" /> Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong> in the top right corner to install.
                </li>
              </ol>
            </div>
          ) : isAndroid ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2.5">
              <div className="font-bold text-emerald-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-700" />
                <span>Android (Chrome / Samsung Internet):</span>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-emerald-800 leading-relaxed text-xs pl-1">
                <li>
                  Tap the <strong>three dots menu (⋮)</strong> at the top right corner.
                </li>
                <li>
                  Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                </li>
                <li>
                  Confirm <strong>Install</strong>. The app icon will be added to your app drawer and home screen.
                </li>
              </ol>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
              <div className="font-bold text-[#23285E] flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#3591C8]" />
                <span>Laptop & Desktop (Chrome / Edge):</span>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-slate-700 leading-relaxed text-xs pl-1">
                <li>
                  Click the <strong>Install icon (⊕ or 💻)</strong> on the right side of the browser URL address bar.
                </li>
                <li>
                  Or open browser menu (⋮) &gt; <strong>Save and share</strong> &gt; <strong>Install NYABIHU YEGO</strong>.
                </li>
                <li>
                  Launch the app in its own clean window without browser tabs.
                </li>
              </ol>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Offline visits storage</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>1-tap instant launch</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#23285E] text-white font-bold rounded-xl text-xs hover:bg-[#1a1e4a] transition-all cursor-pointer text-center"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
