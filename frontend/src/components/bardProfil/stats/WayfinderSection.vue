<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useMissionStore } from '@/stores/progression/missionStore'
import {
  MISSIONS,
  MISSION_CHAPTERS,
  MISSION_COUNT,
  MISSION_CHAPTER_STARTS,
  MISSION_CHAPTER_SIZES,
  missionObjectiveLine,
  missionRewardLabel,
} from '@/config/progression/missions'
import { progressMetricValue } from '@/utils/game/progressMetrics'
import { formatNumber } from '@/config/ui/numberFormat'
import { toRoman } from '@/utils/ui/format'
import StatsColumnHeader from './StatsColumnHeader.vue'

/**
 * Der Wayfinder zum Nachschlagen — am Fuß der Journey-Spalte, spiegelbildlich
 * zum Codex am Fuß der Mittelspalte. Im Deck gilt damit eine ablesbare Regel:
 * eine Fortschrittsleiter hängt am Fuß ihrer Spalte.
 *
 * Warum hier und nicht in der Mitte oder rechts: die Mittelspalte trägt den
 * Codex und ist auf WUXGA mit gemessenen 422×278 px am Anschlag; die rechte
 * `.sf-stack` teilt sich exakt hälftig auf zwei Panels, ein drittes drittelte
 * beide. Diese Spalte SCROLLT bereits — eine Sektion an ihrem Fuß kostet keine
 * Höhe, nur Scrollweg. Und „Journey" ist inhaltlich genau der Ort für die
 * Leiter der Wanderung.
 *
 * Master-Detail wie im Codex, aus demselben Grund: 41 Missionen nebeneinander
 * gibt es hier nicht. Sieben Kapitelwappen tragen den Überblick, EIN Feld
 * darunter die Tiefe. Kein Abzeichen an der Tab-Leiste und kein `markSeen()` —
 * eingelöst wird von selbst; eine Marke schickte den Spieler an eine Stelle, an
 * der es nichts zu tun gibt.
 */
const store = useMissionStore()

/** Angeheftet per Klick; überlebt das Verlassen der Reihe. */
const pinnedId = ref<string | null>(null)
/** Vorschau per Hover; hat Vorrang, solange die Maus auf einem Wappen steht. */
const hoverId = ref<string | null>(null)

/** Das Kapitel, in dem die Leiter gerade steht — der Rückfall ohne Wahl. */
const currentChapterId = computed(() => {
  const def = MISSIONS[Math.min(store.index, MISSION_COUNT - 1)]
  return def?.chapter ?? MISSION_CHAPTERS[0].id
})

const focusId = computed(() => hoverId.value ?? pinnedId.value ?? currentChapterId.value)

interface ChapterView {
  id: string
  name: string
  color: string
  numeral: string
  /** Wie viele Missionen des Kapitels stehen. */
  done: number
  size: number
  ratio: number
  /** Das Kapitel ist vollständig gegangen. */
  complete: boolean
  /** Die Leiter steht gerade darin. */
  running: boolean
}

const chapterViews = computed<ChapterView[]>(() =>
  MISSION_CHAPTERS.map((chapter, i) => {
    const start = MISSION_CHAPTER_STARTS[chapter.id]
    const size = MISSION_CHAPTER_SIZES[chapter.id]
    const done = Math.max(0, Math.min(store.index - start, size))
    return {
      id: chapter.id,
      name: chapter.name,
      color: chapter.color,
      numeral: toRoman(i + 1),
      done,
      size,
      ratio: size > 0 ? done / size : 0,
      complete: done >= size,
      running: chapter.id === currentChapterId.value,
    }
  }),
)

const focusChapter = computed(
  () => chapterViews.value.find((c) => c.id === focusId.value) ?? chapterViews.value[0],
)

interface RungView {
  id: string
  name: string
  icon: string
  objective: string
  reward: string
  blurb: string
  /** 'done' = eingelöst · 'running' = die laufende Stufe · 'ahead' = noch fern. */
  state: 'done' | 'running' | 'ahead'
  progress: number
  target: number
  unit: string
  ratio: number
}

