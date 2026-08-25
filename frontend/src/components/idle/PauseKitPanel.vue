<template>
  <!--
    Die vier Fähigkeiten am Fuß der Zustandssäule — EINE Reihe aus vier Kacheln.

    Die Kachelform war einmal verworfen, weil sie die Form eines Knopfes hat und
    im Overlay nichts bedienbar ist. Sie trägt hier, weil der NAME entfallen ist:
    in 499 nutzbaren px bleiben je Kachel 115, ein Name braucht allein 129
    Textbreite. Was die Kachel vom Knopf trennt, ist ihre Fassung — flache
    Füllung, Farbe als Oberkante, kein Verlauf. Der Name steht im `title`.
  -->
  <div
    class="kit-grid"
    :style="{
      '--kit-tile-h': `${PAUSE_KIT_TILE_H}px`,
      '--kit-art': `${PAUSE_KIT_CELL_ART_PX}px`,
      '--kit-gap': `${PAUSE_KIT_GAP_PX}px`,
    }"
  >
    <div
      v-for="cell in cells"
      :key="cell.id"
      class="kit-cell"
      :class="{ 'kit-cell--locked': cell.locked, 'kit-cell--cooling': cell.cooling }"
      :style="{ '--kit-color': cell.color }"
      :title="cell.name"
      :aria-label="`${cell.name} — ${cell.rankLabel} — ${cell.stateLabel}`"
    >
      <span class="kit-cell__art">
        <img
          :src="cell.image"
          alt=""
          class="kit-cell__img"
          draggable="false"
          @dragstart.prevent
        />
        <!-- Das Kürzel trägt die Zuordnung jetzt ALLEIN mit der Kunst und steht
             deshalb als eigene Marke da, nicht mehr als Randnotiz. -->
        <span class="kit-cell__key" aria-hidden="true">{{ cell.key }}</span>
      </span>

      <!-- Rang als Pips, nicht als „Rank 3": dieselbe Form wie `.ab-rank` an der
           Kachel draußen, und sie kostet keine Textbreite. -->
      <span class="kit-cell__pips" aria-hidden="true">
        <span
          v-for="n in ABILITY_MAX_RANK"
          :key="n"
          class="kit-pip"
          :class="{ 'kit-pip--on': n <= cell.rank }"
        />
      </span>

      <span class="kit-cell__state">{{ cell.stateLabel }}</span>

      <!-- Was der entfallene Name an Information gekostet hat, gibt der
           Füllstand zurück: dieselbe Strecke wie im Ring der Kachel draußen,
           geschrieben im Tick des Overlays, nicht pro Frame. -->
      <span v-if="cell.cooling" class="kit-cell__fill" aria-hidden="true">
        <span class="kit-cell__fill-bar" :style="{ transform: `scaleX(${cell.readyFill})` }" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { BARD_ABILITIES } from '@/config/progression/bardAbilities'
import {
  ABILITY_MAX_RANK,
  PAUSE_KIT_TILE_H,
  PAUSE_KIT_CELL_ART_PX,
  PAUSE_KIT_GAP_PX,
} from '@/config/constants'
import { gameNow } from '@/utils/game/gameClock'
import { formatCooldownSeconds } from '@/utils/ui/format'

/**
 * `tick` zählt im Takt von STAR_TIMER_TICK_MS hoch — das Overlay hält den
 * Ticker ohnehin für seine Callout-Karten. Ein eigener rAF-Lauf für vier
 * Zahlen, die höchstens fünfmal je Sekunde eine Stelle wechseln, wäre in einem
 * pausierten Spiel Verschwendung; dasselbe Snapshot-Muster wie bei den
 * Star-Timer-Bars im Header.
 */
const props = defineProps<{ tick: number }>()

const store = useBardAbilityStore()

interface KitCell {
  id: string
  key: string
  name: string
  image: string
  color: string
  locked: boolean
  cooling: boolean
  rank: number
  rankLabel: string
  stateLabel: string
  readyFill: number
}

