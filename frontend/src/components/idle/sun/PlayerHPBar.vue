<template>
  <div class="hp-bar-container" :style="sunRVar">
    <!--
      Die Leiste selbst ist das gemeinsame Bauteil; dieser Container besitzt nur
      noch, was zur BÜHNE gehört: die Lage über der Sonnenscheibe, die mit dem
      Sonnenradius mitwächst, und die beiden Ebenen im Teleport darunter.
    -->
    <VitalityBar
      :current="playerStore.currentHP"
      :max="playerStore.maxHP"
      label-placement="above"
      lead-icon="ph:heart-fill"
      :aria-label="`Sun health ${Math.ceil(playerStore.currentHP)} of ${playerStore.maxHP}`"
    />

    <Teleport to="body">
      <div v-if="playerStore.isLow" class="hp-vignette" aria-hidden="true" />
      <div class="dmg-float-layer" :style="sunRVar" aria-hidden="true">
        <span v-for="f in playerStore.damageFloats" :key="f.id" class="dmg-float"
          >-{{ f.value }}</span
        >
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import VitalityBar from '@/components/ui/VitalityBar.vue'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'

const playerStore = usePlayerStore()
const planetShopStore = usePlanetShopStore()

const sunRVar = computed(() => ({ '--sun-r': `${planetShopStore.currentSunRadius}px` }))

/** Die Schadenszahlen gehören der Bühne, nicht der Leiste — sie steigen über der
 *  Sonne auf, nicht über dem Balken. Das Aufräumen bleibt deshalb hier. */
let pruneInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  pruneInterval = setInterval(() => playerStore.pruneFloats(), 500)
})

onUnmounted(() => {
  if (pruneInterval) clearInterval(pruneInterval)
})
</script>

<style scoped>
/* ── Container – kein Background, kein Border ── */
.hp-bar-container {
  position: fixed;
  top: calc(50% - calc(var(--sun-r) * 1.75));
  left: 50%;
  transform: translate(-50%, -100%);
  z-index: 20;
  pointer-events: none;
  width: clamp(200px, calc(var(--sun-r) * 3.5), 500px);
  transition:
    top 1.5s ease,
    width 1.5s ease;

  /* Maße der Leiste. Sie ist schmal, deshalb steht die Zahl ÜBER ihr und nicht
     darin — und deshalb bekommt sie keinen Dauerglanz: eine Welle über 18 % von
     10 px liest sich nicht als Welle, kostet aber einen Dauerläufer über der
     Bühne, auf die der Spieler die ganze Zeit schaut. */
  --vb-h: 10px;
  --vb-radius: 2px;
  --vb-label-size: 0.9rem;
  --vb-label-sub-size: 0.9rem;
  --vb-label-gap: 5px;
  --vb-icon-size: 16px;
  --vb-num-gap: 4px;
  --vb-cur-reserve: 0;
}

/* ── Vignette ── */
.hp-vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  background: radial-gradient(
    ellipse at center,
    transparent 42%,
    rgba(165, 18, 0, 0.16) 70%,
    rgba(140, 8, 0, 0.33) 100%
  );
  animation: vignette-pulse 1.4s ease-in-out infinite alternate;
}

@keyframes vignette-pulse {
  from {
    opacity: 0.55;
  }
  to {
    opacity: 1;
  }
}

/* ── Damage Floats ── */
.dmg-float-layer {
  position: fixed;
  top: calc(50% - calc(var(--sun-r) * 1.75));
  left: 50%;
  transform: translate(-50%, -100%);
  pointer-events: none;
  z-index: 30;
  width: 0;
  height: 0;
  transition: top 1.5s ease;
}

.dmg-float {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.1rem;
  font-weight: 700;
  color: #f83820;
  text-shadow:
    0 0 8px rgba(255, 40, 10, 0.8),
    0 1px 3px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  animation: dmg-float-up 1.4s ease-out forwards;
  pointer-events: none;
}

@keyframes dmg-float-up {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-38px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hp-vignette {
    animation: none;
  }
  .dmg-float {
    animation: none;
  }
}
</style>
