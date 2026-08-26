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
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { formatNumberCompact } from '@/config/ui/numberFormat'
import { toRoman } from '@/utils/ui/format'
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
  MEEP_GAIN_PULSE_MS,
  MEEP_ART_IMAGE,
  GALAXY_TOOLTIP_IMAGE,
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

/* Die Kachel trägt BEIDE Zahlen: den Bestand groß, und in Klammern dahinter,
   was der nächste Aufbruch einbringt — der Ertrag und, was der Void aus
   derselben Ernte geholt hat. Früher stand beides am Fortschrittsbalken
   darunter, weil hier kein Platz war; der ist inzwischen beschafft (siehe die
   Anteile an .uni-tile--universe) und die Zeile misst nach, was sie trägt
   (measureFit). Der Balken zeigt jetzt keine Meep-Zahl mehr. */
const displayMeeps = ref(gameStore.meeps)
const isIncreasing = ref(false)

/** Was der Aufbruch einbringt — bereits netto, der Fraß ist abgezogen. */
const pendingMeeps = computed(() => gameStore.pendingMeeps)

/** Was der Void aus derselben Ernte geholt hat. Steht NEBEN dem Ertrag und
    nicht an seiner Stelle: der Spieler soll beides sehen. */
const meepsDevoured = computed(() => gameStore.meepsDevoured)

/** Ohne Ertrag und ohne Fraß entfällt die Klammer ganz — direkt nach einem
    Aufbruch steht die Kachel wieder allein für den Bestand. */
const showGain = computed(() => pendingMeeps.value > 0 || meepsDevoured.value > 0)

/* Quittung für einen ganzen dazugewonnenen Meep. pendingMeeps zählt in ganzen
   Zahlen (Math.floor im Store), der Puls ist also ein Ereignis und kein
   Dauerläufer — animiert wird allein transform. */
const gainPulse = ref(false)
let gainPulseTimer: ReturnType<typeof setTimeout> | null = null

watch(pendingMeeps, async (newVal, oldVal) => {
  if (newVal <= oldVal) return
  if (gainPulseTimer) clearTimeout(gainPulseTimer)
  // Erst aus, dann wieder an: eine bereits gesetzte Klasse startet die
  // Animation sonst nicht erneut.
  gainPulse.value = false
  await nextTick()
  gainPulse.value = true
  gainPulseTimer = setTimeout(() => (gainPulse.value = false), MEEP_GAIN_PULSE_MS)
})

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

/* ── Sparleiter: was die Zeile trägt, wird gemessen ──────────────────── */
const statsEl = ref<HTMLElement | null>(null)
const showFullLabels = ref(true)
const compactValues = ref(false)
const showLossPart = ref(true)

/** Je Kachel die breitere ihrer beiden Zeilen: die Bezeichnung, oder
    Icon + Innenabstand + Wert (+ Innenabstand + Klammer, wo es eine gibt).
    Wert und Klammer zählen über scrollWidth, also ungekürzt, auch wenn sie
    im Layout gerade ellipsieren. */
function tileNeed(tile: HTMLElement): number {
  const row = tile.querySelector<HTMLElement>('.tile-row')
  const icon = tile.querySelector<HTMLElement>('.tile-icon')
  const label = tile.querySelector<HTMLElement>('.tile-label')
  const value = tile.querySelector<HTMLElement>('.tile-value')
  if (!row || !icon || !label || !value) return 0
  // getComputedStyle statt getBoundingClientRect: das Meep-Icon ist per
  // scale vergrößert, und die Rect-Breite würde diese Skalierung mitzählen —
  // fürs Layout gilt die unskalierte Box.
  const gap = parseFloat(getComputedStyle(row).columnGap) || 0
  let rowNeed = (parseFloat(getComputedStyle(icon).width) || 0) + gap + value.scrollWidth
  const gain = tile.querySelector<HTMLElement>('.meep-gain')
  if (gain) rowNeed += gap + gain.scrollWidth
  return Math.max(label.scrollWidth, rowNeed)
}

