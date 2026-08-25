<script setup lang="ts">
/**
 * Was eine Galaxie zu sagen hat, solange kein einzelner Ankerplatz gewählt ist.
 *
 * Den Rekord — Bilanz, Dauer, Kartografie, Multiplikatoren — trägt das Band auf
 * der Karte; es steht immer da. Hier steht, was das Band nicht kann, weil es an
 * einem Champion oder an der Uhr hängt: wer den Weg kennt und wann der nächste
 * Vertrag fällt.
 *
 * Obenauf das ROSTER — jede Marke, die gerade auf dieser Karte steht, als
 * anklickbare Zeile. Die Detailspalte geht nur noch auf, wenn hier etwas liegt;
 * sie muss also auch sagen, WAS liegt, statt dafür auf die Karte zurückzuschicken.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useLazyGalaxySnapshot } from '@/composables/ui/useLazyGalaxySnapshot'
import { destinationFor } from '@/config/economy/expeditionDestinations'
import { formatMinuteClock, toRoman } from '@/utils/ui/format'
import {
  EXPEDITION_COLORS,
  EXPEDITION_EXPIRY_WARNING_MS,
  EXPEDITION_WAYMARK_MAX,
  MS_PER_SECOND,
} from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { VoyagePlacedSite } from '@/types'

const props = defineProps<{
  record: CompletedGalaxyRecord
  /** Alles, was in dieser Galaxie liegt — Verträge wie Missionen. */
  sites: VoyagePlacedSite[]
  now: number
}>()
const emit = defineEmits<{ select: [string] }>()

const expeditionStore = useExpeditionStore()
const chartStore = useExpeditionChartStore()
const battleStore = useBattleStore()

const dest = computed(() => destinationFor(props.record))

const { root, snapshot } = useLazyGalaxySnapshot(() => props.record, 'full')

/**
 * Was am Caretaker's Gate los ist. Der Kern dieser Galaxie ist befreit — sonst
 * stünde sie nicht im Archiv —, das Tor ist also immer offen; die Zahl daneben
 * ist das, was sich ändert.
 */
const gate = computed(() => {
  const here = expeditionStore.activeExpeditions.filter(
    (m: { galaxy?: number }) => m.galaxy === props.record.galaxy,
  )
  const out = here.filter((m: { status: string }) => m.status === 'active').length
  return { out, waiting: here.length - out }
})

const nextOffer = computed(() => formatMinuteClock(expeditionStore.nextSpawnAt - props.now))
const offersFull = computed(
  () => expeditionStore.availableExpeditions.length >= expeditionStore.maxAvailableOffers,
)

/**
 * Das Roster. Rang wie in der Seitenleiste: einsammelbar > ausliegend >
 * unterwegs. Drei Eimer statt einer Sortierung — innerhalb eines Rangs bleibt
 * damit die Reihenfolge der Marken erhalten.
 */
type RosterState = 'ready' | 'failed' | 'offer' | 'field'

interface RosterRow {
  pinKey: string
  name: string
  icon: string
  state: RosterState
  accent: string
  chipIcon: string
  chip: string
  /** Chimes der Zeile, oder null wo es keine zu zeigen gibt. */
  reward: number | null
  rewardPrefix: string
  note: string
  urgent: boolean
  /** Reiseanteil einer laufenden Mission, sonst null. */
  progress: number | null
  aria: string
}

function accentOf(colorKey: string | undefined): string {
  return (EXPEDITION_COLORS.find((c) => c.key === colorKey) ?? EXPEDITION_COLORS[0]).primary
}

