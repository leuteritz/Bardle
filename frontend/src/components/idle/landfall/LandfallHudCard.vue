<script setup lang="ts">
import { computed, ref, watch, onUnmounted, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useLandfallStore } from '@/stores/world/landfallStore'
import { getLandfallBoon } from '@/config/world/landfallBoons'
import { useUiStore } from '@/stores/core/uiStore'
import { getLandfall } from '@/config/world/landfalls'
import { logLandfallPassed } from '@/config/ui/eventLog'
import { formatNumber } from '@/config/ui/numberFormat'
import { landfallAcceptsTap } from '@/utils/game/landfalls'

/**
 * Der Ort, an dem das Schiff GERADE vorbeikommt — oben links, unter dem
 * Vorzeichen, über der Drifter-Karte.
 *
 * Die Karte IST die Interaktion. Ein Landfall hat keinen Körper auf der Bühne:
 * das Schiff ist dort gar nicht zu sehen, der Orbit zeigt die Sonne. Was ihn
 * sichtbar macht, ist diese Karte im Bild und später die Marke auf dem
 * Galaxiebild — die eine, während er da ist, die andere, wenn er vorbei ist.
 *
 * KEIN eigener Takt. Der Etappen-Tick des `galaxyStore` stellt `_travelTickMs`
 * ohnehin jede Sekunde, und `landfallProgress` liest daraus. Ein zweiter Timer
 * neben dem Spiel-Tick wäre ein zweiter Grund, pro Sekunde zu rendern.
 */
const galaxyStore = useGalaxyStore()
const landfallStore = useLandfallStore()
const uiStore = useUiStore()
const { activeLandfall } = storeToRefs(galaxyStore)

const visible = computed(() => activeLandfall.value !== null && uiStore.bardActiveTab === null)

const def = computed(() =>
  activeLandfall.value ? getLandfall(activeLandfall.value.kind) : undefined,
)

/**
 * Die grosse Zahl der Karte und ihre Einheit.
 *
 * Sie hängt an der GESTE, nicht am Ort: wo ein Ziel steht, ist der Stand gegen
 * das Ziel die Auskunft, die zählt („3 / 6") — der Lohn wandert in die Einheit.
 * Wo keins steht, ist der Lohn selbst die Zahl.
 *
 * Eine feste Zeile „<n> chimes" ginge nicht mehr: der Konvoi zahlt gar keine
 * Chimes und stünde dauerhaft auf 0.
 */
const readout = computed<{ value: string; unit: string }>(() => {
  const d = def.value
  const a = activeLandfall.value
  if (!d || !a) return { value: '', unit: '' }

  if (d.gesture === 'threshold' && d.tapCap) {
    // Was am Ende der Leiste steht, ist der Lohn — oder, wo es keinen gibt, das
    // Abwenden der Kosten. „secured" für einen Riss wäre das falsche Wort.
    const ziel = d.burst ? '→ seal it' : d.materials ? `→ ${d.materials} materials` : '→ secured'
    return { value: `${a.taps} / ${d.tapCap}`, unit: ziel }
  }
  const chimes = galaxyStore.landfallYield
  if (chimes > 0) return { value: formatNumber(chimes), unit: 'chimes' }
  if (d.materials) return { value: String(d.materials), unit: 'materials' }
  return { value: '—', unit: '' }
})

/** Wie viele Griffe noch zählen. Der Deckel steht am Def, damit niemand hämmert
 *  — und Gesten ohne Griffe zeigen die Zahl gar nicht erst. */
const tapsLeft = computed(() => {
  const a = activeLandfall.value
  if (!a || !def.value?.tapCap) return 0
  return Math.max(0, def.value.tapCap - a.taps)
})

/** Nimmt dieser Ort überhaupt Griffe? Nur dann ist die Karte ein Knopf. */
const takesTaps = computed(() =>
  activeLandfall.value ? landfallAcceptsTap(def.value, activeLandfall.value.taps) : false,
)

/** Das Fenster LÄUFT AB — der Balken leert sich, wie bei der Stern-Karte. */
const remaining = computed(() => 1 - galaxyStore.landfallProgress)

const fullTitle = computed(() =>
  def.value ? `${def.value.name} — ${def.value.blurb}` : '',
)

/**
 * Die drei Angebote eines Cairn. Sie stehen IN der Karte und nicht in einem
 * Overlay: Augment, Rollenwahl und Omen sind alle Vollbild-Overlays, und zwei
 * davon, die gleich aussehen aber Verschiedenes bedeuten — das eine befristet
 * mit Uhr, das andere galaxieweit ohne — wären genau die Verwechslung, gegen
 * die die Systemgrenzen geschrieben sind. Ausserdem gilt für Landfalls: die
 * Karte IST die Interaktion.
 */
