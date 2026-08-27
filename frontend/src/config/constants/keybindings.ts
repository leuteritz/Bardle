// Tastenkürzel — Registry und Anzeige-Timings.
//
// EIN Eintrag in KEYBINDINGS genügt für ein neues Kürzel: die schwebende
// Leiste (KeybindHud) und das Controls-Panel lesen beide von hier, und
// `useKeybindings` verteilt das Tastenereignis. Zu tun bleibt nur ein
// `onKeybinding('<id>', …)` an der Stelle, die die Aktion ausführt.

import type { KeybindCategory, KeybindDef } from '@/types'

/** Reihenfolge = Reihenfolge der Abschnitte im Controls-Panel. */
export const KEYBIND_CATEGORIES: readonly KeybindCategory[] = [
  { id: 'game', label: 'Game', icon: 'lucide:orbit' },
  { id: 'interface', label: 'Interface', icon: 'lucide:layout-panel-left' },
] as const

export const KEYBINDINGS: readonly KeybindDef[] = [
  // Die vier Bard-Fähigkeiten. `inHud: false` — sie haben mit der
  // Fähigkeitenleiste über dem Scoreboard bereits ihre eigene, weit größere
  // Anzeige; in der Keycap-Zeile stünden sie ein zweites Mal.
  {
    id: 'abilityQ',
    keys: ['q'],
    cap: 'Q',
    label: 'Cosmic Binding',
    description:
      'Fires a bolt through the orbit: it strikes up to two planet bosses, damages both and holds their enrage clock. With no boss out there the bolt rebounds off the sun and knocks a burst of chimes loose.',
    icon: 'game-icons:lightning-arc',
    category: 'game',
    inHud: false,
  },
  {
    id: 'abilityW',
    keys: ['w'],
    cap: 'W',
    label: "Caretaker's Shrine",
    description:
      'Sets a shrine on the sun: restores a quarter of its health, lifts the chime penalty a lost boss left behind, and lets production ring on above normal for a while.',
    icon: 'game-icons:crystal-shrine',
    category: 'game',
    inHud: false,
  },
  {
    id: 'abilityE',
    keys: ['e'],
    cap: 'E',
    label: 'Magical Journey',
    description:
      'Opens a corridor through time. Running expeditions and the sun phase jump ahead, every star in the orbit is granted extra time, and clicks pay triple while the corridor stands.',
    icon: 'game-icons:magic-portal',
    category: 'game',
    inHud: false,
  },
  {
    id: 'abilityR',
    keys: ['r'],
    cap: 'R',
    label: 'Tempered Fate',
    description:
      'The ultimate. Everything out there holds still — enrage clocks and star timers alike — while your orbit keeps swinging for triple damage. When the stasis breaks, every boss takes the parting blow.',
    icon: 'game-icons:time-trap',
    category: 'game',
    inHud: false,
  },
  {
    id: 'pause',
    keys: ['p'],
    cap: 'P',
    label: 'Pause',
    description:
      'Freezes the cosmos exactly as clicking outside the window does — orbit, battles and every timer hold still. Press it again, hit Escape or click anywhere to return.',
    icon: 'lucide:pause',
    category: 'game',
    inHud: true,
  },
  {
    id: 'shop',
    keys: ['b'],
    cap: 'B',
    label: 'Shop',
    description:
      'Opens the champion and item shop. From another tab it jumps there; on the shop tab it closes the profile again — as does Escape.',
    icon: 'lucide:store',
    category: 'interface',
    inHud: true,
  },
  {
    id: 'road',
    keys: ['k'],
    cap: 'K',
    label: 'Tree',
    description:
      'Opens the Skill Tree and takes the camera out to The Wandering. The meep road lies beyond the sun, and at full zoom-out it is too small to aim at by hand.',
    icon: 'game-icons:journey',
    category: 'interface',
    inHud: true,
  },
  // `inHud: false`: das Kürzel wirkt nur im Skill-Tree-Reiter und steht dort in
  // seiner eigenen Zeile unten links im Graphen.
  {
    id: 'forgeRecenter',
    keys: ['c'],
    cap: 'C',
    label: 'Center',
    description:
      'Brings the Star Forge camera back to the heart of the net and returns the zoom to its default. Works while the Skill Tree is open; a pinned node stays pinned — Escape releases it.',
    icon: 'lucide:crosshair',
    category: 'interface',
    inHud: false,
  },
  {
    id: 'eventLog',
    keys: ['l'],
    cap: 'L',
    label: 'Event',
    description:
      'Folds the event log in the top-right corner open or shut. Five tabs, a filter and the last 300 things that happened out there; Copy hands the open tab to the clipboard.',
    icon: 'lucide:scroll-text',
    category: 'interface',
    inHud: true,
  },
  {
    id: 'controls',
    keys: ['?'],
    cap: '?',
    label: 'Controls',
    description: 'Opens this list of every shortcut. Works from anywhere in the game.',
    icon: 'lucide:keyboard',
    category: 'interface',
    inHud: false,
  },
] as const

/** Beschriftung der Pause-Keycap, solange das Spiel steht. */
export const KEYBIND_RESUME_LABEL = 'Resume'

/**
 * Beschriftung der Escape-Keycap im Pause-Hinweis. Escape steht bewusst NICHT
 * in KEYBINDINGS: sie schließt im ganzen Spiel das jeweils oberste Overlay und
 * gehört damit keinem einzelnen Befehl — in der Kürzel-Leiste hätte sie eine
 * feste Bedeutung vorgetäuscht, die sie nicht hat.
 */
export const PAUSE_ESCAPE_CAP = 'Esc'

/** Wie lange eine Keycap nach dem Auslösen gedrückt gezeichnet bleibt. */
export const KEYBIND_FLASH_MS = 220

/** Verzögerung, bis die HUD-Leiste nach dem Laden hereinfährt. */
export const KEYBIND_HUD_REVEAL_MS = 900
