// composables/useKeybindings.ts
// Verteiler für Tastenkürzel: EIN globaler keydown-Listener für das ganze
// Spiel statt eines pro Komponente.
//
// Die Kürzel selbst stehen als KEYBINDINGS in config/constants/keybindings.ts.
// Eine Komponente meldet mit `onKeybinding(id, fn)` an, was bei ihrem Kürzel
// passieren soll, und wird beim Unmount automatisch wieder abgemeldet. Mehrere
// Anmeldungen auf dieselbe ID sind erlaubt — die HUD-Leiste hängt sich so an
// jedes Kürzel, um seine Keycap aufblitzen zu lassen, ohne die eigentliche
// Aktion zu kennen.

import { getCurrentInstance, onUnmounted, readonly, ref } from 'vue'
import { KEYBINDINGS } from '@/config/constants'
import type { KeybindDef, KeybindId } from '@/types'

type KeybindHandler = () => void

const handlers = new Map<KeybindId, Set<KeybindHandler>>()

/**
 * Zuletzt ausgelöstes Kürzel. `seq` zählt bei jedem Auslösen hoch — ohne den
 * Zähler bliebe zweimal dieselbe ID ein unveränderter Wert und die Keycap
 * blitzte beim zweiten Druck nicht mehr auf.
 */
const lastTriggered = ref<{ id: KeybindId; seq: number } | null>(null)
let triggerSeq = 0
let initialized = false

/** Eingabefelder gehören dem Nutzer — dort ist „p" ein Buchstabe, kein Kürzel. */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || typeof el.tagName !== 'string') return false
  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  return el.isContentEditable === true
}

/**
 * Das zum Ereignis passende Kürzel — oder null.
 * Strg/Meta/Alt schließen jedes Kürzel aus: das sind Browser- und
 * Systembefehle. Shift bleibt erlaubt, sonst wäre `?` nicht erreichbar.
 */
export function keybindFor(event: KeyboardEvent): KeybindDef | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null
  const pressed = event.key.toLowerCase()
  return KEYBINDINGS.find((def) => def.keys.some((k) => k.toLowerCase() === pressed)) ?? null
}

/**
 * Löst ein Kürzel aus — von der Tastatur ebenso wie vom Klick auf seine Keycap
 * in der HUD-Leiste. Die Handler-Liste wird vor dem Durchlauf kopiert: ein
 * Handler darf sich selbst abmelden (Modal schließt sich), ohne die Iteration
 * über die Menge zu zerlegen.
 */
export function triggerKeybind(id: KeybindId): void {
  lastTriggered.value = { id, seq: ++triggerSeq }
  const registered = handlers.get(id)
  if (!registered) return
  for (const fn of [...registered]) fn()
}

function onKeyDown(event: KeyboardEvent): void {
  // Gedrückt gehalten: ein Kürzel ist ein Befehl, keine Wiederholrate.
  if (event.repeat) return
  if (isTypingTarget(event.target)) return
  const def = keybindFor(event)
  if (!def) return
  const registered = handlers.get(def.id)
  if (!registered || registered.size === 0) return
  event.preventDefault()
  triggerKeybind(def.id)
}

function ensureListener(): void {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  window.addEventListener('keydown', onKeyDown)
}

/**
 * Meldet `handler` für ein Kürzel an und gibt die Abmeldung zurück. Innerhalb
 * einer Komponente wird zusätzlich beim Unmount abgemeldet.
 */
export function onKeybinding(id: KeybindId, handler: KeybindHandler): () => void {
  ensureListener()
  let registered = handlers.get(id)
  if (!registered) {
    registered = new Set()
    handlers.set(id, registered)
  }
  registered.add(handler)

  let released = false
  const release = () => {
    if (released) return
    released = true
    handlers.get(id)?.delete(handler)
  }

  if (getCurrentInstance()) onUnmounted(release)
  return release
}

export function useKeybindings() {
  ensureListener()
  return {
    keybindings: KEYBINDINGS,
    lastTriggered: readonly(lastTriggered),
    onKeybinding,
    triggerKeybind,
  }
}

/** Nur für Tests: setzt Listener-Registrierung und Handler zurück. */
export function __resetKeybindingsForTest(): void {
  handlers.clear()
  lastTriggered.value = null
  triggerSeq = 0
  if (initialized && typeof window !== 'undefined') window.removeEventListener('keydown', onKeyDown)
  initialized = false
}
