<script setup lang="ts">
/**
 * Die Leiter im Pause-Panel — als eigenes Band über die volle Panelbreite,
 * direkt unter der Kopfzeile.
 *
 * Draußen steht sie als Karte oben links bei z-index 899 und liegt damit unter
 * diesem Overlay (9998); der Herold, der ihren Abschluss feiert, bei 9700
 * ebenso. Der Fortschritt lief also schon immer weiter — zu sehen war er nicht.
 *
 * Sie stand dafür einmal als 80-px-Zeile am Fuß der Zustandsspalte, wo ihr
 * 429 px blieben. Über die ganze Breite trägt sie dieselben Angaben in
 * Lesegröße, dazu den Kapitelweg, das Missions-Emblem und den Blurb.
 *
 * Die Höhe ist FEST reserviert (PAUSE_WAYFINDER_BAND_H). Wüchse sie mit dem
 * Zustand, spränge der Fit-Scale des ganzen Overlays beim Missionswechsel, beim
 * Abschlussblitz und am Ende der Leiter.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useMissionFace } from '@/composables/ui/useMissionFace'
import { formatNumberCompact } from '@/config/ui/numberFormat'
import { MISSION_CHAPTERS, MISSION_COUNT } from '@/config/progression/missions'
import { useMissionStore } from '@/stores/progression/missionStore'
import {
  MISSION_SYSTEM_ICON,
  MISSION_LADDER_DONE_TITLE,
  MISSION_LADDER_DONE_LINE,
  PAUSE_WAYFINDER_BAND_H,
  PAUSE_WAYFINDER_EMBLEM_PX,
  PAUSE_WAYFINDER_REWARD_W,
  PAUSE_WAYFINDER_COUNT_CH,
  PAUSE_WAYFINDER_CHAPTER_BAR_H,
} from '@/config/constants'

/** Meilensteine, die während DIESER Pause gefallen sind. */
const props = defineProps<{ milestones: number }>()

const { face, flashing, chapters } = useMissionFace()
const missionStore = useMissionStore()

/** Der letzte Kapitelakzent trägt den Abschluss — die Leiter endet in „The Long
 *  Vigil", und ein farbloser Zustand läse sich als Fehler. */
const LAST_CHAPTER = MISSION_CHAPTERS[MISSION_CHAPTERS.length - 1]

/** Am Ende der Leiter gibt es keine Mission mehr, deren Glyph das Emblem
 *  tragen könnte. */
const DONE_ICON = 'game-icons:flying-flag'

/**
 * Das Band verschwindet NICHT, wenn die Leiter durch ist: das Panel fiele um
 * seine reservierte Höhe, und der Fit-Scale spränge in genau dem Moment, in dem
 * die letzte Mission fällt. Es zeigt dann den Abschluss.
 */
const view = computed(() => {
  const f = face.value
  if (f) {
    return {
      accent: f.color,
      icon: f.def.icon,
      chapter: `${f.chapterNumeral} · ${f.chapterName}`,
      name: f.name,
      blurb: f.def.blurb,
      task: f.task,
      parts: f.rewardParts,
      ratio: f.ratio,
      count: `${formatNumberCompact(f.progress)} / ${formatNumberCompact(f.target)}`,
      title: `${f.name} — ${f.task} · ${f.rewardLabel}`,
    }
  }
  return {
    accent: LAST_CHAPTER.color,
    icon: DONE_ICON,
    chapter: LAST_CHAPTER.name,
    name: MISSION_LADDER_DONE_TITLE,
    blurb: MISSION_LADDER_DONE_LINE,
    task: '',
    parts: [],
    ratio: 1,
    count: `${MISSION_COUNT} / ${MISSION_COUNT}`,
    title: `${MISSION_LADDER_DONE_TITLE} — ${MISSION_LADDER_DONE_LINE}`,
  }
})

/** Der Gesamtweg — dieselbe Zahl wie im Stats-Panel („Walked"). */
const walked = computed(() => `${missionStore.claimedCount} / ${MISSION_COUNT}`)
</script>

