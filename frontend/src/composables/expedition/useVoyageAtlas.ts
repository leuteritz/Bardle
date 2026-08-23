/**
 * Der Voyages-Atlas ohne Markup: Takt, Auswahl, Platzierung, Absenden und
 * Einsammeln.
 *
 * Das lag vorher im Vertragsbrett. Hier steht es, weil sich drei Komponenten
 * dieselbe Uhr und dieselbe Auswahl teilen — Karte, Detailspalte und
 * Kopfleiste. Ein Timer je Komponente hiesse drei Uhren, die auseinanderlaufen.
 */
import { ref, computed, watch, onBeforeUnmount, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import { useHerald } from '@/composables/ui/useHerald'
import { destinationFor } from '@/config/economy/expeditionDestinations'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import {
  voyageBerthsOf,
  assignVoyageBerths,
  pinKeyOf,
  pinStampOf,
} from '@/utils/game/voyageSites'
import { gameNow } from '@/utils/game/gameClock'
import {
  EXPEDITION_CHIME_POP_LIFETIME_MS,
  EXPEDITION_CHIME_POP_SPREAD_PX,
  EXPEDITION_COLLECT_FLASH_MS,
  VOYAGE_CLOCK_TICK_MS,
} from '@/config/constants'
import type {
  AvailableExpeditionSlot,
  ExpeditionMission,
  VoyagePlacedSite,
  VoyageRailRow,
} from '@/types'

export function useVoyageAtlas(isVisible: Ref<boolean>) {
  const galaxyStore = useGalaxyStore()
  const expeditionStore = useExpeditionStore()
  const chartStore = useExpeditionChartStore()
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
    autoSelect()
  }

  /**
   * Das dringlichste Subjekt der Galaxie: zurückgekehrt → bald ablaufend →
   * unterwegs. Die Spalte soll nie leer stehen, wenn es etwas zu tun gibt.
   */
  function autoSelect() {
    const sites = placedSites.value
    if (!sites.length) return
    const returned = sites.find((s) => s.mission && s.mission.status !== 'active')
    if (returned) {
      selectedKey.value = returned.pinKey
      return
    }
    const offers = sites.filter((s) => s.offer)
    if (offers.length) {
      const soonest = offers.reduce((a, b) =>
        (a.offer as AvailableExpeditionSlot).availableUntil <
        (b.offer as AvailableExpeditionSlot).availableUntil
          ? a
          : b,
      )
      selectedKey.value = soonest.pinKey
      return
    }
    selectedKey.value = sites[0].pinKey
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

  const selectedSite = computed(
    () => placedSites.value.find((s) => s.pinKey === selectedKey.value) ?? null,
  )

  // Ein Subjekt, das die Galaxie verlässt (abgelaufen, eingesammelt), darf die
  // Spalte nicht auf eine tote Auswahl zeigen lassen.
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
      const missions = expeditionStore.activeExpeditions.filter(
        (m) => m.galaxy === record.galaxy,
      )
      return {
        galaxy: record.galaxy,
        name: dest.name,
        tier: dest.tier,
        accent: minimapAccentForTheme(record.themeIndex),
        charted: progress.charted,
        runs: progress.runs,
        rescued: record.attemptResults.filter((r) => r === 'rescued').length,
        contracts: expeditionStore.availableExpeditions.filter(
          (s) => s.galaxy === record.galaxy,
        ).length,
        inField: missions.filter((m) => m.status === 'active').length,
        ready: missions.filter((m) => m.status !== 'active').length,
        seen: chartStore.seenDestinations.includes(record.galaxy),
      }
    }),
  )

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

  function sendAll() {
    for (const offer of [...expeditionStore.availableExpeditions]) {
      if (!expeditionStore.canStartExpedition) break
      if (expeditionStore.crewFor(offer).every((c) => !!c)) sendExpedition(offer)
    }
  }

  function collectMission(id: string) {
    const mission = expeditionStore.activeExpeditions.find((e) => e.id === id)
    const status = mission?.status
    const reward = mission?.reward ?? 0
    expeditionStore.collectExpedition(id)
    if (reward > 0) spawnChimePop(reward)
    announceReceipt({
      kind: 'expedition',
      headline: status === 'success' ? 'Rewards collected' : 'Expedition completed',
      subline: mission?.name,
      delta: reward > 0 ? { value: reward, unit: 'chimes' } : undefined,
      mergeKey: 'expedition/collect',
    })
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

  /** Klick im Crew-Streifen: erster passender freier Sitz des offenen Vertrags. */
  function assignToOpenSeat(name: string) {
    const offer = selectedSite.value?.offer
    if (!offer) return
    const crew = expeditionStore.crewFor(offer)
    const seated = crew.indexOf(name)
    if (seated !== -1) {
      expeditionStore.setCrewMember(offer, seated, null)
      return
    }
    const empty = crew.findIndex((c) => !c)
    if (empty === -1) return
    expeditionStore.setCrewMember(offer, empty, name)
  }

  // ── Lebenszyklus ──────────────────────────────────────────────────────────
  watch(
    isVisible,
    (visible) => {
      if (!visible) {
        stopClock()
        selectedKey.value = null
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
    selectedSite,
    placedSites,
    railRows,
    chimePops,
    collectFlashing,
    selectGalaxy,
    sendExpedition,
    sendAll,
    collectMission,
    collectAll,
    assignToOpenSeat,
  }
}
