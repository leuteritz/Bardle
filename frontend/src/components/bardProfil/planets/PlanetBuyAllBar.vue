<template>
  <!-- Bleibt auch gesperrt stehen: sonst sprängen die sechs Kacheln darunter in der Höhe. -->
  <div class="pba-shell">
    <button
      v-tip="PLANET_BUY_ALL_TIP"
      type="button"
      class="pba"
      :class="{ 'pba--locked': locked, 'pba--flash': flashing }"
      :aria-disabled="locked"
      :aria-label="ariaLabel"
      @mouseenter="freeze"
      @mouseleave="thaw"
      @click="handleClick"
    >
      <span class="pba-flash" aria-hidden="true" />
      <span v-if="!locked" class="pba-sweep" aria-hidden="true" />

      <Icon
        :icon="FORGE_BUY_ALL_ICON"
        :width="PLANET_BUY_ALL_ICON_SIZE"
        :height="PLANET_BUY_ALL_ICON_SIZE"
        class="pba-glyph"
      />

      <span class="pba-text">
        <span class="pba-label">{{ PLANET_BUY_ALL_LABEL }}</span>
        <span class="pba-sub">
          <template v-if="!locked">
            <img :src="FORGE_CHIME_IMAGE" class="pba-chime" alt="" />
            <span class="pba-num">{{ formatNumber(plan.cost) }}</span>
          </template>
          <template v-else-if="plan.block === 'chimes'">
            {{ PLANET_BUY_ALL_NEXT }}
            <img :src="FORGE_CHIME_IMAGE" class="pba-chime" alt="" />
            <span class="pba-num">{{ formatNumber(plan.nextCost) }}</span>
          </template>
          <template v-else-if="plan.block === 'phase'">
            {{ PLANET_BUY_ALL_PHASE }} {{ displaySunPhase(plan.nextPhase) }}
          </template>
          <template v-else>{{ PLANET_BUY_ALL_REACH }}</template>
        </span>
      </span>

      <span v-if="!locked" class="pba-count">
        <span class="pba-count-num">+{{ plan.count }}</span>
        <span class="pba-count-unit">{{ unit }}</span>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { formatNumber } from '@/config/ui/numberFormat'
import { usePlanetShopStore, type PlanetBuyAllPlan } from '@/stores/world/planetShopStore'
import { useOrbitSlotHerald } from '@/composables/ui/useOrbitSlotHerald'
import { displaySunPhase } from '@/composables/orbit/useSunPhaseDisplay'
import {
  FORGE_BUY_ALL_ICON,
  FORGE_CHIME_IMAGE,
  PLANET_BUY_ALL_FLASH_MS,
  PLANET_BUY_ALL_ICON_SIZE,
  PLANET_BUY_ALL_LABEL,
  PLANET_BUY_ALL_NEXT,
  PLANET_BUY_ALL_PHASE,
  PLANET_BUY_ALL_REACH,
  PLANET_BUY_ALL_TIP,
  PLANET_BUY_ALL_UNIT,
  PLANET_BUY_ALL_UNIT_ONE,
} from '@/config/constants'

const props = defineProps<{
  /** Slots hinter der Sonne — reaktiv aus der rAF-Schleife des Reiters. */
  eclipsedIds: ReadonlySet<string>
}>()

const store = usePlanetShopStore()
const { buyAllPlanetLevels } = useOrbitSlotHerald()

const livePlan = computed(() => store.planBuyAllLevels((s) => !props.eclipsedIds.has(s.id)))

// Unter dem Zeiger steht die Zahl still — Muster und Begründung: ForgeBuyAllBar.
const frozenPlan = ref<PlanetBuyAllPlan | null>(null)
const plan = computed(() => frozenPlan.value ?? livePlan.value)

watch(livePlan, (fresh) => {
  if (fresh.count === 0) frozenPlan.value = null
})

const locked = computed(() => plan.value.count === 0)
const unit = computed(() => (plan.value.count === 1 ? PLANET_BUY_ALL_UNIT_ONE : PLANET_BUY_ALL_UNIT))
const ariaLabel = computed(() =>
  locked.value
    ? `${PLANET_BUY_ALL_LABEL} — ${PLANET_BUY_ALL_TIP}`
    : `${PLANET_BUY_ALL_LABEL}: ${plan.value.count} ${unit.value} for ${formatNumber(plan.value.cost)} Chimes`,
)

