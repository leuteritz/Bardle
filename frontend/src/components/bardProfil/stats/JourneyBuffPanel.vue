<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useActiveBuffList } from '@/composables/ui/useActiveBuffList'
import VitalityBar from '@/components/ui/VitalityBar.vue'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { sunVitalStage } from '@/utils/ui/format'
import { DRIFTER_BUFF_EXPIRY_WARN_SEC, JOURNEY_BUFF_PANEL } from '@/config/constants'

/** Gemeinsame Statusspur für Sonne und aktive Effekte. */
const { buffs } = useActiveBuffList()
const playerStore = usePlayerStore()

const P = JOURNEY_BUFF_PANEL
const panelH = `${P.H}px`
const panelHCompact = `${P.H_COMPACT}px`
const vitalMinW = `${P.VITAL_MIN_W}px`
const vitalMaxW = `${P.VITAL_MAX_W}px`
const vitalShare = `${P.VITAL_SHARE}%`
const vitalH = `${P.VITAL_H}px`
const vitalHCompact = `${P.VITAL_H_COMPACT}px`

const regen = computed(() => Math.round(playerStore.regenPerSec * 10) / 10)
const vitalityStage = computed(() => sunVitalStage(playerStore.hpPercent))
const vitalityState = computed(() => `is-${vitalityStage.value}`)
const vitalityStatus = computed(() => {
  if (vitalityStage.value === 'red') return 'Critical'
  if (vitalityStage.value === 'yellow') return 'Wounded'
  return 'Stable'
})
const vitalityTip = computed(
  () =>
    `Sun vitality · ${Math.ceil(playerStore.currentHP).toLocaleString()} / ${Math.round(playerStore.maxHP).toLocaleString()} · +${regen.value}/s regeneration`,
)
const vitalityLabel = computed(
  () => `Sun health ${Math.ceil(playerStore.currentHP)} of ${playerStore.maxHP}`,
)

/* Wie viele Karten nebeneinander passen, misst die Reihe an sich selbst: auf
   Full HD ist die Sonnenspalte rund 570px breit, auf 4K viermal so viel. */
const rowEl = ref<HTMLElement | null>(null)
const rowW = ref(0)
let rowObserver: ResizeObserver | null = null

function fitCount(width: number): number {
  if (width <= 0) return P.COLS
  return Math.max(1, Math.floor((width + P.CARD_GAP) / (P.CARD_MIN_W + P.CARD_GAP)))
}

/** Der Überlaufplatz nimmt selbst Breite — passt er nicht mehr, fällt eine
 *  Karte mehr in die Zahl. */
const cols = computed(() => {
  const free = fitCount(rowW.value)
  if (buffs.value.length <= Math.min(free, P.COLS)) return Math.min(free, P.COLS)
  return Math.min(P.COLS, fitCount(rowW.value - P.MORE_W))
})

const shown = computed(() => buffs.value.slice(0, cols.value))
const overflow = computed(() => buffs.value.length - shown.value.length)

onMounted(() => {
  if (!rowEl.value) return
  rowW.value = rowEl.value.clientWidth
  rowObserver = new ResizeObserver((entries) => {
    // 0 = per v-show versteckt; die letzte Breite behalten
    const w = entries[0].contentRect.width
    if (w) rowW.value = w
  })
  rowObserver.observe(rowEl.value)
})

onUnmounted(() => rowObserver?.disconnect())
</script>

