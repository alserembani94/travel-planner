import { useState, useEffect } from 'react';
import { config } from '../config';

export const useGoogleMaps = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if script is already loaded
    if (window.google) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true));
      return;
    }

    // Load script if not present
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${config.googleMapsApiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => setIsLoaded(true));
    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', () => setIsLoaded(true));
    };
  }, []);

  return isLoaded;
};