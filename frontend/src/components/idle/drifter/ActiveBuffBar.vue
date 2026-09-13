<template>
  <!-- Every temporary effect the player carries, as ONE stack rising from the
       command panel in the bottom-right corner (`dock: 'free'`), newest row at
       the bottom. Hidden while a bard profile tab covers the screen — nothing
       under there can be read anyway.

       During a star fight the stack is docked into the modal's rail
       (`dock: 'rail'`); while the game is paused it stands in the pause
       overlay's kit band (`dock: 'pause'`). App.vue teleports the same
       instance — only the shape changes.

       Paused the `bardActiveTab` guard does not apply: it keeps the stack out
       of a view that covers it, and the overlay covers everything anyway. -->
  <TransitionGroup
    v-if="uiStore.bardActiveTab === null || props.dock === 'pause'"
    ref="stackRef"
    name="buff-chip"
    tag="div"
    class="buff-bar"
    :class="{
      'buff-bar--free': props.dock === 'free',
      'buff-bar--docked': props.dock === 'rail',
      'buff-bar--pause': props.dock === 'pause',
      'buff-bar--empty': props.dock === 'pause' && chips.length === 0,
    }"
    role="status"
  >
    <!-- Frei: die Pille steht OBEN — der Stapel wächst vom Panel nach oben, und
         was nicht mehr passt, sind die ältesten Zeilen. -->
    <div v-if="props.dock === 'free' && overflowCount > 0" key="more-free" class="buff-more">
      +{{ overflowCount }} more
    </div>

    <div
      v-for="chip in visibleChips"
      :key="chip.key"
      class="buff-chip"
      :class="[
        `buff-chip--t${chip.tier}`,
        {
          'buff-chip--expiring': isExpiring(chip),
          'buff-chip--endless': chip.timer === null,
        },
      ]"
      :style="{ '--chip-color': chip.color, '--chip-rank': chip.rankColor }"
      :aria-label="buffAriaLabel(chip)"
      tabindex="0"
      v-tip="buffTip(chip)"
    >
      <!-- Stufe 3: statischer Schein, animiert wird nur seine Deckkraft. -->
      <span v-if="chip.tier === 3" class="chip-aura" aria-hidden="true"></span>
      <span class="chip-pulse" aria-hidden="true"></span>
      <!-- Der Rang als Edelstein auf der Oberkante; die Quelle ist die linke Kante. -->
      <span v-if="chip.tier >= 2" class="chip-gem" aria-hidden="true"></span>
      <span v-if="chip.tier === 3" class="chip-ornament chip-ornament--tr" aria-hidden="true"
        >✦</span
      >
      <span v-if="chip.tier === 3" class="chip-ornament chip-ornament--bl" aria-hidden="true"
        >✦</span
      >

      <!-- Die Bühne IST die Uhr: der Ring läuft gegen den Uhrzeigersinn leer. -->
      <span class="chip-icon">
        <svg class="chip-ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle class="chip-ring__track" cx="50" cy="50" :r="RING_R" />
          <circle
            v-if="chip.timer"
            class="chip-ring__fill"
            cx="50"
            cy="50"
            :r="RING_R"
            :stroke-dasharray="RING_C"
            :stroke-dashoffset="RING_C * (1 - chip.timer.progress)"
          />
        </svg>
        <img v-if="chip.image" :src="chip.image" alt="" class="chip-icon__art" draggable="false" />
        <Icon v-else-if="chip.icon" :icon="chip.icon" class="chip-icon__glyph" />
      </span>

      <span class="chip-text">
        <span class="chip-name">{{ chip.name }}</span>
        <!-- Der Effekt als EIN Token: Faktor zuerst, dann die Achse als Kurzwort. -->
        <span class="chip-label">
          <span class="chip-mult">×{{ chip.multiplier }}</span>
          <span class="chip-axis">{{ buffShortLabel(chip.label) }}</span>
        </span>
      </span>

      <span class="chip-side">
        <!-- Reserved width: the seconds drop from two digits to one, and
             without the reservation every row would twitch once per second. -->
        <span v-if="chip.timer" class="chip-clock">
          <span class="chip-seconds">{{ chip.timer.secondsLeft }}</span>
          <span class="chip-unit">s</span>
        </span>
        <span v-else class="chip-clock chip-clock--endless">{{ props.dock === 'free' ? '∞' : 'galaxy' }}</span>
      </span>

      <span
        v-if="props.dock === 'free'"
        class="chip-track"
        :style="{ transform: `scaleX(${chip.timer ? chip.timer.progress : 1})` }"
        aria-hidden="true"
      />
    </div>

    <!-- Pause-Band: der Platz für „+N" ist IMMER reserviert, auch leer — sonst
         spränge die Spaltenbreite und mit ihr die Kit-Zellen. -->
    <div v-if="props.dock === 'pause'" key="more" class="buff-chip--more">
      <span v-if="overflowCount > 0">+{{ overflowCount }}</span>
    </div>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useActiveBuffList, type ActiveBuffView } from '@/composables/ui/useActiveBuffList'
