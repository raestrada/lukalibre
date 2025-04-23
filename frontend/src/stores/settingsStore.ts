import { writable } from 'svelte/store';

// Helper para detectar si estamos en el navegador
const browser = typeof window !== 'undefined';

export interface UserSettings {
  // Configuración de sincronización
  syncEnabled: boolean;      // Si la sincronización automática está habilitada
  syncInterval: number;      // Intervalo de sincronización en minutos
  lastSyncDate: string | null; // Fecha de la última sincronización exitosa
  
  // Configuración de tema
  theme: 'light' | 'dark' | 'system';
  
  // Otras configuraciones
  showBalanceInDashboard: boolean;
  defaultCurrency: string;
}

// Valores predeterminados
const defaultSettings: UserSettings = {
  syncEnabled: false,       // No sincronizar por defecto
  syncInterval: 30,         // 30 minutos por defecto si se activa
  lastSyncDate: null,
  
  theme: 'system',
  showBalanceInDashboard: true,
  defaultCurrency: 'CLP'
};

// Función para cargar configuraciones guardadas
function createSettingsStore() {
  // Intentar cargar desde localStorage si estamos en el navegador
  const initialSettings = browser 
    ? JSON.parse(localStorage.getItem('userSettings') || JSON.stringify(defaultSettings))
    : defaultSettings;
  
  const { subscribe, set, update } = writable<UserSettings>(initialSettings);
  
  return {
    subscribe,
    
    // Actualizar una configuración específica
    updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      update(settings => {
        const updatedSettings = { ...settings, [key]: value };
        if (browser) {
          localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
        }
        return updatedSettings;
      });
    },
    
    // Actualizar múltiples configuraciones de una vez
    updateSettings: (newSettings: Partial<UserSettings>) => {
      update(settings => {
        const updatedSettings = { ...settings, ...newSettings };
        if (browser) {
          localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
        }
        return updatedSettings;
      });
    },
    
    // Restablecer a valores predeterminados
    resetToDefaults: () => {
      set(defaultSettings);
      if (browser) {
        localStorage.setItem('userSettings', JSON.stringify(defaultSettings));
      }
    }
  };
}

export const settingsStore = createSettingsStore(); 