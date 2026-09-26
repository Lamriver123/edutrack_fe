/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone
    ) {
      // Defer state update to avoid synchronous state update in effect
      setTimeout(() => setIsInstalled(true), 0);
      return;
    }

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setTimeout(() => setIsIOS(isiOS), 0);

    // Check if user dismissed the banner before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // For iOS, show custom guide after a delay
    if (isiOS) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // For Android/Desktop Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt, isIOS]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }, []);

  if (isInstalled || !showBanner) return null;

  return (
    <>
      {/* Install Banner */}
      <div className="pwa-install-banner">
        <div className="pwa-install-banner-content">
          <div className="pwa-install-icon">
            <img src="/icons/icon-72x72.png" alt="Edu Track" width={40} height={40} />
          </div>
          <div className="pwa-install-text">
            <strong>Cài đặt Edu Track</strong>
            <span>
              {isIOS
                ? 'Thêm vào Màn hình chính để sử dụng như ứng dụng'
                : 'Tải xuống để sử dụng như ứng dụng desktop/mobile'}
            </span>
          </div>
          <div className="pwa-install-actions">
            <button
              className="pwa-install-btn"
              onClick={handleInstall}
              aria-label="Cài đặt ứng dụng"
            >
              {isIOS ? 'Hướng dẫn' : 'Cài đặt'}
            </button>
            <button
              className="pwa-dismiss-btn"
              onClick={handleDismiss}
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* iOS Guide Modal */}
      {showIOSGuide && (
        <div className="pwa-ios-overlay" onClick={handleDismiss}>
          <div
            className="pwa-ios-guide"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="pwa-ios-close"
              onClick={handleDismiss}
              aria-label="Đóng"
            >
              ✕
            </button>
            <h3>Cài đặt trên iOS</h3>
            <div className="pwa-ios-steps">
              <div className="pwa-ios-step">
                <span className="pwa-ios-step-num">1</span>
                <span>
                  Nhấn nút <strong>Chia sẻ</strong>{' '}
                  <span style={{ fontSize: '1.2em' }}>
                    ⬆
                  </span>{' '}
                  ở thanh điều hướng
                </span>
              </div>
              <div className="pwa-ios-step">
                <span className="pwa-ios-step-num">2</span>
                <span>
                  Cuộn xuống và chọn{' '}
                  <strong>&quot;Thêm vào Màn hình chính&quot;</strong>
                </span>
              </div>
              <div className="pwa-ios-step">
                <span className="pwa-ios-step-num">3</span>
                <span>
                  Nhấn <strong>&quot;Thêm&quot;</strong> ở góc trên bên phải
                </span>
              </div>
            </div>
            <p className="pwa-ios-note">
              Sau khi thêm, bạn sẽ thấy biểu tượng Ms. Cheese trên màn hình
              chính giống như một ứng dụng thật!
            </p>
          </div>
        </div>
      )}
    </>
  );
}
