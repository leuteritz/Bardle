<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/gameStore'
import { AUGMENTS } from '@/config/augments'
import { AUGMENT_RARITY_COLOR, AUTO_PICK_ICON, AUTO_PICK_TOAST_MS } from '@/config/constants'

/**
 * Meldung eines automatisch gewählten Augments.
 *
 * Mit aktivem Auto-Pick öffnet sich das Auswahl-Modal nicht mehr — damit fiele
 * auch der einzige Ort weg, an dem der Spieler die Automatik wieder loswird.
 * Diese Leiste ist deshalb beides: Quittung („das wurde gewählt") und
 * Not-Aus. Der dauerhafte Schalter sitzt zusätzlich im Bard-Stats-Tab.
 */
const gameStore = useGameStore()

const visible = ref(false)
const shownId = ref('')
let timer: ReturnType<typeof setTimeout> | null = null

const augment = computed(() => AUGMENTS.find((a) => a.id === shownId.value) ?? null)
const rarityColor = computed(() =>
  augment.value ? AUGMENT_RARITY_COLOR[augment.value.rarity] : '#9d9d9d',
)

/* Auf `seq` beobachten, nicht auf die id: zweimal dasselbe Augment
   hintereinander soll die Meldung trotzdem erneut auslösen. */
watch(
  () => gameStore.lastAutoPick.seq,
  (seq) => {
    if (!seq) return
    shownId.value = gameStore.lastAutoPick.id
    visible.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = false
    }, AUTO_PICK_TOAST_MS)
  },
)

function stop() {
  gameStore.setAutoPickAugments(false)
  visible.value = false
  if (timer) clearTimeout(timer)
}

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <Transition name="apt">
    <div v-if="visible && augment" class="apt-root" :style="{ '--rarity': rarityColor }">
      <span class="apt-stage">
        <Icon :icon="augment.icon" width="26" height="26" class="apt-stage__icon" />
      </span>

      <span class="apt-body">
        <span class="apt-head">
          <Icon :icon="AUTO_PICK_ICON" width="11" height="11" />
          Auto-picked
        </span>
        <span class="apt-name">{{ augment.name }}</span>
        <span class="apt-effect">{{ augment.effectLine }}</span>
      </span>

      <button class="apt-stop" title="Turn auto-pick off and choose yourself again" @click="stop">
        Stop
      </button>
    </div>
  </Transition>
</template>

<style scoped>
/* Oben links — spiegelbildlich zum Eventlog rechts, unterhalb des FPS-Zählers. */
.apt-root {
  position: fixed;
  top: 2.6rem;
  left: 0.75rem;
  z-index: 900;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 320px;
  padding: 9px 11px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-left: 3px solid var(--rarity);
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
}

.apt-stage {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--rarity) 55%, #14120c);
  background: radial-gradient(
    circle at 50% 38%,
    color-mix(in srgb, var(--rarity) 18%, #14120c),
    #100e08 74%
  );
}

.apt-stage__icon {
  color: var(--rarity);
}

.apt-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.apt-head {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #6b6047;
}

.apt-name {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.15;
  color: var(--rarity);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.apt-effect {
  font-size: 14px;
  font-weight: 900;
  line-height: 1.15;
  color: #e8c040;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.apt-stop {
  flex-shrink: 0;
  margin-left: 2px;
  padding: 6px 11px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #cc6050;
  background: linear-gradient(to bottom, #3a1010, #260a0a);
  border: 1px solid #8a3020;
  border-radius: 4px;
  cursor: pointer;
  transition:
    color 0.16s ease,
    background 0.16s ease,
    border-color 0.16s ease,
    transform 0.16s ease;
}

.apt-stop:hover {
  color: #ff9080;
  background: linear-gradient(to bottom, #5a1616, #3a0c0c);
  border-color: #cc4830;
  transform: translateY(-1px);
}

.apt-stop:active {
  transform: translateY(0) scale(0.96);
}

/* Nur transform/opacity — die Leiste erscheint über dem laufenden Orbit */
.apt-enter-active,
.apt-leave-active {
  transition:
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s ease;
}
.apt-enter-from,
.apt-leave-to {
  opacity: 0;
  transform: translateX(-14px);
}

@media (min-width: 2400px) {
  .apt-root {
    max-width: 380px;
    padding: 11px 13px;
  }
  .apt-name {
    font-size: 15px;
  }
  .apt-effect {
    font-size: 16px;
  }
  .apt-stage {
    width: 46px;
    height: 46px;
  }
}
</style>
