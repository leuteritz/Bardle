<template>
  <div class="ec-panel">

    <!-- ── Search Bar ─────────────────────────────────────────── -->
    <div class="ec-search-wrap">
      <span class="ec-search-icon">&#9906;</span>
      <input
        v-model="searchQuery"
        class="ec-search"
        placeholder="Nach Belohnung suchen…"
        autocomplete="off"
        spellcheck="false"
      />
      <button v-if="searchQuery" class="ec-search-clear" @click="searchQuery = ''">✕</button>
    </div>

    <!-- ── Max-limit warning ──────────────────────────────────── -->
    <div v-if="!expeditionStore.canStartExpedition" class="ec-warning">
      ⚠ Maximum erreicht ({{ MAX_ACTIVE_EXPEDITIONS }}) — Sammle aktive Expeditionen ein
    </div>

    <!-- ── No results ─────────────────────────────────────────── -->
    <div v-if="filteredConfigs.length === 0" class="ec-empty">
      Keine Expedition gefunden für „{{ searchQuery }}"
    </div>

    <!-- ── Cards Grid ─────────────────────────────────────────── -->
    <div class="ec-grid">
      <div
        v-for="config in filteredConfigs"
        :key="config.id"
        class="ec-card"
        :class="canQuickstart(config.id) ? 'ec-card--available' : 'ec-card--locked'"
      >
        <!-- Accent bar -->
        <div class="ec-card-accent"></div>

        <!-- Card body -->
        <div class="ec-card-body">
          <!-- Icon -->
          <div class="ec-card-icon-wrap">
            <img
              v-if="!config.icon.includes(':')"
              :src="config.icon"
              :alt="config.name"
              class="ec-card-img"
            />
            <Icon
              v-else
              :icon="config.icon"
              width="36"
              height="36"
              style="color: #c89040"
            />
          </div>

          <!-- Info -->
          <div class="ec-card-info">
            <div class="ec-card-name">{{ config.name }}</div>

            <div class="ec-card-reward">
              <Icon icon="game-icons:coins" width="14" height="14" style="color: #e8c040; flex-shrink: 0" />
              <span class="ec-reward-amount">{{ $formatNumber(config.baseReward) }}</span>
              <span class="ec-reward-label">Chimes</span>
            </div>

            <div class="ec-card-duration">
              <Icon icon="game-icons:sand-clock" width="12" height="12" style="color: rgba(200,144,64,0.55); flex-shrink: 0" />
              <span>{{ formatDuration(config.durationSeconds) }}</span>
            </div>
          </div>
        </div>

        <!-- Quickstart button -->
        <div class="ec-qs-wrap" :title="getTooltipText(config.id)">
          <button
            class="ec-qs-btn"
            :class="canQuickstart(config.id) ? 'ec-qs-btn--active' : 'ec-qs-btn--disabled'"
            :disabled="!canQuickstart(config.id)"
            @click="quickstartExpedition(config.id)"
          >
            <span class="ec-qs-bolt">⚡</span>
            Quickstart
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionStore } from '@/stores/expedetionStore'
import { useBattleStore } from '@/stores/battleStore'
import { EXPEDITION_CONFIGS } from '@/config/expedition'
import { getChampionRoles } from '@/config/championRoles'
import { MAX_ACTIVE_EXPEDITIONS } from '@/config/constants'
import { useActionToast } from '@/composables/useActionToast'
import type { ChampionRole } from '@/types'

export default defineComponent({
  name: 'ExpeditionCreateComponent',
  components: { Icon },
  setup() {
    const expeditionStore = useExpeditionStore()
    const battleStore = useBattleStore()
    const { showToast } = useActionToast()
    const searchQuery = ref('')

    const filteredConfigs = computed(() => {
      const q = searchQuery.value.trim().toLowerCase()
      if (!q) return EXPEDITION_CONFIGS
      return EXPEDITION_CONFIGS.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.baseReward.toString().includes(q),
      )
    })

    function getAvailableForRole(role: ChampionRole, usedChamps: string[]): string[] {
      const onExpedition = expeditionStore.championsOnExpedition
      return battleStore.ownedChampions.filter(
        (c) =>
          c !== 'Bard' &&
          !onExpedition.includes(c) &&
          !usedChamps.includes(c) &&
          getChampionRoles(c).includes(role),
      )
    }

    function canQuickstart(configId: string): boolean {
      if (!expeditionStore.canStartExpedition) return false
      const config = EXPEDITION_CONFIGS.find((e) => e.id === configId)
      if (!config) return false
      const used: string[] = []
      for (const role of config.requiredRoles) {
        const avail = getAvailableForRole(role, used)
        if (!avail.length) return false
        used.push(avail[0])
      }
      return true
    }

    function getTooltipText(configId: string): string {
      const config = EXPEDITION_CONFIGS.find((e) => e.id === configId)
      if (!config) return ''
      if (!expeditionStore.canStartExpedition)
        return `Maximum von ${MAX_ACTIVE_EXPEDITIONS} aktiven Expeditionen erreicht`
      const used: string[] = []
      for (const role of config.requiredRoles) {
        const avail = getAvailableForRole(role, used)
        if (!avail.length) return `Kein ${role}-Champion verfügbar`
        used.push(avail[0])
      }
      return ''
    }

    function quickstartExpedition(configId: string) {
      const config = EXPEDITION_CONFIGS.find((e) => e.id === configId)
      if (!config || !canQuickstart(configId)) return
      const used: string[] = []
      const assigned = config.requiredRoles.map((role) => {
        const avail = getAvailableForRole(role, used)
        const name = avail[0]
        used.push(name)
        return { name, role }
      })
      if (expeditionStore.startExpedition(configId, assigned)) {
        showToast(`⚡ ${config.name} gestartet!`)
      }
    }

    function formatDuration(seconds: number): string {
      const min = Math.floor(seconds / 60)
      const sec = seconds % 60
      if (min === 0) return `${sec}s`
      if (sec === 0) return `${min}m`
      return `${min}m ${sec}s`
    }

    return {
      expeditionStore,
      searchQuery,
      filteredConfigs,
      canQuickstart,
      getTooltipText,
      quickstartExpedition,
      formatDuration,
      MAX_ACTIVE_EXPEDITIONS,
    }
  },
})
</script>

