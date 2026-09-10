<template>
  <div v-if="entry" class="sfc-slot" :style="{ '--focus-color': entry.color }">
    <div class="sfc-div" role="separator">
      <Icon :icon="FORGE_PIN_ICON" width="17" height="17" class="sfc-div-ico" />
      <span class="sfc-div-label">{{ FORGE_FOCUS_CARD_LABEL }}</span>
    </div>

    <section class="sfc" aria-labelledby="forge-focus-title">
      <header class="sfc-head">
        <div class="sfc-icon-wrap">
          <Icon
            :icon="entry.icon"
            :width="FORGE_FOCUS_CARD_ICON_SIZE"
            :height="FORGE_FOCUS_CARD_ICON_SIZE"
            class="sfc-icon"
          />
        </div>
        <div class="sfc-heading">
          <h2 id="forge-focus-title">{{ entry.name }}</h2>
          <div class="sfc-status-row">
            <span class="sfc-status">{{ stateLabel }}</span>
            <span class="sfc-level">{{ FORGE_FOCUS_CARD_LEVEL_LABEL }} · {{ levelText }}</span>
          </div>
        </div>
        <button
          class="sfc-clear"
          type="button"
          :aria-label="FORGE_FOCUS_CARD_CLEAR_LABEL"
          :title="FORGE_FOCUS_CARD_CLEAR_LABEL"
          @click="clearPin"
        >
          ×
        </button>
      </header>

      <div class="sfc-effect-block">
        <span class="sfc-label">{{ FORGE_FOCUS_CARD_EFFECT_LABEL }}</span>
        <p class="sfc-effect">{{ effectText }}</p>
      </div>

      <div class="sfc-data-grid">
        <div class="sfc-stat">
          <span class="sfc-label">{{ FORGE_FOCUS_CARD_CURRENT_LABEL }}</span>
          <strong>{{ currentImpact }}</strong>
        </div>
        <div v-if="showNext" class="sfc-stat sfc-stat--next">
          <span class="sfc-label">{{ FORGE_FOCUS_CARD_NEXT_LABEL }}</span>
          <strong>{{ entry.nextText }}</strong>
        </div>
      </div>

      <div v-if="showCost" class="sfc-cost-block">
        <span class="sfc-label">{{ FORGE_FOCUS_CARD_COST_LABEL }}</span>
        <ForgeCostRow
          class="sfc-cost"
          :gold="entry.goldCost"
          :gold-ok="entry.goldOk"
          :meeps="entry.meepCost"
          :meeps-ok="entry.meepOk"
          :materials="entry.materials"
          :label="false"
          big
          chips
        />
      </div>

      <div v-if="showUnlock" class="sfc-unlock">
        <span class="sfc-label">{{ FORGE_FOCUS_CARD_UNLOCK_LABEL }}</span>
        <span v-if="entry.lockReason !== ''" class="sfc-lock-reason">{{ entry.lockReason }}</span>
        <ul v-if="entry.reqs.length > 0" class="sfc-reqs">
          <li v-for="req in entry.reqs" :key="req.id" :class="{ 'sfc-req--met': req.met }">
            <span>{{ req.met ? FORGE_REQ_MET_MARK : FORGE_REQ_OPEN_MARK }}</span>
            <span>{{ req.name }}</span>
            <b>{{ req.have }}/{{ req.need }}</b>
          </li>
        </ul>
      </div>

      <button
        v-if="entry.canBuy"
        class="sfc-action"
        type="button"
        :aria-label="`${FORGE_FOCUS_CARD_BUY_LABEL}: ${entry.name}`"
        @click="grow"
      >
        {{ FORGE_FOCUS_CARD_BUY_LABEL }}
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import { forgeEffectText, useForgeUpgrades } from '@/composables/ui/useForgeUpgrades'
import ForgeCostRow from './ForgeCostRow.vue'
import type { ForgeUpgradeEntry } from '@/types'
import {
  FORGE_FOCUS_CARD_CLEAR_LABEL,
  FORGE_FOCUS_CARD_COST_LABEL,
  FORGE_FOCUS_CARD_CURRENT_LABEL,
  FORGE_FOCUS_CARD_EFFECT_LABEL,
  FORGE_FOCUS_CARD_BUY_LABEL,
  FORGE_FOCUS_CARD_ICON_SIZE,
  FORGE_FOCUS_CARD_LABEL,
  FORGE_FOCUS_CARD_LEVEL_LABEL,
  FORGE_FOCUS_CARD_NEXT_LABEL,
  FORGE_FOCUS_CARD_STATE_LABELS,
  FORGE_FOCUS_CARD_UNLOCK_LABEL,
  FORGE_ENDLESS_SYMBOL,
  FORGE_LEVEL_PREFIX,
  FORGE_PIN_ICON,
  FORGE_REQ_MET_MARK,
  FORGE_REQ_OPEN_MARK,
} from '@/config/constants'

