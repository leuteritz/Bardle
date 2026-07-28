<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { usePlanetShopStore } from '@/stores/planetShopStore'
import type { PlanetSlot } from '@/stores/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { useGameStore } from '@/stores/gameStore'
import { toRoman } from '@/utils/format'
import { displaySunPhase, useSunPhaseDisplay } from '@/composables/useSunPhaseDisplay'

const props = defineProps<{ planet: PlanetSlot; slotIndex: number }>()
const emit = defineEmits<{ buy: [slotId: string] }>()

const store = usePlanetShopStore()
const solarStore = useSolarUpgradeStore()
const gameStore = useGameStore()
const { currentDisplayPhase } = useSunPhaseDisplay()

const orbitNumber = computed(() => Number(props.planet.id.replace('slot_', '')))

// ── Die beiden Tore, die den Slot öffnen ───────────────────────────────────
// Beide Bedingungen werden getrennt und mit Ist-Werten gezeigt: der Spieler soll
// sofort sehen, WORAN es hängt, statt nur "gesperrt" zu lesen.
const cost = computed(() => store.getSlotCost(props.planet.id))
const requiredPhase = computed(() => store.getSlotRequiredPhase(props.slotIndex))
const phaseMet = computed(
  () => !solarStore.isCometState && store.currentSunStage >= requiredPhase.value,
)
const chimesMet = computed(() => gameStore.chimes >= cost.value)
/** Anteil der Kosten, den der Spieler schon zusammen hat (0 … 1) — füllt den Sparbalken. */
const chimeProgress = computed(() =>
  cost.value > 0 ? Math.min(1, gameStore.chimes / cost.value) : 1,
)
const canUnlock = computed(() => store.canUnlockPlanetSlot(props.slotIndex))
</script>

<template>
  <!-- ══ Locked planet — sealed orbit ══════════════════════════════════
       Hero composition instead of a stacked label list: the empty lane is drawn
       as a dashed orbit around the star, and the two things that actually gate
       it (Sun Phase, Chimes) become full readouts with live current values, so
       the player sees WHAT is missing, not just "locked". -->
  <div class="ps-lock">
    <div class="ps-lock-head">
      <span v-ink-center class="ps-lock-kicker">✦ Sealed Orbit ✦</span>
      <h2 v-ink-center class="ps-lock-title">Orbit {{ toRoman(orbitNumber) }}</h2>
      <span class="ps-lock-sub">
        An empty lane around your star — claim it to settle a planet here.
      </span>
    </div>

    <!-- The seal itself: one solid wood-framed plate with a slow halo.
         No rings, no ghost numeral — the orbit number is already the
         headline above, repeating it here only added noise. -->
    <div class="ps-lock-hero" :class="{ 'ps-lock-hero--ready': canUnlock }">
      <span class="ps-lock-halo" aria-hidden="true" />
      <span class="ps-lock-core">
        <img src="/img/lock.png" alt="Locked" class="ps-lock-core-img" />
      </span>
    </div>

    <!-- The two gates, each with its live current value -->
    <div class="ps-lock-gates">
      <div class="ps-lock-gate" :class="{ 'ps-lock-gate--met': phaseMet }">
        <span class="ps-lock-gate-medal">
          <Icon icon="game-icons:sun" width="30" height="30" />
        </span>
        <span class="ps-lock-gate-body">
          <span class="ps-lock-gate-label">Sun Phase</span>
          <span class="ps-lock-gate-value">{{ displaySunPhase(requiredPhase) }}</span>
          <span class="ps-lock-gate-note">You are at {{ currentDisplayPhase }}</span>
        </span>
        <span class="ps-lock-gate-state" aria-hidden="true">{{ phaseMet ? '✓' : '✕' }}</span>
      </div>

      <div class="ps-lock-gate" :class="{ 'ps-lock-gate--met': chimesMet }">
        <span class="ps-lock-gate-medal ps-lock-gate-medal--chime">
          <img src="/img/BardAbilities/BardChime.png" alt="" />
        </span>
        <span class="ps-lock-gate-body">
          <span class="ps-lock-gate-label">Chimes</span>
          <span class="ps-lock-gate-value">{{ $formatNumber(cost) }}</span>
          <!-- Sparfortschritt: sagt mehr als ein bloßes "zu teuer" -->
          <span class="ps-lock-gate-bar">
            <span class="ps-lock-gate-bar-fill" :style="{ width: chimeProgress * 100 + '%' }" />
          </span>
          <span class="ps-lock-gate-note">
            {{ $formatNumber(gameStore.chimes) }} saved ·
            {{ Math.floor(chimeProgress * 100) }}%
          </span>
        </span>
        <span class="ps-lock-gate-state" aria-hidden="true">{{ chimesMet ? '✓' : '✕' }}</span>
      </div>
    </div>

    <button v-if="canUnlock" class="ps-lock-cta" @click="emit('buy', planet.id)">
      <span class="ps-lock-cta-main">✦ Claim Orbit {{ toRoman(orbitNumber) }}</span>
      <span class="ps-lock-cta-cost">
        <img src="/img/BardAbilities/BardChime.png" alt="" />
        {{ $formatNumber(cost) }}
      </span>
    </button>
    <div v-else class="ps-lock-blocked">
      <span v-if="solarStore.isCometState">
        Your comet has no planetary system yet — ignite it into a star in the Star Forge.
      </span>
      <span v-else-if="!phaseMet">
        Grow your star to Phase {{ displaySunPhase(requiredPhase) }} to break the seal.
      </span>
      <span v-else>Keep collecting — the orbit opens once you can pay for it.</span>
    </div>
  </div>