<template>
  <section class="jbp" aria-label="Journey status">
    <div class="jbp-vitals" :class="vitalityState" v-tip="vitalityTip">
      <div class="jbp-vitals-head">
        <span class="jbp-vitals-label">Sun vitality</span>
        <span class="jbp-vitals-state">{{ vitalityStatus }}</span>
      </div>
      <VitalityBar
        class="jbp-vitality-bar"
        :current="playerStore.currentHP"
        :max="playerStore.maxHP"
        :regen-per-sec="regen"
        label-placement="inside"
        spark
        aria-role="status"
        :aria-label="vitalityLabel"
      />
    </div>

    <span class="jbp-seam" aria-hidden="true" />

    <div class="jbp-effects">
      <div class="jbp-effects-head">
        <span class="jbp-effects-label">Active effects</span>
        <span class="jbp-effects-count">{{ buffs.length ? `${buffs.length} running` : 'Clear' }}</span>
      </div>

      <div ref="rowEl" class="jbp-row">
        <span v-if="buffs.length === 0" class="jbp-empty">
          <Icon icon="game-icons:hourglass" width="24" height="24" aria-hidden="true" />
          No effects running
        </span>

        <TransitionGroup name="jbp-card">
          <article
            v-for="b in shown"
            :key="b.key"
            class="jbp-card"
            :class="{
              'is-expiring': b.timer && b.timer.secondsLeft <= DRIFTER_BUFF_EXPIRY_WARN_SEC,
              'is-endless': !b.timer,
              'is-ranked': !!b.rankColor,
            }"
            :style="{ '--buff': b.color, '--buff-rank': b.rankColor }"
            v-tip="`${b.name} — ${b.multiplier}× ${b.label}`"
          >
            <span
              class="jbp-drain"
              :style="{ transform: `scaleX(${b.timer ? b.timer.progress : 1})` }"
              aria-hidden="true"
            />
            <span class="jbp-pulse" aria-hidden="true" />

            <span class="jbp-icon">
              <img v-if="b.image" :src="b.image" class="jbp-art" alt="" aria-hidden="true" />
              <Icon v-else-if="b.icon" :icon="b.icon" class="jbp-glyph" aria-hidden="true" />
            </span>

            <span class="jbp-copy">
              <span class="jbp-name">{{ b.name }}</span>
              <span class="jbp-axis">
                <span class="jbp-mult">{{ b.multiplier }}×</span> {{ b.label }}
              </span>
            </span>

            <span v-if="b.timer" class="jbp-clock">
              <span class="jbp-sec">{{ b.timer.secondsLeft }}</span
              ><span class="jbp-unit">s</span>
            </span>
            <span v-else class="jbp-clock jbp-clock--endless">galaxy</span>
          </article>

          <span
            v-if="overflow > 0"
            key="more"
            class="jbp-more"
            v-tip="`${overflow} more effect${overflow === 1 ? '' : 's'} running`"
            >+{{ overflow }}</span
          >
        </TransitionGroup>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Die Höhe hängt NICHT am Inhalt: jeder Pixel hier fällt vom Durchmesser der
   Sonne darunter ab, und ein wachsendes Panel liesse sie springen. */
.jbp {
  display: flex;
  align-items: stretch;
  gap: 12px;
  height: v-bind(panelH);
  min-width: 0;
  padding: 8px 16px;
  background: #16100a;
  border-bottom: 1px solid #2c1806;
  overflow: clip;
}

.jbp-vitals {
  display: flex;
  flex: 1 1 v-bind(vitalShare);
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-width: v-bind(vitalMinW);
  max-width: v-bind(vitalMaxW);
  padding-right: 2px;
}

.jbp-vitals-head,
.jbp-effects-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.jbp-vitals-label,
.jbp-effects-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #c79b42;
  white-space: nowrap;
}

.jbp-vitals-state,
.jbp-effects-count {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a6a4a;
}

.jbp-vitals.is-yellow .jbp-vitals-state {
  color: #e0a828;
}

.jbp-vitals.is-red .jbp-vitals-label,
.jbp-vitals.is-red .jbp-vitals-state {
  color: #cc6050;
}

.jbp-vitality-bar {
  --vb-w: 100%;
  --vb-h: v-bind(vitalH);
  --vb-label-size: 16px;
  --vb-label-sub-size: 10px;
  --vb-regen-size: 9px;
  --vb-regen-display: inline;
  --vb-cur-reserve: 0;
}