import { buffShortLabel } from '@/utils/ui/buffAxis'
import {
  BUFF_RANK_TIER,
  BUFF_STACK_BOTTOM_GAP,
  BUFF_STACK_GAP,
  BUFF_STACK_GAP_COMPACT,
  BUFF_STACK_MORE_H,
  BUFF_STACK_ROW_H,
  BUFF_STACK_ROW_H_COMPACT,
  BUFF_STACK_TOP_GAP,
  BUFF_STACK_W,
  ACTIVE_BUFF_HUD,
  DRIFTER_BUFF_EXPIRY_WARN_SEC,
  PAUSE_KIT_EFFECT_COLS,
} from '@/config/constants'
import type { AbilityBarDock } from '@/types'
import type { TipValue } from '@/utils/ui/tipDirective'

/** Where the stack stands — see `AbilityBarDock`. Decided by App.vue. */
const props = withDefaults(defineProps<{ dock?: AbilityBarDock }>(), { dock: 'free' })

const uiStore = useUiStore()
const { buffs } = useActiveBuffList()

/* Ring-Geometrie: Radius im 100er-Viewbox, Umfang für dasharray. */
const RING_R = 46
const RING_C = 2 * Math.PI * RING_R

type BuffChip = ActiveBuffView & { tier: 1 | 2 | 3 }

/** Nach Ankunft, älteste zuerst — der neueste Buff steht unten am Panel. Ein
 *  Segen ohne Uhr gilt seit Galaxiebeginn und steht ganz oben. Der Rang
 *  sortiert NICHT um: er zeigt sich an der Platte, nicht am Platz. */
const chips = computed<BuffChip[]>(() =>
  buffs.value
    .map((b, i) => ({ ...b, tier: b.rank ? BUFF_RANK_TIER[b.rank] : (1 as const), i }))
    .sort((a, b) => (a.startedAt ?? -Infinity) - (b.startedAt ?? -Infinity) || a.i - b.i),
)

function isExpiring(chip: BuffChip): boolean {
  return chip.timer !== null && chip.timer.secondsLeft <= DRIFTER_BUFF_EXPIRY_WARN_SEC
}

function buffAriaLabel(chip: BuffChip): string {
  const duration = chip.timer ? `${chip.timer.secondsLeft}s remaining` : 'until galaxy end'
  return `${chip.name}: ${chip.multiplier}× ${chip.label}, ${duration}`
}

function buffTip(chip: BuffChip): TipValue {
  const duration = chip.timer ? `${chip.timer.secondsLeft}s remaining` : 'until galaxy end'
  return {
    label: chip.source === 'drifter' ? 'Drifter blessing' : 'Active effect',
    labelAccent: chip.name,
    text: `${chip.multiplier}× ${chip.label} · ${duration}`,
    color: chip.color,
  }
}

/* ── Wie viele Zeilen passen in das Band ──────────────────────────────────
   Der Stapel misst sein Band (unten Panel-Oberkante, oben Eventlog-Kante) an
   sich selbst; die Zeilenhöhe liest er aus seiner eigenen `--chip-h` — eine
   Zahl je Auflösungsstufe, nie calc(). Passt nicht alles, nimmt „+N" die
   oberste Zeile, und gezeigt werden die NEUESTEN. */
