<script setup lang="ts">
/**
 * Die Annalen EINER Bahn — das Dossier hinter dem Knopf auf ihrer Karte.
 *
 * Es zeigt AUSSCHLIESSLICH, was das Kopfband nicht kann. Das Band traegt schon
 * Identitaet, Vorsehung, Galaxien, Sterne, Chimes und Dauer — aber immer nur als
 * SUMME und immer nur fuer die gewaehlte Bahn. Hier stehen die Besuche einzeln,
 * die Spanne der Bahn, ihre haerteste Galaxie und der Unterschied zwischen null
 * und unbekannt. Jede Ablesung, die das Band schon zeigt, waere genau die
 * Doppelung, gegen die dieser Reiter geschrieben ist.
 *
 * „Annals" und nicht „Chronicle": das ist die Ereignis-Chronik der Galaxien.
 * Nicht „Record": das sind drei Typen im Code, die diese Datei selbst liest.
 *
 * Die Huelle ist geerbt, nicht gemalt — `.rpg-frame` plus `<RpgFrame />` als
 * direktes Kind, wie im Augment-Modal. Scoped bleiben nur die Fuellungen.
 *
 * Die Uebergangsklassen stehen HIER und nicht im Reiter: `UniverseTabComponent`
 * darf in seinem `<style>` kein `transform` tragen.
 */
import { computed, onMounted, ref } from 'vue'
import RpgFrame from '@/components/ui/RpgFrame.vue'
import UniverseDisc from './UniverseDisc.vue'
import { formatNumber } from '@/config/ui/numberFormat'
import { formatCompactDuration, toRoman, universeLabel } from '@/utils/ui/format'
import { runsOfUniverse } from '@/utils/ui/universeLayout'
import {
  MS_PER_SECOND,
  UNIVERSE_ANNALS_CLOSE_LABEL,
  UNIVERSE_ANNALS_GOTO_LABEL,
  UNIVERSE_ANNALS_MAX_H_PCT,
  UNIVERSE_ANNALS_MAX_W,
  UNIVERSE_ANNALS_SLIDE_MS,
  UNIVERSE_ANNALS_TITLE,
  UNIVERSE_DISC_ANNALS_PX,
  UNIVERSE_RAIL_UNKNOWN,
} from '@/config/constants'
import type { UniverseDeparture, UniverseNode } from '@/utils/ui/universeLayout'
import type { UniverseRunRecord } from '@/types'

const props = defineProps<{
  universe: number
  tint: string
  isHere: boolean
  nodes: readonly UniverseNode[]
  departure: UniverseDeparture | null
  runs: readonly UniverseRunRecord[]
}>()

const emit = defineEmits<{
  (e: 'goto'): void
  (e: 'close'): void
}>()

/** Nur die begangenen Knoten — ein unbeleuchteter ist ein Vorausplatz, keine
 *  Station. */
const walked = computed(() => props.nodes.filter((n) => n.state !== 'unlit'))
const freed = computed(() => walked.value.filter((n) => n.state === 'freed'))

const visits = computed(() => runsOfUniverse(props.runs, props.universe))

const span = computed(() => {
  const list = walked.value
  if (!list.length) return null
  return { from: list[0].galaxy, to: list[list.length - 1].galaxy }
})

const landfalls = computed(() => walked.value.reduce((sum, n) => sum + n.landfalls, 0))

/** Die haerteste Galaxie: die, die die meisten Sterne VERLANGTE. */
const hardest = computed(() =>
  walked.value.reduce<UniverseNode | null>(
    (best, n) => (!best || n.stars > best.stars ? n : best),
    null,
  ),
)

const stars = computed(() => {
  let rescued = 0
  let lost = 0
  for (const n of walked.value) {
    rescued += n.rescued
    lost += n.lost
  }
  return { rescued, lost, total: rescued + lost }
})

const lossRate = computed(() =>
  stars.value.total > 0 ? Math.round((stars.value.lost / stars.value.total) * 100) : 0,
)

/** Mittlere Spielzeit je befreiter Galaxie — aus den Datensaetzen, nicht aus den
 *  Laeufen: ein Lauf umspannt auch die Zeit, in der nichts befreit wurde. */
const perGalaxy = computed(() => {
  const withRecord = freed.value.filter((n) => n.record)
  if (!withRecord.length) return null
  const total = withRecord.reduce((sum, n) => sum + (n.record?.durationSeconds ?? 0), 0)
  return formatCompactDuration((total / withRecord.length) * MS_PER_SECOND)
})

