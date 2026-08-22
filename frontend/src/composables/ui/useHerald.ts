import { ref, readonly, type DeepReadonly } from 'vue'
import {
  HERALD_DISPLAY_MS,
  HERALD_QUEUE_MAX,
  HERALD_RECEIPT_HOLD_MS,
  HERALD_RECEIPT_MERGE_WINDOW_MS,
  HERALD_RECEIPT_STACK_MAX,
} from '@/config/constants'
import type { HeraldDelta, HeraldReceiptKind } from '@/types'

/**
 * Der Herold hat ZWEI Spuren, und die Trennung ist inhaltlich, nicht kosmetisch:
 *
 * - **Zeremonie** (`announce`) — was der Spieler ERREICHT hat. Selten, groß,
 *   mittig, eine nach der anderen.
 * - **Quittung** (`announceReceipt`) — was er AUSGELÖST hat. Häufig, kompakt,
 *   gestapelt, gleichartiges verdichtet sich zu einer Karte mit Zähler.
 *
 * Beide Spuren hängen im Overlay in derselben Flex-Achse und können sich deshalb
 * konstruktiv nie überlappen. Sie wissen im Code nichts voneinander: eine
 * Quittung fasst `queue`/`current` nie an, eine Zeremonie `receipts` nie.
 */
export type HeraldKind = 'warp' | 'champion' | 'rankup' | 'chronicle' | 'omen' | 'mission'

/** Fully-resolved presentation payload — the composable stays purely mechanical
 *  (queue + preempt + timer); the caller supplies everything the banner shows. */
export interface HeraldPayload {
  kind: HeraldKind
  /** Small letter-spaced label above the headline (e.g. "WARP COMPLETE"). */
  eyebrow: string
  /** The big line (galaxy name / champion name / rank). */
  headline: string
  /** Muted line under the headline. */
  subline?: string
  /** Portrait or rank-emblem image path. */
  imageSrc?: string
  /** Iconify `game-icons:*` name, shown in a medallion when no image is given. */
  icon?: string
  /** Accent color as an "r, g, b" triple driving glow + hairlines. */
  accent: string
  /** Round the image (champion portrait) vs. contain it (rank emblem). */
  round?: boolean
  /** How long this banner holds, in ms. Defaults to HERALD_DISPLAY_MS. */
  holdMs?: number
}

/**
 * Eine Quittung. Die Kopfzeile kommt aus `HERALD_RECEIPT_KINDS`, deshalb trägt
 * `headline` das SUBJEKT und nicht den Satz: `'Ahri'`, nicht `'Ahri recruited!'`.
 */
export interface HeraldReceiptPayload {
  /** Bestimmt Sigil, Akzent und Kopfzeile aus HERALD_RECEIPT_KINDS. */
  kind: HeraldReceiptKind
  /** Die eine Zeile, die der Spieler liest. */
  headline: string
  /** Überschreibt das Label der Art ('BRANCH · LV 3' statt 'Forged'). */
  eyebrow?: string
  subline?: string
  /** Bild STATT Sigil (Champion-Portrait, Skin, Item-Kunst). */
  portraitSrc?: string
  /**
   * Bild rund beschneiden. Default `true` — die meisten Bilder hier sind
   * Championgesichter. Ein Item, ein Relikt oder ein Emblem setzt `false` und
   * wird eingepasst statt beschnitten, sonst fehlen ihm die Ecken.
   */
  imageRound?: boolean
  /** Eigenes Glyph statt des Sigils der Art (Item, Drifter, Forge-Knoten). */
  icon?: string
  /** Eigene Farbe als "r, g, b" statt des Akzents der Art. */
  accent?: string
  delta?: HeraldDelta
  /**
   * Was „gleichartig" heißt. Default: `kind`.
   *
   * Namensräume mit SCHRÄGSTRICH trennen (`levelup/planet/3`), nie mit
   * Doppelpunkt: `perk:meep` hat genau die Form eines Iconify-Namens, und der
   * Sweep in `__tests__/config/icons.spec.ts` liest ihn als Verweis auf ein
   * unbekanntes Set.
   */
  mergeKey?: string
  /** false = die Karte trägt nie einen Zähler (Zustands-Umschalter). Default true. */
  countable?: boolean
  /** Standzeit; Default HERALD_RECEIPT_HOLD_MS. */
  holdMs?: number
}