<template>
  <section
    class="wfb"
    aria-label="Wayfinder"
    :class="{ 'wfb--done': flashing }"
    :style="{
      '--wfb-h': `${PAUSE_WAYFINDER_BAND_H}px`,
      '--wfb-emblem': `${PAUSE_WAYFINDER_EMBLEM_PX}px`,
      '--wfb-reward-w': `${PAUSE_WAYFINDER_REWARD_W}px`,
      '--wfb-count-ch': `${PAUSE_WAYFINDER_COUNT_CH}ch`,
      '--wfb-chapter-bar-h': `${PAUSE_WAYFINDER_CHAPTER_BAR_H}px`,
      '--wfb-accent': view.accent,
    }"
    :title="view.title"
  >
    <!-- Kopfzeile im Format der übrigen Abschnitte: Glyph, Beschriftung, und
         rechts die Zahlen. Dazwischen der Weg als sieben Etappen — die einzige
         Stelle außerhalb des Stats-Panels, an der man sieht, wie weit die 41
         Stufen insgesamt gegangen sind. -->
    <div class="wfb__head">
      <Icon
        :icon="MISSION_SYSTEM_ICON"
        width="18"
        height="18"
        class="wfb__head-icon"
        aria-hidden="true"
      />
      <div class="wfb__path" aria-hidden="true">
        <span
          v-for="ch in chapters"
          :key="ch.id"
          class="wfb__leg"
          :class="{
            'wfb__leg--running': ch.running,
            'wfb__leg--ahead': ch.done === 0 && !ch.running,
          }"
          :style="{ '--leg-color': ch.color }"
          :title="`${ch.name} ${ch.numeral} — ${ch.done}/${ch.size}`"
        >
          <span class="wfb__leg-numeral">{{ ch.numeral }}</span>
          <span class="wfb__leg-track">
            <span class="wfb__leg-fill" :style="{ transform: `scaleX(${ch.ratio})` }" />
          </span>
        </span>
      </div>

      <span class="wfb__walked">{{ walked }}</span>
      <!-- Die Meilensteine dieser Pause stehen neben dem Gesamtweg, nicht in
           der Kopfzeile der Bilanz: dieselbe Sorte Zahl, dieselbe Stelle. Bei
           null bleibt die Marke stehen und dimmt nur ab. -->
      <span
        class="wfb__gained"
        :class="{ 'wfb__gained--zero': props.milestones === 0 }"
        title="Wayfinder milestones claimed during this pause"
      >
        +{{ props.milestones }}
      </span>
    </div>

    <div class="wfb__body">
      <!-- Das eigene Glyph der Mission. Jedes der 41 ist einmalig und kommt
           sonst nirgends im Overlay vor. -->
      <span class="wfb__emblem">
        <Icon :icon="view.icon" class="wfb__emblem-glyph" aria-hidden="true" />
      </span>

      <div class="wfb__main">
        <span class="wfb__chapter">{{ view.chapter }}</span>
        <span class="wfb__name">{{ view.name }}</span>
        <span class="wfb__blurb">{{ view.blurb }}</span>
        <span class="wfb__task">{{ view.task }}</span>
        <span class="wfb__meter">
          <span class="wfb__track">
            <span class="wfb__fill" :style="{ transform: `scaleX(${view.ratio})` }" />
          </span>
          <span class="wfb__count">{{ view.count }}</span>
        </span>
      </div>

      <!-- Die Belohnung als eigene Plakette statt als Text am Zeilenrand: sie
           ist der Grund, die Stufe zu gehen, und stand vorher am kleinsten. -->
      <div class="wfb__boon">
        <span v-for="part in view.parts" :key="part.unit" class="wfb__boon-part">
          <img v-if="part.image" :src="part.image" class="wfb__boon-art" alt="" aria-hidden="true" />
          <span v-else class="wfb__boon-mono" aria-hidden="true">{{ part.mono }}</span>
          <span class="wfb__boon-amount">{{ part.amount }}</span>
          <span class="wfb__boon-unit">{{ part.unit }}</span>
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.wfb {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

/* ── Kopfzeile ────────────────────────────────────────── */
/* Feste Höhe wie `.sec-head` im Panel; das Systemglyph trägt links, was vorher
   danebenstand. */
.wfb__head {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 24px;
  min-width: 0;
}

.wfb__head-icon {
  flex-shrink: 0;
  color: #c89040;
}

/* Sieben Etappen, gleich breit — nicht nach Kapitelgrösse gewichtet: gezeigt
   wird der Weg, nicht die Missionszahl. */
.wfb__path {
  flex: 1 1 auto;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.wfb__leg {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.wfb__leg--ahead {
  opacity: 0.38;
}

.wfb__leg-numeral {
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  line-height: 1;
  color: rgba(216, 200, 160, 0.38);
}

.wfb__leg--running .wfb__leg-numeral {
  color: var(--leg-color);
}

.wfb__leg-track {
  position: relative;
  height: var(--wfb-chapter-bar-h);
  border-radius: 1px;
  background: rgba(122, 78, 32, 0.4);
  overflow: hidden;
}

/* Nur `transform` — der Weg wächst auch pausiert weiter. */
.wfb__leg-fill {
  position: absolute;
  inset: 0;
  background: var(--leg-color);
  transform-origin: left center;
  transition: transform 0.4s ease-out;
}

.wfb__leg--running .wfb__leg-track {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--leg-color) 55%, transparent);
}

.wfb__walked {
  flex-shrink: 0;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #f0d060;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.wfb__gained {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #7ad0be;
  white-space: nowrap;
}

.wfb__gained--zero {
  opacity: 0.3;
}

/* ── Körper ───────────────────────────────────────────── */
/* Feste Höhe, der Inhalt richtet sich danach — nicht umgekehrt.
   `clip` statt `hidden`: ein Scrollport liesse sich verschieben. */
.wfb__body {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) var(--wfb-reward-w);
  align-items: center;
  gap: 20px;
  height: var(--wfb-h);
  min-width: 0;
  padding: 0 16px;
  background: #16140e;
  border: 1px solid #3e200a;
  border-left: 3px solid var(--wfb-accent);
  border-radius: 4px;
  overflow: clip;
}