const stackRef = ref<{ $el: HTMLElement } | null>(null)
/** Ganze Zeilen im Band — und wie viele neben der „+N"-Pille noch stehen. */
const fitRows = ref(Infinity)
const fitRowsWithMore = ref(Infinity)
let observer: ResizeObserver | null = null

function measure() {
  const el = stackRef.value?.$el
  if (!el || props.dock !== 'free') return
  const style = getComputedStyle(el)
  const rowH = parseFloat(style.getPropertyValue('--chip-h')) || BUFF_STACK_ROW_H
  const gap = parseFloat(style.getPropertyValue('--chip-gap')) || BUFF_STACK_GAP
  const band = el.clientHeight
  if (band <= 0) {
    fitRows.value = Infinity
    fitRowsWithMore.value = Infinity
    return
  }
  fitRows.value = Math.max(0, Math.floor((band + gap) / (rowH + gap)))
  fitRowsWithMore.value = Math.max(0, Math.floor((band - BUFF_STACK_MORE_H) / (rowH + gap)))
}

function observe() {
  observer?.disconnect()
  observer = null
  const el = stackRef.value?.$el
  if (!el || props.dock !== 'free' || typeof ResizeObserver !== 'function') {
    fitRows.value = Infinity
    fitRowsWithMore.value = Infinity
    return
  }
  observer = new ResizeObserver(measure)
  observer.observe(el)
  measure()
}

onMounted(observe)
watch(
  () => [props.dock, uiStore.bardActiveTab] as const,
  () => requestAnimationFrame(observe),
)
onBeforeUnmount(() => observer?.disconnect())

const visibleChips = computed<BuffChip[]>(() => {
  const all = chips.value
  if (props.dock === 'pause') return all.slice(0, PAUSE_KIT_EFFECT_COLS)
  if (props.dock === 'rail') return all
  if (all.length <= ACTIVE_BUFF_HUD.COLS) return all
  return all.slice(-(ACTIVE_BUFF_HUD.COLS - 1))
})

const overflowCount = computed(() => chips.value.length - visibleChips.value.length)

const rowH = `${BUFF_STACK_ROW_H}px`
const rowGap = `${BUFF_STACK_GAP}px`
const rowHCompact = `${BUFF_STACK_ROW_H_COMPACT}px`
const rowGapCompact = `${BUFF_STACK_GAP_COMPACT}px`
const moreH = `${BUFF_STACK_MORE_H}px`
const rowW = `${BUFF_STACK_W}px`
const topGap = `${BUFF_STACK_TOP_GAP}px`
const bottomGap = `${BUFF_STACK_BOTTOM_GAP}px`
const freeTile = `${ACTIVE_BUFF_HUD.TILE_SIZE}px`
const freeTileCompact = `${ACTIVE_BUFF_HUD.TILE_SIZE_COMPACT}px`
const freeTileWide = `${ACTIVE_BUFF_HUD.TILE_SIZE_WIDE}px`
const freeIcon = `${ACTIVE_BUFF_HUD.ICON_SIZE}px`
const freeIconCompact = `${ACTIVE_BUFF_HUD.ICON_SIZE_COMPACT}px`
const freeIconWide = `${ACTIVE_BUFF_HUD.ICON_SIZE_WIDE}px`
const freeGap = `${ACTIVE_BUFF_HUD.GAP}px`
const freeGapCompact = `${ACTIVE_BUFF_HUD.GAP_COMPACT}px`
const freeGapWide = `${ACTIVE_BUFF_HUD.GAP_WIDE}px`
const panelInset = `${ACTIVE_BUFF_HUD.PANEL_INSET}px`
const viewportInset = `${ACTIVE_BUFF_HUD.VIEWPORT_INSET}px`
const drainInset = `${ACTIVE_BUFF_HUD.DRAIN_INSET}px`
const timerSize = `${ACTIVE_BUFF_HUD.TIMER_SIZE}px`
const timerSizeCompact = `${ACTIVE_BUFF_HUD.TIMER_SIZE_COMPACT}px`
const timerSizeWide = `${ACTIVE_BUFF_HUD.TIMER_SIZE_WIDE}px`
const timerUnitSize = `${ACTIVE_BUFF_HUD.TIMER_UNIT_SIZE}px`
const timerUnitSizeCompact = `${ACTIVE_BUFF_HUD.TIMER_UNIT_SIZE_COMPACT}px`
const timerUnitSizeWide = `${ACTIVE_BUFF_HUD.TIMER_UNIT_SIZE_WIDE}px`
</script>

