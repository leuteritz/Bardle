import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import {
  keybindFor,
  onKeybinding,
  triggerKeybind,
  __resetKeybindingsForTest,
} from '@/composables/system/useKeybindings'
import { useGamePause } from '@/composables/system/useGamePause'
import { KEYBINDINGS, KEYBIND_CATEGORIES } from '@/config/constants'

function press(key: string, init: KeyboardEventInit = {}, target?: EventTarget) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  ;(target ?? window).dispatchEvent(event)
  return event
}

describe('KEYBINDINGS — Registry', () => {
  it('has unique ids, caps and keys', () => {
    const ids = KEYBINDINGS.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)

    const caps = KEYBINDINGS.map((b) => b.cap)
    expect(new Set(caps).size).toBe(caps.length)

    const keys = KEYBINDINGS.flatMap((b) => b.keys.map((k) => k.toLowerCase()))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('every binding carries a known category and a prefixed icon', () => {
    const known = new Set(KEYBIND_CATEGORIES.map((c) => c.id))
    for (const bind of KEYBINDINGS) {
      expect(known.has(bind.category), `${bind.id} has an unknown category`).toBe(true)
      expect(
        bind.icon.startsWith('lucide:') || bind.icon.startsWith('game-icons:'),
        `${bind.icon} misses the set prefix`,
      ).toBe(true)
      expect(bind.keys.length).toBeGreaterThan(0)
      expect(bind.cap.length).toBeGreaterThan(0)
    }
  })

  it('every category holds at least one binding', () => {
    for (const cat of KEYBIND_CATEGORIES) {
      expect(
        KEYBINDINGS.some((b) => b.category === cat.id),
        `${cat.id} is empty`,
      ).toBe(true)
    }
  })
})

describe('keybindFor', () => {
  it('matches regardless of letter case', () => {
    expect(keybindFor(new KeyboardEvent('keydown', { key: 'P' }))?.id).toBe('pause')
    expect(keybindFor(new KeyboardEvent('keydown', { key: 'p' }))?.id).toBe('pause')
  })

  it('ignores anything held together with ctrl, meta or alt', () => {
    expect(keybindFor(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true }))).toBeNull()
    expect(keybindFor(new KeyboardEvent('keydown', { key: 'p', metaKey: true }))).toBeNull()
    expect(keybindFor(new KeyboardEvent('keydown', { key: 'p', altKey: true }))).toBeNull()
  })

  it('still matches with shift held — `?` is not reachable otherwise', () => {
    expect(keybindFor(new KeyboardEvent('keydown', { key: '?', shiftKey: true }))?.id).toBe(
      'controls',
    )
  })

  it('returns null for keys nobody claimed', () => {
    // Bewusst eine Taste, die kein Kürzel je beanspruchen wird — `q` war es
    // bis zu den Bard-Fähigkeiten, die seither Q/W/E/R belegen.
    expect(keybindFor(new KeyboardEvent('keydown', { key: 'y' }))).toBeNull()
  })

  it('maps the four ability slots to their bard abilities', () => {
    expect(keybindFor(new KeyboardEvent('keydown', { key: 'q' }))?.id).toBe('abilityQ')
    expect(keybindFor(new KeyboardEvent('keydown', { key: 'w' }))?.id).toBe('abilityW')
    expect(keybindFor(new KeyboardEvent('keydown', { key: 'e' }))?.id).toBe('abilityE')
    expect(keybindFor(new KeyboardEvent('keydown', { key: 'r' }))?.id).toBe('abilityR')
  })
})

describe('onKeybinding', () => {
  beforeEach(() => {
    __resetKeybindingsForTest()
  })

  afterEach(() => {
    __resetKeybindingsForTest()
    document.body.innerHTML = ''
  })

  it('runs the handler on its key and prevents the default', () => {
    const spy = vi.fn()
    onKeybinding('pause', spy)
    const event = press('p')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('runs every handler registered for the same id', () => {
    const a = vi.fn()
    const b = vi.fn()
    onKeybinding('pause', a)
    onKeybinding('pause', b)
    press('p')
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('stays silent after the returned release was called', () => {
    const spy = vi.fn()
    const release = onKeybinding('pause', spy)
    release()
    const event = press('p')
    expect(spy).not.toHaveBeenCalled()
    // Ohne Handler bleibt die Taste dem Browser überlassen.
    expect(event.defaultPrevented).toBe(false)
  })

  it('keeps out of text fields', () => {
    const spy = vi.fn()
    onKeybinding('pause', spy)

    const input = document.createElement('input')
    document.body.appendChild(input)
    press('p', {}, input)
    expect(spy).not.toHaveBeenCalled()

    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    Object.defineProperty(editable, 'isContentEditable', { value: true })
    document.body.appendChild(editable)
    press('p', {}, editable)
    expect(spy).not.toHaveBeenCalled()
  })

  it('ignores auto-repeat while the key is held', () => {
    const spy = vi.fn()
    onKeybinding('pause', spy)
    press('p', { repeat: true })
    expect(spy).not.toHaveBeenCalled()
  })

  it('runs the same handlers when triggered by click', () => {
    const spy = vi.fn()
    onKeybinding('pause', spy)
    triggerKeybind('pause')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('survives a handler that unregisters itself', () => {
    const spy = vi.fn()
    const release = onKeybinding('pause', () => {
      release()
      spy()
    })
    expect(() => press('p')).not.toThrow()
    expect(spy).toHaveBeenCalledTimes(1)
    press('p')
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('useGamePause', () => {
  beforeEach(() => {
    // jsdom meldet das Fenster als unfokussiert — dort wäre das Spiel per
    // Definition dauerpausiert. Für die Prüfung der MANUELLEN Pause muss die
    // zweite Quelle deshalb erst stillgelegt werden.
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    const { resumeGame } = useGamePause()
    window.dispatchEvent(new FocusEvent('focus'))
    resumeGame()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('toggles the manual pause', () => {
    const { isPaused, isManuallyPaused, togglePause } = useGamePause()
    expect(isPaused.value).toBe(false)

    togglePause()
    expect(isPaused.value).toBe(true)
    expect(isManuallyPaused.value).toBe(true)

    togglePause()
    expect(isPaused.value).toBe(false)
    expect(isManuallyPaused.value).toBe(false)
  })

  it('is the same instance for every caller', async () => {
    const first = useGamePause()
    const second = useGamePause()
    first.pauseGame()
    await nextTick()
    expect(second.isPaused.value).toBe(true)
    second.resumeGame()
    expect(first.isPaused.value).toBe(false)
  })
})
