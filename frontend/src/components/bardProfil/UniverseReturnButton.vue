<template>
  <Transition name="urb-slide">
    <button v-if="visible" type="button" class="urb" @click="emit('back')">
      <Icon icon="lucide:arrow-left" width="16" height="16" class="urb-arrow" />
      <Icon icon="ph:globe-hemisphere-west-fill" width="24" height="24" class="urb-icon" />
      <span class="urb-title">Back to Universe</span>
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useUiStore } from '@/stores/core/uiStore'
import {
  VOYAGE_MAP_GUTTER_PX,
  VOYAGE_MAP_STATS_BAND_H,
  VOYAGE_RETURN_PILL_CLEARANCE,
} from '@/config/constants'

/** Den Weg zurueck geht der Reiter — er kennt die Karte und ihren Kern. */
const emit = defineEmits<{ back: [] }>()

const uiStore = useUiStore()

/** Sie steht UEBER dem Datenband, nicht darauf: `bottom` misst ab der
 *  Buehnenkante, das Band sitzt am Fuss der KARTE — also eine halbe Rinne
 *  hoeher. An die Konstante gebunden statt geraten — die Karte gibt ihre
 *  Bandhoehe nicht mehr als Custom Property heraus. */
const bottom = `${VOYAGE_MAP_GUTTER_PX / 2 + VOYAGE_MAP_STATS_BAND_H + VOYAGE_RETURN_PILL_CLEARANCE}px`

const visible = computed(() => uiStore.universeTabReturnPending)
</script>

<style scoped>
/* ── Ruecksprung ins Universe — Bauform des BattleTabReturnButton, Farbe des
   Universes: Gold ist im Spiel die Farbe des befreiten Wegs, Rot gehoert dem
   Kampf. Der Reiter traegt dasselbe Glyph in der Menueleiste. ───────────── */
.urb {
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

.urb:hover {
  border-color: #e8c040;
  transform: translateX(-50%) translateY(-1px);
  box-shadow: 0 0 26px rgba(232, 192, 64, 0.45);
}

.urb:active {
  transform: translateX(-50%) scale(0.97);
}

.urb:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 3px;
}

/* Sheen-Sweep: ruht unsichtbar, laeuft nur bei Hover */
.urb::after {
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

.urb:hover::after {
  animation: urb-sheen 1.1s ease-in-out infinite;
}

@keyframes urb-sheen {
  0% {
    left: -40%;
  }
  100% {
    left: 130%;
  }
}

.urb-arrow {
  color: #c89040;
  flex-shrink: 0;
}

.urb-icon {
  color: #e8c040;
  filter: drop-shadow(0 0 6px rgba(232, 192, 64, 0.5));
  flex-shrink: 0;
}

.urb-title {
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
.urb-slide-enter-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.urb-slide-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.urb-slide-enter-from,
.urb-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px);
}

@media (prefers-reduced-motion: reduce) {
  .urb:hover::after {
    animation: none;
  }
}
</style>