const { pinnedId, clearPin } = useForgeSpotlight()
const { entryById, buyUpgrade } = useForgeUpgrades()

const entry = computed<ForgeUpgradeEntry | null>(() =>
  pinnedId.value === null ? null : (entryById.value.get(pinnedId.value) ?? null),
)

const effectText = computed(() => (entry.value ? forgeEffectText(entry.value) : ''))
const currentImpact = computed(() => {
  const e = entry.value
  if (!e) return ''
  return e.level === 0 ? '—' : e.nowText
})
const showNext = computed(() => {
  const state = entry.value?.state
  return state !== undefined && state !== 'maxed' && state !== 'sealed'
})
const showCost = computed(() => {
  const e = entry.value
  return Boolean(e && e.state !== 'maxed' && e.state !== 'sealed' && (e.goldCost > 0 || e.meepCost > 0 || e.materials.length > 0))
})
const showUnlock = computed(() => {
  const e = entry.value
  return Boolean(e && (e.lockReason !== '' || e.reqs.some((req) => !req.met)))
})
const stateLabel = computed(() => (entry.value ? FORGE_FOCUS_CARD_STATE_LABELS[entry.value.state] : ''))
const levelText = computed(() => {
  const e = entry.value
  if (!e) return ''
  return Number.isFinite(e.maxLevel)
    ? `${FORGE_LEVEL_PREFIX}${e.level} / ${e.maxLevel}`
    : `${FORGE_LEVEL_PREFIX}${e.level} / ${FORGE_ENDLESS_SYMBOL}`
})

