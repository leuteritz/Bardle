<script setup lang="ts">
/**
 * Das Dossier einer Mission, die schon unterwegs ist — laufend oder zurück und
 * auf das Einsammeln wartend.
 *
 * Die Spalte ROLLT NICHT. Jeder Block trägt ein explizites `flex`, die festen
 * wachsen aber schrumpfen nie, und die kurze Spalte verdichtet sie über die
 * Höhen-Media-Query statt über Flex. Nachgeben darf nur das Logbuch: es ist der
 * einzige Block, dessen Zeilen der Spieler beim Ticken schon gelesen hat. Das
 * Budget steht in `VOYAGE_DOSSIER_*` und ist per `voyageDossierLayout.spec.ts`
 * gebunden — ein weiterer Block bricht sie.
 *
 * Der zurückgekehrte Zustand ist kein zweites Layout: dieselben Zonen, andere
 * Lesart. Die grosse Zahl wird vom Countdown zur Beute.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import { destinationFor } from '@/config/economy/expeditionDestinations'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { toRoman } from '@/utils/ui/format'
import { voyageLegsOf } from '@/utils/game/voyageLegs'
import { voyageLogOf, voyageLogVerdictOf, voyageLogRevealed } from '@/utils/game/voyageLog'
import {
  EXPEDITION_COLORS,
  EXPEDITION_HAZARD_BY_ID,
  EXPEDITION_CHART_MAX,
  VOYAGE_DOSSIER_LOG_MIN_H,
  VOYAGE_DOSSIER_CREW_MAX_H,
  MS_PER_SECOND,
} from '@/config/constants'
import type { ExpeditionMission, VoyageTrackHazard } from '@/types'
import ExpeditionVoyageTrack from './ExpeditionVoyageTrack.vue'
import ExpeditionVoyageLog from './ExpeditionVoyageLog.vue'
import ExpeditionCrewDossier from './ExpeditionCrewDossier.vue'
import ExpeditionSpoilsForecast from './ExpeditionSpoilsForecast.vue'
import ExpeditionSectionHead from './ExpeditionSectionHead.vue'

const props = defineProps<{ mission: ExpeditionMission; now: number }>()
const emit = defineEmits<{ collect: [string] }>()

const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()
const chartStore = useExpeditionChartStore()

const done = computed(() => props.mission.status !== 'active')
const success = computed(() => props.mission.status === 'success')

const color = computed(
  () =>
    EXPEDITION_COLORS.find((c) => c.key === (props.mission.colorKey ?? 'gold')) ??
    EXPEDITION_COLORS[0],
)
const record = computed(
  () => galaxyStore.completedGalaxies.find((r) => r.galaxy === props.mission.galaxy) ?? null,
)
const dest = computed(() => (record.value ? destinationFor(record.value) : null))
const chart = computed(() => chartStore.progressOf(props.mission.galaxy ?? 1))

const cardStyle = computed(() => ({
  '--exp-p': color.value.primary,
  '--exp-d': color.value.dim,
  '--dest-accent': record.value
    ? `rgb(${minimapAccentForTheme(record.value.themeIndex)})`
    : '#c89040',
}))
const logMin = `${VOYAGE_DOSSIER_LOG_MIN_H.full}px`
const logMinCompact = `${VOYAGE_DOSSIER_LOG_MIN_H.compact}px`
const crewMax = `${VOYAGE_DOSSIER_CREW_MAX_H.full}px`
const crewMaxCompact = `${VOYAGE_DOSSIER_CREW_MAX_H.compact}px`

const progress = computed(() => {
  const elapsed = props.now - props.mission.startTime
  return Math.min(1, Math.max(0, elapsed / (props.mission.durationSeconds * MS_PER_SECOND)))
})
const remainingMs = computed(() =>
  Math.max(
    0,
    props.mission.durationSeconds * MS_PER_SECOND - (props.now - props.mission.startTime),
  ),
)
const remaining = computed(() => {
  const secs = Math.ceil(remainingMs.value / MS_PER_SECOND)
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
})

/**
 * Ankunft als WANDUHR — der benannte Ausnahmefall, in dem ein Mensch die Zahl
 * als Datum liest. `remainingMs` ist Spielzeit, der Faktor muss deshalb heraus,
 * bevor sie auf die echte Uhr trifft.
 */
const arrival = computed(() =>
  new Date(Date.now() + remainingMs.value / gameStore.gameSpeed).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  }),
)

const legs = computed(() => voyageLegsOf(props.mission))

/** Unterwegs steht die Gefahr nur mit Namen — Requirement und Verdikt gehören
 *  dem Vertrag, und was sie unterwegs anrichtet, erzählt das Logbuch. */
