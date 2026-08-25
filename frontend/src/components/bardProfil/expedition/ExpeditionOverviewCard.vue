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
import { toRoman } from '@/utils/ui/format'
import { buildVoyageRoster } from '@/utils/game/voyageRoster'
import { EXPEDITION_WAYMARK_MAX } from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { AvailableExpeditionSlot, VoyagePlacedSite } from '@/types'
import ExpeditionRosterRow from './ExpeditionRosterRow.vue'

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

/** Die Uhr bis zum nächsten Vertrag stand hier ein zweites Mal — sie steht in
 *  der Kopfleiste, und zwar immer. Hier bleibt nur der Hinweis, der etwas
 *  ANDERES sagt als eine Zeit: dass der Platz erst frei werden muss. */
const offersFull = computed(
  () => expeditionStore.availableExpeditions.length >= expeditionStore.maxAvailableOffers,
)

/**
 * Das Roster — dieselben Zeilen wie auf dem Fleet-Brett, aus derselben Quelle.
 * `VoyagePlacedSite` erfüllt den Eingang des Builders strukturell.
 */
const roster = computed(() =>
  buildVoyageRoster(props.sites, {
    projectedReward: expeditionStore.projectedRewardFor,
    seatsFilled: (offer: AvailableExpeditionSlot) =>
      expeditionStore.crewFor(offer).filter(Boolean).length,
  }),
)

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
          <ExpeditionRosterRow :row="r" :now="now" @select="emit('select', $event)" />
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

    <footer v-if="offersFull" class="eov-foot">
      <Icon icon="ph:warning-fill" width="14" height="14" />
      <span>The board is full — send a crew to make room</span>
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
