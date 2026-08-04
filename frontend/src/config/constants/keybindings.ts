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
      'Opens the Bard profile on the shop tab. From another tab it jumps to the shop; on the shop tab it closes the profile again — as does Escape.',
    icon: 'lucide:store',
    category: 'interface',
    inHud: true,
  },
  {
    id: 'tree',
    keys: ['k'],
    cap: 'K',
    label: 'Skills',
    description:
      'Opens the Bard profile on the Meep skill tree. Same behaviour as the shop key: it jumps there from any other tab and closes the profile when the tree is already up.',
    icon: 'lucide:network',
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
