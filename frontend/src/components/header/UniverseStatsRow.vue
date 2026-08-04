<script setup lang="ts">
/**
 * Die drei Statistik-Kacheln über der Fortschrittszeile: Universe, Galaxy
 * und Meeps. Jede besteht aus Icon und einer Textspalte (Bezeichnung über
 * Wert); die Gruppen stehen mit gleichem Abstand über die Balkenbreite.
 *
 * Die Bezeichnungen stehen ausgeschrieben, solange die Zeile sie trägt, und
 * fallen sonst auf die Kurzform zurück — gemessen, nicht geraten, siehe
 * measureFit().
 *
 * Jede Kachel trägt ihr eigenes Hover-Panel — dieselbe Bauform wie am
 * Fortschrittsbalken darunter, aber je ein eigener Inhalt: die Universe-Kachel
 * zeigt das Panel des Balkens (sie benennt dieselbe Sache), Galaxy und Meeps
 * je ihr eigenes. Die früheren `title`-Attribute sind damit verschwunden: ein
 * nativer Tooltip legte sich sonst über das Panel.
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/gameStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { formatNumberCompact } from '@/config/numberFormat'
import { toRoman } from '@/utils/format'
import {
  HEADER_UNIVERSE_ICON,
  HEADER_TOOLTIP_CLEAR_SELECTOR,
  HEADER_STAT_TOOLTIP_GAP_PX,
  UNIVERSE_TOOLTIP_WIDTH,
  GALAXY_TOOLTIP_WIDTH,
  MEEP_TOOLTIP_WIDTH,
  MEEP_COUNTUP_STEPS,
  MEEP_COUNTUP_INTERVAL_MS,
  MEEP_RISING_HOLD_MS,
} from '@/config/constants'
import RpgBadgeTooltip from '../ui/RpgBadgeTooltip.vue'
import UniverseProgressTooltip from './UniverseProgressTooltip.vue'
import GalaxyProgressTooltip from './GalaxyProgressTooltip.vue'
import MeepProgressTooltip from './MeepProgressTooltip.vue'

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
 * Prüft, ob JEDE Kachel die ausgeschriebene Bezeichnung trägt — reicht der
 * Platz auch nur in einer nicht, gehen alle drei auf die Kurzform, damit
 * die Zeile einheitlich bleibt.
 *
 * Gemessen wird gegen die Kachelbreite, und die steht seit den festen
 * flex-Anteilen unabhängig vom Inhalt fest. Genau das macht die Prüfung
 * schwingungsfrei: sonst schafften kurze Bezeichnungen Platz, der Platz
 * erlaubte lange, und die nähmen ihn wieder weg. Die unsichtbaren Sonden
 * (.label-probe) tragen die langen Wörter unabhängig vom Anzeigezustand.
 *
 * Je Kachel zählt die breitere ihrer beiden Zeilen: die Bezeichnung, oder
 * Icon + Innenabstand + Wert. Der Wert zählt über scrollWidth, also
 * ungekürzt, auch wenn er im Layout gerade ellipsiert.
 */
