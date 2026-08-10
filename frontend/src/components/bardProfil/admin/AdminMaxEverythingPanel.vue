<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { maxEverything } from '@/utils/game/maxEverything'
import { useActionToast } from '@/composables/ui/useActionToast'
import { ADMIN_MAX_GALAXY, ADMIN_MAX_UNIVERSE, ADMIN_FIELD_FLASH_MS } from '@/config/constants'

const { showToast } = useActionToast()

/** Kurzes Aufleuchten nach dem Druck — der Vorgang ist synchron und sonst
 *  unsichtbar; ohne Rückmeldung wirkt der Knopf, als hätte er nichts getan. */
const flashing = ref(false)

function onMaxEverything() {
  const result = maxEverything()
  flashing.value = true
  setTimeout(() => {
    flashing.value = false
  }, ADMIN_FIELD_FLASH_MS)
  showToast(
    `${result.champions} champions maxed · ${result.rank} · Galaxy ${result.galaxy}`,
    'unlock',
  )
}
</script>

<template>
  <div class="me-panel">
    <button class="me-btn" :class="{ 'me-btn--flash': flashing }" @click="onMaxEverything">
      <Icon icon="game-icons:overdrive" class="me-icon" width="30" height="30" />
      <span class="me-text">
        <span class="me-title">Max Everything</span>
        <span class="me-sub">
          Every system to its end state — roster, forge, tree, planets, codex, Challenger,
          Universe {{ ADMIN_MAX_UNIVERSE }} · Galaxy {{ ADMIN_MAX_GALAXY }}
        </span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.me-panel {
  flex-shrink: 0;
}

/* Volle Breite statt einer Kachel im 3-Spalten-Raster der Quick Actions: der
   Knopf tut, was alle neun anderen zusammen tun, und soll auch so aussehen. */
.me-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 9px 14px;
  text-align: left;
  font-family: 'MedievalSharp', cursive;
  border-radius: var(--bp-radius);
  border: 1px solid #e8c060;
  background: linear-gradient(to bottom, #c89040, #6b3d10);
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.me-btn:hover {
  background: linear-gradient(to bottom, #e0a850, #824d16);
  border-color: #ffe08a;
}
.me-btn:active {
  background: linear-gradient(to bottom, #b07c34, #5a3208);
}

/* Nur opacity animiert — der Knopf steht im Admin-Tab über der laufenden
   Bühne, und ein Farb- oder Schattenwechsel je Frame rastert die Box neu. */
@keyframes me-flash {
  0% {
    opacity: 0.35;
  }
  100% {
    opacity: 1;
  }
}
.me-btn--flash {
  animation: me-flash 0.28s ease-out forwards;
}

.me-icon {
  flex-shrink: 0;
  color: #fff4d8;
}

.me-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.me-title {
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #fff4d8;
  line-height: 1.1;
}

.me-sub {
  font-size: 0.66rem;
  color: #3a1f06;
  line-height: 1.25;
}
</style>
