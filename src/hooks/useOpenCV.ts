import { useState, useEffect } from 'react';

/**
 * Hook personalizado para detectar cuando OpenCV.js está cargado
 */
export const useOpenCV = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Verificar si OpenCV ya está cargado
    if (window.cv) {
      setIsLoaded(true);
      return;
    }

    // Definir un callback para cuando OpenCV se cargue
    const onOpenCvReady = () => {
      console.log('OpenCV.js está listo!');
      setIsLoaded(true);
    };

    // Asignar el callback al objeto global para que sea llamado cuando OpenCV se cargue
    window.onOpenCvReady = onOpenCvReady;

    // Verificar periódicamente si OpenCV ya se cargó
    const checkInterval = setInterval(() => {
      if (window.cv) {
        setIsLoaded(true);
        clearInterval(checkInterval);
      }
    }, 500);

    return () => {
      clearInterval(checkInterval);
      window.onOpenCvReady = null;
    };
  }, []);

  return isLoaded;
};

/**
 * Crear un evento personalizado para notificar cuando OpenCV está listo
 */
export const notifyOpenCVReady = () => {
  const event = new CustomEvent('opencv-loaded');
  window.dispatchEvent(event);
};

declare global {
  interface Window {
    cv: any;
    onOpenCvReady: (() => void) | null;
  }
} 