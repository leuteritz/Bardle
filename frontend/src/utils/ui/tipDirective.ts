/**
 * `v-tip` — die Kurzform der Tooltip-Sprache, dort wo bisher ein natives
 * `title` stand.
 *
 * Warum überhaupt: der Browser zeigt `title` als graue Systemblase, die eine
 * halbe Sekunde zu spät kommt und sich nicht gestalten lässt. Zwei Stellen im
 * Projekt haben das schon einzeln abgelöst und den Grund notiert — „two
 * tooltips for one hover is one too many, and the OS one arrives half a second
 * late" (`SigilDetailsPanel`).
 *
 * EINE Instanz für das ganze Dokument, nicht eine je Element: die Direktive
 * sitzt an hunderten Stellen, und ein Kärtchen je Anker wären hunderte Knoten
 * für einen Zustand, den immer nur einer gleichzeitig hat. Dasselbe Muster
 * trägt `ForgeRowTooltip` für fünfundvierzig Zeilen.
 *
 * Sie fängt den Zeiger NICHT (`pointer-events: none` aus `.tip`) — ein
 * Kurz-Tooltip ist nie bedienbar, und ein Panel, das den Hover schluckt, den es
 * beschreibt, flackert.
 *
 * NICHT geeignet für Elemente, die pro Frame wandern (Orbit, Void, Drifter,
 * Landfall): Chrome meldet dort zwei `mouseover` ohne das `mouseout` dazwischen,
 * und die Karte bliebe stehen. Solche Körper tragen ihre eigene HUD-Karte.
 */
import type { Directive } from 'vue'
import { placeTip } from './tipAnchor'
import {
  TIP_DIRECTIVE_OPEN_DELAY_MS,
  TIP_DIRECTIVE_GAP_PX,
  TIP_DIRECTIVE_VIEWPORT_MARGIN_PX,
  TIP_DIRECTIVE_CARET_INSET_PX,
} from '@/config/constants'

export interface TipValue {
  /** Der Satz. Leer heißt: keine Karte. */
  text: string
  /** Kleine Versalzeile darüber — sagt, WOVON die Rede ist. */
  label?: string
  /** Zugehörigkeitsfarbe für Leiste und Pfeil. */
  color?: string
}

type TipBinding = string | TipValue | null | undefined

interface TipHost extends HTMLElement {
  __tip?: TipBinding
}

let panel: HTMLElement | null = null
let caretEl: HTMLElement | null = null
let accentEl: HTMLElement | null = null
let labelEl: HTMLElement | null = null
let textEl: HTMLElement | null = null

let openTimer: ReturnType<typeof setTimeout> | null = null
let shownFor: TipHost | null = null

/**
 * Ein natives `title` war nicht nur eine Blase, es war auch ein NAME: bei einem
 * Knopf, der nur ein Glyph zeigt, der einzige. Er darf mit der Blase nicht
 * verschwinden.
 *
 * Nur bei bedienbaren Elementen und nur, wenn keines schon da ist — bei einer
 * Anzeige mit eigenem Text wäre `aria-label` eine Verschlechterung: es ERSETZT
 * den Inhalt, statt ihn zu ergänzen.
 */
const NAMED = 'button, a, input, select, textarea, [role="button"], [tabindex]'

function syncAriaLabel(el: TipHost, val: TipValue | null): void {
  if (!val || !el.matches(NAMED)) return
  if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) return
  el.setAttribute('aria-label', val.label ? `${val.label}: ${val.text}` : val.text)
}

function normalize(v: TipBinding): TipValue | null {
  if (v === null || v === undefined) return null
  const val = typeof v === 'string' ? { text: v } : v
  return val.text ? val : null
}

function build(): void {
  if (panel) return
  panel = document.createElement('div')
  panel.className = 'tip tip--v'
  panel.setAttribute('role', 'tooltip')
  panel.style.display = 'none'

  accentEl = document.createElement('span')
  accentEl.className = 'tip-accent'

  caretEl = document.createElement('span')
  caretEl.className = 'tip-caret'

  labelEl = document.createElement('span')
  labelEl.className = 'tip-v-label'

  textEl = document.createElement('span')
  textEl.className = 'tip-v-text'

  panel.append(caretEl, accentEl, labelEl, textEl)
  document.body.appendChild(panel)
}

function hide(): void {
  if (openTimer) {
    clearTimeout(openTimer)
    openTimer = null
  }
  shownFor = null
  if (panel) panel.style.display = 'none'
}

function show(el: TipHost): void {
  const val = normalize(el.__tip)
  if (!val || !el.isConnected) return
  build()
  if (!panel || !caretEl || !labelEl || !textEl) return

  labelEl.textContent = val.label ?? ''
  labelEl.style.display = val.label ? '' : 'none'
  textEl.textContent = val.text
  panel.style.setProperty('--tip-color', val.color ?? '')

  // Ausserhalb des Bildes abstellen, damit die Karte gemessen werden kann,
  // ohne dass ein Sprung sichtbar wird.
  panel.style.display = 'flex'
  panel.style.left = '-9999px'
  panel.style.top = '0px'

  const r = el.getBoundingClientRect()
  if (!r.width && !r.height) {
    hide()
    return
  }

  const p = placeTip({
    anchor: r,
    tipW: panel.offsetWidth,
    tipH: panel.offsetHeight,
    gap: TIP_DIRECTIVE_GAP_PX,
    margin: TIP_DIRECTIVE_VIEWPORT_MARGIN_PX,
    caretInset: TIP_DIRECTIVE_CARET_INSET_PX,
  })

  panel.style.left = `${p.left}px`
  panel.style.top = `${p.top}px`
  panel.style.setProperty('--caret-x', `${p.caretX}px`)
  caretEl.className = `tip-caret tip-caret--${p.placement === 'top' ? 'down' : 'up'}`
  shownFor = el
}

function onEnter(e: Event): void {
  const el = e.currentTarget as TipHost
  if (openTimer) clearTimeout(openTimer)
  openTimer = setTimeout(() => {
    openTimer = null
    show(el)
  }, TIP_DIRECTIVE_OPEN_DELAY_MS)
}

/* Rollen und Grössenwechsel ziehen den Anker unter der Karte weg — sie schliesst
   dann, statt neben etwas zu stehen, das sie nicht mehr beschreibt. */
let globalsBound = false
function bindGlobals(): void {
  if (globalsBound) return
  globalsBound = true
  window.addEventListener('scroll', hide, true)
  window.addEventListener('resize', hide)
}

export const vTip: Directive<TipHost, TipBinding> = {
  mounted(el, binding) {
    el.__tip = binding.value
    const val = normalize(binding.value)
    syncAriaLabel(el, val)
    if (!val) return
    bindGlobals()
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', hide)
    el.addEventListener('focusin', onEnter)
    el.addEventListener('focusout', hide)
  },
  updated(el, binding) {
    el.__tip = binding.value
    syncAriaLabel(el, normalize(binding.value))
    // Steht die Karte gerade für dieses Element, trägt sie den neuen Wortlaut
    // sofort — sonst zeigte sie bis zum nächsten Hover den alten.
    if (shownFor === el) show(el)
  },
  beforeUnmount(el) {
    if (shownFor === el) hide()
    el.removeEventListener('mouseenter', onEnter)
    el.removeEventListener('mouseleave', hide)
    el.removeEventListener('focusin', onEnter)
    el.removeEventListener('focusout', hide)
  },
}