const roster = computed<RosterRow[]>(() => {
  const ready: RosterRow[] = []
  const offers: RosterRow[] = []
  const field: RosterRow[] = []

  for (const site of props.sites) {
    const offer = site.offer
    if (offer) {
      const pay = expeditionStore.projectedRewardFor(offer)
      const left = offer.availableUntil - props.now
      const seats = `${offer.requiredRoles.length} seat${offer.requiredRoles.length === 1 ? '' : 's'}`
      offers.push({
        pinKey: site.pinKey,
        name: offer.name,
        icon: offer.icon,
        state: 'offer',
        accent: accentOf(offer.colorKey),
        chipIcon: 'ph:scroll-fill',
        chip: offer.tier,
        reward: pay.success,
        rewardPrefix: '',
        note: `${seats} · expires ${formatMinuteClock(left)}`,
        urgent: left < EXPEDITION_EXPIRY_WARNING_MS,
        progress: null,
        aria: `${offer.name}, ${offer.tier} contract, ${seats}, expires in ${formatMinuteClock(left)}`,
      })
      continue
    }

    const mission = site.mission
    if (!mission) continue
    const crewText = `${mission.assignedChampions.length} crew`

    if (mission.status === 'active') {
      const spanMs = Math.max(1, mission.durationSeconds * MS_PER_SECOND)
      const elapsed = props.now - mission.startTime
      const odds = Math.round(mission.successChance * 100)
      field.push({
        pinKey: site.pinKey,
        name: mission.name,
        icon: mission.icon,
        state: 'field',
        accent: accentOf(mission.colorKey),
        chipIcon: 'game-icons:caravel',
        chip: 'in field',
        reward: null,
        rewardPrefix: '',
        note: `${crewText} · ${formatMinuteClock(spanMs - elapsed)} left · ${odds}%`,
        urgent: false,
        progress: Math.min(1, Math.max(0, elapsed / spanMs)),
        aria: `${mission.name}, in the field, ${crewText}, ${formatMinuteClock(spanMs - elapsed)} left, ${odds} percent odds`,
      })
      continue
    }

    const won = mission.status === 'success'
    ready.push({
      pinKey: site.pinKey,
      name: mission.name,
      icon: mission.icon,
      state: won ? 'ready' : 'failed',
      accent: accentOf(mission.colorKey),
      chipIcon: won ? 'ph:treasure-chest-fill' : 'ph:warning-fill',
      chip: won ? 'ready' : 'failed',
      reward: mission.reward,
      rewardPrefix: '+',
      note: won ? `${crewText} home · claim the spoils` : `${crewText} home · salvage only`,
      urgent: false,
      progress: null,
      aria: `${mission.name}, ${won ? 'ready to collect' : 'failed, salvage only'}, ${crewText} home`,
    })
  }

  return [...ready, ...offers, ...field]
})

/** Champions, die diesen Ort schon kennen. */
const waymarked = computed(() =>
  battleStore.ownedChampions
    .map((name: string) => ({
      name,
      marks: chartStore.waymarksOf(name, props.record.galaxy),
    }))
    .filter((w: { marks: number }) => w.marks > 0)
    .sort((a: { marks: number }, b: { marks: number }) => b.marks - a.marks)
    .slice(0, 6),
)
</script>

<template>
  <article ref="root" class="eov">
    <header class="eov-head">
      <span class="eov-frame">
        <img v-if="snapshot" :src="snapshot" class="eov-img" alt="" />
        <span v-else class="eov-img eov-img--holding" />
      </span>
      <div class="eov-title">
        <span class="eov-name">{{ dest.name }}</span>
        <span class="eov-sub">
          Galaxy {{ toRoman(record.galaxy) }}
          <span class="eov-tier" :class="`eov-tier--${dest.tier}`">{{ dest.tier }}</span>
          <span class="eov-seats">up to {{ dest.maxRoles }} seats</span>
        </span>
      </div>
    </header>

    <section v-if="roster.length" class="eov-block">
      <h4 class="eov-h">What lies here</h4>
      <ul class="eov-roster">
        <li v-for="r in roster" :key="r.pinKey">
          <button
            class="eov-row"
            :class="`eov-row--${r.state}`"
            :style="{ '--row-accent': r.accent }"
            :aria-label="r.aria"
            @click="emit('select', r.pinKey)"
          >
            <span class="eov-row-ico">
              <Icon :icon="r.icon" width="20" height="20" />
            </span>
            <span class="eov-row-body">
              <span class="eov-row-top">
                <span class="eov-row-name">{{ r.name }}</span>
                <span class="eov-row-chip">
                  <Icon :icon="r.chipIcon" width="11" height="11" />
                  {{ r.chip }}
                </span>
              </span>
              <span class="eov-row-line">
                <span v-if="r.reward !== null" class="eov-row-pay">
                  <Icon icon="game-icons:windchimes" width="11" height="11" />
                  {{ r.rewardPrefix }}{{ $formatNumber(r.reward) }}
                </span>
                <span class="eov-row-note" :class="{ 'is-urgent': r.urgent }">{{ r.note }}</span>
              </span>
              <span v-if="r.progress !== null" class="eov-row-bar" aria-hidden="true">
                <span class="eov-row-fill" :style="{ transform: `scaleX(${r.progress})` }" />
              </span>
            </span>
            <span class="eov-row-go" aria-hidden="true">›</span>
          </button>
        </li>
      </ul>
    </section>

    <section class="eov-block">
      <h4 class="eov-h">Caretaker's Gate</h4>
      <p class="eov-gate-line">
        The core is free — its throne is a gate now. Every crew bound for this
        reach leaves from there and comes home to it.
      </p>
      <span class="eov-gate-state">
        <template v-if="gate.out">{{ gate.out }} out in the field</template>
        <template v-else-if="gate.waiting">{{ gate.waiting }} waiting at berth</template>
        <template v-else>Quiet — no crew abroad</template>
      </span>
    </section>

    <section v-if="waymarked.length" class="eov-block">
      <h4 class="eov-h">Crews who know this road</h4>
      <ul class="eov-marks">
        <li v-for="w in waymarked" :key="w.name" class="eov-mark">
          <span class="eov-mark-name">{{ w.name }}</span>
          <span class="eov-mark-dots" :aria-label="`${w.marks} waymarks`">
            <span
              v-for="i in EXPEDITION_WAYMARK_MAX"
              :key="i"
              class="eov-mark-dot"
              :class="{ 'is-on': i <= w.marks }"
            />
          </span>
        </li>
      </ul>
    </section>

    <footer class="eov-foot">
      <Icon icon="lucide:timer" width="14" height="14" />
      <span v-if="offersFull">The board is full — send a crew to make room</span>
      <span v-else>Next contract in {{ nextOffer }}</span>
    </footer>
    <p class="eov-note">
      New contracts favour the galaxies you freed most recently, but every charted
      port stays in the draw.
    </p>
  </article>
