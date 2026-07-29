<script setup lang="ts">
/**
 * Die drei Statistik-Kacheln über der Fortschrittszeile: Universe, Galaxy
 * und Meeps. Jede besteht aus Icon und einer Textspalte (Bezeichnung über
 * Wert); die Gruppen stehen mit gleichem Abstand über die Balkenbreite.
 *
 * Die Bezeichnungen stehen ausgeschrieben, solange die Zeile sie trägt, und
 * fallen sonst auf die Kurzform zurück — gemessen, nicht geraten, siehe
 * measureFit().
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/gameStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { formatNumber } from '@/config/numberFormat'
import { universes } from '@/config/universes'
import { toRoman } from '@/utils/format'
import {
  HEADER_UNIVERSE_ICON,
  MEEP_COUNTUP_STEPS,
  MEEP_COUNTUP_INTERVAL_MS,
  MEEP_RISING_HOLD_MS,
} from '@/config/constants'

defineProps<{
  /** Die Fortschrittszeile wird gehovert — die Meep-Kachel leuchtet mit. */
  lit?: boolean
}>()

const emit = defineEmits<{ (e: 'meep-hover', hovered: boolean): void }>()

const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()

/** Römisch statt arabisch: die Universe-Ebene steht damit sichtbar über der
    Galaxie-Zählung und bleibt selbst bei XII kurz genug für die Kachel. */
const universeRoman = computed(() => toRoman(gameStore.currentUniverse))

const universeTitle = computed(() => {
  const name = universes[gameStore.currentUniverse - 1]?.name ?? 'Unknown'
  return `Universe ${universeRoman.value} — ${name} (${gameStore.currentUniverse}/${gameStore.totalUniverses})`
})

/* ── Meep-Zähler ─────────────────────────────────────────────────────── */
const displayMeeps = ref(gameStore.meeps)
const isIncreasing = ref(false)

// Ein einziger laufender Tween: ohne das Aufräumen stapeln sich bei mehreren
// Meep-Gewinnen kurz hintereinander die Intervalle und zählen gegeneinander.
let countUpTimer: ReturnType<typeof setInterval> | null = null
let risingTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => gameStore.meeps,
  (newVal, oldVal) => {
    if (countUpTimer) clearInterval(countUpTimer)
    if (risingTimer) clearTimeout(risingTimer)
    isIncreasing.value = newVal > oldVal
    const stepSize = (newVal - oldVal) / MEEP_COUNTUP_STEPS
    let current = oldVal
    let i = 0
    countUpTimer = setInterval(() => {
      i++
      current += stepSize
      displayMeeps.value = Math.round(i < MEEP_COUNTUP_STEPS ? current : newVal)
      if (i >= MEEP_COUNTUP_STEPS) {
        if (countUpTimer) clearInterval(countUpTimer)
        countUpTimer = null
        risingTimer = setTimeout(() => (isIncreasing.value = false), MEEP_RISING_HOLD_MS)
      }
    }, MEEP_COUNTUP_INTERVAL_MS)
  },
)

/* ── Ausgeschriebene oder gekürzte Bezeichnungen ─────────────────────── */
const statsEl = ref<HTMLElement | null>(null)
const showFullLabels = ref(true)

/**
 * Misst, ob die Zeile die ausgeschriebenen Bezeichnungen trägt.
 *
 * Gerechnet wird immer mit dem VOLLEN Bedarf — die unsichtbaren Sonden
 * (.label-probe) tragen die langen Wörter unabhängig davon, was gerade
 * angezeigt wird. Ohne diese Unabhängigkeit würde die Messung mit ihrem
 * eigenen Ergebnis schwingen: kurze Labels schaffen Platz, der Platz
 * erlaubt lange Labels, die langen Labels nehmen ihn wieder weg.
 *
 * Je Kachel die breitere ihrer beiden Zeilen: die Bezeichnung, oder Icon +
 * Innenabstand + Wert. Der Wert zählt über scrollWidth, also ungekürzt,
 * auch wenn er im Layout gerade ellipsiert.
 */
function measureFit(): void {
  const root = statsEl.value
  if (!root || !root.clientWidth) return
  const outerGap = parseFloat(getComputedStyle(root).columnGap) || 0
  let need = outerGap * 2
  for (const tile of Array.from(root.querySelectorAll<HTMLElement>('.uni-tile'))) {
    const row = tile.querySelector<HTMLElement>('.tile-row')
    const icon = tile.querySelector<HTMLElement>('.tile-icon')
    const probe = tile.querySelector<HTMLElement>('.label-probe')
    const value = tile.querySelector<HTMLElement>('.tile-value')
    if (!row || !icon || !probe || !value) return
    const valueRow =
      icon.getBoundingClientRect().width +
      (parseFloat(getComputedStyle(row).columnGap) || 0) +
      value.scrollWidth
    need += Math.max(probe.getBoundingClientRect().width, valueRow)
  }
  showFullLabels.value = need <= root.clientWidth
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  measureFit()
  resizeObserver = new ResizeObserver(measureFit)
  if (statsEl.value) resizeObserver.observe(statsEl.value)
  // Vor dem Laden von MedievalSharp misst der Fallback-Font eine andere Breite.
  document.fonts?.ready.then(measureFit)
})

