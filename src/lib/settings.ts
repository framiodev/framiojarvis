/**
 * User Settings persistence for Framio Jarvis AI.
 */

export type AppLanguage = 'tr-TR' | 'en-GB' | 'en-US'

export type Settings = {
  // Language & Voice
  language: AppLanguage
  wakeWord: string
  voiceName: string
  voiceRate: number
  voicePitch: number

  // Visuals & Themes
  accentColor: string
  reactorStyle: 'ring' | 'sphere' | 'wire'
  reactorIntensity: number
  reactorScale: number
  reactorSpin: number

  // Hotkeys & Startup
  hotkey: string
}

const SETTINGS_KEY = 'framio_jarvis_settings'

export const DEFAULT_SETTINGS: Settings = {
  language: 'tr-TR',
  wakeWord: 'jarvis',
  voiceName: '',
  voiceRate: 1.0,
  voicePitch: 1.0,
  accentColor: '#00e5ff',
  reactorStyle: 'ring',
  reactorIntensity: 1.0,
  reactorScale: 1.0,
  reactorSpin: 1.0,
  hotkey: 'Ctrl+Alt+J',
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Partial<Settings>): Settings {
  const current = loadSettings()
  const updated = { ...current, ...settings }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
  return updated
}