</template>

<style scoped>
/* ══ Locked slot — sealed orbit ═══════════════════════════════════════════════
   Replaces the old stacked label list (12px title, 11px caption) with a hero:
   title band → empty-orbit visual → the two gates as full readouts → CTA.
   Everything scales with clamp()/vh so it stays legible on Full HD and doesn't
   look lost on 4K. */
.ps-lock {
  position: relative; /* paints above the shared cosmic backdrop */
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* safe centering: on the flattest viewports the content may exceed the panel —
     plain `center` would then clip the TOP out of the scroll range */
  justify-content: safe center;
  gap: clamp(10px, 1.8vh, 24px);
  padding: clamp(14px, 2.4vh, 34px) clamp(16px, 2vw, 40px);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.ps-lock-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(3px, 0.6vh, 8px);
  text-align: center;
}

.ps-lock-kicker {
  font-size: clamp(0.68rem, 1.1vh, 0.86rem);
  font-weight: 800;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(200, 160, 80, 0.65);
}

.ps-lock-title {
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

.ps-lock-sub {
  max-width: 46ch;
  font-size: clamp(0.82rem, 1.35vh, 1.05rem);
  font-weight: 600;
  line-height: 1.4;
  color: rgba(212, 200, 160, 0.62);
}

/* ── The seal ───────────────────────────────────────────────────────────────
   One solid wood-framed plate carrying the lock, wrapped in a soft halo that
   breathes. Nothing spins, nothing is dashed — the seal reads as a closed
   object, not as decoration around an empty middle. */
.ps-lock-hero {
  position: relative;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: clamp(150px, 21vh, 250px);
  height: clamp(150px, 21vh, 250px);
}

/* Halo — the only motion here; a slow, wide bloom under the plate */
.ps-lock-halo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(200, 144, 64, 0.22) 0%,
    rgba(200, 144, 64, 0.07) 42%,
    transparent 70%
  );
  animation: ps-lock-halo-breathe 3.6s ease-in-out infinite alternate;
  transition: background 320ms ease;
}