// Ein längerer Wert kann die Zeile kippen — Galaxie- und Meep-Zahl wachsen
// im Spielverlauf, die römische Ziffer beim Prestige.
watch([universeRoman, () => galaxyStore.currentGalaxy, displayMeeps], measureFit)

onUnmounted(() => {
  resizeObserver?.disconnect()
  if (countUpTimer) clearInterval(countUpTimer)
  if (risingTimer) clearTimeout(risingTimer)
})
</script>

<template>
  <div ref="statsEl" class="uni-stats">
    <div class="uni-tile uni-tile--universe" :title="universeTitle">
      <span v-ink-center.x.y class="tile-label">{{ showFullLabels ? 'Universe' : 'Uni' }}</span>
      <span class="tile-label label-probe" aria-hidden="true">Universe</span>
      <div class="tile-row">
        <Icon
          :icon="HEADER_UNIVERSE_ICON"
          width="24"
          height="24"
          class="tile-icon uv-icon"
          aria-hidden="true"
        />
        <span v-ink-center.x.y class="tile-value uv-value">{{ universeRoman }}</span>
      </div>
    </div>

    <div class="uni-tile uni-tile--galaxy" title="Current galaxy">
      <span v-ink-center.x.y class="tile-label">{{ showFullLabels ? 'Galaxy' : 'Gal' }}</span>
      <span class="tile-label label-probe" aria-hidden="true">Galaxy</span>
      <div class="tile-row">
        <img src="/img/galaxy-far-128.png" class="tile-icon gx-icon" alt="" aria-hidden="true" />
        <span v-ink-center.x.y class="tile-value gx-value">{{ galaxyStore.currentGalaxy }}</span>
      </div>
    </div>

    <div
      class="uni-tile uni-tile--meep"
      :class="{ 'uni-tile--rising': isIncreasing, 'uni-tile--lit': lit }"
      title="Meeps — spend them in the Skill Tree"
      @mouseenter="emit('meep-hover', true)"
      @mouseleave="emit('meep-hover', false)"
    >
      <span v-ink-center.x.y class="tile-label">{{ showFullLabels ? 'Meeps' : 'Meep' }}</span>
      <span class="tile-label label-probe" aria-hidden="true">Meeps</span>
      <div class="tile-row">
        <img
          src="/img/BardAbilities/BardMeep.png"
          class="tile-icon meep-icon"
          alt=""
          aria-hidden="true"
        />
        <span v-ink-center.x.y class="tile-value meep-value">{{
          formatNumber(displayMeeps)
        }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ================================================================
   Maße an --header-height statt an cqw: mit den Breiten-Caps auf
   Tree-Button und Sun-Phase bleibt dieser Block über alle Desktop-
   Auflösungen bei ~290px, statt von Full HD zu 4K um 25px zu
   schrumpfen. cqw hätte die Kacheln damit mit steigender Auflösung
   KLEINER gemacht — die Header-Höhe wächst dagegen mit, und genau
   ihr folgen Icon, Bezeichnung und Wert.
   ================================================================ */
.uni-stats {
  /* Einmal berechnet, zweimal gebraucht: als Schriftgröße des Werts und als
     Bezug für den Tintenausgleich der Textspalte (siehe .tile-text). */
  --stat-value-size: min(calc(var(--header-height) * 0.28), 24px);
  display: flex;
  align-items: center;
  /* Die drei Gruppen sind inhaltsbreit (flex-grow 0), der Restraum wird
     zwischen ihnen gleich verteilt: die Lücke Universe↔Galaxy ist damit
     exakt so groß wie Galaxy↔Meeps, egal wie unterschiedlich lang die
     Werte gerade sind. */
  justify-content: space-between;
  /* Untergrenze für den Fall, dass die Werte die Zeile ganz ausfüllen. */
  gap: clamp(6px, 0.5vw, 10px);
  width: 100%;
  min-width: 0;
  flex-shrink: 0;
}

/* Zwei Zeilen: die Bezeichnung über Icon und Wert. Die Kachel wird dadurch
   schmaler als in der einzeiligen Anordnung — das lange Wort steht jetzt
   ÜBER dem Icon statt neben ihm und addiert sich nicht mehr zu dessen
   Breite. Genau diese Ersparnis lässt die ausgeschriebenen Bezeichnungen
   häufiger passen. */
.uni-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  transition: filter 0.3s;
}

/* Icon und Wert auf einer Linie. align-items: center stellt die Boxen
   mittig zueinander, v-ink-center am Wert rückt dessen Tinte in seiner
   Box mittig — zusammen sitzt die Ziffer auf der Achse des Icons. Anders
   als bei der früheren zweizeiligen Textspalte bleibt dabei kein Rest:
   hier steht nur EINE Zeilenbox neben dem Icon. */
