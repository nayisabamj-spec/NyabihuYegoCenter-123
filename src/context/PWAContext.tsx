import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  showInstallModal: boolean;
  setShowInstallModal: (show: boolean) => void;
  promptToInstall: () => Promise<boolean>;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

// Keep a module-level variable to catch the event even if the provider mounts slightly late
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
  });
}

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect device environment
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    const android = /android/.test(ua);
    const mobile = ios || android || /mobile|blackberry|iemobile|opera mini/.test(ua);

    setIsIOS(ios);
    setIsAndroid(android);
    setIsMobile(mobile);

    // Check if already installed (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      setIsInstallable(false);
    } else {
      setIsInstallable(true);
    }

    // Use globally captured prompt if available
    if (globalDeferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
      setIsInstallable(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      globalDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      globalDeferredPrompt = null;
      setShowInstallModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptToInstall = useCallback(async (): Promise<boolean> => {
    const activePrompt = deferredPrompt || globalDeferredPrompt;

    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setIsInstallable(false);
          setDeferredPrompt(null);
          globalDeferredPrompt = null;
          return true;
        } else {
          return false;
        }
      } catch (err) {
        console.warn('Error invoking native install prompt:', err);
        setShowInstallModal(true);
        return false;
      }
    } else {
      // If browser doesn't support beforeinstallprompt (e.g. iOS Safari, Firefox, or already installed)
      setShowInstallModal(true);
      return false;
    }
  }, [deferredPrompt]);

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isIOS,
        isAndroid,
        isMobile,
        isDesktop: !isMobile,
        deferredPrompt,
        showInstallModal,
        setShowInstallModal,
        promptToInstall,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};