<style scoped>
/* ── Frei: der Stapel über dem Command-Panel ──────────────────────────────
   Unten die Oberkante des Panels, oben die gemeldete Kante der Eventlog-Spur
   (eingeklappt: ihre Leiste). Beides reine px-Werte. Flüchtig wie die Karten
   links: meldet KEINE Kante an die HUD-Kontur. */
.buff-bar {
  --chip-w: v-bind(rowW);
  --chip-h: v-bind(rowH);
  --chip-gap: v-bind(rowGap);
  --chip-stage: 52px;
  position: fixed;
  /* Randbündig: die Zeilen kommen aus der Kante wie Reiter. */
  right: 0;
  top: calc(max(var(--event-log-bottom, 0px), var(--header-total-height, 0px)) + v-bind(topGap));
  bottom: calc(var(--hud-panel-size, 330px) + v-bind(bottomGap));
  z-index: 900;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-end;
  gap: var(--chip-gap);
  width: max-content;
  overflow: clip;
  pointer-events: none;
}

.buff-chip {
  position: relative;
  width: var(--chip-w);
  height: var(--chip-h);
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 14px 0 11px;
  background: #16140e;
  border: 1px solid #3e200a;
  border-left: 4px solid var(--chip-color, #e8c040);
  border-right: 0;
  border-radius: 4px 0 0 4px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.7);
  overflow: hidden;
}