</template>

<style scoped>
.eov {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.eov::-webkit-scrollbar {
  width: 4px;
}
.eov::-webkit-scrollbar-track {
  background: #111;
}
.eov::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

.eov-head {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.eov-frame {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border: 1px solid #6b5330;
  border-radius: 4px;
  background: #0b0806;
}
.eov-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.eov-img--holding {
  background: #0b0806;
}
.eov-title {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.eov-name {
  font-family: 'MedievalSharp', Georgia, serif;
  font-size: 19px;
  line-height: 1.1;
  color: #e8c040;
}
.eov-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.55);
}
.eov-tier {
  padding: 0 5px;
  border: 1px solid #5c3310;
  border-radius: 3px;
  font-size: 9px;
  letter-spacing: 0.1em;
}
.eov-tier--rare {
  border-color: #3a5a8a;
  color: #7aa8e0;
}
.eov-tier--epic {
  border-color: #6b3a86;
  color: #c090e0;
}
.eov-seats {
  font-size: 10px;
  letter-spacing: 0.08em;
  color: rgba(200, 144, 64, 0.45);
}

.eov-block {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 9px 10px;
  background: #1a1008;
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.eov-h {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.5);
}

.eov-gate-line {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: rgba(230, 220, 196, 0.6);
}
.eov-gate-state {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}

/* ── Roster ─────────────────────────────────────────────── */
.eov-roster {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.eov-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 6px 6px 7px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  /* Die linke Kante trägt die Farbe der Marke auf der Karte. */
  border-left: 3px solid var(--row-accent, #e8c040);
  border-radius: 4px;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.13s,
    border-color 0.13s;
}
.eov-row:hover {
  background: #241f14;
}
.eov-row:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: -2px;
}
.eov-row--ready {
  border-left-color: #64dcb4;
}
.eov-row--failed {
  border-left-color: #cc6050;
}

.eov-row-ico {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid #3e200a;
  border-radius: 4px;
  background: #141410;
  color: var(--row-accent, #e8c040);
}
.eov-row--ready .eov-row-ico {
  color: #a0f0d0;
}
.eov-row--failed .eov-row-ico {
  color: #cc6050;
}

.eov-row-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.eov-row-top {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.eov-row-name {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: #e8dcc0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.eov-row-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 4px;
  border: 1px solid rgba(200, 144, 64, 0.45);
  border-radius: 3px;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.55;
  color: #e8c040;
}
.eov-row--field .eov-row-chip {
  color: rgba(230, 220, 196, 0.7);
  border-color: rgba(230, 220, 196, 0.28);
}
.eov-row--ready .eov-row-chip {
  color: #a0f0d0;
  border-color: rgba(100, 220, 180, 0.5);
}
.eov-row--failed .eov-row-chip {
  color: #cc6050;
  border-color: rgba(204, 96, 80, 0.5);
}

.eov-row-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.eov-row-pay {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: 800;
  color: #e8c040;
}
.eov-row--failed .eov-row-pay {
  color: rgba(200, 144, 64, 0.55);
}
.eov-row-note {
  min-width: 0;
  color: rgba(230, 220, 196, 0.52);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.eov-row-note.is-urgent {
  color: #cc6050;
  font-weight: 800;
}

/* scaleX statt width — Performance-Regel 10. */
.eov-row-bar {
  display: block;
  height: 3px;
  border-radius: 2px;
  overflow: hidden;
  background: rgba(200, 164, 90, 0.14);
}
.eov-row-fill {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #e8c060);
  transition: transform 0.35s linear;
}

.eov-row-go {
  flex-shrink: 0;
  font-size: 15px;
  line-height: 1;
  color: rgba(200, 144, 64, 0.45);
}
.eov-row:hover .eov-row-go {
  color: #e8c040;
}

.eov-marks {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.eov-mark {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.eov-mark-name {
  flex: 1;
  min-width: 0;
  font-weight: 700;
  color: rgba(230, 220, 196, 0.72);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.eov-mark-dots {
  display: flex;
  gap: 3px;
  flex-shrink: 0;
}
.eov-mark-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(200, 164, 90, 0.2);
}
.eov-mark-dot.is-on {
  background: #e8c040;
}

.eov-foot {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  background: #141410;
  border: 1px solid #5c3310;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}
.eov-note {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: rgba(200, 144, 64, 0.38);
}
</style>
