<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { maxEverything } from '@/utils/game/maxEverything'
import { useHerald } from '@/composables/ui/useHerald'
import {
  ADMIN_MAX_GALAXY,
  ADMIN_MAX_UNIVERSE,
  ADMIN_MAX_BARD_LEVEL,
  ADMIN_FIELD_FLASH_MS,
} from '@/config/constants'

const { announceReceipt } = useHerald()

/** Kurzes Aufleuchten nach dem Druck — der Vorgang ist synchron und sonst
 *  unsichtbar; ohne Rückmeldung wirkt der Knopf, als hätte er nichts getan. */
const flashing = ref(false)

const chips = [
  { label: 'Universe', value: ADMIN_MAX_UNIVERSE },
  { label: 'Galaxy', value: ADMIN_MAX_GALAXY },
  { label: 'Level', value: ADMIN_MAX_BARD_LEVEL },
]

function onMaxEverything() {
  const result = maxEverything()
  flashing.value = true
  setTimeout(() => {
    flashing.value = false
  }, ADMIN_FIELD_FLASH_MS)
  announceReceipt({
    kind: 'unlock',
    eyebrow: 'ADMIN',
    headline: 'Max Everything',
    subline: `${result.champions} champions maxed · ${result.rank} · Galaxy ${result.galaxy}`,
  })
}
</script>

<template>
  <button class="me-hero" :class="{ 'me-hero--flash': flashing }" @click="onMaxEverything">
    <span class="me-rune">
      <Icon icon="game-icons:overdrive" class="me-icon" width="28" height="28" />
    </span>

    <span class="me-text">
      <span class="me-title">Max Everything</span>
      <span class="me-sub">
        Every system to its end state — roster, forge, tree, planets, codex, Challenger
      </span>
    </span>

    <span class="me-chips">
      <span v-for="c in chips" :key="c.label" class="me-chip">
        <span class="me-chip-label">{{ c.label }}</span>
        <span class="me-chip-value">{{ c.value }}</span>
      </span>
    </span>

    <span class="me-sweep" aria-hidden="true" />
  </button>
</template>

<style scoped>
/* Hero-Zeile über beiden Dashboard-Spalten: der Knopf tut, was alle Quick
   Actions zusammen tun, und steht darum vor ihnen. */
.me-hero {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  border-radius: var(--bp-radius);
  border: 1px solid #f0d089;
  background: linear-gradient(135deg, #d89c46, #b3792c 45%, #7a4410);
  box-shadow:
    inset 0 1px 0 rgba(255, 240, 200, 0.45),
    inset 0 0 0 1px #6b3d10;
  cursor: pointer;
  /* clip statt hidden: der Sweep parkt links ausserhalb, ein Scrollport liesse
     sich dorthin verschieben. */
  overflow: clip;
  transition:
    background 0.15s,
    border-color 0.15s,
    transform 0.15s;
}
.me-hero:hover {
  background: linear-gradient(135deg, #efb45c, #cc8f36 45%, #91561a);
  border-color: #fff0b4;
  transform: translateY(-1px);
}
.me-hero:active {
  background: linear-gradient(135deg, #bd8438, #9a6624 45%, #663708);
  transform: translateY(0);
}

/* Nur opacity animiert — der Knopf steht im Admin-Tab über der laufenden
   Bühne, und ein Farb- oder Schattenwechsel je Frame rastert die Box neu. */
@keyframes me-flash {
  0% {
    opacity: 0.35;
  }
  100% {
    opacity: 1;
  }
}
.me-hero--flash {
  animation: me-flash 0.28s ease-out forwards;
}

.me-rune {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  background: #241305;
  border: 1px solid #7a4e20;
  border-radius: var(--bp-radius);
  box-shadow: inset 0 0 0 1px rgba(255, 216, 138, 0.18);
}
.me-icon {
  color: #ffd97a;
}

.me-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.me-title {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #fff8e4;
  line-height: 1.05;
  text-shadow: 0 1px 0 #5a3208;
}
.me-sub {
  font-size: 0.7rem;
  color: #3a1f06;
  line-height: 1.25;
}

.me-chips {
  display: flex;
  align-items: stretch;
  gap: 6px;
  flex-shrink: 0;
}
.me-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 62px;
  padding: 5px 9px;
  background: #2a1607;
  border: 1px solid #8a5a24;
  border-radius: var(--bp-radius);
}
.me-chip-label {
  font-size: 0.55rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #c99a4e;
  line-height: 1;
}
.me-chip-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: #ffe6a8;
  line-height: 1;
}

/* Eigene Ebene, damit nur transform animiert — kein Verlauf, keine Farbe und
   kein Schatten wandert je Frame. Genau EINE solche Ebene im Admin-Tab. */
.me-sweep {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255, 246, 214, 0.34), transparent);
  transform: translateX(-140%);
  animation: me-sweep 5.5s linear infinite;
  will-change: transform;
  pointer-events: none;
}
@keyframes me-sweep {
  0% {
    transform: translateX(-140%);
  }
  100% {
    transform: translateX(360%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .me-sweep {
    animation: none;
  }
}

/* Full HD und WUXGA: die Höhe des Dashboards ist dort knapp, die Breite nicht. */
@media (max-height: 1100px) {
  .me-hero {
    padding: 8px 12px;
    gap: 11px;
  }
  .me-rune {
    width: 38px;
    height: 38px;
  }
  .me-title {
    font-size: 0.92rem;
  }
  .me-sub {
    font-size: 0.64rem;
  }
  .me-chip {
    min-width: 56px;
    padding: 4px 8px;
  }
  .me-chip-value {
    font-size: 0.85rem;
  }
}
</style>