function fitsAll(): boolean {
  const root = statsEl.value
  if (!root || !root.clientWidth) return true
  return Array.from(root.querySelectorAll<HTMLElement>('.uni-tile')).every(
    (tile) => tileNeed(tile) <= tile.clientWidth,
  )
}

/* Geordnete Sparmaßnahmen — erst Größe opfern, dann Information. Reicht der
   Platz auch nur in EINER Kachel nicht, greift die nächste Stufe für alle
   drei: eine Zeile aus verschieden großen Zahlen wäre schlechter zu lesen
   als eine, die durchgehend eine Stufe kleiner steht. */
const FIT_LADDER: Array<() => void> = [
  () => (showFullLabels.value = false),
  () => (compactValues.value = true),
  () => (showLossPart.value = false),
]

let measuring = false
let remeasure = false

/**
 * Fährt die Leiter ab, bis die Zeile passt, und beginnt dabei JEDES Mal bei
 * der reichsten Darstellung — nur so kommt sie zurück, sobald wieder Platz
 * ist (etwa nach einem Aufbruch, wenn der Bestand kurz und die Klammer leer
 * ist).
 *
 * Zwischen den Stufen liegt ein nextTick: eine Sparmaßnahme wirkt erst,
 * wenn Vue sie ins DOM geschrieben hat, und gemessen wird das DOM. Das ist
 * bezahlbar, weil die Funktion nur bei Größen- und Wertwechseln läuft, nie
 * pro Frame.
 *
 * Schwingungsfrei bleibt sie, weil gegen die KACHELBREITE gemessen wird und
 * die durch die festen flex-Anteile unabhängig vom Inhalt feststeht — eine
 * Sparmaßnahme schafft also keinen Platz, den eine frühere Stufe wieder
 * beanspruchen könnte.
 */
async function measureFit(): Promise<void> {
  // Läuft schon einer, wird sein Ergebnis durch die neue Anforderung
  // hinfällig — statt parallel zu messen, hängt er eine Runde an.
  if (measuring) {
    remeasure = true
    return
  }
  measuring = true
  try {
    do {
      remeasure = false
      showFullLabels.value = true
      compactValues.value = false
      showLossPart.value = true
      for (let step = 0; step <= FIT_LADDER.length; step++) {
        await nextTick()
        if (step === FIT_LADDER.length || fitsAll()) break
        FIT_LADDER[step]()
      }
    } while (remeasure)
  } finally {
    measuring = false
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  void measureFit()
  resizeObserver = new ResizeObserver(() => void measureFit())
  if (statsEl.value) resizeObserver.observe(statsEl.value)
  // Vor dem Laden von MedievalSharp misst der Fallback-Font eine andere Breite.
  document.fonts?.ready.then(() => void measureFit())
})

// Ein längerer Wert kann die Zeile kippen — Galaxie- und Meep-Zahl wachsen
// im Spielverlauf, die römische Ziffer beim Prestige, und die Klammer mit
// jedem Chime des laufenden Durchlaufs. flush: 'post' ist zwingend: ein
// Watcher läuft sonst VOR dem DOM-Update und misst noch den vorigen Wert,
// wodurch die Umschaltung eine Änderung hinterherhinkt.
watch(
  [
    universeRoman,
    () => galaxyStore.currentGalaxy,
    displayMeeps,
    pendingMeeps,
    meepsDevoured,
    showGain,
  ],
  () => void measureFit(),
  { flush: 'post' },
)

onUnmounted(() => {
  resizeObserver?.disconnect()
  if (countUpTimer) clearInterval(countUpTimer)
  if (risingTimer) clearTimeout(risingTimer)
  if (gainPulseTimer) clearTimeout(gainPulseTimer)
})
</script>