/* Stufe 2 — Rangrahmen und Edelstein. Die Quellkante links bleibt. */
.buff-chip--t2 {
  border-color: color-mix(in srgb, var(--chip-rank, #4a90e2) 55%, #3e200a);
  border-left-color: var(--chip-color, #e8c040);
}

/* Stufe 3 — Holzrahmen mit Gold, Ornamente, Aura. Dieselbe Breite. */
.buff-chip--t3 {
  border: 2px solid #7a4e20;
  border-left: 4px solid var(--chip-color, #e8c040);
  border-right: 0;
  box-shadow:
    inset 0 0 0 1px #3e200a,
    inset 0 0 0 2px #5c3310,
    0 8px 24px rgba(0, 0, 0, 0.85);
}

.buff-chip--t3::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #e8c040;
}

.chip-aura {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 18% 50%,
    color-mix(in srgb, var(--chip-color, #e8c040) 38%, transparent),
    transparent 72%
  );
  opacity: 0.6;
  animation: chip-breathe 3.2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes chip-breathe {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.95;
  }
}

.chip-gem {
  position: absolute;
  top: -4px;
  left: 11px;
  width: 8px;
  height: 8px;
  background: var(--chip-rank, #4a90e2);
  border: 1px solid #111008;
  transform: rotate(45deg);
  pointer-events: none;
}

.buff-chip--t3 .chip-gem {
  top: -3px;
  width: 9px;
  height: 9px;
}

.chip-ornament {
  position: absolute;
  font-size: 10px;
  line-height: 1;
  color: #e8c040;
  opacity: 0.8;
  pointer-events: none;
}

.chip-ornament--tr {
  top: 4px;
  right: 8px;
}

.chip-ornament--bl {
  bottom: 4px;
  left: 7px;
}

/* Letzte Sekunden: eigene Ebene, statisch gefärbt, animiert wird nur ihre
   Deckkraft. */
.chip-pulse {
  position: absolute;
  inset: 0;
  opacity: 0;
  background: color-mix(in srgb, #cc6050 22%, transparent);
  pointer-events: none;
}

.buff-chip--expiring .chip-pulse {
  animation: chip-pulse 0.9s ease-in-out infinite;
}

@keyframes chip-pulse {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

/* Runde Bühne in der Buff-Farbe, der Ring drumherum ist die Uhr. */
.chip-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--chip-stage);
  height: var(--chip-stage);
  flex-shrink: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 38%,
    color-mix(in srgb, var(--chip-color, #e8c040) 22%, #14120c),
    #100e08 74%
  );
}

.chip-ring {
  position: absolute;
  inset: -3px;
  width: calc(100% + 6px);
  height: calc(100% + 6px);
  transform: rotate(-90deg);
  fill: none;
  pointer-events: none;
}

.chip-ring__track {
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 7;
}

.buff-chip--t2 .chip-ring__track {
  stroke: color-mix(in srgb, var(--chip-rank, #4a90e2) 32%, transparent);
}

.buff-chip--t3 .chip-ring__track {
  stroke: color-mix(in srgb, #e8c040 34%, transparent);
}

/* Der Bogen zieht per Offset — dieselbe Bahn wie jeder Ring im Spiel. */
.chip-ring__fill {
  stroke: var(--chip-color, #e8c040);
  stroke-width: 7;
  stroke-linecap: butt;
  transition: stroke-dashoffset 1s linear;
}

.buff-chip--expiring .chip-ring__fill {
  stroke: #cc6050;
}

.buff-chip--endless .chip-ring__track {
  stroke: color-mix(in srgb, var(--chip-color, #e8c040) 45%, transparent);
}

.chip-icon__glyph {
  position: relative;
  width: 58%;
  height: 58%;
  color: var(--chip-color, #e8c040);
}

.chip-icon__art {
  position: relative;
  display: block;
  width: 80%;
  height: 80%;
  max-width: none;
  object-fit: contain;
  pointer-events: none;
}

.chip-text {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  line-height: 1;
}

/* Der Name trägt die Farbe der Quelle — welcher Buff ist das. */
.chip-name {
  font-size: 16px;
  font-weight: 800;
  color: var(--chip-color, #f0e6c8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.buff-chip--t3 .chip-name {
  color: #e8c040;
}

/* Das Effekt-Token: Faktor in Gold, Achse als Kurzwort in Caps. */
.chip-label {
  display: flex;
  align-items: baseline;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
}

.chip-mult {
  font-size: 18px;
  font-weight: 900;
  color: #e8c040;
}

.chip-axis {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #b89b5a;
}

.chip-side {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
  line-height: 1;
}

/* Right-aligned with a reserved width: the number may lose a digit without
   moving anything else. */
.chip-clock {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 1px;
  min-width: 3.2ch;
  font-variant-numeric: tabular-nums;
}

.chip-seconds {
  font-size: 22px;
  font-weight: 900;
  color: #f2ead2;
}

.buff-chip--expiring .chip-seconds {
  color: #cc6050;
}

.chip-unit {
  font-size: 12px;
  font-weight: 800;
  color: #8a7a52;
}

.chip-clock--endless {
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 1.3px;
  text-transform: uppercase;
  color: #8a7a58;
  min-width: 0;
}

/* „+N more": eine Zahl, kein Effekt — ohne Kante, ohne Ring. */
.buff-more {
  display: flex;
  align-items: center;
  height: v-bind(moreH);
  padding: 0 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #8a7a58;
  background: #16100a;
  border: 1px solid #2c1806;
  border-right: 0;
  border-radius: 4px 0 0 4px;
}

/* ── Enter / leave: von unten herein, wie der Stapel wächst ── */
.buff-chip-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s cubic-bezier(0.2, 1.4, 0.4, 1);
}
.buff-chip-leave-active {
  transition:
    opacity 0.45s ease,
    transform 0.45s ease;
  animation: none !important;
}
.buff-chip-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.92);
}
.buff-chip-leave-to {
  opacity: 0;
  transform: translateX(12px) scale(0.94);
}
.buff-chip-move {
  transition: transform 0.3s ease;
}

/* ── Auflösungsstufen — dieselben Schwellen wie die Fähigkeitenleiste ── */
@media (min-width: 2400px) {
  .buff-bar {
    --chip-w: 344px;
    --chip-h: 82px;
    --chip-gap: 10px;
    --chip-stage: 60px;
  }
  .chip-name {
    font-size: 18px;
  }
  .chip-axis {
    font-size: 12.5px;
    letter-spacing: 1.7px;
  }
  .chip-mult {
    font-size: 21px;
  }
  .chip-seconds {
    font-size: 25px;
  }
  .chip-unit {
    font-size: 13px;
  }
  .buff-more {
    font-size: 12px;
  }
}

@media (min-width: 3400px) {
  .buff-bar {
    --chip-w: 404px;
    --chip-h: 98px;
    --chip-gap: 12px;
    --chip-stage: 72px;
  }
  .chip-name {
    font-size: 22px;
  }
  .chip-axis {
    font-size: 15px;
    letter-spacing: 2px;
  }
  .chip-mult {
    font-size: 25px;
  }
  .chip-seconds {
    font-size: 30px;
  }
  .chip-unit {
    font-size: 15px;
  }
  .chip-ornament {
    font-size: 13px;
  }
  .buff-more {
    font-size: 14px;
  }
}

/* Flache Fenster (Full HD bei 125 %): die Spur liegt unter dem Header und ihr
   Boden frisst das Band — die Zeile rückt zusammen, damit noch zwei stehen. */
@media (max-height: 800px) {
  .buff-bar {
    --chip-h: v-bind(rowHCompact);
    --chip-gap: v-bind(rowGapCompact);
    --chip-stage: 40px;
  }
  .buff-chip {
    gap: 9px;
    padding: 0 10px 0 8px;
  }
  .chip-name {
    font-size: 13px;
  }
  .chip-axis {
    font-size: 9.5px;
    letter-spacing: 1.2px;
  }
  .chip-mult {
    font-size: 15px;
  }
  .chip-seconds {
    font-size: 17px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .buff-chip--expiring .chip-pulse {
    animation: none;
    opacity: 0.6;
  }
  .chip-aura {
    animation: none;
  }
  .chip-ring__fill {
    transition: none;
  }
}

/* ── Docked: the rail of the star fight modal ───────────────────────────
   Same instance, different shape: a column of narrow plates under the ability
   tiles. `--chip-w: 100%` deliberately: the rail declares ONE width
   (`--sf-rail-w`), and the plates take it — a width of their own here would be
   a second source for the same measure. The name has no room in 104px; the
   multiplier and clock share the head row, the axis stands beneath. */
.buff-bar--docked {
  --chip-h: 50px;
  --chip-stage: 24px;
  position: static;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-items: stretch;
  gap: 6px;
  width: 100%;
  max-width: none;
  transform: none;
  z-index: auto;
  overflow: visible;
}

.buff-bar--docked .buff-chip {
  width: 100%;
  border-right: 1px solid #3e200a;
  border-radius: 4px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto;
  column-gap: 5px;
  row-gap: 2px;
  align-items: center;
  padding: 0 7px 0 6px;
  border-left-width: 3px;
}

.buff-bar--docked .chip-text,
.buff-bar--docked .chip-side {
  display: contents;
}

.buff-bar--docked .chip-name,
.buff-bar--docked .chip-ornament,
.buff-bar--docked .chip-gem {
  display: none;
}

.buff-bar--docked .chip-icon {
  grid-row: 1 / 3;
}

.buff-bar--docked .chip-ring {
  inset: -2px;
  width: calc(100% + 4px);
  height: calc(100% + 4px);
}

.buff-bar--docked .chip-mult {
  font-size: 13px;
}

.buff-bar--docked .chip-clock {
  grid-column: 2 / 4;
  grid-row: 1;
  justify-self: end;
  min-width: 0;
}

.buff-bar--docked .chip-seconds {
  font-size: 12px;
}

.buff-bar--docked .chip-unit {
  font-size: 9px;
}

.buff-bar--docked .chip-label {
  grid-column: 2 / 4;
  grid-row: 2;
  gap: 4px;
}

.buff-bar--docked .chip-axis {
  font-size: 9px;
  letter-spacing: 0.9px;
}

@media (min-width: 2400px) {
  .buff-bar--docked {
    --chip-h: 58px;
    --chip-stage: 30px;
  }
  .buff-bar--docked .chip-mult {
    font-size: 16px;
  }
  .buff-bar--docked .chip-seconds {
    font-size: 16px;
  }
  .buff-bar--docked .chip-unit {
    font-size: 11px;
  }
  .buff-bar--docked .chip-axis {
    font-size: 11px;
  }
}

@media (min-width: 3400px) {
  .buff-bar--docked {
    --chip-h: 68px;
    --chip-stage: 36px;
  }
  .buff-bar--docked .chip-mult {
    font-size: 19px;
  }
  .buff-bar--docked .chip-seconds {
    font-size: 19px;
  }
  .buff-bar--docked .chip-unit {
    font-size: 13px;
  }
  .buff-bar--docked .chip-axis {
    font-size: 13px;
  }
}

/* ── Im Kit-Band des Pause-Overlays ───────────────────────────────────────
   Eine Reihe fester Plaketten; jede Zeile Höhe geht in den Fit-Scale des
   ganzen Overlays. Doppelte Spezifität gegen die Auflösungsstufen oben — über
   dem Panel liegt bereits useFitScale, eine zweite Staffelung skalierte doppelt. */
.buff-bar.buff-bar--pause {
  --chip-w: var(--pause-kit-chip-w, 210px);
  --chip-h: var(--pause-kit-chip-h, 80px);
  --chip-stage: 30px;
  position: static;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: stretch;
  justify-content: flex-start;
  gap: var(--pause-kit-gap, 12px);
  width: 100%;
  max-width: none;
  transform: none;
  z-index: auto;
  overflow: visible;
}

/* Feste Breite, nicht `1fr`: die Reihe steht auch mit einem einzigen Effekt an
   derselben Stelle, und die Kit-Zellen daneben rechnen mit dieser Spalte. */
.buff-bar--pause .buff-chip {
  width: var(--chip-w);
  border-right: 1px solid #3e200a;
  border-radius: 4px;
  flex: 0 0 var(--chip-w);
  gap: 8px;
  padding: 0 10px 0 8px;
  border-left-width: 3px;
}

.buff-bar--pause .chip-name {
  font-size: 13px;
}

.buff-bar--pause .chip-axis {
  font-size: 10px;
}

.buff-bar--pause .chip-mult {
  font-size: 14px;
}

.buff-bar--pause .chip-seconds {
  font-size: 15px;
}

.buff-bar--pause .chip-unit {
  font-size: 10px;
}

/* Der Rest-Zähler trägt keine Uhr und keinen Rang — er ist eine Zahl, kein
   Effekt. Sein Platz ist immer reserviert, und ein leerer Kasten läse sich als
   fehlende Plakette. */
.buff-chip--more {
  flex: 0 0 var(--pause-kit-more-w, 56px);
  width: var(--pause-kit-more-w, 56px);
  height: var(--chip-h);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #8a7a62;
}
.buff-bar--free {
  --chip-w: v-bind(freeTile);
  --chip-h: v-bind(freeTile);
  --chip-gap: v-bind(freeGap);
  top: auto;
  right: calc(v-bind(panelInset) * var(--hud-scale, 1));
  bottom: calc(
    var(--hud-panel-size, 330px) + v-bind(bottomGap)
  );
  width: min(
    calc(var(--hud-panel-size, 330px) - v-bind(panelInset)),
    calc(100vw - v-bind(viewportInset))
  );
  max-width: calc(100vw - v-bind(viewportInset));
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-end;
  justify-content: flex-end;
  gap: var(--chip-gap);
  overflow: visible;
}

.buff-bar--free .buff-chip,
.buff-bar--free .buff-more {
  box-sizing: border-box;
  flex: 0 0 var(--chip-w);
  width: var(--chip-w);
  height: var(--chip-h);
}

.buff-bar--free .buff-chip {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  overflow: visible;
  cursor: default;
  pointer-events: auto;
  transition: transform 160ms ease;
}

.buff-bar--free .buff-chip:hover,
.buff-bar--free .buff-chip:focus-visible,
.buff-bar--free .buff-more:hover,
.buff-bar--free .buff-more:focus-visible {
  transform: translateY(-3px);
}

.buff-bar--free .buff-chip:focus-visible,
.buff-bar--free .buff-more:focus-visible {
  outline: 1px solid #e8c040;
  outline-offset: 2px;
}

.buff-bar--free .chip-icon {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  z-index: 1;
  display: grid;
  flex: 0 0 v-bind(freeIcon);
  place-items: center;
  width: v-bind(freeIcon);
  height: v-bind(freeIcon);
  background: #111008;
  border: 1px solid var(--chip-rank, #5c3310);
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 1px #3e200a,
    0 4px 14px rgba(0, 0, 0, 0.72);
}

.buff-bar--free .buff-chip--t2 .chip-icon {
  border-width: 2px;
  border-color: var(--chip-rank, #4a90e2);
}

.buff-bar--free .buff-chip--t3 .chip-icon {
  background: #1c1608;
  border: 2px solid #e8c040;
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 1px #6e4f17,
    0 0 16px #6e4f17;
}

.buff-bar--free .buff-chip--t3 .chip-icon::before {
  position: absolute;
  inset: 3px;
  border: 1px solid #8a6522;
  border-radius: 2px;
  content: '';
  pointer-events: none;
}

.buff-bar--free .chip-icon__art {
  width: 90%;
  height: 90%;
  object-fit: contain;
  position: relative;
  z-index: 1;
}

.buff-bar--free .chip-icon__glyph {
  width: 58%;
  height: 58%;
}

.buff-bar--free .chip-ring {
  display: none;
}

.buff-bar--free .chip-aura {
  inset: 0;
  border-radius: 3px;
}

.buff-bar--free .chip-pulse {
  top: auto;
  right: v-bind(drainInset);
  bottom: 0;
  left: v-bind(drainInset);
  height: v-bind(freeIcon);
  border-radius: 3px;
}

.buff-bar--free .chip-gem {
  z-index: 3;
}

.buff-bar--free .chip-side {
  position: absolute;
  top: 3px;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: calc(var(--chip-h) - v-bind(freeIcon) - 3px);
  margin: 0;
  background: #111008;
  border: 1px solid #3e200a;
  border-bottom: 0;
  border-radius: 4px 4px 0 0;
  pointer-events: none;
}

.buff-bar--free .chip-clock {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  padding: 0;
}

.buff-bar--free .chip-seconds {
  font-size: v-bind(timerSize);
}

.buff-bar--free .chip-unit {
  font-size: v-bind(timerUnitSize);
}

.buff-bar--free .chip-clock--endless {
  min-width: 0;
  color: #8a7a58;
  font-size: 16px;
}

.buff-bar--free .chip-text {
  display: none;
}

.buff-bar--free .chip-track {
  position: absolute;
  top: 0;
  right: v-bind(drainInset);
  left: v-bind(drainInset);
  z-index: 3;
  height: 3px;
  transform-origin: left center;
  background: var(--chip-color, #6ec040);
  pointer-events: none;
  transition: transform 250ms linear;
}

.buff-bar--free .buff-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: #e8c040;
  background: transparent;
  border: 0;
  border-radius: 0;
  font-size: 18px;
  font-weight: 900;
  pointer-events: auto;
  cursor: default;
}

@media (max-height: 1100px) {
  .buff-bar--free {
    --chip-w: v-bind(freeTileCompact);
    --chip-h: v-bind(freeTileCompact);
    --chip-gap: v-bind(freeGapCompact);
  }

  .buff-bar--free .chip-icon {
    flex-basis: v-bind(freeIconCompact);
    width: v-bind(freeIconCompact);
    height: v-bind(freeIconCompact);
  }

  .buff-bar--free .chip-pulse {
    height: v-bind(freeIconCompact);
  }

  .buff-bar--free .chip-seconds {
    font-size: v-bind(timerSizeCompact);
  }

  .buff-bar--free .chip-unit {
    font-size: v-bind(timerUnitSizeCompact);
  }
}

@media (min-width: 2400px) {
  .buff-bar--free {
    --chip-w: v-bind(freeTileWide);
    --chip-h: v-bind(freeTileWide);
    --chip-gap: v-bind(freeGapWide);
  }

  .buff-bar--free .chip-icon {
    flex-basis: v-bind(freeIconWide);
    width: v-bind(freeIconWide);
    height: v-bind(freeIconWide);
  }

  .buff-bar--free .chip-pulse {
    height: v-bind(freeIconWide);
  }

  .buff-bar--free .chip-seconds {
    font-size: v-bind(timerSizeWide);
  }

  .buff-bar--free .chip-unit {
    font-size: v-bind(timerUnitSizeWide);
  }
}

@media (min-width: 3400px) {
  .buff-bar--free .chip-seconds {
    font-size: v-bind(timerSizeWide);
  }

  .buff-bar--free .chip-unit {
    font-size: v-bind(timerUnitSizeWide);
  }
}

</style>