function freeze(): void {
  if (livePlan.value.count > 0) frozenPlan.value = livePlan.value
}

function thaw(): void {
  frozenPlan.value = null
}

const flashing = ref(false)
let flashTimer: ReturnType<typeof setTimeout> | null = null

function handleClick(): void {
  if (locked.value || buyAllPlanetLevels() === 0) return
  frozenPlan.value = livePlan.value.count > 0 ? livePlan.value : null
  flashing.value = true
  if (flashTimer !== null) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashing.value = false
  }, PLANET_BUY_ALL_FLASH_MS)
}

onUnmounted(() => {
  if (flashTimer !== null) clearTimeout(flashTimer)
})
</script>

<style scoped>
/* Seitliches Polster = das des Rollkastens darunter: Knopf und Kacheln stehen auf einer Kante. */
.pba-shell {
  flex-shrink: 0;
  padding: clamp(8px, 1vh, 14px) clamp(8px, 1vh, 14px) 0;
}

.pba {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  width: 100%;
  min-height: clamp(54px, 5.8vh, 68px);
  display: flex;
  align-items: center;
  gap: clamp(8px, 0.8vh, 11px);
  padding: clamp(7px, 0.8vh, 10px) clamp(9px, 0.9vh, 12px);
  border: 1px solid var(--rpg-green-border);
  border-radius: 4px;
  background: linear-gradient(to bottom, var(--rpg-green-top), var(--rpg-green-bottom));
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  color: #08130a;
  line-height: 1;
  text-align: left;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.pba:hover {
  transform: translateY(-1px);
}

.pba:active {
  transform: translateY(1px);
}

.pba:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 2px;
}

.pba-glyph {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  color: #08130a;
}

.pba-text {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 0.5vh, 6px);
}

.pba-label {
  font-size: clamp(16px, 1.7vh, 19px);
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.pba-sub {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: clamp(12px, 1.3vh, 14px);
  font-weight: 800;
  color: #0e2a10;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pba-chime {
  flex-shrink: 0;
  width: 1.25em;
  height: 1.25em;
}

/* Die Anzahl ist die Hauptauskunft — eigener Träger, Einheit darunter. */
.pba-count {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 3.4em;
  padding: 5px 7px;
  border-radius: 4px;
  background: rgba(6, 22, 8, 0.34);
  color: #eaffd8;
}

.pba-count-num {
  font-size: clamp(16px, 1.7vh, 19px);
  font-weight: 900;
}

.pba-count-unit {
  font-size: clamp(10px, 1vh, 12px);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #bfe8a8;
}

/* Ein Glanz alle paar Sekunden — nur transform und opacity. */
.pba-sweep {
  position: absolute;
  z-index: 0;
  top: -30%;
  bottom: -30%;
  left: -20%;
  width: 18%;
  background: #eaffd8;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-120%) skewX(-18deg);
  animation: pba-sweep 5.2s ease-in-out infinite;
}

@keyframes pba-sweep {
  0%,
  62%,
  100% {
    opacity: 0;
    transform: translateX(-120%) skewX(-18deg);
  }
  68% {
    opacity: 0.22;
  }
  84% {
    opacity: 0;
    transform: translateX(760%) skewX(-18deg);
  }
}

.pba-flash {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: #eaffd8;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease;
}

.pba--flash .pba-flash {
  opacity: 0.45;
}

/* Gesperrt: Projekt-Rezept, Schrift hell genug, dass der Grund lesbar bleibt. */
.pba--locked {
  background: var(--sr-row-bg);
  border-color: var(--sr-row-border);
  box-shadow: none;
  color: var(--sr-text);
  opacity: 0.5;
  filter: grayscale(55%);
  cursor: not-allowed;
}

.pba--locked:hover,
.pba--locked:active {
  transform: none;
}

.pba--locked .pba-glyph {
  color: var(--sr-dim);
}

.pba--locked .pba-sub {
  color: #e8c040;
}

@media (prefers-reduced-motion: reduce) {
  .pba {
    transition: none;
  }

  .pba-sweep {
    animation: none;
  }
}
</style>
