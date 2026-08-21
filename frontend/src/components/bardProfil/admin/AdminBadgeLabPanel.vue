<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { useNotifyBadgeRows } from '@/composables/ui/useNotifyBadges'
import { useHerald } from '@/composables/ui/useHerald'
import {
  clearAllBadges,
  clearBadge,
  seedAllBadges,
  seedBadge,
  summarizeSeed,
} from '@/utils/game/badgeSeed'
import {
  ADMIN_FIELD_FLASH_MS,
  BADGE_LAB_DEFAULT_COUNT,
  BADGE_LAB_ICON,
  BADGE_LAB_MAX_COUNT,
  BADGE_LAB_MIN_COUNT,
} from '@/config/constants'
import type { NotifyBadgeKind } from '@/types'
import AdminCollapsiblePanel from './AdminCollapsiblePanel.vue'

const { announceReceipt } = useHerald()
const rows = useNotifyBadgeRows()
const count = ref(BADGE_LAB_DEFAULT_COUNT)
const flashing = ref(false)
let flashTimer: ReturnType<typeof setTimeout> | null = null

const litCount = computed(() => rows.value.filter((r) => r.count > 0).length)
const badgeRows = computed(() => rows.value.filter((r) => r.def.hasBadge))

function stepCount(delta: number): void {
  count.value = Math.min(BADGE_LAB_MAX_COUNT, Math.max(BADGE_LAB_MIN_COUNT, count.value + delta))
}

function onCountInput(raw: string): void {
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed)) return
  count.value = Math.min(BADGE_LAB_MAX_COUNT, Math.max(BADGE_LAB_MIN_COUNT, parsed))
}

/** Nur `opacity` — ein Farbwechsel je Frame rastert die Box über der laufenden
 *  Bühne neu. Dasselbe Muster wie in AdminMaxEverythingPanel. */
function flash(): void {
  flashing.value = true
  if (flashTimer !== null) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashing.value = false
    flashTimer = null
  }, ADMIN_FIELD_FLASH_MS)
}

onBeforeUnmount(() => {
  if (flashTimer !== null) clearTimeout(flashTimer)
})

function fillOne(kind: NotifyBadgeKind): void {
  const result = seedBadge(kind, count.value)
  flash()
  announceReceipt({
    kind: 'unlock',
    eyebrow: 'ADMIN',
    headline: 'Badge Lab',
    subline: summarizeSeed([result]),
  })
}

function clearOne(kind: NotifyBadgeKind): void {
  clearBadge(kind)
  flash()
}

function fillAll(): void {
  const results = seedAllBadges(count.value)
  flash()
  announceReceipt({
    kind: 'unlock',
    eyebrow: 'ADMIN',
    headline: 'Badge Lab',
    subline: summarizeSeed(results),
  })
}

function clearAll(): void {
  clearAllBadges()
  flash()
}
</script>

<template>
  <!-- Weder `collapsible` noch `fill`: das Panel trägt seine Inhaltshöhe und
       überlässt der Spalte das Rollen. -->
  <AdminCollapsiblePanel title="Badge Lab" :icon="BADGE_LAB_ICON" :collapsible="false">
    <template #meta> {{ litCount }} of {{ badgeRows.length }} lit </template>

    <div class="bl-body" :class="{ 'bl-body--flash': flashing }">
      <div class="bl-head">
        <span class="bl-head-label">Count</span>
        <div class="admin-stepper">
          <button
            class="admin-stepper-btn"
            :disabled="count <= BADGE_LAB_MIN_COUNT"
            tabindex="-1"
            @click="stepCount(-1)"
          >
            −
          </button>
          <input
            type="number"
            :min="BADGE_LAB_MIN_COUNT"
            :max="BADGE_LAB_MAX_COUNT"
            :value="count"
            class="admin-stepper-input"
            @change="onCountInput(($event.target as HTMLInputElement).value)"
            @blur="onCountInput(($event.target as HTMLInputElement).value)"
          />
          <button
            class="admin-stepper-btn"
            :disabled="count >= BADGE_LAB_MAX_COUNT"
            tabindex="-1"
            @click="stepCount(1)"
          >
            +
          </button>
        </div>
      </div>

      <!-- Eine Zeile je Marke. Die Zahl ist LIVE, nicht das Ergebnis des letzten
           Laufs: sie fällt sichtbar, wenn man die Marke im Spiel abräumt. -->
      <ul class="bl-list">
        <li
          v-for="row in badgeRows"
          :key="row.def.id"
          class="bl-row"
          :class="{ 'bl-row--lit': row.count > 0 }"
          :style="{ '--bl-accent': row.def.accent }"
          :title="row.def.sites.map((s) => s.where).join(' · ')"
        >
          <span class="bl-dot" aria-hidden="true"></span>
          <img v-if="row.def.imageSrc" :src="row.def.imageSrc" class="bl-glyph" alt="" />
          <Icon v-else :icon="row.def.icon!" width="16" height="16" class="bl-glyph" />
          <span class="bl-name">{{ row.def.short }}</span>
          <Icon
            v-if="row.def.reversible !== 'full'"
            icon="lucide:triangle-alert"
            width="13"
            height="13"
            class="bl-warn"
            :title="row.def.seedNote"
          />
          <span class="bl-count">{{ row.count > 0 ? row.count : '—' }}</span>
          <button class="bl-act" @click="fillOne(row.def.id)">fill</button>
          <button class="bl-act bl-act--clear" @click="clearOne(row.def.id)">clear</button>
        </li>
      </ul>

      <div class="bl-footer">
        <button class="bl-bulk" @click="fillAll">
          <Icon icon="game-icons:bell-shield" width="16" height="16" /> Fill All Badges
        </button>
        <button class="bl-bulk bl-bulk--clear" @click="clearAll">
          <Icon icon="lucide:eraser" width="16" height="16" /> Clear All
        </button>
      </div>
    </div>
  </AdminCollapsiblePanel>
