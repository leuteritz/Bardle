<script setup lang="ts">
/**
 * Die Leiter im Pause-Panel — am Fuß der Zustandsspalte, unter Universe,
 * Galaxy und Level.
 *
 * Draußen steht sie als Karte oben links bei z-index 899 und liegt damit unter
 * diesem Overlay (9998); der Herold, der ihren Abschluss feiert, bei 9700
 * ebenso. Der Fortschritt lief also schon immer weiter — zu sehen war er nicht.
 *
 * Die Höhe ist FEST reserviert (PAUSE_WAYFINDER_ROW_H). Wüchse sie mit dem
 * Zustand, spränge der Fit-Scale des ganzen Overlays beim Missionswechsel, beim
 * Abschlussblitz und am Ende der Leiter.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useMissionFace } from '@/composables/ui/useMissionFace'
import { formatNumberCompact } from '@/config/ui/numberFormat'
import { MISSION_CHAPTERS, MISSION_COUNT } from '@/config/progression/missions'
import {
  MISSION_SYSTEM_ICON,
  MISSION_LADDER_DONE_TITLE,
  MISSION_LADDER_DONE_LINE,
  PAUSE_WAYFINDER_ROW_H,
  PAUSE_WAYFINDER_REWARD_W,
  PAUSE_WAYFINDER_COUNT_CH,
} from '@/config/constants'

const { face, flashing } = useMissionFace()

/** Der letzte Kapitelakzent trägt den Abschluss — die Leiter endet in „The Long
 *  Vigil", und ein farbloser Zustand läse sich als Fehler. */
const LAST_CHAPTER = MISSION_CHAPTERS[MISSION_CHAPTERS.length - 1]

/**
 * Die Zeile verschwindet NICHT, wenn die Leiter durch ist: die Spalte fiele um
 * ihre reservierte Höhe, und der Fit-Scale spränge in genau dem Moment, in dem
 * die letzte Mission fällt. Sie zeigt dann den Abschluss.
 */
const view = computed(() => {
  const f = face.value
  if (f) {
    return {
      accent: f.color,
      chapter: `${f.chapterNumeral} · ${f.chapterName}`,
      name: f.name,
      task: f.task,
      reward: f.rewardLabel,
      ratio: f.ratio,
      count: `${formatNumberCompact(f.progress)}/${formatNumberCompact(f.target)}`,
      title: `${f.name} — ${f.task} · ${f.rewardLabel}`,
    }
  }
  return {
    accent: LAST_CHAPTER.color,
    chapter: LAST_CHAPTER.name,
    name: MISSION_LADDER_DONE_TITLE,
    task: MISSION_LADDER_DONE_LINE,
    reward: '',
    ratio: 1,
    count: `${MISSION_COUNT}/${MISSION_COUNT}`,
    title: `${MISSION_LADDER_DONE_TITLE} — ${MISSION_LADDER_DONE_LINE}`,
  }
})
</script>

<template>
  <div
    class="wfr"
    :class="{ 'wfr--done': flashing }"
    :style="{
      '--wfr-h': `${PAUSE_WAYFINDER_ROW_H}px`,
      '--wfr-reward-w': `${PAUSE_WAYFINDER_REWARD_W}px`,
      '--wfr-count-ch': `${PAUSE_WAYFINDER_COUNT_CH}ch`,
      '--wfr-accent': view.accent,
    }"
    :title="view.title"
  >
    <span class="wfr__head">
      <Icon :icon="MISSION_SYSTEM_ICON" width="14" height="14" class="wfr__glyph" aria-hidden="true" />
      <span class="wfr__label">Wayfinder</span>
      <span class="wfr__chapter">{{ view.chapter }}</span>
    </span>

    <!-- Name und Belohnung teilen sich eine Zeile: der Name misst höchstens
         181 px, die Belohnung bis 196 — untereinander kostete das eine Zeile
         Panelhöhe, die keine Angabe wert ist. Der Name weicht zurück, nie die
         reservierte Belohnungsbreite. -->
    <span class="wfr__title-row">
      <span class="wfr__name">{{ view.name }}</span>
      <span class="wfr__reward">{{ view.reward }}</span>
    </span>

    <span class="wfr__task">{{ view.task }}</span>

    <span class="wfr__meter">
      <span class="wfr__track">
        <span class="wfr__fill" :style="{ transform: `scaleX(${view.ratio})` }" />
      </span>
      <span class="wfr__count">{{ view.count }}</span>
    </span>
  </div>
</template>

<style scoped>
/* Die Höhe steht fest, der Inhalt richtet sich danach — nicht umgekehrt.
   `clip` statt `hidden`: ein Scrollport liesse sich verschieben. */
.wfr {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  height: var(--wfr-h);
  min-width: 0;
  overflow: clip;
}

/* Farbstrich links wie an der Meta-Zeile darüber — dieselbe Zuordnung, hier für
   das Kapitel. */
.wfr__head {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 18px;
  padding-left: 8px;
  border-left: 2px solid var(--wfr-accent);
  min-width: 0;
}

.wfr__glyph {
  flex-shrink: 0;
  color: var(--wfr-accent);
}

.wfr__label {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  line-height: 1.2;
  color: rgba(216, 200, 160, 0.6);
}

.wfr__chapter {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-align: right;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1.2;
  color: rgba(216, 200, 160, 0.42);
}

.wfr__title-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  height: 19px;
  min-width: 0;
}

.wfr__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.15;
  color: #f2ead2;
}

/* Reservierte Breite, nie umgebrochen: eine zweite Zeile änderte die Blockhöhe
   und damit den Fit-Scale des ganzen Overlays. */
.wfr__reward {
  flex-shrink: 0;
  width: var(--wfr-reward-w);
  overflow: hidden;
  text-align: right;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1.2;
  color: #7a9a6a;
}

.wfr__task {
  height: 16px;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 0.78rem;
  line-height: 1.3;
  color: #9a9184;
}

.wfr__meter {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 12px;
  width: 100%;
}

.wfr__track {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 2px;
  background: rgba(122, 78, 32, 0.55);
  overflow: hidden;
}

/* Nur `transform` — der Fortschritt läuft auch pausiert weiter, und eine
   Breitenänderung wäre Layout- statt Compositor-Arbeit. */
.wfr__fill {
  position: absolute;
  inset: 0;
  background: var(--wfr-accent);
  transform-origin: left center;
  transition: transform 0.4s ease-out;
}

.wfr__count {
  flex-shrink: 0;
  width: var(--wfr-count-ch);
  text-align: right;
  white-space: nowrap;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
  color: #b89b5a;
  font-variant-numeric: tabular-nums;
}

/* Abschlussblitz — EIN Umschlag, keine laufende Animation. Dieselbe Farbe und
   dieselbe Dauer wie an der HUD-Karte draußen. */
.wfr--done .wfr__fill {
  background: #6ec040;
  transition-duration: 0.25s;
}

@media (prefers-reduced-motion: reduce) {
  .wfr__fill {
    transition: none;
  }
}
</style>
