<template>
  <div class="bottom-connector" aria-hidden="true">
    <div class="status-bar-bg-wide" />

    <div class="status-bar">
      <BottomBarStatsComponent />
    </div>

    <svg
      class="bottom-connector-frame"
      viewBox="0 0 1200 24"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="bottomConnectorGoldGlow" x="-8%" y="-300%" width="116%" height="700%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="strongGlow" x="-20%" y="-500%" width="140%" height="1100%">
          <feGaussianBlur stdDeviation="4" result="blur1" />
          <feGaussianBlur stdDeviation="8" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <line
        x1="0"
        y1="12"
        x2="1200"
        y2="12"
        stroke="rgba(10,4,0,0.98)"
        stroke-width="7"
        stroke-linecap="round"
      />
      <line
        x1="0"
        y1="12"
        x2="1200"
        y2="12"
        stroke="#6b3e14"
        stroke-width="4"
        stroke-linecap="round"
      />
      <line
        x1="0"
        y1="12"
        x2="1200"
        y2="12"
        stroke="#c8900a"
        stroke-width="2.5"
        stroke-linecap="round"
        filter="url(#bottomConnectorGoldGlow)"
      />
      <line
        x1="0"
        y1="12"
        x2="1200"
        y2="12"
        stroke="rgba(255,215,60,0.95)"
        stroke-width="1.2"
        stroke-linecap="round"
        filter="url(#strongGlow)"
      />
      <line
        x1="0"
        y1="12"
        x2="1200"
        y2="12"
        stroke="rgba(255,245,180,0.35)"
        stroke-width="0.7"
        stroke-linecap="round"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import BottomBarStatsComponent from './BottomBarStatsComponent.vue'
</script>

<style scoped>
.bottom-connector {
  position: fixed;
  left: 458px;
  right: 458px;
  bottom: 48px;
  height: 24px;
  z-index: 9999;
  pointer-events: none;
  overflow: visible;
}

.status-bar-bg-wide {
  position: absolute;
  top: 9px;
  bottom: -80px;
  left: -50vw;
  right: -50vw;
  background: var(--rpg-bg-header, rgba(6, 4, 14, 0.88));
  z-index: 0;
}

.bottom-connector-frame {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 24px;
  overflow: visible;
  animation: connector-pulse-glow 3.5s ease-in-out infinite;
}

/*
  Geometrie:
  - .bottom-connector hat height: 24px
  - Goldlinie liegt bei top: 9px (Mitte des SVG y:12 scaled auf 24px height)
  - .bottom-connector-bg geht von top:9px bis bottom:-80px
    → brauner Bereich: 9px bis (24px + 80px) = 104px → 80px hoch unterhalb der Linie
  - Mitte des braunen Bereichs: 9px + 40px = 49px von Komponenten-Oberkante
  - status-bar height: 36px → top = 49px - 18px = 31px
    Laut Screenshot zu tief → Elemente erscheinen unterhalb der Linie.
    Fix: top: 13px positioniert die Bar direkt ab der Goldlinie nach unten,
    sodass die Inhalte knapp unter der Linie mittig im sichtbaren Bereich liegen.
*/
.status-bar {
  position: absolute;
  top: 25px;
  left: 0;
  right: 0;
  height: 36px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  pointer-events: none;
}

@keyframes connector-pulse-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 8px rgba(180, 130, 28, 0.5)) drop-shadow(0 0 3px rgba(90, 58, 10, 0.7));
  }
  50% {
    filter: drop-shadow(0 0 20px rgba(220, 170, 45, 0.8))
      drop-shadow(0 0 8px rgba(140, 95, 18, 0.85)) drop-shadow(0 0 35px rgba(180, 130, 28, 0.4));
  }
}
</style>
