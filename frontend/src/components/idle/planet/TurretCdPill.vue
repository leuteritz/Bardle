<template>
  <!-- Cooldown-Pill der Turret-Battery — eigenständige Komponente, damit der
       100ms-Ticker NUR diesen winzigen Span re-rendert und nicht die ganze
       Batterie (6 Einheiten × Plates) mit 10 Hz durch den VDOM-Diff jagt. -->
  <span class="tcp" :class="{ 'tcp--ready': ready }">{{ display }}s</span>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { GAME_TICK_INTERVAL_MS, TURRET_CD_READY_MS, TURRET_CD_TICK_MS } from '@/config/constants'
import { gameNow } from '@/utils/game/gameClock'
import { formatCooldownSeconds } from '@/utils/ui/format'

const bossStore = usePlanetBossStore()

let lastVolleyMs = gameNow()
/** Restzeit in MILLISEKUNDEN — die Einheit, in der `formatCooldownSeconds`
 *  rechnet; die Pille zeigt dieselben ganzen Sekunden wie jede andere
 *  Abklingzeit im Spiel. */
const cdLeftMs = ref(GAME_TICK_INTERVAL_MS)
let tick: ReturnType<typeof setInterval> | null = null

watch(
  () => bossStore.turretVolleyCounter,
  () => {
    lastVolleyMs = gameNow()
  },
)

onMounted(() => {
  tick = setInterval(() => {
    cdLeftMs.value = Math.max(0, lastVolleyMs + GAME_TICK_INTERVAL_MS - gameNow())
  }, TURRET_CD_TICK_MS)
})

onUnmounted(() => {
  if (tick) clearInterval(tick)
})

const display = computed(() => formatCooldownSeconds(cdLeftMs.value))
const ready = computed(() => cdLeftMs.value <= TURRET_CD_READY_MS)
</script>

<style scoped>
.tcp {
  position: absolute;
  left: 50%;
  bottom: -8px;
  transform: translateX(-50%);
  min-width: 40px;
  padding: 1px 7px;
  border-radius: 8px;
  text-align: center;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--tc, #cc4444) 32%, #16100a),
    #0c0803
  );
  border: 1px solid color-mix(in srgb, var(--tc, #cc4444) 65%, #3a2410);
  box-shadow:
    0 0 8px color-mix(in srgb, var(--tc, #cc4444) 35%, transparent),
    0 2px 5px rgba(0, 0, 0, 0.75);
  font-size: 0.62rem;
  font-weight: 900;
  color: #f4ead0;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
  z-index: 3;
}

.tcp--ready {
  border-color: var(--tc, #cc4444);
  color: #fff;
  box-shadow:
    0 0 14px color-mix(in srgb, var(--tc, #cc4444) 80%, transparent),
    0 2px 5px rgba(0, 0, 0, 0.75);
}
</style>