/** Es gab hier Galaxien, aber keinen Lauf im Archiv — `UNIVERSE_RUN_HISTORY_LIMIT`
 *  hat ihn herausgeschoben. Das ist nicht dasselbe wie „nie gewesen". */
const forgotten = computed(() => !props.isHere && freed.value.length > 0 && !visits.value.length)

function dayOf(run: UniverseRunRecord) {
  // Chronikstempel — als Datum gelesen, nie gegen eine Frist geprueft.
  return new Date(run.completedAt).toLocaleDateString()
}

const roman = computed(() => toRoman(props.universe))
const label = computed(() => universeLabel(props.universe))

const onward = computed(() =>
  props.departure ? `the road went on to ${universeLabel(props.departure.toUniverse)}` : null,
)

/* Der Fokus muss herein — sonst steht er auf dem Knopf hinter dem Schleier, und
   die Tabulatortaste laeuft durch eine Karte, die niemand mehr bedienen kann. */
const closeBtn = ref<HTMLElement | null>(null)
onMounted(() => closeBtn.value?.focus())

const maxW = `${UNIVERSE_ANNALS_MAX_W}px`
const maxH = `${UNIVERSE_ANNALS_MAX_H_PCT}%`
const slideMs = `${UNIVERSE_ANNALS_SLIDE_MS}ms`
</script>

<template>
  <div class="una-scrim rpg-overlay" @click.self="emit('close')">
    <div
      class="una rpg-frame"
      role="dialog"
      :style="{ '--una-tint': tint }"
      :aria-label="`${UNIVERSE_ANNALS_TITLE} — ${label}`"
    >
      <RpgFrame />

      <header class="una-head rpg-header">
        <span class="una-medal">
          <UniverseDisc
            :universe="props.universe"
            :state="isHere ? 'current' : 'walked'"
            :px="UNIVERSE_DISC_ANNALS_PX"
          />
          <span class="una-roman">{{ roman }}</span>
        </span>
        <span class="una-id">
          <span class="una-kicker">{{ UNIVERSE_ANNALS_TITLE }}</span>
          <span v-ink-center.y class="una-name">{{ label }}</span>
          <!-- Der eine Satz, den das Kopfband nie sagt: wohin es weiterging. -->
          <span class="una-sub">
            {{ isHere ? 'you are here' : `visited ×${visits.length || 1}` }}
            <template v-if="onward"> · {{ onward }}</template>
          </span>
        </span>
      </header>

      <div class="una-body rpg-scrollbar">
        <section class="una-sec">
          <h3 class="una-sec-h">The path</h3>
          <div class="una-grid">
            <div class="una-read">
              <span class="una-v">{{
                span ? `${span.from}–${span.to}` : UNIVERSE_RAIL_UNKNOWN
              }}</span>
              <span class="una-k">Galaxy span</span>
            </div>
            <div class="una-read">
              <span class="una-v">{{ landfalls }}</span>
              <span class="una-k">Landfalls cleared</span>
            </div>
            <div class="una-read">
              <span class="una-v una-v--warn">{{ lossRate }}%</span>
              <span class="una-k">Stars lost</span>
            </div>
            <div class="una-read">
              <span class="una-v">{{ perGalaxy ?? UNIVERSE_RAIL_UNKNOWN }}</span>
              <span class="una-k">Per galaxy</span>
            </div>
          </div>

          <p v-if="hardest" class="una-line">
            The hardest crossing was
            <span class="una-hi">Galaxy {{ hardest.galaxy }}</span> — it asked for
            <span class="una-hi">{{ hardest.stars }}</span> stars and gave back
            <span class="una-hi">{{ hardest.rescued }}</span
            >, losing <span class="una-hi una-hi--warn">{{ hardest.lost }}</span
            >.
          </p>
          <p v-else class="una-line una-line--dim">Nothing was freed on this path.</p>
        </section>

        <!-- Das Groesste, was das Band nicht kann: es SUMMIERT die Besuche. -->
        <section class="una-sec">
          <h3 class="una-sec-h">Every visit</h3>

          <ol v-if="visits.length" class="una-visits">
            <li v-for="(run, i) in visits" :key="run.completedAt" class="una-visit">
              <span class="una-visit-no">{{ i + 1 }}</span>
              <span class="una-visit-body">
                <span class="una-visit-top">
                  <span class="una-hi">{{ run.galaxiesFreed }}</span> freed ·
                  <span class="una-hi">{{ run.starsRescued }}</span> stars ·
                  <span class="una-hi">{{ formatNumber(run.chimes) }}</span> chimes
                </span>
                <span class="una-visit-foot">
                  {{ formatCompactDuration(run.durationSeconds * MS_PER_SECOND) }} ·
                  {{ dayOf(run) }}
                  <template v-if="run.providence"> · under {{ run.providence }}</template>
                </span>
              </span>
            </li>
          </ol>

          <p v-else-if="isHere" class="una-line una-line--dim">
            This visit is still under way — it enters the annals when you depart.
          </p>
          <p v-else class="una-line una-line--dim">No visit was ever recorded here.</p>
        </section>

        <!-- Der Unterschied zwischen null und unbekannt. -->
        <section v-if="forgotten" class="una-sec">
          <h3 class="una-sec-h">Not recorded</h3>
          <p class="una-line una-line--dim">
            An earlier visit is no longer held in the archive — its chimes and its clock are lost,
            not zero.
          </p>
        </section>
      </div>

      <footer class="una-foot">
        <button v-if="!isHere" class="una-btn rpg-btn-green" @click="emit('goto')">
          {{ UNIVERSE_ANNALS_GOTO_LABEL }}
        </button>
        <button ref="closeBtn" class="una-btn una-btn--plain" @click="emit('close')">
          {{ UNIVERSE_ANNALS_CLOSE_LABEL }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.una-scrim {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1rem, 3vh, 2rem);
}

