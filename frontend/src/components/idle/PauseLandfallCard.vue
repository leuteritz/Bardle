<script setup lang="ts">
/**
 * Eine Karte im Pause-Overlay: der Ort, an dem das Schiff gerade vorbeikommt.
 *
 * Sie schliesst ein Loch. `tickChampionTravel()` läuft in `gameStore.tick()`
 * UNBEDINGT, auch pausiert — genau wie Sterne und Void. Ein Landfall kann
 * deshalb komplett hinter dem Pause-Overlay aufgehen, sein Fenster verbrauchen
 * und als versäumt in die Chronik gehen, ohne dass ihn je jemand gesehen hat.
 *
 * Sie ist DEUTUNG, keine Bedienung: die Griffe bleiben der HUD-Karte im freien
 * Bild vorbehalten. Pausiert ist nichts anklickbar, und ein Knopf, der nichts
 * tut, wäre schlimmer als keiner.
 *
 * Der Zeitbogen LEERT sich, wie bei `PauseStarCard`: hier verstreicht eine
 * Gelegenheit. Bei `PauseVoidCard` füllt er sich — dort rückt eine Gefahr heran.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import {
  PAUSE_STAR_CARD_HEIGHT,
  PAUSE_STAR_CARD_PAD_X,
  PAUSE_VOID_CARD_WIDTH,
  LANDFALL_ACCENT_HEX,
} from '@/config/constants'

const props = defineProps<{
  /** Name des Ortes. */
  name: string
  /** Sein Glyph aus dem Katalog. */
  icon: string
  /** Eine Zeile, die sagt, was er ist. */
  blurb: string
  /** Verbleibender Anteil des Fensters, 0..1. */
  remaining: number
  /** Die grosse Ablesung — Lohn oder Stand gegen das Ziel. */
  value: string
  /** Ihre Einheit. Kann leer sein. */
  unit: string
}>()

/** Rest in Prozent — für `aria-label`, damit die Karte auch ohne Bogen spricht. */
const pct = computed(() => Math.round(Math.max(0, Math.min(1, props.remaining)) * 100))
</script>

<template>
  <div
    class="plc"
    :style="{
      '--plc-h': `${PAUSE_STAR_CARD_HEIGHT}px`,
      '--plc-w': `${PAUSE_VOID_CARD_WIDTH}px`,
      '--plc-pad': `${PAUSE_STAR_CARD_PAD_X}px`,
    }"
    role="status"
    :aria-label="`${name} — ${value} ${unit}, ${pct}% of the window left`"
  >
    <div class="plc-head">
      <Icon :icon="icon" class="plc-glyph" width="18" height="18" />
      <span class="plc-name">{{ name }}</span>
    </div>

    <span class="plc-blurb">{{ blurb }}</span>

    <div class="plc-row">
      <span class="plc-value">{{ value }}</span>
      <span class="plc-unit">{{ unit }}</span>
    </div>

    <!-- Bündig auf der Kante, wie bei der HUD-Karte. Nur `transform` — pro
         Sekunde soll kein Layout anfallen. -->
    <span class="plc-bar">
      <span class="plc-bar__fill" :style="{ transform: `scaleX(${remaining})` }"></span>
    </span>
  </div>
</template>

<style scoped>
.plc {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: var(--plc-w);
  height: var(--plc-h);
  padding: 10px var(--plc-pad) 0;
  background: #16140e;
  border: 2px solid #5c3310;
  /* LANDFALL_ACCENT_HEX — dieselbe Farbe führen Logzeile und HUD-Karte. */
  border-left: 3px solid v-bind('LANDFALL_ACCENT_HEX');
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px #3e200a;
  overflow: hidden;
}

.plc-head {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.plc-glyph {
  color: v-bind('LANDFALL_ACCENT_HEX');
  flex-shrink: 0;
}

.plc-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.15;
  color: #f2ead2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Zwei Zeilen: die Karte ist so hoch wie die Stern-Karte, und der Blurb ist der
   einzige Platz, an dem ein Ort sagen kann, was er ist. */
.plc-blurb {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.25;
  color: #9a8f78;
}

.plc-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-top: auto;
  padding-bottom: 7px;
  min-width: 0;
}

.plc-value {
  font-size: 17px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
}

.plc-unit {
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1;
  color: #9a8f78;
}

.plc-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: #241c12;
}

.plc-bar__fill {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: v-bind('LANDFALL_ACCENT_HEX');
}
</style>
