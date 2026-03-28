<template>
  <div class="flex flex-col w-full p-4 space-y-4">
    <!-- ─── Bard Leader Card ─── -->
    <div class="bard-leader-card relative overflow-hidden">
      <div class="flex items-center gap-4 p-4">
        <!-- Bard Icon -->
        <div class="champion-icon-box relative flex items-center justify-center flex-shrink-0 w-16 h-16">
          <img
            src="/img/BardAbilities/Bard.png"
            alt="Bard"
            class="rpg-img relative z-10 object-cover w-10 h-10 rounded-full"
          />
          <!-- Crown -->
          <span class="absolute text-sm -translate-x-1/2 -top-3 left-1/2">👑</span>
        </div>

        <div class="flex-1 min-w-0">
          <h3 class="bard-name mb-1 text-sm font-black tracking-wide">Bard</h3>
          <div class="flex flex-wrap gap-1.5">
            <span class="rpg-badge rpg-badge--gold text-xs font-black tracking-wider">
              👑 Team Leader
            </span>
            <span class="rpg-badge rpg-badge--muted text-xs font-black tracking-wider">
              Permanent
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Team Slots ─── -->
    <div class="team-slots-panel p-3">
      <div class="flex items-center justify-between mb-3">
        <span class="section-label text-xs font-bold tracking-widest uppercase">Team-Aufstellung</span>
        <span class="count-badge px-2 py-0.5 text-xs font-black tracking-wider">
          {{ battleStore.selectedChampions.length }}/4
        </span>
      </div>

      <div class="grid grid-cols-4 gap-2">
        <div
          v-for="(assignment, index) in battleStore.teamSlotAssignments"
          :key="'slot-' + index"
          class="relative cursor-pointer"
          @click="openSlotIndex = index"
        >
          <!-- Filled Slot -->
          <div
            v-if="assignment"
            class="slot-filled relative overflow-hidden"
          >
            <div class="flex flex-col items-center gap-1 p-2">
              <span class="slot-index-badge px-1.5 py-0.5 text-[10px] font-black">
                #{{ index + 1 }}
              </span>
              <img
                :src="battleStore.getChampionImage(assignment)"
                :alt="assignment"
                class="rpg-img w-10 h-10 rounded-full object-cover"
                @error="onImgError"
              />
              <span class="slot-champion-name text-[11px] font-black text-center leading-tight">
                {{ truncate(assignment, 7) }}
              </span>
              <button
                @click.stop="battleStore.removeFromSlot(index)"
                class="slot-remove-btn w-full px-1 py-0.5 text-[10px] font-black"
              >
                ✕ Remove
              </button>
            </div>
          </div>

          <!-- Empty Slot -->
          <div
            v-else
            class="slot-empty flex flex-col items-center justify-center gap-1 p-2"
          >
            <span class="slot-empty-icon text-xl">+</span>
            <span class="slot-empty-label text-[10px] font-bold">#{{ index + 1 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Available Champions ─── -->
    <div class="available-header flex items-center justify-between px-3 py-2">
      <span class="section-label text-xs font-bold tracking-widest uppercase">Verfügbar</span>
      <span class="count-badge px-2 py-0.5 text-xs font-black tracking-wider">
        {{ selectableChampions.length }} Champions
      </span>
    </div>

    <div class="space-y-3">
      <!-- No Champions State -->
      <div
        v-if="selectableChampions.length === 0"
        class="no-champions-state flex flex-col items-center justify-center gap-3 p-8"
      >
        <span class="text-3xl">🛒</span>
        <h4 class="no-champions-title text-sm font-black tracking-wide">
          Keine Champions verfügbar
        </h4>
        <p class="no-champions-hint text-xs">Besuche den Shop, um mehr Champions zu kaufen!</p>
      </div>

      <!-- Champion Cards -->
      <div
        v-for="champion in selectableChampions"
        :key="champion"
        @click="addChampion(champion)"
        class="champion-card relative overflow-hidden cursor-pointer"
        :class="battleStore.selectedChampions.length >= 4 ? 'champion-card--full' : ''"
      >
        <div class="flex items-center gap-4 p-4 pr-3">
          <!-- Icon -->
          <div class="champion-icon-box relative flex items-center justify-center flex-shrink-0 w-16 h-16 overflow-hidden">
            <img
              :src="battleStore.getChampionImage(champion)"
              :alt="champion"
              class="rpg-img relative z-10 w-12 h-12 rounded-full object-cover"
              @error="onImgError"
            />
          </div>

          <!-- Name & Info -->
          <div class="flex-1 min-w-0">
            <h3 class="champion-name mb-1.5 text-sm font-black leading-tight tracking-wide">
              {{ champion }}
            </h3>
            <div class="flex flex-wrap gap-1.5">
              <span class="rpg-badge rpg-badge--green text-xs font-bold">Bereit</span>
            </div>
          </div>

          <!-- Add Button -->
          <div class="flex-shrink-0 w-20 ml-1">
            <button
              class="w-full px-2 py-2.5 text-xs font-black"
              :class="battleStore.selectedChampions.length < 4 ? 'rpg-btn-green' : 'rpg-btn-disabled'"
              :disabled="battleStore.selectedChampions.length >= 4"
            >
              + Add
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Champion Slot Modal -->
  <ChampionSlotModal
    :show="openSlotIndex !== null"
    :slotIndex="openSlotIndex ?? 0"
    @close="openSlotIndex = null"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBattleStore } from '../../../stores/battleStore'
