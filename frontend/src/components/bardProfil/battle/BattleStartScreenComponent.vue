<template>
  <div class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 start-screen">
    <div class="start-crest">
      <img src="/img/menu/BATTLE.png" class="start-crest-img" alt="Battle" />
    </div>
    <div class="start-title">RANKED QUEUE</div>

    <!-- ── TEAM ROSTER ── -->
    <div class="roster-wrap">
      <div class="roster-header">
        <span class="roster-label">DEIN TEAM</span>
        <div class="roster-progress-bar-wrap">
          <div
            class="roster-progress-bar"
            :style="{ width: `${(teamProgress / 5) * 100}%` }"
            :class="hasFullTeam ? 'bar--full' : 'bar--incomplete'"
          />
        </div>
        <span class="roster-count" :class="hasFullTeam ? 'count--full' : 'count--incomplete'">
          {{ teamProgress }}/5
        </span>
      </div>

      <div class="roster-slots">
        <div
          v-for="(role, idx) in ROLES"
          :key="role.key"
          class="roster-slot"
          :class="battleStore.headerSlots[idx] ? 'slot--filled' : 'slot--empty'"
        >
          <template v-if="battleStore.headerSlots[idx]">
            <img
              :src="battleStore.getChampionImage(battleStore.headerSlots[idx]!)"
              class="slot-champ-img"
              :alt="battleStore.headerSlots[idx]!"
            />
            <span class="slot-champ-name">{{ battleStore.headerSlots[idx] }}</span>
          </template>
          <template v-else>
            <span class="slot-empty-icon">{{ role.icon }}</span>
            <div class="slot-pulse-ring" />
          </template>
          <span
            class="slot-role-badge"
            :class="
              battleStore.headerSlots[idx] ? 'slot-role-badge--filled' : 'slot-role-badge--empty'
            "
          >
            {{ role.label }}
          </span>
        </div>
      </div>

      <Transition name="hint-fade" mode="out-in">
        <p v-if="!hasFullTeam" key="incomplete" class="roster-hint">
          Wähle im Header für jede Rolle einen Champion aus – erst dann öffnet sich die Queue.
        </p>
        <p v-else key="ready" class="roster-hint roster-hint--ready">
          ✓ Dein Team ist vollständig – bereit für die Arena!
        </p>
      </Transition>
    </div>

    <!-- ── START BUTTON ── -->
    <button
      class="start-btn"
      :class="{ 'start-btn--locked': !hasFullTeam }"
      :disabled="isStarting || !hasFullTeam"
      :title="!hasFullTeam ? `Noch ${5 - teamProgress} Rolle(n) offen` : ''"
      @click="$emit('start')"
    >
      <span class="start-btn-icon">
        <template v-if="isStarting">⏳</template>
        <template v-else-if="!hasFullTeam">🔒</template>
        <img v-else src="/img/menu/BATTLE.png" class="start-btn-img" alt="Battle" />
      </span>
      <span v-if="isStarting">WIRD GESTARTET…</span>
      <span v-else-if="!hasFullTeam">
        NOCH {{ 5 - teamProgress }} SLOT{{ 5 - teamProgress !== 1 ? 'S' : '' }} OFFEN
      </span>
      <span v-else>KAMPF STARTEN</span>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore'

const ROLES = [
  { key: 'top', label: 'TOP', icon: '⚔️' },
  { key: 'jungle', label: 'JGL', icon: '🌿' },
  { key: 'mid', label: 'MID', icon: '🎯' },
  { key: 'bot', label: 'BOT', icon: '🏹' },
  { key: 'support', label: 'SUP', icon: '🛡️' },
] as const

