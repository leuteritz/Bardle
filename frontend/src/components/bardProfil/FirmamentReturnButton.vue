<template>
  <Transition name="frb-slide">
    <button v-if="visible" type="button" class="frb" @click="backToFirmament">
      <Icon icon="lucide:arrow-left" width="16" height="16" class="frb-arrow" />
      <Icon icon="ph:globe-hemisphere-west-fill" width="24" height="24" class="frb-icon" />
      <span class="frb-title">Back to Firmament</span>
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import {
  VOYAGE_MAP_GUTTER_PX,
  VOYAGE_MAP_STATS_BAND_H,
  VOYAGE_RETURN_PILL_CLEARANCE,
} from '@/config/constants'

const uiStore = useUiStore()
const chartStore = useExpeditionChartStore()

/** Sie steht UEBER dem Datenband, nicht darauf: `bottom` misst ab der
 *  Buehnenkante, das Band sitzt am Fuss der KARTE — also eine halbe Rinne
 *  hoeher. An die Konstanten gebunden statt geraten; `--egm-band-h` steht am
 *  Wurzelelement der Karte und ist fuer ein Geschwister nicht lesbar. */
const bottom = `${VOYAGE_MAP_GUTTER_PX / 2 + VOYAGE_MAP_STATS_BAND_H + VOYAGE_RETURN_PILL_CLEARANCE}px`

const visible = computed(() => uiStore.firmamentTabReturnPending)

/** Die GERADE gewaehlte Galaxie, nicht die, mit der man kam — wer im Atlas
 *  weitergeklickt hat, soll im Firmament dort stehen. */
function backToFirmament() {
  uiStore.returnToFirmamentTab(chartStore.selectedGalaxy || null)
}
</script>

<style scoped>
/* ── Ruecksprung ins Firmament — Bauform des BattleTabReturnButton, Farbe des
   Firmaments: Gold ist im Spiel die Farbe des befreiten Wegs, Rot gehoert dem
   Kampf. Der Reiter traegt dasselbe Glyph in der Menueleiste. ───────────── */
.frb {
  position: absolute;
  left: 50%;
  bottom: v-bind(bottom);
  transform: translateX(-50%);
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 22px;
  border-radius: 5px;
  background: rgba(14, 10, 5, 0.88);
  border: 2px solid #7a4e20;
  cursor: pointer;
  overflow: hidden;
  /* Ruhezustand statisch — dezenter konstanter Schein, keine Animation */
  box-shadow: 0 0 14px rgba(232, 192, 64, 0.22);
  transition:
    border-color 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.frb:hover {
  border-color: #e8c040;
  transform: translateX(-50%) translateY(-1px);
  box-shadow: 0 0 26px rgba(232, 192, 64, 0.45);
}

.frb:active {
  transform: translateX(-50%) scale(0.97);
}

.frb:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 3px;
}

/* Sheen-Sweep: ruht unsichtbar, laeuft nur bei Hover */
.frb::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -40%;
  width: 30%;
  background: linear-gradient(to right, transparent, rgba(255, 224, 160, 0.16), transparent);
  transform: skewX(-18deg);
  pointer-events: none;
}

.frb:hover::after {
  animation: frb-sheen 1.1s ease-in-out infinite;
}

@keyframes frb-sheen {
  0% {
    left: -40%;
  }
  100% {
    left: 130%;
  }
}

.frb-arrow {
  color: #c89040;
  flex-shrink: 0;
}

.frb-icon {
  color: #e8c040;
  filter: drop-shadow(0 0 6px rgba(232, 192, 64, 0.5));
  flex-shrink: 0;
}

.frb-title {
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #f2e2b0;
  line-height: 1;
  white-space: nowrap;
  text-shadow:
    0 0 12px rgba(232, 192, 64, 0.4),
    0 1px 2px rgba(0, 0, 0, 0.95);
}

/* ── Slide-In von unten ──────────────────────────────────────────────────── */
.frb-slide-enter-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.frb-slide-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.frb-slide-enter-from,
.frb-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px);
}

@media (prefers-reduced-motion: reduce) {
  .frb:hover::after {
    animation: none;
  }
}
</style>