const hazardInfo = computed<VoyageTrackHazard[]>(() =>
  (props.mission.hazards ?? [])
    .map((id) => EXPEDITION_HAZARD_BY_ID[id])
    .filter(Boolean)
    .map((def) => ({ id: def.id, name: def.name, icon: def.icon })),
)

const logCtx = computed(() => ({
  crew: props.mission.assignedChampions.map((c) => c.name),
  destination: dest.value?.name,
}))
const logEntries = computed(() => {
  const script = voyageLogOf(props.mission, logCtx.value)
  if (!done.value) return script
  return [...script, voyageLogVerdictOf(props.mission, success.value, logCtx.value)]
})
const shownLog = computed(() =>
  voyageLogRevealed(logEntries.value, done.value ? 1 : progress.value),
)
</script>

<template>
  <article
    class="efc-card"
    :class="done ? (success ? 'efc-card--success' : 'efc-card--failure') : 'efc-card--running'"
    :style="cardStyle"
  >
    <header class="efc-head">
      <div class="efc-title">
        <Icon
          :icon="mission.icon || 'game-icons:rolled-cloth'"
          width="26"
          height="26"
          class="efc-head-ico"
        />
        <span class="efc-name">{{ mission.name }}</span>
        <span v-if="done" class="efc-badge" :class="success ? 'efc-badge--ok' : 'efc-badge--fail'">
          {{ success ? '✓ Returned' : '✕ Lost' }}
        </span>
      </div>
      <div class="efc-dest">
        <span class="efc-dest-name">{{ dest?.name ?? 'Uncharted' }}</span>
        <!-- Die Stufe der MISSION, nicht die der Galaxie: sie setzt Sitze,
             Gefahren und Lohn dieser Reise. -->
        <span class="efc-dest-tier" :class="`is-${mission.tier ?? 'common'}`">
          {{ mission.tier ?? 'common' }}
        </span>
        <span class="efc-dest-galaxy">Galaxy {{ toRoman(mission.galaxy ?? 1) }}</span>
        <span class="efc-dest-runs">run {{ chart.runs + 1 }}</span>
        <span
          class="efc-dest-pips"
          :aria-label="`Charted ${chart.charted} of ${EXPEDITION_CHART_MAX}`"
        >
          <span
            v-for="i in EXPEDITION_CHART_MAX"
            :key="i"
            class="efc-dest-pip"
            :class="{ 'is-on': i <= chart.charted }"
          />
        </span>
      </div>
    </header>

    <!-- Die EINE grosse Zahl. Reservierte Breite und tabular-nums, damit sie
         beim Stellenwechsel nicht wandert. -->
    <div class="efc-figure" :title="done ? undefined : `Arrival around ${arrival}`">
      <template v-if="!done">
        <span class="efc-figure-value">{{ remaining }}</span>
        <span class="efc-figure-unit">until they return</span>
        <span class="efc-figure-eta">≈ {{ arrival }}</span>
      </template>
      <template v-else>
        <span class="efc-figure-value efc-figure-value--done" :class="{ 'is-fail': !success }">
          +{{ $formatNumber(mission.reward) }}
        </span>
        <span class="efc-figure-unit">{{ success ? 'brought home' : 'salvaged' }}</span>
      </template>
    </div>

    <ExpeditionSpoilsForecast class="efc-forecast" :mission="mission" />

    <ExpeditionVoyageTrack
      class="efc-track"
      :legs="legs"
      :hazard-info="hazardInfo"
      :progress="done ? 1 : progress"
      :outcome="done ? (success ? 'success' : 'failure') : null"
    />

    <section class="efc-crew">
      <ExpeditionSectionHead label="Crew" :readout="`${mission.assignedChampions.length} aboard`" />
      <ExpeditionCrewDossier :crew="mission.assignedChampions" :hazards="mission.hazards ?? []" />
    </section>

    <ExpeditionVoyageLog
      class="efc-log"
      :entries="shownLog"
      :duration-seconds="mission.durationSeconds"
      :done="done"
    />

    <button
      v-if="done"
      class="efc-collect"
      :class="success ? 'efc-collect--ok' : 'efc-collect--fail'"
      @click.stop="emit('collect', mission.id)"
    >
      Collect
    </button>
  </article>
</template>

<style scoped>
/* Die Spalte trägt den Rahmen, die Karte teilt ihre Höhe auf. `clip` und nicht
   `hidden`: hidden wäre ein Scrollport. */
.efc-card {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 13px 13px 11px;
  overflow: clip;
}
.efc-card--running {
  background: #1a1008;
}
.efc-card--success {
  background: #0e1a0e;
}
.efc-card--failure {
  background: #1a0e0e;
}

