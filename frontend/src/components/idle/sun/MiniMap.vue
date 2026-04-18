<template>
  <Transition name="travel-fade">
    <div v-if="show" class="travel-hud">
      <div class="minimap-panel">
        <div class="minimap-panel-topline" />

        <!-- Ankunfts-Countdown (über Minimap, rechtsbündig) -->
        <div v-if="!isRescuing" class="hud-eta">
          <span class="hud-eta-label">ETA</span>
          <span class="hud-eta-separator">·</span>
          <span class="hud-eta-value">{{ countdown }}</span>
        </div>

        <!-- RPG-Frame-Wrapper (übernimmt Hover, Blur, Scale) -->
        <div class="minimap-frame" :class="{ 'minimap-frame--rescuing': isRescuing }">
          <!-- N-Kompass-Label -->
          <span class="minimap-n-label">N</span>

          <!-- Dekorativer SVG-Kompassring (nur visuell) -->
          <svg
            class="minimap-compass-svg"
            viewBox="0 0 220 220"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <mask id="bezelMask">
                <circle cx="110" cy="110" r="107" fill="white" />
                <circle cx="110" cy="110" r="91" fill="black" />
              </mask>
              <radialGradient id="bezelGrad" cx="50%" cy="50%" r="50%">
                <stop offset="83%" stop-color="#0b0703" />
                <stop offset="100%" stop-color="#1c1108" />
              </radialGradient>
              <filter id="goldGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="1.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <!-- Dunkler Bezel-Hintergrund -->
            <circle cx="110" cy="110" r="107" fill="url(#bezelGrad)" mask="url(#bezelMask)" />

            <!-- Rahmenringe -->
            <circle cx="110" cy="110" r="109" stroke="rgba(60,38,10,0.7)" stroke-width="1" fill="none" />
            <circle cx="110" cy="110" r="107" stroke="rgba(210,160,40,0.95)" stroke-width="1.8" fill="none" filter="url(#softGlow)" />
            <circle cx="110" cy="110" r="104" stroke="rgba(100,68,15,0.6)" stroke-width="0.8" fill="none" />
            <circle cx="110" cy="110" r="101" stroke="rgba(160,115,30,0.35)" stroke-width="0.6" fill="none" />

            <!-- Feine Kompassstriche (36×, alle 10°) -->
            <circle cx="110" cy="110" r="99.5" stroke="rgba(175,130,38,0.6)" stroke-dasharray="2.2 15.16" stroke-width="2" fill="none" transform="rotate(-90 110 110)" />
            <!-- Ordinalstriche (NE/SE/SW/NW) -->
            <circle cx="110" cy="110" r="99.5" stroke="rgba(210,165,48,0.8)" stroke-dasharray="5 151.27" stroke-width="2.5" fill="none" transform="rotate(-45 110 110)" />

            <!-- Innere Bezel-Kanten -->
            <circle cx="110" cy="110" r="92.5" stroke="rgba(205,158,42,0.55)" stroke-width="1" fill="none" />
            <circle cx="110" cy="110" r="91" stroke="rgba(50,32,8,0.9)" stroke-width="1.2" fill="none" />

            <!-- Ordinal-Nieten -->
            <circle cx="185" cy="35" r="3.5" fill="#120b02" stroke="#c8a030" stroke-width="1.5" />
            <circle cx="185" cy="185" r="3.5" fill="#120b02" stroke="#c8a030" stroke-width="1.5" />
            <circle cx="35" cy="185" r="3.5" fill="#120b02" stroke="#c8a030" stroke-width="1.5" />
            <circle cx="35" cy="35" r="3.5" fill="#120b02" stroke="#c8a030" stroke-width="1.5" />
          </svg>

          <!-- Canvas-Renderer (Minimap-Logik) -->
          <div class="minimap-ring">
            <MiniMapCanvas />
          </div>

          <!-- Stern-Zähler (nicht während Suchphase) -->
          <div
            v-if="!galaxyStore.isComplete && !galaxyStore.isBossSearchActive"
            class="minimap-planet-count"
          >
            ★ {{ galaxyStore.starsRescued }} / {{ galaxyStore.starsRequired }}
          </div>

          <!-- Ressourcen-Stern Indikator -->
          <div v-if="starGroupStore.hasActiveResourceStar" class="minimap-resource-star">
            ✦ Ressourcen-Stern
          </div>

          <!-- Suchphase-Label -->
          <div v-if="galaxyStore.isBossSearchActive" class="minimap-search-label">
            ???
          </div>

          <!-- Galaxy Complete Overlay -->
          <div
            v-if="
              galaxyStore.isComplete &&
              !galaxyStore.isGalaxyTransitioning &&
              !galaxyStore.pendingTransition
            "
            class="complete-overlay"
          >
            <span class="complete-badge">✦ Galaxie Befreit ✦</span>
            <button class="next-galaxy-btn" @click="galaxyStore.requestTransition()">
              » Nächste Galaxie «
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useGalaxyStore } from '../../../stores/galaxyStore'
import { useStarGroupStore } from '../../../stores/starGroupStore'
import MiniMapCanvas from './MiniMapCanvas.vue'

