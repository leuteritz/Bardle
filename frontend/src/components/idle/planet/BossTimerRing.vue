<template>
  <!-- Radialer Countdown-Ring neben der Boss-HP-Leiste (Star-Despawn, Strike,
       Rage, Nova). Farbe/Puls/Glow kommen vom Parent — Geometrie, Aufbau und
       Kompakt-Layout sind hier zentral. `title` fällt als Attribut durch. -->
  <div
    class="btr"
    :class="{ 'btr--pulse': pulse, 'btr--intense': intenseGlow }"
    :style="{
      '--ring-color': color,
      '--ring-text': textColor ?? color,
      '--ring-label': labelColor ?? `color-mix(in srgb, ${color} 60%, transparent)`,
      '--ring-badge': badgeColor ?? `color-mix(in srgb, ${color} 75%, transparent)`,
    }"
  >
    <svg viewBox="0 0 100 100" class="btr-svg" aria-hidden="true">
      <circle cx="50" cy="50" r="46" class="btr-disc" />
      <circle cx="50" cy="50" r="44" class="btr-track" />
      <circle cx="50" cy="50" r="44" class="btr-arc" :style="{ strokeDasharray: dashArray }" />
    </svg>
    <div class="btr-inner">
      <span class="btr-secs">{{ secs }}</span>
      <span class="btr-label">{{ label }}</span>
    </div>
    <span v-if="badge" class="btr-badge">{{ badge }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Angezeigte Restsekunden */
    secs: number
    /** Kurz-Label unter der Zahl (SEC / STRIKE / RAGE / NOVA) */
    label: string
    /** Ring-Füllstand 0–1 (1 = voller Kreis, Fähigkeit bereit) */
    pct: number
    /** Basisfarbe: Arc + Zahl; Label/Badge werden daraus abgemischt */
    color: string
    /** Abweichende Zahlenfarbe (z. B. aktive Rage) */
    textColor?: string
    /** Abweichende Label-Farbe (Default: color @ 60 %) */
    labelColor?: string
    /** Badge-Text unter dem Ring (z. B. "42 dmg") — leer = kein Badge */
    badge?: string
    /** Abweichende Badge-Farbe (Default: color @ 75 %) */
    badgeColor?: string
    /** Zahl pulsiert (kritischer Timer / aktive Rage) */
    pulse?: boolean
    /** Stärkerer Glow um die Zahl (aktive Rage) */
    intenseGlow?: boolean
  }>(),
  { textColor: undefined, labelColor: undefined, badge: '', badgeColor: undefined },
)

// Arc-Geometrie: Radius 44 im 100er-viewBox (siehe SVG oben)
const CIRCUMFERENCE = 2 * Math.PI * 44

const dashArray = computed(() => {
  const clamped = Math.max(0, Math.min(1, props.pct))
  return `${clamped * CIRCUMFERENCE} ${CIRCUMFERENCE}`
})
</script>

<style scoped>
.btr {
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
  pointer-events: none;
}

.btr-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.btr-disc {
  fill: rgba(10, 5, 0, 0.62);
  stroke: rgba(120, 60, 10, 0.4);
  stroke-width: 1;
}

.btr-track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 5;
}

/* Kein drop-shadow: der Arc transitioniert alle 200 ms — ein Filter würde
   das SVG dauerhaft jede Frame neu rastern */
.btr-arc {
  fill: none;
  stroke: var(--ring-color);
  stroke-width: 5;
  stroke-linecap: round;
  transition: stroke-dasharray 0.2s linear, stroke 0.3s ease;
}

.btr-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.btr-secs {
  font-size: 1.8rem;
  font-weight: 900;
  line-height: 1;
  color: var(--ring-text);
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 14px color-mix(in srgb, var(--ring-text) 55%, transparent),
    0 2px 4px rgba(0, 0, 0, 0.95);
}

.btr--intense .btr-secs {
  text-shadow:
    0 0 18px color-mix(in srgb, var(--ring-color) 85%, transparent),
    0 0 38px color-mix(in srgb, var(--ring-color) 45%, transparent),
    0 2px 4px rgba(0, 0, 0, 0.95);
}

.btr--pulse .btr-secs {
  animation: btr-secs-pulse 0.7s ease-in-out infinite alternate;
}

@keyframes btr-secs-pulse {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.12);
  }
}

.btr-label {
  font-size: 0.55rem;
  font-weight: 800;
  letter-spacing: 0.26em;
  color: var(--ring-label);
  text-transform: uppercase;
}

/* Damage-Badge unter dem Ring — Wert direkt am Cooldown */
.btr-badge {
  position: absolute;
  top: calc(100% - 2px);
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  color: var(--ring-badge);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

/* Kompakt-Layout Full HD (gleiches Muster wie StarFightModal) */
@media (max-height: 1100px) {
  .btr {
    width: 72px;
    height: 72px;
  }

  .btr-secs {
    font-size: 1.3rem;
  }

  .btr-label {
    font-size: 0.48rem;
  }

  .btr-badge {
    font-size: 0.58rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btr--pulse .btr-secs {
    animation: none;
  }
}
</style>