.wfb__emblem {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: var(--wfb-emblem);
  height: var(--wfb-emblem);
  border-radius: 4px;
  background: #0d0b06;
  box-shadow: inset 0 0 0 1px rgba(122, 78, 32, 0.5);
}

.wfb__emblem-glyph {
  width: 60%;
  height: 60%;
  color: var(--wfb-accent);
}

.wfb__main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

/* Jedes Feld EINZEILIG mit Auslassung: ein Umbruch änderte die Bandhöhe und
   damit den Fit-Scale des ganzen Overlays. */
.wfb__chapter,
.wfb__name,
.wfb__blurb,
.wfb__task {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.wfb__chapter {
  height: 14px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  line-height: 1.2;
  color: var(--wfb-accent);
}

.wfb__name {
  height: 30px;
  font-size: 1.7rem;
  font-weight: 800;
  line-height: 1.15;
  color: #f2ead2;
}

.wfb__blurb {
  height: 16px;
  font-size: 0.82rem;
  font-style: italic;
  line-height: 1.3;
  color: rgba(154, 145, 132, 0.75);
}

.wfb__task {
  height: 18px;
  font-size: 0.92rem;
  line-height: 1.3;
  color: #9a9184;
}

.wfb__meter {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 12px;
  width: 100%;
  margin-top: 2px;
}

.wfb__track {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 6px;
  border-radius: 1px;
  background: rgba(122, 78, 32, 0.55);
  overflow: hidden;
}

/* Nur `transform` — der Fortschritt läuft auch pausiert weiter, und eine
   Breitenänderung wäre Layout- statt Compositor-Arbeit. */
.wfb__fill {
  position: absolute;
  inset: 0;
  background: var(--wfb-accent);
  transform-origin: left center;
  transition: transform 0.4s ease-out;
}

.wfb__count {
  flex-shrink: 0;
  width: var(--wfb-count-ch);
  text-align: right;
  white-space: nowrap;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
  color: #b89b5a;
  font-variant-numeric: tabular-nums;
}

/* ── Die Plakette ─────────────────────────────────────── */
/* Reservierte Breite, höchstens zwei Teile (missionRewardParts). Sie steht als
   eigene Fläche, nicht als Text am Rand: sie ist der Grund, die Stufe zu
   gehen. */
.wfb__boon {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  width: var(--wfb-reward-w);
  min-width: 0;
  padding: 8px 12px;
  background: #0d0b06;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px rgba(122, 78, 32, 0.5);
}

.wfb__boon-part {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
}

.wfb__boon-art {
  align-self: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  object-fit: contain;
}

/* Vier Materialien haben kein Artwork — gleiche Kantenlänge wie ein Bild,
   damit die Felder in Flucht bleiben (Muster der Header-Materialzeile). */
.wfb__boon-mono {
  align-self: center;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 3px;
  background: #241b12;
  border: 1px solid rgba(200, 144, 64, 0.28);
  color: var(--wfb-accent);
  font-family: ui-monospace, Menlo, monospace;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

/* Die Zahl kürzt nie — die Einheit weicht. */
.wfb__boon-amount {
  flex-shrink: 0;
  font-size: 1.3rem;
  font-weight: 900;
  line-height: 1;
  color: var(--wfb-accent);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.wfb__boon-unit {
  min-width: 0;
  overflow: hidden;
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  line-height: 1.1;
  text-transform: uppercase;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--wfb-accent);
  opacity: 0.7;
}

/* Abschlussblitz — EIN Umschlag, keine laufende Animation. Dieselbe Farbe und
   dieselbe Dauer wie an der HUD-Karte draußen. */
.wfb--done .wfb__fill {
  background: #6ec040;
  transition-duration: 0.25s;
}

.wfb--done .wfb__boon-amount,
.wfb--done .wfb__boon-unit,
.wfb--done .wfb__boon-mono {
  color: #6ec040;
}

@media (prefers-reduced-motion: reduce) {
  .wfb__fill,
  .wfb__leg-fill {
    transition: none;
  }
}
</style>
