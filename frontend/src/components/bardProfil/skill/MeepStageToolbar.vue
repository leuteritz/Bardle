<script setup lang="ts">
/**
 * Kopfleiste über der Orbit-Bühne: Suche links, Meep-Bestand rechts, die
 * Admin-Knöpfe daneben. Sie hat keinen eigenen Zustand — Suchtext und
 * Zweigfokus gehören dem Tab-Root, weil die Bühne sie gleichermassen liest.
 */
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { MEEP_TREE_BADGE_ICON, MEEP_TREE_PATH_NODES } from '@/config/progression/meepTree'
import { formatNumberCompact } from '@/config/ui/numberFormat'

defineProps<{ query: string; focusBranch: string | null }>()

const emit = defineEmits<{
  'update:query': [value: string]
  'update:focusBranch': [value: string | null]
}>()

const gameStore = useGameStore()
const meepTree = useMeepTreeStore()

function clearFilters(): void {
  emit('update:query', '')
  emit('update:focusBranch', null)
}
</script>

<template>
  <div class="mst-bar">
    <label class="mst-search">
      <Icon icon="lucide:search" width="15" height="15" class="mst-search__icon" />
      <input
        :value="query"
        type="text"
        placeholder="Search skills…"
        class="mst-search__input"
        @input="emit('update:query', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <button v-if="query || focusBranch" class="mst-clear" title="Clear filters" @click="clearFilters">
      <Icon icon="lucide:x" width="14" height="14" />
      {{ focusBranch ? `${focusBranch} only` : 'Filtered' }}
    </button>

    <span class="mst-spacer" />

    <span class="mst-progress">{{ meepTree.boughtCount }} / {{ MEEP_TREE_PATH_NODES }} learned</span>

    <span class="mst-meeps">
      <img :src="MEEP_TREE_BADGE_ICON" alt="Meeps" class="mst-meeps__icon" />
      <span v-ink-center>{{ formatNumberCompact(gameStore.meeps) }}</span>
    </span>

    <span class="mst-admin-tag" v-ink-center>Admin</span>
    <button
      class="mst-admin-btn mst-admin-btn--unlock"
      title="Learn every skill for free"
      @click="meepTree.adminUnlockAll()"
    >
      <Icon icon="lucide:unlock" width="15" height="15" />
    </button>
    <button
      class="mst-admin-btn mst-admin-btn--reset"
      title="Unlearn every skill"
      @click="meepTree.adminResetAll()"
    >
      <Icon icon="lucide:rotate-ccw" width="15" height="15" />
    </button>
  </div>
</template>

<style scoped>
.mst-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: var(--rpg-bg-icon);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: var(--bp-radius);
}

.mst-spacer {
  flex: 1;
}

/* ── Suche ────────────────────────────────────────────────── */
.mst-search {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border-radius: var(--bp-radius);
  border: 1px solid var(--rpg-border-row);
  background: var(--rpg-bg-deep);
}

.mst-search__icon {
  flex-shrink: 0;
  color: var(--rpg-text-muted);
}

.mst-search__input {
  width: 168px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--rpg-text);
  font-size: 0.8rem;
}

.mst-search__input::placeholder {
  color: var(--rpg-text-muted);
}

.mst-clear {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: var(--bp-radius);
  border: 1px solid var(--rpg-wood-mid);
  background: transparent;
  color: var(--rpg-gold);
  font-size: 0.73rem;
  font-weight: 600;
  text-transform: capitalize;
  cursor: pointer;
  transition: background 0.15s;
}

.mst-clear:hover {
  background: var(--rpg-bg-hover);
}

/* ── Bestand ──────────────────────────────────────────────── */
.mst-progress {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--rpg-text-muted);
}

.mst-meeps {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 11px;
  border-radius: 999px;
  border: 1px solid var(--rpg-wood-mid);
  background: var(--rpg-bg-deep);
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--rpg-gold);
}

.mst-meeps__icon {
  height: 19px;
  width: auto;
}

/* ── Admin ────────────────────────────────────────────────── */
.mst-admin-tag {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
  padding-left: 6px;
  border-left: 1px solid var(--rpg-border-row);
}

.mst-admin-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--bp-radius);
  border: 1px solid var(--rpg-wood-mid);
  background: transparent;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.mst-admin-btn--unlock {
  color: #7ad84a;
  border-color: #2e5a1a;
}
.mst-admin-btn--unlock:hover {
  background: #13220c;
  border-color: #52b830;
}

.mst-admin-btn--reset {
  color: #cc6050;
  border-color: #5a221a;
}
.mst-admin-btn--reset:hover {
  background: #220f0c;
  border-color: #cc6050;
}
</style>
