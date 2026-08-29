/**
 * Der Voyages-Atlas ohne Markup: Takt, Auswahl, Platzierung, Absenden und
 * Einsammeln.
 *
 * Das lag vorher im Vertragsbrett. Hier steht es, weil sich Karte und
 * Kopfleiste dieselbe Uhr und dieselbe Auswahl teilen — ein Timer je Komponente
 * hiesse zwei Uhren, die auseinanderlaufen.
 */
import { ref, computed, watch, onBeforeUnmount, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useHerald } from '@/composables/ui/useHerald'
import { destinationFor } from '@/config/economy/expeditionDestinations'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { voyageBerthsOf, assignVoyageBerths, pinKeyOf, pinStampOf } from '@/utils/game/voyageSites'
import { voyageLegsOf } from '@/utils/game/voyageLegs'
import { voyageMarkAction } from '@/utils/game/voyageAction'
import { gameNow } from '@/utils/game/gameClock'
import {
  EXPEDITION_CHIME_POP_LIFETIME_MS,
  EXPEDITION_CHIME_POP_SPREAD_PX,
  EXPEDITION_COLLECT_FLASH_MS,
  VOYAGE_CLOCK_TICK_MS,
  VOYAGE_GATE_DOCK_MS,
  VOYAGE_HOMECOMING_MS,
} from '@/config/constants'
import type {
  AvailableExpeditionSlot,
  ExpeditionMission,
  VoyageHomecoming,
  VoyageMarkAction,
  VoyagePlacedSite,
  VoyageRailRow,
} from '@/types'

