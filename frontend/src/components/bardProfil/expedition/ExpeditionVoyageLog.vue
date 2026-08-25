<script setup lang="ts">
/**
 * Das Logbuch der laufenden Reise — der EINZIGE Block der Karte, der in sich
 * beschneidet.
 *
 * Chronologisch und selbstablösend: was oben herausfällt, hat der Spieler beim
 * Ticken schon gelesen. Deshalb ist die Liste unten verankert
 * (`justify-content: flex-end`) und der Rahmen `overflow: clip` — kein
 * Scrollport, hier wird nichts zurückgeholt.
 *
 * Die Schiene füllt den Leerraum ÜBER den Einträgen und setzt die Etappenleiter
 * darüber fort; ohne sie läse sich eine junge Reise als Loch.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { VOYAGE_LOG_ICONS } from '@/config/constants'
import type { VoyageLogEntry } from '@/types'

const props = defineProps<{
  entries: VoyageLogEntry[]
  durationSeconds: number
  /** Zurückgekehrt: kein „underway"-Fuss mehr, das Verdikt schliesst ab. */
  done: boolean
}>()

const rows = computed(() =>
  props.entries.map((e) => {
    const secs = Math.round(e.at * props.durationSeconds)
    return {
      key: `${e.leg}:${e.kind}:${e.index}`,
      icon: VOYAGE_LOG_ICONS[e.kind],
      kind: e.kind,
      stamp: `T+${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`,
      text: e.text,
    }
  }),
)
</script>

<template>
  <ol class="evl-list" aria-label="Voyage log">
    <li v-for="row in rows" :key="row.key" class="evl-entry" :class="`is-${row.kind}`">
      <span class="evl-gutter" aria-hidden="true">
        <Icon :icon="row.icon" width="16" height="16" class="evl-ico" />
      </span>
      <p class="evl-text"><span class="evl-stamp">{{ row.stamp }}</span> {{ row.text }}</p>
    </li>
    <li v-if="!done" class="evl-entry evl-entry--open">
      <span class="evl-gutter" aria-hidden="true"><span class="evl-pulse" /></span>
      <p class="evl-text evl-text--open">Still underway.</p>
    </li>
  </ol>
</template>

<style scoped>
.evl-list {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  /* `clip` und nicht `hidden`: hidden wäre ein Scrollport und liesse die
     verdrängten Zeilen zurückholen. */
  overflow: clip;
}
/* Die Schiene läuft durch den ganzen Block — auch dort, wo noch nichts steht. */
.evl-list::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #3e200a;
}
/* Statischer Schleier über der Schnittkante. Ein Element, einmal gerastert. */
.evl-list::after {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 22px;
  background: linear-gradient(to bottom, #1a1008, rgba(26, 16, 8, 0));
  pointer-events: none;
}

.evl-entry {
  position: relative;
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 0 9px;
  min-height: 36px;
  flex-shrink: 0;
}
.evl-gutter {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 1px;
}
.evl-ico {
  color: rgba(200, 144, 64, 0.55);
  background: #1a1008;
}
.is-hazard .evl-ico {
  color: rgba(216, 144, 96, 0.9);
}
.is-arrive .evl-ico,
.is-verdict .evl-ico {
  color: #e8c040;
}

.evl-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.3;
  color: rgba(255, 255, 255, 0.62);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.is-hazard .evl-text {
  color: rgba(216, 160, 128, 0.85);
}
.is-verdict .evl-text {
  color: rgba(255, 255, 255, 0.86);
  font-weight: 700;
}
.evl-stamp {
  color: rgba(255, 255, 255, 0.26);
  font-variant-numeric: tabular-nums;
}

.evl-entry--open .evl-text {
  color: rgba(255, 255, 255, 0.28);
  font-style: italic;
}
.evl-pulse {
  width: 8px;
  height: 8px;
  margin-top: 4px;
  border-radius: 50%;
  background: #c89040;
  animation: evl-breathe 2.4s ease-in-out infinite;
}
@keyframes evl-breathe {
  0%,
  100% {
    opacity: 0.28;
  }
  50% {
    opacity: 0.9;
  }
}

@media (max-height: 1250px) {
  .evl-list {
    gap: 5px;
  }
  .evl-entry {
    min-height: 29px;
  }
  .evl-text {
    font-size: 11.5px;
    line-height: 1.28;
  }
}
@media (min-height: 1601px) {
  .evl-list {
    gap: 12px;
  }
  .evl-entry {
    min-height: 44px;
  }
  .evl-text {
    font-size: 13.5px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .evl-pulse {
    animation: none;
    opacity: 0.6;
  }
}
</style>