export default defineComponent({
  name: 'MiniMap',
  components: { MiniMapCanvas },
  setup() {
    const galaxyStore = useGalaxyStore()
    const starGroupStore = useStarGroupStore()

    const show = computed(
      () =>
        ((galaxyStore.championTravelState === 'traveling' ||
          galaxyStore.championTravelState === 'champion_available' ||
          galaxyStore.championTravelState === 'champion_spawned') &&
          !galaxyStore.pendingGalaxyBoss &&
          !galaxyStore.isComplete) ||
        galaxyStore.isBossSearchActive ||
        galaxyStore.isGalaxyTransitioning ||
        galaxyStore.isComplete,
    )

    const isRescuing = computed(
      () =>
        galaxyStore.championTravelState === 'champion_available' ||
        galaxyStore.championTravelState === 'champion_spawned',
    )

    const countdown = computed(() => {
      const ms = galaxyStore.travelRemainingMs
      const s = Math.ceil(ms / 1000)
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      return `${m}:${String(sec).padStart(2, '0')}`
    })

    return { show, isRescuing, countdown, galaxyStore, starGroupStore }
  },
})
</script>

<style scoped>
/* ── Einblend-Animation ── */
.travel-fade-enter-active,
.travel-fade-leave-active {
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}
.travel-fade-enter-from,
.travel-fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

/* ── HUD-Container ── */
.travel-hud {
  position: fixed;
  bottom: 16px;
  left: 16px;
  z-index: 9;
  pointer-events: none;
}

/* ── RPG-Panel-Wrapper ── */
.minimap-panel {
  border: 4px solid #7a4e20;
  box-shadow: inset 0 0 0 2px #3e200a, inset 0 0 0 4px #5c3310;
  background: #111008;
  border-radius: 8px 8px 8px 0;
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  pointer-events: auto;
}

/* ── Goldlinie oben ── */
.minimap-panel-topline {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  border-radius: 2px;
  flex-shrink: 0;
}

.travel-hud:has(.minimap-frame:hover) {
  z-index: 20;
}

/* ── RPG-Frame-Wrapper ── */
.minimap-frame {
  position: relative;
  width: 440px;
  height: 440px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  transform-origin: center center;
  transition:
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    filter 0.4s ease,
    opacity 0.4s ease;
  filter: drop-shadow(0 0 10px rgba(180, 130, 28, 0.45)) drop-shadow(0 0 3px rgba(90, 58, 10, 0.65));
  animation: minimap-pulse-glow 3.5s ease-in-out infinite;
}

.minimap-frame:hover {
  transform: scale(1.15);
  filter: drop-shadow(0 0 22px rgba(232, 192, 64, 0.75))
    drop-shadow(0 0 8px rgba(160, 110, 20, 0.9));
  animation: none;
}

.minimap-frame--rescuing {
  filter: blur(2.5px) drop-shadow(0 0 8px rgba(180, 130, 28, 0.3));
  opacity: 0.45;
  animation: none;
}

.minimap-frame--rescuing:hover {
  filter: blur(0.5px) drop-shadow(0 0 16px rgba(232, 192, 64, 0.55));
  opacity: 0.9;
}