/**
 * Die Missionen des gewählten Kapitels. Der Stand wird auch für weit entfernte
 * Stufen gezeigt: er ist absolut gemessen und damit jederzeit ablesbar — genau
 * das ist der Unterschied zu einem Omen, dessen Fortschritt erst mit der Annahme
 * beginnt.
 */
const focusRungs = computed<RungView[]>(() => {
  const chapter = focusChapter.value
  if (!chapter) return []
  return MISSIONS.filter((m) => m.chapter === chapter.id).map((def) => {
    const index = MISSIONS.indexOf(def)
    const raw = progressMetricValue(def.metric)
    const progress = Math.min(raw, def.target)
    return {
      id: def.id,
      name: def.name,
      icon: def.icon,
      objective: missionObjectiveLine(def),
      reward: missionRewardLabel(def),
      blurb: def.blurb,
      state: index < store.index ? 'done' : index === store.index ? 'running' : 'ahead',
      progress,
      target: def.target,
      unit: def.unit,
      ratio: def.target > 0 ? progress / def.target : 0,
    }
  })
})

function toggle(id: string) {
  pinnedId.value = pinnedId.value === id ? null : id
}
</script>

<template>
  <div class="wfs-zone">
    <StatsColumnHeader class="wfs-head" title="Wayfinder">
      <template #meta>
        <span
          class="wfs-read"
          title="The chapter the ladder currently stands in — it advances as milestones are claimed"
        >
          <span class="wfs-read-cap">Chapter</span>
          <span class="wfs-read-val">{{ focusChapter?.name }} {{ focusChapter?.numeral }}</span>
        </span>
        <span class="wfs-read-sep" aria-hidden="true"></span>
        <span class="wfs-read" title="Milestones claimed across the whole ladder">
          <span class="wfs-read-cap">Walked</span>
          <span class="wfs-read-val">
            {{ store.claimedCount }}<span class="wfs-read-of">/{{ MISSION_COUNT }}</span>
          </span>
        </span>
      </template>
    </StatsColumnHeader>

    <!-- Ein Spielstand, der älter ist als die Leiter, startet weit vorn. Ohne
         diese Zeile liest sich das wie ein Fehler. -->
    <p v-if="store.caughtUp > 0" class="wfs-caught">
      {{ store.caughtUp }} already behind you when the Wayfinder opened
    </p>

    <!-- Kapitelwappen: der Überblick. Hover zeigt, Klick heftet an. -->
    <div class="wfs-chapters">
      <button
        v-for="chapter in chapterViews"
        :key="chapter.id"
        type="button"
        class="wfs-chapter"
        :class="{
          'is-focus': chapter.id === focusId,
          'is-done': chapter.complete,
          'is-ahead': chapter.done === 0 && !chapter.running,
        }"
        :style="{ '--accent': chapter.color }"
        :title="`${chapter.name} ${chapter.numeral} — ${chapter.done}/${chapter.size} claimed`"
        @mouseenter="hoverId = chapter.id"
        @mouseleave="hoverId = null"
        @click="toggle(chapter.id)"
      >
        <span class="wfs-chapter__numeral">{{ chapter.numeral }}</span>
        <span class="wfs-chapter__bar">
          <span
            class="wfs-chapter__fill"
            :style="{ transform: `scaleX(${chapter.ratio})` }"
          ></span>
        </span>
      </button>
    </div>

    <!-- Das Detailfeld: die Missionen des gewählten Kapitels. -->
    <ul class="wfs-rungs" :style="{ '--accent': focusChapter?.color }">
      <li
        v-for="rung in focusRungs"
        :key="rung.id"
        class="wfs-rung"
        :class="`is-${rung.state}`"
        :title="rung.blurb"
      >
        <span class="wfs-rung__mark">
          <Icon v-if="rung.state === 'done'" icon="lucide:check" width="13" height="13" />
          <Icon v-else :icon="rung.icon" width="13" height="13" />
        </span>

        <span class="wfs-rung__body">
          <span class="wfs-rung__top">
            <span class="wfs-rung__name">{{ rung.name }}</span>
            <span class="wfs-rung__reward">{{ rung.reward }}</span>
          </span>
          <span class="wfs-rung__objective">{{ rung.objective }}</span>
          <span v-if="rung.state !== 'done'" class="wfs-rung__bar">
            <span class="wfs-rung__fill" :style="{ transform: `scaleX(${rung.ratio})` }"></span>
          </span>
        </span>

        <span v-if="rung.state !== 'done'" class="wfs-rung__count">
          {{ formatNumber(rung.progress) }}/{{ formatNumber(rung.target) }}
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.wfs-zone {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #2a2318;
}

