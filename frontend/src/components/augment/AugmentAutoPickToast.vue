<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/gameStore'
import { AUGMENTS } from '@/config/augments'
import {
  AUGMENT_RARITY_COLOR,
  AUTO_PICK_ICON,
  AUTO_PICK_TOAST_MS,
  AUTO_PICK_TICK_MS,
} from '@/config/constants'

/**
 * Meldung eines automatisch gewählten Augments — oben links in der Ecke.
 *
 * Mit aktivem Auto-Pick öffnet sich das Auswahl-Modal nicht mehr; damit fiele
 * auch der einzige Ort weg, an dem der Spieler die Automatik wieder loswird.
 * Diese Leiste ist deshalb beides: Quittung („das wurde gewählt") und Not-Aus.
 * Weil sie von selbst verschwindet, zeigt sie sichtbar an, wie lange sie noch
 * steht — Balken und Restsekunde, damit niemand den Stop-Knopf verpasst.
 */
const gameStore = useGameStore()

const visible = ref(false)
const shownId = ref('')
const remainingMs = ref(0)
let hideTimer: ReturnType<typeof setTimeout> | null = null
let tick: ReturnType<typeof setInterval> | null = null

const augment = computed(() => AUGMENTS.find((a) => a.id === shownId.value) ?? null)
const rarityColor = computed(() =>
  augment.value ? AUGMENT_RARITY_COLOR[augment.value.rarity] : '#9d9d9d',
)
const remainingLabel = computed(() => `${Math.max(1, Math.ceil(remainingMs.value / 1000))}s`)

function clearTimers() {
  if (hideTimer) clearTimeout(hideTimer)
  if (tick) clearInterval(tick)
  hideTimer = null
  tick = null
}

/* Auf `seq` beobachten, nicht auf die id: zweimal dasselbe Augment
   hintereinander soll die Meldung trotzdem erneut auslösen. */
watch(
  () => gameStore.lastAutoPick.seq,
  (seq) => {
    if (!seq) return
    shownId.value = gameStore.lastAutoPick.id
    visible.value = true
    clearTimers()

    const expiresAt = Date.now() + AUTO_PICK_TOAST_MS
    remainingMs.value = AUTO_PICK_TOAST_MS
    tick = setInterval(() => {
      remainingMs.value = Math.max(0, expiresAt - Date.now())
    }, AUTO_PICK_TICK_MS)

    hideTimer = setTimeout(() => {
      visible.value = false
      clearTimers()
    }, AUTO_PICK_TOAST_MS)
  },
)

function stop() {
  gameStore.setAutoPickAugments(false)
  visible.value = false
  clearTimers()
}

onUnmounted(clearTimers)
</script>

<template>
  <Transition name="apt">
    <div
      v-if="visible && augment"
      class="apt-root"
      :style="{ '--rarity': rarityColor, '--apt-duration': `${AUTO_PICK_TOAST_MS}ms` }"
    >
      <div class="apt-head">
        <Icon :icon="AUTO_PICK_ICON" width="13" height="13" class="apt-head__icon" />
        <span class="apt-head__lbl">Auto-picked</span>
        <span class="apt-head__time" :title="`This message closes in ${remainingLabel}`">
          {{ remainingLabel }}
        </span>
      </div>

      <div class="apt-main">
        <span class="apt-stage">
          <Icon :icon="augment.icon" class="apt-stage__icon" width="30" height="30" />
        </span>
        <span class="apt-body">
          <span class="apt-name">{{ augment.name }}</span>
          <span class="apt-effect">{{ augment.effectLine }}</span>
        </span>
      </div>

      <button class="apt-stop" title="Turn auto-pick off and choose yourself again" @click="stop">
        Stop auto-pick
      </button>

      <!-- Ablaufanzeige: reine scaleX-Animation, kostet den Compositor nichts.
           Der :key startet sie bei jeder neuen Meldung von vorn. -->
      <span class="apt-bar">
        <span :key="gameStore.lastAutoPick.seq" class="apt-bar__fill"></span>
      </span>
    </div>
  </Transition>
</template>

<style scoped>
/* Ganz oben links in der Ecke. Die Breite folgt dem freien Raum neben dem
   zentrierten Header (--header-vp-left wird dort per ResizeObserver gepflegt),
   sodass die Leiste auf 4K mitwächst, auf Full HD aber nie unter den Header
   läuft. */
