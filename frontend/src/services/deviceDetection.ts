/**
 * Servicio para detectar el tipo de dispositivo y orientación
 */

// Detector de dispositivo móvil
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Detector de tablet
export function isTabletDevice(): boolean {
  return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent) || 
         (isMobileDevice() && window.innerWidth >= 768);
}

// Detector de dispositivo de escritorio
export function isDesktopDevice(): boolean {
  return !isMobileDevice() && !isTabletDevice();
}

// Obtener la orientación actual
export function getOrientation(): 'portrait' | 'landscape' {
  if (window.innerHeight > window.innerWidth) {
    return 'portrait';
  } else {
    return 'landscape';
  }
}

// Escuchar cambios de orientación
export function addOrientationChangeListener(callback: (orientation: 'portrait' | 'landscape') => void): void {
  window.addEventListener('resize', () => {
    callback(getOrientation());
  });
}

// Remover listener de orientación
export function removeOrientationChangeListener(callback: (orientation: 'portrait' | 'landscape') => void): void {
  window.removeEventListener('resize', () => {
    callback(getOrientation());
  });
}

// Verificar si la cámara está disponible
export async function isCameraAvailable(): Promise<boolean> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return false;
  }
  
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === 'videoinput');
  } catch (e) {
    console.error('Error al verificar la disponibilidad de la cámara:', e);
    return false;
  }
}

// Verificar si la API para captura de imágenes está disponible
export function isImageCaptureSupported(): boolean {
  return 'ImageCapture' in window && 'mediaDevices' in navigator;
}

// Obtener información del dispositivo
export function getDeviceInfo() {
  return {
    isMobile: isMobileDevice(),
    isTablet: isTabletDevice(),
    isDesktop: isDesktopDevice(),
    orientation: getOrientation(),
    browserInfo: navigator.userAgent,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight
  };
}
