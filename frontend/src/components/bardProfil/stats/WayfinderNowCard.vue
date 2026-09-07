<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useMissionFace } from '@/composables/ui/useMissionFace'
import { useMissionStore } from '@/stores/progression/missionStore'
import { MISSION_CHAPTERS, MISSION_COUNT } from '@/config/progression/missions'
import { formatNumber } from '@/config/ui/numberFormat'
import {
  MISSION_LADDER_DONE_LINE,
  MISSION_LADDER_DONE_TITLE,
  MISSION_SYSTEM_ICON,
} from '@/config/constants'

/**
 * Der Wayfinder auf der Übersicht: die laufende Stufe, sonst nichts.
 * Kein Abzeichen, kein `markSeen()` — eingelöst wird von selbst.
 */
const { face, flashing, chapters } = useMissionFace()
const missionStore = useMissionStore()

const LAST_CHAPTER = MISSION_CHAPTERS[MISSION_CHAPTERS.length - 1]
const DONE_ICON = 'game-icons:flying-flag'

const view = computed(() => {
  const f = face.value
  if (f) {
    return {
      accent: f.color,
      icon: f.def.icon,
      chapter: `${f.chapterName} ${f.chapterNumeral}`,
      name: f.name,
      task: f.task,
      parts: f.rewardParts,
      ratio: f.ratio,
      count: `${formatNumber(f.progress)} / ${formatNumber(f.target)}`,
      unit: f.def.unit,
    }
  }
  return {
    accent: LAST_CHAPTER.color,
    icon: DONE_ICON,
    chapter: `${LAST_CHAPTER.name} ${chapters.value.at(-1)?.numeral ?? ''}`,
    name: MISSION_LADDER_DONE_TITLE,
    task: MISSION_LADDER_DONE_LINE,
    parts: [],
    ratio: 1,
    count: `${MISSION_COUNT} / ${MISSION_COUNT}`,
    unit: '',
  }
})

const walked = computed(() => `${missionStore.claimedCount} / ${MISSION_COUNT}`)
</script>

<template>
  <section
    class="jt-wf"
    :class="{ 'is-flash': flashing }"
    :style="{ '--accent': view.accent }"
    aria-label="Wayfinder"
  >
    <div class="jt-wf-head">
      <Icon :icon="MISSION_SYSTEM_ICON" width="20" height="20" class="jt-wf-sys" aria-hidden="true" />
      <span v-ink-center class="jt-wf-title">Wayfinder</span>
      <span v-ink-center class="jt-wf-chapter">{{ view.chapter }}</span>
      <span v-ink-center class="jt-wf-walked" v-tip="'Milestones claimed across the whole ladder'">
        {{ walked }}
      </span>
    </div>

    <div class="jt-wf-path" aria-hidden="true">
      <span
        v-for="ch in chapters"
        :key="ch.id"
        class="jt-wf-leg"
        :class="{ 'is-running': ch.running, 'is-done': ch.complete }"
        :style="{ '--leg': ch.color }"
        v-tip="`${ch.name} ${ch.numeral} — ${ch.done}/${ch.size}`"
      >
        <span class="jt-wf-leg-fill" :style="{ transform: `scaleX(${ch.ratio})` }" />
      </span>
    </div>

    <div class="jt-wf-body">
      <span class="jt-wf-emblem">
        <Icon :icon="view.icon" class="jt-wf-glyph" aria-hidden="true" />
      </span>
      <div class="jt-wf-main">
        <span class="jt-wf-name">{{ view.name }}</span>
        <span class="jt-wf-task">{{ view.task }}</span>
      </div>
    </div>

    <div class="jt-wf-meter">
      <span class="jt-wf-track">
        <span class="jt-wf-fill" :style="{ transform: `scaleX(${view.ratio})` }" />
      </span>
      <span v-ink-center class="jt-wf-count">{{ view.count }}</span>
    </div>

    <div v-if="view.parts.length" class="jt-wf-boon">
      <span v-ink-center class="jt-wf-boon-lbl">Reward</span>
      <span v-for="part in view.parts" :key="part.unit" class="jt-wf-part">
        <img v-if="part.image" :src="part.image" class="jt-wf-part-art" alt="" aria-hidden="true" />
        <span v-else class="jt-wf-part-mono" aria-hidden="true">{{ part.mono }}</span>
        <span v-ink-center class="jt-wf-part-amount" :style="{ color: part.color }">
          +{{ part.amount }}
        </span>
        <span v-ink-center class="jt-wf-part-unit">{{ part.unit }}</span>
      </span>
    </div>
  </section>