.apt-root {
  position: fixed;
  top: 0.5rem;
  left: 0.75rem;
  z-index: 900;
  width: clamp(232px, calc(var(--header-vp-left, 22vw) - 1.5rem), 460px);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px 12px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-left: 3px solid var(--rarity);
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  overflow: hidden;
}

/* ── Kopfzeile ───────────────────────────────────────────────────── */
.apt-head {
  display: flex;
  align-items: center;
  gap: 5px;
}

.apt-head__icon {
  flex-shrink: 0;
  color: #8a7a52;
}

.apt-head__lbl {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8a7a52;
}

/* Restzeit als Zahl — der Balken zeigt den Verlauf, die Ziffer den Rest */
.apt-head__time {
  margin-left: auto;
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 900;
  line-height: 1.35;
  color: #6b6047;
  background: #100e08;
  border: 1px solid #3a2c14;
  border-radius: 3px;
  font-variant-numeric: tabular-nums;
}

/* ── Augment ─────────────────────────────────────────────────────── */
.apt-main {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.apt-stage {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--rarity) 55%, #14120c);
  background: radial-gradient(
    circle at 50% 38%,
    color-mix(in srgb, var(--rarity) 20%, #14120c),
    #100e08 74%
  );
}

.apt-stage__icon {
  color: var(--rarity);
}

.apt-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.apt-name {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.15;
  color: var(--rarity);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.apt-effect {
  font-size: 17px;
  font-weight: 900;
  line-height: 1.15;
  color: #e8c040;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Not-Aus ─────────────────────────────────────────────────────── */
.apt-stop {
  width: 100%;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
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
  transform: translateY(0) scale(0.98);
}

/* ── Ablaufbalken ────────────────────────────────────────────────── */
.apt-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: #241a0c;
}

.apt-bar__fill {
  display: block;
  height: 100%;
  background: var(--rarity);
  transform-origin: left center;
  animation: apt-countdown linear forwards;
  animation-duration: var(--apt-duration);
}

@keyframes apt-countdown {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

/* ── Auftritt ────────────────────────────────────────────────────── */
.apt-enter-active,
.apt-leave-active {
  transition:
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s ease;
}
.apt-enter-from,
.apt-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

/* ── Auflösungsstufen ────────────────────────────────────────────── */
/* Full HD ist der flachste Viewport — hier bleibt die Leiste kompakt. */
@media (max-height: 1100px) {
  .apt-root {
    gap: 7px;
    padding: 9px 11px 11px;
  }
  .apt-stage {
    width: 44px;
    height: 44px;
  }
}

@media (min-width: 2400px) {
  .apt-root {
    top: 0.7rem;
    left: 1rem;
    gap: 10px;
    padding: 13px 15px 15px;
    /* Obergrenze mitziehen, sonst bleibt die Leiste auf der großen Fläche
       stehen, während ihre Schrift wächst — und wirkt gedrängt statt größer. */
    width: clamp(232px, calc(var(--header-vp-left, 22vw) - 2rem), 580px);
  }
  .apt-head__lbl {
    font-size: 12px;
  }
  .apt-head__time {
    font-size: 13px;
  }
  .apt-stage {
    width: 58px;
    height: 58px;
  }
  .apt-stage__icon {
    width: 36px;
    height: 36px;
  }
  .apt-name {
    font-size: 17px;
  }
  .apt-effect {
    font-size: 20px;
  }
  .apt-stop {
    font-size: 13.5px;
    padding: 9px 12px;
  }
  .apt-bar {
    height: 4px;
  }
}

@media (min-width: 3400px) {
  .apt-root {
    width: clamp(232px, calc(var(--header-vp-left, 22vw) - 2rem), 700px);
  }
  .apt-head__lbl {
    font-size: 13.5px;
  }
  .apt-head__time {
    font-size: 15px;
  }
  .apt-stage {
    width: 68px;
    height: 68px;
  }
  .apt-stage__icon {
    width: 42px;
    height: 42px;
  }
  .apt-name {
    font-size: 20px;
  }
  .apt-effect {
    font-size: 23px;
  }
  .apt-stop {
    font-size: 15px;
    padding: 11px 14px;
  }
  .apt-bar {
    height: 5px;
  }
}
</style>