<style scoped>
/* ── Panel ────────────────────────────────────────────────── */
.ec-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

/* ── Search ───────────────────────────────────────────────── */
.ec-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  background: #141410;
  border: 2px solid #5c3310;
  border-radius: 4px;
  overflow: hidden;
}
.ec-search-icon {
  padding: 0 8px;
  font-size: 14px;
  color: rgba(200, 144, 64, 0.4);
  flex-shrink: 0;
  pointer-events: none;
}
.ec-search {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #e8c040;
  font-size: 12px;
  font-weight: 600;
  padding: 9px 4px;
  letter-spacing: 0.03em;
}
.ec-search::placeholder {
  color: rgba(200, 144, 64, 0.3);
}
.ec-search-wrap:focus-within {
  border-color: #c89040;
}
.ec-search-clear {
  background: transparent;
  border: none;
  color: rgba(200, 144, 64, 0.4);
  font-size: 11px;
  padding: 0 10px;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.12s;
}
.ec-search-clear:hover {
  color: #e8c040;
}

/* ── Warning / Empty ──────────────────────────────────────── */
.ec-warning {
  background: #1a0a08;
  border: 1px solid #cc6050;
  border-radius: 4px;
  color: #cc6050;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
}
.ec-empty {
  color: rgba(200, 144, 64, 0.35);
  font-size: 11px;
  text-align: center;
  padding: 20px 0;
}

/* ── Grid ─────────────────────────────────────────────────── */
.ec-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

/* ── Card ─────────────────────────────────────────────────── */
.ec-card {
  display: flex;
  flex-direction: column;
  background: #1a1008;
  border: 2px solid #7a4e20;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px #3e200a;
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.ec-card--available:hover {
  border-color: #c89040;
  box-shadow: inset 0 0 0 1px #3e200a, 0 0 10px rgba(200, 144, 64, 0.12);
}
.ec-card--locked {
  opacity: 0.52;
  filter: grayscale(35%);
  border-color: #5c2a10;
}

/* Gold accent line top */
.ec-card-accent {
  height: 2px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #c89040, #5c3310);
  flex-shrink: 0;
}

/* ── Card body ────────────────────────────────────────────── */
.ec-card-body {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 12px 8px;
  flex: 1;
}
.ec-card-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: #141410;
  border: 1px solid #3e200a;
  border-radius: 4px;
  flex-shrink: 0;
}
.ec-card-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  image-rendering: pixelated;
}
.ec-card-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  min-width: 0;
}
.ec-card-name {
  font-size: 12px;
  font-weight: 900;
  color: #e8c040;
  letter-spacing: 0.04em;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ec-card-reward {
  display: flex;
  align-items: center;
  gap: 4px;
}
.ec-reward-amount {
  font-size: 13px;
  font-weight: 900;
  color: #ffd060;
  letter-spacing: 0.02em;
}
.ec-reward-label {
  font-size: 9px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.5);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.ec-card-duration {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.45);
  letter-spacing: 0.03em;
}

/* ── Quickstart Button ────────────────────────────────────── */
.ec-qs-wrap {
  padding: 0 10px 10px;
}
.ec-qs-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  padding: 7px 0;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: box-shadow 0.18s, background 0.18s;
}
.ec-qs-btn--active {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #fff;
}
.ec-qs-btn--active:hover {
  box-shadow: 0 0 14px rgba(82, 184, 48, 0.55), 0 0 4px rgba(82, 184, 48, 0.3);
}
.ec-qs-btn--active:active {
  transform: scale(0.97);
}
.ec-qs-btn--disabled {
  background: #1c1408;
  border: 1px solid #3e200a;
  color: rgba(200, 144, 64, 0.22);
  cursor: not-allowed;
}
.ec-qs-bolt {
  font-size: 12px;
  line-height: 1;
}
</style>