export default defineComponent({
  name: 'BattleStartScreenComponent',

  props: {
    isStarting: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['start'],

  setup() {
    const battleStore = useBattleStore()

    const teamProgress = computed(() => battleStore.headerSlots.filter((s) => s !== null).length)
    const hasFullTeam = computed(() => teamProgress.value >= 5)

    return {
      battleStore,
      ROLES,
      teamProgress,
      hasFullTeam,
    }
  },
})
</script>

<style scoped>
/* ═══════════════════════════════════════════
   START SCREEN
   ═══════════════════════════════════════════ */
.start-screen {
  background: #111008;
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.start-crest {
  font-size: 72px;
  filter: drop-shadow(0 0 16px rgba(200, 150, 30, 0.6));
  animation: crestPulse 3s ease-in-out infinite;
}
.start-title {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 6px;
  color: #d4a020;
  text-shadow: 0 0 16px rgba(210, 160, 20, 0.5);
}
.start-crest-img {
  width: 120px;
  height: 120px;
  object-fit: contain;
  filter: drop-shadow(0 0 16px rgba(200, 150, 30, 0.6));
}
.start-btn-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  filter: brightness(1.2);
}

/* ═══════════════════════════════════════════
   TEAM ROSTER
   ═══════════════════════════════════════════ */
.roster-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 14px 20px 16px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid #2a1a06;
  border-radius: 6px;
  min-width: 340px;
}
.roster-header {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.roster-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 2px;
  color: #5a4a2a;
  text-transform: uppercase;
  flex-shrink: 0;
}
.roster-progress-bar-wrap {
  flex: 1;
  height: 3px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 99px;
  overflow: hidden;
}
.roster-progress-bar {
  height: 100%;
  border-radius: 99px;
  transition:
    width 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    background 0.4s;
}
.bar--incomplete {
  background: linear-gradient(to right, #7a3020, #cc6050);
  box-shadow: 0 0 6px rgba(204, 96, 80, 0.5);
}
.bar--full {
  background: linear-gradient(to right, #2a7020, #52b830);
  box-shadow: 0 0 8px rgba(82, 184, 48, 0.6);
}
.roster-count {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  transition:
    color 0.3s,
    text-shadow 0.3s;
}
.count--incomplete {
  color: #cc6050;
  text-shadow: 0 0 8px rgba(204, 96, 80, 0.4);
}
.count--full {
  color: #52b830;
  text-shadow: 0 0 10px rgba(82, 184, 48, 0.6);
}
.roster-slots {
  display: flex;
  gap: 8px;
}
.roster-slot {
  position: relative;
  width: 56px;
  height: 72px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition:
    box-shadow 0.3s,
    border-color 0.3s,
    transform 0.2s;
}
.slot--filled {
  background: linear-gradient(160deg, #192e10, #0e1e08);
  border: 1px solid #4a8a28;
  box-shadow:
    0 0 14px rgba(74, 138, 40, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transform: translateY(0);
}
.slot--filled:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 18px rgba(74, 138, 40, 0.5);
}
.slot--empty {
  background: rgba(16, 10, 4, 0.7);
  border: 1px dashed #3a2010;
}
.slot-champ-img {
  width: 38px;
  height: 38px;
  border-radius: 4px;
  object-fit: cover;
  border: 1px solid rgba(74, 138, 40, 0.4);
}
.slot-champ-name {
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: #6ec040;
  text-align: center;
  max-width: 52px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1;
}
.slot-empty-icon {
  font-size: 20px;
  opacity: 0.3;
  line-height: 1;
}
.slot-role-badge {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1px;
  border-radius: 3px;
  padding: 1px 5px;
  line-height: 1.4;
}
.slot-role-badge--filled {
  color: #6ec040;
  background: rgba(74, 138, 40, 0.2);
  border: 1px solid rgba(74, 138, 40, 0.25);
}
.slot-role-badge--empty {
  color: #4a3a1a;
  background: rgba(40, 20, 8, 0.6);
  border: 1px solid rgba(60, 30, 10, 0.3);
}
.slot-pulse-ring {
  position: absolute;
  inset: -4px;
  border-radius: 9px;
  border: 1px solid rgba(90, 60, 20, 0.25);
  animation: slotPulse 2.4s ease-in-out infinite;
  pointer-events: none;
}
.roster-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.25);
  text-align: center;
  line-height: 1.6;
  max-width: 300px;
  min-height: 18px;
}
.roster-hint--ready {
  color: #52b830;
  text-shadow: 0 0 8px rgba(82, 184, 48, 0.35);
}

/* ═══════════════════════════════════════════
   START BUTTON
   ═══════════════════════════════════════════ */
.start-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 36px;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 2px;
  background: linear-gradient(to bottom, #1e2e12, #131e0c);
  border: 2px solid #4a8a28;
  border-radius: 4px;
  color: #6ec040;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow:
    0 0 16px rgba(74, 138, 40, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
.start-btn:hover:not(:disabled) {
  background: linear-gradient(to bottom, #28401a, #1a2a10);
  border-color: #6ec040;
  color: #8ee060;
  box-shadow:
    0 0 28px rgba(82, 184, 48, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transform: scale(1.04);
}
.start-btn:active:not(:disabled) {
  transform: scale(0.97);
}
.start-btn--locked {
  background: linear-gradient(to bottom, #150e06, #0e0904) !important;
  border-color: #3a2010 !important;
  color: #4a3018 !important;
  cursor: not-allowed !important;
  box-shadow: none !important;
  transform: none !important;
  letter-spacing: 1.5px;
  font-size: 13px;
}
.start-btn--locked:hover {
  transform: none !important;
}
.start-btn-icon {
  font-size: 18px;
  line-height: 1;
}

/* ═══════════════════════════════════════════
   TRANSITIONS
   ═══════════════════════════════════════════ */
.hint-fade-enter-active,
.hint-fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.25s ease;
}
.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}

/* ═══════════════════════════════════════════
   KEYFRAMES
   ═══════════════════════════════════════════ */
@keyframes crestPulse {
  0%,
  100% {
    filter: drop-shadow(0 0 10px rgba(200, 150, 30, 0.4));
    transform: scale(1);
  }
  50% {
    filter: drop-shadow(0 0 22px rgba(210, 160, 20, 0.75));
    transform: scale(1.06);
  }
}
@keyframes slotPulse {
  0%,
  100% {
    opacity: 0.2;
    transform: scale(1);
  }
  50% {
    opacity: 0.65;
    transform: scale(1.07);
  }
}

@media (prefers-reduced-motion: reduce) {
  .start-crest,
  .slot-pulse-ring {
    animation: none !important;
  }
}
</style>