<template>
  <div ref="statsEl" class="uni-stats" :class="{ 'uni-stats--compact': compactValues }">
    <!-- Die Kachel benennt dieselbe Sache wie der Balken darunter — also
         dasselbe Panel, statt eines zweiten mit denselben Zahlen. -->
    <RpgBadgeTooltip
      :width="UNIVERSE_TOOLTIP_WIDTH"
      :gap="HEADER_STAT_TOOLTIP_GAP_PX"
      :clear-ancestor="HEADER_TOOLTIP_CLEAR_SELECTOR"
    >
      <div class="uni-tile uni-tile--universe">
        <span v-ink-center.x.y class="tile-label">{{ showFullLabels ? 'Universe' : 'Uni' }}</span>
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
        <div class="tile-row">
          <img :src="GALAXY_TOOLTIP_IMAGE" class="tile-icon gx-icon" alt="" aria-hidden="true" />
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
        <div class="tile-row">
          <img :src="MEEP_ART_IMAGE" class="tile-icon meep-icon" alt="" aria-hidden="true" />
          <!-- Kurzform (max. 4 Zeichen) wie in der Materialleiste: "999.9M"
               allein bräuchte so viel Breite, dass die Galaxy-Kachel nicht
               mehr mittig stehen könnte. -->
          <span v-ink-center.x.y class="tile-value meep-value">{{
            formatNumberCompact(displayMeeps)
          }}</span>
          <!-- Was der Aufbruch einbringt, in Klammern hinter dem Bestand:
               Gold für den Ertrag, Rot für den Fraß. Die Klammern selbst
               setzt die CSS-Regel, damit sie in der Sparstufe ohne Fraßzahl
               die Verlustfarbe annehmen können, ohne die Ertragszahl mit
               umzufärben. -->
          <span
            v-if="showGain"
            class="meep-gain"
            :class="{
              'meep-gain--pulse': gainPulse,
              'meep-gain--nibbled': !showLossPart && meepsDevoured > 0,
            }"
            :style="{ animationDuration: `${MEEP_GAIN_PULSE_MS}ms` }"
          >
            <span class="meep-gain-plus">+{{ formatNumberCompact(pendingMeeps) }}</span>
            <span v-if="showLossPart && meepsDevoured > 0" class="meep-gain-loss"
              >−{{ formatNumberCompact(meepsDevoured) }}</span
            >
          </span>
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
     Bezug für den Tintenausgleich der Textspalte (siehe .tile-text).

     Cap 21px statt der früheren 24px: die Meep-Kachel trägt jetzt die Klammer
     mit, und bei 24px stand der Normalfall ("142 (+12)") 4px über seinem Feld.
     Ein Cap, der nur greift, SOBALD eine Klammer da ist, wäre schlechter — die
     Zahl spränge dann bei jedem Aufbruch in der Größe. */
  --stat-value-size: min(calc(var(--header-height) * 0.245), 21px);
  /* Die Klammer — gut halb so groß wie der Bestand, den sie kommentiert. Die
     Untergrenze ist kein Zierwert: darunter zerfallen die Ziffern auf Full HD. */
  --stat-gain-size: max(9px, min(calc(var(--header-height) * 0.117), 10px));
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

/* Stufe 2 der Sparleiter (siehe measureFit): eine Größenstufe tiefer, für
   ALLE DREI Werte gemeinsam. Nur die Größe gibt hier nach — es geht keine
   Zahl verloren. */