const offers = computed(() =>
  landfallStore
    .offerFor(activeLandfall.value)
    .map((id) => getLandfallBoon(id))
    .filter((b): b is NonNullable<typeof b> => b != null),
)

function takeBoon(id: string) {
  landfallStore.takeBoon(id as Parameters<typeof landfallStore.takeBoon>[0])
}

/* Ein Griff ans Riff ist bewusst KEIN Bard-Klick: über `registerClick` liefe er
   in die Passive Resonance und damit in die Abklingzeiten der Fähigkeiten. Der
   Ort zahlt Chimes, sonst nichts. */
function harvest() {
  // Am Cairn fängt die Karte den Klick nicht ab — dort trägt jede Zeile ihren
  // eigenen Knopf, und ein Griff auf die Fläche daneben soll nichts tun.
  if (offers.value.length) return
  galaxyStore.tapLandfall()
}

// Der Ort ist vorbei: eine Zeile ins Log, mit dem, was er eingebracht hat.
watch(
  () => activeLandfall.value?.openedAt ?? null,
  (jetzt, vorher) => {
    if (vorher === null || jetzt === vorher) return
    // Der Store hat bereits ausgezahlt und geschlossen; die letzte Zeile der
    // Ergebnisreihe sagt, was daraus wurde.
    const letzter = galaxyStore.landfallResults[galaxyStore.landfallResults.length - 1]
    if (!letzter) return
    const eintrag = getLandfall(letzter.kind)
    if (eintrag) {
      logLandfallPassed(
        eintrag.name,
        readout.value.unit ? `${readout.value.value} ${readout.value.unit}` : readout.value.value,
        letzter.cleared,
      )
    }
  },
)

// ── Unterkante veröffentlichen ───────────────────────────────────────────────
// Dieselbe Mechanik wie bei Vorzeichen- und Void-Karte: wer in dieser Spalte
// steht, sagt, wo er aufhört. Ohne das läge die Drifter-Karte darunter.
const root = ref<HTMLElement>()
let resizeObserver: ResizeObserver | null = null

function publishBottom() {
  const px = root.value ? root.value.getBoundingClientRect().bottom : 0
  document.documentElement.style.setProperty('--landfall-card-bottom', `${px}px`)
}

watch(
  visible,
  async (shown) => {
    await nextTick()
    resizeObserver?.disconnect()
    resizeObserver = null
    if (!shown || !root.value) {
      publishBottom()
      return
    }
    resizeObserver = new ResizeObserver(publishBottom)
    resizeObserver.observe(root.value)
    publishBottom()
  },
  { immediate: true },
)

onUnmounted(() => {
  resizeObserver?.disconnect()
  document.documentElement.style.setProperty('--landfall-card-bottom', '0px')
})
</script>

<template>
  <Transition name="lhc">
    <button
      v-if="visible && activeLandfall && def"
      ref="root"
      type="button"
      class="lhc-root"
      :class="{ 'lhc-root--idle': !takesTaps }"
      :title="fullTitle"
      @click="harvest"
    >
      <!-- Zeile 1: was hier liegt, und wie viele Griffe noch zählen. -->
      <div class="lhc-head">
        <Icon :icon="def.icon" class="lhc-glyph" width="17" height="17" />
        <span class="lhc-name">{{ def.name }}</span>
        <!-- Die Restgriffe nur, wo es welche gibt: eine Geste ohne Griffe (das
             Gloaming zieht bloss vorbei) zeigte sonst dauerhaft ein Häkchen für
             etwas, das nie zu tun war. -->
        <span v-if="def.tapCap && tapsLeft > 0" class="lhc-taps">{{ tapsLeft }}</span>
        <span v-else-if="def.tapCap" class="lhc-taps lhc-taps--spent">✓</span>
      </div>

      <!-- Zeile 2: was bis jetzt zusammengekommen ist. Der Sockel fällt auch dem
           zu, der nicht klickt — deshalb steht hier nie eine 0. -->
      <div v-if="!offers.length" class="lhc-row">
        <span class="lhc-yield">{{ readout.value }}</span>
        <span class="lhc-unit">{{ readout.unit }}</span>
      </div>

      <!-- Der Cairn: drei Zeilen, eine wird genommen. Die Karte wächst dafür
           nach unten; die Drifter-Karte darunter weicht über
           `--landfall-card-bottom` ohnehin schon aus. -->
      <div v-if="offers.length" class="lhc-offers">
        <button
          v-for="b in offers"
          :key="b.id"
          type="button"
          class="lhc-offer"
          :title="b.line"
          @click.stop="takeBoon(b.id)"
        >
          <Icon :icon="b.icon" class="lhc-offer__ico" width="14" height="14" />
          <span class="lhc-offer__name">{{ b.name }}</span>
          <span class="lhc-offer__line">{{ b.line }}</span>
        </button>
      </div>

      <!-- Der Zeitbogen LEERT sich: hier verstreicht eine Gelegenheit. Nur
           scaleX am Balken selbst, damit pro Sekunde kein Layout anfällt. -->
      <span class="lhc-bar">
        <span class="lhc-bar__fill" :style="{ transform: `scaleX(${remaining})` }"></span>
      </span>
    </button>
  </Transition>