/* ── Kopfzahlen ── */
.wfs-read {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.wfs-read-cap {
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #6a6258;
}

.wfs-read-val {
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  color: #e8dcc0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wfs-read-of {
  font-size: 10px;
  font-weight: 700;
  color: #8a7a52;
}

.wfs-read-sep {
  width: 1px;
  align-self: stretch;
  margin: 2px 0;
  background: #2a2318;
}

.wfs-caught {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.3;
  color: #5a5248;
}

/* ── Kapitelwappen ── */
.wfs-chapters {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.wfs-chapter {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 5px 2px 4px;
  background: #141410;
  border: 1px solid #2a2318;
  border-radius: 4px;
  cursor: pointer;
  transition:
    background 0.14s ease-out,
    border-color 0.14s ease-out;
}

.wfs-chapter:hover,
.wfs-chapter.is-focus {
  background: #1c1c18;
  border-color: var(--accent);
}

.wfs-chapter.is-ahead {
  opacity: 0.5;
  filter: grayscale(55%);
}

.wfs-chapter__numeral {
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  color: #8a7a52;
}

.wfs-chapter.is-focus .wfs-chapter__numeral,
.wfs-chapter.is-done .wfs-chapter__numeral {
  color: var(--accent);
}

.wfs-chapter__bar {
  display: block;
  width: 100%;
  height: 3px;
  background: #100e08;
  border-radius: 2px;
  overflow: hidden;
}

.wfs-chapter__fill {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: var(--accent);
  transition: transform 0.3s ease-out;
}

/* ── Missionsliste ── */
.wfs-rungs {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.wfs-rung {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 5px 7px;
  background: #1c1c18;
  border: 1px solid #2a2318;
  border-radius: 4px;
}

.wfs-rung.is-running {
  border-color: var(--accent);
  background: #1a1008;
}

.wfs-rung.is-ahead {
  opacity: 0.5;
  filter: grayscale(55%);
}

.wfs-rung__mark {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: #6a6258;
}

.wfs-rung.is-done .wfs-rung__mark {
  color: #52b830;
}

.wfs-rung.is-running .wfs-rung__mark {
  color: var(--accent);
}

.wfs-rung__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wfs-rung__top {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.wfs-rung__name {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.15;
  color: #e8dcc0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wfs-rung__reward {
  flex-shrink: 0;
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.4px;
  color: #7a9a6a;
}

.wfs-rung__objective {
  font-size: 10.5px;
  line-height: 1.25;
  color: #8a7a52;
}

.wfs-rung__bar {
  display: block;
  height: 2px;
  margin-top: 2px;
  background: rgba(255, 255, 255, 0.07);
}

.wfs-rung__fill {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: var(--accent);
  transition: transform 0.3s ease-out;
}

.wfs-rung__count {
  flex-shrink: 0;
  align-self: center;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #8a7a52;
}

@media (min-width: 2400px) {
  .wfs-read-cap {
    font-size: 10px;
  }
  .wfs-read-val {
    font-size: 15px;
  }
  .wfs-chapter__numeral {
    font-size: 14px;
  }
  .wfs-rung__name {
    font-size: 14px;
  }
  .wfs-rung__objective {
    font-size: 12px;
  }
  .wfs-rung__reward,
  .wfs-rung__count {
    font-size: 10.5px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wfs-chapter__fill,
  .wfs-rung__fill {
    transition: none;
  }
}
</style>