.uni-stats--compact {
  --stat-value-size: min(calc(var(--header-height) * 0.198), 17px);
  --stat-gain-size: max(8px, min(calc(var(--header-height) * 0.099), 8.5px));
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

/* Feste Anteile statt inhaltsbreiter Kacheln. flex-basis 0 macht die
   Aufteilung unabhängig davon, wie lang die Werte gerade sind: wächst die
   Meep-Zahl von "1.2K" auf "12K", bleiben Universe und Galaxy stehen —
   vorher rückte die ganze Zeile.

   Die Bedingung für die mittige Galaxy-Kachel ist SYMMETRIE der äußeren
   Anteile, nicht Gleichheit aller drei: bei a : b : a liegt die Mitte des
   mittleren Feldes immer in der Blockmitte — also über der Mitte des Balkens
   darunter —, ganz gleich wie groß b ist. (Hier stand früher 1 : 1 : 1; das
   ist ein Sonderfall davon, und er verschenkte Platz. Mit den noch früheren
   Anteilen 27/29/44 saß Galaxy dagegen bei 42,1 %.)

   Genutzt wird das für die Klammer an der Meep-Kachel: Universe zeigt nur
   eine römische Ziffer und Galaxy ein bis zwei Stellen, beide hatten Luft.
   Galaxy darf 55,5px nicht unterschreiten — Icon 22,3 + Abstand 3,1 + zwei
   Ziffern 30,5 auf Full HD; das ist die Grenze für b. Seit der Header auf
   1112px steht, trägt der Block nur noch 256,6px statt 313,6 — mit den
   früheren 1,17:0,66:1,17 bekäme Galaxy dort 53,9. */
.uni-tile--universe,
.uni-tile--meep {
  flex: 1 1 0;
  min-width: 0;
}

.uni-tile--galaxy {
  flex: 0.8 1 0;
  min-width: 0;
}

.uni-tile--rising {
  filter: drop-shadow(0 0 7px rgba(251, 146, 60, 0.5));
}

/* Cap bei 26px: darüber frisst das Icon genau die Breite, die "VIII" bzw.
   die Meep-Zahl daneben zum Wachsen braucht — siehe .tile-value. Faktor
   0,26 statt 0,3: er senkt den Galaxy-Boden mit. */
.tile-icon {
  width: min(calc(var(--header-height) * 0.26), 26px);
  height: min(calc(var(--header-height) * 0.26), 26px);
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

.tile-value {
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

/* ── Die Klammer: was der Aufbruch einbringt ───────────────────────── */
/* Gold gegen das Orange des Bestands — zwei Farben für zwei Bedeutungen:
   was DA ist, und was KOMMT. Das Gold ist dasselbe, das die Zahl am
   Fortschrittsbalken trug, bevor sie hierher gezogen ist.

   flex-shrink: 0, damit im Engpass der Bestand ellipsiert und nicht die
   Klammer zerfällt — der Bestand ist mit vier Zeichen ohnehin gekürzt, die
   Klammer wäre ohne ihre Ziffern sinnlos. */
.meep-gain {
  display: inline-block;
  flex-shrink: 0;
  /* Etwas mehr Luft, als der Spaltenabstand der Zeile hergibt — der ist für
     Icon und Bestand bemessen, und die kleine Klammer klebte damit an der
     großen Ziffer. Als padding statt margin, weil measureFit über scrollWidth
     misst und padding darin enthalten ist, margin aber nicht. */
  padding-left: 2px;
  font-size: var(--stat-gain-size);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
  color: #e8c040;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
  transition: color 0.3s;
}

/* Die Klammern kommen aus der Regel, nicht aus dem Markup: nur so lassen sie
   sich in der Sparstufe ohne Fraßzahl einfärben, ohne die Ertragszahl mit
   umzufärben. */
.meep-gain::before {
  content: '(';
}

.meep-gain::after {
  content: ')';
}

.meep-gain-loss {
  margin-left: 0.25em;
  color: #cc6050;
}

/* Sparstufe 3: die Fraßzahl passte nicht mehr in die Zeile. Die Klammern
   tragen die Verlustfarbe und halten den Hinweis, dass der Void mitgegessen
   hat — die genaue Zahl steht im Hover-Panel ("Devoured this run"). */
.meep-gain--nibbled::before,
.meep-gain--nibbled::after {
  color: #cc6050;
}

/* Ein ganzer Meep mehr für den Aufbruch — einmaliger Puls, kein Dauerläufer,
   und ausschließlich über transform: die Zeile liegt im Header und dürfte
   für ein Aufblitzen nicht jede Frame neu gezeichnet werden.

   Der Keyframe-Name steht hier und wird NIE aus JavaScript gesetzt — Vue
   hängt in <style scoped> einen Scope-Suffix an, den JS nicht kennt. Die
   Dauer kommt dagegen von dort (MEEP_GAIN_PULSE_MS), damit sie und der
   Timer, der die Klasse wieder abnimmt, nicht auseinanderlaufen können. */
.meep-gain--pulse {
  animation-name: meepGainPop;
  animation-timing-function: ease-out;
  animation-iteration-count: 1;
}

@keyframes meepGainPop {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
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
  .meep-icon,
  .meep-gain--pulse {
    animation: none;
  }
}
</style>
