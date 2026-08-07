<template>
  <!--
    Stase aus R. Der Schleier steht nur die acht Sekunden, die er dauert —
    deshalb v-if und nicht v-show: ein dauerhaft montiertes Vollbild-Element
    belegte sonst durchgehend eine Compositor-Ebene in Bildschirmgröße
    (Performance-Regel 12), für einen Effekt, der fast nie läuft.

    Bewegt wird ausschließlich `transform` und `opacity`. Die goldene Vignette
    selbst ist ein statischer Verlauf; der Eindruck, dass die Zeit stockt, kommt
    von den beiden gegenläufigen Ringen und dem sehr langsamen Atem der
    Deckkraft, nicht von einem Filter.
  -->
  <Transition name="fate">
    <div v-if="store.stasisActive" class="fate-layer" aria-hidden="true">
      <div class="fate-vignette"></div>

      <div class="fate-banner" role="status">
        <span class="fate-title">Tempered Fate</span>
        <span class="fate-clock">{{ store.stasisSecondsLeft }}s</span>
        <span class="fate-note">{{ FATE_DAMAGE_MULT }}× damage · everything held</span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { FATE_DAMAGE_MULT } from '@/config/constants'

const store = useBardAbilityStore()
</script>

<style scoped>
/* z-index 40: über dem Orbit, unter jedem Modal und unter der Bottom-Bar —
   ein Profil-Tab deckt den Schleier damit von selbst zu, ohne dass er den
   geöffneten Tab kennen müsste. */
.fate-layer {
  position: fixed;
  inset: 0;
  z-index: 40;
  pointer-events: none;
  overflow: hidden;
}

/* Goldsaum am Bildrand, Mitte frei: der Orbit bleibt vollständig lesbar,
   während unübersehbar ist, dass gerade etwas anderes gilt. */
.fate-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    rgba(232, 192, 64, 0) 42%,
    rgba(232, 192, 64, 0.1) 68%,
    rgba(200, 144, 64, 0.26) 88%,
    rgba(92, 51, 16, 0.42) 100%
  );
  animation: fate-breathe 3.2s ease-in-out infinite;
}

/* Hier standen einmal zwei gegenläufig rotierende Ringe von 128vmax Kantenlänge.
   Die Drehung selbst war zwar Compositor-Arbeit, aber jeder Ring belegte eine
   eigene Ebene von 2458 × 2458 px — rund 24 MB, zweimal, für einen Saum, den
   man auf dem Bild kaum fand. Gemessen kostete der Schleier damit über 5 ms je
   Frame (183 → 69 fps, längster Frame 103 ms). Die Vignette allein trägt die
   Aussage genauso und bleibt bei einer Ebene in Bildschirmgröße
   (Performance-Regel 12). */

/* Unter dem Header, über dem Orbit: dieselbe Zeile, in der das Spiel auch
   sonst meldet, was gerade gilt.

   Gemessen wird gegen `--level-badge-bottom` und nicht gegen `--header-height`:
   die Level-Blase hängt unter dem Bogen heraus und reicht damit weiter als der
   Header selbst — gegen die Höhe allein gerechnet schnitt das Band genau durch
   die Zahl. Dieselbe Variable richtet schon das Profil-Menü und die
   Drifter-Bahn aus. */
.fate-banner {
  position: absolute;
  top: calc(var(--level-badge-bottom, calc(var(--header-total-height, 50px) + 60px)) + 14px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 7px 18px 8px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  white-space: nowrap;
}

.fate-title {
  font-size: 1.15rem;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.06em;
  color: #e8c040;
}

.fate-clock {
  font-size: 1.35rem;
  font-weight: 900;
  line-height: 1;
  color: #f2ead2;
  font-variant-numeric: tabular-nums;
}

.fate-note {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #b89b5a;
}

@keyframes fate-breathe {
  0%,
  100% {
    opacity: 0.75;
  }
  50% {
    opacity: 1;
  }
}

.fate-enter-active {
  transition: opacity 220ms ease;
}
.fate-leave-active {
  transition: opacity 520ms ease;
}
.fate-enter-from,
.fate-leave-to {
  opacity: 0;
}

@media (min-width: 2400px) {
  .fate-title {
    font-size: 1.4rem;
  }
  .fate-clock {
    font-size: 1.65rem;
  }
  .fate-note {
    font-size: 0.92rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fate-vignette {
    animation: none;
  }
}
</style>
