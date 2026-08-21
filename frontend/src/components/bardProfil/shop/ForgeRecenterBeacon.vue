<template>
  <button
    type="button"
    class="rc-beacon"
    :class="{ 'rc-beacon--rest': atRest }"
    :aria-label="`${label} (${cap})`"
    @click="triggerKeybind('forgeRecenter')"
  >
    <span class="rc-dial" aria-hidden="true">
      <svg class="rc-dial__svg" :viewBox="`0 0 ${DIAL} ${DIAL}`">
        <circle class="rc-dial__track" :cx="HALF" :cy="HALF" :r="FORGE_RECENTER_RING_R" />
        <circle
          class="rc-dial__fill"
          :cx="HALF"
          :cy="HALF"
          :r="FORGE_RECENTER_RING_R"
          :style="{ strokeDashoffset: ringOffset }"
        />
      </svg>
      <!-- Der Winkel steht INLINE am Zeiger und nicht als Custom Property am
           Rahmen: dort zöge jede Zeigerbewegung einen Style-Recalc über den
           ganzen Teilbaum (Performance-Regel 3). Dasselbe Glyph und dieselbe
           +90°-Rechnung wie beim Rand-Kompass — das Dreieck zeigt nach oben. -->
      <span class="rc-dial__needle" :style="{ transform: `rotate(${angleDeg + 90}deg)` }">
        <Icon
          :icon="FORGE_SPOTLIGHT_COMPASS_ICON"
          :width="FORGE_SPOTLIGHT_COMPASS_ICON_PX"
          :height="FORGE_SPOTLIGHT_COMPASS_ICON_PX"
        />
      </span>
      <span class="rc-dial__still" />
    </span>

    <KeyCap :cap="cap" size="lg" :pressed="flashing" :lit="!atRest" />
    <span class="rc-beacon__label">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
/**
 * Die Heimtaste der Forge-Kamera, als Zifferblatt.
 *
 * Sie beantwortet zwei Fragen auf einmal: WIE WEIT die Kamera vom Netz weg
 * steht (der Ring) und in welcher RICHTUNG dessen Mitte liegt (der Zeiger).
 * Steht sie mittig, ruht beides und übrig bleibt die Taste — das Zeichen ist
 * dann nur noch Lehre, keine Auskunft.
 *
 * Rein darstellend: die Werte kommen aus `ForgeTreePanel`, die Handlung geht
 * über `triggerKeybind` und damit durch dieselbe Tür wie der Tastendruck.
 */
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import KeyCap from '@/components/keybinds/KeyCap.vue'
import { triggerKeybind, useKeybindings } from '@/composables/system/useKeybindings'
import {
  FORGE_RECENTER_BEACON,
  FORGE_RECENTER_RING_CIRCUMFERENCE,
  FORGE_RECENTER_RING_R,
  FORGE_SPOTLIGHT_COMPASS_ICON,
  FORGE_SPOTLIGHT_COMPASS_ICON_PX,
  KEYBIND_FLASH_MS,
} from '@/config/constants'

const props = defineProps<{
  cap: string
  label: string
  /** Auslenkung gegen den Anschlag: 0 = mittig, 1 = am Rand des Fahrbereichs. */
  offsetRatio: number
  /** Richtung zur Netzmitte in Grad, 0° = nach rechts. */
  angleDeg: number
  atRest: boolean
}>()

const DIAL = FORGE_RECENTER_RING_R * 2 + 4
const HALF = DIAL / 2
const beaconW = `${FORGE_RECENTER_BEACON.w}px`
const beaconH = `${FORGE_RECENTER_BEACON.h}px`
const dialPx = `${DIAL}px`
const ringSpan = `${FORGE_RECENTER_RING_CIRCUMFERENCE}`

const ringOffset = computed(() => {
  const t = props.atRest ? 0 : Math.min(1, Math.max(0, props.offsetRatio))
  return FORGE_RECENTER_RING_CIRCUMFERENCE * (1 - t)
})

// Dieselbe Rückmeldung für Tastendruck und Mausklick, weil beide über
// `triggerKeybind` laufen — Muster aus `KeybindHud`.
const { lastTriggered } = useKeybindings()
const flashing = ref(false)
let flashTimer: ReturnType<typeof setTimeout> | null = null

watch(lastTriggered, (hit) => {
  if (hit?.id !== 'forgeRecenter') return
  flashing.value = true
  if (flashTimer !== null) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashing.value = false
    flashTimer = null
  }, KEYBIND_FLASH_MS)
})
</script>

<style scoped>
.rc-beacon {
  width: v-bind(beaconW);
  height: v-bind(beaconH);
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 10px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.18s ease;
}

.rc-beacon--rest {
  /* Dezent, aber lesbar: das Zeichen soll die Taste LEHREN, und der Ruhezustand
     ist der, in dem der Tab aufgeht. Bei 0,55 stand es auf dem hellen
     Zonenschleier praktisch nicht mehr im Bild. */
  opacity: 0.8;
}

.rc-beacon:hover {
  opacity: 1;
}

.rc-beacon__label {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #c8a850;
  white-space: nowrap;
}

.rc-beacon:not(.rc-beacon--rest) .rc-beacon__label {
  color: #e8c040;
}

/* ── Das Zifferblatt ───────────────────────────────── */
.rc-dial {
  position: relative;
  width: v-bind(dialPx);
  height: v-bind(dialPx);
  flex-shrink: 0;
}

.rc-dial__svg {
  width: 100%;
  height: 100%;
  /* Der Ring beginnt oben und läuft im Uhrzeigersinn. */
  transform: rotate(-90deg);
}

.rc-dial__track {
  fill: none;
  stroke: #3a2408;
  stroke-width: 2;
}

/* Auslenkung über `stroke-dashoffset` einer Kreislinie, nie über
   `conic-gradient` (Performance-Regel 11). */
.rc-dial__fill {
  fill: none;
  stroke: #e8c040;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-dasharray: v-bind(ringSpan);
  transition: stroke-dashoffset 0.2s ease-out;
}

.rc-dial__needle {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e8c040;
  opacity: 1;
  transition: opacity 0.18s ease;
}

.rc-beacon--rest .rc-dial__needle {
  opacity: 0;
}

/* Was im Ruhezustand übrig bleibt: ein Punkt auf der Mitte. */
.rc-dial__still {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  margin: -3px 0 0 -3px;
  border-radius: 50%;
  background: #7a4e20;
  opacity: 0;
  transition: opacity 0.18s ease;
}

.rc-beacon--rest .rc-dial__still {
  opacity: 1;
}
</style>