.jbp-seam {
  align-self: stretch;
  width: 1px;
  margin: 7px 1px;
  background: linear-gradient(to bottom, transparent, #5c3310 25%, #5c3310 75%, transparent);
}

.jbp-effects {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.jbp-effects-label {
  color: #8a7a58;
}

.jbp-effects-count {
  color: #5f553e;
}

.jbp-row {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.jbp-empty {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  letter-spacing: 0.06em;
  color: #6b5a34;
  white-space: nowrap;
}

/* ── eine Karte ──────────────────────────────────────────────────
   Glyphfeld, Name über Achse, Sekunden — auf dem ablaufenden Grund. */
.jbp-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  flex: 1 1 0;
  min-width: 0;
  max-width: 380px;
  padding: 0 14px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-left: 3px solid var(--buff);
  border-radius: 4px;
  overflow: clip;
  cursor: help;
}
.jbp-card.is-ranked {
  border-color: var(--buff-rank);
  border-left-color: var(--buff);
}

/* Ein Verlauf statt einer Kante am Ende: `scaleX` staucht jede Kante mit, ein
   Verlauf behält seine Gestalt. */
.jbp-drain {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--buff) 10%, transparent),
    color-mix(in srgb, var(--buff) 32%, transparent)
  );
  transition: transform 1s linear;
  pointer-events: none;
}
.jbp-card.is-endless .jbp-drain {
  background: color-mix(in srgb, var(--buff) 14%, transparent);
}

/* Die letzten Sekunden: eigene Ebene, statisch gefärbt, animiert wird nur ihre
   Deckkraft. */
.jbp-pulse {
  position: absolute;
  inset: 0;
  opacity: 0;
  background: color-mix(in srgb, #cc6050 22%, transparent);
  pointer-events: none;
}
.jbp-card.is-expiring .jbp-pulse {
  animation: jbp-pulse 1s ease-in-out infinite;
}
@keyframes jbp-pulse {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

.jbp-icon {
  position: relative;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  background: #141410;
  border: 1px solid color-mix(in srgb, var(--buff) 40%, #2c1806);
  border-radius: 4px;
}
.jbp-glyph {
  width: 24px;
  height: 24px;
  color: var(--buff);
}
.jbp-art {
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.jbp-copy {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.jbp-name {
  font-size: 15px;
  font-weight: 800;
  line-height: 1.1;
  color: #f0e6c8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jbp-axis {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.jbp-mult {
  color: var(--buff);
}

.jbp-clock {
  position: relative;
  flex-shrink: 0;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  color: var(--rpg-gold);
  /* zwei Stellen reserviert, sonst zuckt die Karte beim Wechsel 10 → 9 */
  min-width: 3.2ch;
  text-align: right;
}
.jbp-unit {
  font-size: 12px;
  color: #8a7a58;
}
.jbp-card.is-expiring .jbp-sec {
  color: #cc6050;
}

.jbp-clock--endless {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8a7a58;
  min-width: 0;
}

.jbp-more {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  min-width: 34px;
  padding: 0 7px;
  font-size: 17px;
  font-weight: 900;
  color: #8a7a58;
  background: #16100a;
  border: 1px solid #2c1806;
  border-radius: 4px;
  cursor: help;
}

/* Zu- und Abgang fahren nur `transform` und `opacity`. */
.jbp-card-enter-active,
.jbp-card-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}
.jbp-card-enter-from,
.jbp-card-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
.jbp-card-leave-active {
  position: absolute;
  top: 0;
  bottom: 0;
}

@media (max-height: 1100px) {
  .jbp {
    gap: 10px;
    height: v-bind(panelHCompact);
    padding: 6px 12px;
  }
  .jbp-vitals {
    gap: 4px;
  }
  .jbp-vitality-bar {
    --vb-h: v-bind(vitalHCompact);
    --vb-label-size: 15px;
  }
  .jbp-seam {
    margin-block: 6px;
  }
  .jbp-effects {
    gap: 4px;
  }
  .jbp-card {
    gap: 9px;
    padding: 0 11px;
  }
  .jbp-icon {
    width: 30px;
    height: 30px;
  }
  .jbp-glyph {
    width: 21px;
    height: 21px;
  }
  .jbp-art {
    width: 23px;
    height: 23px;
  }
  .jbp-name {
    font-size: 13px;
  }
  .jbp-clock {
    font-size: 19px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .jbp-drain {
    transition: none;
  }
  .jbp-card.is-expiring .jbp-pulse {
    animation: none;
    opacity: 0.6;
  }
}
</style>