</template>

<style scoped>
/* Oben links, unter der Vorzeichenkarte. Breite und Rand aus der EINEN Formel
   der Spalte (`--hud-col-w` / `--hud-col-edge`) — fünf Karten teilen sie sich,
   und eine vergessene Stelle liesse die rechten Kanten auseinanderlaufen. */
.lhc-root {
  position: fixed;
  top: calc(
    max(
        var(--wayfinder-bottom, 0px),
        var(--autopick-bottom, 0px),
        var(--omen-card-bottom, 0px),
        var(--void-card-bottom, 0px)
      ) + 0.5rem
  );
  left: var(--hud-col-edge);
  z-index: 899;
  width: var(--hud-col-w);
  display: flex;
  flex-direction: column;
  gap: 4px;
  /* Unten kein Padding: der Balken sitzt bündig auf der Kante. */
  padding: 8px 10px 0;
  background: var(--rpg-bg-header);
  border: 2px solid var(--rpg-wood);
  /* LANDFALL_ACCENT_HEX — dieselbe Farbe führt die Logzeile. */
  border-left: 3px solid #8fbfae;
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 1px var(--rpg-wood-inner),
    0 6px 18px rgba(0, 0, 0, 0.8);
  overflow: hidden;
  text-align: left;
  cursor: pointer;
}

/* Ein Ort, der keine Griffe nimmt, ist kein Knopf — der Zeiger darf das nicht
   behaupten. Die Karte bleibt trotzdem eine, weil sie dieselbe Auskunft trägt. */
.lhc-root--idle {
  cursor: default;
}

.lhc-head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.lhc-glyph {
  color: #8fbfae;
  flex-shrink: 0;
}

.lhc-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.15;
  color: #f2ead2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Die Restgriffe als blosse Zahl. Ausgeschrieben („3 taps left") wögen sie in
   241 px mehr als der Name, und der trägt das Wiedererkennen. */
.lhc-taps {
  flex-shrink: 0;
  font-size: 11.5px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: #8fbfae;
}

.lhc-taps--spent {
  color: #6f7a72;
}

.lhc-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
  padding-bottom: 6px;
}

.lhc-yield {
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
}

.lhc-unit {
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1;
  color: #9a8f78;
}

/* ── Die drei Angebote des Cairn ── */
.lhc-offers {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-bottom: 6px;
}

/* Zwei Zeilen je Angebot: Name oben mit Glyph, Wirkung darunter. In 241 px
   (`--hud-col-w` auf Full HD) trägt keine einzeilige Fassung beides. */
.lhc-offer {
  display: grid;
  grid-template-columns: 14px 1fr;
  grid-template-rows: auto auto;
  column-gap: 6px;
  align-items: center;
  padding: 4px 6px;
  text-align: left;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
  cursor: pointer;
}

.lhc-offer:hover {
  background: #241f16;
  border-color: #5c3310;
}

.lhc-offer__ico {
  grid-row: 1 / span 2;
  color: #8fbfae;
}

.lhc-offer__name {
  font-size: 11.5px;
  font-weight: 800;
  line-height: 1.2;
  color: #f2ead2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lhc-offer__line {
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  color: #9a8f78;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Zeitbogen ── */
.lhc-bar {
  display: block;
  height: 3px;
  background: #241c12;
}

.lhc-bar__fill {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: #8fbfae;
}

/* Ein- und Ausblenden: nur transform und opacity. */
.lhc-enter-active,
.lhc-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.lhc-enter-from,
.lhc-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

/* Ab 2K wächst die Spalte auf 548 px — dieselbe Typografiestufe wie die
   Nachbarkarten, sonst springt die Schriftgrösse zwischen ihnen. */
@media (min-width: 2400px) {
  .lhc-root {
    gap: 6px;
    padding: 11px 14px 0;
  }

  .lhc-name {
    font-size: 16px;
  }

  .lhc-taps {
    font-size: 14px;
  }

  .lhc-yield {
    font-size: 19px;
  }

  .lhc-unit {
    font-size: 13px;
  }

  .lhc-bar {
    height: 4px;
  }

  .lhc-offer__name {
    font-size: 14px;
  }

  .lhc-offer__line {
    font-size: 12px;
  }
}
</style>