</template>

<style scoped>
.bl-body {
  display: flex;
  flex-direction: column;
}

.bl-body--flash {
  animation: bl-flash 280ms ease-out;
}

@keyframes bl-flash {
  0% {
    opacity: 0.45;
  }
  100% {
    opacity: 1;
  }
}

.bl-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  padding-bottom: 8px;
  border-bottom: 1px solid #2a2116;
}

.bl-head-label {
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
}

/* Der Stepper trägt dieselben Klassennamen wie im Quick-Actions-Panel; scoped
   CSS erbt nicht, also stehen die Regeln hier noch einmal — wie in den
   übrigen Admin-Panels auch. */
.admin-stepper {
  display: flex;
  align-items: center;
  border: 1px solid var(--rpg-wood-mid);
  border-radius: var(--bp-radius);
  overflow: hidden;
}

.admin-stepper:focus-within {
  border-color: var(--rpg-gold-dim);
  box-shadow: 0 0 0 2px #332810;
}

.admin-stepper-btn {
  flex: 0 0 1.5rem;
  height: 1.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--rpg-text-muted);
  line-height: 1;
  transition:
    background 0.12s,
    color 0.12s;
  user-select: none;
}
.admin-stepper-btn:first-child {
  border-right: 1px solid var(--rpg-wood-mid);
}
.admin-stepper-btn:last-child {
  border-left: 1px solid var(--rpg-wood-mid);
}
.admin-stepper-btn:hover:not(:disabled) {
  background: #1e1a0e;
  color: var(--rpg-gold);
}
.admin-stepper-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.admin-stepper-input {
  width: 2.4rem;
  height: 1.5rem;
  background: #141410;
  border: none;
  text-align: center;
  font-family: 'MedievalSharp', cursive;
  font-size: 0.75rem;
  color: var(--rpg-gold);
  -moz-appearance: textfield;
}
.admin-stepper-input::-webkit-outer-spin-button,
.admin-stepper-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Die Liste rollt, nicht das Panel: sonst diktierte sie die Höhe der rechten
   Dashboard-Spalte, und deren Überlauf wird still abgeschnitten. */
/* Der Deckel ist die Sicherung für die neunte Marke: bis dahin ist die Liste so
   hoch wie ihr Inhalt und rollt nicht. */
.bl-list {
  max-height: 15rem;
  overflow-y: auto;
  margin: 6px 0;
  padding: 0;
  list-style: none;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.bl-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 2px;
  border-bottom: 1px solid #1c1811;
}
.bl-row:last-child {
  border-bottom: none;
}

.bl-dot {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgb(var(--bl-accent));
  opacity: 0.28;
}
.bl-row--lit .bl-dot {
  opacity: 1;
}

.bl-glyph {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  color: var(--rpg-gold-dim);
  opacity: 0.8;
}

.bl-name {
  flex: 1;
  min-width: 0;
  font-size: 0.7rem;
  color: var(--rpg-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bl-row--lit .bl-name {
  color: var(--rpg-text);
}

.bl-warn {
  flex: 0 0 auto;
  color: #b08040;
}

.bl-count {
  flex: 0 0 1.6rem;
  text-align: right;
  font-size: 0.75rem;
  font-weight: 700;
  color: #4a4335;
}
.bl-row--lit .bl-count {
  color: rgb(var(--bl-accent));
}

.bl-act {
  flex: 0 0 auto;
  padding: 2px 7px;
  font-family: 'MedievalSharp', cursive;
  font-size: 0.62rem;
  border: 1px solid var(--rpg-wood-mid);
  border-radius: var(--bp-radius);
  background: transparent;
  color: var(--rpg-gold-dim);
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}
.bl-act:hover {
  background: #1c1810;
  border-color: var(--rpg-gold-dim);
  color: var(--rpg-gold);
}

.bl-act--clear {
  color: #cc6050;
  border-color: #4a1e18;
}
.bl-act--clear:hover {
  background: #1e0f0c;
  border-color: #cc6050;
  color: #e88070;
}

.bl-footer {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}

.bl-bulk {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 8px;
  font-family: 'MedievalSharp', cursive;
  font-size: 0.7rem;
  font-weight: 600;
  border: 1px solid var(--rpg-wood-mid);
  border-radius: var(--bp-radius);
  background: transparent;
  color: var(--rpg-gold-dim);
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}
.bl-bulk:hover {
  background: #1c1810;
  border-color: var(--rpg-gold-dim);
  color: var(--rpg-gold);
}

.bl-bulk--clear {
  color: #cc6050;
  border-color: #4a1e18;
}
.bl-bulk--clear:hover {
  background: #1e0f0c;
  border-color: #cc6050;
  color: #e88070;
}

@media (prefers-reduced-motion: reduce) {
  .bl-body--flash {
    animation: none;
  }
}
</style>