export function useVoyageAtlas(isVisible: Ref<boolean>) {
  const galaxyStore = useGalaxyStore()
  const expeditionStore = useExpeditionStore()
  const chartStore = useExpeditionChartStore()
  const forgeStore = useStarForgeStore()
  const { announceReceipt } = useHerald()
  const { selectedGalaxy } = storeToRefs(chartStore)

  // ── Die eine Uhr ──────────────────────────────────────────────────────────
  // Läuft nur, solange der Reiter sichtbar ist: er bleibt nach dem ersten
  // Öffnen gemountet, ein Intervall an der Lebensdauer liefe also ewig.
  const now = ref(gameNow())
  let timer: ReturnType<typeof setInterval> | null = null

  function startClock() {
    if (timer) return
    now.value = gameNow()
    timer = setInterval(() => {
      now.value = gameNow()
    }, VOYAGE_CLOCK_TICK_MS)
  }
  function stopClock() {
    if (!timer) return
    clearInterval(timer)
    timer = null
  }

  // ── Auswahl ───────────────────────────────────────────────────────────────
  const selectedKey = ref<string | null>(null)

  const records = computed(() =>
    [...galaxyStore.completedGalaxies].sort((a, b) => b.galaxy - a.galaxy),
  )
  const selectedRecord = computed(
    () => records.value.find((r) => r.galaxy === selectedGalaxy.value) ?? null,
  )

  /** Immer eine befreite Galaxie, sobald der Reiter offen ist. */
  function ensureSelection() {
    const freed = records.value
    if (!freed.length) {
      selectedGalaxy.value = 0
      return
    }
    if (freed.some((r) => r.galaxy === selectedGalaxy.value)) return
    selectedGalaxy.value = freed[0].galaxy
  }

  function selectGalaxy(galaxy: number) {
    if (selectedGalaxy.value === galaxy) return
    selectedGalaxy.value = galaxy
    chartStore.markSeen(galaxy)
    selectedKey.value = null
    // Ein Heimflug gehört zu SEINER Galaxie — auf einer anderen Karte stünde er
    // über fremden Häfen.
    homecomings.value = []
    autoSelect()
  }

  /**
   * NUR eine zurückgekehrte Mission hebt sich selbst hervor — sie ist das
   * Einzige, das eine Handlung verlangt. Ein bloss ausliegender Vertrag tut es
   * nicht: bei fünf Angeboten trüge jede Marke einen Ring, und der Zeiger
   * fände die eine nicht mehr, die zählt.
   */
  function autoSelect() {
    const returned = placedSites.value.find((s) => s.mission && s.mission.status !== 'active')
    if (returned) selectedKey.value = returned.pinKey
  }

  // ── Platzierung ───────────────────────────────────────────────────────────
  const offersHere = computed(() =>
    selectedGalaxy.value
      ? expeditionStore.availableExpeditions.filter((s) => s.galaxy === selectedGalaxy.value)
      : [],
  )
  const missionsHere = computed(() =>
    selectedGalaxy.value
      ? expeditionStore.activeExpeditions.filter((m) => m.galaxy === selectedGalaxy.value)
      : [],
  )

  const placedSites = computed<VoyagePlacedSite[]>(() => {
    const record = selectedRecord.value
    if (!record) return []
    const berths = voyageBerthsOf(record)
    if (!berths.length) return []

    const subjects: (AvailableExpeditionSlot | ExpeditionMission)[] = [
      ...offersHere.value,
      ...missionsHere.value,
    ]
    const pins = assignVoyageBerths(
      subjects.map((s) => {
        const pinKey = pinKeyOf(s)
        return { pinKey, stamp: pinStampOf(pinKey) }
      }),
      berths.length,
    )

    return subjects.map((subject) => {
      const pinKey = pinKeyOf(subject)
      const berth = berths[pins.get(pinKey) ?? 0]
      const mission = 'configId' in subject ? subject : null
      return {
        pinKey,
        berth: berth.berth,
        x: berth.x,
        y: berth.y,
        offer: mission ? null : (subject as AvailableExpeditionSlot),
        mission,
      }
    })
  })

  // Ein Subjekt, das die Galaxie verlässt (abgelaufen, eingesammelt), lässt
  // keinen Ring über einem leeren Ankerplatz zurück.
  watch(placedSites, (sites) => {
    if (selectedKey.value && !sites.some((s) => s.pinKey === selectedKey.value)) {
      selectedKey.value = null
    }
  })

  // ── Seitenleiste ──────────────────────────────────────────────────────────
  const railRows = computed<VoyageRailRow[]>(() =>
    records.value.map((record) => {
      const dest = destinationFor(record)
      const progress = chartStore.progressOf(record.galaxy)
      const missions = expeditionStore.activeExpeditions.filter((m) => m.galaxy === record.galaxy)
      return {
        galaxy: record.galaxy,
        name: dest.name,
        tier: dest.tier,
        accent: minimapAccentForTheme(record.themeIndex),
        charted: progress.charted,
        runs: progress.runs,
        contracts: expeditionStore.availableExpeditions.filter((s) => s.galaxy === record.galaxy)
          .length,
        inField: missions.filter((m) => m.status === 'active').length,
        ready: missions.filter((m) => m.status !== 'active').length,
        seen: chartStore.seenDestinations.includes(record.galaxy),
      }
    }),
  )

  // ── Caretaker's Gate ──────────────────────────────────────────────────────
  /**
   * Die Heimflüge. Kein Timer räumt sie ab und keiner soll es: die eine Uhr
   * tickt ohnehin, und `now` entscheidet, welcher Eintrag noch lebt. Ein
   * `setTimeout` je Rückkehr wäre ein zweiter Taktgeber für eine Zahl, die
   * schon dasteht — und unter Zeitraffer liefe er gegen die Spieluhr.
   */
  const homecomings = ref<VoyageHomecoming[]>([])
  const HOMECOMING_LIFETIME = VOYAGE_HOMECOMING_MS + VOYAGE_GATE_DOCK_MS

  const liveHomecomings = computed(() =>
    homecomings.value.filter((h) => now.value - h.startedAt < HOMECOMING_LIFETIME),
  )

  /** Was das Tor anzeigt: wie viele draussen sind und wann die nächste heimkommt. */
  const gateState = computed(() => {
    const running = missionsHere.value.filter((m) => m.status === 'active')
    let nextReturnAt = Number.POSITIVE_INFINITY
    let nextSpanMs = 1
    for (const m of running) {
      const due = m.startTime + m.durationSeconds * 1000
      if (due >= nextReturnAt) continue
      nextReturnAt = due
      nextSpanMs = Math.max(1, m.durationSeconds * 1000)
    }
    return {
      crewsOut: running.length,
      waiting: missionsHere.value.length - running.length,
      nextReturnAt: Number.isFinite(nextReturnAt) ? nextReturnAt : null,
      nextSpanMs,
      // Gelandet heisst: der Flug ist durch, die Crew steht noch am Tor.
      arriving: liveHomecomings.value.some((h) => now.value - h.startedAt >= VOYAGE_HOMECOMING_MS),
    }
  })

  // ── Handeln ───────────────────────────────────────────────────────────────
  const chimePops = ref<{ id: number; amount: number; dx: number }[]>([])
  let popSeq = 0
  const collectFlashing = ref(false)

  function spawnChimePop(amount: number) {
    if (amount <= 0) return
    const id = ++popSeq
    const dx = Math.round((Math.random() - 0.5) * EXPEDITION_CHIME_POP_SPREAD_PX)
    chimePops.value.push({ id, amount, dx })
    // Rein visuell — deshalb setTimeout und nicht gameTimeout().
    setTimeout(() => {
      chimePops.value = chimePops.value.filter((p) => p.id !== id)
    }, EXPEDITION_CHIME_POP_LIFETIME_MS)
  }

  function sendExpedition(offer: AvailableExpeditionSlot) {
    const crew = expeditionStore.crewFor(offer)
    if (crew.some((c) => !c)) return
    const assigned = crew.map((name, i) => ({
      name: name as string,
      role: offer.requiredRoles[i],
    }))
    if (!expeditionStore.startExpedition(offer.id, assigned)) return
    announceReceipt({
      kind: 'expedition',
      eyebrow: 'DEPARTED',
      headline: offer.name,
      subline: assigned.map((a) => a.name).join(' · '),
      mergeKey: 'expedition/start',
    })
    // Die Marke bleibt an ihrem Platz — sie ist jetzt die Mission.
    selectedKey.value = offer.id
  }

  /** Die Regel gehoert der Aktion, nicht dem Knopf — „All Sails at Once". */
  function sendAll() {
    if (!forgeStore.expeditionsDepartTogether) return
    for (const offer of [...expeditionStore.availableExpeditions]) {
      if (!expeditionStore.canStartExpedition) break
      if (expeditionStore.crewFor(offer).every((c) => !!c)) sendExpedition(offer)
    }
  }

  function collectMission(id: string) {
    const mission = expeditionStore.activeExpeditions.find((e) => e.id === id)
    const status = mission?.status
    const reward = mission?.reward ?? 0
    // VOR dem Auflösen: danach ist die Mission fort und mit ihr Hafen und Crew.
    const site = mission ? placedSites.value.find((s) => s.mission?.id === id) : null
    expeditionStore.collectExpedition(id)
    if (mission && site) {
      homecomings.value = [
        ...liveHomecomings.value,
        {
          key: site.pinKey,
          x: site.x,
          y: site.y,
          berth: site.berth,
          legCount: Math.max(1, voyageLegsOf(mission).length),
          startedAt: gameNow(),
          colorKey: mission.colorKey ?? 'gold',
          crew: mission.assignedChampions.map((c) => c.name),
          success: status === 'success',
        },
      ]
    }
    if (reward > 0) spawnChimePop(reward)
    announceReceipt({
      kind: 'expedition',
      headline: status === 'success' ? 'Rewards collected' : 'Expedition completed',
      subline: mission?.name,
      delta: reward > 0 ? { value: reward, unit: 'chimes' } : undefined,
      mergeKey: 'expedition/collect',
    })
  }

  /**
   * Was ein Klick auf eine Marke tut. Die Karte reicht das Ergebnis an die
   * Marke durch (Affordanz), die Hover-Karte ruft dieselbe Funktion selbst —
   * eine zweite Regel daneben liesse Ansage und Wirkung auseinanderlaufen.
   */
  function actionFor(site: VoyagePlacedSite): VoyageMarkAction {
    return voyageMarkAction(site, {
      crewFor: (offer) => expeditionStore.crewFor(offer),
      canStart: expeditionStore.canStartExpedition,
      now: now.value,
    })
  }

  const actions = computed(() => {
    const map = new Map<string, VoyageMarkAction>()
    for (const site of placedSites.value) map.set(site.pinKey, actionFor(site))
    return map
  })

  /** `blocked` und `waiting` bleiben hier folgenlos — die Marke wackelt selbst. */
  function runMarkAction(pinKey: string) {
    const site = placedSites.value.find((s) => s.pinKey === pinKey)
    if (!site) return
    const action = actionFor(site)
    if (action.kind === 'send' && site.offer) sendExpedition(site.offer)
    else if (action.kind === 'collect') collectMission(action.missionId)
  }

  function collectAll() {
    const ready = [...expeditionStore.readyExpeditions]
    if (!ready.length) return
    for (const mission of ready) collectMission(mission.id)
    collectFlashing.value = true
    setTimeout(() => {
      collectFlashing.value = false
    }, EXPEDITION_COLLECT_FLASH_MS)
  }

  // ── Lebenszyklus ──────────────────────────────────────────────────────────
  watch(
    isVisible,
    (visible) => {
      if (!visible) {
        stopClock()
        selectedKey.value = null
        homecomings.value = []
        return
      }
      ensureSelection()
      startClock()
      if (selectedGalaxy.value) chartStore.markSeen(selectedGalaxy.value)
      autoSelect()
    },
    { immediate: true },
  )

  // Die gewählte Galaxie kann verschwinden — Admin-Rücksprung, Spielstandwechsel.
  watch(records, ensureSelection)

  onBeforeUnmount(stopClock)

  return {
    now,
    records,
    selectedGalaxy,
    selectedRecord,
    selectedKey,
    placedSites,
    actions,
    railRows,
    chimePops,
    collectFlashing,
    homecomings: liveHomecomings,
    gateState,
    selectGalaxy,
    runMarkAction,
    sendExpedition,
    sendAll,
    collectMission,
    collectAll,
  }
}
