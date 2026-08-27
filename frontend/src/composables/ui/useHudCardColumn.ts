import { computed, ref, watch, type ComputedRef } from 'vue'
import { useVoidStore } from '@/stores/world/voidStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useOmenStore } from '@/stores/progression/omenStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useUiStore } from '@/stores/core/uiStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { useLandfallStore } from '@/stores/world/landfallStore'
import { getVoidRift } from '@/config/world/void'
import { getDrifter } from '@/config/world/drifters'
import { getLandfall } from '@/config/world/landfalls'
import { AUGMENTS } from '@/config/economy/augments'
import { augmentIcon } from '@/utils/game/rolledIcons'
import { splitDuration } from '@/utils/ui/format'
import { landfallAcceptsTap } from '@/utils/game/landfalls'
import { gameNow } from '@/utils/game/gameClock'
import {
  drifterField,
  drifterRevealProgress,
  measuredFieldInsets,
} from '@/utils/orbit/drifterPath'
import { HUD_CARD_RANK, orderHudCards, pickHudCardFocus } from '@/utils/ui/hudCardFocus'
import { useMissionFace } from '@/composables/ui/useMissionFace'
import {
  AUGMENT_RARITY_COLOR,
  AUTO_PICK_ICON,
  AUTO_PICK_TOAST_MS,
  AUTO_PICK_URGENT_MS,
  DRIFTER_CARD_ICON,
  DRIFTER_CARD_RESULT_MS,
  DRIFTER_CARD_URGENT_MS,
  DRIFTER_FADE_IN_FRAC,
  DRIFTER_RARITY_COLOR,
  HUD_CARD_TICK_MS,
  HUD_CARD_TIGHT_MIN_FOLDED,
  LANDFALL_ACCENT_HEX,
  VOID_CARD_ICON,
  VOID_CARD_RESULT_MS,
  VOID_SEVERITY_COLOR,
  VOID_SEVERITY_LABEL,
  VOID_URGENT_FRAC,
} from '@/config/constants'
import type { DrifterDef, HudCardCandidate, HudCardFold, HudCardId } from '@/types'

/**
 * Der Zustand der HUD-Kartenspalte oben links — wer steht, wer hat den Fokus,
 * und was eine gefaltete Zeile zeigt.
 *
 * Vorher rechnete jede der sechs Karten das für sich: sechs `ResizeObserver`,
 * fünf Custom Properties am `documentElement` und eine `max()`-Kette über alle
 * Vorgänger, die in jeder Karte UND in ihrem 2400er Media-Block noch einmal
 * stand. Die Kürzung dieser Kette ist zweimal als Bug aufgeschlagen (Omen- und
 * Drifter-Karte lagen ab 2400 px auf der Riss-Karte).
 *
 * Hier steht das einmal. Die Spalte ist ein Container, die Stapelung macht Flex,
 * und das Nachrücken der FLIP der TransitionGroup.
 *
 * EINE Uhr für alles: vorher liefen zwei 100-ms-Ticker (Void, Drifter) und ein
 * dritter auf 200 ms (Auto-Pick). Präzedenz ist `useVoyageAtlas` — die EINE Uhr
 * des Voyages-Reiters.
 *
 * KEINE Timer. Jeder Nachlauf ist eine Frist, gegen die der Takt prüft; ein
 * `setTimeout` je Zustandswechsel war der Grund, warum die Void-Karte auf null
 * Sekunden stehenblieb, wenn das Feld ohne Ausgang geräumt wurde.
 */

type VoidCardState = 'inbound' | 'slain' | 'impact'
type DrifterCardState = 'inbound' | 'collected' | 'escaped'

export interface VoidCardView {
  defId: string
  state: VoidCardState
  /** Weg zur Sonne, 0..1 — der Fußbalken FÜLLT sich. */
  progress: number
  remainingMs: number
  remainingSeconds: number
  hpRatio: number
  /** Wie viele insgesamt unterwegs sind. */
  swarm: number
  urgent: boolean
  color: string
  severityColor: string
  severityLabel: string
}