@keyframes minimap-pulse-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 10px rgba(180, 130, 28, 0.45))
      drop-shadow(0 0 3px rgba(90, 58, 10, 0.65));
  }
  50% {
    filter: drop-shadow(0 0 16px rgba(210, 160, 40, 0.65))
      drop-shadow(0 0 6px rgba(120, 82, 15, 0.75));
  }
}

/* ── Kompass-SVG ── */
.minimap-compass-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}

/* ── N-Label ── */
.minimap-n-label {
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 18px;
  font-weight: 700;
  font-family: Georgia, 'Times New Roman', serif;
  letter-spacing: 2px;
  color: #ffe080;
  text-shadow:
    0 0 10px rgba(232, 192, 64, 0.95),
    0 0 4px rgba(150, 100, 20, 0.8);
  z-index: 3;
  pointer-events: none;
  user-select: none;
}

/* ── Minimap-Kreis ── */
.minimap-ring {
  width: 360px;
  height: 360px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

/* ── Planeten-Zähler (RPG-Stil) ── */
.minimap-planet-count {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.6rem;
  font-weight: 700;
  color: #ffe484;
  letter-spacing: 0.18em;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  user-select: none;
  text-shadow:
    0 0 14px rgba(232, 192, 64, 0.95),
    0 0 6px rgba(255, 210, 60, 0.75),
    0 0 2px rgba(255, 240, 140, 0.5),
    0 1px 4px rgba(0, 0, 0, 0.98),
    0 2px 8px rgba(0, 0, 0, 0.85);
}

.minimap-resource-star {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.1rem;
  font-weight: 700;
  color: #ffd060;
  letter-spacing: 0.12em;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  user-select: none;
  animation: resource-star-pulse 1.4s ease-in-out infinite;
  text-shadow:
    0 0 10px rgba(255, 200, 50, 0.9),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

@keyframes resource-star-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* ── Suchphase-Label ── */
.minimap-search-label {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.6rem;
  font-weight: 700;
  color: #b090ff;
  letter-spacing: 0.22em;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  user-select: none;
  animation: search-label-pulse 1s ease-in-out infinite alternate;
  text-shadow:
    0 0 14px rgba(150, 80, 255, 0.95),
    0 0 6px rgba(120, 60, 255, 0.75),
    0 1px 4px rgba(0, 0, 0, 0.98);
}

@keyframes search-label-pulse {
  from { opacity: 0.6; }
  to   { opacity: 1; }
}

/* ── ETA-Anzeige ── */
.hud-eta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding-bottom: 4px;
}

.hud-eta-label {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #9a6e28;
  filter: drop-shadow(0 0 5px rgba(160, 100, 30, 0.7));
}

.hud-eta-separator {
  color: #5a3a10;
  font-size: 0.75rem;
  line-height: 1;
}

.hud-eta-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  line-height: 1;
  text-shadow:
    0 0 14px rgba(220, 175, 40, 0.8),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

/* ── Galaxy Complete Overlay ── */
.complete-overlay {
  position: absolute;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  background: rgba(10, 6, 2, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  z-index: 5;
  pointer-events: auto;
}

.complete-badge {
  font-size: 0.5rem;
  letter-spacing: 0.22em;
  color: #e8c040;
  text-transform: uppercase;
  text-shadow:
    0 0 14px rgba(232, 192, 64, 0.95),
    0 0 5px rgba(255, 210, 60, 0.7);
  animation: badge-pulse 2s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%,
  100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
}

.next-galaxy-btn {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: 4px;
  color: #fff;
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  padding: 7px 14px;
  cursor: pointer;
  text-transform: uppercase;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
  box-shadow: 0 2px 10px rgba(46, 122, 26, 0.55);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;
}

.next-galaxy-btn:hover {
  background: linear-gradient(to bottom, #66d040, #3a9a22);
  box-shadow: 0 0 16px rgba(82, 184, 48, 0.75);
  transform: translateY(-1px);
}

.next-galaxy-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(46, 122, 26, 0.4);
}
</style>