import { useMissionStore } from '../../../stores/missionStore'
import { truncate } from '../../../config/numberFormat'
import ChampionSlotModal from '../../ChampionSlotModal.vue'

const battleStore = useBattleStore()
const missionStore = useMissionStore()

const openSlotIndex = ref<number | null>(null)

const selectableChampions = computed(() => {
  const onMission = missionStore.championsOnMission
  return battleStore.ownedChampions.filter(
    (c) => c !== 'Bard' && !battleStore.selectedChampions.includes(c) && !onMission.includes(c),
  )
})

function addChampion(champion: string) {
  if (battleStore.selectedChampions.length < 4) {
    const emptySlot = battleStore.teamSlotAssignments.indexOf(null)
    if (emptySlot !== -1) {
      battleStore.assignToSlot(emptySlot, champion)
    }
  }
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}
</script>

<style scoped>
/* ── Bard Leader Card ── */
.bard-leader-card {
  background: var(--rpg-bg-dark);
  border: 2px solid var(--rpg-wood-mid);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

/* ── Bard name ── */
.bard-name {
  color: var(--rpg-gold);
}

/* ── Champion icon container ── */
.champion-icon-box {
  background: var(--rpg-bg-icon);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
}

/* ── Badges ── */
.rpg-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
}
.rpg-badge--gold {
  background: rgba(184, 140, 20, 0.2);
  border: 1px solid rgba(232, 192, 64, 0.4);
  color: var(--rpg-gold);
}
.rpg-badge--muted {
  background: rgba(100, 80, 40, 0.2);
  border: 1px solid rgba(92, 51, 16, 0.6);
  color: var(--rpg-text-muted);
}
.rpg-badge--green {
  background: rgba(46, 122, 26, 0.3);
  border: 1px solid rgba(110, 192, 64, 0.4);
  color: #7edc50;
}

/* ── Team Slots Panel ── */
.team-slots-panel {
  background: var(--rpg-bg-deep);
  border: 2px solid var(--rpg-wood-mid);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

/* ── Section label ── */
.section-label {
  color: var(--rpg-text-muted);
}

/* ── Count badge ── */
.count-badge {
  background: rgba(92, 51, 16, 0.4);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
  color: var(--rpg-gold);
}

/* ── Filled slot ── */
.slot-filled {
  background: var(--rpg-bg-row);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
  transition: border-color 0.2s;
}
.slot-filled:hover {
  border-color: var(--rpg-gold-dim);
}

/* ── Slot index badge ── */
.slot-index-badge {
  background: rgba(92, 51, 16, 0.4);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
  color: var(--rpg-gold);
}

/* ── Slot champion name ── */
.slot-champion-name {
  color: var(--rpg-gold);
}

/* ── Remove button ── */
.slot-remove-btn {
  background: rgba(180, 50, 40, 0.2);
  border: 1px solid rgba(204, 96, 80, 0.5);
  border-radius: 4px;
  color: #e07060;
  cursor: pointer;
  transition: background 0.15s;
}
.slot-remove-btn:hover {
  background: rgba(204, 96, 80, 0.35);
}

/* ── Empty slot ── */
.slot-empty {
  min-height: 80px;
  background: rgba(255, 255, 255, 0.01);
  border: 2px dashed rgba(92, 51, 16, 0.5);
  border-radius: 4px;
  transition: border-color 0.2s, background 0.2s;
}
.slot-empty:hover {
  border-color: var(--rpg-wood-mid);
  background: rgba(92, 51, 16, 0.08);
}
.slot-empty-icon {
  color: rgba(255, 255, 255, 0.2);
  transition: color 0.2s;
}
.slot-empty:hover .slot-empty-icon {
  color: var(--rpg-gold-dim);
}
.slot-empty-label {
  color: rgba(255, 255, 255, 0.2);
  transition: color 0.2s;
}
.slot-empty:hover .slot-empty-label {
  color: var(--rpg-text-muted);
}

/* ── Available header ── */
.available-header {
  background: var(--rpg-bg-deep);
  border: 2px solid var(--rpg-wood-mid);
  border-radius: 4px;
}

/* ── No champions state ── */
.no-champions-state {
  background: var(--rpg-bg-dark);
  border: 2px solid var(--rpg-wood-mid);
  border-radius: 4px;
}
.no-champions-title {
  color: var(--rpg-gold);
}
.no-champions-hint {
  color: var(--rpg-text-muted);
}

/* ── Champion card ── */
.champion-card {
  background: var(--rpg-bg-row);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.champion-card:hover {
  border-color: var(--rpg-gold-dim);
  box-shadow: 0 0 10px rgba(200, 144, 64, 0.2);
}
.champion-card--full {
  opacity: 0.55;
  filter: grayscale(55%);
  cursor: not-allowed;
  pointer-events: none;
}

/* ── Champion name ── */
.champion-name {
  color: var(--rpg-gold);
}
</style>