/* ── Der Haushalt ─────────────────────────────────────────────
   Fest: wachsen, aber nie schrumpfen. Elastisch ist nur das Logbuch,
   und es startet bei `flex-basis: 0` — mit `auto` schöbe der volle
   Eintragsstapel die festen Blöcke aus der Spalte. */
.efc-head,
.efc-figure,
.efc-forecast,
.efc-track,
.efc-collect {
  flex: 0 0 auto;
}
.efc-crew {
  flex: 2 0 auto;
  min-height: 0;
  max-height: v-bind(crewMax);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.efc-log {
  flex: 5 1 0;
  min-height: v-bind(logMin);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ── Kopf ─────────────────────────────────────────────────── */
.efc-head {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.efc-title {
  display: flex;
  align-items: center;
  gap: 9px;
}
.efc-head-ico {
  flex-shrink: 0;
  color: var(--exp-d);
}
.efc-name {
  flex: 1;
  min-width: 0;
  font-size: 15.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.efc-badge {
  flex-shrink: 0;
  padding: 2px 9px;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  border: 1px solid;
  border-radius: 4px;
}
.efc-badge--ok {
  color: #52b830;
  border-color: rgba(82, 184, 48, 0.4);
  background: rgba(82, 184, 48, 0.12);
}
.efc-badge--fail {
  color: #cc6050;
  border-color: rgba(204, 96, 80, 0.4);
  background: rgba(204, 96, 80, 0.12);
}

/* Was das Datenband auf der Karte nicht weiss: was DIESE Reise dem Ort antut. */
.efc-dest {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.34);
}
.efc-dest-name {
  font-weight: 700;
  color: var(--dest-accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.efc-dest-tier {
  flex-shrink: 0;
  padding: 1px 6px;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(92, 51, 16, 0.6);
  border-radius: 4px;
}
.efc-dest-tier.is-rare {
  color: #6ab0e0;
  border-color: rgba(106, 176, 224, 0.45);
}
.efc-dest-tier.is-epic {
  color: #b080e0;
  border-color: rgba(176, 128, 224, 0.45);
}
.efc-dest-galaxy,
.efc-dest-runs {
  flex-shrink: 0;
  white-space: nowrap;
}
.efc-dest-pips {
  display: inline-flex;
  gap: 3px;
  flex-shrink: 0;
  margin-left: auto;
}
.efc-dest-pip {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: 1px solid rgba(92, 51, 16, 0.8);
}
.efc-dest-pip.is-on {
  background: var(--dest-accent);
  border-color: var(--dest-accent);
}

/* ── Die grosse Zahl ──────────────────────────────────────── */
.efc-figure {
  display: flex;
  align-items: baseline;
  gap: 9px;
}
.efc-figure-value {
  min-width: 3.6ch;
  font-size: 34px;
  font-weight: 800;
  line-height: 1;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}
.efc-figure-value--done {
  color: #ffd060;
}
.efc-figure-value--done.is-fail {
  color: #cc6050;
}
.efc-figure-unit {
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.34);
}
.efc-figure-eta {
  margin-left: auto;
  font-size: 11.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.26);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── Fuss ─────────────────────────────────────────────────── */
.efc-collect {
  align-self: stretch;
  padding: 9px 0;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  border-radius: 4px;
  cursor: pointer;
  transition: box-shadow 0.15s;
}
.efc-collect--ok {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #fff;
}
.efc-collect--ok:hover {
  box-shadow: 0 0 14px rgba(82, 184, 48, 0.5);
}
.efc-collect--fail {
  background: #2a1410;
  border: 1px solid rgba(204, 96, 80, 0.4);
  color: #cc6050;
}
.efc-collect--fail:hover {
  box-shadow: 0 0 10px rgba(204, 96, 80, 0.3);
}
.efc-collect:active {
  transform: scale(0.98);
}

/* ── Kurze Spalte: verdichten, nicht streichen ────────────── */
@media (max-height: 1100px) {
  .efc-card {
    gap: 7px;
    padding-bottom: 9px;
  }
  .efc-crew {
    max-height: v-bind(crewMaxCompact);
    gap: 4px;
  }
  .efc-log {
    min-height: v-bind(logMinCompact);
  }
  .efc-name {
    font-size: 14.5px;
  }
  .efc-figure-value {
    font-size: 28px;
  }
  .efc-figure-unit {
    font-size: 10.5px;
  }
  /* Die Ankunftszeit bleibt als `title` der Uhr erreichbar. */
  .efc-figure-eta {
    display: none;
  }
  .efc-dest {
    font-size: 10.5px;
  }
}
@media (min-height: 1601px) {
  .efc-card {
    gap: 14px;
  }
  .efc-name {
    font-size: 18px;
  }
  .efc-figure-value {
    font-size: 42px;
  }
  .efc-dest {
    font-size: 12.5px;
  }
}
</style>