interface HeraldItem extends HeraldPayload {
  id: number
}

interface HeraldReceiptItem extends HeraldReceiptPayload {
  id: number
  mergeKey: string
  /** Zahl im ×-Chip. 1 = kein Chip. */
  count: number
  /** Hochzähler für die Neustart-Keys von Chip und Restzeitleiste. */
  seq: number
  /** Wanduhr-Stempel der GEBURT — entscheidet über das Verdichtungsfenster. */
  bornAt: number
}

/** Was die Karte zu sehen bekommt: der Eintrag, wie `receipts` ihn herausgibt. */
export type HeraldReceiptView = DeepReadonly<HeraldReceiptItem>

// Module-global singleton state — one herald stream shared across the app,
// exactly like useEventLog.
const queue = ref<HeraldItem[]>([])
const current = ref<HeraldItem | null>(null)
const receipts = ref<HeraldReceiptItem[]>([])
let idCounter = 0
let displayTimer: ReturnType<typeof setTimeout> | null = null
// Die Handles liegen ABSICHTLICH außerhalb des ref: sie sind kein Anzeigezustand
// und hätten in einem reaktiven Objekt nichts zu suchen. Höchstens drei.
const receiptTimers = new Map<number, ReturnType<typeof setTimeout>>()

// ── Spur A: Zeremonie ────────────────────────────────────────────────────────

function pump() {
  if (current.value || queue.value.length === 0) return
  current.value = queue.value.shift() ?? null
  if (!current.value) return
  displayTimer = setTimeout(() => {
    current.value = null
    displayTimer = null
    pump()
  }, current.value.holdMs ?? HERALD_DISPLAY_MS)
}

function announce(payload: HeraldPayload) {
  // Milestones play sequentially — each gets its full display window. A batch
  // flushed together (e.g. warp + newly-unlocked champion at a galaxy boundary)
  // queues in order instead of stomping one another; the oldest is dropped once
  // the queue is full so a burst can never grow unbounded.
  if (queue.value.length >= HERALD_QUEUE_MAX) queue.value.shift()
  queue.value.push({ ...payload, id: ++idCounter })
  pump()
}

// ── Spur B: Quittungen ───────────────────────────────────────────────────────

/**
 * Standzeit je Karte, von vorn.
 *
 * Wanduhr, nicht `gameTimeout()`: der Rückruf ändert KEINEN Spielzustand — er
 * nimmt einen Eintrag aus einem UI-Feld, kein Store, kein Save. Und die Frist
 * schützt die Lesezeit des Spielers, die real vergeht; unter Zeitraffer stünde
 * die Quittung bei Faktor 100 ganze 26 ms. Dieselbe Begründung wie bei
 * `BADGE_HERALD_COOLDOWN_MS`.
 */
function armReceipt(item: HeraldReceiptItem) {
  const running = receiptTimers.get(item.id)
  if (running) clearTimeout(running)
  receiptTimers.set(
    item.id,
    setTimeout(() => dropReceipt(item.id), item.holdMs ?? HERALD_RECEIPT_HOLD_MS),
  )
}

function dropReceipt(id: number) {
  const running = receiptTimers.get(id)
  if (running) clearTimeout(running)
  receiptTimers.delete(id)
  receipts.value = receipts.value.filter((r) => r.id !== id)
}