const cells = computed<KitCell[]>(() => {
  // Der Tick ist der einzige Grund, warum diese Computed erneut läuft — die
  // Abklingzeit steht als Zeitstempel im Store und ändert sich nicht reaktiv.
  void props.tick
  const now = gameNow()

  return BARD_ABILITIES.map((def) => {
    const rank = store.rankOf(def.id)
    const locked = rank === 0
    const leftMs = locked ? 0 : Math.max(0, (store.cooldownReadyAt[def.id] ?? 0) - now)
    const totalMs = store.cooldownMsOf(def.id)
    return {
      id: def.id,
      key: def.key,
      name: def.name,
      image: def.image,
      color: def.color,
      locked,
      cooling: leftMs > 0,
      rank,
      rankLabel: locked ? 'Locked' : `Rank ${rank}`,
      // Gesperrt zählt die Stufe, die fehlt — sie ist das, was der Spieler
      // dagegen tun kann. Bereit steht als Wort da, nicht als „0s".
      stateLabel: locked
        ? `Lv ${def.unlockLevel}`
        : leftMs > 0
          ? `${formatCooldownSeconds(leftMs)}s`
          : 'Ready',
      // Der Balken FÜLLT sich bis bereit, wie jeder andere Füllstand im Panel.
      readyFill: totalMs > 0 ? 1 - leftMs / totalMs : 1,
    }
  })
})
</script>

<style scoped>
/* Vier Kacheln nebeneinander, EINE Reihe. */
.kit-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: var(--kit-tile-h);
  gap: var(--kit-gap);
  width: 100%;
}

/* Flache Füllung, Farbe als Oberkante, kein Verlauf: eine Ablesung, kein Knopf. */
.kit-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  padding: 6px 8px;
  overflow: hidden;
  background: #16140e;
  border: 1px solid #3e200a;
  border-top: 2px solid var(--kit-color, #c89040);
  border-radius: 4px;
}

.kit-cell--locked {
  opacity: 0.5;
  filter: grayscale(55%);
}

.kit-cell__art {
  position: relative;
  flex: 0 0 auto;
  width: var(--kit-art);
  height: var(--kit-art);
  overflow: hidden;
  border-radius: 4px;
  background: #0d0b06;
}

/* Das Motiv liegt als 512er Kunst vor und wird hier auf 44 px gebracht — das
   ist ein spürbares Herunterskalieren, und genau dafür ist `high-quality` da
   (nie `pixelated`, siehe „Bildschärfe"). */
.kit-cell__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: high-quality;
}

.kit-cell__key {
  position: absolute;
  top: 0;
  left: 0;
  padding: 0 3px 1px;
  background: rgba(8, 6, 3, 0.72);
  border-bottom-right-radius: 3px;
  font-size: 0.62rem;
  font-weight: 900;
  line-height: 1.2;
  color: #f0e2b8;
}

.kit-cell__pips {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: 0 0 auto;
}

.kit-pip {
  width: 10px;
  height: 3px;
  border-radius: 1px;
  background: rgba(232, 224, 196, 0.16);
}

.kit-pip--on {
  background: var(--kit-color, #e8c040);
  opacity: 0.85;
}

/* Der Zustand ist das, was sich ändert, und steht deshalb in der Leitfarbe der
   Fähigkeit — die Pips daneben bleiben ruhig. */
.kit-cell__state {
  flex: 0 0 auto;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
  color: var(--kit-color, #e8c040);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.kit-cell--cooling .kit-cell__state {
  color: rgba(216, 200, 160, 0.72);
}

.kit-cell--locked .kit-cell__state {
  color: rgba(216, 200, 160, 0.5);
}

.kit-cell__fill {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  background: rgba(122, 78, 32, 0.5);
}

.kit-cell__fill-bar {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--kit-color, #e8c040);
  transform-origin: left center;
}
</style>