.ps-lock-core {
  position: relative;
  display: grid;
  place-items: center;
  width: 68%;
  height: 68%;
  border-radius: 50%;
  background: radial-gradient(circle at 42% 32%, #1e1a12 0%, #0a0906 72%);
  /* project frame language, rolled into a disc */
  border: 4px solid #7a4e20;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 5px #5c3310,
    inset 0 0 34px rgba(200, 144, 64, 0.1),
    0 10px 30px rgba(0, 0, 0, 0.75);
  transition:
    border-color 320ms ease,
    box-shadow 320ms ease;
}

.ps-lock-core-img {
  width: 42%;
  height: 42%;
  object-fit: contain;
  filter: drop-shadow(0 0 14px rgba(200, 144, 64, 0.5));
  animation: ps-lock-bob 3s ease-in-out infinite;
}

/* Ready to claim → the whole seal shifts to the CTA's green */
.ps-lock-hero--ready .ps-lock-halo {
  background: radial-gradient(
    circle,
    rgba(82, 184, 48, 0.26) 0%,
    rgba(82, 184, 48, 0.08) 42%,
    transparent 70%
  );
}

.ps-lock-hero--ready .ps-lock-core {
  border-color: #4f8a2a;
  box-shadow:
    inset 0 0 0 2px #14310a,
    inset 0 0 0 5px #2e7a1a,
    inset 0 0 34px rgba(82, 184, 48, 0.16),
    0 0 34px rgba(82, 184, 48, 0.35),
    0 10px 30px rgba(0, 0, 0, 0.75);
}

.ps-lock-hero--ready .ps-lock-core-img {
  filter: sepia(1) saturate(4) hue-rotate(60deg) brightness(1.1)
    drop-shadow(0 0 14px rgba(110, 192, 64, 0.55));
}

/* ── The two gates ────────────────────────────────────────────────────────── */
.ps-lock-gates {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: clamp(8px, 1vw, 16px);
  width: min(720px, 100%);
}

.ps-lock-gate {
  --gc: #cc6050;
  position: relative;
  display: flex;
  align-items: center;
  gap: clamp(9px, 0.9vw, 15px);
  padding: clamp(9px, 1.2vh, 15px) clamp(12px, 1.1vw, 18px);
  background: linear-gradient(150deg, rgba(28, 22, 16, 0.86) 0%, rgba(12, 10, 7, 0.9) 100%);
  border: 1px solid color-mix(in srgb, var(--gc) 40%, #2e2416);
  border-radius: 5px;
  box-shadow: inset 0 0 24px color-mix(in srgb, var(--gc) 6%, transparent);
  transition:
    border-color 300ms ease,
    box-shadow 300ms ease;
}

/* Erfüllt → grün. Der Zustandswechsel ist die eigentliche Information. */
.ps-lock-gate--met {
  --gc: #52b830;
}

.ps-lock-gate-medal {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: clamp(42px, 5.4vh, 60px);
  height: clamp(42px, 5.4vh, 60px);
  background: radial-gradient(circle at 45% 35%, #1a1710 0%, #0a0906 100%);
  border: 1px solid color-mix(in srgb, var(--gc) 50%, #3a2a10);
  border-radius: 5px;
  color: #e8c040;
  box-shadow: inset 0 0 10px color-mix(in srgb, var(--gc) 16%, transparent);
}

.ps-lock-gate-medal :deep(svg) {
  width: 62%;
  height: 62%;
  filter: drop-shadow(0 0 6px rgba(232, 192, 64, 0.5));
}

.ps-lock-gate-medal--chime img {
  width: 66%;
  height: 66%;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(232, 192, 64, 0.6));
}

.ps-lock-gate-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.ps-lock-gate-label {
  font-size: clamp(0.62rem, 1vh, 0.78rem);
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.42);
}

.ps-lock-gate-value {
  font-size: clamp(1.25rem, 2.4vh, 1.85rem);
  font-weight: 900;
  line-height: 1.05;
  color: #e8c040;
  text-shadow: 0 0 12px rgba(232, 192, 64, 0.45);
  font-variant-numeric: tabular-nums;
}

.ps-lock-gate-note {
  font-size: clamp(0.66rem, 1.05vh, 0.82rem);
  font-weight: 700;
  color: color-mix(in srgb, var(--gc) 70%, #8a8272);
}

/* Sparbalken — zeigt, wie weit die Kosten schon zusammen sind */
.ps-lock-gate-bar {
  position: relative;
  display: block;
  width: 100%;
  height: 6px;
  margin: 3px 0 2px;
  background: #14110c;
  border: 1px solid #241d12;
  border-radius: 4px;
  overflow: hidden;
}

.ps-lock-gate-bar-fill {
  display: block;
  height: 100%;
  background: linear-gradient(to bottom, #f0c840, #b8860f);
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.5);
  transition: width 0.4s ease;
}

.ps-lock-gate--met .ps-lock-gate-bar-fill {
  background: linear-gradient(to bottom, #6ee04a, #2f9a24);
  box-shadow: 0 0 8px rgba(92, 230, 106, 0.5);
}

.ps-lock-gate-state {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: clamp(24px, 3vh, 30px);
  height: clamp(24px, 3vh, 30px);
  font-size: clamp(0.85rem, 1.5vh, 1.05rem);
  font-weight: 900;
  line-height: 1;
  color: var(--gc);
  background: color-mix(in srgb, var(--gc) 14%, rgba(8, 7, 4, 0.9));
  border: 1px solid color-mix(in srgb, var(--gc) 55%, transparent);
  border-radius: 50%;
  box-shadow: 0 0 10px color-mix(in srgb, var(--gc) 28%, transparent);
}

/* ── CTA / blocked note ───────────────────────────────────────────────────── */
.ps-lock-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: min(420px, 100%);
  padding: clamp(10px, 1.4vh, 16px) clamp(20px, 2vw, 34px);
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: 5px;
  color: #fff;
  cursor: pointer;
  box-shadow:
    0 0 22px rgba(82, 184, 48, 0.35),
    0 4px 14px rgba(0, 0, 0, 0.55);
  transition:
    filter 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease;
  animation: ps-lock-cta-pulse 2.4s ease-in-out infinite;
}

.ps-lock-cta:hover {
  filter: brightness(1.12);
  transform: translateY(-2px);
  animation: none;
}

.ps-lock-cta:active {
  transform: translateY(0) scale(0.98);
}

.ps-lock-cta:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px rgba(232, 192, 64, 0.9),
    0 0 16px rgba(232, 192, 64, 0.5);
}

.ps-lock-cta-main {
  font-size: clamp(1rem, 1.9vh, 1.4rem);
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-shadow: 0 2px 3px rgba(0, 0, 0, 0.5);
}

.ps-lock-cta-cost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: clamp(0.78rem, 1.3vh, 0.98rem);
  font-weight: 800;
  color: rgba(255, 255, 255, 0.85);
  font-variant-numeric: tabular-nums;
}

.ps-lock-cta-cost img {
  width: clamp(16px, 2vh, 22px);
  height: clamp(16px, 2vh, 22px);
}

.ps-lock-blocked {
  max-width: 52ch;
  padding: clamp(8px, 1.1vh, 13px) clamp(14px, 1.4vw, 22px);
  text-align: center;
  font-size: clamp(0.8rem, 1.3vh, 1rem);
  font-weight: 700;
  line-height: 1.45;
  color: rgba(212, 160, 90, 0.72);
  background: rgba(20, 15, 8, 0.7);
  border: 1px solid #3a2a14;
  border-radius: 5px;
}

@media (prefers-reduced-motion: reduce) {
  .ps-lock-halo,
  .ps-lock-core-img,
  .ps-lock-cta {
    animation: none;
  }
}

@keyframes ps-lock-bob {
  0%, 100% { transform: translateY(0) rotate(-4deg); }
  50%       { transform: translateY(-3px) rotate(4deg); }
}

@keyframes ps-lock-halo-breathe {
  from {
    opacity: 0.55;
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    transform: scale(1.04);
  }
}

@keyframes ps-lock-cta-pulse {
  0%,
  100% {
    box-shadow:
      0 0 16px rgba(82, 184, 48, 0.28),
      0 4px 14px rgba(0, 0, 0, 0.55);
  }
  50% {
    box-shadow:
      0 0 30px rgba(82, 184, 48, 0.6),
      0 0 52px rgba(82, 184, 48, 0.18),
      0 4px 14px rgba(0, 0, 0, 0.55);
  }
}
</style>