/** Gleiche Einheit summiert; eine andere ersetzt (den Rest erzählt der Zähler). */
function mergeDelta(prev?: HeraldDelta, next?: HeraldDelta): HeraldDelta | undefined {
  if (!next) return prev
  if (!prev) return next
  if (next.sum === false || prev.unit !== next.unit) return next
  return { ...next, value: prev.value + next.value }
}

/**
 * Eine Quittung für etwas, das der Spieler gerade getan hat.
 *
 * Trifft sie innerhalb des Verdichtungsfensters auf eine Karte gleichen
 * Schlüssels, wird diese aktualisiert statt eine zweite zu bauen: der Zähler
 * steigt, das Delta summiert sich, der jüngste Wortlaut gewinnt, die Standzeit
 * beginnt von vorn. Das ist die Antwort auf „Buy Max" und auf jeden Dauerklick —
 * ohne sie sähe der Spieler von zwölf Ergebnissen nur das letzte.
 *
 * Eine Quittung wird nie verworfen, ohne gezeigt worden zu sein, und sie
 * verdrängt niemals eine Zeremonie: die beiden Spuren teilen sich kein Pixel.
 */
function announceReceipt(payload: HeraldReceiptPayload) {
  const key = payload.mergeKey ?? payload.kind
  // Wanduhr — dasselbe Argument wie bei armReceipt().
  const now = Date.now()
  const hit = receipts.value.find(
    (r) => r.mergeKey === key && now - r.bornAt < HERALD_RECEIPT_MERGE_WINDOW_MS,
  )

  if (hit) {
    if (payload.countable !== false) hit.count++
    hit.seq++
    hit.headline = payload.headline
    hit.subline = payload.subline
    if (payload.eyebrow !== undefined) hit.eyebrow = payload.eyebrow
    if (payload.icon !== undefined) hit.icon = payload.icon
    if (payload.accent !== undefined) hit.accent = payload.accent
    if (payload.portraitSrc !== undefined) hit.portraitSrc = payload.portraitSrc
    if (payload.imageRound !== undefined) hit.imageRound = payload.imageRound
    hit.delta = mergeDelta(hit.delta, payload.delta)
    armReceipt(hit)
    return
  }

  if (receipts.value.length >= HERALD_RECEIPT_STACK_MAX) {
    const oldest = receipts.value[0]
    if (oldest) dropReceipt(oldest.id)
  }
  // push, nicht unshift: eine auflaufende Serie wächst nur in freien Raum und
  // rührt keine bestehende Karte an.
  const item: HeraldReceiptItem = {
    ...payload,
    id: ++idCounter,
    mergeKey: key,
    count: 1,
    seq: 0,
    bornAt: now,
  }
  receipts.value.push(item)
  armReceipt(item)
}

/**
 * Ein Nebengeräusch, keine Handlung — eine Notify-Marke ist aufgetaucht und sagt
 * es einmal.
 *
 * Läuft oder wartet gerade eine Zeremonie, passiert schlicht nichts. Das ist
 * eine LÄRM-Regel, keine Platz-Regel: seit die Quittungen ihre eigene Spur
 * haben, könnte der Hinweis neben einem WARP COMPLETE stehen, ohne es zu
 * verdecken — er soll es nur nicht. Verloren geht dabei nichts, die Marke, für
 * die er spricht, bleibt ohnehin sichtbar.
 */
function announceAmbient(payload: HeraldReceiptPayload) {
  if (current.value || queue.value.length > 0) return
  announceReceipt(payload)
}

function reset() {
  queue.value = []
  current.value = null
  if (displayTimer) {
    clearTimeout(displayTimer)
    displayTimer = null
  }
  receipts.value = []
  for (const timer of receiptTimers.values()) clearTimeout(timer)
  receiptTimers.clear()
}

export function useHerald() {
  return {
    current: readonly(current),
    receipts: readonly(receipts),
    announce,
    announceReceipt,
    announceAmbient,
    reset,
  }
}
