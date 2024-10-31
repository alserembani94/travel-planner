import { useEffect, useState } from 'react';
import * as workboxWindow from 'workbox-window';

export const usePWA = () => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const wb = new workboxWindow.Workbox('/sw.js');

      const handleInstalled = (event: unknown) => {
        console.log('Service Worker installed:', event);
      };

      const handleWaiting = () => {
        setIsUpdateAvailable(true);
      };

      wb.addEventListener('installed', handleInstalled);
      wb.addEventListener('waiting', handleWaiting);

      wb.register()
        .then((r) => r && setRegistration(r))
        .catch((error) => console.error('Service Worker registration failed:', error));

      return () => {
        wb.removeEventListener('installed', handleInstalled);
        wb.removeEventListener('waiting', handleWaiting);
      };
    }
  }, []);

  const updateServiceWorker = async () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return { isUpdateAvailable, updateServiceWorker };
};