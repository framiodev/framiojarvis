import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store'

/**
 * Rotating example commands, shown only while idle.
 *
 * A voice interface has no menus — nothing tells you what it can do. This is
 * the affordance. It disappears the moment JARVIS is doing anything, so it
 * never competes with the answer.
 *
 * Each line is phrased the way you'd actually say it, not as a feature name.
 */
function isTurkish(): boolean {
  try {
    const raw = localStorage.getItem('framio_jarvis_settings')
    if (raw) return JSON.parse(raw).language?.startsWith('tr')
  } catch {}
  return true
}

const EXAMPLES_EN = [
  'what happened in AI this week',
  'generate an image of the Mark Seven suit',
  'take a screenshot of my phone',
  "what's on my calendar tomorrow",
  'search for the best coffee near me',
  'open my GitHub notifications',
  "what's the weather looking like",
]

const EXAMPLES_TR = [
  'bu hafta yapay zekada neler oldu',
  'Mark 7 zırhının bir resmini üret',
  'bugün hava durumu nasıl',
  'bana en son haberleri özetle',
  'yakınımdaki en iyi kafeleri ara',
  'ekranı temizle',
  'reaktör rengini kırmızı yap',
]

const ROTATE_MS = 4200

export function Suggestions() {
  const phase = useStore((s) => s.phase)
  const turns = useStore((s) => s.turns)
  const [i, setI] = useState(0)
  const turkish = isTurkish()
  const list = turkish ? EXAMPLES_TR : EXAMPLES_EN

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % list.length), ROTATE_MS)
    return () => clearInterval(id)
  }, [list.length])

  // Only while genuinely idle, and only until the first exchange — once the
  // user knows how it works, the prompt is just clutter.
  if (phase !== 'dormant' || turns.length > 0) return null

  return (
    <div className="suggest">
      <span className="suggest-lead">{turkish ? 'deneyin:' : 'try'}</span>
      <AnimatePresence mode="wait">
        <motion.span
          key={i}
          className="suggest-text"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
        >
          {turkish ? `“hey jarvis, ${list[i % list.length]}”` : `“hey jarvis, ${list[i % list.length]}”`}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}