function grow(): void {
  if (entry.value && buyUpgrade(entry.value.id)) clearPin()
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   DER PLATZ IM KOPF
   Dieselbe Fläche und dieselbe Naht wie die Segensreihe darunter (`.sf-buffs`):
   der Kopf der Spalte liest sich als EIN Ort. Die Polsterung sitzt hier und
   nicht an `.sf-panel` — die Karte stiess sonst hart an drei Panelkanten,
   während jedes andere Kopfstück seine 18px selbst trägt.
══════════════════════════════════════════════════ */
.sfc-slot {
  flex-shrink: 0;
  padding: 8px 18px 12px;
}

/* ══════════════════════════════════════════════════
   DER TRENNER
   Gestalt der Topf-Trenner der Liste (`.fu-div` in `ForgeUpgradesSection`):
   Linie – Etikett – Linie, 13px in Versalien, die Linien zur Mitte hin kräftig.
   Scoped kopiert und nicht geteilt, aus demselben Grund, der dort schon steht —
   die geteilte `.filter-divider` hängt an einer 11px-Zeile im Filterfenster.
   Die Farbe ist die des Knotens, nicht die eines Topfes.
══════════════════════════════════════════════════ */
.sfc-div {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0 2px 8px;
}

.sfc-div::before,
.sfc-div::after {
  content: '';
  flex: 1;
  height: 2px;
  border-radius: 2px;
}

.sfc-div::before {
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in srgb, var(--focus-color, #c89040) 55%, transparent)
  );
}

.sfc-div::after {
  background: linear-gradient(
    to left,
    transparent,
    color-mix(in srgb, var(--focus-color, #c89040) 55%, transparent)
  );
}

.sfc-div-ico {
  flex-shrink: 0;
  color: var(--focus-color, #c89040);
}

.sfc-div-label {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
  color: var(--focus-color, #c89040);
}

/* ══════════════════════════════════════════════════
   DIE KARTE
   EIN Grundton innen, nicht drei. Die Fläche hatte einmal `#1a140b`, der
   Wirkungsblock `#111008`, die Kacheln `#211b10` und die Chips wieder
   `#111008` — vier Töne in einem Kasten, der EINE Sache beschreibt, lasen sich
   als Flickenteppich. Struktur trägt seitdem die Haarlinie und der farbige
   Balken am Wirkungsblock, nicht der Füllwechsel.
══════════════════════════════════════════════════ */
.sfc {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  padding: 14px;
  border: 2px solid var(--focus-color, #7a4e20);
  border-radius: 4px;
  background: #1a1008;
  box-shadow: inset 0 0 0 2px #3e200a;
}

.sfc-head,
.sfc-effect-block,
.sfc-data-grid,
.sfc-cost-block,
.sfc-unlock,
.sfc-action {
  position: relative;
  z-index: 1;
}

.sfc-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sfc-icon-wrap {
  display: grid;
  flex: 0 0 70px;
  width: 70px;
  height: 70px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--focus-color, #7a4e20) 72%, #3e200a);
  border-radius: 4px;
  background: #1e1409;
}

.sfc-icon {
  color: var(--focus-color, #e8c040);
}

.sfc-heading {
  min-width: 0;
  flex: 1;
}

.sfc-label {
  display: block;
  color: #ad9b78;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.sfc-heading h2 {
  margin: 0 0 5px;
  color: var(--focus-color, #e8c040);
  font-size: clamp(22px, 2.1vw, 30px);
  font-weight: 900;
  line-height: 1;
}

.sfc-status-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sfc-status,
.sfc-level {
  padding: 3px 6px;
  border: 1px solid #32210c;
  border-radius: 3px;
  background: transparent;
  color: #e8c040;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.sfc-level {
  color: #cfc4a5;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
}

.sfc-clear {
  align-self: flex-start;
  width: 28px;
  height: 28px;
  border: 1px solid #32210c;
  border-radius: 4px;
  background: transparent;
  color: #b9a47a;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.sfc-clear:hover,
.sfc-clear:focus-visible {
  border-color: #e8c040;
  color: #e8c040;
}

.sfc-effect-block {
  padding: 8px 12px;
  border-left: 3px solid var(--focus-color, #e8c040);
  border-top: 1px solid #32210c;
  border-bottom: 1px solid #32210c;
}

.sfc-effect {
  margin: 4px 0 0;
  color: #f1e6c9;
  font-size: clamp(16px, 1.8vw, 22px);
  font-weight: 900;
  line-height: 1.12;
}

.sfc-data-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.sfc-stat {
  min-width: 0;
  padding: 3px 0;
}

.sfc-stat strong {
  display: block;
  margin-top: 3px;
  overflow: hidden;
  color: #eee0b6;
  font-size: clamp(17px, 1.65vw, 22px);
  font-weight: 900;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sfc-stat--next strong {
  color: #72c94c;
}

.sfc-stat + .sfc-stat {
  padding-left: 12px;
  border-left: 1px solid #32210c;
}

.sfc-cost-block,
.sfc-unlock {
  padding-top: 8px;
  border-top: 1px solid #32210c;
}

.sfc-cost {
  margin-top: 5px;
}

.sfc-cost :deep(.fc-cost-row) {
  flex-wrap: wrap;
  gap: 10px;
}

.sfc-cost :deep(.fc-cost-pair) {
  padding: 2px 0;
  border: 0;
  background: transparent;
}

.sfc-lock-reason {
  display: block;
  margin-top: 4px;
  color: #d57962;
  font-size: 13px;
  font-weight: 800;
}

.sfc-reqs {
  display: grid;
  gap: 3px;
  margin: 4px 0 0;
  padding: 0;
  color: #d2c5a4;
  font-size: 12.5px;
  list-style: none;
}

.sfc-reqs li {
  display: flex;
  align-items: center;
  gap: 7px;
}

.sfc-reqs li > span:first-child {
  color: #cc6050;
}

.sfc-reqs li b {
  margin-left: auto;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}

.sfc-req--met > span:first-child {
  color: #52b830 !important;
}

.sfc-action {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 11px 14px;
  border: 1px solid #6ec040;
  border-radius: 4px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  color: #08130a;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}

.sfc-action:hover,
.sfc-action:focus-visible {
  filter: brightness(1.12);
}

@media (max-height: 1100px) {
  .sfc-slot {
    padding: 7px 15px 10px;
  }

  .sfc-div {
    margin-bottom: 7px;
  }

  .sfc {
    gap: 8px;
    padding: 12px;
  }

  .sfc-icon-wrap {
    flex-basis: 64px;
    width: 64px;
    height: 64px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sfc-action {
    transition: none;
  }
}
</style>
