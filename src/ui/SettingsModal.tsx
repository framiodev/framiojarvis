import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'
import {
  loadSettings,
  saveSettings,
  type Settings,
} from '../lib/settings'
import { candidateVoices, setVoiceByName } from '../lib/tts'

const THEME_PRESETS = [
  { name: 'Cyan (Klasik Arc)', color: '#00e5ff' },
  { name: 'Altın / Kırmızı (Mark VII)', color: '#ff3344' },
  { name: 'Kuantum Mor', color: '#a855f7' },
  { name: 'Matrix Yeşili', color: '#00ff66' },
  { name: 'Amber / Güneş', color: '#ff9900' },
  { name: 'Platin Beyazı', color: '#e2e8f0' },
]

export function SettingsModal() {
  const open = useStore((s) => s.settingsOpen)
  const setOpen = useStore((s) => s.setSettingsOpen)
  const applyUi = useStore((s) => s.applyUi)
  const setStoreVoice = useStore((s) => s.setVoice)

  const [settings, setLocalSettings] = useState<Settings>(loadSettings())
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    const list = candidateVoices()
    setVoices(list)

    const onVoicesChanged = () => {
      setVoices(candidateVoices())
    }
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)
      return () => {
        speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
      }
    }
  }, [])

  // Sync initial theme
  useEffect(() => {
    applyUi({
      accent: settings.accentColor,
      reactor: {
        color: settings.accentColor,
        style: settings.reactorStyle,
        intensity: settings.reactorIntensity,
        scale: settings.reactorScale,
        spin: settings.reactorSpin,
      },
    })
  }, [])

  const updateSetting = <K extends keyof Settings>(key: K, val: Settings[K]) => {
    const updated = saveSettings({ [key]: val })
    setLocalSettings(updated)

    // Live update visuals
    if (
      key === 'accentColor' ||
      key === 'reactorStyle' ||
      key === 'reactorIntensity' ||
      key === 'reactorScale' ||
      key === 'reactorSpin'
    ) {
      applyUi({
        accent: updated.accentColor,
        reactor: {
          color: updated.accentColor,
          style: updated.reactorStyle,
          intensity: updated.reactorIntensity,
          scale: updated.reactorScale,
          spin: updated.reactorSpin,
        },
      })
    }

    // Live update voice
    if (key === 'voiceName') {
      const v = setVoiceByName(String(val))
      if (v) setStoreVoice(v.name)
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="settings-backdrop" onClick={() => setOpen(false)}>
        <motion.div
          className="settings-modal"
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="settings-header">
            <div className="settings-title">
              <span className="settings-badge">SYSTEM CONFIG</span>
              <h2>SİSTEM & KİŞİSELLEŞTİRME AYARLARI</h2>
            </div>
            <button
              className="settings-close"
              onClick={() => setOpen(false)}
              title="Kapat (ESC)"
            >
              ✕
            </button>
          </div>

          <div className="settings-body">
            {/* 1. DİL VE SES */}
            <div className="settings-section">
              <div className="section-title">01 // DİL VE SES AYARLARI</div>

              <div className="setting-row">
                <label>Asistan Dili & Tanıma (STT):</label>
                <div className="pill-group">
                  <button
                    className={`pill ${settings.language === 'tr-TR' ? 'active' : ''}`}
                    onClick={() => updateSetting('language', 'tr-TR')}
                  >
                    Türkçe (tr-TR)
                  </button>
                  <button
                    className={`pill ${settings.language === 'en-GB' ? 'active' : ''}`}
                    onClick={() => updateSetting('language', 'en-GB')}
                  >
                    English UK (en-GB)
                  </button>
                  <button
                    className={`pill ${settings.language === 'en-US' ? 'active' : ''}`}
                    onClick={() => updateSetting('language', 'en-US')}
                  >
                    English US (en-US)
                  </button>
                </div>
              </div>

              <div className="setting-row">
                <label>Sistem Konuşma Sesi (TTS):</label>
                <select
                  value={settings.voiceName}
                  onChange={(e) => updateSetting('voiceName', e.target.value)}
                  className="settings-select"
                >
                  <option value="">Varsayılan Otomatik Ses</option>
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              <div className="setting-row">
                <label>Konuşma Hızı: {settings.voiceRate}x</label>
                <input
                  type="range"
                  min="0.7"
                  max="1.5"
                  step="0.05"
                  value={settings.voiceRate}
                  onChange={(e) =>
                    updateSetting('voiceRate', parseFloat(e.target.value))
                  }
                  className="settings-range"
                />
              </div>

              <div className="setting-row">
                <label>Ses Tonu: {settings.voicePitch}</label>
                <input
                  type="range"
                  min="0.6"
                  max="1.4"
                  step="0.05"
                  value={settings.voicePitch}
                  onChange={(e) =>
                    updateSetting('voicePitch', parseFloat(e.target.value))
                  }
                  className="settings-range"
                />
              </div>
            </div>

            {/* 2. REAKTÖR VE GÖRSEL TEMA */}
            <div className="settings-section">
              <div className="section-title">02 // ARK REAKTÖRÜ & RENK TEMASI</div>

              <div className="setting-row">
                <label>Tema Rengi Hazır Ayarları:</label>
                <div className="color-swatches">
                  {THEME_PRESETS.map((t) => (
                    <button
                      key={t.color}
                      className={`color-swatch ${settings.accentColor === t.color ? 'active' : ''}`}
                      style={{ backgroundColor: t.color }}
                      title={t.name}
                      onClick={() => updateSetting('accentColor', t.color)}
                    />
                  ))}
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => updateSetting('accentColor', e.target.value)}
                    className="custom-color-picker"
                    title="Özel Renk Seç"
                  />
                </div>
              </div>

              <div className="setting-row">
                <label>Reaktör 3D Modeli:</label>
                <div className="pill-group">
                  <button
                    className={`pill ${settings.reactorStyle === 'ring' ? 'active' : ''}`}
                    onClick={() => updateSetting('reactorStyle', 'ring')}
                  >
                    Halka (Ring)
                  </button>
                  <button
                    className={`pill ${settings.reactorStyle === 'sphere' ? 'active' : ''}`}
                    onClick={() => updateSetting('reactorStyle', 'sphere')}
                  >
                    Küre (Sphere)
                  </button>
                  <button
                    className={`pill ${settings.reactorStyle === 'wire' ? 'active' : ''}`}
                    onClick={() => updateSetting('reactorStyle', 'wire')}
                  >
                    Kafes (Wire)
                  </button>
                </div>
              </div>

              <div className="setting-row">
                <label>Reaktör Parlaklığı: {settings.reactorIntensity}x</label>
                <input
                  type="range"
                  min="0.4"
                  max="2.5"
                  step="0.1"
                  value={settings.reactorIntensity}
                  onChange={(e) =>
                    updateSetting('reactorIntensity', parseFloat(e.target.value))
                  }
                  className="settings-range"
                />
              </div>

              <div className="setting-row">
                <label>Reaktör Boyutu: {settings.reactorScale}x</label>
                <input
                  type="range"
                  min="0.5"
                  max="1.8"
                  step="0.1"
                  value={settings.reactorScale}
                  onChange={(e) =>
                    updateSetting('reactorScale', parseFloat(e.target.value))
                  }
                  className="settings-range"
                />
              </div>

              <div className="setting-row">
                <label>Dönüş Hızı: {settings.reactorSpin}x</label>
                <input
                  type="range"
                  min="0.2"
                  max="3"
                  step="0.2"
                  value={settings.reactorSpin}
                  onChange={(e) =>
                    updateSetting('reactorSpin', parseFloat(e.target.value))
                  }
                  className="settings-range"
                />
              </div>
            </div>

            {/* 3. KISAYOLLAR & BİLGİ */}
            <div className="settings-section">
              <div className="section-title">03 // KISAYOLLAR VE DENETİM</div>
              <div className="shortcuts-grid">
                <div className="shortcut-item">
                  <kbd>Ctrl + Alt + J</kbd>
                  <span>Masaüstünde Aç / Gizle (Global)</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Space</kbd>
                  <span>Uyandırma Kelimesi Olmadan Konuş</span>
                </div>
                <div className="shortcut-item">
                  <kbd>S</kbd>
                  <span>Ayarlar Panelini Aç / Kapat</span>
                </div>
                <div className="shortcut-item">
                  <kbd>G</kbd>
                  <span>Kamera & El Hareketleri (MediaPipe)</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Esc</kbd>
                  <span>Bekleme (Standby) Moduna Al</span>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-footer">
            <span className="save-status">✓ Ayarlar anında kaydedilir ve uygulanır.</span>
            <button className="done-btn" onClick={() => setOpen(false)}>
              TAMAMLA
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
