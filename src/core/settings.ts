import type { CustomizationSettings } from './types';

const KEY = 'black8-master:settings:v1';

export const defaultSettings: CustomizationSettings = {
  version: 1,
  difficulty: 'normal',
  tableTheme: 'emerald',
  cueStyle: 'maple',
  background: 'night',
  aimLine: 72,
  powerSensitivity: 1,
  sound: true,
  vibration: true
};

export function loadSettings(): CustomizationSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<CustomizationSettings> | null;
    if (!stored || stored.version !== 1) return { ...defaultSettings };
    return { ...defaultSettings, ...stored };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: CustomizationSettings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}
