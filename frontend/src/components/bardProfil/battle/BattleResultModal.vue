<template>
  <Teleport to="body">
    <div
      v-if="battleStore.battlePhase === 'result' && battleStore.showAutoBattleResult"
      class="fixed inset-0 z-[9999] flex items-center justify-center rpg-overlay"
    >
      <div
        class="relative w-full max-w-sm p-6 mx-4 text-center result-modal rpg-frame"
        :class="lastResult.won ? 'result-modal--win' : 'result-modal--loss'"
      >
        <div class="mb-4 rpg-accent-bar" />
        <div class="mb-2 text-5xl">{{ lastResult.won ? '🏆' : '💀' }}</div>
        <div
          class="mb-3 text-3xl font-black tracking-widest"
          :class="lastResult.won ? 'result-text--win' : 'result-text--loss'"
        >
          {{ lastResult.won ? 'VICTORY!' : 'DEFEAT!' }}
        </div>

        <div
          class="lp-badge inline-flex items-center gap-1 px-4 py-1.5 text-sm font-black mb-4"
          :class="lpChange >= 0 ? 'lp-badge--pos' : 'lp-badge--neg'"
        >
          {{ lpChange >= 0 ? '+' : '' }}{{ lpChange }} LP
        </div>

        <!-- ══ HONOR SECTION ══ -->
        <div class="honor-section">
          <!-- Header -->
          <div class="honor-header">
            <span class="honor-shield">⚜️</span>
            <span class="honor-title">HONOR VERGEBEN</span>
            <div class="honor-pips">
              <span
                v-for="n in 3"
                :key="n"
                class="honor-pip"
                :class="{ 'honor-pip--filled': n <= honoredPlayers.size }"
              />
            </div>
          </div>

          <!-- Allies (Bard selbst wird ausgeblendet) -->
          <div class="honor-group">
            <div class="honor-group-label honor-group-label--ally">TEAM</div>
            <div class="honor-cards">
              <button
                v-for="(player, i) in honorAllies"
                :key="`ally-${i}`"
                class="honor-card honor-card--ally"
                :class="{
                  'honor-card--selected': honoredPlayers.has(`ally-${i}`),
                  'honor-card--locked':
                    !honoredPlayers.has(`ally-${i}`) && honoredPlayers.size >= 3,
                }"
                @click="toggleHonor(`ally-${i}`)"
              >
                <div class="honor-portrait-wrap">
                  <img
                    :src="battleStore.getChampionImage(player.name)"
                    :alt="player.name"
                    class="honor-portrait-img"
                    @error="($event.target as HTMLImageElement).style.display = 'none'"
                  />
                  <span v-if="honoredPlayers.has(`ally-${i}`)" class="honor-check">✓</span>
                </div>
                <span class="honor-card-name">{{ player.name }}</span>
              </button>
            </div>
          </div>

          <!-- Enemies -->
          <div class="honor-group">
            <div class="honor-group-label honor-group-label--enemy">GEGNER</div>
            <div class="honor-cards">
              <button
                v-for="(player, i) in honorEnemies"
                :key="`enemy-${i}`"
                class="honor-card honor-card--enemy"
                :class="{
                  'honor-card--selected': honoredPlayers.has(`enemy-${i}`),
                  'honor-card--locked':
                    !honoredPlayers.has(`enemy-${i}`) && honoredPlayers.size >= 3,
                }"
                @click="toggleHonor(`enemy-${i}`)"
              >
                <div class="honor-portrait-wrap">
                  <img
                    :src="battleStore.getChampionImage(player.name)"
                    :alt="player.name"
                    class="honor-portrait-img"
                    @error="($event.target as HTMLImageElement).style.display = 'none'"
                  />
                  <span v-if="honoredPlayers.has(`enemy-${i}`)" class="honor-check">✓</span>
                </div>
                <span class="honor-card-name">{{ player.name }}</span>
              </button>
            </div>
          </div>
        </div>
        <!-- ══ END HONOR SECTION ══ -->

        <div class="flex items-center justify-center gap-3 mt-4">
          <button
            @click="battleStore.manualDismissResult()"
            class="px-5 py-2 text-sm font-black result-btn"
          >
            Weiter →
          </button>
          <button
            @click="battleStore.toggleAutoSkip()"
            class="px-4 py-2 text-sm font-black result-btn"
            :class="battleStore.autoSkipEnabled ? 'result-btn--active' : ''"
          >
            {{ battleStore.autoSkipEnabled ? '⏭️ Auto-Skip AN' : '⏸️ Auto-Skip AUS' }}
            <span
              v-if="battleStore.autoSkipEnabled && battleStore.resultCountdown > 0"
              class="ml-1 text-xs opacity-70"
            >
              ({{ battleStore.resultCountdown }}s)
            </span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue'
import { useBattleStore } from '@/stores/battleStore'

export default defineComponent({
  name: 'BattleResultModal',

  setup() {
    const battleStore = useBattleStore()

    const lastResult = computed(() => battleStore.lastAutoBattleResult ?? { won: false })
    const lpChange = computed(() => battleStore.lastLpChange ?? 0)

    // ── Honor state ───────────────────────────────────────────────────────────

    const honoredPlayers = ref<Set<string>>(new Set())

    // Bard selbst (Index 0 in team1) aus der Auswahl herausnehmen
    const honorAllies = computed(() => battleStore.team1.slice(1))
    const honorEnemies = computed(() => battleStore.team2)

    const toggleHonor = (id: string) => {
      const next = new Set(honoredPlayers.value)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 3) {
        next.add(id)
      }
      honoredPlayers.value = next
    }

    // Honor-Auswahl bei jedem neuen Result zurücksetzen
    watch(
      () => battleStore.showAutoBattleResult,
      (shown) => {
        if (shown) honoredPlayers.value = new Set()
      },
    )

    return {
      battleStore,
      lastResult,
      lpChange,
      honoredPlayers,
      honorAllies,
      honorEnemies,
      toggleHonor,
    }
  },
})
</script>