function measureFit(): void {
  const root = statsEl.value
  if (!root || !root.clientWidth) return
  for (const tile of Array.from(root.querySelectorAll<HTMLElement>('.uni-tile'))) {
    const row = tile.querySelector<HTMLElement>('.tile-row')
    const icon = tile.querySelector<HTMLElement>('.tile-icon')
    const probe = tile.querySelector<HTMLElement>('.label-probe')
    const value = tile.querySelector<HTMLElement>('.tile-value')
    if (!row || !icon || !probe || !value) return
    // getComputedStyle statt getBoundingClientRect: das Meep-Icon ist per
    // scale vergrößert, und die Rect-Breite würde diese Skalierung
    // mitzählen — fürs Layout gilt die unskalierte Box.
    const need = Math.max(
      probe.getBoundingClientRect().width,
      (parseFloat(getComputedStyle(icon).width) || 0) +
        (parseFloat(getComputedStyle(row).columnGap) || 0) +
        value.scrollWidth,
    )
    if (need > tile.clientWidth) {
      showFullLabels.value = false
      return
    }
  }
  showFullLabels.value = true
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
// im Spielverlauf, die römische Ziffer beim Prestige. flush: 'post' ist
// zwingend: ein Watcher läuft sonst VOR dem DOM-Update und misst noch den
// vorigen Wert, wodurch die Umschaltung eine Änderung hinterherhinkt.
watch([universeRoman, () => galaxyStore.currentGalaxy, displayMeeps], measureFit, {
  flush: 'post',
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  if (countUpTimer) clearInterval(countUpTimer)
  if (risingTimer) clearTimeout(risingTimer)
})
</script>

<template>
  <div ref="statsEl" class="uni-stats">
    <!-- Die Kachel benennt dieselbe Sache wie der Balken darunter — also
         dasselbe Panel, statt eines zweiten mit denselben Zahlen. -->
    <RpgBadgeTooltip
      :width="UNIVERSE_TOOLTIP_WIDTH"
      :gap="HEADER_STAT_TOOLTIP_GAP_PX"
      :clear-ancestor="HEADER_TOOLTIP_CLEAR_SELECTOR"
    >
      <div class="uni-tile uni-tile--universe">
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
      <template #tip>
        <UniverseProgressTooltip />
      </template>
    </RpgBadgeTooltip>

    <RpgBadgeTooltip
      :width="GALAXY_TOOLTIP_WIDTH"
      :gap="HEADER_STAT_TOOLTIP_GAP_PX"
      :clear-ancestor="HEADER_TOOLTIP_CLEAR_SELECTOR"
    >
      <div class="uni-tile uni-tile--galaxy">
        <span v-ink-center.x.y class="tile-label">{{ showFullLabels ? 'Galaxy' : 'Gal' }}</span>
        <span class="tile-label label-probe" aria-hidden="true">Galaxy</span>
        <div class="tile-row">
          <img src="/img/galaxy-far-128.png" class="tile-icon gx-icon" alt="" aria-hidden="true" />
          <span v-ink-center.x.y class="tile-value gx-value">{{ galaxyStore.currentGalaxy }}</span>
        </div>
      </div>
      <template #tip>
        <GalaxyProgressTooltip />
      </template>
    </RpgBadgeTooltip>

    <RpgBadgeTooltip
      :width="MEEP_TOOLTIP_WIDTH"
      :gap="HEADER_STAT_TOOLTIP_GAP_PX"
      :clear-ancestor="HEADER_TOOLTIP_CLEAR_SELECTOR"
    >
      <div
        class="uni-tile uni-tile--meep"
        :class="{ 'uni-tile--rising': isIncreasing, 'uni-tile--lit': lit }"
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
          <!-- Kurzform (max. 4 Zeichen) wie in der Materialleiste: die drei
               Kacheln sind gleich breit, und "999.9M" allein bräuchte davon so
               viel, dass die Galaxy-Kachel nicht mehr mittig stehen könnte. -->
          <span v-ink-center.x.y class="tile-value meep-value">{{
            formatNumberCompact(displayMeeps)
          }}</span>
        </div>
      </div>
      <template #tip>
        <MeepProgressTooltip />
      </template>
    </RpgBadgeTooltip>
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
  /* Trennt die drei Felder; ihre Breiten stehen fest (siehe .uni-tile--*).
     Enger als früher (war bis 10px): seit alle drei Felder gleich breit sind,
     zahlt jeder Pixel Abstand dreifach auf die Feldbreite ein, und der längste
     Wert der Meep-Kachel ("999K") lag damit exakt 1px über seinem Feld. Das
     Feld selbst federt den Abstand optisch ohnehin ab — zwischen zwei
     Inhalten stehen weiterhin über 15px. */
  gap: clamp(5px, 0.3vw, 6px);
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
  gap: clamp(2px, 0.16vw, 4px);
  min-width: 0;
  max-width: 100%;
}

/* Drei GLEICHE feste Anteile statt inhaltsbreiter Kacheln. flex-basis 0
   macht die Aufteilung unabhängig davon, wie lang die Werte gerade sind:
   wächst die Meep-Zahl von "1.2K" auf "12K", bleiben Universe und Galaxy
   stehen — vorher rückte die ganze Zeile.

   Gleiche Anteile sind hier keine Kosmetik, sondern die Bedingung für die
   mittige Galaxy-Kachel: bei drei gleich breiten Feldern W und zwei gleichen
   Abständen g liegt die Mitte des mittleren bei 1,5W + g — und das ist per
   Konstruktion exakt die halbe Blockbreite, also die Mitte des Balkens
   darunter. Mit den früheren Anteilen 27/29/44 saß Galaxy bei 42,1 %.

   Möglich wurde das erst durch die Kurzform der Meep-Zahl: ungekürzt brauchte
   sie 119px und damit mehr als ein Drittel des Blocks. */
.uni-tile--universe,
.uni-tile--galaxy,
.uni-tile--meep {
  flex: 1 1 0;
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
/* Das Meep-Sprite ist hochformatig und trägt oben wie unten einen breiten
   Alpha-Rand — in derselben Box wie Galaxie und Universe-Icon füllt es nur
   rund drei Viertel der Höhe und wirkt daneben klein. Vergrößert wird per
   scale statt über die Box: die Zeile 1 ist auf Full HD bereits ausgereizt
   (38,8 von 38,9px), eine größere Box würde sie über den Block schieben.
   So wächst nur das Bild, das Layout bleibt unberührt. */
.meep-icon {
  --meep-scale: 1.35;
  transform: scale(var(--meep-scale)) translateZ(0);
  filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.7));
  animation: meep-pulse 3s ease-in-out infinite;
}

.uni-tile--meep:hover .meep-icon {
  transform: scale(calc(var(--meep-scale) * 1.08)) translateZ(0);
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
  transform: scale(calc(var(--meep-scale) * 1.04)) translateZ(0);
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
