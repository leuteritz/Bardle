<script setup lang="ts">
/**
 * Voyages, bevor es Voyages gibt.
 *
 * Kein Leerzustand, sondern ein Versprechen: was das System ist, was es
 * einbringt — und woran es GERADE hängt, mit dem Ist-Wert daneben. Vorbild ist
 * `planets/PlanetLockedPanel.vue`.
 */
import { Icon } from '@iconify/vue'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { EXPEDITION_UNLOCK_GALAXY } from '@/config/constants'
import { toRoman } from '@/utils/ui/format'

const galaxyStore = useGalaxyStore()

const PREVIEW = [
  {
    icon: 'game-icons:treasure-map',
    title: 'Charted Destinations',
    text: 'Every galaxy you free stays on the chart as a place to send crews.',
  },
  {
    icon: 'ph:users-three-fill',
    title: 'Travelling Crews',
    text: 'Champions who hold no seat on the board leave for the long road instead of idling beside it.',
  },
  {
    icon: 'game-icons:swap-bag',
    title: 'Spoils & Waymarks',
    text: 'Materials, chimes and waymarks that outlast the run — the road remembers who walked it.',
  },
]
</script>

<template>
  <div class="evl">
    <div class="evl-head">
      <span v-ink-center class="evl-kicker">✦ Uncharted ✦</span>
      <h2 v-ink-center class="evl-title">Voyages</h2>
      <span class="evl-sub">
        The board fights. The rest of your company travels — as soon as there is somewhere
        to travel to.
      </span>
    </div>

    <div class="evl-hero">
      <span class="evl-halo" aria-hidden="true" />
      <span class="evl-core">
        <Icon icon="ph:map-trifold-fill" class="evl-core-map" width="72" height="72" />
        <span class="evl-seal">
          <Icon icon="lucide:lock" width="28" height="28" />
        </span>
      </span>
    </div>

    <!-- Das Tor mit Ist-Wert: WORAN es hängt, nicht bloß "gesperrt". -->
    <div class="evl-gate">
      <span class="evl-gate-medal">
        <Icon icon="ph:planet-fill" width="30" height="30" />
      </span>
      <span class="evl-gate-body">
        <span class="evl-gate-label">First Galaxy Freed</span>
        <span class="evl-gate-value">Galaxy {{ toRoman(EXPEDITION_UNLOCK_GALAXY) }}</span>
        <span class="evl-gate-note">
          You stand in Galaxy {{ toRoman(galaxyStore.currentGalaxy) }} — rescue its planets
          and warp onward. The galaxy you leave behind becomes your first destination.
        </span>
      </span>
      <span class="evl-gate-state" aria-hidden="true">
        <span class="evl-gate-state-num">{{ galaxyStore.completedGalaxies.length }} / 1</span>
        <span class="evl-gate-state-label">freed</span>
      </span>
    </div>

    <div class="evl-preview">
      <div v-for="card in PREVIEW" :key="card.title" class="evl-card">
        <Icon :icon="card.icon" width="34" height="34" class="evl-card-ico" />
        <span class="evl-card-title">{{ card.title }}</span>
        <span class="evl-card-text">{{ card.text }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.evl {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* safe: auf dem flachsten Viewport darf der Kopf nicht aus dem Rollbereich */
  justify-content: safe center;
  gap: clamp(10px, 1.8vh, 26px);
  padding: clamp(14px, 2.6vh, 38px) clamp(16px, 2vw, 44px);
  overflow-y: auto;
  background: #111008;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.evl-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(3px, 0.6vh, 8px);
  text-align: center;
}

.evl-kicker {
  font-size: clamp(0.68rem, 1.1vh, 0.86rem);
  font-weight: 800;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(200, 160, 80, 0.65);
}

.evl-title {
  font-size: clamp(1.8rem, 3.6vh, 3rem);
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1;
  color: #e8c040;
  text-shadow:
    0 0 22px rgba(232, 192, 64, 0.5),
    0 2px 6px rgba(0, 0, 0, 0.8);
}

.evl-sub {
  max-width: 52ch;
  font-size: clamp(0.82rem, 1.35vh, 1.05rem);
  font-weight: 600;
  line-height: 1.4;
  color: rgba(212, 200, 160, 0.62);
}

/* ── Das Siegel ────────────────────────────────────────────────────────────
   Eine Scheibe in der Rahmensprache des Projekts. Der Schein liegt als eigene
   Ebene darunter und atmet über `opacity` — nichts rastert pro Frame neu. */
.evl-hero {
  position: relative;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: clamp(120px, 17vh, 190px);
  height: clamp(120px, 17vh, 190px);
}

.evl-halo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(200, 144, 64, 0.22) 0%,
    rgba(200, 144, 64, 0.07) 42%,
    transparent 70%
  );
  animation: evl-halo-breathe 3.6s ease-in-out infinite alternate;
}