</template>

<style scoped>
.jt-wf {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 12px 14px;
  background: #1a1008;
  border: 1px solid #2c1806;
  border-left: 3px solid var(--accent);
  border-radius: 4px;
}

.jt-wf-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.jt-wf-sys {
  color: var(--accent);
  flex-shrink: 0;
}
.jt-wf-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--rpg-gold);
}
.jt-wf-chapter {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: #8a7a58;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.jt-wf-walked {
  font-size: 13px;
  font-weight: 800;
  color: var(--rpg-text-muted);
  white-space: nowrap;
  cursor: help;
}

/* sieben Etappen als schmale Leisten */
.jt-wf-path {
  display: flex;
  gap: 3px;
}
.jt-wf-leg {
  flex: 1;
  height: 4px;
  background: #0d0904;
  border-radius: 2px;
  overflow: hidden;
  cursor: help;
}
.jt-wf-leg-fill {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: var(--leg);
  opacity: 0.55;
}
.jt-wf-leg.is-running .jt-wf-leg-fill,
.jt-wf-leg.is-done .jt-wf-leg-fill {
  opacity: 1;
}

.jt-wf-body {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.jt-wf-emblem {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  background: #141410;
  border: 1px solid color-mix(in srgb, var(--accent) 45%, #2c1806);
  border-radius: 5px;
}
.jt-wf-glyph {
  width: 34px;
  height: 34px;
  color: var(--accent);
}
.jt-wf-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.jt-wf-name {
  font-size: 20px;
  font-weight: 900;
  line-height: 1.1;
  color: #f0e6c8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.jt-wf-task {
  font-size: 13px;
  line-height: 1.3;
  color: var(--rpg-text-muted);
}

.jt-wf-meter {
  display: flex;
  align-items: center;
  gap: 10px;
}
.jt-wf-track {
  flex: 1;
  height: 12px;
  background: #0d0904;
  border: 1px solid #2c1806;
  border-radius: 3px;
  overflow: hidden;
}
.jt-wf-fill {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: var(--accent);
}
.jt-wf-count {
  font-size: 14px;
  font-weight: 800;
  color: var(--rpg-gold);
  white-space: nowrap;
}

.jt-wf-boon {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid #2c1806;
}
.jt-wf-boon-lbl {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8a7a58;
}
.jt-wf-part {
  display: flex;
  align-items: center;
  gap: 5px;
}
.jt-wf-part-art {
  width: 22px;
  height: 22px;
  object-fit: contain;
}
.jt-wf-part-mono {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  font-size: 10px;
  font-weight: 900;
  color: #8a7a58;
  background: #141410;
  border-radius: 4px;
}
.jt-wf-part-amount {
  font-size: 18px;
  font-weight: 900;
  line-height: 1;
}
.jt-wf-part-unit {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8a7a58;
}

/* Abschlussblitz: nur die Deckkraft einer statischen Kante atmet */
.jt-wf.is-flash {
  border-left-color: #6ec040;
}
.jt-wf.is-flash .jt-wf-fill {
  background: #6ec040;
}

@media (max-height: 1100px) {
  .jt-wf {
    gap: 8px;
    padding: 10px 12px;
  }
  .jt-wf-emblem {
    width: 46px;
    height: 46px;
  }
  .jt-wf-glyph {
    width: 28px;
    height: 28px;
  }
  .jt-wf-name {
    font-size: 18px;
  }
}
</style>
