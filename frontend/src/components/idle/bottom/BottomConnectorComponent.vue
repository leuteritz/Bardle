<template>
  <div class="bottom-connector" aria-hidden="true">
    <!-- Dunkler Hintergrundstreifen – identisch mit dem Panel-Background des Chats -->
    <div class="bottom-connector-bg" />

    <svg
      class="bottom-connector-frame"
      viewBox="0 0 1200 24"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="bottomConnectorGoldGlow" x="-8%" y="-300%" width="116%" height="700%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- Schicht 1: opaker dunkler Sockel – deckt Hintergrund ab -->
      <line
        x1="0"
        y1="12"
        x2="1200"
        y2="12"
        stroke="rgba(30,12,0,0.95)"
        stroke-width="5"
        stroke-linecap="round"
      />
      <!-- Schicht 2: Braun-Basis -->
      <line
        x1="0"
        y1="12"
        x2="1200"
        y2="12"
        stroke="#7a4e20"
        stroke-width="3"
        stroke-linecap="round"
      />
      <!-- Schicht 3: Gold mit Glow -->
      <line
        x1="0"
        y1="12"
        x2="1200"
        y2="12"
        stroke="rgba(210,160,40,0.85)"
        stroke-width="1.5"
        stroke-linecap="round"
        filter="url(#bottomConnectorGoldGlow)"
      />
      <!-- Schicht 4: heller Schimmer -->
      <line
        x1="0"
        y1="12"
        x2="1200"
        y2="12"
        stroke="rgba(255,220,80,0.25)"
        stroke-width="1"
        stroke-linecap="round"
      />
    </svg>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.bottom-connector {
  position: fixed;
  left: 458px;
  right: 458px;
  bottom: 48px;
  height: 24px;
  z-index: 10001;
  pointer-events: none;
  overflow: visible;
}

/* Dunkler Streifen UNTER der Linie – damit der Hintergrund nicht durch den Glow scheint */
.bottom-connector-bg {
  position: absolute;
  left: 0;
  right: 0;
  /* Nur unterhalb der Linie abdunkeln (y=12 ist Linienmitte, also ab y=9) */
  top: 9px;
  bottom: -80px; /* reicht bis unter den sichtbaren Bereich */
  background: #1a0d04;
  z-index: 0;
}

.bottom-connector-frame {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 24px;
  overflow: visible;
  /* Exakt dieselben drop-shadow-Werte wie .chat-frame-svg */
  animation: connector-pulse-glow 3.5s ease-in-out infinite;
}

@keyframes connector-pulse-glow {
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
</style>
