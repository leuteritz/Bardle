<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useLandfallStore } from '@/stores/world/landfallStore'
import { getLandfallBoon } from '@/config/world/landfallBoons'
import { getLandfall } from '@/config/world/landfalls'
import { logLandfallPassed } from '@/config/ui/eventLog'
import { formatNumber } from '@/config/ui/numberFormat'
import { landfallAcceptsTap } from '@/utils/game/landfalls'
import { useBodyPortrait } from '@/composables/ui/useBodyPortrait'
import { buildLandfallSprite } from '@/utils/fx/landfallSprite'
import {
  HUD_CARD_PORTRAIT_PX,
  LANDFALL_ACCENT_HEX,
  LANDFALL_PRESENCE_STAGES,
} from '@/config/constants'

/**
 * Der Ort, an dem das Schiff GERADE vorbeikommt — als Fokus der Kartenspalte.
 *
 * Die Karte trägt die AUSKUNFT — Name, Lohn, Stand, Restzeit — und am Cairn die
 * einzige Stelle, an der die Wahl unter dreien steht. Den Griff nimmt sie
 * ebenso wie der Körper auf der Bühne (`LandfallBodyLayer.vue`); beide rufen
 * dieselbe Action, damit ein erzwungener Griff wie ein geklickter aussieht.
 *
 * Sie ist deshalb die einzige Karte, deren Fläche ein KNOPF ist — und die
 * einzige, die das auch gefaltet bleibt (`HudCardFoldedRow` bekommt dann ihren
 * `tap`). Im Rang steht sie ganz oben: am Cairn als `decision`, sonst als
 * `actionable`, denn die Karte IST die Interaktion.
 *
 * KEIN eigener Takt. Der Etappen-Tick des `galaxyStore` stellt `_travelTickMs`
 * ohnehin jede Sekunde, und `landfallProgress` liest daraus.
 */
const galaxyStore = useGalaxyStore()
const landfallStore = useLandfallStore()
const { activeLandfall } = storeToRefs(galaxyStore)

const def = computed(() =>
  activeLandfall.value ? getLandfall(activeLandfall.value.kind) : undefined,
)

/**
 * Die grosse Zahl der Karte und ihre Einheit.
 *
 * Sie hängt an der GESTE, nicht am Ort: wo ein Ziel steht, ist der Stand gegen
 * das Ziel die Auskunft, die zählt („3 / 6") — der Lohn wandert in die Einheit.
 * Wo keins steht, ist der Lohn selbst die Zahl.
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

const fullTitle = computed(() => (def.value ? `${def.value.name} — ${def.value.blurb}` : ''))

// Die Bühne zeigt den Ort selbst — derselbe Sprite, der draussen vorbeizieht.
const stageEl = ref<HTMLElement | null>(null)
useBodyPortrait(
  stageEl,
  () =>
    def.value
      ? buildLandfallSprite(
          def.value.id,
          HUD_CARD_PORTRAIT_PX,
          window.devicePixelRatio || 1,
          LANDFALL_PRESENCE_STAGES[def.value.presence].detail,
        )
      : null,
  () => def.value?.id,
)

/**
 * Die drei Angebote eines Cairn. Sie stehen IN der Karte und nicht in einem
 * Overlay: Augment, Rollenwahl und Omen sind alle Vollbild-Overlays, und zwei
 * davon, die gleich aussehen aber Verschiedenes bedeuten — das eine befristet
 * mit Uhr, das andere galaxieweit ohne — wären genau die Verwechslung, gegen
 * die die Systemgrenzen geschrieben sind.
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
</script>

<template>
  <button
    v-if="activeLandfall && def"
    type="button"
    class="hc lhc"
    :class="{ 'lhc--idle': !takesTaps }"
    :style="{ '--hc-color': LANDFALL_ACCENT_HEX }"
    :title="fullTitle"
    @click="harvest"
  >
    <!-- Zeile 1: was hier liegt, und wie viele Griffe noch zählen. -->
    <div class="hc-head">
      <Icon :icon="def.icon" class="hc-glyph" width="1.3em" height="1.3em" />
      <span class="hc-title">{{ def.name }}</span>
      <!-- Die Restgriffe nur, wo es welche gibt: eine Geste ohne Griffe (das
           Gloaming zieht bloss vorbei) zeigte sonst dauerhaft ein Häkchen für
           etwas, das nie zu tun war. -->
      <span v-if="def.tapCap && tapsLeft > 0" class="lhc-taps">{{ tapsLeft }}</span>
      <span v-else-if="def.tapCap" class="lhc-taps lhc-taps--spent">✓</span>
    </div>

    <!-- Zeile 2: der Ort als Porträt, daneben was bis jetzt zusammengekommen
         ist. Der Sockel fällt auch dem zu, der nicht klickt — deshalb steht
         hier nie eine 0. Am Cairn weicht die Zeile den drei Angeboten. -->
    <div v-if="!offers.length" class="hc-main">
      <span ref="stageEl" class="hc-stage lhc-stage" aria-hidden="true"></span>
      <span class="hc-body">
        <span class="hc-read">
          <span class="hc-read__val">{{ readout.value }}</span>
          <span class="hc-read__unit">{{ readout.unit }}</span>
        </span>
      </span>
    </div>

    <!-- Der Cairn: drei Zeilen, eine wird genommen. -->
    <div v-if="offers.length" class="hc-offers">
      <button
        v-for="b in offers"
        :key="b.id"
        type="button"
        class="hc-offer"
        :title="b.line"
        @click.stop="takeBoon(b.id)"
      >
        <Icon :icon="b.icon" class="hc-offer__ico" width="1.1em" height="1.1em" />
        <span class="hc-offer__name">{{ b.name }}</span>
        <span class="hc-offer__line">{{ b.line }}</span>
      </button>
    </div>

    <!-- Der Zeitbogen LEERT sich: hier verstreicht eine Gelegenheit. -->
    <span class="hc-bar">
      <span class="hc-bar__fill" :style="{ transform: `scaleX(${remaining})` }"></span>
    </span>
  </button>
</template>

<style scoped>
/* Fläche, Rahmen, Skala und alle Bausteine kommen aus `.hc-*` (rpg-theme.css).
   Hier steht nur, was allein diese Karte hat: sie ist ein Knopf. */
.lhc {
  cursor: pointer;
}

.lhc--idle {
  cursor: default;
}

/* Der Körper auf der Bühne und die Karte sind dasselbe Ding — wer den einen
   überfährt, sieht es an der anderen. */
:global(body.landfall-body-hover) .lhc {
  border-left-color: #cfe6dd;
}

.lhc-stage {
  overflow: hidden;
}

.lhc-stage :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.lhc-taps {
  flex-shrink: 0;
  font-size: 1.02em;
  font-weight: 900;
  line-height: 1.2;
  color: var(--hc-color);
  font-variant-numeric: tabular-nums;
}

.lhc-taps--spent {
  color: #6f7a72;
}
</style>
