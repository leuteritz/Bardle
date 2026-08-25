<script setup lang="ts">
/**
 * Die Etappen einer Reise als Leiter — eine Zeile je Abschnitt.
 *
 * Zwei Aufrufer, ein Bild: der Vertrag zeigt sie als Vorschau (alles
 * ausstehend) und hängt an jede Gefahr ihr Requirement samt Verdikt, die
 * laufende Mission zeigt dieselbe Leiter mit Fortschritt. Deshalb ERSETZT sie
 * auf der Vertragskarte die frühere flache Gefahrenliste, statt daneben zu
 * treten — dieselben Zeilen, nur ihrem Abschnitt zugeordnet.
 *
 * Der Füllstand der laufenden Etappe ist `transform: scaleX()` mit einer
 * Sekundentransition, kein `width` — die Uhr darüber tickt im Sekundentakt, und
 * bis zu fünf dieser Leitern können gleichzeitig stehen.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { VoyageLeg, VoyageTrackHazard } from '@/types'


const props = defineProps<{
  legs: VoyageLeg[]
  hazardInfo: VoyageTrackHazard[]
  /** 0..1 der Gesamtdauer — `null` heisst „noch nicht aufgebrochen". */
  progress: number | null
  outcome?: 'success' | 'failure' | null
}>()

type LegState = 'done' | 'running' | 'pending'

const rows = computed(() =>
  props.legs.map((leg) => {
    const p = props.progress
    let state: LegState = 'pending'
    let fill = 0
    if (p !== null) {
      if (p >= leg.to) {
        state = 'done'
        fill = 1
      } else if (p >= leg.from) {
        state = 'running'
        fill = Math.min(1, Math.max(0, (p - leg.from) / Math.max(1e-6, leg.to - leg.from)))
      }
    }
    return {
      key: leg.index,
      name: leg.name,
      state,
      fill,
      pct: Math.round(fill * 100),
      hazards: leg.hazards
        .map((id) => props.hazardInfo.find((h) => h.id === id))
        .filter((h): h is VoyageTrackHazard => !!h),
    }
  }),
)

/** Eine gescheiterte Reise färbt ihre letzte Etappe, nicht die ganze Leiter. */
const lostAt = computed(() => (props.outcome === 'failure' ? props.legs.length - 1 : -1))
</script>

<template>
  <ol class="evt" :aria-label="`Voyage legs: ${legs.length}`">
    <li
      v-for="(row, i) in rows"
      :key="row.key"
      class="evt-leg"
      :class="[`is-${row.state}`, { 'is-lost': i === lostAt }]"
    >
      <span class="evt-rail" aria-hidden="true">
        <span class="evt-node" />
        <span v-if="i < rows.length - 1" class="evt-line" />
      </span>

      <div class="evt-body">
        <div class="evt-head">
          <span class="evt-name">{{ row.name }}</span>
          <span v-if="row.state === 'done'" class="evt-mark">{{
            i === lostAt ? '✕' : '✓'
          }}</span>
          <span v-else-if="row.state === 'running'" class="evt-pct">{{ row.pct }}%</span>
        </div>

        <div v-if="row.state === 'running'" class="evt-track">
          <div class="evt-fill" :style="{ transform: `scaleX(${row.fill})` }" />
        </div>

        <div v-if="row.hazards.length" class="evt-hazards">
          <div
            v-for="h in row.hazards"
            :key="h.id"
            class="evt-hazard"
            :class="h.state ? `is-${h.state}` : undefined"
          >
            <Icon :icon="h.icon" width="17" height="17" class="evt-hazard-ico" />
            <span class="evt-hazard-text">
              <span class="evt-hazard-name">{{ h.name }}</span>
              <span v-if="h.requirement" class="evt-hazard-req">{{ h.requirement }}</span>
            </span>
            <span v-if="h.state" class="evt-hazard-verdict">
              <template v-if="h.state === 'met'">✓</template>
              <template v-else-if="h.state === 'open'">—</template>
              <template v-else>{{ h.cost }}%</template>
            </span>
          </div>
        </div>
        <span v-else-if="legs.length > 1" class="evt-clear">Clear passage</span>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.evt {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.evt-leg {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 0 9px;
}
.evt-leg:not(:last-child) .evt-body {
  padding-bottom: 9px;
}

/* ── Leiter ───────────────────────────────────────────────── */
.evt-rail {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 4px;
}
.evt-node {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid #5c3310;
  background: #111008;
}
.evt-line {
  flex: 1;
  width: 2px;
  margin: 3px 0 0;
  background: #3e200a;
}
.is-done .evt-node {
  background: #52b830;
  border-color: #6ec040;
}
.is-done .evt-line {
  background: #2e7a1a;
}
.is-lost .evt-node {
  background: #cc6050;
  border-color: #cc6050;
}
.is-running .evt-node {
  background: #e8c040;
  border-color: #ffd060;
}

/* ── Zeile ────────────────────────────────────────────────── */
.evt-body {
  min-width: 0;
}
.evt-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.evt-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.is-running .evt-name {
  color: rgba(255, 255, 255, 0.92);
}
.is-done .evt-name {
  color: rgba(255, 255, 255, 0.42);
}
.evt-mark {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 900;
  color: #52b830;
}
.is-lost .evt-mark {
  color: #cc6050;
}
.evt-pct {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 800;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}

.evt-track {
  height: 6px;
  margin-top: 5px;
  background: #111008;
  border: 1px solid rgba(92, 51, 16, 0.55);
  border-radius: 4px;
  overflow: hidden;
}
.evt-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #c89040, #e8c040);
  transition: transform 1s linear;
}

/* ── Gefahren an ihrer Etappe ─────────────────────────────── */
.evt-hazards {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 5px;
}
.evt-hazard {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 7px;
  background: #1a1008;
  border: 1px solid rgba(92, 51, 16, 0.5);
  border-radius: 4px;
}
.evt-hazard-ico {
  flex-shrink: 0;
  color: rgba(216, 144, 96, 0.85);
}
.evt-hazard-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.evt-hazard-name {
  font-size: 12px;
  font-weight: 700;
  color: rgba(216, 144, 96, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.evt-hazard-req {
  font-size: 10.5px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.evt-hazard-verdict {
  flex-shrink: 0;
  font-size: 11.5px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.4);
  font-variant-numeric: tabular-nums;
}
.evt-hazard.is-met {
  border-color: rgba(82, 184, 48, 0.4);
}
.evt-hazard.is-met .evt-hazard-verdict {
  color: #52b830;
}
.evt-hazard.is-partial .evt-hazard-verdict,
.evt-hazard.is-unmet .evt-hazard-verdict {
  color: #cc6050;
}
.evt-hazard.is-unmet {
  border-color: rgba(204, 96, 80, 0.4);
}

.evt-clear {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.26);
}

/* Kurze Spalte: die Leiter verdichtet, statt Zeilen zu verlieren. Trifft beide
   Aufrufer — die Vertragskarte rollt dort heute, das hilft ihr mit. */
@media (max-height: 1250px) {
  .evt-leg:not(:last-child) .evt-body {
    padding-bottom: 3px;
  }
  .evt-name {
    font-size: 12px;
  }
  .evt-hazards {
    gap: 2px;
    margin-top: 3px;
  }
  .evt-hazard {
    padding: 2px 6px;
    gap: 6px;
  }
  .evt-hazard-name {
    font-size: 11.5px;
  }
  .evt-hazard-req {
    font-size: 10px;
  }
  .evt-track {
    margin-top: 4px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .evt-fill {
    transition: none;
  }
}
</style>