.tile-row {
  display: flex;
  align-items: center;
  gap: clamp(2px, 0.2vw, 5px);
  min-width: 0;
  max-width: 100%;
}

/* Kein grow: jede Gruppe ist genau so breit wie ihr Inhalt, den Rest
   verteilt space-between gleichmäßig dazwischen. Universe und Galaxy sind
   per min-content gegen Kürzung geschützt — "VIII" und dreistellige
   Galaxien sind die längsten Fälle und beide endlich. */
.uni-tile--universe,
.uni-tile--galaxy {
  flex: 0 1 auto;
  min-width: min-content;
}

/* Meeps bewusst OHNE min-content: die Zahl ist nach oben offen und würde
   die Zeile sonst über den Block hinausschieben, wo der Portal-Wrap sie
   hart clippt. Ellipsis am eigenen Wert ist der bessere Ausfall. */
.uni-tile--meep {
  flex: 0 1 auto;
  min-width: 0;
}

.uni-tile--rising {
  filter: drop-shadow(0 0 7px rgba(251, 146, 60, 0.5));
}

/* Cap bei 26px: darüber frisst das Icon genau die Breite, die "VIII" bzw.
   die Meep-Zahl daneben zum Wachsen braucht — siehe .tile-value. */
.tile-icon {
  width: min(calc(var(--header-height) * 0.3), 26px);
  height: min(calc(var(--header-height) * 0.3), 26px);
  object-fit: contain;
  flex-shrink: 0;
  user-select: none;
  transform: translateZ(0);
  will-change: transform;
  transition:
    transform 0.2s,
    filter 0.3s;
}

.tile-label {
  font-size: min(calc(var(--header-height) * 0.13), 12px);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
  color: #9b8461;
}

/* Unsichtbare Sonde: trägt immer die ausgeschriebene Bezeichnung und gibt
   measureFit() deren Breite, ohne das Layout zu verändern. */
.label-probe {
  position: absolute;
  top: 0;
  left: 0;
  visibility: hidden;
  pointer-events: none;
}

.tile-value {
  /* Cap 24px aus der Messung: bei ~290px Blockbreite passt "999.9M" in die
     Meep-Kachel und "VIII" in die Universe-Kachel gerade noch ungekürzt —
     eine Stufe größer und beide ellipsieren. */
  font-size: var(--stat-value-size);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  line-height: 1.05;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  transition:
    color 0.3s,
    text-shadow 0.3s;
}

/* ── Universe ──────────────────────────────────────── */
/* Amethyst statt Gold: greift die Prestige-Palette der Zeile darunter auf,
   damit die drei Kacheln je eine eigene Farbe tragen (violett / grün / orange). */
.uv-icon {
  color: #b98cf5;
  filter: drop-shadow(0 0 5px rgba(150, 96, 235, 0.5));
}

.uni-tile--universe:hover .uv-icon {
  transform: scale(1.08) translateZ(0);
  filter: drop-shadow(0 0 10px rgba(150, 96, 235, 0.95));
}

.uv-value {
  color: #d7bcff;
  text-shadow: 0 0 10px rgba(150, 96, 235, 0.4);
  /* Römische Ziffern: etwas mehr Laufweite, sonst kleben I und I aneinander. */
  letter-spacing: 0.06em;
}

/* ── Galaxy ────────────────────────────────────────── */
.gx-icon {
  filter: drop-shadow(0 0 5px rgba(138, 100, 220, 0.45));
}

.uni-tile--galaxy:hover .gx-icon {
  transform: scale(1.08) translateZ(0);
  filter: drop-shadow(0 0 10px rgba(138, 100, 220, 0.9));
}

.gx-value {
  color: var(--rpg-green-border, #6ec040);
  text-shadow: 0 0 10px rgba(110, 192, 64, 0.35);
}

/* ── Meeps ─────────────────────────────────────────── */
.meep-icon {
  filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.7));
  animation: meep-pulse 3s ease-in-out infinite;
}

.uni-tile--meep:hover .meep-icon {
  transform: scale(1.08) translateZ(0);
  filter: drop-shadow(0 0 12px rgba(251, 146, 60, 1));
}

.meep-value {
  color: #fed7aa;
  text-shadow: 0 0 8px rgba(251, 146, 60, 0.35);
}

.uni-tile--rising .meep-value,
.uni-tile--lit .meep-value {
  color: #fdba74;
  text-shadow:
    0 0 12px rgba(251, 146, 60, 0.85),
    0 0 24px rgba(251, 146, 60, 0.4);
}

.uni-tile--lit .meep-icon {
  filter: drop-shadow(0 0 10px rgba(251, 146, 60, 0.9));
  transform: scale(1.04) translateZ(0);
}

@keyframes meep-pulse {
  0%,
  100% {
    filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.55));
  }
  50% {
    filter: drop-shadow(0 0 12px rgba(251, 146, 60, 0.9));
  }
}

@media (prefers-reduced-motion: reduce) {
  .meep-icon {
    animation: none;
  }
}
</style>
