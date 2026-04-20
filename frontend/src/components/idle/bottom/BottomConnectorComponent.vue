<template>
  <div class="bottom-connector" aria-hidden="true">
    <svg
      class="bottom-connector-frame"
      viewBox="0 0 1200 24"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="bottomConnectorGoldGlow" x="-8%" y="-120%" width="116%" height="300%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d="M 0 12 L 1200 12"
        fill="none"
        stroke="rgba(30,12,0,0.95)"
        stroke-width="5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M 0 12 L 1200 12"
        fill="none"
        stroke="#7a4e20"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M 0 12 L 1200 12"
        fill="none"
        stroke="rgba(210,160,40,0.85)"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        filter="url(#bottomConnectorGoldGlow)"
      />
      <path
        d="M 0 12 L 1200 12"
        fill="none"
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
  bottom: 48px; /* exakt auf Höhe des Übergangs aus der MiniMap-Rundung */
  height: 24px;
  z-index: 10001;
  pointer-events: none;
  overflow: visible;
}

.bottom-connector-frame {
  display: block;
  width: 100%;
  height: 24px;
  overflow: visible;
  animation: minimap-pulse-glow 3.5s ease-in-out infinite;
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
</style>