/* `position: relative` ist Pflicht — `RpgFrame` misst den Elternteil. */
.una {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: v-bind(maxW);
  max-height: v-bind(maxH);
}

/* ══ Kopf ══ */
.una-head {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
  padding: 12px 18px;
}
.una-medal {
  position: relative;
  flex-shrink: 0;
  line-height: 0;
}
.una-roman {
  position: absolute;
  left: 2px;
  top: 0;
  font-size: 0.9rem;
  font-weight: 900;
  color: #e8c040;
  text-shadow: 0 1px 3px #000;
}
.una-id {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.una-kicker {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #7a6c50;
}
.una-name {
  font-size: 1.5rem;
  line-height: 1.1;
  color: #e8c040;
}
.una-sub {
  font-size: 0.86rem;
  color: var(--una-tint);
}

/* ══ Rumpf ══ */
.una-body {
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 16px 18px 20px;
  background: #1a1008;
}

.una-sec {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.una-sec-h {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #8a7a52;
}

.una-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.una-read {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  background: #1c1c18;
  border: 1px solid #32210c;
  border-radius: 4px;
}
.una-v {
  font-size: 1.16rem;
  line-height: 1.15;
  color: #e8c040;
}
.una-v--warn {
  color: #e08a7a;
}
.una-k {
  font-size: 0.72rem;
  color: #7a6c50;
}

.una-line {
  font-size: 0.92rem;
  line-height: 1.45;
  color: #e8dcc0;
}
.una-line--dim {
  color: #7a6c50;
}
.una-hi {
  color: #e8c040;
}
.una-hi--warn {
  color: #e08a7a;
}

/* ══ Besuche ══ */
.una-visits {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.una-visit {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  background: #1c1c18;
  border: 1px solid #32210c;
  border-radius: 4px;
}
.una-visit-no {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  font-size: 0.8rem;
  font-weight: 900;
  color: var(--una-tint, #e8c040);
  background: #141410;
  border: 1px solid #32210c;
  border-radius: 4px;
}
.una-visit-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.una-visit-top {
  font-size: 0.9rem;
  color: #e8dcc0;
}
.una-visit-foot {
  font-size: 0.76rem;
  color: #7a6c50;
}

/* ══ Fuss ══ */
.una-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
  padding: 12px 18px;
  background: #16120a;
  border-top: 2px solid #5c3310;
}
.una-btn {
  padding: 7px 18px;
  font-size: 0.92rem;
}
.una-btn--plain {
  color: #e8dcc0;
  background: #241a0f;
  border: 1px solid #5c3310;
  border-radius: 4px;
  cursor: pointer;
}
.una-btn--plain:hover {
  color: #fff4dc;
  background: #2e2114;
}

/* Nur `opacity`: die Klassen landen auf dem SCHLEIER, und ein `transform`
   skalierte den Verdunkler mit statt nur die Karte darin. */
.una-pop-enter-active,
.una-pop-leave-active {
  transition: opacity v-bind(slideMs) ease;
}
.una-pop-enter-from,
.una-pop-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .una-pop-enter-active,
  .una-pop-leave-active {
    transition: none;
  }
}
</style>