@keyframes evl-halo-breathe {
  from {
    opacity: 0.55;
  }
  to {
    opacity: 1;
  }
}

.evl-core {
  position: relative;
  display: grid;
  place-items: center;
  width: 70%;
  height: 70%;
  border-radius: 50%;
  background: radial-gradient(circle at 42% 32%, #1e1a12 0%, #0a0906 72%);
  border: 4px solid #7a4e20;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 5px #5c3310,
    inset 0 0 34px rgba(200, 144, 64, 0.1),
    0 10px 30px rgba(0, 0, 0, 0.75);
}

.evl-core-map {
  color: rgba(200, 144, 64, 0.42);
}

.evl-seal {
  position: absolute;
  right: -4px;
  bottom: -4px;
  display: grid;
  place-items: center;
  width: clamp(38px, 5.2vh, 52px);
  height: clamp(38px, 5.2vh, 52px);
  border-radius: 50%;
  color: #e8c040;
  background: #16140e;
  border: 3px solid #7a4e20;
  box-shadow: inset 0 0 0 2px #3e200a;
}

/* ── Das Tor ──────────────────────────────────────────────────────────────── */
.evl-gate {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: clamp(10px, 1vw, 18px);
  width: min(100%, clamp(560px, 46vw, 900px));
  padding: clamp(10px, 1.4vh, 16px) clamp(12px, 1.2vw, 20px);
  background: #1c1c18;
  border: 1px solid #5c3310;
  border-radius: 4px;
}

.evl-gate-medal {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: clamp(42px, 5.4vh, 54px);
  height: clamp(42px, 5.4vh, 54px);
  border-radius: 4px;
  color: #c89040;
  background: #141410;
  border: 1px solid #5c3310;
}

.evl-gate-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.evl-gate-label {
  font-size: clamp(0.66rem, 1.05vh, 0.8rem);
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(200, 160, 80, 0.6);
}

.evl-gate-value {
  font-size: clamp(1rem, 1.9vh, 1.35rem);
  font-weight: 900;
  letter-spacing: 0.06em;
  color: #e8c040;
}

.evl-gate-note {
  font-size: clamp(0.76rem, 1.2vh, 0.95rem);
  font-weight: 600;
  line-height: 1.35;
  color: rgba(212, 200, 160, 0.68);
}

.evl-gate-state {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: clamp(4px, 0.7vh, 8px) clamp(8px, 0.7vw, 14px);
  background: #141410;
  border: 1px solid #5c3310;
  border-radius: 4px;
}

.evl-gate-state-num {
  font-size: clamp(0.86rem, 1.5vh, 1.1rem);
  font-weight: 900;
  letter-spacing: 0.04em;
  color: #cc6050;
}

.evl-gate-state-label {
  font-size: clamp(0.6rem, 0.95vh, 0.74rem);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(200, 160, 80, 0.55);
}

/* ── Was danach kommt ─────────────────────────────────────────────────────
   Statisch gedimmt, nicht animiert: drei Karten, die sagen, wofür sich der
   Warp lohnt. */
.evl-preview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(8px, 0.8vw, 16px);
  width: min(100%, clamp(680px, 62vw, 1280px));
}

.evl-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(4px, 0.7vh, 9px);
  padding: clamp(10px, 1.5vh, 18px) clamp(10px, 1vw, 16px);
  text-align: center;
  background: #1a1008;
  border: 1px solid #5c3310;
  border-radius: 4px;
  opacity: 0.72;
  filter: grayscale(40%);
}

.evl-card-ico {
  color: #c89040;
}

.evl-card-title {
  font-size: clamp(0.78rem, 1.25vh, 0.98rem);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #e8c040;
}

.evl-card-text {
  font-size: clamp(0.72rem, 1.15vh, 0.9rem);
  font-weight: 600;
  line-height: 1.35;
  color: rgba(212, 200, 160, 0.72);
}
</style>