export interface DrifterCardView {
  defId: string
  state: DrifterCardState
  remainingMs: number
  remainingSeconds: number
  /** Anteil des FANGFENSTERS, der noch übrig ist. */
  progress: number
  hitsLeft: number
  urgent: boolean
  color: string
  rarityColor: string
}

export interface AutoPickCardView {
  id: string
  seq: number
  remainingMs: number
  remainingSeconds: number
  urgent: boolean
  ratio: number
  color: string
  icon: string
}

export interface HudCardColumnApi {
  /** Die anwesenden Karten in Renderreihenfolge: Wayfinder, Fokus, dann Zeilen. */
  order: ComputedRef<HudCardId[]>
  focus: ComputedRef<HudCardId | null>
  density: ComputedRef<'roomy' | 'base' | 'tight'>
  /** Ob überhaupt etwas zu zeigen ist — ein Overlay deckt die Bühne sonst zu. */
  visible: ComputedRef<boolean>
  voidCard: ComputedRef<VoidCardView | null>
  drifterCard: ComputedRef<DrifterCardView | null>
  autoPickCard: ComputedRef<AutoPickCardView | null>
  foldOf: (id: HudCardId) => HudCardFold | null
}

let instance: HudCardColumnApi | null = null

function createInstance(): HudCardColumnApi {
  const voidStore = useVoidStore()
  const drifterStore = useDrifterStore()
  const gameStore = useGameStore()
  const omenStore = useOmenStore()
  const galaxyStore = useGalaxyStore()
  const uiStore = useUiStore()
  const landfallStore = useLandfallStore()
  const { face } = useMissionFace()

  // ── Die EINE Uhr ─────────────────────────────────────────────────────────
  // Zwei Zeitbasen, ein Takt. Spielzeit für alles, was gegen einen Store-Stempel
  // gerechnet wird (Void-Reise, Drifter-Flug); Wanduhr für die drei
  // Meldungsfristen — eine Quittung, die im 20-fachen Zeitraffer nach 0,6 realen
  // Sekunden verschwindet, hat niemand gelesen.
  const gnow = ref(0)
  const wnow = ref(0)

  const voidTail = ref<{ defId: string; sealed: boolean; until: number } | null>(null)
  const drifterTail = ref<{ defId: string; collected: boolean; until: number } | null>(null)
  const autoPick = ref<{ id: string; seq: number; until: number } | null>(null)
  /** Anteil der Flugzeit, der auf den Anflug außerhalb des Bildes entfällt. */
  const revealFrac = ref(0)

  let ticker: ReturnType<typeof setInterval> | null = null

  function beat() {
    gnow.value = gameNow()
    const w = Date.now()
    wnow.value = w
    if (voidTail.value && w >= voidTail.value.until) voidTail.value = null
    if (drifterTail.value && w >= drifterTail.value.until) drifterTail.value = null
    if (autoPick.value && w >= autoPick.value.until) autoPick.value = null
  }

  const needsBeat = computed(
    () =>
      voidStore.active.length > 0 ||
      voidTail.value !== null ||
      drifterStore.active.length > 0 ||
      drifterTail.value !== null ||
      autoPick.value !== null ||
      galaxyStore.activeLandfall !== null,
  )

  watch(
    needsBeat,
    (on) => {
      if (on && !ticker) {
        beat()
        ticker = setInterval(beat, HUD_CARD_TICK_MS)
      } else if (!on && ticker) {
        clearInterval(ticker)
        ticker = null
      }
    },
    { immediate: true },
  )

  // ── Nachläufe anmelden ───────────────────────────────────────────────────
  watch(
    () => voidStore.lastOutcome.seq,
    (seq) => {
      if (!seq) return
      voidTail.value = {
        defId: voidStore.lastOutcome.defId,
        sealed: voidStore.lastOutcome.sealed,
        until: Date.now() + VOID_CARD_RESULT_MS,
      }
      beat()
    },
  )

  watch(
    () => drifterStore.lastCollect.seq,
    (seq) => {
      if (!seq) return
      drifterTail.value = {
        defId: drifterStore.lastCollect.defId,
        collected: true,
        until: Date.now() + DRIFTER_CARD_RESULT_MS,
      }
      beat()
    },
  )

  watch(
    () => drifterStore.lastExpired.seq,
    (seq) => {
      if (!seq) return
      drifterTail.value = {
        defId: drifterStore.lastExpired.defId,
        collected: false,
        until: Date.now() + DRIFTER_CARD_RESULT_MS,
      }
      beat()
    },
  )

  /* Auf `seq` beobachten, nicht auf die id: zweimal dasselbe Augment
     hintereinander soll die Meldung trotzdem erneut auslösen. */
  watch(
    () => gameStore.lastAutoPick.seq,
    (seq) => {
      if (!seq) return
      autoPick.value = {
        id: gameStore.lastAutoPick.id,
        seq,
        until: Date.now() + AUTO_PICK_TOAST_MS,
      }
      beat()
    },
  )

  /**
   * Anteil der Flugzeit bis zum Sichtkontakt. Der Boden ist die Einblendung —
   * ein noch durchscheinender Körper ist auch dann nichts zum Suchen, wenn er
   * die Bildkante geometrisch schon überquert hat.
   */
  function revealFractionFor(def: DrifterDef, routeIndex: number, mirrored: boolean): number {
    const w = window.innerWidth
    const h = window.innerHeight
    const field = drifterField(w, h, measuredFieldInsets())
    const geometric = drifterRevealProgress(routeIndex, mirrored, field, def.sizePx / 2, w, h)
    return Math.min(1, Math.max(geometric, DRIFTER_FADE_IN_FRAC))
  }

  const activeDrifter = computed(() => drifterStore.active[0] ?? null)

  watch(
    activeDrifter,
    (d) => {
      if (!d) return
      const def = getDrifter(d.defId)
      if (!def) return
      revealFrac.value = revealFractionFor(def, d.routeIndex, d.mirrored)
      beat()
    },
    { immediate: true },
  )

  // ── Void ─────────────────────────────────────────────────────────────────
  const voidCard = computed<VoidCardView | null>(() => {
    const tail = voidTail.value
    if (tail && wnow.value < tail.until) {
      const def = getVoidRift(tail.defId)
      if (def) {
        return {
          defId: tail.defId,
          state: tail.sealed ? 'slain' : 'impact',
          progress: tail.sealed ? 0 : 1,
          remainingMs: 0,
          remainingSeconds: 0,
          hpRatio: tail.sealed ? 0 : 1,
          swarm: voidStore.active.length,
          urgent: false,
          color: def.color,
          severityColor: VOID_SEVERITY_COLOR[def.severity] ?? '#8a6fd0',
          severityLabel: VOID_SEVERITY_LABEL[def.severity] ?? 'VOID',
        }
      }
    }
    const lead = voidStore.leadMonster
    if (!lead) return null
    const def = getVoidRift(lead.defId)
    if (!def) return null
    const span = Math.max(1, lead.travelMs)
    const now = gnow.value
    const progress = Math.min(1, Math.max(0, (now - lead.spawnedAt) / span))
    const remainingMs = Math.max(0, lead.spawnedAt + span - now)
    return {
      defId: lead.defId,
      state: 'inbound',
      progress,
      remainingMs,
      remainingSeconds: Math.max(0, Math.ceil(remainingMs / 1000)),
      hpRatio: lead.maxHp > 0 ? lead.currentHp / lead.maxHp : 0,
      swarm: voidStore.active.length,
      // Ab drei Vierteln des Weges, nicht bei einer festen Sekundenzahl: die
      // Reisezeiten je Schwere liegen weit auseinander.
      urgent: progress >= VOID_URGENT_FRAC,
      color: def.color,
      severityColor: VOID_SEVERITY_COLOR[def.severity] ?? '#8a6fd0',
      severityLabel: VOID_SEVERITY_LABEL[def.severity] ?? 'VOID',
    }
  })

  // ── Drifter ──────────────────────────────────────────────────────────────
  const drifterCard = computed<DrifterCardView | null>(() => {
    const tail = drifterTail.value
    if (tail && wnow.value < tail.until) {
      const def = getDrifter(tail.defId)
      if (def) {
        return {
          defId: tail.defId,
          state: tail.collected ? 'collected' : 'escaped',
          remainingMs: 0,
          remainingSeconds: 0,
          progress: 1,
          hitsLeft: 0,
          urgent: false,
          color: def.color,
          rarityColor: DRIFTER_RARITY_COLOR[def.rarity] ?? '#9d9d9d',
        }
      }
    }
    const d = activeDrifter.value
    if (!d) return null
    const def = getDrifter(d.defId)
    if (!def) return null
    const now = gnow.value
    // Sie steht erst bei SICHTKONTAKT, nicht beim Spawn. Den Anflug trägt allein
    // der Randping — eine Karte, die einen Drifter meldet, den es am Himmel noch
    // nicht gibt, schickt den Blick ins Leere.
    if (now < d.spawnedAt + d.flightMs * revealFrac.value) return null
    const remainingMs = Math.max(0, d.spawnedAt + d.flightMs - now)
    // Bezug ist NICHT die Flugzeit: der Anflug ist vorbei, wenn die Karte
    // auftaucht, und ein Balken, der bei 88 % beginnt, liest sich wie ein
    // Fehler. Die Zahl daneben bleibt die echte Restzeit.
    const span = d.flightMs * (1 - revealFrac.value)
    return {
      defId: d.defId,
      state: 'inbound',
      remainingMs,
      remainingSeconds: Math.max(0, Math.ceil(remainingMs / 1000)),
      progress: span > 0 ? Math.min(1, Math.max(0, remainingMs / span)) : 0,
      hitsLeft: def.hits > 1 ? Math.max(0, def.hits - d.hitsLanded) : 0,
      urgent: remainingMs > 0 && remainingMs <= DRIFTER_CARD_URGENT_MS,
      color: def.color,
      rarityColor: DRIFTER_RARITY_COLOR[def.rarity] ?? '#9d9d9d',
    }
  })

  // ── Auto-Pick ────────────────────────────────────────────────────────────
  const autoPickCard = computed<AutoPickCardView | null>(() => {
    const a = autoPick.value
    if (!a || wnow.value >= a.until) return null
    const augment = AUGMENTS.find((x) => x.id === a.id)
    if (!augment) return null
    const remainingMs = Math.max(0, a.until - wnow.value)
    return {
      id: a.id,
      seq: a.seq,
      remainingMs,
      remainingSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
      urgent: remainingMs > 0 && remainingMs <= AUTO_PICK_URGENT_MS,
      ratio: remainingMs / AUTO_PICK_TOAST_MS,
      color: AUGMENT_RARITY_COLOR[augment.rarity] ?? '#9d9d9d',
      // Der Toast erscheint NACH dem Übernehmen, das Augment steht also schon in
      // `activeAugments` — sein letzter Platz dort ist der Seed, unter dem es
      // auch im Deck erscheint.
      icon: augmentIcon(a.id, gameStore.activeAugments.lastIndexOf(a.id)),
    }
  })

  // ── Anwesenheit und Rang ─────────────────────────────────────────────────
  /**
   * Ein Overlay deckt die Bühne — dann ist die Spalte weg. Genau das Signal, mit
   * dem `useRenderingPaused` den Idle-Layer schon stilllegt: das Backdrop deckt
   * zu 94–98 %, gezeichnet wird dort ohnehin nichts mehr.
   *
   * Bewusst NICHT an `useRenderingPaused` selbst gehängt — das enthält auch
   * „Fenster nicht fokussiert", und die Spalte beim Alt-Tab abzuräumen setzte
   * `--wayfinder-bottom` auf 0 und veränderte die HUD-Kontur ohne Anlass.
   */
  const covered = computed(() => uiStore.bardActiveTab !== null || useStarGroupStore().starFightModalOpen)

  const landfallOffers = computed(() => landfallStore.offerFor(galaxyStore.activeLandfall))

  const candidates = computed<HudCardCandidate[]>(() => {
    if (covered.value) return []
    const out: HudCardCandidate[] = []

    if (face.value) out.push({ id: 'wayfinder', rank: -1, remainingMs: Infinity })

    const lf = galaxyStore.activeLandfall
    if (lf) {
      const def = getLandfall(lf.kind)
      const decides = landfallOffers.value.length > 0
      const takes = landfallAcceptsTap(def, lf.taps)
      out.push({
        id: 'landfall',
        rank: decides
          ? HUD_CARD_RANK.decision
          : takes
            ? HUD_CARD_RANK.actionable
            : HUD_CARD_RANK.fleeting,
        remainingMs: Math.max(0, (1 - galaxyStore.landfallProgress) * 1000),
      })
    }

    const dc = drifterCard.value
    if (dc) {
      out.push({
        id: 'drifter',
        rank: dc.state === 'inbound' ? HUD_CARD_RANK.fleeting : HUD_CARD_RANK.outcome,
        remainingMs: dc.remainingMs,
      })
    }

    const vc = voidCard.value
    if (vc) {
      out.push({
        id: 'void',
        rank:
          vc.state !== 'inbound'
            ? HUD_CARD_RANK.outcome
            : vc.urgent
              ? HUD_CARD_RANK.emergency
              : HUD_CARD_RANK.threat,
        remainingMs: vc.remainingMs,
      })
    }

    if (omenStore.activeView) {
      out.push({
        id: 'omen',
        rank: HUD_CARD_RANK.standing,
        remainingMs: omenStore.activeView.secondsLeft * 1000,
      })
    }

    const ap = autoPickCard.value
    if (ap) out.push({ id: 'autopick', rank: HUD_CARD_RANK.receipt, remainingMs: ap.remainingMs })

    return out
  })

  const focus = computed(() => pickHudCardFocus(candidates.value))
  const order = computed(() => orderHudCards(candidates.value, focus.value))
  const visible = computed(() => order.value.length > 0)

  const density = computed<'roomy' | 'base' | 'tight'>(() => {
    // Der Wayfinder und der Fokus zählen nicht mit — gemeint sind die Zeilen.
    const folded = order.value.length - (focus.value ? 1 : 0) - (face.value ? 1 : 0)
    if (folded <= 0 && focus.value) return 'roomy'
    if (folded >= HUD_CARD_TIGHT_MIN_FOLDED) return 'tight'
    return 'base'
  })

  // ── Die gefalteten Zeilen ────────────────────────────────────────────────
  function foldOf(id: HudCardId): HudCardFold | null {
    switch (id) {
      case 'void': {
        const v = voidCard.value
        if (!v) return null
        const def = getVoidRift(v.defId)
        if (!def) return null
        const done = v.state !== 'inbound'
        return {
          id,
          color: v.severityColor,
          icon: VOID_CARD_ICON,
          name: def.name,
          value: done ? (v.state === 'slain' ? '✓' : '✕') : `${v.remainingSeconds}s`,
          urgent: v.urgent,
          mark: done ? (v.state === 'slain' ? 'good' : 'bad') : 'none',
          ratio: v.progress,
          tipLabel: v.severityLabel,
          tipText:
            v.state === 'slain'
              ? def.boonLine
              : v.state === 'impact'
                ? def.drainLine
                : `${def.drainLine} · reaches the sun in ${v.remainingSeconds}s · worn down ${Math.round((1 - v.hpRatio) * 100)}%${v.swarm > 1 ? ` · ${v.swarm} inbound` : ''}`,
        }
      }
      case 'drifter': {
        const d = drifterCard.value
        if (!d) return null
        const def = getDrifter(d.defId)
        if (!def) return null
        const done = d.state !== 'inbound'
        return {
          id,
          color: def.color,
          icon: DRIFTER_CARD_ICON,
          name: def.name,
          value: done ? (d.state === 'collected' ? '✓' : '✕') : `${d.remainingSeconds}s`,
          urgent: d.urgent,
          mark: done ? (d.state === 'collected' ? 'good' : 'bad') : 'none',
          ratio: d.progress,
          tipLabel:
            d.state === 'collected' ? 'Collected' : d.state === 'escaped' ? 'Drifted away' : 'In sight',
          tipText:
            d.state === 'inbound'
              ? `${def.effectLine} · ${d.remainingSeconds}s left to catch it${d.hitsLeft > 0 ? ` · ${d.hitsLeft} strikes left` : ''}`
              : def.effectLine,
        }
      }
      case 'omen': {
        const o = omenStore.activeView
        if (!o) return null
        const { minutes, seconds } = splitDuration(o.secondsLeft)
        return {
          id,
          color: o.color,
          icon: o.icon,
          name: o.name,
          value: `${o.progress.toLocaleString()}/${o.target.toLocaleString()}`,
          urgent: false,
          mark: 'none',
          ratio: o.ratio,
          tipLabel: 'Omen',
          tipText: `${o.objective.replace('{n}', o.target.toLocaleString())} · ${
            o.swiftAvailable
              ? `${minutes}:${String(seconds).padStart(2, '0')} left for the swift bonus`
              : 'the swift bonus has lapsed, nothing else is lost'
          }`,
        }
      }
      case 'landfall': {
        const lf = galaxyStore.activeLandfall
        if (!lf) return null
        const def = getLandfall(lf.kind)
        if (!def) return null
        const left = def.tapCap ? Math.max(0, def.tapCap - lf.taps) : 0
        return {
          id,
          color: LANDFALL_ACCENT_HEX,
          icon: def.icon,
          name: def.name,
          value: def.tapCap ? (left > 0 ? String(left) : '✓') : '—',
          urgent: false,
          mark: def.tapCap && left === 0 ? 'good' : 'none',
          ratio: 1 - galaxyStore.landfallProgress,
          tipLabel: 'Landfall',
          tipText: `${def.blurb}${def.tapCap ? ` · ${left} taps left` : ''}`,
        }
      }
      case 'autopick': {
        const a = autoPickCard.value
        if (!a) return null
        const augment = AUGMENTS.find((x) => x.id === a.id)
        if (!augment) return null
        return {
          id,
          color: a.color,
          icon: AUTO_PICK_ICON,
          name: augment.name,
          value: `${a.remainingSeconds}s`,
          urgent: a.urgent,
          mark: 'none',
          ratio: a.ratio,
          tipLabel: 'Auto-picked',
          tipText: augment.effectLine,
        }
      }
      default:
        // Der Wayfinder faltet nie.
        return null
    }
  }

  return { order, focus, density, visible, voidCard, drifterCard, autoPickCard, foldOf }
}

/**
 * App-lebenslanges Singleton: Container und Karten müssen denselben Zustand
 * sehen, und ein zweiter Ticker wäre genau das, was dieses Composable abschafft.
 * Lazy erstellt, damit Pinia beim ersten Aufruf schon installiert ist.
 */
export function useHudCardColumn(): HudCardColumnApi {
  if (!instance) instance = createInstance()
  return instance
}