<style scoped>
/* ═══════════════════════════════════════════
   RESULT MODAL
   ═══════════════════════════════════════════ */
.result-modal--win {
  box-shadow:
    inset 0 0 0 2px var(--rpg-wood-inner),
    inset 0 0 0 4px var(--rpg-wood-mid),
    0 0 30px #52b8304d;
}
.result-modal--loss {
  box-shadow:
    inset 0 0 0 2px var(--rpg-wood-inner),
    inset 0 0 0 4px var(--rpg-wood-mid),
    0 0 30px #cc60504d;
}
.result-text--win {
  color: var(--rpg-green-top);
  text-shadow: 0 0 12px #52b83066;
}
.result-text--loss {
  color: var(--rpg-red);
  text-shadow: 0 0 12px #cc605066;
}

.lp-badge {
  border-radius: 4px;
  border: 1px solid;
}
.lp-badge--pos {
  background: #52b83026;
  border-color: #52b8304d;
  color: var(--rpg-green-top);
}
.lp-badge--neg {
  background: #cc605026;
  border-color: #cc60504d;
  color: var(--rpg-red);
}

.result-btn {
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
  color: var(--rpg-text-muted);
  cursor: pointer;
  transition: all 0.2s;
}
.result-btn:hover {
  background: var(--rpg-bg-hover);
  border-color: var(--rpg-wood-mid);
  color: #fff;
  transform: scale(1.03);
}
.result-btn:active {
  transform: scale(0.96);
}
.result-btn--active {
  background: #a87ed826;
  border-color: #a87ed859;
  color: #c4a0ee;
}

/* ═══════════════════════════════════════════
   HONOR SECTION
   ═══════════════════════════════════════════ */
.honor-section {
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(200, 160, 60, 0.15);
  border-radius: 4px;
  padding: 10px 8px 8px;
  margin-bottom: 8px;
}

.honor-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 10px;
}
.honor-shield {
  font-size: 13px;
  line-height: 1;
}
.honor-title {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: #e8c040;
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.4);
}
.honor-pips {
  display: flex;
  align-items: center;
  gap: 4px;
}
.honor-pip {
  width: 8px;
  height: 8px;
  transform: rotate(45deg);
  background: #1c1c18;
  border: 1px solid #5c3310;
  transition:
    background 0.2s,
    box-shadow 0.2s;
}
.honor-pip--filled {
  background: #e8c040;
  border-color: #e8c040;
  box-shadow: 0 0 6px rgba(232, 192, 64, 0.7);
}

.honor-group {
  margin-bottom: 8px;
}
.honor-group:last-child {
  margin-bottom: 0;
}
.honor-group-label {
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-align: center;
  margin-bottom: 5px;
}
.honor-group-label--ally {
  color: #52b830;
}
.honor-group-label--enemy {
  color: #cc6050;
}

.honor-cards {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.honor-card {
  position: relative;
  width: 52px;
  background: #111008;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.15s,
    box-shadow 0.15s,
    border-color 0.15s,
    opacity 0.15s,
    filter 0.15s;
}
.honor-card--ally {
  border-color: rgba(82, 184, 48, 0.25);
}
.honor-card--enemy {
  border-color: rgba(204, 96, 80, 0.25);
}
.honor-card:hover:not(.honor-card--locked) {
  transform: scale(1.06);
  z-index: 2;
}
.honor-card--ally:hover:not(.honor-card--locked) {
  border-color: rgba(82, 184, 48, 0.7);
  box-shadow: 0 0 10px rgba(82, 184, 48, 0.35);
}
.honor-card--enemy:hover:not(.honor-card--locked) {
  border-color: rgba(204, 96, 80, 0.7);
  box-shadow: 0 0 10px rgba(204, 96, 80, 0.35);
}
.honor-card--selected {
  border-color: #e8c040 !important;
  box-shadow: 0 0 12px rgba(232, 192, 64, 0.6) !important;
}
.honor-card--locked {
  filter: grayscale(0.65);
  opacity: 0.45;
  cursor: not-allowed;
}

.honor-card--selected::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 40%;
  height: 100%;
  background: linear-gradient(to right, transparent, rgba(255, 220, 100, 0.22), transparent);
  animation: honor-shimmer 1.8s ease-in-out infinite;
  pointer-events: none;
}
@keyframes honor-shimmer {
  0% {
    transform: translateX(-150%);
  }
  100% {
    transform: translateX(350%);
  }
}

.honor-portrait-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
}
.honor-portrait-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
}

.honor-check {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.48);
  color: #e8c040;
  font-size: 18px;
  font-weight: 900;
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.9);
}

.honor-card-name {
  display: block;
  font-size: 7px;
  font-weight: 700;
  color: #b0b0a0;
  text-align: center;
  padding: 3px 2px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}
.honor-card--selected .honor-card-name {
  color: #e8c040;
}
</style>
