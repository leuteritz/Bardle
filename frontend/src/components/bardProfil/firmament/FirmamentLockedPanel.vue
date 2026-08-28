<script setup lang="ts">
/**
 * Das Firmament, bevor es eines gibt.
 *
 * Kein Leerzustand, sondern ein Versprechen — und ein Tor mit Ist-Wert daneben.
 * Vorbild: `expedition/ExpeditionLockedPanel.vue`.
 */
import { Icon } from '@iconify/vue'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useGameStore } from '@/stores/core/gameStore'
import { toRoman } from '@/utils/ui/format'

const galaxyStore = useGalaxyStore()
const gameStore = useGameStore()

const PREVIEW = [
  {
    icon: 'game-icons:spiral-arrow',
    title: 'One Unbroken Road',
    text: 'Every galaxy you free stays lit on the spiral — the whole way out from the first orbit to where you stand.',
  },
  {
    icon: 'game-icons:portal',
    title: 'Gates Between Universes',
    text: 'Each departure leaves a gate on the road. The galaxies keep counting; only the universe around them changes.',
  },
  {
    icon: 'game-icons:star-formation',
    title: 'What Carries Over',
    text: 'Meeps, forge work and codex ranks outlive the run. The road remembers what the universe forgets.',
  },
]
</script>

<template>
  <div class="fml">
    <div class="fml-head">
      <span v-ink-center class="fml-kicker">✦ Unlit ✦</span>
      <h2 v-ink-center class="fml-title">Firmament</h2>
      <span class="fml-sub">
        The sky keeps no record of a road not yet walked. Free a galaxy and the first light appears.
      </span>
    </div>

    <div class="fml-hero">
      <span class="fml-halo" aria-hidden="true" />
      <span class="fml-core">
        <Icon icon="ph:globe-hemisphere-west-fill" class="fml-core-glyph" width="72" height="72" />
        <span class="fml-seal">
          <Icon icon="lucide:lock" width="28" height="28" />
        </span>
      </span>
    </div>

    <div class="fml-gate">
      <span class="fml-gate-medal">
        <Icon icon="ph:planet-fill" width="30" height="30" />
      </span>
      <span class="fml-gate-body">
        <span class="fml-gate-label">First Light</span>
        <span class="fml-gate-value">One galaxy freed</span>
        <span class="fml-gate-note">
          You stand in Galaxy {{ toRoman(galaxyStore.currentGalaxy) }} of Universe
          {{ toRoman(gameStore.currentUniverse) }} — rescue its stars and warp onward. The galaxy
          behind you becomes the first mark on the road.
        </span>
      </span>
      <span class="fml-gate-state" aria-hidden="true">
        <span class="fml-gate-state-num">{{ galaxyStore.completedGalaxies.length }} / 1</span>
        <span class="fml-gate-state-label">freed</span>
      </span>
    </div>

    <div class="fml-preview">
      <div v-for="card in PREVIEW" :key="card.title" class="fml-card">
        <Icon :icon="card.icon" width="34" height="34" class="fml-card-ico" />
        <span class="fml-card-title">{{ card.title }}</span>
        <span class="fml-card-text">{{ card.text }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fml {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: safe center;
  gap: clamp(10px, 1.8vh, 26px);
  padding: clamp(14px, 2.6vh, 38px) clamp(16px, 2vw, 44px);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.fml-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(3px, 0.6vh, 8px);
  text-align: center;
}

.fml-kicker {
  font-size: clamp(11px, 0.72vw, 15px);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #a07a3c;
}

.fml-title {
  margin: 0;
  font-size: clamp(26px, 2.3vw, 44px);
  line-height: 1;
  color: #e8c040;
}

.fml-sub {
  max-width: 62ch;
  font-size: clamp(12px, 0.78vw, 16px);
  line-height: 1.5;
  color: #9a9184;
}

/* Der Schein steht STATISCH — nichts hier pulst, der Reiter ist ein Standbild. */
.fml-hero {
  position: relative;
  display: grid;
  place-items: center;
  width: clamp(120px, 13vh, 176px);
  height: clamp(120px, 13vh, 176px);
  flex-shrink: 0;
}

.fml-halo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(122, 184, 240, 0.16) 0%, transparent 68%);
}

.fml-core {
  position: relative;
  display: grid;
  place-items: center;
  width: 74%;
  height: 74%;
  border: 3px solid #3e200a;
  border-radius: 50%;
  background: #0d0b06;
  box-shadow: inset 0 0 0 2px #1e1006;
}

.fml-core-glyph {
  color: #4d5a63;
}

.fml-seal {
  position: absolute;
  right: -4px;
  bottom: -4px;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  color: #a07a3c;
  background: #111008;
  border: 2px solid #5c3310;
  border-radius: 5px;
}

.fml-gate {
  display: flex;
  align-items: center;
  gap: 14px;
  width: min(760px, 100%);
  padding: 12px 16px;
  background: #1a1008;
  border: 1px solid #3e200a;
  border-left: 3px solid #7ab8f0;
  border-radius: 5px;
}

.fml-gate-medal {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  color: #7ab8f0;
  background: #141410;
  border: 1px solid #3a2c14;
  border-radius: 5px;
}

.fml-gate-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.fml-gate-label {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8a7a52;
}

.fml-gate-value {
  font-size: clamp(15px, 1vw, 19px);
  color: #f2ead2;
}

.fml-gate-note {
  font-size: clamp(11px, 0.68vw, 14px);
  line-height: 1.45;
  color: #9a9184;
}

.fml-gate-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  padding-left: 14px;
  border-left: 1px solid #2a1c0c;
}

.fml-gate-state-num {
  font-size: clamp(17px, 1.2vw, 23px);
  font-weight: 900;
  color: #e8c040;
  white-space: nowrap;
}

.fml-gate-state-label {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8a7a52;
}

.fml-preview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(8px, 0.9vw, 16px);
  width: min(980px, 100%);
}

.fml-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: #1c1c18;
  border: 1px solid #3a2c14;
  border-radius: 5px;
}

.fml-card-ico {
  color: #e8c040;
}

.fml-card-title {
  font-size: clamp(13px, 0.84vw, 17px);
  color: #f2ead2;
}

.fml-card-text {
  font-size: clamp(11px, 0.66vw, 14px);
  line-height: 1.45;
  color: #9a9184;
}
</style>
